export const __stub = 1;
//       ...common,
//       artifact: "action_state",
//       before: captured(actionState(input.beforeStep)),
//       after: captured(actionState(input.afterStep)),
//     }),
//     compareCapturedValues({
//       ...common,
//       artifact: "screenshot",
//       before: input.beforeStep.artifacts.screenshot,
//       after: input.afterStep.artifacts.screenshot,
//       project: screenshotProjection,
//     }),
//     compareCapturedValues({
//       ...common,
//       artifact: "dom",
//       before: input.beforeStep.artifacts.dom,
//       after: input.afterStep.artifacts.dom,
//       project: ({ text }) => text,
//     }),
//     compareCapturedValues({
//       ...common,
//       artifact: "accessibility",
//       before: input.beforeStep.artifacts.accessibility,
//       after: input.afterStep.artifacts.accessibility,
//       project: ({ text }) => text,
//     }),
//     compareCapturedValues({
//       ...common,
//       artifact: "url",
//       before: input.beforeStep.artifacts.url,
//       after: input.afterStep.artifacts.url,
//     }),
//     compareCapturedValues({
//       ...common,
//       artifact: "history",
//       before: input.beforeStep.artifacts.history,
//       after: input.afterStep.artifacts.history,
//     }),
//     compareCapturedValues({
//       ...common,
//       artifact: "storage",
//       before: input.beforeStep.artifacts.storage,
//       after: input.afterStep.artifacts.storage,
//     }),
//     compareScenarioEvents({
//       ...common,
//       artifact: "events",
//       before: captured(input.beforeEvents.forStep(input.beforeStep.step_index)),
//       after: captured(input.afterEvents.forStep(input.afterStep.step_index)),
//       beforeState: eventEvidenceState(input.beforeCapture, input.beforeStep),
//       afterState: eventEvidenceState(input.afterCapture, input.afterStep),
//       incomparableReason: eventCoverageReason(
//         input.beforeCapture,
//         input.afterCapture,
//         input.beforeEvents.coverageReason,
//         input.afterEvents.coverageReason,
//       ),
//       familyIncomparableReason: eventFamilyCoverageReason(
//         input.beforeCapture,
//         input.afterCapture,
//       ),
//     }),
//   ];
// };
//
// const compareScenarioEvents = (
//   input: CompareCapturedValuesInput<{
//     readonly events: readonly unknown[];
//     readonly network_transactions: readonly string[];
//   }>,
// ): ComparableArtifact => {
//   const beforeState =
//     input.beforeState ??
//     artifactEvidenceState(input.artifact, input.before, input.beforeStep);
//   const afterState =
//     input.afterState ??
//     artifactEvidenceState(input.artifact, input.after, input.afterStep);
//   if (beforeState === "not_requested" && afterState === "not_requested")
//     return { artifact: input.artifact, status: "not_compared", diff: null };
//   const beforeValue =
//     input.before.state === "captured" ? input.before.value : undefined;
//   const afterValue =
//     input.after.state === "captured" ? input.after.value : undefined;
//   const isCaptured =
//     beforeState === "captured" &&
//     afterState === "captured" &&
//     beforeValue !== undefined &&
//     afterValue !== undefined;
//   const ordinaryBeforeDigest =
//     beforeValue === undefined
//       ? null
//       : digestCanonicalValue(
//           normalizeScenarioValue(beforeValue.events, "events", input.rules),
//           "Browser scenario",
//         );
//   const ordinaryAfterDigest =
//     afterValue === undefined
//       ? null
//       : digestCanonicalValue(
//           normalizeScenarioValue(afterValue.events, "events", input.rules),
//           "Browser scenario",
//         );
//   const beforeSha256 =
//     beforeState === "captured" && beforeValue !== undefined
//       ? digestScenarioEvents(beforeValue, ordinaryBeforeDigest)
//       : null;
//   const afterSha256 =
//     afterState === "captured" && afterValue !== undefined
//       ? digestScenarioEvents(afterValue, ordinaryAfterDigest)
//       : null;
//   const changedOrdinaryEvents =
//     isCaptured && ordinaryBeforeDigest !== ordinaryAfterDigest;
//   if (changedOrdinaryEvents && input.familyIncomparableReason === undefined)
//     return {
//       artifact: input.artifact,
//       status: "changed",
//       diff: {
//         artifact: input.artifact,
//         status: "changed",
//         before_state: beforeState,
//         after_state: afterState,
//         before_sha256: beforeSha256,
//         after_sha256: afterSha256,
//         reason: input.incomparableReason ?? null,
//       },
//     };
//   if (
//     !isCaptured ||
//     input.incomparableReason !== undefined ||
//     input.familyIncomparableReason !== undefined
//   )
//     return {
//       artifact: input.artifact,
//       status: "unknown",
//       diff: {
//         artifact: input.artifact,
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
//     throw new TypeError("Captured event digest refinement failed");
//   if (beforeSha256 === afterSha256)
export const _l = 152;
