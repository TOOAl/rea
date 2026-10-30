import { createHash } from "node:crypto";

import canonicalize from "canonicalize";
import { z } from "zod";

import { artifactComparisonResultSchema } from "./artifactComparison.js";
import { uniqueSorted } from "./canonicalOrdering.js";
import {
  comparisonSourceEvidenceIds,
  assertComparisonFindingLinks,
} from "./comparisonSourceEvidence.js";
import { parseEvidence, type Evidence } from "./evidence.js";
import { functionComparisonResultSchema } from "./functionComparisonSchemas.js";
import { isProcessEvidenceProvider } from "./process/processEvidenceProvider.js";
import type { JsonValue } from "./jsonValue.js";
import { processCaptureComparisonSchema } from "./process/processComparison.js";

const correlate = (
  mapping: Mapping,
  staticById: ReadonlyMap<string, Evidence>,
  runtimeById: ReadonlyMap<string, Evidence>,
): CorrelationItem => {
  const staticEvidence = required(
    staticById,
    mapping.static.comparison_evidence_id,
    "static comparison",
  );
  const runtimeEvidence = required(
    runtimeById,
    mapping.runtime.comparison_evidence_id,
    "runtime comparison",
  );
  const { limitations: selectedLimitations, ...selectedStatic } = selectStatic(
    staticEvidence,
    mapping.static.selector,
  );
  const process = processCaptureComparisonSchema.parse(
    runtimeEvidence.normalized_result,
  );
  const runtimeStatus = process[mapping.runtime.dimension];
  const pattern = observedPattern(selectedStatic.status, runtimeStatus);
  const classification =
    pattern === "unknown" || pattern === "truncated"
      ? "unresolved_branch"
      : pattern === mapping.hypothesis.expected_pattern
        ? "hypothesis"
        : "contradiction";
  const projection = {
    static: mapping.static,
    runtime: mapping.runtime,
    side_alignment: mapping.side_alignment,
    hypothesis: mapping.hypothesis,
  } satisfies JsonValue;
  return correlationItemSchema.parse({
    correlation_id: `cor_${sha256(canonicalJson(projection))}`,
    static: { ...mapping.static, ...selectedStatic },
    runtime: { ...mapping.runtime, status: runtimeStatus },
    side_alignment: mapping.side_alignment,
    hypothesis: mapping.hypothesis,
    observed_pattern: pattern,
    classification,
    evidence_links: uniqueSorted([
      staticEvidence.evidence_id,
      ...staticEvidence.evidence_links,
      runtimeEvidence.evidence_id,
      ...runtimeEvidence.evidence_links,
    ]),
    limitations: uniqueSorted([
      ...staticEvidence.limitations,
      ...selectedLimitations,
      ...runtimeEvidence.limitations,
      ...process.limitations,
      "This correlation tests an explicit hypothesis and does not establish causality.",
      "Side alignment is caller-declared and was not independently validated against source subjects or environments.",
    ]),
  });
};

const selectStatic = (
  evidence: Evidence,
  selector: z.infer<typeof staticSelectorSchema>,
): Pick<CorrelationItem["static"], "status" | "conclusion_kind"> & {
  readonly limitations: readonly string[];
} => {
  if (selector.kind === "function") {
    if (evidence.operation !== "compare_functions")
      throw new TypeError(
        "Function selector requires function comparison Evidence",
      );
    const result = functionComparisonResultSchema.parse(
      evidence.normalized_result,
    );
    const matches = result.dimensions.filter(
      ({ dimension }) => dimension === selector.dimension,
    );
    const match = matches.at(0);
    if (matches.length !== 1 || match === undefined)
      throw new TypeError("Function selector must resolve exactly once");
    return {
      status: match.status,
      conclusion_kind: match.conclusion_kind,
      limitations: match.limitations,
    };
  }
  if (evidence.operation !== "compare_artifacts")
    throw new TypeError(
      "Artifact selector requires artifact comparison Evidence",
    );
  const result = artifactComparisonResultSchema.parse(
    evidence.normalized_result,
  );
  const matches = result.changes.filter(
    ({ logical_path: path }) => path === selector.logical_path,
  );
  const match = matches.at(0);
  if (matches.length !== 1 || match === undefined)
    throw new TypeError(
      "Artifact selector must resolve exactly one reported delta",
    );
  const status = match.classification;
  return {
    status,
    limitations: [],
    conclusion_kind:
      status === "contradiction"
        ? "contradiction"
        : status === "unknown"
          ? "unresolved_branch"
          : "derived_relationship",
  };
};

