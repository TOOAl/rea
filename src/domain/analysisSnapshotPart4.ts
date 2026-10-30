export const __stub = 1;
//         : `Analysis snapshot ${label} ${operation} has no profile-bound Evidence record`,
//     );
//   };
//   const checkId = (
//     entry: EntryMetadata | WorkflowMetadata,
//     workflow: boolean,
//   ): void => {
//     const expected = analysisQueryId(
//       header.target,
//       header.binding,
//       entry.operation,
//       entry.parameters,
//     );
//     if (entry.query_id !== expected)
//       throw new TypeError(
//         workflow
//           ? "Analysis snapshot workflow query identifier does not match"
//           : "Analysis snapshot query identifier does not match",
//       );
//     if (ids.has(entry.query_id))
//       throw new TypeError("Analysis snapshot contains duplicate queries");
//     ids.add(entry.query_id);
//   };
//   const entries = providerRows.map(({ entry, digest }) => {
//     if (
//       entry.execution.provider.id !== header.binding.provider.id ||
//       entry.execution.provider.name !== header.binding.provider.name ||
//       entry.execution.provider.version !== header.binding.provider.version
//     )
//       throw new TypeError("Analysis snapshot entry provider does not match");
//     checkId(entry, false);
//     const evidence = find(
//       compositeKey(["observed", entryQueryKey(entry, header.binding)]),
//       digest,
//       "entry",
//       entry.operation,
//     );
//     return {
//       ...entry,
//       execution: {
//         ...entry.execution,
//         result: evidence.normalized_result,
//         raw_result: evidence.raw_result,
//       },
//     };
//   });
//   const workflow_entries = workflowRows.map(({ entry, digest }) => {
//     const provider = entry.execution.analysis_profile.provider;
//     if (
//       entry.execution.provider.id !== provider.id ||
//       entry.execution.provider.name !== provider.name ||
//       entry.execution.provider.version !== provider.version
//     )
//       throw new TypeError(
//         "Analysis snapshot workflow entry provider does not match its profile",
//       );
//     checkId(entry, true);
//     const evidence = find(
//       compositeKey(["derived", workflowEntryQueryKey(entry)]),
//       digest,
//       "workflow entry",
//       entry.operation,
//     );
//     return {
//       ...entry,
//       execution: {
//         ...entry.execution,
//         result: evidence.normalized_result,
//         raw_result: evidence.raw_result,
//       },
//     };
//   });
//   return {
//     target: header.target,
//     binding: header.binding,
//     entries,
//     workflow_entries,
//     evidence_bundle: bundle,
//   };
// };
//
// const hasCanonicalQueryOrder = (
//   entries: readonly { readonly query_id: string }[],
// ): boolean => {
//   let previous: string | undefined;
//   for (const { query_id: queryId } of entries) {
//     if (
//       previous !== undefined &&
//       compareUnicodeCodePoints(previous, queryId) > 0
//     )
//       return false;
//     previous = queryId;
//   }
//   return true;
// };
//
// const isCorrespondingEvidence = (
//   evidence: Evidence,
//   snapshot: Pick<AnalysisSnapshot, "target" | "binding">,
// ): boolean =>
//   evidence.predicate_type === "rea.analysis" &&
//   evidence.confidence === "observed" &&
//   evidence.authority === "shipped-artifact" &&
//   evidence.subject?.digest.sha256 === snapshot.target.sha256 &&
//   evidence.analysis_profile !== null &&
//   analysisProfilesEqual(
//     evidence.analysis_profile,
//     snapshot.binding.analysis_profile,
//   );
//
// const evidenceQueryKey = (evidence: Evidence): string =>
//   contentDigest({
//     operation: evidence.operation,
//     parameters: evidence.parameters,
//     provider: evidence.provider,
//     analysis_profile: evidence.analysis_profile,
//   });
//
// const entryQueryKey = (
//   entry: Pick<AnalysisSnapshotEntry, "operation" | "parameters"> & {
//     readonly execution: Pick<AnalysisSnapshotEntry["execution"], "provider">;
//   },
//   binding: AnalysisSnapshotBinding,
// ): string =>
//   contentDigest({
//     operation: entry.operation,
//     parameters: entry.parameters,
//     provider: entry.execution.provider,
//     analysis_profile: binding.analysis_profile,
//   });
//
// const entryEvidenceKey = (
//   entry: AnalysisSnapshotEntry,
//   binding: AnalysisSnapshotBinding,
// ): string =>
//   compositeKey([
//     entryQueryKey(entry, binding),
//     snapshotContentDigest(
//       entry.execution.result,
//       entry.execution.raw_result,
//       entry.execution,
//     ),
//   ]);
//
// const workflowEntryQueryKey = (
//   entry: Pick<AnalysisSnapshotWorkflowEntry, "operation" | "parameters"> & {
//     readonly execution: Pick<
//       AnalysisSnapshotWorkflowEntry["execution"],
//       "provider" | "analysis_profile"
//     >;
//   },
// ): string =>
//   contentDigest({
//     operation: entry.operation,
//     parameters: entry.parameters,
//     provider: entry.execution.provider,
//     analysis_profile: entry.execution.analysis_profile,
//   });
//
// const workflowEntryEvidenceKey = (
//   entry: AnalysisSnapshotWorkflowEntry,
// ): string =>
//   compositeKey([
//     workflowEntryQueryKey(entry),
//     snapshotContentDigest(
//       entry.execution.result,
//       entry.execution.raw_result,
//       entry.execution,
//     ),
//   ]);
//
// const isWorkflowEvidence = (
//   evidence: Evidence,
//   snapshot: Pick<AnalysisSnapshot, "target">,
//   entry: AnalysisSnapshotWorkflowEntry,
// ): boolean =>
//   evidence.predicate_type === "rea.analysis" &&
//   evidence.confidence === "derived" &&
//   evidence.authority === "shipped-artifact" &&
//   evidence.subject?.digest.sha256 === snapshot.target.sha256 &&
//   evidence.analysis_profile !== null &&
//   analysisProfilesEqual(
//     evidence.analysis_profile,
//     entry.execution.analysis_profile,
//   ) &&
//   evidence.provider.id === entry.execution.provider.id &&
//   evidence.provider.name === entry.execution.provider.name &&
//   evidence.provider.version === entry.execution.provider.version;
//
// const evidenceMatchesWorkflowEntry = (
//   evidence: Evidence,
//   entry: AnalysisSnapshotWorkflowEntry,
//   snapshot: Pick<AnalysisSnapshot, "target">,
// ): boolean =>
//   isWorkflowEvidence(evidence, snapshot, entry) &&
//   compositeKey([
//     evidenceQueryKey(evidence),
//     evidenceContentDigest(evidence),
//   ]) === workflowEntryEvidenceKey(entry);
//
// const evidenceContentMetadata = (evidence: Evidence) => {
//   return {
//     limitations: evidence.limitations,
//     relationship_coverage: evidence.relationship_coverage,
//     locations: evidence.locations,
//     subject:
//       evidence.subject === null
//         ? null
//         : {
//             local_path: evidence.subject.local_path,
//             sha256: evidence.subject.digest.sha256,
//             format: evidence.subject.format,
//             architecture: evidence.subject.architecture,
//           },
//   };
// };
//
// /** Serialize a validated snapshot with byte-stable canonical entry ordering. */
// export const serializeAnalysisSnapshot = (snapshot: AnalysisSnapshot): string =>
//   `${canonicalJson(parseAnalysisSnapshot(snapshot))}\n`;
export const _l = 220;
