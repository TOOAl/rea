import { z } from "zod";

import type {
  ConformancePackage,
  VerifierContract,
} from "./conformancePackage.js";

/** Result of comparing a single dimension. */

const comparisonIncompleteStatus = (
  expected: unknown,
  actual: unknown,
  options: CompareDimensionOptions,
): IncompleteStatus | null => {
  const expectedStatus = options.expected_status ?? incompleteStatus(expected);
  const actualStatus = options.actual_status ?? incompleteStatus(actual);
  if (options.truncated) return "truncated";
  if (expectedStatus === "truncated" || actualStatus === "truncated")
    return "truncated";
  if (expectedStatus === "unknown" || actualStatus === "unknown")
    return "unknown";
  return null;
};

/** Check if a dimension name is volatile (timing/normalization noise). */
export function isVolatileDimension(name: string): boolean {
  return VOLATILE_DIMENSIONS.has(name);
}

/**
 * Compare two values for a dimension, classifying semantic diffs
 * from timing/normalization noise.
 *
 * Volatile dimensions (timing, timestamps, PIDs) are always treated
 * as matches because their values are expected to differ across
 * runs and do not carry semantic meaning.
 */
export function compareDimension(
  dimensionName: string,
  expected: unknown,
  actual: unknown,
  options: CompareDimensionOptions = {},
): DimensionResult {
  // Volatile dimensions: always match regardless of values
  if (isVolatileDimension(dimensionName)) {
    return {
      name: dimensionName,
      status: "match",
      message: "volatile dimension ignored",
      evidence_ids: uniqueStrings(options.evidence_ids ?? []),
    };
  }

  const status = comparisonIncompleteStatus(expected, actual, options);
  const resultEvidenceIds = uniqueStrings(options.evidence_ids ?? []);

  if (status !== null) {
    return {
      name: dimensionName,
      status,
      message:
        status === "truncated"
          ? "evidence was truncated"
          : "evidence completeness is unknown",
      evidence_ids: resultEvidenceIds,
    };
  }

  if (expected === undefined && actual === undefined) {
    return {
      name: dimensionName,
      status: "unknown",
      message: "both expected and actual are undefined",
      evidence_ids: resultEvidenceIds,
    };
  }

  if (expected === undefined || actual === undefined) {
    return {
      name: dimensionName,
      status: "unknown",
      message: "one side has no observed value",
      evidence_ids: resultEvidenceIds,
    };
  }

  // Semantic comparison for structured objects
  if (typeof expected === "object" && typeof actual === "object") {
    const expectedJson = JSON.stringify(sortKeys(expected));
    const actualJson = JSON.stringify(sortKeys(actual));
    if (expectedJson === actualJson) {
      return {
        name: dimensionName,
        status: "match",
        message: "",
        evidence_ids: resultEvidenceIds,
      };
    }
    return {
      name: dimensionName,
      status: "mismatch",
      message: "semantic content differs",
      evidence_ids: resultEvidenceIds,
    };
  }

  // Primitive comparison
  if (expected === actual) {
    return {
      name: dimensionName,
      status: "match",
      message: "",
      evidence_ids: resultEvidenceIds,
    };
  }

  return {
    name: dimensionName,
    status: "mismatch",
    message: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    evidence_ids: resultEvidenceIds,
  };
}

/** Recursively sort object keys for deterministic comparison. */
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])]),
  );
}

/**
 * Evaluate a trust gate for one scenario by comparing expected
 * evidence against the actual captured run.
 */
export function evaluateTrustGate(
  contract: VerifierContract,
  expectedEvidence: unknown,
  actualEvidence: unknown,
  options: { readonly truncated?: boolean } = {},
): TrustGateResult {
  const dimensionResults: DimensionResult[] = [];
  let firstDivergence: TrustGateResult["first_divergence"] = null;
  const expectedView = evidenceView(expectedEvidence);
  const actualView = evidenceView(actualEvidence);

  for (const dim of contract.dimensions) {
    if (!dim.required) continue;
    const expectedValue = expectedView.values[dim.name];
    const actualValue = actualView.values[dim.name];
    const result = compareDimension(dim.name, expectedValue, actualValue, {
      ...options,
      expected_status: statusForDimension(expectedView, dim.name),
      actual_status: statusForDimension(actualView, dim.name),
      evidence_ids: uniqueStrings([
        ...actualView.evidence_ids,
        ...expectedView.evidence_ids,
      ]),
    });
    dimensionResults.push(result);

    if (result.status === "mismatch" && firstDivergence === null) {
      firstDivergence = {
        dimension: dim.name,
        evidence_id: result.evidence_ids[0] ?? "unknown",
        message: result.message,
      };
    }
  }

  const hasFail = dimensionResults.some(
    (r) => r.status === "mismatch" || r.status === "truncated",
  );
  const hasUnknown = dimensionResults.some((r) => r.status === "unknown");

  const verdict: TrustGateResult["verdict"] = hasFail
    ? "fail"
    : hasUnknown
      ? "unknown"
      : "pass";

  return trustGateResultSchema.parse({
    scenario_id: contract.scenario_id,
    verdict,
    dimension_results: dimensionResults,
    first_divergence: firstDivergence,
  });
}

/**
 * Evaluate trust gates for all scenarios in a conformance package.
 * Rejects runs that differ in required dimensions. Unknown/truncated
 * evidence is never treated as equivalence.
 */
export function evaluatePackageTrustGates(
  pkg: ConformancePackage,
  actualEvidence: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  options: { readonly truncated?: boolean } = {},
): TrustGateResult[] {
  const results: TrustGateResult[] = [];
  for (const contract of pkg.verifier_contracts) {
    const expected = pkg.expected_evidence.find(
      (e) => e.scenario_id === contract.scenario_id,
    );
    if (expected === undefined)
      throw new TypeError(
        `Parsed conformance package is missing expected evidence for ${contract.scenario_id}`,
      );
    const expectedEvidence = expected.envelopes[0] ?? {};
    const actual = actualEvidence[contract.scenario_id] ?? {};
    const result = evaluateTrustGate(
      contract,
      expectedEvidence,
      actual,
      options,
    );
    results.push(result);
  }
  return results;
}
