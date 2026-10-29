export const __stub = 1;
//       elapsed_ms: z.number().int().nonnegative(),
//     }),
//   ),
//   process_samples: partialObservationFieldSchema(
//     processCaptureShapeSchema.shape.process_samples,
//   ),
//   filesystem_snapshots: z.strictObject({
//     before: partialObservationFieldSchema(processFilesystemSnapshotSchema),
//     after: partialObservationFieldSchema(processFilesystemSnapshotSchema),
//   }),
//   event_journal: partialObservationFieldSchema(
//     processCaptureShapeSchema.shape.event_journal,
//   ),
//   manifest: partialObservationFieldSchema(
//     processCaptureShapeSchema.shape.manifest,
//   ),
// });
//
// const partialCleanupReportSchema = z.strictObject({
//   owned_process_group: processCleanupResourceSchema,
//   terminal_renderer: processCleanupResourceSchema,
//   temporary_root: processCleanupResourceSchema,
// });
// const partialObservationMetadataSchema = z.strictObject({
//   cleanup: partialCleanupReportSchema,
//   execution_failure: z.string().nullable(),
// });
// const completedCaptureObservationSchema = z.strictObject({
//   capture: processCaptureShapeSchema
//     .omit({ cleanup: true })
//     .extend({ settlement: processSettlementSchema }),
// });
// const incompleteCaptureObservationSchema = z.strictObject({
//   observations: incompleteProcessCaptureObservationsSchema,
// });
//
// /** Validated, non-comparable process observations attached to execution or cleanup errors. */
// export const partialProcessCaptureObservationSchema = z
//   .union([
//     completedCaptureObservationSchema.extend(
//       partialObservationMetadataSchema.shape,
//     ),
//     incompleteCaptureObservationSchema.extend(
//       partialObservationMetadataSchema.shape,
//     ),
//   ])
//   .superRefine((partial, context) => {
//     const cleanupIncomplete = Object.values(partial.cleanup).some(
//       ({ state }) => state === "failed" || state === "unverified",
//     );
//     if (!cleanupIncomplete && partial.execution_failure === null)
//       context.addIssue({
//         code: "custom",
//         path: ["execution_failure"],
//         message:
//           "partial observations require incomplete cleanup or an execution failure",
//       });
//
//     const observedExit =
//       "capture" in partial
//         ? partial.capture.exit
//         : partial.observations.exit.state === "available"
//           ? partial.observations.exit.value
//           : undefined;
//     const observedFinalization =
//       "observations" in partial &&
//       partial.observations.finalization?.state === "available"
//         ? partial.observations.finalization.value
//         : undefined;
//     const committedManifest =
//       "capture" in partial
//         ? partial.capture.manifest
//         : partial.observations.manifest.state === "available"
//           ? partial.observations.manifest.value
//           : undefined;
//     const manifestFinalizationIssue = finalizationManifestIssue(
//       committedManifest?.scenario,
//       committedManifest?.comparison_contract,
//     );
//     const exitFinalizationIssue =
//       manifestFinalizationIssue ??
//       (observedExit === undefined
//         ? undefined
//         : finalizationConsistencyIssue(
//             observedExit,
//             committedManifest?.scenario,
//             committedManifest?.comparison_contract,
//           ));
//     const incompleteFinalizationIssue =
//       manifestFinalizationIssue ??
//       (observedFinalization === undefined
//         ? undefined
//         : finalizationConsistencyIssue(
//             observedExit === undefined
//               ? undefined
//               : { reason: observedExit.reason, signal: observedExit.signal },
//             committedManifest?.scenario,
//             committedManifest?.comparison_contract,
//             { finalization: observedFinalization, allowNullElapsedMs: true },
//           ));
//     if (exitFinalizationIssue !== undefined)
//       context.addIssue({
//         code: "custom",
//         path: ["exit"],
//         message: exitFinalizationIssue,
//       });
//     if (incompleteFinalizationIssue !== undefined)
//       context.addIssue({
//         code: "custom",
//         path: ["finalization"],
//         message: incompleteFinalizationIssue,
//       });
//
//     const agreementIssue = finalizationAgreementIssue(
//       observedExit?.finalization,
//       observedFinalization,
//     );
//     if (agreementIssue !== undefined)
//       context.addIssue({
//         code: "custom",
//         path: ["finalization"],
//         message: agreementIssue,
//       });
//     if (
//       "observations" in partial &&
//       partial.observations.exit.state === "unavailable" &&
//       observedFinalization !== undefined &&
//       observedFinalization?.elapsed_ms !== null
//     )
//       context.addIssue({
//         code: "custom",
//         path: ["finalization"],
//         message:
//           "finalization elapsed_ms must be null when the exit observation is unavailable",
//       });
//
//     if ("observations" in partial) {
//       const { observations } = partial;
//       if (
//         ![
//           observations.frames,
//           observations.interaction_events,
//           observations.process_samples,
//           observations.filesystem_snapshots.before,
//           observations.event_journal,
//         ].some(({ state }) => state === "available")
//       )
//         context.addIssue({
//           code: "custom",
//           path: ["observations"],
//           message: "incomplete observations contain no collected evidence",
//         });
//       return;
//     }
//
//     const { capture } = partial;
//     const settlement =
//       capture.settlement.state === "quiesced"
//         ? {
//             ...capture.settlement,
//             cleanup_outcome: "not_required" as const,
//           }
//         : { ...capture.settlement, cleanup_outcome: "cleaned" as const };
//     const validationCapture: UnverifiedProcessCapture = {
//       ...capture,
//       settlement,
//       cleanup: {
//         owned_process_group: "verified",
//         temporary_root: "removed",
//       },
//     };
//     for (const issue of collectProcessCaptureIssues(validationCapture))
//       context.addIssue({
//         code: "custom",
//         path: ["capture", ...issue.path.split(".")],
//         message: issue.message,
//       });
//   });
//
// /** One collected payload: completed capture data or explicit unavailable fields. */
// export type PartialProcessCaptureObservation = z.infer<
//   typeof partialProcessCaptureObservationSchema
// >;
//
// /** Exact serialized shape plus all process-capture semantic invariants. */
// export const processCaptureSchema = processCaptureShapeSchema
//   .superRefine((capture, context) => {
//     if (capture.settlement.cleanup_outcome === "failed")
//       context.addIssue({
//         code: "custom",
//         path: ["settlement", "cleanup_outcome"],
//         message: "verified captures cannot contain failed cleanup",
//       });
//     for (const issue of collectProcessCaptureIssues(capture))
//       context.addIssue({
//         code: "custom",
//         path: issue.path.split("."),
//         message: issue.message,
//       });
//   })
//   .describe(
//     "The capture must preserve its canonical scenario, comparison, and normalization SHA-256 commitments; ordered capture timestamps and contiguous sequence numbers; before and final filesystem snapshots with truncation propagated; and exit-code consistency with deadline termination. The event journal is required; empty journals are valid. A non-empty journal must reference every captured observation exactly once with unique in-range references. These cross-field invariants are checked by REA after capture.",
//   );
export const _l = 203;
