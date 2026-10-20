/**
 * Ghidra Search — 검색 (함수, 문자열, 바이트)
 * REA: rea search, rea search-bytes
 * MCP: search_procedures, search_strings, search_bytes
 */
import type { Tool, ToolContext } from "./types.js";
import { runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraSearchTool: Tool = {
  name: "GhidraSearch",
  description:
    "Ghidra 검색 — 함수 이름, 문자열, 어셈블리 패턴 등을 검색. 리터럴 및 Java 정규식 지원. 바이너리에서 특정 패턴을 찾을 때 사용. 예: 'login', 'error.*failed', 'password'",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      pattern: { type: "string", description: "검색 패턴 (문자열 또는 정규식, 예: login)" },
      kind: { type: "string", description: "검색 종류: procedures(함수), strings(문자열), bytes(바이트), all(전체, 기본)" },
      regex: { type: "string", description: "true이면 정규식 모드 (기본 false, 리터럴)" },
    },
    required: ["binary_path", "pattern"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const pattern = input.pattern as string;
    const kind = (input.kind as string) || "all";
    const isRegex = (input.regex as string) === "true";

    const results: string[] = [];

    const searchOne = async (searchKind: string) => {
      const args = ["search", binary, pattern, "--kind", searchKind, "--provider", "ghidra", "--json"];
      if (isRegex) args.push("--regex");
      const result = await runReaCommand(args, ctx.cwd);
      const { data } = parseJsonOutput(result.stdout);
      return formatGhidraResult(`Search(${searchKind}:"${pattern}")`, binary, result, data || result.stdout);
    };

    if (kind === "all") {
      // 모든 종류 검색
      for (const k of ["procedures", "strings"]) {
        results.push(await searchOne(k));
      }
      return `🔍 Ghidra Search 전체 ("${pattern}", ${isRegex ? "regex" : "literal"}):\n${results.join("\n\n---\n\n")}`;
    }

    return searchOne(kind);
  },
};

export const GhidraSearchProceduresTool: Tool = {
  name: "GhidraSearchProcedures",
  description: "함수 이름으로 검색. GhidraSearch의 procedures 전용 버전.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      pattern: { type: "string", description: "검색 패턴" },
      regex: { type: "string", description: "정규식 여부 (true/false)" },
    },
    required: ["binary_path", "pattern"],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext): Promise<string> {
    return GhidraSearchTool.execute({ ...input, kind: "procedures" }, ctx);
  },
};

export const GhidraSearchStringsTool: Tool = {
  name: "GhidraSearchStrings",
  description: "문자열 검색. 바이너리에 포함된 문자열 중 패턴과 일치하는 것 찾기. 하드코딩된 URL, 에러 메시지 등을 찾을 때 유용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      pattern: { type: "string", description: "검색 패턴" },
      regex: { type: "string", description: "정규식 여부" },
    },
    required: ["binary_path", "pattern"],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext): Promise<string> {
    return GhidraSearchTool.execute({ ...input, kind: "strings" }, ctx);
  },
};

export const GhidraSearchBytesTool: Tool = {
  name: "GhidraSearchBytes",
  description: "바이트 패턴 검색. 16진수 바이트 시퀀스로 검색 (예: 90 90 90 = NOP sled). 쉘코드, 시그니처 등을 찾을 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      pattern: { type: "string", description: "바이트 패턴 (hex, 예: 90 90 또는 DEADBEEF)" },
    },
    required: ["binary_path", "pattern"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const pattern = input.pattern as string;

    const args = ["search-bytes", binary, pattern, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`SearchBytes("${pattern}")`, binary, result, data || result.stdout);
  },
};

export const GhidraListStringsTool: Tool = {
  name: "GhidraListStrings",
  description:
    "바이너리의 모든 정의된 문자열 목록. charset, 바이트 길이, null 종단 여부 포함. 바이너리에 하드코딩된 텍스트 전체를 파악할 때 사용. 문자열 검색보다 전체 목록이 필요할 때.",
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
    // REA CLI에는 list_strings 직접 명령이 없으므로 inspect로 전체 정보에서 추출
    const args = ["inspect", binary, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const normalized = (obj.normalized_result || obj) as Record<string, unknown>;
      if (normalized.strings) {
        const strings = normalized.strings as unknown[];
        return `✅ Ghidra ListStrings (${binary}): ${strings.length}개 문자열\n${JSON.stringify(strings.slice(0, 50), null, 2)}${strings.length > 50 ? `\n... ${strings.length - 50}개 더 있음` : ""}`;
      }
    }
    return formatGhidraResult("ListStrings", binary, result, data || result.stdout);
  },
};
