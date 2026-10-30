import type { ApplicationNode } from "./javascriptApplicationGraphSchemas.js";
import type { JavaScriptApplicationGraph } from "./javascriptApplicationGraph.js";
import { uniqueSorted } from "../canonicalOrdering.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import type { ParsedStaticLayer } from "./javascriptRuntimeReconciliationParsing.js";
import type { RuntimeReconciliationEntity } from "./javascriptRuntimeReconciliationRuntime.js";

export interface StaticRuntimeCandidate {
  readonly layer: ParsedStaticLayer;
  readonly node: ApplicationNode;
  readonly category: "renderer" | "javascript" | "worker" | "service-worker";
  readonly paths: readonly string[];
  readonly nativeDeclarationPaths: Readonly<
    Record<
      "posix" | "windows",
      readonly { readonly path: string; readonly sourcePath: string | null }[]
    >
  >;
  readonly digests: readonly {
    readonly sha256: string;
    readonly basis: "content-sha256" | "module-source-sha256";
  }[];
}

export interface MappedRuntimePath {
  readonly path: string;
  readonly fileStyle: "posix" | "windows" | null;
  readonly nativeRelativePath: string | null;
  readonly artifactPrefix: string;
  readonly basis:
    | "artifact-path"
    | "operator-file-mapping"
    | "operator-url-mapping";
}

/** Precomputed mapping scope and graph paths for static load-state decisions. */
export interface StaticRuntimeScope {
  readonly artifactPrefixes: readonly string[];
  readonly pathsByNodeId: ReadonlyMap<string, readonly string[]>;
}

/** Index statically reconstructed entities that can receive runtime matches. */
export const collectStaticRuntimeCandidates = (
  layers: readonly ParsedStaticLayer[],
): StaticRuntimeCandidate[] =>
  layers
    .flatMap((layer) => candidatesForLayer(layer))
    .sort(
      (left, right) =>
        compareUnicodeCodePoints(left.layer.layerId, right.layer.layerId) ||
        compareUnicodeCodePoints(left.node.node_id, right.node.node_id),
    );

/** Translate one already-authorized runtime location into artifact paths. */
export const mappedRuntimePaths = (
  layer: ParsedStaticLayer,
  entity: RuntimeReconciliationEntity,
): MappedRuntimePath[] => {
  const paths: MappedRuntimePath[] = [];
  const fileStyle =
    entity.location.kind === "file"
      ? absoluteFilePathStyle(entity.location.value)
      : null;
  if (entity.location.kind === "file" && layer.result.format === "directory") {
    const path = pathBelowRoot(layer.result.input_path, entity.location.value);
    if (path !== null)
      paths.push({
        path,
        fileStyle,
        nativeRelativePath: path,
        artifactPrefix: "",
        basis: "artifact-path",
      });
  }
  for (const mapping of layer.runtimeMappings) {
    const suffix =
      mapping.kind === "file-root" && entity.location.kind === "file"
        ? pathBelowRoot(mapping.root, entity.location.value)
        : mapping.kind === "url-prefix" && entity.location.kind === "url"
          ? pathBelowUrlPrefix(mapping.prefix, entity.location.value)
          : null;
    if (suffix === null) continue;
    const path = safeArtifactPath(mapping.artifact_prefix, suffix);
    if (path === null) continue;
    paths.push({
      path,
      fileStyle,
      nativeRelativePath: mapping.kind === "file-root" ? suffix : null,
      artifactPrefix: normalizeArtifactPrefix(mapping.artifact_prefix),
      basis:
        mapping.kind === "file-root"
          ? "operator-file-mapping"
          : "operator-url-mapping",
    });
  }
  return uniqueMappedPaths(paths);
};

/** Precompute the artifact prefixes exercised by a bounded runtime set. */
export const createStaticRuntimeScope = (
  layer: ParsedStaticLayer,
  entities: readonly RuntimeReconciliationEntity[],
): StaticRuntimeScope => ({
  artifactPrefixes: activeArtifactPrefixes(layer, entities),
  pathsByNodeId: indexStaticPaths(layer.graph),
});

/** Whether one static node falls under a mapping exercised by this runtime set. */
export const staticNodeWithinRuntimeScope = (
  node: ApplicationNode,
  scope: StaticRuntimeScope,
): boolean =>
  (scope.pathsByNodeId.get(node.node_id) ?? []).some((path) =>
    scope.artifactPrefixes.some((prefix) => pathWithinPrefix(path, prefix)),
  );

