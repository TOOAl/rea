export const __stub = 1;
// ): EvidenceBundle => {
//   const recordsById = new Map(
//     bundle.records.map((record) => [record.evidence_id, record]),
//   );
//   const histories = new Map<string, ResidualUnknown[]>();
//   for (const unknown of bundle.unknowns) {
//     const history = histories.get(unknown.unknown_id) ?? [];
//     history.push(unknown);
//     histories.set(unknown.unknown_id, history);
//   }
//   const retained = new Set<string>();
//   const dependents = new Map<string, Set<string>>();
//   const relationships = new Map<string, Set<string>>();
//   for (const [id, history] of histories) {
//     const eligible = history.every((unknown) => {
//       if (unknown.scope_digest !== sha256) return false;
//       const mutationEvidenceIds = new Set(unknown.mutation_evidence_ids);
//       return referencedEvidenceIds(unknown).every((evidenceId) => {
//         const record = recordsById.get(evidenceId);
//         // Mutation subjects record the target active at the time of an edit,
//         // which need not be the question's immutable investigation scope.
//         return (
//           record?.subject?.digest.sha256 === sha256 ||
//           (mutationEvidenceIds.has(evidenceId) &&
//             record?.predicate_type === "rea.residual-unknown-mutation")
//         );
//       });
//     });
//     if (!eligible) continue;
//     retained.add(id);
//     const relatedIds = new Set(
//       history.flatMap((unknown) =>
//         unknown.relationships.map(({ unknown_id }) => unknown_id),
//       ),
//     );
//     relationships.set(id, relatedIds);
//     for (const relatedId of relatedIds) {
//       const references = dependents.get(relatedId) ?? new Set<string>();
//       references.add(id);
//       dependents.set(relatedId, references);
//     }
//   }
//   const pending: string[] = [];
//   for (const [id, relatedIds] of relationships)
//     if ([...relatedIds].some((relatedId) => !retained.has(relatedId)))
//       pending.push(id);
//   for (let index = 0; index < pending.length; index += 1) {
//     const id = pending[index];
//     if (id === undefined || !retained.delete(id)) continue;
//     for (const dependent of dependents.get(id) ?? []) pending.push(dependent);
//   }
//   const unknowns = bundle.unknowns.filter((unknown) =>
//     retained.has(unknown.unknown_id),
//   );
//   const mutationIds = new Set(
//     unknowns.flatMap(({ mutation_evidence_ids: ids }) => ids),
//   );
//   return createEvidenceBundle(
//     bundle.records.filter(
//       (record) =>
//         record.subject?.digest.sha256 === sha256 ||
//         mutationIds.has(record.evidence_id),
//     ),
//     unknowns,
//   );
// };
//
// const referencedEvidenceIds = (unknown: ResidualUnknown): readonly string[] => [
//   ...unknown.supporting_evidence_ids,
//   ...unknown.contradicting_evidence_ids,
//   ...unknown.mutation_evidence_ids,
//   ...(unknown.resolution?.evidence_ids ?? []),
// ];
//
// /**
//  * Name the bundle constraint that failed and how to recover. A single
//  * Evidence record, such as one command result, is not a bundle.
//  */
// export type EvidenceBundleFailureDescription =
//   | { readonly kind: "single-record"; readonly message: string }
//   | { readonly kind: "invalid-bundle"; readonly message: string };
//
// export const describeEvidenceBundleFailure = (
//   input: unknown,
//   cause: unknown,
// ): EvidenceBundleFailureDescription => {
//   try {
//     const record = parseEvidence(input);
//     return {
//       kind: "single-record",
//       message: `Expected an Evidence bundle with records and manifest arrays, but this JSON is one Evidence record (${record.evidence_id}). Export a session bundle with the MCP export_evidence_bundle tool and supply that file.`,
//     };
//   } catch {
//     return {
//       kind: "invalid-bundle",
//       message:
//         cause instanceof z.ZodError
//           ? `Evidence bundle does not match the bundle schema ${describeValidationFailure(cause)}. Supply an unmodified bundle written by export_evidence_bundle or rea evidence-export.`
//           : `Evidence bundle validation failed: ${describeValidationFailure(cause)}. Recreate or re-export the bundle, then try again.`,
//     };
//   }
// };
//
// /** Locate the first schema issue, or keep a thrown constraint message. */
// export const describeValidationFailure = (cause: unknown): string => {
//   if (!(cause instanceof z.ZodError))
//     return cause instanceof Error ? cause.message : String(cause);
//   const [first, ...rest] = cause.issues;
//   const location =
//     first === undefined || first.path.length === 0
//       ? "the document root"
//       : first.path.map(String).join(".");
//   return `at ${location}: ${first?.message ?? "invalid value"}${rest.length === 0 ? "" : ` (${String(rest.length)} more issues)`}`;
// };
//
// /** Parse records, verify semantic IDs, and reject inconsistent manifests. */
// export const parseEvidenceBundle = (input: unknown): EvidenceBundle => {
//   return parseBundle(input, false);
// };
//
// /** Authenticate and seal file-owned payloads once for downstream zero-copy reuse. */
// export const parseImmutableEvidenceBundle = (
//   input: unknown,
// ): EvidenceBundle => {
//   return parseBundle(input, true);
// };
//
// const parseBundle = (input: unknown, seal: boolean): EvidenceBundle => {
//   if (typeof input === "object" && input !== null) {
//     const owned = immutableBundles.get(input);
//     if (owned !== undefined) return owned;
//   }
//   return authenticateBundle(evidenceBundleSchema.parse(input), seal);
// };
//
// /** Authenticate evidence and bundle invariants after the bundle shape is parsed. */
// export const authenticateParsedEvidenceBundle = (
//   parsed: EvidenceBundle,
// ): EvidenceBundle => authenticateBundle(parsed, false);
//
// const authenticateBundle = (
//   parsed: EvidenceBundle,
//   seal: boolean,
// ): EvidenceBundle => {
//   const recordIds = parsed.records.map(({ evidence_id: id }) => id);
//   if (new Set(recordIds).size !== recordIds.length)
export const _l = 146;
