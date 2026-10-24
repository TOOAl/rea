/**
 * WebSearch — 자료 찾는 능력의 핵심: URL을 모를 때 검색으로 찾는 도구
 * 설계: Provider 어댑터 패턴 — Tavily > Serper > Brave > Bing 순으로 env 키에 따라 자동 선택
 *        + API 없이 rea로 흡수: 키가 없으면 RagIndex(로컬 문서/.memory-bank/.arena/rag-index) TF-IDF로 즉시 fallback — 외부 호출 0
 *
 * 이전: WebFetch는 URL을 알아야 했음. 이제: 질문 → 검색 → fetch 체인 가능 (API 유무와 무관)
 * 12살 설명: 도서관 사서 — 책 제목을 모르면 키워드로 목록을 먼저 찾아줌 (인터넷 안 되면 책장에서 먼저 찾기)
 */

import type { Tool, ToolContext } from "./types.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
  publishedDate?: string;
  source?: string; // provider name
}

export interface SearchProvider {
  name: string;
  search(query: string, opts?: { count?: number }): Promise<SearchResult[]>;
}

// --- Tavily (권장, AI 검색 특화) ---
class TavilyProvider implements SearchProvider {
  name = "tavily";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.TAVILY_API_KEY;
    if (!key) throw new Error("TAVILY_API_KEY missing");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: "advanced",
        include_answer: false,
        max_results: opts?.count ?? 5,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Tavily ${res.status}`);
    const data = await res.json() as { results?: Array<{ title: string; url: string; content: string; score: number; published_date?: string }> };
    return (data.results ?? []).map(r => ({
      title: r.title, url: r.url, snippet: r.content?.slice(0, 500) ?? "", score: r.score, publishedDate: r.published_date, source: "tavily"
    }));
  }
}

// --- Serper (Google SERP) ---
class SerperProvider implements SearchProvider {
  name = "serper";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.SERPER_API_KEY;
    if (!key) throw new Error("SERPER_API_KEY missing");
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, num: opts?.count ?? 5 }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);
    const data = await res.json() as { organic?: Array<{ title: string; link: string; snippet: string; date?: string }> };
    return (data.organic ?? []).map(r => ({
      title: r.title, url: r.link, snippet: r.snippet ?? "", publishedDate: r.date, source: "serper"
    }));
  }
}

// --- Brave Search API ---
class BraveProvider implements SearchProvider {
  name = "brave";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.BRAVE_API_KEY;
    if (!key) throw new Error("BRAVE_API_KEY missing");
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${opts?.count ?? 5}`, {
      headers: { "Accept": "application/json", "X-Subscription-Token": key },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Brave ${res.status}`);
    const data = await res.json() as { results?: Array<{ title: string; url: string; description: string; age?: string }> };
    const web = (data as unknown as { web?: { results?: typeof data.results } }).web?.results ?? data.results ?? [];
    return web.map(r => ({
      title: r.title, url: r.url, snippet: r.description ?? "", publishedDate: r.age, source: "brave"
    }));
  }
}

// --- Bing (Azure) ---
class BingProvider implements SearchProvider {
  name = "bing";
  async search(query: string, opts?: { count?: number }): Promise<SearchResult[]> {
    const key = process.env.BING_API_KEY || process.env.AZURE_BING_KEY;
    if (!key) throw new Error("BING_API_KEY missing");
    const res = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${opts?.count ?? 5}`, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Bing ${res.status}`);
    const data = await res.json() as { webPages?: { value?: Array<{ name: string; url: string; snippet: string; dateLastCrawled?: string }> } };
    return (data.webPages?.value ?? []).map(r => ({
      title: r.name, url: r.url, snippet: r.snippet ?? "", publishedDate: r.dateLastCrawled, source: "bing"
    }));
  }
}

function pickProvider(): SearchProvider | null {
  if (process.env.TAVILY_API_KEY) return new TavilyProvider();
  if (process.env.SERPER_API_KEY) return new SerperProvider();
  if (process.env.BRAVE_API_KEY) return new BraveProvider();
  if (process.env.BING_API_KEY || process.env.AZURE_BING_KEY) return new BingProvider();
  return null;
}

// --- API 없이 rea 내부만으로 흡수 — Local fallback (RagIndex + 파일 스캔) ---
// 외부 API 키가 없을 때, workspace 내부 문서/메모리/라이브러리를 TF-IDF 하이브리드로 검색해 SearchResult로 변환
// 12살 설명: 인터넷이 안 되면 도서관 책장에서 먼저 찾아주는 사서
let localCache: { mtime: number; results: Map<string, SearchResult[]> } | null = null;

async function localFallbackSearch(query: string, count: number): Promise<SearchResult[]> {
  if (process.env.REA_WEBSEARCH_LOCAL === "0") return [];
  try {
    const { RagIndex } = await import("../rag/index.js");
    const { readFile } = await import("node:fs/promises");
    const { existsSync } = await import("node:fs");
    const fg = (await import("fast-glob")).default;

    // 캐시된 .arena/rag-index가 있으면 우선 사용 (REА_RAG와 공유)
    const cwd = process.cwd();
    const persistCandidates = [
      `${cwd}/.arena/rag-index`,
      `${cwd}/arena-code/.arena/rag-index`,
      `${cwd}/.memory-bank`,
    ];
    for (const dir of persistCandidates) {
      try {
        const idx = new RagIndex({ domain: "default", persistDir: dir });
        if (idx.load() && idx.size > 0) {
          const hits = idx.search(query, count);
          if (hits.length > 0) {
            return hits.map(h => ({
              title: h.chunk.source,
              url: `file://${h.chunk.source}`,
              snippet: h.chunk.text.slice(0, 500),
              score: h.score,
              source: "local-rag",
            }));
          }
        }
      } catch {}
    }

    // persist가 없으면 즉석 스캔: docs/*.md + arena-code/docs/**/*.md + .memory-bank (최대 80파일, 15000자/파일 제한)
    const patterns = [
      "arena-code/docs/**/*.md",
      "docs/**/*.md",
      "arena-code/.memory-bank/**/*.md",
      ".memory-bank/**/*.md",
      "arena-code/docs/BASE_CAPABILITY_IMPROVEMENT.md",
    ];
    const files: string[] = [];
    for (const pat of patterns) {
      try {
        const found = await fg(pat, { cwd, absolute: false, ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"], dot: false });
        files.push(...found);
      } catch {}
    }
    const uniq = [...new Set(files)].slice(0, 80);
    if (uniq.length === 0) return [];

    const docs: Array<{ source: string; text: string }> = [];
    for (const rel of uniq) {
      const abs = `${cwd}/${rel}`;
      if (!existsSync(abs)) continue;
      try {
        const text = await readFile(abs, "utf-8");
        if (text.trim().length < 100) continue;
        docs.push({ source: rel, text: text.slice(0, 15000) });
      } catch {}
    }
    if (docs.length === 0) return [];

    const idx = new RagIndex({ domain: "websearch-local" });
    idx.addDocuments(docs);
    const hits = idx.search(query, count);
    return hits.map(h => ({
      title: h.chunk.source,
      url: `file://${h.chunk.source}`,
      snippet: h.chunk.text.slice(0, 500),
      score: h.score,
      source: "local",
    }));
  } catch {
    return [];
  }
}

