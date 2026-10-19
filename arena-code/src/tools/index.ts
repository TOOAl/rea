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

// 기본 도구 8개 + Ghidra 26개 = 총 34개
export const ALL_TOOLS: Tool[] = [
  ReadTool,
  WriteTool,
  EditTool,
  BashTool,
  GlobTool,
  GrepTool,
  TodoWriteTool,
  WebFetchTool,
  ...GHIDRA_TOOLS,
];

// 카테고리별
export const CORE_TOOLS: Tool[] = [ReadTool, WriteTool, EditTool, BashTool, GlobTool, GrepTool, TodoWriteTool, WebFetchTool];
export const GHIDRA_ONLY_TOOLS = GHIDRA_TOOLS;

export * from "./types.js";
export * from "./ghidra/index.js";
