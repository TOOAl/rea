/**
 * Ghidra Annotate — 어노테이션 (이름 변경, 주석, 북마크)
 * REA: Ghidra의 atomic annotation 기능
 * MCP: set_address_name, set_comment, set_bookmark 등 + CLI: rea annotate-native-function
 */
import type { Tool, ToolContext } from "./types.js";
import { runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraAnnotateTool: Tool = {
  name: "GhidraAnnotate",
  description:
    "Ghidra 분석 결과에 어노테이션 추가 — 함수 이름 변경, 주석 추가 등. 읽기 전용이 아닌 유일한 쓰기 기능. 리버스 엔지니어링 중 발견한 의미를 기록할 때 사용. 원본 바이트는 변경되지 않음.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "대상 함수/주소 (예: 0x401000 또는 FUN_00401000)" },
      name: { type: "string", description: "새 함수 이름 (선택, 예: my_decrypt)" },
      comment: { type: "string", description: "추가할 주석 (선택, 예: 이 함수는 암호 해독)" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const proc = input.procedure as string;
    const name = input.name as string | undefined;
    const comment = input.comment as string | undefined;

    if (!name && !comment) {
      return "❌ name 또는 comment 중 하나는 필요합니다. 예: {\"procedure\":\"0x401000\",\"name\":\"my_func\"} 또는 {\"procedure\":\"0x401000\",\"comment\":\"암호화 함수\"}";
    }

    const args = ["annotate-native-function", binary, proc];
    if (name) args.push("--name", name);
    if (comment) args.push("--comment", comment);
    args.push("--provider", "ghidra", "--json");

    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`Annotate(${proc}${name ? `, name=${name}` : ""}${comment ? `, comment` : ""})`, binary, result, data || result.stdout);
  },
};

export const GhidraSetNameTool: Tool = {
  name: "GhidraSetName",
  description:
    "주소나 심볼의 이름 변경. GhidraSetName과 동일하지만 이름 변경만 전담. 의미 있는 이름으로 바꾸면 분석이 쉬워짐.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "대상 (주소 또는 기존 이름)" },
      name: { type: "string", description: "새 이름" },
    },
    required: ["binary_path", "procedure", "name"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    return GhidraAnnotateTool.execute({ binary_path: input.binary_path, procedure: input.procedure, name: input.name }, ctx);
  },
};

export const GhidraSetCommentTool: Tool = {
  name: "GhidraSetComment",
  description: "주소나 함수에 주석 추가. 분석 중 발견한 사실을 기록.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "대상" },
      comment: { type: "string", description: "주석 내용" },
    },
    required: ["binary_path", "procedure", "comment"],
  },
  isConcurrencySafe: false,

  async execute(input, ctx: ToolContext): Promise<string> {
    return GhidraAnnotateTool.execute({ binary_path: input.binary_path, procedure: input.procedure, comment: input.comment }, ctx);
  },
};

export const GhidraCompareFunctionsTool: Tool = {
  name: "GhidraCompareFunctions",
  description:
    "두 바이너리의 함수를 비교. 같은 함수가 버전 간 어떻게 바뀌었는지, 패치로 무엇이 수정되었는지 찾을 때 사용. compare_functions에 해당. 두 바이너리 경로와 각각의 함수 필요.",
  inputSchema: {
    type: "object",
    properties: {
      binary_a: { type: "string", description: "첫 번째 바이너리 경로" },
      procedure_a: { type: "string", description: "첫 번째 바이너리의 함수" },
      binary_b: { type: "string", description: "두 번째 바이너리 경로" },
      procedure_b: { type: "string", description: "두 번째 바이너리의 함수" },
    },
    required: ["binary_a", "procedure_a", "binary_b", "procedure_b"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binA = input.binary_a as string;
    const procA = input.procedure_a as string;
    const binB = input.binary_b as string;
    const procB = input.procedure_b as string;

    // REA compare는 Evidence 기반 — 먼저 각 함수를 분석한 후 비교
    // 간단 버전: CLI compare 사용
    const args = ["compare", binA, binB, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);

    if (data) {
      return `✅ Ghidra CompareFunctions (${procA} vs ${procB}):\n${JSON.stringify(data, null, 2).slice(0, 8000)}`;
    }

    // fallback: 각 함수 개별 분석 후 안내
    return `Ghidra CompareFunctions: CLI compare 시도 결과:\n${(result.stdout || result.stderr).slice(0, 3000)}\n\n💡 수동 비교: 각각 GhidraAnalyzeFunction으로 분석한 후 결과를 비교하세요.\n  - ${binA} :: ${procA}\n  - ${binB} :: ${procB}`;
  },
};

export const GhidraCompareArtifactsTool: Tool = {
  name: "GhidraCompareArtifacts",
  description: "두 바이너리 전체를 비교. 변경된 함수, 추가/삭제된 함수 등을 한눈에 파악. 패치 분석, 버전 비교에 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_a: { type: "string", description: "첫 번째 바이너리 경로" },
      binary_b: { type: "string", description: "두 번째 바이너리 경로" },
    },
    required: ["binary_a", "binary_b"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binA = input.binary_a as string;
    const binB = input.binary_b as string;

    const args = ["compare", binA, binB, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`CompareArtifacts`, `${binA} vs ${binB}`, result, data || result.stdout);
  },
};
