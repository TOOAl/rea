export const __stub = 1;
//       record.provider.name === provider.name &&
//       record.provider.version === provider.version &&
//       record.analysis_profile !== null &&
//       analysisProfilesEqual(record.analysis_profile, evidenceProfile) &&
//       canonicalJson(record.parameters) === encodedParameters &&
//       ((entry !== undefined && evidenceMatchesEntry(record, entry, snapshot)) ||
//         (workflowEntry !== undefined &&
//           evidenceMatchesWorkflowEntry(record, workflowEntry, snapshot))),
//   );
//   return evidence === undefined
//     ? undefined
//     : rebindEvidenceToTargetPath(evidence, target);
// };
//
// /** Create one exact replay record for a derived application workflow result. */
// export const createAnalysisSnapshotWorkflowEntry = (input: {
//   readonly target: AnalysisSnapshotTarget;
//   readonly binding: AnalysisSnapshotBinding;
//   readonly operation: string;
//   readonly parameters: Readonly<Record<string, JsonValue>>;
//   readonly execution: SnapshotExecution & {
//     readonly analysisProfile: AnalysisProfileCommitment;
//   };
// }): AnalysisSnapshotWorkflowEntry => {
//   const { target, binding, operation, parameters, execution } = input;
//   if (
//     execution.provider.id !== execution.analysisProfile.provider.id ||
//     execution.provider.name !== execution.analysisProfile.provider.name ||
//     execution.provider.version !== execution.analysisProfile.provider.version
//   )
//     throw new TypeError(
//       "Workflow snapshot execution provider does not match its profile",
//     );
//   return {
//     query_id: analysisQueryId(target, binding, operation, parameters),
//     operation,
//     parameters: jsonObjectSchema.parse(parameters),
//     execution: {
//       result: execution.result,
//       raw_result: execution.rawResult,
//       provider: execution.analysisProfile.provider,
//       analysis_profile: execution.analysisProfile,
//       limitations: [...execution.limitations],
//       relationship_coverage: execution.relationshipCoverage ?? null,
//       locations: [...execution.locations],
//       subject:
//         execution.subject === null
//           ? null
//           : subjectSchema.parse({
//               ...execution.subject,
//               architecture: execution.subject.architecture ?? null,
//             }),
//     },
//   };
// };
//
// const evidenceMatchesEntry = (
//   evidence: Evidence,
//   entry: AnalysisSnapshotEntry,
//   snapshot: Pick<AnalysisSnapshot, "target" | "binding">,
// ): boolean =>
//   isCorrespondingEvidence(evidence, snapshot) &&
//   compositeKey([
//     evidenceQueryKey(evidence),
//     evidenceContentDigest(evidence),
//   ]) === entryEvidenceKey(entry, snapshot.binding);
//
// /** Compute the stable lookup key for one provider/profile-specific query. */
// export const analysisQueryId = (
//   target: AnalysisSnapshotTarget,
//   binding: AnalysisSnapshotBinding,
//   operation: string,
//   parameters: Readonly<Record<string, JsonValue>>,
// ): string =>
//   `query_${createHash("sha256")
//     .update(canonicalJson({ target, binding, operation, parameters }))
//     .digest("hex")}`;
//
// /** Create one serializable snapshot entry from a successful provider call. */
// export const createAnalysisSnapshotEntry = (input: {
//   readonly target: AnalysisSnapshotTarget;
//   readonly binding: AnalysisSnapshotBinding;
//   readonly operation: string;
//   readonly parameters: Readonly<Record<string, JsonValue>>;
//   readonly execution: SnapshotExecution;
// }): AnalysisSnapshotEntry => {
//   const { target, binding, operation, parameters, execution } = input;
//   if (
//     execution.analysisProfile === undefined ||
//     !snapshotMatchesProfile(binding, execution.analysisProfile) ||
//     execution.provider.id !== binding.provider.id ||
//     execution.provider.name !== binding.provider.name ||
//     execution.provider.version !== binding.provider.version
//   )
//     throw new TypeError(
//       "Snapshot execution does not match its provider/profile binding",
//     );
//   return {
//     query_id: analysisQueryId(target, binding, operation, parameters),
//     operation,
//     parameters: jsonObjectSchema.parse(parameters),
//     execution: {
//       result: execution.result,
//       raw_result: execution.rawResult,
//       provider: binding.provider,
//       limitations: [...execution.limitations],
//       relationship_coverage: execution.relationshipCoverage ?? null,
//       locations: [...execution.locations],
//       subject:
//         execution.subject === null
//           ? null
//           : subjectSchema.parse({
//               ...execution.subject,
//               architecture: execution.subject.architecture ?? null,
//             }),
//     },
//   };
// };
//
// const validatedSnapshots = new WeakMap<object, AnalysisSnapshot>();
//
// /** Parse a provider/profile-exact snapshot and verify its entries and evidence. */
// export const parseAnalysisSnapshot = (input: unknown): AnalysisSnapshot => {
//   if (typeof input === "object" && input !== null) {
//     const owned = validatedSnapshots.get(input);
//     if (owned !== undefined) return owned;
//   }
//   const parsed = analysisSnapshotSchema.parse(input);
//   restoreSnapshot(
//     parsed,
//     parseEvidenceBundle(parsed.evidence_bundle),
//     parsed.entries.map((entry) => ({
//       kind: "provider",
//       entry,
//       digest: snapshotContentDigest(
//         entry.execution.result,
//         entry.execution.raw_result,
//         entry.execution,
//       ),
//     })),
//     parsed.workflow_entries.map((entry) => ({
//       kind: "workflow",
//       entry,
//       digest: snapshotContentDigest(
//         entry.execution.result,
//         entry.execution.raw_result,
//         entry.execution,
//       ),
//     })),
//   );
//   return parsed;
// };
//
// /** Own an authenticated immutable cache while preserving mutable caller exports. */
// export const immutableAnalysisSnapshot = (input: unknown): AnalysisSnapshot =>
//   sealSnapshot(parseAnalysisSnapshot(input));
//
// const sealSnapshot = (snapshot: AnalysisSnapshot): AnalysisSnapshot => {
//   for (const entry of [...snapshot.entries, ...snapshot.workflow_entries]) {
//     freezeJsonSnapshot(entry.execution.result);
//     freezeJsonSnapshot(entry.execution.raw_result);
//   }
//   freezeJsonSnapshot(snapshot);
//   validatedSnapshots.set(snapshot, snapshot);
//   return snapshot;
// };
//
// const restoreSnapshot = (
//   header: Pick<AnalysisSnapshot, "target" | "binding">,
//   bundle: AnalysisSnapshot["evidence_bundle"],
//   providerRows: readonly Extract<PreparedEntry, { kind: "provider" }>[],
//   workflowRows: readonly Extract<PreparedEntry, { kind: "workflow" }>[],
// ): AnalysisSnapshot => {
//   const scopedEvidence = evidenceBundleForTarget(bundle, header.target.sha256);
//   if (
//     scopedEvidence.records.length !== bundle.records.length ||
//     scopedEvidence.unknowns.length !== bundle.unknowns.length
//   )
//     throw new TypeError(
//       "Analysis snapshot evidence contains records for another target",
//     );
//   if (!hasCanonicalQueryOrder(providerRows.map(({ entry }) => entry)))
//     throw new TypeError("Analysis snapshot entries are not canonical");
//   if (!hasCanonicalQueryOrder(workflowRows.map(({ entry }) => entry)))
//     throw new TypeError("Analysis snapshot workflow entries are not canonical");
//   const ids = new Set<string>();
//   const corresponding = new Set<string>();
//   const matching = new Map<string, Evidence>();
//   for (const evidence of bundle.records) {
//     if (
//       evidence.predicate_type !== "rea.analysis" ||
//       evidence.authority !== "shipped-artifact" ||
//       evidence.subject?.digest.sha256 !== header.target.sha256 ||
//       evidence.analysis_profile === null ||
//       (evidence.confidence !== "observed" && evidence.confidence !== "derived")
//     )
//       continue;
//     if (
//       evidence.confidence === "observed" &&
//       !isCorrespondingEvidence(evidence, header)
//     )
//       continue;
//     const query = compositeKey([
//       evidence.confidence,
//       evidenceQueryKey(evidence),
//     ]);
//     corresponding.add(query);
//     matching.set(
//       compositeKey([query, evidenceContentDigest(evidence)]),
//       evidence,
//     );
//   }
//   const find = (
//     query: string,
//     digest: string,
//     label: string,
//     operation: string,
//   ): Evidence => {
//     const evidence = matching.get(compositeKey([query, digest]));
//     if (evidence !== undefined) return evidence;
//     throw new TypeError(
//       corresponding.has(query)
//         ? `Analysis snapshot ${label} ${operation} differs from its Evidence record`
export const _l = 223;