export async function webSearch(query: string, opts: { count?: number; provider?: string } = {}): Promise<SearchResult[]> {
  const count = Math.min(opts.count ?? 5, 10);

  // 명시적 provider 지정
  if (opts.provider) {
    const map: Record<string, SearchProvider> = {
      tavily: new TavilyProvider(), serper: new SerperProvider(), brave: new BraveProvider(), bing: new BingProvider(),
    };
    const p = map[opts.provider];
    if (p) {
      try { return await p.search(query, { count }); } catch { /* fallthrough to local */ }
    }
  }

  const provider = pickProvider();
  if (provider) {
    try { return await provider.search(query, { count }); }
    catch (e) {
      if (process.env.DEBUG) console.warn(`[WebSearch] ${provider.name} failed:`, e);
      // 외부 API 실패 시 local fallback으로 흡수 (API 없이 rea 내부로 기능 전환)
    }
  }

  // API 없이 rea로 흡수: 로컬 RAG + 파일 스캔 fallback (외부 호출 0)
  const local = await localFallbackSearch(query, count);
  if (local.length > 0) return local;

  // 정말 아무 것도 없으면 빈 결과 대신 안내 — but WebSearchTool은 formatResultsForPrompt에서 더 친절한 메시지로 포장
  // 빈 배열을 반환하되, formatResultsForPrompt에서 local 힌트를 추가
  return [];
}

