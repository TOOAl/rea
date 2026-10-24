/**
 * Tools Index — Registry 기반 등록 + 외부 패키지 통합
 * Phase 1: registry 빌드 팩토리 + 하위 호환 ALL_TOOLS
 * Phase 4: @arena-code/ghidra-tools, @arena-code/rea-bridge 외부 패키지 import
 */
import { ReadTool } from "./read.js";
import { WriteTool } from "./write.js";
import { EditTool } from "./edit.js";
import { BashTool } from "./bash.js";
import { GlobTool } from "./glob.js";
import { GrepTool } from "./grep.js";
import { TodoWriteTool } from "./todo.js";
import { WebFetchTool } from "./webfetch.js";
import { WebSearchTool } from "./webSearch.js";
import { ResearchTool } from "../loop/research.js";
import { BrainsTool } from "./brains.js";
import { BROWSER_TOOLS } from "./browser.js";
import { SERENA_TOOLS } from "./serena.js";
import { ATLASSIAN_TOOLS } from "./atlassian.js";
import type { Tool } from "./types.js";
import { ToolRegistry } from "./registry.js";
import { GHIDRA_TOOLS as _InternalGhidraTools } from "./ghidra/index.js";

// 내부 ghidra shim — packages/ghidra-tools를 우선 시도, 없으면 내부 ghidra로 fallback
async function loadGhidraTools(): Promise<Tool[]> {
  try {
    // 외부 패키지 시도
    const mod = await import(
      "../../packages/ghidra-tools/src/index.js" as string
    );
    return (mod.GHIDRA_TOOLS ?? []) as Tool[];
  } catch {
    /* 외부 없으면 내부 */
  }
  try {
    const mod2 = await import("./ghidra/index.js");
    return (mod2.GHIDRA_TOOLS ?? []) as Tool[];
  } catch {
    return [];
  }
}

// 내부 rea-bridge fallback (동적 — 실패해도 진행)
async function loadReaTools(): Promise<Tool[]> {
  try {
    const mod = await import(
      "../../packages/rea-bridge/src/index.js" as string
    );
    return (mod.REA_TOOLS ?? []) as Tool[];
  } catch {
    return [];
  }
}

export const CORE_TOOLS_LIST: Tool[] = [
  ReadTool,
  WriteTool,
  EditTool,
  BashTool,
  GlobTool,
  GrepTool,
  TodoWriteTool,
  WebFetchTool,
  WebSearchTool,
  ResearchTool,
  BrainsTool,
  ...BROWSER_TOOLS,
  ...SERENA_TOOLS,
  ...ATLASSIAN_TOOLS,
];

// 동기 버전 — 내부 패키지만 (기존 호환, 외부 없이 빌드 가능)
let _syncGhidraTools: Tool[] | null = null;
export function buildRegistry(disabledTools: string[] = []): ToolRegistry {
  const reg = new ToolRegistry();
  reg.registerAll(CORE_TOOLS_LIST, { category: "core", source: "builtin" });
  reg.registerAll(_InternalGhidraTools as Tool[], {
    category: "ghidra",
    source: "builtin",
  });
  if (disabledTools.length) reg.disableMany(disabledTools);
  return reg;
}

// 비동기 버전 — 외부 패키지 포함 (권장)
export async function buildRegistryAsync(
  disabledTools: string[] = [],
): Promise<ToolRegistry> {
  const reg = new ToolRegistry();
  reg.registerAll(CORE_TOOLS_LIST, { category: "core", source: "builtin" });
  const [ghidraTools, reaTools] = await Promise.all([
    loadGhidraTools(),
    loadReaTools(),
  ]);
  if (ghidraTools.length)
    reg.registerAll(ghidraTools, {
      category: "ghidra",
      source: "@arena-code/ghidra-tools",
    });
  if (reaTools.length)
    reg.registerAll(reaTools, {
      category: "rea" as unknown as "plugin",
      source: "@arena-code/rea-bridge",
    });
  if (disabledTools.length) reg.disableMany(disabledTools);
  return reg;
}

export const ALL_TOOLS: Tool[] = [...CORE_TOOLS_LIST, ..._InternalGhidraTools];
export const CORE_TOOLS: Tool[] = [...CORE_TOOLS_LIST];
export const GHIDRA_ONLY_TOOLS: Tool[] = [..._InternalGhidraTools];

export * from "./types.js";
export * from "./ghidra/index.js";
export * from "./registry.js";
