import {
  createJavaScriptSemanticGraph,
  createJavaScriptSemanticGraphUnknown,
  sealTransferredJavaScriptSemanticGraphSteps,
  type JavaScriptSemanticGraph,
} from "../../domain/javascript/javascriptSemanticGraph.js";
import {
  JAVASCRIPT_SEMANTIC_RELATION_FAMILIES,
  JAVASCRIPT_SEMANTIC_RELATION_FAMILY,
  JAVASCRIPT_SEMANTIC_RELATIONS,
} from "../../domain/javascript/javascriptSemanticGraphSchemas.js";
import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
import type { JavaScriptSemanticIr } from "../../domain/javascript/javascriptSemanticIr.js";
import { observedSemanticEvidence } from "./JavaScriptSemanticGraphEvidence.js";
import {
  partialApplicationCoverage,
  type ApplicationCoverage,
} from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
import {
  JAVASCRIPT_ANALYSIS_RESOURCE_DEFAULTS,
  JAVASCRIPT_SEMANTIC_NODE_MAXIMUM,
  javaScriptAnalysisCoverageLimits,
} from "../../domain/javascript/javascriptAnalysisResourceControls.js";
import { semanticFamilyStatus } from "./JavaScriptSemanticGraphProjection.js";
import {
  addSemanticFallbackRoot as addFallbackRoot,
  retainSemanticGraphNode as retainNode,
  createSemanticGraphProjectionState as emptyState,
  bindSemanticGraphApplicationNodes,
} from "./JavaScriptSemanticGraphConstruction.js";
import type { ElectronCallPath } from "../../domain/javascript/electronStaticAnalysisTypes.js";
import { projectFileSteps } from "./JavaScriptSemanticGraphBuilderFileSteps.js";
import type { BuilderInput } from "./JavaScriptSemanticGraphBuilderTypes.js";
/**
 * Resource-safety ceiling on retained semantic nodes.
 *
 * The semantic projection emits one node per AST expression, call site, binding
 * and property slot. That is unbounded in input size. A small tree of five files
 * already yields on the order of 170,000 nodes, and larger trees yield millions,
 * exhausting the heap before the result can be serialized.
 *
 * This is a real resource-safety constraint, not a presentation preference, so
 * the ceiling is applied and reported through the graph's own `coverage` fields
 * (`truncated`, `omitted_nodes`, `omitted_relations`, `limits`) rather than
 * silently dropping data.
 *
 * Defaults bound work even when ample heap is available. Callers may raise the
 * capacities explicitly; isolated worker heap, bounded record transport and
 * parent result admission independently constrain actual retained memory. The
 * result uses incremental serialization rather than a single JSON string.
 */
export const SEMANTIC_GRAPH_NODE_CEILING =
  JAVASCRIPT_ANALYSIS_RESOURCE_DEFAULTS.semanticNodes;

/**
 * Per-file share of the semantic node budget.
 *
 * Bound each source file independently so one large bundled library cannot
 * consume the whole tree's budget and starve the application's own modules.
 */
export const SEMANTIC_GRAPH_FILE_NODE_CEILING =
  JAVASCRIPT_ANALYSIS_RESOURCE_DEFAULTS.semanticNodesPerFile;

export const buildJavaScriptSemanticGraph = ({
  rootArtifactSha256,
  applicationGraph,
  analysis,
}: BuilderInput): JavaScriptSemanticGraph => {
  const projection = createJavaScriptSemanticGraphProjection();
  for (const analyzed of analysis.files) {
    if (analyzed.semantic !== null)
      projection.projectFile(
        analyzed.file,
        analyzed.semantic.ir,
        analyzed.javascript?.electron.call_paths,
      );
    else if (
      !analyzed.file.text.included &&
      analyzed.file.text.reason === "outside-analysis-scope"
    )
      projection.recordUnavailableFile(
        analyzed.file,
        "Source was not analyzed because it is outside the caller-selected source_paths.",
        null,
        "incomplete-module",
      );
  }
  return projection.finish(rootArtifactSha256, applicationGraph);
};

