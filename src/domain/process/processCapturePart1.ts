export const __stub = 1;
// import { z } from "zod";
// import { jsonValueSchema } from "../jsonValue.js";
//
// import { normalizationSchema } from "./processScenario.js";
// import {
//   collectProcessCaptureIssues,
//   finalizationAgreementIssue,
//   finalizationConsistencyIssue,
//   finalizationManifestIssue,
// } from "./processCaptureValidation.js";
// import {
//   filesystemCoverageSchema,
//   processCaptureTruncationDetailsSchema,
//   type FilesystemCoverage,
//   type ProcessCaptureTruncationDetails,
// } from "./processCaptureCoverage.js";
//
// /** Normalized raw PTY chunk, preserving transport-level output differences. */
// export interface TerminalFrame {
//   readonly sequence: number;
//   readonly at_ms: number;
//   readonly data: string;
//   /** Original PTY text when normalization changed it; older captures may omit it. */
//   readonly raw_data?: string | undefined;
// }
//
// /** Serialized terminal state after interpreting control and resize sequences. */
// export interface RenderedTerminalFrame {
//   readonly sequence: number;
//   readonly at_ms: number;
//   readonly columns: number;
//   readonly rows: number;
//   readonly cursor_x: number;
//   readonly cursor_y: number;
//   readonly active_buffer: "normal" | "alternate";
//   readonly lines: readonly string[];
//   readonly serialized_state: string;
// }
//
// /** Scheduled terminal interaction with its observed dispatch outcome. */
// export interface InteractionEvent {
//   readonly sequence: number;
//   readonly scheduled_at_ms: number;
//   readonly dispatched_at_ms: number;
//   readonly type: "input" | "resize" | "signal";
//   readonly data: string;
//   readonly outcome: "dispatched" | "target_exited" | "failed";
// }
//
// /** Observed finalization attempts after a deadline fired. */
// export interface ProcessCaptureFinalization {
//   readonly requested_ms: number;
//   readonly elapsed_ms: number | null;
//   /** Code the PTY reported for an exit not caused by a signal; otherwise null. */
//   readonly exit_code: number | null;
//   readonly signals: readonly {
//     readonly signal: "SIGTERM" | "SIGKILL";
//     readonly sent_at_ms: number;
//     readonly delivery: "signaled" | "gone" | "identity-changed" | "unverified";
//     /** Why delivery could not be verified; present only for unverified attempts. */
//     readonly reason?: string | undefined;
//   }[];
// }
//
// /** One filesystem state used for before/after comparison. */
// interface FileStateIdentity {
//   readonly path: string;
//   readonly mode: number;
//   readonly size: number;
// }
//
// export type FileState = FileStateIdentity &
//   (
//     | {
//         readonly type: "file";
//         readonly sha256: string | null;
//         readonly symlink_target: null;
//       }
//     | {
//         readonly type: "symlink";
//         readonly sha256: null;
//         readonly symlink_target: string;
//       }
//     | {
//         readonly type: "directory" | "other";
//         readonly sha256: null;
//         readonly symlink_target: null;
//       }
//   );
//
// /** Complete metadata returned for one root-aliased filesystem checkpoint. */
// export interface ProcessFilesystemSnapshot {
//   readonly files: readonly FileState[];
//   readonly truncated: boolean;
//   /** Root aliases whose path enumeration was exhausted, regardless of hash coverage. */
//   readonly completeRoots: readonly string[];
//   readonly coverage: FilesystemCoverage;
// }
//
// interface FileEffectIdentity {
//   readonly path: string;
// }
//
// type FileEffect = FileEffectIdentity &
//   (
//     | {
//         readonly status: "created";
//         readonly before: null;
//         readonly after: FileState;
//       }
//     | {
//         readonly status: "deleted";
//         readonly before: FileState;
//         readonly after: null;
//       }
//     | {
//         readonly status: "modified" | "unchanged";
//         readonly before: FileState;
//         readonly after: FileState;
//       }
//     | {
//         readonly status: "unknown";
//         readonly before: FileState | null;
//         readonly after: FileState | null;
//         readonly reason: string;
//       }
//   );
//
// /** A sampled owned-process observation; sampling cannot prove syscall completeness. */
// export interface ProcessSample {
//   readonly at_ms: number;
//   readonly pid: number;
//   readonly parent_pid: number;
//   readonly command: string;
//   readonly process_group_id: number | null;
//   readonly session_id: number | null;
// }
//
// /** Initial or final filesystem snapshot selected for observation. */
// export interface FilesystemCheckpoint {
//   readonly name: string;
//   readonly at_ms: number;
//   readonly files: readonly FileState[];
//   readonly effects: readonly FileEffect[];
//   readonly truncated: boolean;
// }
//
// /** Capture collection whose members participate in global observation order. */
// export const PROCESS_CAPTURE_EVENT_COLLECTIONS = [
//   "frames",
//   "rendered_frames",
//   "interaction_events",
//   "lifecycle",
//   "process_samples",
//   "filesystem_checkpoints",
// ] as const;
//
// export type ProcessCaptureEventCollection =
//   (typeof PROCESS_CAPTURE_EVENT_COLLECTIONS)[number];
//
// /** One reference from global observation order into a capture collection. */
// export interface ProcessCaptureEventJournalEntry {
//   readonly capture_order: number;
//   readonly collection: ProcessCaptureEventCollection;
//   readonly index: number;
// }
//
// /** Shared observation callback used by every process-capture producer. */
// export type RecordProcessCaptureEvent = (
//   collection: ProcessCaptureEventCollection,
//   index: number,
// ) => void;
//
// /** Observed process-tree settlement and the cleanup required by that state. */
// export type ProcessSettlement =
//   | VerifiedProcessSettlement
//   | {
//       readonly state: "quiesced";
//       readonly elapsed_ms: number;
//       readonly cleanup_outcome: "failed";
//     };
//
// export type VerifiedProcessSettlement =
//   | {
//       readonly state: "quiesced";
//       readonly elapsed_ms: number;
//       readonly cleanup_outcome: "not_required";
//     }
//   | {
//       readonly state: "alive_at_deadline" | "unverifiable";
//       readonly elapsed_ms: number;
//       readonly cleanup_outcome: "cleaned" | "failed";
//     };
//
// /**
//  * Process capture observation set.
//  *
//  * `truncated` and `residual_unknowns` are semantic evidence: consumers must not
//  * infer equivalence from matching bounded observations when either is present.
//  */
// export interface UnverifiedProcessCapture {
//   readonly manifest: {
//     readonly rea_version: string;
//     readonly provider_version: string;
//     readonly platform: string;
//     readonly architecture: string;
export const _l = 206;
