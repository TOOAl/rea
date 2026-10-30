import { basename } from "node:path";
import {
  createJavaScriptApplicationEdge,
  createJavaScriptApplicationNode,
} from "../javascript/javascriptApplicationGraph.js";
import type { ApplicationGraphEvidence } from "../javascript/javascriptApplicationEvidenceSchemas.js";
import type { ApplicationNode } from "../javascript/javascriptApplicationGraphSchemas.js";
import { managedSourceCoverage } from "./managedApplicationGraphCoverage.js";
import type { Evidence } from "../evidence.js";
import type {
  ManagedArtifactInspection,
  ManagedMemberInspection,
} from "./managedArtifact.js";
import type { GraphBuildState } from "./managedApplicationGraph.js";
type ManagedMethod = ManagedMemberInspection["methods"][number];

// src/domain/managed/managedApplicationGraphNodesPart2.ts
const nativeImplementationNode = (
  state: GraphBuildState,
  implementation: NativeImplementation,
  evidence: ApplicationGraphEvidence,
): ApplicationNode =>
  createJavaScriptApplicationNode({
    kind: "managed-native-implementation",
    identity: artifactLocalIdentity(
      state.artifactSha256,
      "managed-native-implementation-token",
      implementation.token,
    ),
    observations: [
      {
        label: metadataLabel(implementation.name),
        properties: {
          token: implementation.token,
          name: implementation.name,
          rva: implementation.rva,
          code_type: implementation.code_type,
          managed_kind: implementation.managed_kind,
          pinvoke_declared: implementation.pinvoke_declared,
          boundary_kind: implementation.boundary_kind,
          body_interpretation: implementation.body_interpretation,
        },
        evidence,
      },
    ],
  });

/** Add a contains relationship edge between two nodes. */
const addContainsEdge = (
  state: GraphBuildState,
  source: ApplicationNode,
  target: ApplicationNode,
  options: ContainsEdgeOptions,
): void => {
  state.edges.push(
    createJavaScriptApplicationEdge({
      source_node_id: source.node_id,
      target_node_id: target.node_id,
      relation: "contains",
      properties: { kind: options.kind },
      evidence: projectedManagedEvidence(
        state,
        "project-managed-contains",
        options.coverage,
      ),
    }),
  );
};

/** Build an artifact-local key identity for a managed graph entity. */
const artifactLocalIdentity = (
  artifactSha256: string,
  namespace: string,
  key: string,
) => ({
  strategy: "artifact-local-key" as const,
  stability: "artifact-version" as const,
  artifact_sha256: artifactSha256,
  namespace,
  key,
});

/** Build managed static-analysis evidence for a graph observation. */
const sourceManagedEvidence = (
  state: GraphBuildState,
  source: Evidence,
  coverageState: ManagedArtifactInspection["coverage"]["state"],
): ApplicationGraphEvidence =>
  createManagedEvidence(
    state,
    source.operation,
    managedSourceCoverage(coverageState),
    [source.evidence_id],
  );

const projectedManagedEvidence = (
  state: GraphBuildState,
  operation: string,
  coverage: ApplicationGraphEvidence["coverage"] = managedSourceCoverage(
    "complete",
  ),
): ApplicationGraphEvidence =>
  createManagedEvidence(state, operation, coverage, state.evidenceLinks);

const pinvokeAssociationEvidence = (
  state: GraphBuildState,
  boundaryEvidence: Evidence,
  coverage: ApplicationGraphEvidence["coverage"],
  memberEvidence: Evidence | undefined,
): ApplicationGraphEvidence =>
  createManagedEvidence(state, boundaryEvidence.operation, coverage, [
    boundaryEvidence.evidence_id,
    ...(memberEvidence === undefined ? [] : [memberEvidence.evidence_id]),
  ]);

const createManagedEvidence = (
  state: GraphBuildState,
  operation: string,
  coverage: ApplicationGraphEvidence["coverage"],
  evidenceIds: readonly string[],
): ApplicationGraphEvidence => ({
  authority: "managed-static-analysis",
  state: "observed",
  confidence: "exact",
  artifact: {
    available: true,
    artifact_id: `art_${state.artifactSha256}`,
    sha256: state.artifactSha256,
  },
  location: {
    available: true,
    value: {
      kind: "artifact-path",
      path: graphArtifactPath(state.artifactPath),
    },
  },
  extractor: {
    name: "rea-dotnet-static",
    version: "1",
    operation,
    executable_sha256: null,
  },
  coverage,
  limitations:
    coverage.status === "complete"
      ? []
      : [
          "The source managed Evidence slice is incomplete; unreturned or unavailable items remain unobserved.",
        ],
  evidence_ids: [...evidenceIds],
});

/** Sanitize an artifact path into a managed graph location. */
const graphArtifactPath = (path: string): string => {
  const name = basename(path).replaceAll(/[^A-Za-z0-9._-]/gu, "_");
  return `managed/${name.length === 0 ? "artifact.pe" : name}`;
};
