export const __stub = 1;
//     failures.push({
//       code: "capture_context_mismatch",
//       step_id: null,
//       reason:
//         "Browser product/version or scenario origin scope differs between captures.",
//     });
//   return {
//     before,
//     after,
//     beforeOnly,
//     afterOnly,
//     failures,
//     orderedStepIds: beforeCapture.steps
//       .map(({ step_id }) => step_id)
//       .filter(
//         (stepId, index, values) =>
//           values.indexOf(stepId) === index &&
//           before.has(stepId) &&
//           after.has(stepId),
//       ),
//   };
// };
//
// interface CompareAlignedStepsInput {
//   readonly beforeCapture: BrowserScenarioCapture;
//   readonly afterCapture: BrowserScenarioCapture;
//   readonly alignment: ScenarioAlignment;
//   readonly rules: readonly BrowserScenarioNormalizationRule[];
//   readonly beforeEvents: ReturnType<typeof prepareScenarioEvents>;
//   readonly afterEvents: ReturnType<typeof prepareScenarioEvents>;
// }
//
// const compareAlignedSteps = (
//   input: CompareAlignedStepsInput,
// ): AlignedStepComparison => {
//   let totalArtifactDiffs = 0;
//   const steps: BrowserScenarioDiff["steps"] = [];
//   const failures: BrowserScenarioAlignmentFailure[] = [];
//   for (const stepId of input.alignment.orderedStepIds) {
//     const beforeStep = input.alignment.before.get(stepId);
//     const afterStep = input.alignment.after.get(stepId);
//     if (beforeStep === undefined || afterStep === undefined) continue;
//     if (beforeStep.action !== afterStep.action)
//       failures.push({
//         code: "action_mismatch",
//         step_id: stepId,
//         reason: `Aligned step action changed from ${beforeStep.action} to ${afterStep.action}.`,
//       });
//     const artifacts = compareStepArtifacts({
//       beforeCapture: input.beforeCapture,
//       beforeStep,
//       afterCapture: input.afterCapture,
//       afterStep,
//       rules: input.rules,
//       beforeEvents: input.beforeEvents,
//       afterEvents: input.afterEvents,
//     });
//     const reportable = artifacts.flatMap(({ diff }) =>
//       diff === null ? [] : [diff],
//     );
//     totalArtifactDiffs += reportable.length;
//     const statuses = artifacts.map(({ status }) => status);
//     steps.push({
//       step_id: stepId,
//       before_step_index: beforeStep.step_index,
//       after_step_index: afterStep.step_index,
//       before_action: beforeStep.action,
//       after_action: afterStep.action,
//       status: statuses.includes("changed")
//         ? "changed"
//         : statuses.includes("unknown")
//           ? "unknown"
//           : "unchanged",
//       artifact_diffs: reportable,
//     });
//   }
//   return { steps, failures, totalArtifactDiffs };
// };
//
// const duplicateStepIds = (
//   steps: readonly BrowserScenarioStep[],
// ): ReadonlySet<string> => {
//   const seen = new Set<string>();
//   const duplicates = new Set<string>();
//   for (const { step_id: stepId } of steps) {
//     if (seen.has(stepId)) duplicates.add(stepId);
//     seen.add(stepId);
//   }
//   return duplicates;
// };
//
// const uniqueSteps = (
//   steps: readonly BrowserScenarioStep[],
//   duplicates: ReadonlySet<string>,
// ): ReadonlyMap<string, BrowserScenarioStep> =>
//   new Map(
//     steps.flatMap((step) =>
//       duplicates.has(step.step_id) ? [] : [[step.step_id, step] as const],
//     ),
//   );
//
// const duplicateFailures = (
//   side: "before" | "after",
//   duplicates: ReadonlySet<string>,
// ): BrowserScenarioAlignmentFailure[] =>
//   [...duplicates].sort().map((stepId) => ({
//     code:
//       side === "before"
//         ? "duplicate_before_step_id"
//         : "duplicate_after_step_id",
//     step_id: stepId,
//     reason: `${side} capture contains duplicate step_id ${stepId}.`,
//   }));
//
// const missingFailures = (
//   side: "before" | "after",
//   stepIds: readonly string[],
// ): BrowserScenarioAlignmentFailure[] =>
//   stepIds.map((stepId) => ({
//     code: side === "before" ? "missing_before_step" : "missing_after_step",
//     step_id: stepId,
//     reason: `Step ${stepId} is missing from the ${side} capture.`,
//   }));
//
// const captureContextsMatch = (
//   before: BrowserScenarioCapture,
//   after: BrowserScenarioCapture,
// ): boolean =>
//   before.browser.product === after.browser.product &&
//   before.browser.version === after.browser.version &&
//   before.scenario.start_origin === after.scenario.start_origin;
//
// interface CompareStepArtifactsInput {
//   readonly beforeCapture: BrowserScenarioCapture;
//   readonly beforeStep: BrowserScenarioStep;
//   readonly afterCapture: BrowserScenarioCapture;
//   readonly afterStep: BrowserScenarioStep;
//   readonly rules: readonly BrowserScenarioNormalizationRule[];
//   readonly beforeEvents: ReturnType<typeof prepareScenarioEvents>;
//   readonly afterEvents: ReturnType<typeof prepareScenarioEvents>;
// }
//
// const compareStepArtifacts = (
//   input: CompareStepArtifactsInput,
// ): ComparableArtifact[] => {
//   const common = {
//     beforeStep: input.beforeStep,
//     afterStep: input.afterStep,
//     rules: input.rules,
//   };
//   return [
//     compareCapturedValues({
export const _l = 152;