const candidatesForLayer = (
  layer: ParsedStaticLayer,
): StaticRuntimeCandidate[] => {
  const graph = layer.graph;
  const pathsByNodeId = indexStaticPaths(graph);
  return graph.nodes.flatMap((node) => {
    const category = candidateCategory(node);
    if (category === null) return [];
    return [
      {
        layer,
        node,
        category,
        paths: pathsByNodeId.get(node.node_id) ?? [],
        nativeDeclarationPaths: nativeDeclarationPaths(node),
        digests: candidateDigests(node),
      },
    ];
  });
};

const candidateCategory = (
  node: ApplicationNode,
): StaticRuntimeCandidate["category"] | null => {
  if (node.kind === "electron-renderer") return "renderer";
  if (
    node.kind === "javascript-asset" ||
    (node.kind === "javascript-module" && !isStaticSourceModule(node))
  )
    return "javascript";
  if (node.kind === "worker") return "worker";
  if (node.kind === "service-worker") return "service-worker";
  return null;
};

const isStaticSourceModule = (node: ApplicationNode): boolean =>
  node.observations.some(
    ({ properties }) => properties.semantic_role === "source-module",
  );

const indexStaticPaths = (
  graph: JavaScriptApplicationGraph,
): ReadonlyMap<string, readonly string[]> => {
  const nodes = new Map(
    graph.nodes.map((candidate) => [candidate.node_id, candidate]),
  );
  const relatedBySource = new Map<string, ApplicationNode[]>();
  for (const edge of graph.edges) {
    if (edge.relation !== "maps_to") continue;
    const target = nodes.get(edge.target_node_id);
    if (target === undefined) continue;
    const related = relatedBySource.get(edge.source_node_id);
    if (related === undefined)
      relatedBySource.set(edge.source_node_id, [target]);
    else related.push(target);
  }
  return new Map(
    graph.nodes.map((node) => [
      node.node_id,
      uniqueSorted([
        ...nodePaths(node),
        ...(usesApplicationFileDeclaration(node)
          ? []
          : (relatedBySource.get(node.node_id) ?? []).flatMap(nodePaths)),
      ]),
    ]),
  );
};

const nodePaths = (node: ApplicationNode): string[] => {
  const paths: string[] = [];
  if (node.identity.strategy === "canonical-path")
    paths.push(node.identity.path);
  for (const observation of node.observations) {
    const rawApplicationFile =
      node.kind === "electron-renderer" &&
      isRawApplicationFileObservation(observation);
    if (typeof observation.properties.path === "string")
      paths.push(observation.properties.path);
    if (rawApplicationFile) continue;
    if (typeof observation.properties.resolved_path === "string")
      paths.push(observation.properties.resolved_path);
    const declaration = observation.properties.declared_path;
    if (
      !hasOwnedArtifactPath(node) &&
      typeof declaration === "string" &&
      !declaration.includes("\\")
    )
      paths.push(declaration);
    if (
      observation.evidence.location.available &&
      observation.evidence.location.value.kind === "artifact-path"
    )
      paths.push(observation.evidence.location.value.path);
  }
  return paths
    .map(relativeLogicalPath)
    .filter(
      (path): path is string => path !== null && path !== "artifact-root",
    );
};

// Raw filesystem expressions have host syntax only when a captured file location
// establishes that format. Genuinely owned artifact facts take precedence.
const hasOwnedArtifactPath = (node: ApplicationNode): boolean =>
  node.identity.strategy === "canonical-path" ||
  node.observations.some(
    ({ properties }) => typeof properties.path === "string",
  ) ||
  node.observations.some(
    (observation) =>
      !isRawApplicationFileObservation(observation) &&
      typeof observation.properties.resolved_path === "string",
  );

// loadFile receives a raw literal here: the syntax producer does not retain
// computed __dirname expressions. Electron resolves this relative to the app
// root, so its source-relative inference is not an owned runtime target.
const isRawApplicationFileObservation = (
  observation: ApplicationNode["observations"][number],
): boolean =>
  observation.properties.resolution_context === "filesystem-expression" &&
  typeof observation.properties.mechanism === "string" &&
  observation.properties.mechanism.startsWith("call:") &&
  observation.properties.mechanism.endsWith("loadFile");