const parseStatic = (input: unknown): Evidence => {
  const evidence = parseEvidence(input);
  if (
    evidence.operation !== "compare_artifacts" &&
    evidence.operation !== "compare_functions"
  )
    throw new TypeError(
      "Static/runtime correlation requires artifact or function comparison Evidence",
    );
  assertComparisonIdentity(evidence);
  if (evidence.operation === "compare_artifacts") {
    const result = artifactComparisonResultSchema.parse(
      evidence.normalized_result,
    );
    assertComparisonFindingLinks(
      evidence,
      result.changes.flatMap(({ evidence_links: links }) => links),
    );
  } else {
    const result = functionComparisonResultSchema.parse(
      evidence.normalized_result,
    );
    assertComparisonFindingLinks(
      evidence,
      result.dimensions.flatMap(({ evidence_links: links }) => links),
    );
  }
  return evidence;
};

const parseRuntime = (input: unknown): Evidence => {
  const evidence = parseEvidence(input);
  if (evidence.operation !== "compare_process_captures")
    throw new TypeError(
      "Static/runtime correlation requires process comparison Evidence",
    );
  assertComparisonIdentity(evidence);
  processCaptureComparisonSchema.parse(evidence.normalized_result);
  return evidence;
};

const assertComparisonIdentity = (evidence: Evidence): void => {
  const expected = EXPECTED[evidence.operation];
  if (
    expected === undefined ||
    !(Array.isArray(expected[0])
      ? expected[0].includes(evidence.predicate_type)
      : evidence.predicate_type === expected[0]) ||
    (evidence.operation === "compare_process_captures"
      ? !isProcessEvidenceProvider(evidence.provider)
      : evidence.provider.id !== expected[1] ||
        evidence.provider.name !== expected[2] ||
        evidence.provider.version !== "1") ||
    evidence.confidence !== "derived" ||
    evidence.authority !== "analyst-inference" ||
    evidence.subject !== null
  )
    throw new TypeError(
      "Comparison Evidence operation, predicate, provider, or citations disagree",
    );
  const expectedLinks = comparisonSourceEvidenceIds(evidence);
  const actualLinks = uniqueSorted(evidence.evidence_links);
  if (
    expectedLinks.length !== actualLinks.length ||
    expectedLinks.some((id, index) => id !== actualLinks[index])
  )
    throw new TypeError(
      "Comparison Evidence closure disagrees with its source parameters",
    );
};

const observedPattern = (
  staticStatus: ComparisonStatus,
  runtimeStatus: ComparisonStatus,
): z.infer<typeof observedPatternSchema> => {
  if (staticStatus === "truncated" || runtimeStatus === "truncated")
    return "truncated";
  if (staticStatus === "unknown" || runtimeStatus === "unknown")
    return "unknown";
  const staticChanged = staticStatus !== "unchanged";
  const runtimeChanged = runtimeStatus !== "unchanged";
  if (staticChanged && runtimeChanged) return "cochanged";
  if (staticChanged) return "static_only";
  if (runtimeChanged) return "runtime_only";
  return "both_unchanged";
};

const required = (
  values: ReadonlyMap<string, Evidence>,
  id: string,
  label: string,
): Evidence => {
  const value = values.get(id);
  if (value === undefined)
    throw new TypeError(`Mapping references absent ${label} Evidence`);
  return value;
};

const byId = (evidence: readonly Evidence[]): Map<string, Evidence> =>
  new Map(evidence.map((item) => [item.evidence_id, item]));

const assertUnique = (evidence: readonly Evidence[], label: string): void => {
  if (
    new Set(evidence.map(({ evidence_id: id }) => id)).size !== evidence.length
  )
    throw new TypeError(
      `Static/runtime correlation rejects duplicate ${label}`,
    );
};

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const canonicalJson = (value: JsonValue): string => {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new TypeError(
      "RFC 8785 canonicalization rejected correlation mapping",
    );
  return serialized;
};
