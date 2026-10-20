/**
 * Ghidra Decompile — 디컴파일 (어셈블리 → C 의사코드)
 * REA: rea decompile <binary> <procedure> --provider ghidra
 * MCP: procedure_pseudo_code, batch_decompile
 */
import type { Tool, ToolContext } from "./types.js";
import { runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraDecompileTool: Tool = {
  name: "GhidraDecompile",
  description:
    "함수를 C 의사코드(pseudocode)로 디컴파일. 어셈블리를 읽기 쉬운 C 코드로 변환. Ghidra 디컴파일러의 핵심 기능. 함수 로직을 이해할 때 가장 먼저 사용. 주소(0x401000) 또는 이름(main)으로 지정 가능.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "함수 이름 또는 주소 (예: main, 0x401000, FUN_00401000)" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const proc = input.procedure as string;

    const args = ["decompile", binary, proc, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`Decompile(${proc})`, binary, result, data || result.stdout);
  },
};

export const GhidraProcedurePseudoCodeTool: Tool = {
  name: "GhidraProcedurePseudoCode",
  description:
    "GhidraDecompile과 동일 — 함수 의사코드. 호환성 별칭 (MCP 이름).",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "함수 식별자" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    return GhidraDecompileTool.execute(input, ctx);
  },
};

export const GhidraBatchDecompileTool: Tool = {
  name: "GhidraBatchDecompile",
  description:
    "여러 함수를 한 번에 디컴파일. MCP batch_decompile에 해당. 많은 함수를 빠르게 분석할 때 사용. 쉼표로 구분된 함수 목록 또는 'all'로 전체 디컴파일.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedures: { type: "string", description: "쉼표로 구분된 함수 목록 (예: main,func1,0x401000) 또는 'all'" },
    },
    required: ["binary_path", "procedures"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const procs = (input.procedures as string).split(",").map(s => s.trim()).filter(Boolean);

    if (procs.length === 0) return "❌ procedures가 비어있습니다. 함수 이름 또는 주소를 쉼표로 구분해 입력하세요.";

    // 각 함수를 순차적으로 디컴파일 (병렬 시 Ghidra 세션 충돌 가능)
    const results: string[] = [];
    for (const proc of procs.slice(0, 10)) { // 최대 10개 제한
      const args = ["decompile", binary, proc, "--provider", "ghidra", "--json"];
      const result = await runReaCommand(args, ctx.cwd);
      const { data } = parseJsonOutput(result.stdout);
      results.push(`\n===== ${proc} =====\n${data ? JSON.stringify(data, null, 2).slice(0, 4000) : (result.stdout || result.stderr).slice(0, 4000)}`);
    }

    if (procs.length > 10) {
      results.push(`\n... ${procs.length - 10}개 함수는 생략 (최대 10개 제한)`);
    }

    return `✅ Ghidra BatchDecompile (${procs.length}개 함수, ${binary}):\n${results.join("\n")}`;
  },
};
