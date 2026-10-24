/**
 * Style RAG Tool — 20장 스타일 도서관 검색 + HTML 적용
 * 12살 설명: "따뜻하게" 하면 책장에서 가장 비슷한 견본 찾아 색·폰트를 그대로 따라 칠함
 */
import type { Tool, ToolContext } from "./types.js";
import { searchStyles, applyStyleToHtml, describeStyleForPrompt, STYLE_LIBRARY } from "../visual/styleLibrary.js";

export const StyleSearchTool: Tool = {
  name: "StyleSearch",
  description: "스타일 RAG 20장 — '따뜻하게/애플처럼/지브리풍/보고서용' 질의로 가장 비슷한 스타일 3개 검색. 찾은 스타일은 applyToHtml로 HTML에 팔레트/폰트/레이아웃 자동 주입.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "스타일 질의: 따뜻하게, 애플 키노트처럼, 지브리, 보고서용 등" },
      topK: { type: "number", description: "반환 개수 1~5 (기본 3)" },
      applyToHtml: { type: "string", description: "선택: 이 HTML에 1위 스타일을 바로 적용해 반환 (optional)" },
    },
    required: ["query"],
  },
  isConcurrencySafe: true,
  async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
    const query = String(input.query ?? "").trim();
    if (!query) return "Error: query required";
    const topK = Math.min(Math.max(Number(input.topK) || 3, 1), 5);
    const hits = searchStyles(query, topK);
    if (hits.length === 0) return `StyleSearch: no match for "${query}" — library has ${STYLE_LIBRARY.length} styles`;

    const lines: string[] = [`StyleSearch "${query}" → ${hits.length} hits (라이브러리 20장):`];
    hits.forEach((h, i) => {
      lines.push(`${i + 1}. [score ${h.score.toFixed(2)}] ${h.style.name} (${h.style.id}) — ${h.style.mood} — ${describeStyleForPrompt(h.style)}`);
      lines.push(`   팔레트: ${h.style.palette.primary} / ${h.style.palette.secondary} / ${h.style.palette.accent} on ${h.style.palette.bg}`);
    });

    const html = typeof input.applyToHtml === "string" ? input.applyToHtml : "";
    if (html.trim()) {
      const best = hits[0].style;
      const styled = applyStyleToHtml(html, best);
      lines.push("", `✅ 1위 ${best.name} 적용 완료 — HTML 길이 ${html.length}→${styled.length} (style ${best.id} CSS 주입)`);
      lines.push("적용된 CSS 미리보기 400자:", styled.slice(0, 400));
      // 전체 반환이 너무 길면 잘라쓰지만 Tool은 600자 이상도 가능
      if (styled.length < 8000) {
        lines.push("", "--- STYLED HTML ---", styled);
      }
    } else {
      lines.push("", "Tip: applyToHtml에 HTML을 함께 주면 1위 스타일을 바로 입혀 반환합니다. 예: {query:'따뜻하게', applyToHtml:'<html>...'}");
    }
    return lines.join("\n");
  },
};

export { STYLE_LIBRARY };
