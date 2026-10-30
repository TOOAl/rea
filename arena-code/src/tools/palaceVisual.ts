/**
 * Palace Visual Tool — 기억궁전 MCP 도구 (Method of Loci 시각화)
 * 12살 설명: 궁전 평면도를 그려주는 카메라 — "기억궁전 보여줘" 하면 25칸 도면 PNG/HTML을 만들어줌
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { MemoryBank } from "../memory/bank.js";
import { generatePalaceHtml } from "../visual/palace.js";
import type { Tool, ToolContext } from "./types.js";

export const PalaceVisualTool: Tool = {
  name: "palace_visual",
  description: "기억궁전 시각화 — .memory-bank/<domain>의 25 loci 배치를 1080×760 SVG 평면도로 생성 (space-genius PR-3, Method of Loci)",
  inputSchema: {
    type: "object",
    properties: {
      domain: { type: "string", description: "대상 도메인 (기본 arena-brain), 혹은 .memory-bank 폴더명" },
      outputPath: { type: "string", description: "HTML 저장 경로 (기본 ./palace.html, 상대경로면 cwd 기준)" },
      title: { type: "string", description: "평면도 제목 (선택)" },
      root: { type: "string", description: "MemoryBank root (기본 cwd/.memory-bank)" },
    },
    required: [],
  },
  async execute(input: Record<string, unknown>, ctx: ToolContext): Promise<string> {
    const domain = (input.domain as string) || "arena-brain";
    const outPathRaw = (input.outputPath as string) || "./palace.html";
    const title = (input.title as string) || undefined;
    const root = (input.root as string) || undefined;

    const cwd = ctx.cwd || process.cwd();
    const bank = new MemoryBank({ root: root ? resolve(cwd, root) : undefined, domain });
    const entries = bank.list({ includeExpired: false });

    if (entries.length === 0) {
      return `⚠️ domain "${domain}"에 기억이 0개 — 먼저 MemoryBank.addWithSpace({id,cue,content})로 저장하세요. 경로: ${bank.dir}`;
    }

    const withSpace = entries.filter(e => e.spaceMeta);
    const html = generatePalaceHtml(entries, { title: title ?? `🏛️ 기억궁전 — ${domain} (${entries.length}개)` });

    const absOut = resolve(cwd, outPathRaw);
    try {
      const dir = dirname(absOut);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(absOut, html, "utf-8");
    } catch (e) {
      return `❌ 저장 실패: ${String(e)}`;
    }

    const zoneStats = new Map<string, number>();
    for (const e of entries) if (e.spaceMeta) zoneStats.set(e.spaceMeta.zone, (zoneStats.get(e.spaceMeta.zone) ?? 0) + 1);
    const zoneSummary = [...zoneStats.entries()].map(([z,c])=> `${z}:${c}`).join(" | ") || "(zone 없음)";

    return [
      `✅ 기억궁전 평면도 생성: ${absOut} (${html.length.toLocaleString()} 바이트)`,
      `→ 도메인: ${domain} | 총 ${entries.length}개 (공간 ${withSpace.length}개) | zone: ${zoneSummary}`,
      `→ loci 점유: ${new Set(withSpace.map(e=> e.spaceMeta!.locusId)).size}/25 | viewBox 1080×760 | 한글 Noto Sans KR`,
      `→ 미리보기: file://${absOut} (브라우저에서 열기)`,
      `→ 저장소: ${bank.dir}`,
    ].join("\n");
  },
};
