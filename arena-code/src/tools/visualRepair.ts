/**
 * VisualQA Tool — 스크린샷 없이 휴리스틱 QA + 1회 auto-repair
 * 12살 설명: 그림 다 그린 뒤 돋보기로 "글자 겹쳤나? 잘렸나?" 보고 바로 고쳐주는 선생님
 */
import type { Tool, ToolContext } from "./types.js";
import { qaCheck, autoRepair, qaFeedback } from "../visual/repair.js";

export const VisualRepairTool: Tool = {
  name: "VisualQA",
  description: "시각 자동 리페어 — HTML/이미지 설명을 6종(줄넘침/잘림/겹침/폰트/대비/이미지 alt)으로 QA하고, FAIL이면 1회 auto-repair로 고친 뒤 score 100目指. outputQuality Gate와 연동.",
  inputSchema: {
    type: "object",
    properties: {
      html: { type: "string", description: "검사할 HTML (전체 문서 또는 5000자 샘플)" },
      autoRepair: { type: "boolean", description: "FAIL 시 자동 수정 적용 (기본 true)" },
    },
    required: ["html"],
  },
  isConcurrencySafe: true,
  async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
    const html = String(input.html ?? "").trim();
    if (!html) return "Error: html required";
    const auto = input.autoRepair !== false;
    const before = qaCheck(html);
    const feedback = qaFeedback(before);
    if (!before.ok && auto) {
      const repaired = autoRepair(html);
      const afterFeedback = qaFeedback(repaired.reportAfter);
      return [
        `VisualQA BEFORE: score ${before.score}/100 — ${before.ok ? "PASS" : `FAIL ${before.issues.length}건`}`,
        feedback,
        "",
        `🔧 Auto-Repair 적용 ${repaired.applied.length}건: ${repaired.applied.join(", ") || "없음"}`,
        `AFTER: score ${repaired.reportAfter.score}/100 — ${repaired.reportAfter.ok ? "PASS" : "FAIL"}`,
        afterFeedback,
        "",
        "REPAIRED HTML preview (600자):",
        repaired.html.slice(0, 600),
      ].join("\n");
    }
    return [`VisualQA score ${before.score}/100`, feedback, before.ok ? "→ PASS, 추가 수정 불필요" : "→ FAIL, autoRepair:true로 재검사 권장"].join("\n");
  },
};
