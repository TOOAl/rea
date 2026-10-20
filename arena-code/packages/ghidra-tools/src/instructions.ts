/**
 * Ghidra Instructions — 어셈블리/명령어 분석
 * REA: rea instructions, rea inspect-native-instruction, rea read-bytes
 * MCP: read_function_instructions, inspect_native_instruction, read_bytes
 */
import type { Tool, ToolContext } from "./types.js";
import { runReaCommand, parseJsonOutput, formatGhidraResult } from "./helpers.js";

export const GhidraInstructionsTool: Tool = {
  name: "GhidraInstructions",
  description:
    "함수의 어셈블리 명령어를 모두 반환. 바이트, 니모닉, 오퍼랜드, 레지스터, 참조, 플로우 정보 포함. 어셈블리 레벨에서 분석할 때 사용. 디컴파일보다 정확한 저수준 정보.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      procedure: { type: "string", description: "함수 이름 또는 주소" },
    },
    required: ["binary_path", "procedure"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const proc = input.procedure as string;

    const args = ["instructions", binary, proc, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`Instructions(${proc})`, binary, result, data || result.stdout);
  },
};

export const GhidraInspectInstructionTool: Tool = {
  name: "GhidraInspectInstruction",
  description:
    "단일 주소의 명령어를 상세 분석. 바이트, 길이, 디코더 텍스트, 레지스터/스칼라/주소 토큰, 참조, 플로우 분류, incoming references 포함. 특정 주소의 명령어가 궁금할 때 사용.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      address: { type: "string", description: "명령어 주소 (예: 0x401000)" },
    },
    required: ["binary_path", "address"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const addr = input.address as string;

    const args = ["inspect-native-instruction", binary, addr, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`InspectInstruction(${addr})`, binary, result, data || result.stdout);
  },
};

export const GhidraReadBytesTool: Tool = {
  name: "GhidraReadBytes",
  description:
    "바이너리의 특정 주소에서 바이트를 읽기. 메모리 덤프, 데이터 추출, 패치 확인 등에 사용. Ghidra가 로드한 메모리 이미지를 읽음.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      address: { type: "string", description: "읽을 주소 (예: 0x401000)" },
      length: { type: "string", description: "읽을 바이트 수 (기본 16, 예: 32)" },
    },
    required: ["binary_path", "address"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const addr = input.address as string;
    const len = (input.length as string) || "16";

    const args = ["read-bytes", binary, "--address", addr, "--length", len, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);
    return formatGhidraResult(`ReadBytes(${addr}, len=${len})`, binary, result, data || result.stdout);
  },
};

export const GhidraInspectDataTypeTool: Tool = {
  name: "GhidraInspectDataType",
  description:
    "Ghidra 데이터 타입 조회. 구조체, 열거형, 타입 정의 등. 리버스 엔지니어링 중 데이터 구조를 이해할 때 사용. 타입 이름(예: /MyStruct) 또는 주소로 조회.",
  inputSchema: {
    type: "object",
    properties: {
      binary_path: { type: "string", description: "바이너리 경로" },
      type_name: { type: "string", description: "타입 이름 (예: MyStruct) 또는 주소" },
    },
    required: ["binary_path", "type_name"],
  },
  isConcurrencySafe: true,

  async execute(input, ctx: ToolContext): Promise<string> {
    const binary = input.binary_path as string;
    const typeName = input.type_name as string;

    const args = ["inspect-native-data-type", binary, "--type", typeName, "--provider", "ghidra", "--json"];
    const result = await runReaCommand(args, ctx.cwd);
    const { data } = parseJsonOutput(result.stdout);

    if (!data && result.stdout.includes("error")) {
      // 주소로 시도
      const args2 = ["inspect-native-data-type", binary, "--address", typeName, "--provider", "ghidra", "--json"];
      const result2 = await runReaCommand(args2, ctx.cwd);
      const { data: data2 } = parseJsonOutput(result2.stdout);
      return formatGhidraResult(`InspectDataType(${typeName})`, binary, result2, data2 || result2.stdout);
    }

    return formatGhidraResult(`InspectDataType(${typeName})`, binary, result, data || result.stdout);
  },
};
