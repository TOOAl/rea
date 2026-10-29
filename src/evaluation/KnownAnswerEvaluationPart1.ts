export const __stub = 1;
// import { visit } from "jsonc-parser";
// import { z } from "zod";
//
// import { parseEvidence, type Evidence } from "../domain/evidence.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { canonicalJson } from "../domain/comparisonSemantics.js";
//
// /** Only authenticated, successful, non-conflicting transcript deliveries. */
// export interface FixtureClaimContext {
//   readonly evidence: Evidence;
//   readonly deliveredEvidence: readonly Evidence[];
// }
//
// /** One closed fixture assertion and the producer facts that must support it. */
// export interface FixtureClaimExpectation {
//   readonly id: string;
//   readonly expectedValue: JsonValue;
//   readonly source: {
//     readonly operation: string;
//     readonly authority: Evidence["authority"];
//     readonly confidence: Evidence["confidence"];
//     readonly subject?: { readonly path: string; readonly sha256?: string };
//     readonly parameters?: Readonly<Record<string, JsonValue>>;
//     readonly linkedSubjects?: readonly {
//       readonly operation: string;
//       readonly path: string;
//       readonly sha256?: string;
//     }[];
//     readonly select: (
//       normalizedResult: JsonValue,
//       context: FixtureClaimContext,
//     ) => JsonValue | undefined;
//   };
// }
//
// /** Failed fixture constraints, distinct from unrestricted natural-language correctness. */
// export type FixtureClaimFailure =
//   | "claim_missing"
//   | "value_mismatch"
//   | "claim_confidence_mismatch"
//   | "claim_authority_mismatch"
//   | "unknown_evidence"
//   | "conflicting_evidence"
//   | "source_operation_mismatch"
//   | "source_confidence_mismatch"
//   | "source_authority_mismatch"
//   | "source_subject_mismatch"
//   | "source_parameters_mismatch"
//   | "source_links_mismatch"
//   | "source_assertion_mismatch"
//   | "selector_failed";
//
// /** Diagnostics for a single configured fixture assertion. */
// export interface FixtureClaimAssessment {
//   readonly id: string;
//   readonly status: "passed" | "failed";
//   readonly failures: readonly FixtureClaimFailure[];
// }
//
// /** Only the configured closed fixture claims are assessed. */
// export interface KnownAnswerAssessment {
//   readonly scope: "configured_fixture_claims";
//   readonly status: "passed" | "failed" | "not_assessed";
//   readonly manifestFailures: readonly string[];
//   readonly claims: readonly FixtureClaimAssessment[];
// }
//
// const authoritySchema = z.enum([
//   "shipped-artifact",
//   "controlled-replay",
//   "historical-reference",
//   "external-service",
//   "analyst-inference",
// ]);
// const confidenceSchema = z.enum(["observed", "derived", "inferred"]);
// const subjectSchema = z.strictObject({
//   path: z.string().min(1),
//   sha256: z
//     .string()
//     .regex(/^[a-f0-9]{64}$/u)
//     .optional(),
// });
// const expectationSchema = z.strictObject({
//   id: z.string().min(1),
//   expectedValue: jsonValueSchema,
//   source: z.strictObject({
//     operation: z.string().min(1),
//     authority: authoritySchema,
//     confidence: confidenceSchema,
//     subject: subjectSchema.optional(),
//     parameters: z.record(z.string(), jsonValueSchema).optional(),
//     linkedSubjects: z
//       .array(subjectSchema.extend({ operation: z.string().min(1) }))
//       .optional(),
//     select: z.custom<FixtureClaimExpectation["source"]["select"]>(
//       (value) => typeof value === "function",
//     ),
//   }),
// });
// const finalAnswerSchema = z.strictObject({
//   claims: z.array(
//     z.strictObject({
//       id: z.string().min(1),
//       value: jsonValueSchema,
//       evidence_id: z.string().regex(/^ev_[a-f0-9]{64}$/u),
//       confidence: confidenceSchema,
//       authority: authoritySchema,
//     }),
//   ),
// });
// type FinalClaim = z.infer<typeof finalAnswerSchema>["claims"][number];
// const isRecord = (value: unknown): value is Record<string, unknown> =>
//   typeof value === "object" && value !== null && !Array.isArray(value);
// const record = (value: unknown): Record<string, unknown> | undefined =>
//   isRecord(value) ? value : undefined;
// const sameJson = (left: unknown, right: unknown): boolean => {
//   const parsedLeft = jsonValueSchema.safeParse(left);
//   const parsedRight = jsonValueSchema.safeParse(right);
//   return (
//     parsedLeft.success &&
//     parsedRight.success &&
//     canonicalJson(parsedLeft.data) === canonicalJson(parsedRight.data)
//   );
// };
//
// const parseClosedJson = (text: string): unknown => {
//   const objects: Set<string>[] = [];
//   let invalid = false;
//   try {
//     visit(
//       text,
export const _l = 131;
