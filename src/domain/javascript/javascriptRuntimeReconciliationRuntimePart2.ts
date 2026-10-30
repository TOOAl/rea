import type { JsonValue } from "../jsonValue.js";
import {
  createJavaScriptApplicationEdge,
  createJavaScriptApplicationNode,
} from "./javascriptApplicationGraph.js";
import type {
  ApplicationEdge,
  ApplicationNode,
} from "./javascriptApplicationGraphSchemas.js";
import type { ApplicationGraphEvidence } from "./javascriptApplicationEvidenceSchemas.js";
import type { ParsedRuntimeCapture } from "./javascriptRuntimeReconciliationCaptureParsing.js";

interface RuntimeEntityInput {
  readonly kind: RuntimeReconciliationEntity["kind"];
  readonly nodeKind: ApplicationNode["kind"];
  readonly runtimeKey: string;
  readonly targetKey: string;
  readonly frameKey: string | null;
  readonly scriptKey: string | null;
  readonly location: RuntimeReconciliationEntity["location"];
  readonly staticKind: RuntimeReconciliationEntity["staticKind"];
  readonly sourceSha256: string | null;
  readonly label: string;
  readonly properties: Readonly<Record<string, JsonValue>>;
  readonly section: "target" | "frames" | "scripts" | "workers";
  readonly artifactSha256?: string;
}

const runtimeEntity = (
  capture: ParsedRuntimeCapture,
  input: RuntimeEntityInput,
): RuntimeReconciliationEntity => ({
  kind: input.kind,
  section: input.section,
  capture,
  runtimeKey: input.runtimeKey,
  location: input.location,
  frameKey: input.frameKey,
  sourceSha256: input.sourceSha256,
  staticKind: input.staticKind,
  node: createJavaScriptApplicationNode({
    kind: input.nodeKind,
    identity: {
      strategy: "runtime-instance",
      stability: "capture-only",
      capture_sha256: capture.captureSha256,
      runtime_key: input.runtimeKey,
    },
    observations: [
      {
        label: input.label || null,
        properties: input.properties,
        evidence: runtimeEvidence(capture, input),
      },
    ],
  }),
});

const runtimeEvidence = (
  capture: ParsedRuntimeCapture,
  input: RuntimeEntityInput,
): ApplicationGraphEvidence => ({
  authority: "passive-cdp-runtime",
  state: "observed",
  confidence: "exact",
  artifact:
    input.artifactSha256 === undefined
      ? {
          available: false,
          reason:
            input.section === "scripts" ? "not-observed" : "not-applicable",
          detail:
            input.section === "scripts"
              ? "Script source bytes were not included in this passive capture."
              : "This runtime entity has no standalone artifact bytes.",
        }
      : {
          available: true,
          artifact_id: `art_${input.artifactSha256}`,
          sha256: input.artifactSha256,
        },
  location: {
    available: true,
    value: {
      kind: "runtime",
      capture_sha256: capture.captureSha256,
      target_key: input.targetKey,
      frame_key: input.frameKey,
      script_key: input.scriptKey,
    },
  },
  extractor: {
    name: capture.evidence.provider.id,
    version:
      capture.evidence.provider.version ??
      (capture.kind === "browser" ? "2" : "1"),
    operation: capture.evidence.operation,
    executable_sha256: null,
  },
  coverage: runtimeSectionCoverage(capture, input.section),
  limitations: [
    "The entity was observed only within one bounded passive CDP capture.",
    ...(runtimeSectionComplete(capture, input.section)
      ? []
      : [
          `The runtime ${input.section} inventory was incomplete within this capture.`,
        ]),
  ],
  evidence_ids: [capture.evidence.evidence_id],
});

const runtimeEdges = (
  capture: ParsedRuntimeCapture,
  entities: readonly RuntimeReconciliationEntity[],
): ApplicationEdge[] => {
  const local = entities.filter(
    ({ capture: candidate }) =>
      candidate.evidence.evidence_id === capture.evidence.evidence_id,
  );
  const target = local.find(({ kind }) => kind === "target");
  if (target === undefined) return [];
  const frames = new Map(
    local
      .filter(({ kind }) => kind === "frame")
      .map((entity) => [entity.runtimeKey, entity]),
  );
  return local.flatMap((entity) => {
    if (entity === target) return [];
    const parent =
      (entity.kind === "script" || entity.kind === "worker") &&
      entity.frameKey !== null
        ? (frames.get(entity.frameKey) ?? target)
        : target;
    return [
      createJavaScriptApplicationEdge({
        source_node_id: parent.node.node_id,
        target_node_id: entity.node.node_id,
        relation: entity.kind === "script" ? "loads" : "contains",
        properties: { basis: "passive-cdp-observation" },
        evidence: runtimeRelationshipEvidence(capture, entity),
      }),
    ];
  });
};

const runtimeRelationshipEvidence = (
  capture: ParsedRuntimeCapture,
  entity: RuntimeReconciliationEntity,
): ApplicationGraphEvidence => ({
  authority: "passive-cdp-runtime",
  state: "observed",
  confidence: "exact",
  artifact: {
    available: false,
    reason: "not-applicable",
    detail: "The relationship is runtime metadata, not standalone bytes.",
  },
  location: {
    available: true,
    value: {
      kind: "runtime",
      capture_sha256: capture.captureSha256,
      target_key: capture.inspection.target.target_id,
      frame_key: entity.frameKey,
      script_key: entity.kind === "script" ? entity.runtimeKey : null,
    },
  },
  extractor: {
    name: capture.evidence.provider.id,
    version:
      capture.evidence.provider.version ??
      (capture.kind === "browser" ? "2" : "1"),
    operation: capture.evidence.operation,
    executable_sha256: null,
  },
  coverage: runtimeSectionCoverage(capture, entity.section),
  limitations: [
    "The relationship was observed only within one bounded passive CDP capture.",
  ],
  evidence_ids: [capture.evidence.evidence_id],
});

const runtimeSectionComplete = (
  capture: ParsedRuntimeCapture,
  section: RuntimeEntityInput["section"],
): boolean => {
  if (section === "target") return true;
  if (section === "scripts") return capture.scriptsCompleteWithinScope;
  return (
    !capture.inspection.completeness.truncated_sections.includes(section) &&
    !capture.inspection.completeness.unavailable_sections.includes(section)
  );
};

const runtimeSectionCoverage = (
  capture: ParsedRuntimeCapture,
  section: RuntimeEntityInput["section"],
): ApplicationGraphEvidence["coverage"] => {
  if (runtimeSectionComplete(capture, section))
    return {
      status: "complete",
      truncated: false,
      omitted_count: 0,
      limits: [],
    };
  const truncated =
    section !== "target" &&
    capture.inspection.completeness.truncated_sections.includes(section);
  return {
    status: "partial",
    truncated,
    omitted_count: null,
    limits: truncated
      ? [
          {
            name: `passive-cdp-${section}-limit`,
            value: runtimeSectionCount(capture, section),
            unit: "items",
          },
        ]
      : [],
  };
};

const runtimeSectionCount = (
  capture: ParsedRuntimeCapture,
  section: RuntimeEntityInput["section"],
): number => {
  switch (section) {
    case "target":
      return 1;
    case "frames":
      return capture.inspection.frames.length;
    case "scripts":
      return capture.inspection.scripts.items.length;
    case "workers":
      return capture.inspection.workers.length;
  }
};