/** File-local semantic projection that does not retain consumed source IR. */
export interface JavaScriptSemanticGraphProjection {
  /** Node capacity offered to the next independently analyzed source file. */
  readonly remainingFileNodeBudget: () => number;
  /** Adopt decoded file-local facts; final validation and proof remain in this realm. */
  readonly adoptFileProjection: (
    projection: JavaScriptSemanticFileProjection,
  ) => void;
  /** Preserve source-bound unknowns for an execution or result-retention failure. */
  readonly recordUnavailableFile: (
    file: JavaScriptArtifactFile,
    reason: string,
    limits: Readonly<Record<string, JsonValue>> | null,
    unknownReason: "resource-limit" | "incomplete-module",
  ) => void;
  readonly projectFile: (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
    paths?: readonly ElectronCallPath[],
  ) => void;
  /** Project one file in steps between its projection passes. */
  readonly projectFileSteps: (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
    paths?: readonly ElectronCallPath[],
  ) => Generator<void, void>;
  readonly finish: (
    rootArtifactSha256: string,
    applicationGraph: BuilderInput["applicationGraph"],
  ) => JavaScriptSemanticGraph;
  readonly finishImmutableSteps: (
    rootArtifactSha256: string,
    applicationGraph: BuilderInput["applicationGraph"],
  ) => Generator<void, JavaScriptSemanticGraph>;
}

