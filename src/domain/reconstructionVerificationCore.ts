import { createHash } from "node:crypto";

import canonicalize from "canonicalize";
import { z } from "zod";

import { artifactComparisonResultSchema } from "./artifactComparison.js";
import { artifactInventoryResultSchema } from "./artifactGraph.js";
import { uniqueSorted } from "./canonicalOrdering.js";
import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
import {
  comparisonSourceEvidenceSides,
  assertComparisonFindingLinks,
} from "./comparisonSourceEvidence.js";
import { parseEvidence, type Evidence } from "./evidence.js";
import { parseEvidenceBundle } from "./evidenceBundle.js";
import { functionComparisonResultSchema } from "./functionComparisonSchemas.js";
import {
  PROCESS_PROVIDER,
  isProcessEvidenceProvider,
} from "./process/processEvidenceProvider.js";
import { functionDossierSchema } from "./hopperValues.js";
import { assessFunctionCallCoverage } from "./functionCallCoverage.js";
import {
  deriveProcessComparisonStatus,
  PROCESS_COMPARISON_DIMENSIONS,
  processCaptureComparisonSchema,
} from "./process/processComparison.js";
import { parseProcessCapture } from "./process/processCaptureParsing.js";
import {
  reconstructionClaimResultSchema,
  reconstructionSpecificationSchema,
  reconstructionVerificationResultSchema,
  type ReconstructionClaim as Claim,
  type ReconstructionClaimResult as ClaimResult,
  type ReconstructionObservedStatus as ObservedStatus,
  type ReconstructionVerificationResult,
} from "./reconstructionVerificationSchemas.js";
import {
  reconstructionClaimUnknowns,
  reconstructionProbes,
  reconstructionUnknownHeads,
} from "./reconstructionUnknowns.js";
import type { ResidualUnknown } from "./residualUnknown.js";

const providers = {
  behavioral: {
    operation: "compare_process_captures",
    predicates: ["rea.process-comparison"],
    ...PROCESS_PROVIDER,
  },
  "structural-function": {
    operation: "compare_functions",
    predicates: ["rea.function-comparison"],
    id: "rea-function-comparison",
    name: "REA function comparison",
  },
  "structural-artifact": {
    operation: "compare_artifacts",
    predicates: ["rea.artifact-comparison"],
    id: "rea-artifact-comparison",
    name: "REA artifact comparison",
  },
} as const;

interface FunctionSourceFacts {
  readonly evidence_id: string;
  readonly callCoverageBlockers: readonly string[];
  readonly callCoverageDiagnostics: readonly string[];
}

const acceptsPredicate = (
  expected: readonly string[],
  actual: string,
): boolean => expected.some((predicate) => predicate === actual);

/** Verify only explicitly declared claims; no global equivalence is inferred. */
export const verifyReconstruction = (
  specificationInput: unknown,
  bundleInput: unknown,
): ReconstructionVerificationResult => {
  const specification =
    reconstructionSpecificationSchema.parse(specificationInput);
  const bundle = parseEvidenceBundle(bundleInput);
  const records = new Map(
    bundle.records.map((item) => [item.evidence_id, item]),
  );
  const heads = reconstructionUnknownHeads(bundle.unknowns);
  const results = specification.claims
    .map((claim) => evaluateClaim(claim, records, heads))
    .sort((left, right) =>
      compareUnicodeCodePoints(left.claim_id, right.claim_id),
    );
  const failed = count(results, "fail");
  const unresolved = count(results, "unknown");
  const probes = reconstructionProbes(results, heads);
  const evidenceLinks = uniqueSorted(
    results.flatMap(({ evidence_links: links }) => links),
  );
  const output = {
    status: failed > 0 ? "fail" : unresolved > 0 ? "unknown" : "pass",
    specification_sha256: digest({
      ...specification,
      claims: [...specification.claims].sort((left, right) =>
        compareUnicodeCodePoints(left.claim_id, right.claim_id),
      ),
    }),
    summary: {
      total: results.length,
      passed: count(results, "pass"),
      failed,
      unknown: unresolved,
      behavioral: results.filter(({ kind }) => kind === "behavioral").length,
      structural: results.filter(({ kind }) => kind !== "behavioral").length,
    },
    claims: {
      items: results,
    },
    recommended_probes: probes,
    evidence_links: evidenceLinks,
    limitations: [
      "Pass means every declared claim passed; it does not establish global implementation equivalence.",
    ],
  };
  return reconstructionVerificationResultSchema.parse(output);
};

const evaluateClaim = (
  claim: Claim,
  records: ReadonlyMap<string, Evidence>,
  heads: ReadonlyMap<string, ResidualUnknown>,
): ClaimResult => {
  const comparison = records.get(claim.comparison_evidence_id);
  if (comparison === undefined)
    throw new TypeError(
      `Missing comparison Evidence ${claim.comparison_evidence_id}`,
    );
  validateComparisonIdentity(claim, comparison);
  const sides = comparisonSourceEvidenceSides(comparison);
  const allSourceIds = uniqueSorted([...sides.left, ...sides.right]);
  if (!sameSet(comparison.evidence_links, allSourceIds))
    throw new TypeError(
      "Comparison Evidence closure disagrees with its parameters",
    );
  const sources = allSourceIds.map((id) => {
    const source = records.get(id);
    if (source === undefined)
      throw new TypeError(`Missing source Evidence ${id}`);
    return source;
  });
  const functionSourceFacts = readValidatedSourceFacts(claim, sources);
  const observation = comparisonObservation(claim, comparison);
  const observed = observation.status;
  const callCoverage = sourceCallCoverage(
    claim,
    functionSourceFacts,
    observation.hasIndependentFunctionChange === true,
  );
  const blockers = [
    ...authorityLimitations(claim, sources, sides),
    ...callCoverage.blockers,
  ];
  const relatedUnknowns = reconstructionClaimUnknowns(
    heads,
    comparison.evidence_id,
    allSourceIds,
    claim.dimension,
  );
  const relevantUnknowns = relatedUnknowns;
  const status = classify(observed, blockers, relevantUnknowns);
  const displayedUnknowns = relevantUnknowns;
  return reconstructionClaimResultSchema.parse({
    claim_id: claim.claim_id,
    kind: claim.kind,
    dimension: claim.dimension,
    status,
    observed_status: observed,
    comparison_evidence_id: comparison.evidence_id,
    left_evidence_ids: sides.left,
    right_evidence_ids: sides.right,
    evidence_links: uniqueSorted([comparison.evidence_id, ...allSourceIds]),
    unknown_ids: displayedUnknowns.map(({ unknown_id: id }) => id),
    limitations: uniqueSorted([
      ...comparison.limitations,
      ...observation.limitations,
      ...blockers,
      ...callCoverage.diagnostics,
      ...displayedUnknowns.map(
        ({ question }) => `Residual unknown: ${question}`,
      ),
    ]),
  });
};
