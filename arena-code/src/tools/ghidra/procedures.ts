/**
 * Ghidra Procedures — 함수/심볼 목록 및 상세 분석
 * REA: rea function, --provider ghidra + MCP: list_procedures, list_names, analyze_function
 */
import type { Tool, ToolContext } from "../types.js";
import { checkGhidraAvailable, runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraListProceduresTool: Tool = {
  name: "GhidraListProcedures",
  description:
    "바이너리의 모든 함수(프로시저) 목록을 반환. 주소, 이름, 크기, 외부/내부 구분 포함. 어떤 함수가 있는지 파악할 때 사용. 결과를 보고 특정 함수의 상세 분석으로 이어갈 수 있다.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
    },
    required: ["binary_path"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const avail = await checkGhidraAvailable(ctx.cwd);
    // 미설치여도 시도 — 에러 메시지에 설치 가이드 포함

    // REA CLI: analyze 후 function 목록은 inspect로 얻을 수 있음
    // 또는 search로 전체 목록 검색
    const args = ["inspect", binary, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);

    // 데이터에 procedures가 있으면 추출, 아니면 전체 반환
    if (data && typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      // normalized_result에 procedures가 있을 수 있음
      const normalized = (obj.normalized_result || obj) as Record<string, unknown>;
      if (normalized.procedures || normalized.functions) {
        return formatGhidraResult("ListProcedures", binary, result, normalized.procedures || normalized.functions);
      }
      return formatGhidraResult("ListProcedures", binary, result, data);
    }

    // search로 모든 함수 검색 시도
    const searchArgs = ["search", binary, ".*", "--kind", "procedures", "--provider", "ghidra", "--json"];
    const searchResult = await runReaCommand(searchArgs, ctx.cwd);
    const { data: searchData } = parseJsonOutput(searchResult.stdout);
    if (searchData) return formatGhidraResult("ListProcedures", binary, searchResult, searchData);

    return `Ghidra ListProcedures 결과가 비어있습니다.\nRaw: ${(result.stdout || result.stderr).slice(0, 2000)}\n\n팁: binary 경로를 절대경로로 지정해보세요: ${binary}`;
  },
};

export const GhidraAnalyzeFunctionTool: Tool = {
  name: "GhidraAnalyzeFunction",
  description:
    "특정 함수의 상세 분석(dossier). 의사코드(pseudocode), 어셈블리, 호출자/피호출자, 문자열/이름, CFG, 주석 등 8개 facet을 한 번에 제공. 함수 하나를 깊이 이해할 때 사용. Ghidra의 가장 강력한 기능.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "함수 식별자 - 이름(예: main) 또는 주소(예: 0x401000 또는 file-offset:0x1234)" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const proc = input.procedure as string;

    const args = ["function", binary, proc, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`AnalyzeFunction(${proc})`, binary, result, data || result.stdout);
  },
};

export const GhidraListNamesTool: Tool = {
  name: "GhidraListNames",
  description:
    "바이너리의 모든 심볼(이름) 목록. 메모리 심볼, 외부 심볼, 동적 심볼 포함. 변수/네임스페이스 제외. 함수 이름 외에 전역 변수, 임포트 심볼 등을 찾을 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
    },
    required: ["binary_path"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    // REA CLI에는 list_names 직접 명령이 없으므로 inspect로 전체 정보에서 심볼 추출
    const args = ["inspect", binary, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const normalized = (obj.normalized_result || obj) as Record<string, unknown>;
      if (normalized.symbols || normalized.names) {
        return formatGhidraResult("ListNames", binary, result, normalized.symbols || normalized.names);
      }
    }
    return formatGhidraResult("ListNames", binary, result, data || result.stdout);
  },
};

export const GhidraListSegmentsTool: Tool = {
  name: "GhidraListSegments",
  description:
    "바이너리의 메모리 세그먼트/블록 목록. 각 블록의 시작/끝 주소, 읽기/쓰기/실행 권한, 초기화 여부, 오버레이, 어드레스 스페이스 포함. 바이너리 레이아웃을 이해할 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
    },
    required: ["binary_path"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const args = ["inspect", binary, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const normalized = (obj.normalized_result || obj) as Record<string, unknown>;
      if (normalized.segments || normalized.memory_blocks || normalized.sections) {
        return formatGhidraResult("ListSegments", binary, result, normalized.segments || normalized.memory_blocks || normalized.sections);
      }
    }
    return formatGhidraResult("ListSegments", binary, result, data || result.stdout);
  },
};