export function formatResultsForPrompt(results: SearchResult[], query: string): string {
  if (results.length === 0) {
    return `WebSearch: no results for "${query}".\n- API 없이 rea 흡수 모드: 로컬 문서(RagIndex/docs/.memory-bank)에서 TF-IDF로 재검색했지만 매치가 없음.\n- 팁: TAVILY_API_KEY/SERPER_API_KEY/BRAVE_API_KEY 중 하나를 설정하면 라이브 웹 검색이 활성화됨 (선택).\n- 그래도 가능: Read/Grep/Glob으로 로컬 파일 직접 읽기, WebFetch로 알려진 URL 읽기, Browser로 네이버/구글 직접 크롤 (API 없이).`;
  }
  const isLocal = results.some(r => r.source === "local" || r.source === "local-rag");
  const lines = [`WebSearch results for "${query}" (${results.length} hits${isLocal ? " — local(rea 흡수, API 없음)" : ""}):`];
  results.forEach((r, i) => {
    lines.push(`${i + 1}. [${r.source ?? "web"}] ${r.title}`);
    lines.push(`   URL: ${r.url}${r.publishedDate ? ` | date: ${r.publishedDate}` : ""}`);
    lines.push(`   ${r.snippet.slice(0, 300)}`);
  });
  if (isLocal) {
    lines.push(`Note: API 키 없이 rea 내부 RagIndex(로컬 문서)로 흡수된 결과 — file:// 경로는 Read로 전문 확인 가능. 외부 웹이 필요하면 TAVILY_API_KEY 설정 후 재검색.`);
  } else {
    lines.push(`Tip: Use WebFetch to read full pages, then cite sources with URL + date (fail-closed provenance).`);
  }
  return lines.join("\n");
}

// --- Tool definition (arena-code Tool 인터페이스) ---
export const WebSearchTool: Tool = {
  name: "WebSearch",
  description: "웹에서 자료를 검색 — API 없이 rea 내부 RagIndex(로컬 문서) 우선, 키 있으면 Tavily/Serper/Brave/Bing 자동 선택. WebFetch/Browser와 체인 가능. 로컬 파일은 Grep/Glob으로도 가능하지만 WebSearch가 local-rag로 통합 검색.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "검색 질의 (예: 코스피 2024-10-23 반등 원인 — API 없어도 로컬 문서에서 먼저 찾음)" },
      count: { type: "number", description: "반환 개수 (기본 5, 최대 10)" },
      provider: { type: "string", description: "강제 프로바이더 (tavily|serper|brave|bing, 선택 — 없어도 local로 흡수)" },
    },
    required: ["query"],
  },
  isConcurrencySafe: true,

  async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
    const query = String(input.query ?? "").trim();
    if (!query) return "Error: query is required";
    const count = typeof input.count === "number" ? input.count : 5;
    const provider = typeof input.provider === "string" ? input.provider : undefined;

    try {
      const results = await webSearch(query, { count, provider });
      return formatResultsForPrompt(results, query);
    } catch (e: unknown) {
      return `WebSearch error for "${query}": ${e instanceof Error ? e.message : String(e)}. Tip: WebFetch for known URL, Grep/Glob for local files.`;
    }
  },
};