/** Accumulate semantic nodes while each source IR is still file-local. */
export const createJavaScriptSemanticGraphProjection = (
  limits: { readonly totalNodes?: number; readonly fileNodes?: number } = {},
): JavaScriptSemanticGraphProjection => {
  const nodeCeiling = limits.totalNodes ?? SEMANTIC_GRAPH_NODE_CEILING;
  const fileNodeCeiling = limits.fileNodes ?? SEMANTIC_GRAPH_FILE_NODE_CEILING;
  for (const value of [nodeCeiling, fileNodeCeiling])
    if (
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > JAVASCRIPT_SEMANTIC_NODE_MAXIMUM
    )
      throw new RangeError("Semantic graph requires valid node capacities");
  const state = emptyState();
  const fingerprints: JavaScriptSemanticFingerprint[] = [];
  let truncatedFiles = 0;
  let unavailableFiles = 0;
  let resourceTruncatedFiles = 0;
  const executionLimits = new Map<
    string,
    ApplicationCoverage["limits"][number]
  >();
  const projectSourceSteps = function* (
    file: JavaScriptArtifactFile,
    ir: JavaScriptSemanticIr,
    paths: readonly ElectronCallPath[] = [],
  ): Generator<void, void> {
    if (state.nodes.size >= nodeCeiling) {
      truncatedFiles += 1;
      return;
    }
    const remainingTreeBudget = nodeCeiling - state.nodes.size;
    state.fileNodeBudget = Math.min(fileNodeCeiling, remainingTreeBudget);
    state.fileNodesDropped = false;
    fingerprints.push(...(yield* projectFileSteps(file, ir, state, paths)));
    // Nodes were dropped only if the budget actually blocked creation. A file
    // that exactly fills its share ends with a zero budget without dropping
    // anything, so the remaining budget alone cannot decide truncation.
    if (state.fileNodesDropped) truncatedFiles += 1;
    state.fileNodeBudget = null;
  };
  const finishWith = <Value>(
    factory: (input: unknown) => Value,
    rootArtifactSha256: string,
    applicationGraph: BuilderInput["applicationGraph"],
  ): Value => {
    bindSemanticGraphApplicationNodes(state, applicationGraph);
    if (state.roots.size === 0) addFallbackRoot(rootArtifactSha256, state);
    const relations = [...state.relations.values()];
    const unknowns = [...state.unknowns.values()];
    type Family = (typeof JAVASCRIPT_SEMANTIC_RELATION_FAMILIES)[number];
    const retainedByFamily = new Map<Family, number>();
    const unknownIdsByFamily = new Map<Family, string[]>();
    for (const relation of relations) {
      const family = JAVASCRIPT_SEMANTIC_RELATION_FAMILY[relation.relation];
      retainedByFamily.set(family, (retainedByFamily.get(family) ?? 0) + 1);
    }
    for (const unknown of unknowns) {
      const identifiers = unknownIdsByFamily.get(unknown.family);
      if (identifiers === undefined)
        unknownIdsByFamily.set(unknown.family, [unknown.unknown_id]);
      else identifiers.push(unknown.unknown_id);
    }
    const graph = factory({
      schema: "JavaScriptSemanticRelationGraph",
      root_artifact_sha256: rootArtifactSha256,
      application_graph_id: applicationGraph.graph_id,
      root_node_ids: [...state.roots],
      evidence_contexts: state.evidenceContexts.contexts,
      nodes: [...state.nodes.values()],
      relations,
      // The input is transferred to the factory; `fingerprints` is cleared below.
      fingerprints: [...fingerprints],
      unknowns,
      coverage: {
        status:
          truncatedFiles > 0 || unavailableFiles > 0 ? "partial" : "unknown",
        truncated: truncatedFiles > 0 || resourceTruncatedFiles > 0,
        omitted_nodes: truncatedFiles > 0 || unavailableFiles > 0 ? null : 0,
        omitted_relations:
          truncatedFiles > 0 || unavailableFiles > 0 ? null : 0,
        limits: [
          ...executionLimits.values(),
          ...(truncatedFiles > 0
            ? [
                {
                  name: "semantic_graph_node_ceiling",
                  value: nodeCeiling,
                  unit: "items" as const,
                },
                {
                  name: "semantic_graph_file_node_ceiling",
                  value: fileNodeCeiling,
                  unit: "items" as const,
                },
              ]
            : []),
        ],
        families: JAVASCRIPT_SEMANTIC_RELATION_FAMILIES.map((family) => ({
          family,
          status: semanticFamilyStatus(family),
          retained_relations: retainedByFamily.get(family) ?? 0,
          omitted_relations:
            truncatedFiles > 0 || unavailableFiles > 0 ? null : 0,
          unknown_ids: unknownIdsByFamily.get(family) ?? [],
        })),
      },
      limitations: [
        "The semantic graph contains static syntax observations and conservative relationship candidates; it does not claim runtime execution.",
        "Local data flow does not claim control-flow-sensitive reaching definitions or arbitrary dynamic property resolution.",
        "Promise ownership covers explicit unshadowed Promise construction, static factories, aggregation, chaining, and await syntax only.",
        "Function fingerprints are static candidates; equal digests can remain ambiguous and do not prove behavioral equivalence.",
        "Event extraction covers EventEmitter-style literal registrations, removals, and dispatch candidates; dynamic names remain unknown.",
        "Timer extraction covers global or node:timers scheduling and exact local-handle cancellation.",
        "Child-process extraction covers asynchronous node:child_process creation, literal argv/env/stdio options, exit/error listeners, and kill signals.",
        "Configuration extraction covers process.env, process.argv, node:fs reads, and direct logical defaults.",
        "Request extraction covers fetch, WebSocket, node:http/node:https construction, direct option fields, and exact local response consumers.",
        "Boundary extraction covers unshadowed JSON/global coercions plus parse and validation method candidates.",
        "Resource extraction covers built-in filesystem/network acquisition and exact local close/destroy/end handles.",
      ],
    });
    state.nodes.clear();
    state.relations.clear();
    state.unknowns.clear();
    state.roots.clear();
    state.evidenceContexts.clear();
    fingerprints.length = 0;
    return graph;
  };
  return {
    remainingFileNodeBudget: () =>
      Math.min(fileNodeCeiling, Math.max(0, nodeCeiling - state.nodes.size)),
    adoptFileProjection: (projection) => {
      const newNodes = projection.nodes.filter(
        ({ node_id }) => !state.nodes.has(node_id),
      );
      if (
        newNodes.length >
        Math.min(fileNodeCeiling, nodeCeiling - state.nodes.size)
      )
        throw new RangeError(
          "Transferred semantic nodes exceed the offered tree capacity",
        );
      for (const context of projection.evidenceContexts)
        state.evidenceContexts.adopt(context);
      for (const node of newNodes) state.nodes.set(node.node_id, node);
      for (const relation of projection.relations)
        state.relations.set(relation.relation_id, relation);
      for (const unknown of projection.unknowns)
        state.unknowns.set(unknown.unknown_id, unknown);
      for (const root of projection.roots) state.roots.add(root);
      fingerprints.push(...projection.fingerprints);
      if (projection.truncated) truncatedFiles += 1;
    },
    recordUnavailableFile: (file, reason, limits, unknownReason) => {
      const retainedLimits = javaScriptAnalysisCoverageLimits(limits);
      for (const limit of retainedLimits) {
        executionLimits.set(
          JSON.stringify([limit.name, limit.value, limit.unit]),
          limit,
        );
      }
      state.fileNodeBudget = Math.min(
        fileNodeCeiling,
        Math.max(0, nodeCeiling - state.nodes.size),
      );
      const module = retainNode(state, file, {
        kind: "module",
        roleKey: "module",
        location: null,
        label: file.path,
        functionNodeId: null,
      });
      state.fileNodeBudget = null;
      if (module !== null) state.roots.add(module.node_id);
      const evidence = {
        ...observedSemanticEvidence(file, null),
        authority: "unknown" as const,
        state: "unknown" as const,
        confidence: "unknown" as const,
        coverage: partialApplicationCoverage(retainedLimits, null),
        limitations: [reason],
      };
      for (const family of JAVASCRIPT_SEMANTIC_RELATION_FAMILIES) {
        const unknown = createJavaScriptSemanticGraphUnknown(
          {
            node_id: module?.node_id ?? null,
            family,
            relation_kinds: JAVASCRIPT_SEMANTIC_RELATIONS.filter(
              (relation) =>
                JAVASCRIPT_SEMANTIC_RELATION_FAMILY[relation] === family,
            ),
            reason: unknownReason,
            detail: reason,
            candidate_node_ids: [],
            evidence,
          },
          state.evidenceContexts,
        );
        state.unknowns.set(unknown.unknown_id, unknown);
      }
      unavailableFiles += 1;
      if (unknownReason === "resource-limit" && retainedLimits.length > 0)
        resourceTruncatedFiles += 1;
    },
    projectFile: (file, ir, paths) => {
      const steps = projectSourceSteps(file, ir, paths);
      while (steps.next().done !== true);
    },
    projectFileSteps: projectSourceSteps,
    finish: (rootArtifactSha256, applicationGraph) =>
      finishWith(
        createJavaScriptSemanticGraph,
        rootArtifactSha256,
        applicationGraph,
      ),
    finishImmutableSteps: (rootArtifactSha256, applicationGraph) =>
      finishWith(
        sealTransferredJavaScriptSemanticGraphSteps,
        rootArtifactSha256,
        applicationGraph,
      ),
  };
};

/** Project one source with the parent's remaining node capacity, retaining no full IR. */
export function* projectJavaScriptSemanticFileSteps(
  file: JavaScriptArtifactFile,
  ir: JavaScriptSemanticIr,
  nodeBudget: number,
  paths: readonly ElectronCallPath[] = [],
): Generator<void, JavaScriptSemanticFileProjection> {
  if (
    !Number.isSafeInteger(nodeBudget) ||
    nodeBudget < 0 ||
    nodeBudget > JAVASCRIPT_SEMANTIC_NODE_MAXIMUM
  )
    throw new RangeError(
      "File semantic projection requires a valid offered node capacity",
    );
  const state = emptyState();
  state.fileNodeBudget = nodeBudget;
  state.fileNodesDropped = false;
  const fingerprints = yield* projectFileSteps(file, ir, state, paths);
  return {
    roots: [...state.roots],
    evidenceContexts: state.evidenceContexts.contexts,
    nodes: [...state.nodes.values()],
    relations: [...state.relations.values()],
    unknowns: [...state.unknowns.values()],
    fingerprints,
    truncated: Boolean(state.fileNodesDropped),
  };
}
