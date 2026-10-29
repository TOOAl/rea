export const __stub = 1;
// import { z } from "zod";
// import canonicalize from "canonicalize";
//
// import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
//
// import {
//   evidenceSchema,
//   immutableEvidence,
//   parseEvidence,
//   providerSchema,
//   type Evidence,
// } from "./evidence.js";
// import {
//   residualUnknownSchema,
//   type ResidualUnknown,
// } from "./residualUnknown.js";
// import { freezeJsonSnapshot } from "./immutableJson.js";
//
// const [detectedSubjectSchema, rawSubjectSchema] =
//   evidenceSchema.shape.subject.unwrap().options;
// const manifestFields = {
//   digest: true,
//   format: true,
//   architecture: true,
// } as const;
// const artifactManifestSchema = z.discriminatedUnion("format", [
//   detectedSubjectSchema.pick(manifestFields),
//   rawSubjectSchema.pick(manifestFields),
// ]);
// const providerManifestSchema = providerSchema;
// const environmentManifestSchema = evidenceSchema.shape.environment.unwrap();
// const scenarioManifestSchema = z.strictObject({
//   evidence_id: evidenceSchema.shape.evidence_id,
//   operation: z.string().min(1),
//   authority: z.literal("controlled-replay"),
// });
// const captureManifestSchema = z.strictObject({
//   evidence_id: evidenceSchema.shape.evidence_id,
//   predicate_type: z.string().min(1),
// });
//
// export const evidenceBundleSchema = z.strictObject({
//   artifacts: z.array(artifactManifestSchema),
//   providers: z.array(providerManifestSchema),
//   environments: z.array(environmentManifestSchema),
//   scenarios: z.array(scenarioManifestSchema),
//   captures: z.array(captureManifestSchema),
//   unknowns: z.array(residualUnknownSchema),
//   records: z.array(evidenceSchema),
// });
//
// export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;
// const immutableBundles = new WeakMap<object, EvidenceBundle>();
//
// /** Caller input has valid shape but is not in authenticated canonical form. */
// export class NonCanonicalEvidenceBundleError extends TypeError {
//   constructor() {
//     super("Evidence bundle manifests are not canonical");
//     this.name = "NonCanonicalEvidenceBundleError";
//   }
// }
//
// /** Build and authenticate a sealed bundle while reusing immutable Evidence records. */
// export const createImmutableEvidenceBundle = (
//   records: readonly Evidence[],
//   unknowns: readonly ResidualUnknown[] = [],
// ): EvidenceBundle => {
//   const checkedRecords = records.map(immutableEvidence);
//   if (
//     new Set(checkedRecords.map(({ evidence_id }) => evidence_id)).size !==
//     checkedRecords.length
//   )
//     throw new TypeError("Evidence bundle contains duplicate record IDs");
//   const checkedUnknowns = unknowns.map((unknown) =>
//     residualUnknownSchema.parse(unknown),
//   );
//   validateUnknownGraph(checkedUnknowns, checkedRecords);
//   const bundle = freezeJsonSnapshot(
//     createEvidenceBundle(checkedRecords, checkedUnknowns),
//   );
//   immutableBundles.set(bundle, bundle);
//   return bundle;
// };
//
// /** Project records into a deterministic bundle whose order has no semantics. */
// export const createEvidenceBundle = (
//   records: readonly Evidence[],
//   unknowns: readonly ResidualUnknown[] = [],
// ): EvidenceBundle => {
//   const sortedRecords = [...records].sort((left, right) =>
//     compareUnicodeCodePoints(left.evidence_id, right.evidence_id),
//   );
//   return {
//     artifacts: uniqueSorted(
//       sortedRecords.flatMap(({ subject }) =>
//         subject === null
//           ? []
//           : [
//               artifactManifestSchema.parse({
//                 digest: subject.digest,
//                 format: subject.format,
//                 architecture: subject.architecture,
//               }),
//             ],
//       ),
//     ),
//     providers: uniqueSorted(sortedRecords.map(({ provider }) => provider)),
//     environments: uniqueSorted(
//       sortedRecords.flatMap(({ environment }) =>
//         environment === null ? [] : [environment],
//       ),
//     ),
//     scenarios: sortedRecords.flatMap((evidence) =>
//       evidence.authority === "controlled-replay"
//         ? [
//             {
//               evidence_id: evidence.evidence_id,
//               operation: evidence.operation,
//               authority: evidence.authority,
//             },
//           ]
//         : [],
//     ),
//     captures: sortedRecords.flatMap((evidence) =>
//       evidence.predicate_type === "rea.process-capture"
//         ? [
//             {
//               evidence_id: evidence.evidence_id,
//               predicate_type: evidence.predicate_type,
//             },
//           ]
//         : [],
//     ),
//     unknowns: [...unknowns].sort(
//       (left, right) =>
//         compareUnicodeCodePoints(left.unknown_id, right.unknown_id) ||
//         left.revision - right.revision,
//     ),
//     records: sortedRecords,
//   };
// };
//
// /** Retain target records and eligible complete unknown histories with their mutation evidence. */
// export const evidenceBundleForTarget = (
//   bundle: EvidenceBundle,
//   sha256: string,
export const _l = 146;
