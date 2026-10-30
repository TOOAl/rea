import type { JsonValue } from "../../domain/jsonValue.js";
import { compositeKey } from "../../domain/unicodeCodePointOrder.js";
import {
  completeApplicationCoverage,
  partialApplicationCoverage,
  truncatedApplicationCoverage,
} from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
import type { JavaScriptModuleArtifactAnalysis } from "./JavaScriptArtifactAnalysisTypes.js";
import { HTML_INLINE_SCRIPT_LOCATION_LIMIT } from "../../domain/javascript/htmlArtifactReferences.js";
import type {
  JavaScriptArtifactFile,
  JavaScriptArtifactFileKind,
} from "../../domain/javascript/javascriptArtifactFiles.js";
import {
  artifactObservationEvidence,
  staticInferenceEvidence,
  unavailableAstEvidence,
} from "./JavaScriptArtifactGraphEvidence.js";
import {
  artifactPathResolutionProperties,
  resolveArtifactPathByContext,
} from "./JavaScriptArtifactPathResolution.js";

/** Mutable graph-construction state scoped to one reconstruction. */

export const addUnavailableStaticParseScope = (
  context: JavaScriptArtifactGraphContext,
  input: UnavailableParseInput,
): void => {
  const node = context.accumulator.addNode({
    kind: "unknown",
    identity: artifactLocalIdentity(
      input.file.sha256,
      "static-parse-scope",
      `${input.operation}:${input.file.path}`,
    ),
    observations: [
      {
        label: `${input.file.path} parse scope`,
        properties: {
          // Details come first so they cannot replace the gap's own fields.
          ...input.details,
          path: input.file.path,
          operation: input.operation,
          limitation: input.limitation,
          ...(input.failure === undefined
            ? {}
            : { analysis_failure: input.failure }),
        },
        evidence: unavailableAstEvidence({
          sha256: input.file.sha256,
          path: input.file.path,
          operation: input.operation,
          coverage:
            input.omittedCount !== undefined && input.omittedCount > 0
              ? truncatedApplicationCoverage(
                  input.limits ?? [],
                  input.omittedCount,
                )
              : partialApplicationCoverage(input.limits ?? [], null),
          limitation: input.limitation,
        }),
      },
    ],
  });
  context.accumulator.addEdge({
    source_node_id: input.asset.node_id,
    target_node_id: node.node_id,
    relation: "contains",
    properties: { scope: "unavailable-static-analysis" },
    evidence: artifactObservationEvidence({
      sha256: input.file.sha256,
      path: input.file.path,
      operation: "associate-unavailable-parse-scope",
      coverage: completeApplicationCoverage(),
    }),
  });
};

/** Coverage for one bounded JavaScript AST analysis. */
export const javascriptAnalysisCoverage = (
  analysis: NonNullable<
    JavaScriptModuleArtifactAnalysis["files"][number]["javascript"]
  >,
): JavaScriptArtifactGraphCoverage =>
  analysis.parse_status === "complete"
    ? completeApplicationCoverage()
    : partialApplicationCoverage([], null);

/** Stable identity for a fact scoped to one exact artifact. */
export const artifactLocalIdentity = (
  sha256: string,
  namespace: string,
  key: string,
) => ({
  strategy: "artifact-local-key" as const,
  stability: "artifact-version" as const,
  artifact_sha256: sha256,
  namespace,
  key,
});

/** Select the graph node kind for one inventoried relevant file. */
export const artifactFileNodeKind = (
  kind: JavaScriptArtifactFileKind,
): ApplicationNode["kind"] =>
  kind === "javascript"
    ? "javascript-asset"
    : kind === "source-map"
      ? "source-map"
      : kind === "native-addon"
        ? "native-addon"
        : "artifact";

