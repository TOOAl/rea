import {
  createJavaScriptApplicationEdge,
  createJavaScriptApplicationNode,
} from "./javascriptApplicationGraph.js";
import type {
  ApplicationEdge,
  ApplicationNode,
} from "./javascriptApplicationGraphSchemas.js";
import type { ParsedRuntimeCapture } from "./javascriptRuntimeReconciliationCaptureParsing.js";

export interface RuntimeReconciliationEntity {
  readonly kind: "target" | "frame" | "script" | "worker";
  readonly section: "target" | "frames" | "scripts" | "workers";
  readonly node: ApplicationNode;
  readonly capture: ParsedRuntimeCapture;
  readonly runtimeKey: string;
  readonly location: {
    readonly kind: "file" | "url" | "unresolved";
    readonly value: string;
  };
  readonly frameKey: string | null;
  readonly sourceSha256: string | null;
  readonly staticKind: "renderer" | "javascript" | "worker" | "service-worker";
}

export interface RuntimeProjection {
  readonly entities: readonly RuntimeReconciliationEntity[];
  readonly nodes: readonly ApplicationNode[];
  readonly edges: readonly ApplicationEdge[];
  readonly targetNodeByEvidenceId: ReadonlyMap<string, ApplicationNode>;
  readonly omittedEntities: number;
}

/** Project authorized passive capture metadata into capture-scoped JAG nodes. */
export const projectRuntimeCaptures = (
  captures: readonly ParsedRuntimeCapture[],
): RuntimeProjection => {
  const all = captures.flatMap(projectCapture);
  const retained = all;
  const retainedIds = new Set(retained.map(({ node }) => node.node_id));
  const nodes = retained.map(({ node }) => node);
  const edges = captures
    .flatMap((capture) => runtimeEdges(capture, all))
    .filter(
      ({ source_node_id: source, target_node_id: target }) =>
        retainedIds.has(source) && retainedIds.has(target),
    );
  const targetNodeByEvidenceId = new Map(
    retained
      .filter(({ kind }) => kind === "target")
      .map(({ capture, node }) => [capture.evidence.evidence_id, node]),
  );
  return {
    entities: retained,
    nodes,
    edges,
    targetNodeByEvidenceId,
    omittedEntities: 0,
  };
};

const projectCapture = (
  capture: ParsedRuntimeCapture,
): RuntimeReconciliationEntity[] => {
  const target = targetEntity(capture);
  return [
    target,
    ...frameEntities(capture),
    ...scriptEntities(capture),
    ...workerEntities(capture),
  ];
};

const targetEntity = (
  capture: ParsedRuntimeCapture,
): RuntimeReconciliationEntity => {
  const target = capture.inspection.target;
  const location =
    "unresolved_location" in target
      ? ({
          kind: "unresolved",
          value: target.unresolved_location.reported_url,
        } as const)
      : "url" in target
        ? ({ kind: "url", value: target.url } as const)
        : ({ kind: "file", value: target.file_path } as const);
  return runtimeEntity(capture, {
    kind: "target",
    nodeKind: "target",
    runtimeKey: target.target_id,
    targetKey: target.target_id,
    frameKey: null,
    scriptKey: null,
    location,
    staticKind: "renderer",
    sourceSha256: null,
    label: target.title,
    properties: {
      runtime_type: target.type,
      ...(location.kind === "unresolved"
        ? {
            reported_url: location.value,
            location_kind: "unresolved",
            location_reason: "unverifiable-file-location",
          }
        : { location: location.value }),
      attached: target.attached,
    },
    section: "target",
  });
};

const frameEntities = (
  capture: ParsedRuntimeCapture,
): RuntimeReconciliationEntity[] =>
  capture.inspection.frames.map((frame) => {
    const location =
      "url" in frame
        ? ({ kind: "url", value: frame.url } as const)
        : ({ kind: "file", value: frame.file_path } as const);
    return runtimeEntity(capture, {
      kind: "frame",
      nodeKind: "frame",
      runtimeKey: frame.frame_id,
      targetKey: capture.inspection.target.target_id,
      frameKey: frame.frame_id,
      scriptKey: null,
      location,
      staticKind: "renderer",
      sourceSha256: null,
      label: location.value,
      properties: {
        parent_frame_id: frame.parent_frame_id,
        location: location.value,
      },
      section: "frames",
    });
  });

const scriptEntities = (
  capture: ParsedRuntimeCapture,
): RuntimeReconciliationEntity[] =>
  capture.inspection.scripts.items.map((script) => {
    const location =
      "unresolved_location" in script
        ? ({
            kind: "unresolved",
            value: script.unresolved_location.reported_url,
          } as const)
        : "url" in script
          ? ({ kind: "url", value: script.url } as const)
          : ({ kind: "file", value: script.file_path } as const);
    return runtimeEntity(capture, {
      kind: "script",
      nodeKind: "runtime-script-instance",
      runtimeKey: script.script_key,
      targetKey: capture.inspection.target.target_id,
      frameKey: script.frame_id,
      scriptKey: script.script_key,
      location,
      staticKind: "javascript",
      sourceSha256: script.source.included
        ? script.source.artifact.sha256
        : null,
      label: location.value,
      properties: {
        ...("unresolved_location" in script
          ? {
              location_kind: "unresolved",
              reported_url: script.unresolved_location.reported_url,
              location_reason: script.unresolved_location.reason,
            }
          : { location: location.value }),
        cdp_hash: script.cdp_hash,
        length: script.length,
        is_module: script.is_module,
        language: script.language,
        source_sha256: script.source.included
          ? script.source.artifact.sha256
          : null,
        ...("source_map_url" in script
          ? { source_map_url: script.source_map_url }
          : {}),
      },
      section: "scripts",
      ...(script.source.included
        ? { artifactSha256: script.source.artifact.sha256 }
        : {}),
    });
  });

const workerEntities = (
  capture: ParsedRuntimeCapture,
): RuntimeReconciliationEntity[] =>
  capture.inspection.workers.map((worker) => {
    const location =
      "url" in worker
        ? ({ kind: "url", value: worker.url } as const)
        : ({ kind: "file", value: worker.file_path } as const);
    const serviceWorker = worker.type.includes("service");
    return runtimeEntity(capture, {
      kind: "worker",
      nodeKind: serviceWorker ? "service-worker" : "worker",
      runtimeKey: worker.target_id,
      targetKey: worker.target_id,
      frameKey: worker.parent_frame_id,
      scriptKey: null,
      location,
      staticKind: serviceWorker ? "service-worker" : "worker",
      sourceSha256: null,
      label: location.value,
      properties: {
        runtime_type: worker.type,
        location: location.value,
        attached: worker.attached,
        opener_target_id: worker.opener_target_id,
        parent_frame_id: worker.parent_frame_id,
      },
      section: "workers",
    });
  });
