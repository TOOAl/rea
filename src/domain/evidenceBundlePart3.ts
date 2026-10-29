export const __stub = 1;
//     throw new TypeError("Evidence bundle contains duplicate record IDs");
//   validateUnknownGraph(parsed.unknowns, parsed.records);
//   const canonical = createEvidenceBundle(
//     parsed.records.map((record, index) => {
//       try {
//         if (!seal) return parseEvidence(record);
//         // Schema parsing gave this boundary exclusive ownership. Register only
//         // validated payloads before authenticating the complete record envelope.
//         record.normalized_result = freezeJsonSnapshot(record.normalized_result);
//         record.raw_result = freezeJsonSnapshot(record.raw_result);
//         return immutableEvidence(record);
//       } catch (cause: unknown) {
//         if (cause instanceof z.ZodError)
//           throw new z.ZodError(
//             cause.issues.map((issue) => ({
//               ...issue,
//               path: ["records", index, ...issue.path],
//             })),
//           );
//         throw cause;
//       }
//     }),
//     parsed.unknowns,
//   );
//   if (JSON.stringify(parsed) !== JSON.stringify(canonical))
//     throw new NonCanonicalEvidenceBundleError();
//   if (seal) {
//     freezeJsonSnapshot(canonical);
//     immutableBundles.set(canonical, canonical);
//   }
//   return canonical;
// };
//
// const validateUnknownGraph = (
//   unknowns: readonly ResidualUnknown[],
//   records: readonly Evidence[],
// ): void => {
//   const evidenceById = new Map(
//     records.map((record) => [record.evidence_id, record]),
//   );
//   const histories = new Map<string, ResidualUnknown[]>();
//   for (const unknown of unknowns) {
//     const history = histories.get(unknown.unknown_id) ?? [];
//     history.push(unknown);
//     histories.set(unknown.unknown_id, history);
//   }
//   const unknownById = new Map<string, ResidualUnknown>();
//   for (const [id, unordered] of histories) {
//     const history = [...unordered].sort(
//       (left, right) => left.revision - right.revision,
//     );
//     for (const [index, revision] of history.entries()) {
//       if (revision.revision !== index + 1)
//         throw new TypeError(
//           `Residual unknown ${id} revision history has a gap`,
//         );
//       if (
//         index > 0 &&
//         revision.previous_revision_digest !==
//           history[index - 1]?.revision_digest
//       )
//         throw new TypeError(`Residual unknown ${id} revision chain is broken`);
//     }
//     const head = history.at(-1);
//     if (head === undefined)
//       throw new TypeError("Residual unknown revision history is empty");
//     unknownById.set(id, head);
//   }
//   for (const unknown of unknowns) {
//     const referencedEvidence = [
//       ...unknown.supporting_evidence_ids,
//       ...unknown.contradicting_evidence_ids,
//       ...unknown.mutation_evidence_ids,
//       ...(unknown.resolution?.evidence_ids ?? []),
//     ];
//     for (const evidenceId of referencedEvidence)
//       if (!evidenceById.has(evidenceId))
//         throw new TypeError(
//           `Residual unknown references missing evidence ${evidenceId}`,
//         );
//     for (const relationship of unknown.relationships)
//       if (!unknownById.has(relationship.unknown_id))
//         throw new TypeError(
//           `Residual unknown references missing unknown ${relationship.unknown_id}`,
//         );
//     if (unknown.resolution?.disposition === "verified")
//       validateVerifiedResolution(unknown, evidenceById);
//   }
//   rejectDependencyCycles(unknownById);
// };
//
// const validateVerifiedResolution = (
//   unknown: ResidualUnknown,
//   evidenceById: Pick<ReadonlyMap<string, Evidence>, "get">,
// ): void => {
//   if (unknown.contradicting_evidence_ids.length > 0)
//     throw new TypeError(
//       `Residual unknown ${unknown.unknown_id} retains contradicting evidence`,
//     );
//   const qualifies = unknown.resolution?.evidence_ids.some((evidenceId) => {
//     const evidence = evidenceById.get(evidenceId);
//     return (
//       unknown.supporting_evidence_ids.includes(evidenceId) &&
//       evidence !== undefined &&
//       evidence.predicate_type !== "rea.residual-unknown-mutation" &&
//       evidenceQualifies(unknown, evidence)
//     );
//   });
//   if (qualifies !== true)
//     throw new TypeError(
//       `Residual unknown ${unknown.unknown_id} has no qualifying resolution evidence`,
//     );
// };
//
// /**
//  * Validate one new residual-unknown revision against an already valid ledger.
//  * This keeps ordinary mutations proportional to the affected revision while
//  * full bundle imports continue to validate the complete graph.
//  */
// export const validateResidualUnknownAddition = (
//   unknown: ResidualUnknown,
//   evidenceById: Pick<ReadonlyMap<string, Evidence>, "get" | "has">,
//   currentHeads: ReadonlyMap<string, ResidualUnknown>,
// ): void => {
//   const current = currentHeads.get(unknown.unknown_id);
//   if (
//     current === undefined
//       ? unknown.revision !== 1 || unknown.previous_revision_digest !== null
//       : unknown.revision !== current.revision + 1 ||
//         unknown.previous_revision_digest !== current.revision_digest
//   )
//     throw new TypeError(
//       `Residual unknown ${unknown.unknown_id} revision chain is broken`,
//     );
//   for (const evidenceId of referencedEvidenceIds(unknown))
//     if (!evidenceById.has(evidenceId))
//       throw new TypeError(
//         `Residual unknown references missing evidence ${evidenceId}`,
//       );
//   for (const relationship of unknown.relationships)
//     if (
//       relationship.unknown_id !== unknown.unknown_id &&
//       !currentHeads.has(relationship.unknown_id)
//     )
//       throw new TypeError(
//         `Residual unknown references missing unknown ${relationship.unknown_id}`,
export const _l = 146;
