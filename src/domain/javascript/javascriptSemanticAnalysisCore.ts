import * as t from "@babel/types";
import {
  failedJavaScriptSemanticIr,
  type JavaScriptSemanticIr,
  type JavaScriptSemanticReference,
} from "./javascriptSemanticIr.js";
import {
  collectSemanticModuleLink,
  collectSemanticReferences,
  collectSemanticReferencesSteps,
  immutableSemanticBindings,
  immutableSemanticScopes,
} from "./javascriptSemanticProjection.js";
import type { JavaScriptSemanticAnalysisState } from "./javascriptSemanticState.js";
import {
  completeSemanticSteps,
  traverseJavaScriptAstSteps,
} from "./javascriptSemanticTraversal.js";
import { collectSemanticMemberMutationsSteps } from "./javascriptSemanticMemberMutations.js";
import { indexJavaScriptAmbientWritesSteps } from "./javascriptSemanticAmbientWrites.js";
import { hasUncertainTypeOnlyModuleSideEffect } from "./javascriptModuleDeclaration.js";
import {
  collectSemanticReturns,
  resolveSemanticModuleCallables,
} from "./javascriptSemanticReturns.js";
import { collectJavaScriptDerivedSemanticsSteps } from "./javascriptSemanticDerivedAnalysis.js";
import { semanticCoverage } from "./javascriptSemanticCoverage.js";
import {
  parseJavaScriptSource,
  type ParsedJavaScriptSource,
} from "./javascriptSourceParser.js";
import { indexCommonJsExportReceiversSteps } from "./javascriptCommonJsExportReceivers.js";
import type { JavaScriptModuleResolutionMode } from "./javascriptModuleResolutionMode.js";
import {
  createState,
  collectDefinitionsSteps,
} from "./javascriptSemanticAnalysisDefinitions.js";
import {
  classifyDefinitionReceiversSteps,
  type JavaScriptReceiverFacts,
  type JavaScriptReceiverIndex,
  type JavaScriptOpenReceiverFact,
} from "./javascriptSemanticAnalysisReceivers.js";

export type {
  JavaScriptOpenReceiverFact,
  JavaScriptReceiverFacts,
  JavaScriptReceiverIndex,
};

/** Recover lexical bindings, aliases, constants, and module links. */
export const analyzeJavaScriptSemantics = (
  source: string,
): JavaScriptSemanticIr => {
  const file = parseJavaScriptSource(source);
  return file === null
    ? failedJavaScriptSemanticIr()
    : analyzeParsedJavaScriptSemantics(file);
};
/** Recover lexical references, optionally for one name, without evaluating values or provenance. */
export const analyzeParsedJavaScriptReferences = (
  file: Pick<ParsedJavaScriptSource, "program">,
  name?: string,
): readonly JavaScriptSemanticReference[] => {
  const state = createState(file.program);
  completeSemanticSteps(collectDefinitionsSteps(file.program, state));
  return collectSemanticReferences(file.program, state, name);
};
/** Share the lexical index with bounded, demand-driven boundary analyses. */
export function* indexJavaScriptBindingsSteps(
  program: t.Program,
): Generator<void, JavaScriptSemanticAnalysisState> {
  const state = createState(program);
  yield* collectDefinitionsSteps(program, state);
  yield* indexJavaScriptAmbientWritesSteps(program, state);
  return state;
}
/** Recover semantics from an already parsed JavaScript artifact. */
export const analyzeParsedJavaScriptSemantics = (
  file: ParsedJavaScriptSource,
  staticImportResolutionMode: JavaScriptModuleResolutionMode = "import",
): JavaScriptSemanticIr =>
  completeSemanticSteps(
    analyzeParsedJavaScriptSemanticsSteps(file, staticImportResolutionMode),
  );
/**
 * Recover semantics from a parsed artifact with a yield between analysis
 * phases, so a caller can serve control messages within one large file.
 */
