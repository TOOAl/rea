export const __stub = 1;
// import type { BrowserScenarioCapture } from "./browserScenarioCapture.js";
// import type { BrowserScenarioStep } from "./browserScenarioCaptureValues.js";
// import { z } from "zod";
// import { digestCanonicalValue } from "./canonicalDigest.js";
// import {
//   actionState,
//   artifactEvidenceState,
//   captured,
//   eventEvidenceState,
//   eventFamilyCoverageReason,
//   prepareScenarioEvents,
//   networkContentCoverageReason,
//   screenshotProjection,
//   type CaptureState,
// } from "./browserScenarioDiffEvidence.js";
// import {
//   browserScenarioDiffSchema,
//   type BrowserScenarioAlignmentFailure,
//   type BrowserScenarioArtifactDiff,
//   type BrowserScenarioArtifactKind,
//   type BrowserScenarioDiff,
//   type BrowserScenarioEvidenceState,
//   type BrowserScenarioNormalizationRule,
//   type CompareBrowserScenariosInput,
// } from "./browserScenarioDiffValues.js";
// import {
//   commitBrowserScenarioNormalization,
//   digestNormalizedScenarioValue,
//   normalizeScenarioValue,
// } from "./browserScenarioNormalization.js";
//
// const scenarioEventsValueSchema = z.strictObject({
//   events: z.array(z.unknown()),
//   network_transactions: z.array(z.string()),
// });
//
// type ComparableArtifact = {
//   readonly artifact: BrowserScenarioArtifactKind;
// } & (
//   | {
//       readonly status: "unchanged" | "not_compared";
//       readonly diff: null;
//     }
//   | {
//       readonly status: "changed" | "unknown";
//       readonly diff: BrowserScenarioArtifactDiff;
//     }
// );
//
// interface ScenarioAlignment {
//   readonly before: ReadonlyMap<string, BrowserScenarioStep>;
//   readonly after: ReadonlyMap<string, BrowserScenarioStep>;
//   readonly orderedStepIds: readonly string[];
//   readonly beforeOnly: readonly string[];
//   readonly afterOnly: readonly string[];
//   readonly failures: readonly BrowserScenarioAlignmentFailure[];
// }
//
// interface AlignedStepComparison {
//   readonly steps: BrowserScenarioDiff["steps"];
//   readonly failures: readonly BrowserScenarioAlignmentFailure[];
//   readonly totalArtifactDiffs: number;
// }
//
// /** Compare scenario steps by stable step ID and apply only committed literal rules. */
// export const compareBrowserScenarios = (
//   input: CompareBrowserScenariosInput,
// ): BrowserScenarioDiff => {
//   const normalization = commitBrowserScenarioNormalization(input.normalization);
//   const beforeEvents = prepareScenarioEvents(
//     input.before_scenario,
//     normalization.rules,
//   );
//   const afterEvents = prepareScenarioEvents(
//     input.after_scenario,
//     normalization.rules,
//   );
//   const alignment = alignScenarioSteps(
//     input.before_scenario,
//     input.after_scenario,
//   );
//   const compared = compareAlignedSteps({
//     beforeCapture: input.before_scenario,
//     afterCapture: input.after_scenario,
//     alignment,
//     rules: normalization.rules,
//     beforeEvents,
//     afterEvents,
//   });
//   const failures = [...alignment.failures, ...compared.failures];
//   const alignmentStatus =
//     failures.length === 0
//       ? "aligned"
//       : compared.steps.length === 0
//         ? "failed"
//         : "partial";
//   const stepStatuses = compared.steps.map(({ status }) => status);
//   const equalityEligible =
//     input.before_scenario.completeness.equality_eligible &&
//     input.after_scenario.completeness.equality_eligible &&
//     alignmentStatus === "aligned";
//   const overallStatus = stepStatuses.includes("changed")
//     ? "changed"
//     : stepStatuses.includes("unknown") || !equalityEligible
//       ? "unknown"
//       : "unchanged";
//
//   return browserScenarioDiffSchema.parse({
//     comparison_kind: "browser_scenario",
//     overall_status: overallStatus,
//     normalization,
//     alignment: {
//       status: alignmentStatus,
//       aligned_steps: compared.steps.length,
//       before_only: alignment.beforeOnly,
//       after_only: alignment.afterOnly,
//       failures,
//     },
//     steps: compared.steps,
//     artifact_diffs: {
//       total: compared.totalArtifactDiffs,
//     },
//     limitations: [
//       "Steps align only by exact, unique step_id; missing, duplicate, or action-mismatched steps are reported and prevent an unchanged claim.",
//       "Only declared literal normalization rules are applied, in canonical rule_id order, to already-redacted durable capture fields.",
//       "Elapsed time, event sequence/index values and capture-local transaction IDs are excluded as volatile; network transactions are compared as an unordered collection in the step that sent their request; screenshot bytes are compared by content digest.",
//       "A changed status proves an observed normalized difference. Missing or truncated evidence, incompatible capture context, or alignment failure prevents an unchanged claim.",
//     ],
//   });
// };
//
// const alignScenarioSteps = (
//   beforeCapture: BrowserScenarioCapture,
//   afterCapture: BrowserScenarioCapture,
// ): ScenarioAlignment => {
//   const beforeDuplicates = duplicateStepIds(beforeCapture.steps);
//   const afterDuplicates = duplicateStepIds(afterCapture.steps);
//   const before = uniqueSteps(beforeCapture.steps, beforeDuplicates);
//   const after = uniqueSteps(afterCapture.steps, afterDuplicates);
//   const beforeOnly = [...before.keys()]
//     .filter((stepId) => !after.has(stepId))
//     .sort();
//   const afterOnly = [...after.keys()]
//     .filter((stepId) => !before.has(stepId))
//     .sort();
//   const failures: BrowserScenarioAlignmentFailure[] = [
//     ...duplicateFailures("before", beforeDuplicates),
//     ...duplicateFailures("after", afterDuplicates),
//     ...missingFailures("before", afterOnly),
//     ...missingFailures("after", beforeOnly),
//   ];
//   if (!captureContextsMatch(beforeCapture, afterCapture))
export const _l = 152;
