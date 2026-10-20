/**
 * Tools Index — Registry 기반 등록 + 하위 호환 ALL_TOOLS 유지
 * Phase 1: registry를 기본으로 하되, 기존 import { ALL_TOOLS } 코드는 그대로 동작
 */
import { ReadTool } from "./read.js";
import { WriteTool } from "./write.js";
import { EditTool } from "./edit.js";
import { BashTool } from "./bash.js";
import { GlobTool } from "./glob.js";
import { GrepTool } from "./grep.js";
import { TodoWriteTool } from "./todo.js";
import { WebFetchTool } from "./webfetch.js";
import { GHIDRA_TOOLS } from "./ghidra/index.js";
import type { Tool } from "./types.js";
import { ToolRegistry } from "./registry.js";

export const CORE_TOOLS_LIST: Tool[] = [ReadTool, WriteTool, EditTool, BashTool, GlobTool, GrepTool, TodoWriteTool, WebFetchTool];

// Registry 팩토리 — config.disabledTools를 반영해 생성
export function buildRegistry(disabledTools: string[] = []): ToolRegistry {
  const reg = new ToolRegistry();
  reg.registerAll(CORE_TOOLS_LIST, { category: "core", source: "builtin" });
  reg.registerAll(GHIDRA_TOOLS, { category: "ghidra", source: "builtin" });
  if (disabledTools.length) reg.disableMany(disabledTools);
  return reg;
}

// ── 하위 호환: 기존 ALL_TOOLS / CORE_TOOLS 그대로 export ──
// (cli.ts 등에서 import { ALL_TOOLS } 유지)
export const ALL_TOOLS: Tool[] = [...CORE_TOOLS_LIST, ...GHIDRA_TOOLS];
export const CORE_TOOLS: Tool[] = [...CORE_TOOLS_LIST];
export const GHIDRA_ONLY_TOOLS = GHIDRA_TOOLS;

export * from "./types.js";
export * from "./ghidra/index.js";
export * from "./registry.js";
