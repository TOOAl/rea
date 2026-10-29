export const __stub = 1;
//     const entry = entrySchema.parse(input);
//     const { result, raw_result, ...execution } = entry.execution;
//     preparedEntries.set(handle, {
//       kind,
//       entry: { ...entry, execution },
//       digest: snapshotContentDigest(result, raw_result, execution),
//     });
//   } else {
//     const entry = workflowEntrySchema.parse(input);
//     const { result, raw_result, ...execution } = entry.execution;
//     preparedEntries.set(handle, {
//       kind,
//       entry: { ...entry, execution },
//       digest: snapshotContentDigest(result, raw_result, execution),
//     });
//   }
//   return handle;
// };
//
// const snapshotFileHeaderSchema = z.object({
//   target: targetSchema,
//   binding: bindingSchema,
//   evidence_bundle: z.unknown(),
// });
//
// /** Reconstruct file entries only from fully authenticated matching Evidence. */
// export const parsePreparedAnalysisSnapshot = (
//   input: unknown,
//   entries: readonly PreparedSnapshotEntry[],
//   workflowEntries: readonly PreparedSnapshotEntry[],
// ): AnalysisSnapshot => {
//   const header = snapshotFileHeaderSchema.parse(input);
//   const bundle = parseImmutableEvidenceBundle(header.evidence_bundle);
//   const providerRows = entries.map((handle) => {
//     const row = preparedEntries.get(handle);
//     if (row?.kind !== "provider")
//       throw new TypeError(
//         "Analysis snapshot entry was not parsed in this realm",
//       );
//     return row;
//   });
//   const workflowRows = workflowEntries.map((handle) => {
//     const row = preparedEntries.get(handle);
//     if (row?.kind !== "workflow")
//       throw new TypeError(
//         "Analysis snapshot workflow entry was not parsed in this realm",
//       );
//     return row;
//   });
//   const restored = sealSnapshot(
//     restoreSnapshot(header, bundle, providerRows, workflowRows),
//   );
//   for (const handle of [...entries, ...workflowEntries])
//     preparedEntries.delete(handle);
//   return restored;
// };
//
// const contentDigest = (value: JsonValue): string => {
//   const steps = canonicalJsonDigestSteps(value);
//   let step = steps.next();
//   while (!step.done) step = steps.next();
//   return step.value;
// };
//
// const snapshotContentDigest = (
//   result: JsonValue,
//   rawResult: JsonValue | null,
//   execution: Pick<
//     AnalysisSnapshotEntry["execution"],
//     "limitations" | "locations" | "subject" | "relationship_coverage"
//   >,
// ): string => {
//   const metadata = jsonObjectSchema.parse({
//     limitations: execution.limitations,
//     locations: execution.locations,
//     subject:
//       execution.subject === null
//         ? null
//         : {
//             local_path: execution.subject.path,
//             sha256: execution.subject.sha256,
//             format: execution.subject.format,
//             architecture: execution.subject.architecture,
//           },
//     relationship_coverage: execution.relationship_coverage,
//   });
//   return contentDigest({
//     ...metadata,
//     normalized_result: result,
//     raw_result: rawResult,
//   });
// };
//
// const evidenceContentDigest = (evidence: Evidence): string => {
//   return contentDigest({
//     ...jsonObjectSchema.parse(evidenceContentMetadata(evidence)),
//     normalized_result: evidence.normalized_result,
//     raw_result: evidence.raw_result,
//   });
// };
//
// interface SnapshotExecution {
//   readonly result: JsonValue;
//   readonly rawResult: JsonValue | null;
//   readonly provider: {
//     readonly id: string;
//     readonly name: string;
//     readonly version: string | null;
//   };
//   readonly analysisProfile?: AnalysisProfileCommitment;
//   readonly limitations: readonly string[];
//   readonly relationshipCoverage?: RelationshipCoverage | null | undefined;
//   readonly locations: readonly EvidenceLocation[];
//   readonly subject: EvidenceSubjectTarget | null;
// }
//
// const canonicalJson = (value: unknown): string => {
//   const json = jsonValueSchema.parse(value);
//   const encoded = canonicalize(json);
//   if (encoded === undefined)
//     throw new TypeError("RFC 8785 canonicalization rejected snapshot data");
//   return encoded;
// };
//
// /** Project a binary into the path-free identity used for cache invalidation. */
// export const snapshotTarget = (target: BinaryTarget): AnalysisSnapshotTarget =>
//   target.format === "raw-binary"
//     ? {
//         sha256: target.sha256,
//         kind: target.kind,
//         architecture: target.architecture,
//         format: target.format,
//         entry_point: target.entryPoint,
//       }
//     : {
//         sha256: target.sha256,
//         kind: target.kind,
//         architecture: target.architecture ?? null,
//         format: target.format,
//       };
//
// /** Build the immutable provider/profile binding used by a cached snapshot. */
// export const snapshotBinding = (
//   profile: AnalysisProfileCommitment,
// ): AnalysisSnapshotBinding =>
//   bindingSchema.parse({
//     provider: profile.provider,
//     analysis_profile: profile,
//   });
//
// /** Compare an open binary with the immutable target identity in a snapshot. */
// export const snapshotMatchesTarget = (
//   snapshot: AnalysisSnapshotTarget,
//   target: BinaryTarget,
// ): boolean =>
//   snapshot.sha256 === target.sha256 &&
//   snapshot.kind === target.kind &&
//   snapshot.format === target.format &&
//   snapshot.architecture === (target.architecture ?? null) &&
//   (snapshot.format !== "raw-binary" ||
//     (target.format === "raw-binary" &&
//       snapshot.entry_point === target.entryPoint));
//
// /** Compare a snapshot binding with the selected concrete analysis profile. */
// export const snapshotMatchesProfile = (
//   binding: AnalysisSnapshotBinding,
//   profile: AnalysisProfileCommitment,
// ): boolean =>
//   binding.provider.id === profile.provider.id &&
//   binding.provider.name === profile.provider.name &&
//   binding.provider.version === profile.provider.version &&
//   analysisProfilesEqual(binding.analysis_profile, profile);
//
// /** Require an exact target and selected provider/profile cache partition. */
// export const snapshotMatchesBinding = (
//   snapshot: Pick<AnalysisSnapshot, "target" | "binding">,
//   target: BinaryTarget,
//   profile: AnalysisProfileCommitment,
// ): boolean =>
//   snapshotMatchesTarget(snapshot.target, target) &&
//   snapshotMatchesProfile(snapshot.binding, profile);
//
// /** Find exact persisted CLI Evidence without starting an analysis provider. */
// export const snapshotEvidenceForQuery = (
//   snapshot: AnalysisSnapshot,
//   query: {
//     readonly target: BinaryTarget;
//     readonly bindingProfile: AnalysisProfileCommitment;
//     readonly operation: string;
//     readonly parameters: Readonly<Record<string, JsonValue>>;
//     readonly provider: SnapshotExecution["provider"];
//     readonly evidenceProfile: AnalysisProfileCommitment;
//   },
// ): Evidence | undefined => {
//   const {
//     target,
//     bindingProfile,
//     operation,
//     parameters,
//     provider,
//     evidenceProfile,
//   } = query;
//   if (!snapshotMatchesBinding(snapshot, target, bindingProfile))
//     return undefined;
//   const encodedParameters = canonicalJson(parameters);
//   const queryId = analysisQueryId(
//     snapshot.target,
//     snapshot.binding,
//     operation,
//     parameters,
//   );
//   const entry = snapshot.entries.find(
//     (candidate) => candidate.query_id === queryId,
//   );
//   const workflowEntry = snapshot.workflow_entries.find(
//     (candidate) => candidate.query_id === queryId,
//   );
//   if (entry === undefined && workflowEntry === undefined) return undefined;
//   const evidence = snapshot.evidence_bundle.records.find(
//     (record) =>
//       record.subject?.digest.sha256 === target.sha256 &&
//       record.operation === operation &&
//       record.provider.id === provider.id &&
export const _l = 223;