export function* analyzeParsedJavaScriptSemanticsSteps(
  file: ParsedJavaScriptSource,
  staticImportResolutionMode: JavaScriptModuleResolutionMode = "import",
): Generator<void, JavaScriptSemanticIr> {
  const state = createState(file.program, staticImportResolutionMode);
  yield* collectDefinitionsSteps(file.program, state);
  yield* indexJavaScriptAmbientWritesSteps(file.program, state);
  yield* collectSemanticMemberMutationsSteps(file.program, state);
  const commonJsReceivers = yield* indexCommonJsExportReceiversSteps(state);
  yield* traverseJavaScriptAstSteps(file.program, {
    enter: (node) => collectSemanticModuleLink(node, state, commonJsReceivers),
  });
  yield;
  const references = yield* collectSemanticReferencesSteps(file.program, state);
  const parserPartial = file.errors.length > 0;
  const bindings = immutableSemanticBindings(state);
  yield;
  const callables = collectSemanticReturns(state, parserPartial);
  yield;
  const moduleLinks = resolveSemanticModuleCallables(
    state,
    callables,
    bindings,
  );
  const derived = yield* collectJavaScriptDerivedSemanticsSteps(
    file.program,
    state,
    callables,
    parserPartial,
  );
  return {
    schema: "JavaScriptSemanticIR",
    scopes: immutableSemanticScopes(state),
    bindings,
    callables,
    references,
    moduleLinks,
    ...derived,
    coverage: semanticCoverage(
      parserPartial,
      [...state.valueResourceLimits].sort(),
    ),
    limitations: [
      ...(parserPartial
        ? [
            "The parser recovered from syntax errors; affected bindings are partial.",
          ]
        : []),
      ...(hasUncertainTypeOnlyModuleSideEffect(file.program)
        ? [
            "Compiler options are unavailable; inline type-only imports or re-exports may preserve a module side-effect dependency.",
          ]
        : []),
      "Values and aliases were recovered from inert syntax only; no JavaScript was executed.",
      "Return sites include only direct callable returns; nested callable returns remain separate.",
      "Local call, argument, return, and closure relations are static candidates and do not prove runtime invocation.",
      "Promise ownership covers explicit unshadowed Promise construction, static factories, aggregation, chaining, and await syntax only.",
      "Cross-function mutation and dynamic property resolution remain unknown.",
    ],
  };
}
/**
 * Index bindings and classify receivers from one definitions pass.
 */
export function* indexJavaScriptBindingsWithReceiversSteps(
  program: t.Program,
): Generator<void, JavaScriptReceiverIndex> {
  const state = createState(program);
  yield* collectDefinitionsSteps(program, state);
  const receivers = yield* classifyDefinitionReceiversSteps(program, state);
  let ambientIndexed = false;
  let references: readonly JavaScriptSemanticReference[] | undefined;
  return {
    sourceType: program.sourceType,
    bindings: state,
    receivers,
    *indexAmbientWritesSteps() {
      if (ambientIndexed) return;
      yield* indexJavaScriptAmbientWritesSteps(program, state);
      ambientIndexed = true;
    },
    *referencesSteps() {
      references ??= yield* collectSemanticReferencesSteps(program, state);
      return references;
    },
  };
}
/**
 * Proven Electron export path segments for call and construction roots, keyed by
 * root offset. Only proven Electron origins are present; callers must not
 * infer an Electron export from an absent entry or familiar local name.
 */
export const classifyParsedJavaScriptElectronBindings = (
  file: ParsedJavaScriptSource,
): ReadonlyMap<number, readonly string[]> =>
  completeSemanticSteps(classifyParsedJavaScriptElectronBindingsSteps(file));
/** Resolve Electron aliases while yielding during lexical and AST scans. */
export function* classifyParsedJavaScriptElectronBindingsSteps(
  file: ParsedJavaScriptSource,
): Generator<void, ReadonlyMap<number, readonly string[]>> {
  const state = createState(file.program);
  yield* collectDefinitionsSteps(file.program, state);
  return (yield* indexJavaScriptElectronIdentitySteps(file.program, state))
    .bindings;
}
/** Shared lexical identity and visible-write proof for direct and wrapped calls. */
export interface JavaScriptElectronIdentity {
  readonly bindings: ReadonlyMap<number, readonly string[]>;
  readonly intactExport: (path: readonly (string | null)[]) => boolean;
  readonly exportPath: (root: t.Node) => readonly string[] | undefined;
}
