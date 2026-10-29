export const __stub = 1;
//     return { artifact: input.artifact, status: "unchanged", diff: null };
//   return {
//     artifact: input.artifact,
//     status: "changed",
//     diff: {
//       artifact: input.artifact,
//       status: "changed",
//       before_state: beforeState,
//       after_state: afterState,
//       before_sha256: beforeSha256,
//       after_sha256: afterSha256,
//       reason: null,
//     },
//   };
// };
//
// const digestScenarioEvents = (
//   value: unknown,
//   ordinaryEventsDigest: string | null,
// ): string => {
//   const parsed = scenarioEventsValueSchema.parse(value);
//   return digestCanonicalValue(
//     {
//       ordinary_events_sha256: ordinaryEventsDigest,
//       // These are already normalized SHA-256 transaction fingerprints.
//       network_transactions: parsed.network_transactions,
//     },
//     "Browser scenario",
//   );
// };
//
// const eventCoverageReason = (
//   before: BrowserScenarioCapture,
//   after: BrowserScenarioCapture,
//   beforeNetworkReason: string | undefined,
//   afterNetworkReason: string | undefined,
// ): string | undefined => {
//   const reasons = [
//     eventFamilyCoverageReason(before, after),
//     networkContentCoverageReason(before, after),
//     beforeNetworkReason,
//     afterNetworkReason,
//   ].filter((reason) => reason !== undefined);
//   return reasons.length === 0 ? undefined : reasons.join(" ");
// };
//
// interface CompareCapturedValuesInput<Value> {
//   readonly artifact: BrowserScenarioArtifactKind;
//   readonly before: CaptureState<Value>;
//   readonly after: CaptureState<Value>;
//   readonly beforeStep: BrowserScenarioStep;
//   readonly afterStep: BrowserScenarioStep;
//   readonly rules: readonly BrowserScenarioNormalizationRule[];
//   readonly project?: (value: Value) => unknown;
//   readonly order?: (normalized: unknown) => unknown;
//   readonly beforeState?: BrowserScenarioEvidenceState;
//   readonly afterState?: BrowserScenarioEvidenceState;
//   readonly incomparableReason?: string | undefined;
//   readonly familyIncomparableReason?: string | undefined;
// }
//
// const compareCapturedValues = <Value>(
//   input: CompareCapturedValuesInput<Value>,
// ): ComparableArtifact => {
//   const {
//     artifact,
//     before,
//     after,
//     beforeStep,
//     afterStep,
//     rules,
//     project = (value) => value,
//     order,
//   } = input;
//   const beforeState =
//     input.beforeState ?? artifactEvidenceState(artifact, before, beforeStep);
//   const afterState =
//     input.afterState ?? artifactEvidenceState(artifact, after, afterStep);
//   if (beforeState === "not_requested" && afterState === "not_requested")
//     return { artifact, status: "not_compared", diff: null };
//   const beforeSha256 =
//     beforeState === "captured" && before.state === "captured"
//       ? digestNormalizedScenarioValue(
//           project(before.value),
//           artifact,
//           rules,
//           order,
//         )
//       : null;
//   const afterSha256 =
//     afterState === "captured" && after.state === "captured"
//       ? digestNormalizedScenarioValue(
//           project(after.value),
//           artifact,
//           rules,
//           order,
//         )
//       : null;
//   if (
//     beforeState !== "captured" ||
//     afterState !== "captured" ||
//     before.state !== "captured" ||
//     after.state !== "captured" ||
//     input.incomparableReason !== undefined
//   )
//     return {
//       artifact,
//       status: "unknown",
//       diff: {
//         artifact,
//         status: "unknown",
//         before_state: beforeState,
//         after_state: afterState,
//         before_sha256: beforeSha256,
//         after_sha256: afterSha256,
//         reason:
//           joinIncomparableReasons(
//             input.familyIncomparableReason,
//             input.incomparableReason,
//           ) ??
//           `Artifact coverage is not comparable (${beforeState} before, ${afterState} after).`,
//       },
//     };
//   if (beforeSha256 === null || afterSha256 === null)
//     throw new TypeError("Captured artifact digest refinement failed");
//   if (beforeSha256 === afterSha256)
//     return { artifact, status: "unchanged", diff: null };
//   return {
//     artifact,
//     status: "changed",
//     diff: {
//       artifact,
//       status: "changed",
//       before_state: beforeState,
//       after_state: afterState,
//       before_sha256: beforeSha256,
//       after_sha256: afterSha256,
//       reason: null,
//     },
//   };
// };
//
// const joinIncomparableReasons = (
//   ...reasons: (string | undefined)[]
// ): string | undefined => {
//   const present = reasons.filter(
//     (reason): reason is string => reason !== undefined,
//   );
//   return present.length === 0 ? undefined : [...new Set(present)].join(" ");
// };
export const _l = 150;
