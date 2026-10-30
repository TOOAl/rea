import { z } from "zod";

import type {
  ConformancePackage,
  VerifierContract,
} from "./conformancePackage.js";

/** Result of comparing a single dimension. */
export const dimensionResultSchema = z.strictObject({
  name: z.string().min(1),
  status: z.enum(["match", "mismatch", "unknown", "truncated"]),
  message: z.string().default(""),
  evidence_ids: z.array(z.string()).default([]),
});

const trustGateResultShape = {
  scenario_id: z.string().min(1),
  dimension_results: z.array(dimensionResultSchema),
};
const divergenceSchema = z.strictObject({
  dimension: z.string().min(1),
  evidence_id: z.string().min(1),
  message: z.string(),
});

/** Result of evaluating a trust gate for one scenario. */
export const trustGateResultSchema = z.union([
  z.strictObject({
    ...trustGateResultShape,
    verdict: z.enum(["pass", "unknown"]),
    first_divergence: z.null(),
  }),
  z.strictObject({
    ...trustGateResultShape,
    verdict: z.literal("fail"),
    first_divergence: divergenceSchema.nullable(),
  }),
]);

export type DimensionResult = z.infer<typeof dimensionResultSchema>;
export type TrustGateResult = z.infer<typeof trustGateResultSchema>;

/** Dimension that is volatile due to timing or normalization. */
const VOLATILE_DIMENSIONS = new Set([
  "timing",
  "timestamp",
  "pid",
  "ppid",
  "duration_ms",
  "created_at",
  "updated_at",
]);

type IncompleteStatus = "unknown" | "truncated";

type EvidenceView = {
  readonly values: Readonly<Record<string, unknown>>;
  readonly evidence_ids: readonly string[];
  readonly status: IncompleteStatus | null;
  readonly unknown_scopes: readonly string[];
};

type CompareDimensionOptions = {
  readonly truncated?: boolean;
  readonly evidence_ids?: readonly string[];
  readonly expected_status?: IncompleteStatus | null;
  readonly actual_status?: IncompleteStatus | null;
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const uniqueStrings = (values: readonly string[]): string[] => [
  ...new Set(values.filter((value) => value.length > 0)),
];

const stringValues = (value: unknown): readonly string[] => {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
};

const evidenceIds = (record: Readonly<Record<string, unknown>>): string[] =>
  uniqueStrings([
    ...stringValues(record["evidence_id"]),
    ...stringValues(record["evidence_ids"]),
    ...stringValues(record["evidence_links"]),
  ]);

const incompleteStatus = (value: unknown): IncompleteStatus | null => {
  if (!isRecord(value)) return null;
  const record = value;
  if (record["truncated"] === true) return "truncated";
  const status = record["status"];
  if (status === "truncated") return "truncated";
  if (
    status === "unknown" ||
    status === "unavailable" ||
    status === "partial" ||
    status === "incomplete" ||
    status === "unverifiable" ||
    status === "failed" ||
    status === "not_approved"
  )
    return "unknown";
  for (const key of ["coverage", "completeness"]) {
    const nested = record[key];
    if (!isRecord(nested)) continue;
    const nestedStatus = incompleteStatus(nested);
    if (nestedStatus !== null) return nestedStatus;
  }
  return null;
};

const hasResidualUnknowns = (value: unknown): boolean =>
  isRecord(value) &&
  Array.isArray(value["residual_unknowns"]) &&
  value["residual_unknowns"].length > 0;

const unknownScopes = (record: Readonly<Record<string, unknown>>): string[] => {
  const residualUnknowns = record["residual_unknowns"];
  if (!Array.isArray(residualUnknowns)) return [];
  return residualUnknowns.flatMap((item) => {
    if (!isRecord(item) || typeof item["scope"] !== "string") return [];
    return [item["scope"]];
  });
};

const evidenceView = (input: unknown): EvidenceView => {
  if (!isRecord(input))
    return {
      values: {},
      evidence_ids: [],
      status: null,
      unknown_scopes: [],
    };
  const normalized = input["normalized_result"];
  const values = isRecord(normalized) ? normalized : input;
  const normalizedStatus = isRecord(normalized)
    ? incompleteStatus(normalized)
    : null;
  return {
    values,
    evidence_ids: evidenceIds(input),
    status: incompleteStatus(input) ?? normalizedStatus,
    unknown_scopes: uniqueStrings([
      ...unknownScopes(input),
      ...(isRecord(normalized) ? unknownScopes(normalized) : []),
    ]),
  };
};

const dimensionScope = (dimensionName: string): string | null => {
  if (dimensionName === "exit_code" || dimensionName === "exit") return "exit";
  if (
    dimensionName === "process" ||
    dimensionName === "process_tree" ||
    dimensionName === "event_journal"
  )
    return "process";
  if (dimensionName === "stdout" || dimensionName === "stderr")
    return "terminal";
  if (dimensionName === "filesystem") return "filesystem";
  if (dimensionName === "shim_events") return "shim";
  if (dimensionName === "protocol_events") return "protocol";
  return null;
};

const statusForDimension = (
  view: EvidenceView,
  dimensionName: string,
): IncompleteStatus | null => {
  const valueStatus = incompleteStatus(view.values[dimensionName]);
  if (valueStatus !== null) return valueStatus;
  if (hasResidualUnknowns(view.values[dimensionName])) return "unknown";
  const scope = dimensionScope(dimensionName);
  return scope !== null && view.unknown_scopes.includes(scope)
    ? "unknown"
    : view.status;
};