/** Create or merge an Electron role inferred from static syntax or metadata. */
export const createElectronRoleNode = (
  context: JavaScriptArtifactGraphContext,
  input: RoleNodeInput,
): ApplicationNode =>
  context.accumulator.addNode({
    kind: input.kind,
    identity: artifactLocalIdentity(
      input.anchor.sha256,
      "electron-role",
      `${input.kind}:${input.resolution.resolution_context}:${input.resolution.resolved_path ?? input.resolution.declared_path}`,
    ),
    observations: [
      {
        label: input.resolution.resolved_path ?? input.resolution.declared_path,
        properties: {
          ...artifactPathResolutionProperties(input.resolution),
          declared_path: input.resolution.declared_path,
          resolution_context: input.resolution.resolution_context,
          resolved_path: input.resolution.resolved_path,
          resolution_status: input.resolution.resolution_status,
          limitations: input.resolution.limitations,
          mechanism: input.mechanism,
        },
        evidence: staticInferenceEvidence({
          sha256: input.anchor.sha256,
          path: input.anchor.path,
          operation: "discover-electron-entrypoint",
          coverage: input.coverage ?? completeApplicationCoverage(),
          limitations: input.resolution.limitations,
          ...(input.range === undefined ? {} : { range: input.range }),
        }),
      },
    ],
  });

/** Resolve an Electron role to an inventoried asset when available. */
export const linkElectronRoleToAsset = (
  context: JavaScriptArtifactGraphContext,
  input: RoleAssetLinkInput,
): void => {
  const path = input.resolution.resolved_path;
  if (path === null) return;
  const asset = context.assetNodes.get(path) ?? context.fileNodes.get(path);
  if (asset === undefined) return;
  context.accumulator.addEdge({
    source_node_id: input.role.node_id,
    target_node_id: asset.node_id,
    relation: "maps_to",
    properties: {
      declared_path: input.resolution.declared_path,
      resolution_context: input.resolution.resolution_context,
      resolved_path: path,
      resolution_status: input.resolution.resolution_status,
    },
    evidence: staticInferenceEvidence({
      sha256: input.anchor.sha256,
      path: input.anchor.path,
      operation: "resolve-electron-entrypoint",
      coverage: input.coverage ?? completeApplicationCoverage(),
      limitations: input.resolution.limitations,
      ...(input.range === undefined ? {} : { range: input.range }),
    }),
  });
};

/**
 * Disclose relationships omitted because they resolved to their own source;
 * the application graph forbids self-referential edges.
 */
export const selfReferenceOmissions = (
  count: number,
  noun: readonly [singular: string, plural: string],
  owner: string,
): string[] =>
  count === 0
    ? []
    : [
        `${String(count)} ${count === 1 ? noun[0] : noun[1]} resolved back to ${owner} itself and ${count === 1 ? "was" : "were"} omitted; application graph edges cannot be self-referential.`,
      ];

/** Deterministic key for one recovered module inside a bundle asset. */
export const moduleLookupKey = (
  path: string,
  runtime: string,
  moduleKey: string,
): string => compositeKey([path, runtime, moduleKey]);

/** Deterministic key for one recovered bundler chunk inside a bundle asset. */
export const chunkLookupKey = (
  path: string,
  runtime: string,
  chunkKey: string,
): string => compositeKey([path, runtime, chunkKey]);

/** Resolve a relative static specifier without escaping the artifact root. */
export const resolveArtifactPath = (
  specifier: string,
  sourcePath: string,
  files: ReadonlyMap<string, JavaScriptArtifactFile>,
  moduleKind?: "import" | "require" | "compiler-dependent",
  directoryPaths?: ReadonlySet<string>,
): string | null =>
  resolveArtifactPathByContext({
    declaredPath: specifier,
    sourcePath,
    context: "module-specifier",
    files,
    ...(directoryPaths === undefined ? {} : { directoryPaths }),
    ...(moduleKind === undefined ? {} : { moduleKind }),
  }).resolved_path;

/** Locate the recovered module that owns a static finding. */
export const sourceNodeFor = (
  context: JavaScriptArtifactGraphContext,
  path: string,
  moduleKey: string | null,
  runtime?: string,
): ApplicationNode | undefined =>
  moduleKey === null
    ? context.sourceModuleNodes.get(path)
    : runtime === undefined
      ? undefined
      : context.moduleNodes.get(moduleLookupKey(path, runtime, moduleKey));
