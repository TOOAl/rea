import {
  artifactInventoryResultSchema,
  type ArtifactInventoryCoverage,
  type ArtifactInventoryResult,
  type ArtifactNode,
  type ArtifactOccurrence,
  type IntegrityContradiction,
} from "./artifactGraph.js";
import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
import { canonicalJson } from "./comparisonSemantics.js";
import {
  artifactContradictionId,
  artifactEdgeId,
  artifactGraphDigest,
  artifactIdForContent,
  artifactManifestId,
  occurrenceIdForLocation,
} from "./artifactIdentity.js";
import { parseEvidence, type Evidence } from "./evidence.js";
import {
  artifactInspectionResultSchema,
  type ArtifactInspectionResult,
} from "./artifactInspection.js";

/** Complete or partially assembled inventory used by comparison workflows. */
export interface InventorySet {
  readonly manifest: ArtifactInventoryResult["manifest"];
  readonly nodes: readonly ArtifactNode[];
  readonly occurrences: readonly ArtifactOccurrence[];
  readonly edges: readonly ArtifactInventoryResult["edges"][number][];
  readonly integrityContradictions: readonly IntegrityContradiction[];
  readonly limitations: readonly string[];
  /** True when merged node, occurrence, and edge counts match the manifest. */
  readonly complete: boolean;
  readonly coverage: ArtifactInventoryCoverage;
}

/** Whether all graph members are present and the producer reports full coverage. */
export const hasCompleteInventoryCoverage = (
  inventory: InventorySet,
  requiredScope: ArtifactInventoryCoverage["scope"],
): boolean =>
  inventory.complete &&
  inventory.coverage.scope === requiredScope &&
  inventory.coverage.status === "complete";

export interface ParsedInventorySet {
  readonly evidence: readonly Evidence[];
  readonly inventory: InventorySet;
}

interface ParsedArtifactInspectionInventory {
  readonly inspection: ArtifactInspectionResult;
  readonly inventory: InventorySet;
  readonly evidenceIds: readonly string[];
}

/** Parse, merge, and verify inventory Evidence pages. */
export const parseArtifactInventoryEvidence = (
  input: unknown,
): ParsedInventorySet => {
  const evidence = (Array.isArray(input) ? input : [input]).map(parseEvidence);
  const pages = evidence.flatMap((carrier) => {
    if (carrier.operation === "inventory_artifact")
      return [parseInventoryEvidencePage(carrier)];
    if (carrier.operation !== "inspect_artifact")
      throw new TypeError(
        "Artifact comparison requires inspect_artifact Evidence",
      );
    return parseInspectionInventoryPayload(
      carrier.normalized_result,
      carrier.subject,
    ).pages;
  });
  return {
    evidence,
    inventory: assembleInventoryResults(pages),
  };
};

/** Parse and authenticate an already-owned inspection payload and its pages. */
export const parseArtifactInspectionInventoryResult = (
  input: unknown,
  subject: Evidence["subject"],
): ParsedArtifactInspectionInventory => {
  const parsed = parseInspectionInventoryPayload(input, subject);
  return {
    inspection: parsed.inspection,
    inventory: assembleInventoryResults(parsed.pages),
    evidenceIds: parsed.evidenceIds,
  };
};

/** Shared owner boundary for full Evidence and already-authenticated parents. */
const parseInspectionInventoryPayload = (
  input: unknown,
  subject: Evidence["subject"],
): {
  readonly inspection: ArtifactInspectionResult;
  readonly pages: readonly ArtifactInventoryResult[];
  readonly evidenceIds: readonly string[];
} => {
  const inspection = artifactInspectionResultSchema.parse(input);
  if (inspection.coverage.substeps_completed !== inspection.substeps.length)
    throw new TypeError(
      "Artifact inspection substep count does not match its coverage declaration",
    );
  const substeps = inspection.substeps.map((step) => {
    const evidence = parseEvidence(step.evidence);
    if (step.evidence_id !== evidence.evidence_id)
      throw new TypeError(
        "Artifact inspection substep evidence ID does not match nested Evidence",
      );
    return {
      evidenceId: evidence.evidence_id,
      page: parseInventoryEvidencePage(evidence),
    };
  });
  const firstPage = substeps[0]?.page;
  if (firstPage === undefined)
    throw new TypeError("Artifact inspection requires inventory substeps");
  validateInspectionSubject(subject, inspection, firstPage.manifest);
  return {
    inspection,
    pages: substeps.map(({ page }) => page),
    evidenceIds: substeps.map(({ evidenceId }) => evidenceId),
  };
};

/** Ensure the inspection declaration and carrier identify its inventory. */
const validateInspectionSubject = (
  subject: Evidence["subject"],
  inspection: ArtifactInspectionResult,
  manifest: ArtifactInventoryResult["manifest"],
): void => {
  if (
    inspection.subject.manifest_id !== manifest.manifest_id ||
    inspection.subject.root_artifact_id !== manifest.root_artifact_id ||
    inspection.subject.root_sha256 !== manifest.root_sha256 ||
    inspection.subject.root_format !== manifest.root_format
  )
    throw new TypeError(
      "Artifact inspection subject does not match its inventory manifest",
    );
  if (
    subject === null ||
    subject.digest.sha256 !== manifest.root_sha256 ||
    subject.format !== manifest.root_format
  )
    throw new TypeError(
      "Artifact inspection Evidence subject does not match its root manifest",
    );
};

/** Validate one already authenticated parent payload with the same graph proofs. */
export const parseArtifactInventoryResult = (
  input: unknown,
  subject: Evidence["subject"],
): InventorySet =>
  assembleInventoryResults([parseInventoryPage(input, subject)]);

/** Parse one already authenticated inventory result into its validated facts. */
const parseInventoryPage = (
  input: unknown,
  subject: Evidence["subject"],
): ArtifactInventoryResult => {
  const inventory = artifactInventoryResultSchema.parse(input);
  validateArtifactInventorySubject(subject, inventory.manifest);
  validateInventoryPage(inventory);
  return inventory;
};

/** Parse one authenticated inventory carrier into its validated owner facts. */
const parseInventoryEvidencePage = (
  evidence: Evidence,
): ArtifactInventoryResult => {
  if (evidence.operation !== "inventory_artifact")
    throw new TypeError(
      "Artifact inventory page must be inventory_artifact Evidence",
    );
  return parseInventoryPage(evidence.normalized_result, evidence.subject);
};

/** Both inventory carriers require the same authenticated root identity. */
export const validateArtifactInventorySubject = (
  subject: Evidence["subject"],
  manifest: ArtifactInventoryResult["manifest"],
): void => {
  if (
    subject === null ||
    subject.digest.sha256 !== manifest.root_sha256 ||
    subject.format !== manifest.root_format
  )
    throw new TypeError(
      "Artifact inventory Evidence subject does not match its root digest",
    );
};

const validateInventoryPage = (inventory: ArtifactInventoryResult): void => {
  assertUnique(
    inventory.nodes.map(({ artifact_id: id }) => id),
    "node ID",
  );
  assertUnique(
    inventory.occurrences.map(({ occurrence_id: id }) => id),
    "occurrence ID",
  );
  assertUnique(
    inventory.edges.map(({ edge_id: id }) => id),
    "edge ID",
  );
  for (const node of inventory.nodes)
    if (node.artifact_id !== artifactIdForContent(node.sha256))
      throw new TypeError("Artifact node ID is not content-addressed");
};
