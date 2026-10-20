/**
 * Ghidra Inspect — 바이너리 전체 개요
 * REA: rea analyze <path> --provider ghidra --json  /  rea inspect <path> --provider ghidra
 * MCP: binary_overview
 */
import type { Tool, ToolContext } from "../types.js";
import { checkGhidraAvailable, runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraInspectTool: Tool = {
  name: "GhidraInspect",
  description:
    "Ghidra로 바이너리 전체를 분석하고 개요를 반환. 아키텍처, 세그먼트, 엔트리 포인트, 함수/문자열 개수, 임포트/익스포트 등 전체 정보를 한 번에 파악. 처음 보는 바이너리를 분석할 때 가장 먼저 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "분석할 바이너리 파일 경로 (ELF, PE, Mach-O, 펌웨어 등)" },
      with_evidence: { type: "string", description: "true이면 REA Evidence JSON 포함 (기본 true)" },
    },
    required: ["binary_path"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;

    const avail = await checkGhidraAvailable(ctx.cwd);
    if (!avail.available) {
      return `⚠️ ${avail.reason}\n\n그래도 시도해보겠습니다 (REA CLI 호출)...`;
    }

    // REA analyze가 가장 포괄적 — Ghidra 분석 전체 실행
    const args = ["analyze", binary, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd, 180_000);
    const { data } = parseJsonOutput(result.stdout);

    if (data) {
      return formatGhidraResult("Analyze", binary, result, data);
    }

    // 실패 시 inspect로 재시도 (가벼운 버전)
    const args2 = ["inspect", binary, "--provider", "ghidra", "--json"];
    const result2 = await runReaCommand(args2, ctx.cwd, 180_000);
    const { data: data2 } = parseJsonOutput(result2.stdout);
    return formatGhidraResult("Inspect", binary, result2, data2 || result.stdout || result2.stdout);
  },
};

export const GhidraOverviewTool: Tool = {
  name: "GhidraOverview",
  description:
    "GhidraInspect와 동일 — 바이너리 개요 분석. 호환성을 위한 별칭.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
    },
    required: ["binary_path"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    return GhidraInspectTool.execute(input, ctx);
  },
};
