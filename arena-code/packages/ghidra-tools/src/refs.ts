/**
 * Ghidra References — 참조 분석 (xrefs, callers, callees, call graph)
 * REA: rea xrefs, rea function -- refs, rea trace
 * MCP: procedure_references, procedure_callers, procedure_callees, get_call_graph, xrefs
 */
import type { Tool, ToolContext } from "./types.js";
import { runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraXrefsTool: Tool = {
  name: "GhidraXrefs",
  description:
    "특정 주소의 교차 참조(xrefs) 조회. 어떤 곳에서 이 주소를 참조하는지 (incoming) 또는 이 주소가 어디를 참조하는지 (outgoing) 찾기. 함수 호출 관계, 문자열 사용처 등을 찾을 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      address: { type: "string", description: "조회할 주소 (예: 0x401000 또는 함수 이름)" },
    },
    required: ["binary_path", "address"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const addr = input.address as string;

    const args = ["xrefs", binary, addr, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`Xrefs(${addr})`, binary, result, data || result.stdout);
  },
};

export const GhidraCallersTool: Tool = {
  name: "GhidraCallers",
  description:
    "특정 함수를 호출하는 모든 호출자(caller) 찾기. '누가 이 함수를 호출하는가?'를 알고 싶을 때 사용. 영향 분석, 취약점 분석에 필수.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "함수 식별자 (이름 또는 주소)" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const proc = input.procedure as string;

    // function dossier에는 callers가 포함됨
    const args = ["function", binary, proc, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const normalized = (obj.normalized_result || obj) as Record<string, unknown>;
      if (normalized.callers) {
        return formatGhidraResult(`Callers(${proc})`, binary, result, normalized.callers);
      }
      // caller 정보가 dossier에 포함된 경우
      if (data) return formatGhidraResult(`Callers(${proc})`, binary, result, data);
    }
    
    return formatGhidraResult(`Callers(${proc})`, binary, result, data || result.stdout);
  },
};

export const GhidraCalleesTool: Tool = {
  name: "GhidraCallees",
  description:
    "특정 함수가 호출하는 모든 피호출자(callee) 찾기. '이 함수가 누구를 호출하는가?'를 알고 싶을 때 사용. 함수 의존성, 실행 흐름 분석에 사용.",
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
    const binary = input.binary_path as string;
    const proc = input.procedure as string;

    const args = ["function", binary, proc, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const normalized = (obj.normalized_result || obj) as Record<string, unknown>;
      if (normalized.callees) {
        return formatGhidraResult(`Callees(${proc})`, binary, result, normalized.callees);
      }
      if (data) return formatGhidraResult(`Callees(${proc})`, binary, result, data);
    }
    
    return formatGhidraResult(`Callees(${proc})`, binary, result, data || result.stdout);
  },
};

export const GhidraTraceTool: Tool = {
  name: "GhidraTrace",
  description:
    "두 함수 사이의 호출 경로 추적. A에서 B로 가는 호출 체인이 있는지, 어떤 경로로 도달하는지 찾기. 정적 경로 분석. Bounded traces — 제한된 깊이 내에서 경로 탐색.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      query: { type: "string", description: "추적 쿼리 (예: 함수 이름 또는 패턴)" },
      from: { type: "string", description: "시작 함수 (선택, 없으면 전체에서 검색)" },
    },
    required: ["binary_path", "query"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const query = input.query as string;

    const args = ["trace", binary, query, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`Trace("${query}")`, binary, result, data || result.stdout);
  },
};

export const GhidraCallGraphTool: Tool = {
  name: "GhidraCallGraph",
  description:
    "특정 함수를 시작으로 호출 그래프 생성. 깊이별로 어떤 함수를 호출하는지 트리 형태로 표시. 전체 프로그램의 호출 구조를 이해할 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "시작 함수 (이름 또는 주소)" },
      depth: { type: "string", description: "탐색 깊이 (기본 3, 예: 5)" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const proc = input.procedure as string;
    const depth = (input.depth as string) || "3";

    // REA CLI에는 get_call_graph 직접 명령이 없으므로 trace로 대체
    // MCP에서는 get_call_graph가 있지만 CLI에서는 function의 호출 정보로 유추
    const args = ["function", binary, proc, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    
    if (data) {
      return `✅ Ghidra CallGraph (${proc}, depth=${depth}, ${binary}):\n${JSON.stringify(data, null, 2).slice(0, 8000)}\n\n💡 깊이 ${depth}의 전체 그래프가 필요하면 MCP get_call_graph를 사용하거나, 각 callee를 재귀적으로 조회하세요.`;
    }
    
    return formatGhidraResult(`CallGraph(${proc})`, binary, result, data || result.stdout);
  },
};

export const GhidraResolveCallTargetsTool: Tool = {
  name: "GhidraResolveCallTargets",
  description:
    "특정 호출 지점의 대상 해석. 간접 호출(함수 포인터, 가상 함수 등)의 실제 대상을 Ghidra가 어떻게 분석했는지 확인. 콜 사이트 주소 필요.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      call_site: { type: "string", description: "호출 지점 주소 (예: 0x401010)" },
    },
    required: ["binary_path", "call_site"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const site = input.call_site as string;

    const args = ["resolve-native-call-targets", binary, site, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`ResolveCallTargets(${site})`, binary, result, data || result.stdout);
  },
};
