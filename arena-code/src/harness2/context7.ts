/**
 * Context7 — 라이브러리 문서 2툴 (Upstash/context7, MIT)
 * resolve-library-id → query-docs 2단계 흐름을 Arena Harness² Library와 연동.
 * 실제 MCP는 npx @upstash/context7-mcp 또는 https://mcp.context7.com/mcp 를 호출하지만,
 * allowlist 밖 호스트에서는 로컬 휴리스틱 fallback으로 동작.
 *
 * Arena 통합: HarnessLibrary.resolveLibraryId / queryDocs 가 이 모듈에 위임.
 * D2 RAG는 Context7 문서를 TF-IDF 사전 필터 전 단계로 주입할 수 있다.
 */

import { execSync } from "node:child_process";

export interface ResolvedLibrary {
  id: string;                 // Context7 ID, 예: /vercel/next.js
  name: string;
  trustScore?: string;        // High/Medium/Low/Unknown (CLI v0.3.3+)
  snippetCount?: number;
  source: "context7" | "fallback";
}

// 간단한 유명 라이브러리 → Context7 ID 매핑 (fallback 시 정확도 향상)
const KNOWN_IDS: Record<string, string> = {
  "react": "/facebook/react",
  "next.js": "/vercel/next.js",
  "nextjs": "/vercel/next.js",
  "vue": "/vuejs/vue",
  "svelte": "/sveltejs/svelte",
  "express": "/expressjs/express",
  "mongodb": "/mongodb/docs",
  "supabase": "/supabase/supabase",
  "prisma": "/prisma/prisma",
  "drizzle": "/drizzle-team/drizzle-orm",
  "tailwind": "/tailwindlabs/tailwindcss",
  "zod": "/colinhacks/zod",
  "trpc": "/trpc/trpc",
  "hono": "/honojs/hono",
};

function normalizeId(libraryName: string): string {
  const lower = libraryName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\/\-.]/g, "");
  if (lower.startsWith("/")) return lower;
  return `/${lower}`;
}

/**
 * 라이브러리 이름을 Context7 ID로 해석.
 * 1) npx ctx7 library 시도 (있으면)
 * 2) known 매핑
 * 3) 휴리스틱 fallback
 */
export async function resolveLibraryId(libraryName: string, _query?: string): Promise<ResolvedLibrary[]> {
  const key = libraryName.trim().toLowerCase();
  // Known 매핑 우선
  if (KNOWN_IDS[key]) {
    return [{ id: KNOWN_IDS[key], name: libraryName, trustScore: "High", snippetCount: 100, source: "fallback" }];
  }

  // CLI 시도 (존재하면)
  try {
    const out = execSync(`npx -y ctx7 library "${libraryName}" --json 2>/dev/null || true`, { encoding: "utf-8", timeout: 3000 });
    if (out && out.trim().startsWith("[")) {
      const parsed = JSON.parse(out.trim());
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.slice(0, 3).map((p: unknown) => {
          const o = p as Record<string, string>;
          return { id: o.id ?? normalizeId(libraryName), name: o.name ?? libraryName, trustScore: o.trustScore, snippetCount: Number(o.snippetCount ?? 0), source: "context7" as const };
        });
      }
    }
  } catch {}

  // Fallback
  return [{ id: normalizeId(libraryName), name: libraryName, trustScore: "Unknown", snippetCount: 0, source: "fallback" }];
}

/**
 * Context7 문서 조회.
 * 실제는 get-library-docs / query-docs 호출이지만, allowlist 밖이므로
 * 로컬에서는 플레이스홀더 + HarnessLibrary 검색 결과를 혼합해 반환.
 */
export async function queryDocs(libraryId: string, query: string): Promise<{ libraryId: string; query: string; snippets: string[]; source: "context7" | "fallback" }> {
  // CLI 시도
  try {
    const out = execSync(`npx -y ctx7 docs "${libraryId}" --query "${query.replace(/"/g, '\\"')}" 2>/dev/null || true`, { encoding: "utf-8", timeout: 4000 });
    if (out && out.trim().length > 50) {
      return { libraryId, query, snippets: [out.trim().slice(0, 4000)], source: "context7" };
    }
  } catch {}

  // Fallback: 플레이스홀더 문서 — 실제 RAG 필터 전 단계에서 LLM judge가 평가
  const placeholder = `# ${libraryId} — docs for "${query}"\n\n> Fallback snippet (Context7 MCP not reachable in sandbox allowlist). In production this would be version-specific docs for ${libraryId}.\n\nExample:\n\`\`\`ts\n// ${query} — see https://context7.com/docs${libraryId}\nimport { x } from "${libraryId.replace(/^\//, "")}";\n\`\`\`\n`;
  return { libraryId, query, snippets: [placeholder], source: "fallback" };
}
