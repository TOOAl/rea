/**
 * Ghidra Tools — Ghidra의 모든 기능을 Arena Code 도구로 제공
 * REA Ghidra Provider 기반 (nsa.gov Ghidra, Apache 2.0)
 */
import type { Tool } from "./types.js";

// Helpers
export * from "./helpers.js";

// Inspect
import { GhidraInspectTool, GhidraOverviewTool } from "./inspect.js";

// Procedures
import {
  GhidraListProceduresTool,
  GhidraAnalyzeFunctionTool,
  GhidraListNamesTool,
  GhidraListSegmentsTool,
} from "./procedures.js";

// Decompile
import {
  GhidraDecompileTool,
  GhidraProcedurePseudoCodeTool,
  GhidraBatchDecompileTool,
} from "./decompile.js";

// Instructions
import {
  GhidraInstructionsTool,
  GhidraInspectInstructionTool,
  GhidraReadBytesTool,
  GhidraInspectDataTypeTool,
} from "./instructions.js";

// Search
import {
  GhidraSearchTool,
  GhidraSearchProceduresTool,
  GhidraSearchStringsTool,
  GhidraSearchBytesTool,
  GhidraListStringsTool,
} from "./search.js";

// Refs
import {
  GhidraXrefsTool,
  GhidraCallersTool,
  GhidraCalleesTool,
  GhidraTraceTool,
  GhidraCallGraphTool,
  GhidraResolveCallTargetsTool,
} from "./refs.js";

// Annotate
import {
  GhidraAnnotateTool,
  GhidraSetNameTool,
  GhidraSetCommentTool,
  GhidraCompareFunctionsTool,
  GhidraCompareArtifactsTool,
} from "./annotate.js";

// 전체 26개 도구
export const GHIDRA_TOOLS: Tool[] = [
  // 1. 기본 분석 (2)
  GhidraInspectTool,
  GhidraOverviewTool,

  // 2. 함수/심볼 (4)
  GhidraListProceduresTool,
  GhidraAnalyzeFunctionTool,
  GhidraListNamesTool,
  GhidraListSegmentsTool,

  // 3. 디컴파일 (3)
  GhidraDecompileTool,
  GhidraProcedurePseudoCodeTool,
  GhidraBatchDecompileTool,

  // 4. 명령어/바이트 (4)
  GhidraInstructionsTool,
  GhidraInspectInstructionTool,
  GhidraReadBytesTool,
  GhidraInspectDataTypeTool,

  // 5. 검색 (5)
  GhidraSearchTool,
  GhidraSearchProceduresTool,
  GhidraSearchStringsTool,
  GhidraSearchBytesTool,
  GhidraListStringsTool,

  // 6. 참조/그래프 (6)
  GhidraXrefsTool,
  GhidraCallersTool,
  GhidraCalleesTool,
  GhidraTraceTool,
  GhidraCallGraphTool,
  GhidraResolveCallTargetsTool,

  // 7. 어노테이션/비교 (5)
  GhidraAnnotateTool,
  GhidraSetNameTool,
  GhidraSetCommentTool,
  GhidraCompareFunctionsTool,
  GhidraCompareArtifactsTool,
];

// 카테고리별
export const GHIDRA_TOOL_CATEGORIES = {
  inspect: [GhidraInspectTool, GhidraOverviewTool],
  procedures: [GhidraListProceduresTool, GhidraAnalyzeFunctionTool, GhidraListNamesTool, GhidraListSegmentsTool],
  decompile: [GhidraDecompileTool, GhidraProcedurePseudoCodeTool, GhidraBatchDecompileTool],
  instructions: [GhidraInstructionsTool, GhidraInspectInstructionTool, GhidraReadBytesTool, GhidraInspectDataTypeTool],
  search: [GhidraSearchTool, GhidraSearchProceduresTool, GhidraSearchStringsTool, GhidraSearchBytesTool, GhidraListStringsTool],
  refs: [GhidraXrefsTool, GhidraCallersTool, GhidraCalleesTool, GhidraTraceTool, GhidraCallGraphTool, GhidraResolveCallTargetsTool],
  annotate: [GhidraAnnotateTool, GhidraSetNameTool, GhidraSetCommentTool, GhidraCompareFunctionsTool, GhidraCompareArtifactsTool],
};

// 개별 export
export {
  GhidraInspectTool, GhidraOverviewTool,
  GhidraListProceduresTool, GhidraAnalyzeFunctionTool, GhidraListNamesTool, GhidraListSegmentsTool,
  GhidraDecompileTool, GhidraProcedurePseudoCodeTool, GhidraBatchDecompileTool,
  GhidraInstructionsTool, GhidraInspectInstructionTool, GhidraReadBytesTool, GhidraInspectDataTypeTool,
  GhidraSearchTool, GhidraSearchProceduresTool, GhidraSearchStringsTool, GhidraSearchBytesTool, GhidraListStringsTool,
  GhidraXrefsTool, GhidraCallersTool, GhidraCalleesTool, GhidraTraceTool, GhidraCallGraphTool, GhidraResolveCallTargetsTool,
  GhidraAnnotateTool, GhidraSetNameTool, GhidraSetCommentTool, GhidraCompareFunctionsTool, GhidraCompareArtifactsTool,
};
