/**
 * Visual Inspection Tools — 4-Eye 검수팀을 Tool로 노출
 * Cursor Agent 패턴: Tool이 파일을 읽고, 스크린샷을 찍고, 로그를 남겨 증거를 남긴다
 */
import type { Tool, ToolContext } from "./types.js";
import { inspectStatic } from "../visual/inspectionTeam.js";
import { readFileSync, existsSync } from "fs";

export const InspectLayoutTool: Tool = {
  name: "inspectLayout",
  description: "레이아웃 검수 — HTML 문자열 또는 파일 경로를 받아 4-Eye(geometry/typography/accessibility/pixel)로 검사. 경계 초과/폰트깨짐/WCAG 대비를 한 번에 판정. FAIL이면 구체적 수정 좌표까지 제공.",
  inputSchema: {
    type: "object",
    properties: {
      html: { type: "string", description: "검사할 HTML — 5000자 이상 샘플 또는 전체 문서" },
      filePath: { type: "string", description: "검사할 HTML 파일 경로 (html 대신 전달 가능)" },
    },
    required: [],
  },
  isConcurrencySafe: true,
  async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
    let html = String(input.html ?? "").trim();
    const filePath = String(input.filePath ?? "").trim();
    if (!html && filePath) {
      if (!existsSync(filePath)) return `Error: 파일 없음 ${filePath}`;
      html = readFileSync(filePath, "utf-8");
    }
    if (!html) return "Error: html 또는 filePath 중 하나는 필수";
    const result = inspectStatic(html);
    const lines = [
      `🔍 4-Eye 검수 결과 — ${result.overallGrade} ${result.overallScore}점 — ${result.pass ? "PASS, 공개 가능 ✅" : "FAIL, 수정 필요 🚫"}`,
      ...result.eyes.map(e => `  ${e.eye.padEnd(15)} ${e.grade.padEnd(4)} ${String(e.score).padStart(3)}점 ${e.issues.length ? `— ${e.issues[0].slice(0, 70)}` : "— OK"}`),
    ];
    if (result.fixInstructions.length) {
      lines.push("", "🔧 수정 지시:");
      result.fixInstructions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    }
    lines.push("", result.summary);
    return lines.join("\n");
  },
};

export const CheckOverflowTool: Tool = {
  name: "checkOverflow",
  description: "SVG 경계 초과 즉시 검사 — HTML에서 <svg>의 내부 요소(ellipse/circle/rect)가 부모 박스를 넘는지 1px 단위로 검사. 그림 박스 밖으로 삐져나온 요소를 좌표까지 알려줌.",
  inputSchema: {
    type: "object",
    properties: {
      html: { type: "string", description: "검사할 HTML" },
    },
    required: ["html"],
  },
  isConcurrencySafe: true,
  async execute(input: Record<string, unknown>, _ctx: ToolContext): Promise<string> {
    const html = String(input.html ?? "").trim();
    if (!html) return "Error: html required";
    const { checkGeometryStatic } = await import("../visual/inspectionTeam.js");
    const r = checkGeometryStatic(html);
    if (r.grade === "PASS") return `✅ 경계 검사 PASS ${r.score}점 — ${r.figCount}개 그림 모두 박스 내부`;
    return `🚫 경계 초과 ${r.overflows.length}건 ${r.score}점\n` + r.issues.map(i => `  • ${i}`).join("\n") + (r.suggestion ? `\n처방: ${r.suggestion}` : "");
  },
};
