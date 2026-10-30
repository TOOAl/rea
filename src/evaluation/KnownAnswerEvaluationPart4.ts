export const __stub = 1;
//     evidence.evidence_links.some((id) => {
//       const linked = delivered.records.get(id);
//       return (
//         linked !== undefined &&
//         !delivered.conflicts.has(id) &&
//         linked.operation === expected.operation &&
//         matchesSubject(linked, expected)
//       );
//     }),
//   );
//
// const assessClaim = (
//   expected: FixtureClaimExpectation,
//   claim: FinalClaim | undefined,
//   delivered: DeliveredEvidence,
// ): FixtureClaimAssessment => {
//   const failures: FixtureClaimFailure[] = [];
//   if (claim === undefined)
//     return { id: expected.id, status: "failed", failures: ["claim_missing"] };
//   if (!sameJson(claim.value, expected.expectedValue))
//     failures.push("value_mismatch");
//   if (claim.confidence !== expected.source.confidence)
//     failures.push("claim_confidence_mismatch");
//   if (claim.authority !== expected.source.authority)
//     failures.push("claim_authority_mismatch");
//   const evidence = delivered.records.get(claim.evidence_id);
//   if (evidence === undefined) failures.push("unknown_evidence");
//   else if (delivered.conflicts.has(claim.evidence_id))
//     failures.push("conflicting_evidence");
//   else {
//     if (evidence.operation !== expected.source.operation)
//       failures.push("source_operation_mismatch");
//     if (evidence.confidence !== expected.source.confidence)
//       failures.push("source_confidence_mismatch");
//     if (evidence.authority !== expected.source.authority)
//       failures.push("source_authority_mismatch");
//     if (
//       expected.source.subject !== undefined &&
//       !matchesSubject(evidence, expected.source.subject)
//     )
//       failures.push("source_subject_mismatch");
//     if (!matchesParameters(evidence, expected.source.parameters))
//       failures.push("source_parameters_mismatch");
//     if (!matchesLinks(evidence, expected.source, delivered))
//       failures.push("source_links_mismatch");
//     try {
//       if (
//         !sameJson(
//           expected.source.select(evidence.normalized_result, {
//             evidence,
//             deliveredEvidence: [...delivered.records.values()].filter(
//               (record) => !delivered.conflicts.has(record.evidence_id),
//             ),
//           }),
//           expected.expectedValue,
//         )
//       )
//         failures.push("source_assertion_mismatch");
//     } catch {
//       // Producer-specific selectors may reject malformed representations; preserve a failed assessment.
//       failures.push("selector_failed");
//     }
//   }
//   return {
//     id: expected.id,
//     status: failures.length === 0 ? "passed" : "failed",
//     failures,
//   };
// };
//
// /** Grade closed answers only against configured fixture truth and delivered authenticated Evidence. */
// export const evaluateKnownAnswers = (
//   calls: readonly (ParsedCodexToolCall | undefined)[],
//   finalMessage: string,
//   expectations: readonly FixtureClaimExpectation[] | undefined,
// ): KnownAnswerAssessment => {
//   const scope = "configured_fixture_claims";
//   if (expectations === undefined)
//     return { scope, status: "not_assessed", manifestFailures: [], claims: [] };
//   const rubric = z.array(expectationSchema).min(1).safeParse(expectations);
//   if (!rubric.success)
//     return {
//       scope,
//       status: "failed",
//       manifestFailures: ["invalid_fixture_rubric"],
//       claims: [],
//     };
//   const expectedIds = new Set(expectations.map(({ id }) => id));
//   if (expectedIds.size !== expectations.length)
//     return {
//       scope,
//       status: "failed",
//       manifestFailures: ["duplicate_fixture_claim_ids"],
//       claims: [],
//     };
//   const manifest = finalAnswerSchema.safeParse(parseClosedJson(finalMessage));
//   if (!manifest.success)
//     return {
//       scope,
//       status: "failed",
//       manifestFailures: ["invalid_final_claim_manifest"],
//       claims: [],
//     };
//   const manifestFailures: string[] = [];
//   const submitted = new Map<string, FinalClaim>();
//   for (const claim of manifest.data.claims) {
//     if (submitted.has(claim.id))
//       manifestFailures.push(`duplicate_claim:${claim.id}`);
//     if (!expectedIds.has(claim.id))
//       manifestFailures.push(`unknown_claim:${claim.id}`);
//     submitted.set(claim.id, claim);
//   }
//   const delivered = collectDeliveredEvidence(calls);
//   const claims = expectations.map((expected) =>
//     assessClaim(expected, submitted.get(expected.id), delivered),
//   );
//   return {
//     scope,
//     status:
//       manifestFailures.length === 0 &&
//       claims.every(({ status }) => status === "passed")
//         ? "passed"
//         : "failed",
//     manifestFailures,
//     claims,
//   };
// };
export const _l = 127;
