export const __stub = 1;
//     readonly pty_backend: "node-pty";
//     readonly started_at: string;
//     readonly completed_at: string;
//     readonly scenario: Readonly<Record<string, unknown>>;
//     readonly comparison_contract: Readonly<Record<string, unknown>>;
//     readonly full_scenario_sha256: string;
//     readonly comparison_contract_sha256: string;
//     /** Digest of the selected file sampled before spawn, when readable. */
//     readonly selected_executable_sha256: string | null;
//     /** Digest associated with the launch only when path metadata stayed stable across spawn. */
//     readonly executable_sha256: string | null;
//     readonly executable_identity: {
//       readonly state: "path_metadata_unchanged" | "unknown";
//       readonly reason: string | null;
//     };
//     readonly normalization_sha256: string;
//   };
//   readonly normalization: z.infer<typeof normalizationSchema>;
//   readonly frames: readonly TerminalFrame[];
//   readonly rendered_frames: readonly RenderedTerminalFrame[];
//   readonly interaction_events: readonly InteractionEvent[];
//   readonly exit: {
//     readonly code: number | null;
//     readonly signal: number | null;
//     readonly reason: "exited" | "timeout" | "idle_timeout";
//     readonly finalization?: ProcessCaptureFinalization | undefined;
//   };
//   readonly settlement: VerifiedProcessSettlement;
//   readonly process_samples: readonly ProcessSample[];
//   readonly filesystem_checkpoints: readonly FilesystemCheckpoint[];
//   /** Global observation order across independently recorded collections. */
//   readonly event_journal: readonly ProcessCaptureEventJournalEntry[];
//   readonly files_before: readonly FileState[];
//   readonly files_after: readonly FileState[];
//   readonly filesystem_effects: readonly FileEffect[];
//   readonly truncated: boolean;
//   /** Per-source accounting for the producer's actual capture coverage. */
//   readonly truncation_details: ProcessCaptureTruncationDetails;
//   readonly limitations: readonly string[];
//   readonly residual_unknowns: readonly {
//     readonly scope:
//       | "terminal"
//       | "interaction"
//       | "exit"
//       | "process"
//       | "filesystem"
//       | "cleanup"
//       | "network"
//       | "environment";
//     readonly reason: string;
//   }[];
//   readonly cleanup: {
//     readonly owned_process_group: "verified";
//     readonly temporary_root: "removed";
//     /** Unrelated processes whose ownership token the host could not expose. */
//     readonly unverified_processes?:
//       | readonly UnverifiedCleanupProcess[]
//       | undefined;
//   };
// }
//
// const fileStateShape = {
//   path: z.string(),
//   mode: z.number().int().nonnegative(),
//   size: z.number().int().nonnegative(),
// };
//
// /** An unrelated process left untouched because its ownership is unknown. */
// export interface UnverifiedCleanupProcess {
//   readonly pid: number;
//   readonly reason: string;
// }
//
// /** A resource cleanup result retained when observations cannot be verified. */
// export interface ProcessCaptureResourceCleanup {
//   readonly state: "cleaned" | "failed" | "unverified" | "not_required";
//   readonly reason: string | null;
//   readonly unverified_processes?:
//     | readonly UnverifiedCleanupProcess[]
//     | undefined;
// }
//
// export interface ProcessCaptureCleanupReport {
//   readonly owned_process_group: ProcessCaptureResourceCleanup;
//   readonly terminal_renderer: ProcessCaptureResourceCleanup;
//   readonly temporary_root: ProcessCaptureResourceCleanup;
// }
//
// /** One observation field that may be unavailable when capture completion fails. */
// export type PartialProcessObservationField<T> =
//   | { readonly state: "available"; readonly value: T }
//   | { readonly state: "unavailable"; readonly reason: string };
//
// /** Available and unavailable fields when a run never becomes a full capture. */
// export interface IncompleteProcessCaptureObservations {
//   readonly target_pid: PartialProcessObservationField<number>;
//   readonly frames: PartialProcessObservationField<readonly TerminalFrame[]>;
//   readonly rendered_frames: PartialProcessObservationField<
//     readonly RenderedTerminalFrame[]
//   >;
//   readonly interaction_events: PartialProcessObservationField<
//     readonly InteractionEvent[]
//   >;
//   readonly exit: PartialProcessObservationField<{
//     readonly code: number | null;
//     readonly signal: number | null;
//     readonly reason: "exited" | "timeout" | "idle_timeout" | "cancelled";
//     readonly finalization?: ProcessCaptureFinalization | undefined;
//   }>;
//   readonly finalization?:
//     | PartialProcessObservationField<ProcessCaptureFinalization>
//     | undefined;
//   readonly settlement: PartialProcessObservationField<{
//     readonly state: "quiesced" | "alive_at_deadline" | "unverifiable";
//     readonly elapsed_ms: number;
//   }>;
//   readonly process_samples: PartialProcessObservationField<
//     readonly ProcessSample[]
//   >;
//   readonly filesystem_snapshots: {
//     readonly before: PartialProcessObservationField<ProcessFilesystemSnapshot>;
//     readonly after: PartialProcessObservationField<ProcessFilesystemSnapshot>;
//   };
//   readonly event_journal: PartialProcessObservationField<
//     readonly ProcessCaptureEventJournalEntry[]
//   >;
//   readonly manifest: PartialProcessObservationField<
//     UnverifiedProcessCapture["manifest"]
//   >;
// }
//
// const fileStateSchema = z.discriminatedUnion("type", [
//   z.object({
//     ...fileStateShape,
//     type: z.literal("file"),
//     sha256: z
//       .string()
//       .regex(/^[a-f0-9]{64}$/u)
//       .nullable(),
//     symlink_target: z.null(),
//   }),
//   z.object({
//     ...fileStateShape,
//     type: z.literal("symlink"),
//     sha256: z.null(),
//     symlink_target: z.string(),
//   }),
//   z.object({
//     ...fileStateShape,
//     type: z.enum(["directory", "other"]),
//     sha256: z.null(),
//     symlink_target: z.null(),
//   }),
// ]);
// /** Canonical checkpoint facts retained even when capture completion fails. */
// export const processFilesystemSnapshotSchema = z.strictObject({
//   files: z.array(fileStateSchema),
//   truncated: z.boolean(),
//   completeRoots: z.array(z.string()),
//   coverage: filesystemCoverageSchema,
// });
// const fileEffectSchema = z.discriminatedUnion("status", [
//   z.object({
//     path: z.string(),
//     status: z.literal("created"),
//     before: z.null(),
//     after: fileStateSchema,
//   }),
//   z.object({
//     path: z.string(),
//     status: z.literal("deleted"),
//     before: fileStateSchema,
//     after: z.null(),
//   }),
//   z.object({
//     path: z.string(),
//     status: z.enum(["modified", "unchanged"]),
//     before: fileStateSchema,
//     after: fileStateSchema,
//   }),
//   z.object({
//     path: z.string(),
//     status: z.literal("unknown"),
//     before: fileStateSchema.nullable(),
//     after: fileStateSchema.nullable(),
//     reason: z.string().min(1),
//   }),
// ]);
// /** Exact serialized shape of a process capture. */
// const processSettlementSchema = z.discriminatedUnion("state", [
//   z.object({
//     state: z.literal("quiesced"),
//     elapsed_ms: z.number().int().nonnegative(),
//     cleanup_outcome: z.enum(["not_required", "failed"]),
//   }),
//   z.object({
//     state: z.enum(["alive_at_deadline", "unverifiable"]),
//     elapsed_ms: z.number().int().nonnegative(),
//     cleanup_outcome: z.enum(["cleaned", "failed"]),
//   }),
// ]);
//
// const unverifiedCleanupProcessesSchema = z.array(
//   z.strictObject({ pid: z.number().int().positive(), reason: z.string() }),
// );
//
export const _l = 206;
