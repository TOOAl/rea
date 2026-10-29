import { moduleResolutionModeForJavaScriptReference } from "../../domain/javascript/javascriptModuleResolutionMode.js";
import { setImmediate } from "node:timers/promises";

import { analyzeParsedJavaScriptStaticSourceSteps } from "../../domain/javascript/javascriptStaticAnalysis.js";
import { analyzeParsedJavaScriptSemanticsSteps } from "../../domain/javascript/javascriptSemanticAnalysis.js";
import type { JavaScriptSemanticIr } from "../../domain/javascript/javascriptSemanticIr.js";
import { projectJavaScriptModuleSemantics } from "../../domain/javascript/javascriptModuleSemanticIr.js";
import { parseJavaScriptSource } from "../../domain/javascript/javascriptSourceParser.js";
import { failedJavaScriptStaticAnalysis } from "../../domain/javascript/javascriptStaticAnalysisHelpers.js";
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
import type { JavaScriptSourceAnalysisPort } from "../../domain/javascript/javascriptSourceAnalysis.js";
import type { JavaScriptSemanticGraphProjection } from "./JavaScriptSemanticGraphBuilder.js";
import { AnalysisError } from "../../domain/analysisErrorBase.js";
import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
import {
  AnalysisCancelledError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
} from "../../domain/analysisErrorCore.js";
import {
  classifyOutsideAnalysisScope,
  addSourceMap,
  emptyArtifactAnalysis,
  addStructuredObservations,
  parseHtmlScripts,
  findingCount,
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
export const analyzeAndAdoptJavaScriptArtifactFiles = async (
  fileSet: JavaScriptArtifactFileSet,
  worker: Pick<JavaScriptSourceAnalysisPort, "analyze">,
  projection: JavaScriptSemanticGraphProjection,
  beforeFile: (
    file: JavaScriptArtifactFile,
    completed: number,
    total: number,
  ) => Promise<void>,
  signal?: AbortSignal,
): Promise<{
  readonly analysis: JavaScriptModuleArtifactAnalysis;
  readonly interruption: AnalysisError | null;
}> => {
  const state = emptyArtifactAnalysis<JavaScriptModuleSemanticIr>();
  let interruption: AnalysisError | null = null;
  const selectedFileCount =
    fileSet.files.length - (fileSet.source_selection?.unselected_files ?? 0);
  let selectedFileIndex = 0;
  for (const file of fileSet.files) {
    try {
      await setImmediate();
      if (classifyOutsideAnalysisScope(file, state, projection)) {
        if (signal?.aborted === true) {
          interruption = new AnalysisCancelledError(
            "analyze_javascript_application",
          );
          break;
        }
        continue;
      }
      if (signal?.aborted === true)
        throw new AnalysisCancelledError("analyze_javascript_application");
      await beforeFile(file, selectedFileIndex++, selectedFileCount);
      if (file.kind !== "javascript" || !file.text.included) {
        const steps = analyzeArtifactFileSteps(file, {
          state,
          projectSemantics: function* (_file, ir) {
            yield;
            return projectJavaScriptModuleSemantics(ir);
          },
        });
        await completeJavaScriptAnalysisSteps(steps, signal);
        continue;
      }
      const result = await worker.analyze(
        file,
        projection.remainingFileNodeBudget(),
        signal,
      );
      const facts = result.ok ? result.value : result.error;
      const applicationProjectionFailure = facts.applicationProjectionFailure;
      if (facts.projection !== null)
        projection.adoptFileProjection(facts.projection);
      const error = result.ok ? null : result.error.error;
      const limits =
        error instanceof AnalysisResourceConstraintError
          ? error.reportedLimits
          : error instanceof AnalysisTimeoutError
            ? { worker_timeout_ms: error.timeoutMs }
            : null;
      const failure =
        error === null
          ? undefined
          : {
              reason: `${file.path}: ${error.message}`,
              error: projectAnalysisError(error),
              limits,
            };
      state.files.push({
        file,
        javascript: facts.javascript,
        semantic: facts.module === null ? null : { ir: facts.module },
        ...(failure === undefined ? {} : { analysis_failure: failure }),
        ...(applicationProjectionFailure === undefined
          ? {}
          : {
              application_projection_failure: {
                reason: applicationProjectionFailure.message,
                error: projectAnalysisError(applicationProjectionFailure),
                limits: applicationProjectionFailure.reportedLimits,
              },
            }),
      });
      if (failure !== undefined && facts.projection === null)
        projection.recordUnavailableFile(
          file,
          failure.reason,
          failure.limits,
          error instanceof AnalysisResourceConstraintError ||
            error instanceof AnalysisTimeoutError
            ? "resource-limit"
            : "incomplete-module",
        );
      if (facts.javascript !== null) {
        state.visitedNodes += facts.javascript.visited_ast_nodes;
        state.findings +=
          findingCount(facts.javascript) +
          (facts.module?.moduleLinks.length ?? 0);
        state.modules += facts.javascript.bundler_registrations.reduce(
          (count, item) => count + item.modules.length,
          0,
        );
        if (facts.javascript.parse_status === "failed")
          state.parseFailures += 1;
      }
      if (
        error !== null &&
        (!(error instanceof AnalysisResourceConstraintError) ||
          error.reportedLimits?.parent_result_budget_exhausted === true)
      ) {
        interruption = error;
        break;
      }
    } catch (cause: unknown) {
      if (signal?.aborted !== true && !(cause instanceof AnalysisError))
        throw cause;
      interruption =
        signal?.aborted === true
          ? new AnalysisCancelledError("analyze_javascript_application")
          : cause instanceof AnalysisError
            ? cause
            : null;
      if (interruption !== null) {
        state.files.push({
          file,
          javascript: null,
          semantic: null,
          analysis_failure: {
            reason: `${file.path}: ${interruption.message}`,
            error: projectAnalysisError(interruption),
            limits: null,
          },
        });
        projection.recordUnavailableFile(
          file,
          interruption.message,
          null,
          "incomplete-module",
        );
      }
      break;
    }
  }
  if (interruption !== null) {
    const analyzedPaths = new Set(state.files.map(({ file }) => file.path));
    const failure = {
      reason: `Source analysis was interrupted: ${interruption.message}`,
      error: projectAnalysisError(interruption),
      limits:
        interruption instanceof AnalysisResourceConstraintError
          ? interruption.reportedLimits
          : interruption instanceof AnalysisTimeoutError
            ? { worker_timeout_ms: interruption.timeoutMs }
            : null,
    };
    for (const file of fileSet.files) {
      if (analyzedPaths.has(file.path)) continue;
      if (classifyOutsideAnalysisScope(file, state, projection)) continue;
      state.files.push({
        file,
        javascript: null,
        semantic: null,
        analysis_failure: failure,
      });
      if (file.kind === "javascript")
        projection.recordUnavailableFile(
          file,
          failure.reason,
          failure.limits,
          interruption instanceof AnalysisResourceConstraintError ||
            interruption instanceof AnalysisTimeoutError
            ? "resource-limit"
            : "incomplete-module",
        );
    }
  }
  return { analysis: finalizeArtifactAnalysis(state), interruption };
};

const analyzeArtifactFiles = <SemanticIr extends JavaScriptModuleSemanticIr>(
  fileSet: JavaScriptArtifactFileSet,
  projectSemantics: ArtifactAnalysisContext<SemanticIr>["projectSemantics"],
): JavaScriptArtifactAnalysis<SemanticIr> => {
  const state = emptyArtifactAnalysis<SemanticIr>();
  const context = { state, projectSemantics };
  for (const file of fileSet.files) {
    const steps = analyzeArtifactFileSteps(file, context);
    while (steps.next().done !== true);
  }
  return finalizeArtifactAnalysis(state);
};

function* analyzeArtifactFileSteps<
  SemanticIr extends JavaScriptModuleSemanticIr,
>(
  file: JavaScriptArtifactFile,
  context: ArtifactAnalysisContext<SemanticIr>,
): Generator<void, void> {
  const { state } = context;
  if (classifyOutsideAnalysisScope(file, state)) return;
  addStructuredObservations(file, state);
  if (file.kind === "html" && file.text.included) {
    const html = parseHtmlScripts(file.path, file.text.value);
    for (const script of html.scripts) state.htmlScripts.push(script);
    if (html.inlineScripts !== null)
      state.htmlInlineScripts.push(html.inlineScripts);
  }
  if (file.kind === "source-map") addSourceMap(file, context);
  if (file.kind !== "javascript" || !file.text.included) {
    state.files.push({ file, javascript: null, semantic: null });
    return;
  }
  const parsed = parseJavaScriptSource(file.text.value, file.path);
  yield;
  if (parsed === null) {
    const analysis = failedJavaScriptStaticAnalysis();
    state.files.push({ file, javascript: analysis, semantic: null });
    state.parseFailures += 1;
    return;
  }
  const analysis = yield* analyzeParsedJavaScriptStaticSourceSteps(
    file.text.value,
    parsed,
  );
  const staticFindings = findingCount(analysis);
  yield;
  const semantics =
    analysis.parse_status === "complete" || analysis.parse_status === "partial"
      ? yield* analyzeParsedJavaScriptSemanticsSteps(
          parsed,
          moduleResolutionModeForJavaScriptReference(
            file.path,
            "static-import",
          ),
        )
      : null;
  const projected =
    semantics === null
      ? null
      : yield* context.projectSemantics(file, semantics);
  state.files.push({
    file,
    javascript: analysis,
    semantic: projected === null ? null : { ir: projected },
  });
  state.visitedNodes += analysis.visited_ast_nodes;
  state.findings += staticFindings + (semantics?.moduleLinks.length ?? 0);
  state.modules += analysis.bundler_registrations.reduce(
    (count, registration) => count + registration.modules.length,
    0,
  );
  if (analysis.parse_status === "failed") state.parseFailures += 1;
}
