/**
 * REA Bridge Tools — REA CLI 기능 6종을 Arena 도구로 노출
 * arena-code가 REA 설치 없이도 REA로 위임해 분석 가능
 */
import type { Tool, ToolContext } from "./types.js";
import { runReaCommand, parseJsonOutput, formatReaResult } from "./helpers.js";

// 1. REA doctor — 헬스체크
const ReaDoctorTool: Tool = {
  name: "ReaDoctor",
  description: "REA 헬스체크: 설치된 provider(ghidra, jadx, apktool 등) 상태 진단. Ghidra/Rea 문제 디버깅에 먼저 사용.",
  inputSchema: {
    type: "object",
    properties: { provider: { type: "string", description: "특정 provider만 검사 (선택, 예: ghidra)" } },
    required: [],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext) {
    const args = ["doctor", "--json"];
    if (input.provider) { args.push("--provider", input.provider as string); }
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatReaResult("doctor", String(input.provider ?? "all"), result, data);
  },
};

// 2. REA analyze — 바이너리/샘플 분석 (모든 provider)
const ReaAnalyzeTool: Tool = {
  name: "ReaAnalyze",
  description: "REA로 바이너리/앱을 분석. provider=auto(자동선택) 또는 ghidra/jadx 등 지정. evidence bundle 생성.",
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string", description: "분석 대상 경로 (바이너리, APK, JS 등)" },
      provider: { type: "string", description: "provider (auto/ghidra/jadx/apktool 등, 기본 auto)" },
    },
    required: ["target"],
  },
  async execute(input, ctx: ToolContext) {
    const target = input.target as string;
    const provider = (input.provider as string) || "auto";
    const args = provider === "auto"
      ? ["analyze", target, "--json"]
      : ["analyze", target, "--provider", provider, "--json"];
    const result = await runReaCommand(args, ctx.cwd, 180_000);
    const { data } = parseJsonOutput(result.stdout);
    return formatReaResult(`analyze(${provider})`, target, result, data);
  },
};

// 3. REA inspect — 가벼운 검사
const ReaInspectTool: Tool = {
  name: "ReaInspect",
  description: "REA inspect: 대상의 메타/구조를 가볍게 조회 (analyze보다 빠름).",
  inputSchema: {
    type: "object",
    properties: { target: { type: "string", description: "검사 대상 경로" } },
    required: ["target"],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext) {
    const target = input.target as string;
    const result = await runReaCommand(["inspect", target, "--json"], ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatReaResult("inspect", target, result, data);
  },
};

// 4. REA trace — 기능 추적 (evidence bundle 경로 추적)
const ReaTraceTool: Tool = {
  name: "ReaTrace",
  description: "REA trace: evidence bundle 내 기능(function/클래스) 경로를 추적. analyze 후 사용.",
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string", description: "evidence bundle 경로 또는 원본 대상" },
      feature: { type: "string", description: "추적할 기능 키 (예: function:main)" },
    },
    required: ["target", "feature"],
  },
  async execute(input, ctx: ToolContext) {
    const target = input.target as string;
    const feature = input.feature as string;
    const result = await runReaCommand(["trace", target, feature, "--json"], ctx.cwd, 120_000);
    const { data } = parseJsonOutput(result.stdout);
    return formatReaResult(`trace(${feature})`, target, result, data);
  },
};

// 5. REA graph — evidence 그래프 조회
const ReaGraphTool: Tool = {
  name: "ReaGraph",
  description: "REA graph: evidence bundle의 애플리케이션/아티팩트 그래프를 조회.",
  inputSchema: {
    type: "object",
    properties: { target: { type: "string", description: "evidence bundle 또는 대상 경로" } },
    required: ["target"],
  },
  async execute(input, ctx: ToolContext) {
    const target = input.target as string;
    const result = await runReaCommand(["graph", target, "--json"], ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatReaResult("graph", target, result, data);
  },
};

// 6. REA catalog — 도구/액션 카탈로그
const ReaCatalogTool: Tool = {
  name: "ReaCatalog",
  description: "REA에서 지원하는 도구/액션 카탈로그를 조회.",
  inputSchema: {
    type: "object",
    properties: { provider: { type: "string", description: "provider 필터 (선택)" } },
    required: [],
  },
  isConcurrencySafe: true,
  async execute(input, ctx: ToolContext) {
    const args = ["catalog", "--json"];
    if (input.provider) { args.push("--provider", input.provider as string); }
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatReaResult("catalog", String(input.provider ?? "all"), result, data);
  },
};

export const REA_TOOLS: Tool[] = [
  ReaDoctorTool,
  ReaAnalyzeTool,
  ReaInspectTool,
  ReaTraceTool,
  ReaGraphTool,
  ReaCatalogTool,
];

export {
  ReaDoctorTool,
  ReaAnalyzeTool,
  ReaInspectTool,
  ReaTraceTool,
  ReaGraphTool,
  ReaCatalogTool,
};
