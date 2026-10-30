import { setImmediate } from "node:timers/promises";
import type { JavaScriptSemanticIr } from "../../domain/javascript/javascriptSemanticIr.js";
import { projectJavaScriptModuleSemantics } from "../../domain/javascript/javascriptModuleSemanticIr.js";
import type {
  JavaScriptArtifactFile,
  JavaScriptArtifactFileSet,
} from "../../domain/javascript/javascriptArtifactFiles.js";
import type {
  JavaScriptArtifactAnalysis,
  JavaScriptModuleArtifactAnalysis,
  JavaScriptModuleSemanticIr,
} from "./JavaScriptArtifactAnalysisTypes.js";
import { completeJavaScriptAnalysisSteps } from "./JavaScriptAnalysisControl.js";
import {
  addSourceMap,
  emptyArtifactAnalysis,
  parseHtmlScripts,
  finalizeArtifactAnalysis,
  type MutableArtifactAnalysis,
} from "./JavaScriptArtifactAnalysisHelpers.js";

export { htmlInlineScriptLimitation } from "./JavaScriptArtifactAnalysisHelpers.js";

interface ArtifactAnalysisContext<
  SemanticIr extends JavaScriptModuleSemanticIr,
> {
  readonly state: MutableArtifactAnalysis<SemanticIr>;
  readonly projectSemantics: (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
  ) => Generator<void, SemanticIr>;
}

/** Analyze every text source from the artifact without a result quota. */
export const analyzeJavaScriptArtifactFiles = (
  fileSet: JavaScriptArtifactFileSet,
): JavaScriptArtifactAnalysis =>
  analyzeArtifactFiles(fileSet, function* (_file, ir) {
    yield;
    return ir;
  });

/**
 * Project each file's full IR immediately, retaining only later module facts.
 * Parsing, analysis and each projection pass run as separate steps, so control
 * messages and cancellation are handled within one large file as well.
 */
export const analyzeAndProjectJavaScriptArtifactFiles = async (
  fileSet: JavaScriptArtifactFileSet,
  projectSemantics: (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
  ) => Iterator<void, void> | void,
  beforeFile?: (
    file: JavaScriptArtifactFile,
    completed: number,
    total: number,
  ) => Promise<void>,
  signal?: AbortSignal,
): Promise<JavaScriptModuleArtifactAnalysis> => {
  const state = emptyArtifactAnalysis<JavaScriptModuleSemanticIr>();
  const projectFileSemantics = function* (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
  ): Generator<void, JavaScriptModuleSemanticIr> {
    const projection = projectSemantics(file, ir);
    if (projection !== undefined) while (projection.next().done !== true) yield;
    return projectJavaScriptModuleSemantics(ir);
  };
  const context = { state, projectSemantics: projectFileSemantics };
  for (const [index, file] of fileSet.files.entries()) {
    await setImmediate();
    await beforeFile?.(file, index, fileSet.files.length);
    await completeJavaScriptAnalysisSteps(
      analyzeArtifactFileSteps(file, context),
      signal,
    );
  }
  return finalizeArtifactAnalysis(state);
};

/** Analyze sources behind a hard heap boundary, retaining collected facts on interruption. */
