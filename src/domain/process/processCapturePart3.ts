export const __stub = 1;
// const processCaptureFinalizationSchema = z
//   .strictObject({
//     requested_ms: z.number().int().safe().positive(),
//     elapsed_ms: z.number().int().nonnegative().nullable(),
//     exit_code: z.number().int().nonnegative().nullable(),
//     signals: z
//       .array(
//         z.strictObject({
//           signal: z.enum(["SIGTERM", "SIGKILL"]),
//           sent_at_ms: z.number().int().nonnegative(),
//           delivery: z.enum([
//             "signaled",
//             "gone",
//             "identity-changed",
//             "unverified",
//           ]),
//           reason: z.string().min(1).optional(),
//         }),
//       )
//       .min(1),
//   })
//   .superRefine((finalization, context) => {
//     if (finalization.exit_code !== null && finalization.elapsed_ms === null)
//       context.addIssue({
//         code: "custom",
//         path: ["exit_code"],
//         message: "finalization exit_code requires an observed exit",
//       });
//     for (const [index, attempt] of finalization.signals.entries())
//       if (attempt.reason !== undefined && attempt.delivery !== "unverified")
//         context.addIssue({
//           code: "custom",
//           path: ["signals", index, "reason"],
//           message:
//             "finalization reason is only allowed for an unverified delivery",
//         });
//   });
//
// const processCaptureShapeSchema = z.strictObject({
//   manifest: z.strictObject({
//     rea_version: z.string().min(1),
//     provider_version: z.string().min(1),
//     platform: z.string().min(1),
//     architecture: z.string().min(1),
//     pty_backend: z.literal("node-pty"),
//     started_at: z.iso.datetime(),
//     completed_at: z.iso.datetime(),
//     scenario: z.record(z.string(), jsonValueSchema),
//     comparison_contract: z.record(z.string(), jsonValueSchema),
//     full_scenario_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//     comparison_contract_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//     selected_executable_sha256: z
//       .string()
//       .regex(/^[a-f0-9]{64}$/u)
//       .nullable(),
//     executable_sha256: z
//       .string()
//       .regex(/^[a-f0-9]{64}$/u)
//       .nullable(),
//     executable_identity: z.strictObject({
//       state: z.enum(["path_metadata_unchanged", "unknown"]),
//       reason: z.string().nullable(),
//     }),
//     normalization_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
//   }),
//   normalization: normalizationSchema,
//   frames: z.array(
//     z.object({
//       sequence: z.number().int().nonnegative(),
//       at_ms: z.number().int().nonnegative(),
//       data: z.string(),
//       raw_data: z.string().optional(),
//     }),
//   ),
//   rendered_frames: z.array(
//     z.object({
//       sequence: z.number().int().nonnegative(),
//       at_ms: z.number().int().nonnegative(),
//       columns: z.number().int().positive(),
//       rows: z.number().int().positive(),
//       cursor_x: z.number().int().nonnegative(),
//       cursor_y: z.number().int().nonnegative(),
//       active_buffer: z.enum(["normal", "alternate"]),
//       lines: z.array(z.string()),
//       serialized_state: z.string(),
//     }),
//   ),
//   interaction_events: z.array(
//     z.object({
//       sequence: z.number().int().nonnegative(),
//       scheduled_at_ms: z.number().int().nonnegative(),
//       dispatched_at_ms: z.number().int().nonnegative(),
//       type: z.enum(["input", "resize", "signal"]),
//       data: z.string(),
//       outcome: z.enum(["dispatched", "target_exited", "failed"]),
//     }),
//   ),
//   exit: z.object({
//     code: z.number().int().nullable(),
//     signal: z.number().int().nullable(),
//     reason: z.enum(["exited", "timeout", "idle_timeout"]),
//     finalization: processCaptureFinalizationSchema.optional(),
//   }),
//   settlement: z.discriminatedUnion("state", [
//     z.object({
//       state: z.literal("quiesced"),
//       elapsed_ms: z.number().int().nonnegative(),
//       cleanup_outcome: z.literal("not_required"),
//     }),
//     z.object({
//       state: z.enum(["alive_at_deadline", "unverifiable"]),
//       elapsed_ms: z.number().int().nonnegative(),
//       cleanup_outcome: z.enum(["cleaned", "failed"]),
//     }),
//   ]),
//   process_samples: z.array(
//     z.object({
//       at_ms: z.number().int().nonnegative(),
//       pid: z.number().int().positive(),
//       parent_pid: z.number().int().nonnegative(),
//       command: z.string(),
//       process_group_id: z.number().int().positive().nullable(),
//       session_id: z.number().int().nonnegative().nullable(),
//     }),
//   ),
//   filesystem_checkpoints: z.array(
//     z.object({
//       name: z.enum(["before", "after_settlement"]),
//       at_ms: z.number().int().nonnegative(),
//       files: z.array(fileStateSchema),
//       effects: z.array(fileEffectSchema),
//       truncated: z.boolean(),
//     }),
//   ),
//   event_journal: z.array(
//     z.object({
//       capture_order: z.number().int().nonnegative(),
//       collection: z.enum(PROCESS_CAPTURE_EVENT_COLLECTIONS),
//       index: z.number().int().nonnegative(),
//     }),
//   ),
//   files_before: z.array(fileStateSchema),
//   files_after: z.array(fileStateSchema),
//   filesystem_effects: z.array(fileEffectSchema),
//   truncated: z.boolean(),
//   truncation_details: processCaptureTruncationDetailsSchema,
//   limitations: z.array(z.string()),
//   residual_unknowns: z.array(
//     z.object({
//       scope: z.enum([
//         "terminal",
//         "interaction",
//         "exit",
//         "process",
//         "filesystem",
//         "cleanup",
//         "network",
//         "environment",
//       ]),
//       reason: z.string(),
//     }),
//   ),
//   cleanup: z.object({
//     owned_process_group: z.literal("verified"),
//     temporary_root: z.literal("removed"),
//     unverified_processes: unverifiedCleanupProcessesSchema.optional(),
//   }),
// });
//
// const processCleanupResourceSchema = z.strictObject({
//   state: z.enum(["cleaned", "failed", "unverified", "not_required"]),
//   reason: z.string().nullable(),
//   unverified_processes: unverifiedCleanupProcessesSchema.optional(),
// });
//
// const partialObservationFieldSchema = <Schema extends z.ZodType>(
//   value: Schema,
// ) =>
//   z.discriminatedUnion("state", [
//     z.strictObject({ state: z.literal("available"), value }),
//     z.strictObject({ state: z.literal("unavailable"), reason: z.string() }),
//   ]);
//
// const incompleteProcessCaptureObservationsSchema = z.strictObject({
//   target_pid: partialObservationFieldSchema(z.number().int().positive()),
//   frames: partialObservationFieldSchema(processCaptureShapeSchema.shape.frames),
//   rendered_frames: partialObservationFieldSchema(
//     processCaptureShapeSchema.shape.rendered_frames,
//   ),
//   interaction_events: partialObservationFieldSchema(
//     processCaptureShapeSchema.shape.interaction_events,
//   ),
//   exit: partialObservationFieldSchema(
//     z.strictObject({
//       code: z.number().int().nullable(),
//       signal: z.number().int().nullable(),
//       reason: z.enum(["exited", "timeout", "idle_timeout", "cancelled"]),
//       finalization: processCaptureFinalizationSchema.optional(),
//     }),
//   ),
//   finalization: partialObservationFieldSchema(
//     processCaptureFinalizationSchema,
//   ).optional(),
//   settlement: partialObservationFieldSchema(
//     z.strictObject({
//       state: z.enum(["quiesced", "alive_at_deadline", "unverifiable"]),
export const _l = 206;
