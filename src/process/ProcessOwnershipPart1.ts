export const __stub = 1;
// import { execFile } from "node:child_process";
// import { promisify } from "node:util";
//
// import {
//   errorMessage,
//   systemProcessOwnershipHost as systemHost,
// } from "./ProcessOwnershipObservation.js";
// import { launcherIdentityFailure } from "./ProcessOwnershipIdentity.js";
// import { descendantsOf, liveProcesses } from "./ProcessOwnershipProcessTree.js";
// import { readProcessRunTokens } from "./ProcessRunTokenObservations.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
//
// const execFileAsync = promisify(execFile);
//
// /** Identity proof required before REA may signal an owned process group. */
// export interface OwnedProcessGroup {
//   readonly runId: string;
//   readonly leaderPid: number;
//   readonly processGroupId: number;
//   /** Expected launcher identity, checked only while the leader exists. */
//   readonly expectedCommand?: string;
//   /** Expected launcher parent, checked only while the leader exists. */
//   readonly expectedParentPid?: number;
//   /** Scan all live processes for this run token during cleanup. */
//   readonly sweepTokenOwnedProcesses?: boolean;
//   /** Prelaunch process identities for this capture; absent on generic callers. */
//   readonly captureBaseline?: ProcessOwnershipBaseline;
//   /**
//    * Groups observed in capture samples. Observation adds cleanup candidates but
//    * does not authorize signaling; every live member still needs token proof.
//    */
//   readonly sampledProcessGroupIds?: readonly number[];
// }
//
// /** Capture-local baseline; null means the PID identity could not be established. */
// export type ProcessOwnershipBaseline = readonly {
//   readonly pid: number;
//   readonly identity: string | null;
// }[];
//
// /** One entry from an operating-system process-table snapshot. */
// export interface ProcessTableEntry {
//   readonly pid: number;
//   readonly parentPid: number;
//   readonly processGroupId: number;
//   /** Effective owner when the process table reports it. */
//   readonly uid?: number;
//   readonly state: string;
//   readonly command: string;
// }
//
// /** Native process start identity; unavailable identities must never be skipped. */
// export type ProcessIdentityObservation =
//   | { readonly state: "readable"; readonly identity: string }
//   | { readonly state: "unavailable"; readonly reason: string };
//
// /** Token-verified process lineage retained for one owned provider run. */
// export interface OwnedProcessLineage {
//   readonly runId: string;
//   readonly launcherPid: number;
//   readonly launcherParentPid: number;
//   readonly processGroupId: number;
//   readonly descendants: readonly {
//     readonly pid: number;
//     readonly parentPid: number;
//     readonly processGroupId: number;
//   }[];
// }
//
// /** Result of observing owned lineage without signaling any process. */
// export type ProcessLineageObservation =
//   | {
//       readonly status: "verified";
//       readonly observedAt: string;
//       readonly lineage: OwnedProcessLineage;
//     }
//   | {
//       readonly status: "unavailable";
//       readonly observedAt: string;
//       readonly runId: string;
//       readonly launcherPid: number;
//       readonly processGroupId: number;
//       readonly reason: string;
//     };
//
// /** Narrow operating-system seam used to inspect processes and signal groups. */
// export interface ProcessOwnershipHost {
//   readonly platform?: NodeJS.Platform;
//   /** Prepare required native identity inspection before launching a child. */
//   prepare?(signal?: AbortSignal): Promise<void>;
//   /** Release owned native inspection helpers and their temporary files. */
//   close?(): Promise<void>;
//   /** List current processes; startup inspection may be cancelled by the caller. */
//   listProcesses(signal?: AbortSignal): Promise<readonly ProcessTableEntry[]>;
//   environment(
//     pid: number,
//     signal?: AbortSignal,
//   ): Promise<Readonly<Record<string, string>>>;
//   /** Read only run-token values in one host operation when the OS supports it. */
//   runTokens?(
//     processes: readonly ProcessTableEntry[],
//     signal?: AbortSignal,
//   ): Promise<ReadonlyMap<number, ProcessRunTokenObservation>>;
//   /** Read stable identities; omit the signal during cleanup so it can finish. */
//   processIdentities?(
//     processes: readonly ProcessTableEntry[],
//     signal?: AbortSignal,
//   ): Promise<ReadonlyMap<number, ProcessIdentityObservation>>;
//   /** Snapshot identities before launch, honoring startup cancellation. */
//   captureBaseline?(signal?: AbortSignal): Promise<ProcessOwnershipBaseline>;
//   signalGroup(processGroupId: number, signal: NodeJS.Signals): void;
// }
//
// /** Whether one live process exposed its ownership token to the host. */
// export type ProcessRunTokenObservation =
//   | { readonly state: "readable"; readonly runId: string | undefined }
//   | { readonly state: "unavailable"; readonly reason: string };
//
// /** Narrow Windows P0 seam for bounded process-tree termination. */
// export interface WindowsProcessTreeHost {
//   terminateTree(rootPid: number): Promise<"terminated" | "missing">;
// }
//
// /** Per-member reason that token-verified cleanup failed closed. */
// interface ProcessOwnershipValidationFailure {
//   readonly pid: number;
//   readonly reason:
//     | "environment-unreadable"
//     | "run-token-mismatch"
//     | "process-identity-unavailable";
//   readonly diagnostic?: string;
// }
//
// /**
//  * One live process the ownership sweep could not attribute or exonerate.
//  * Recorded as evidence instead of failing the capture: the process is not
//  * related to the owned tree, so cleanup cannot act on it and the operating
//  * system withheld or removed its token (for example, macOS strips the
//  * environment of Apple platform binaries, and foreign-uid processes return
//  * EINVAL for KERN_PROCARGS2).
//  */
// export interface OwnershipSweepUnverifiedProcess {
//   readonly pid: number;
//   readonly diagnostic: string;
// }
//
// /** Capture-owned process structures used to classify sweep candidates. */
// export interface OwnershipSweepRelation {
//   readonly leaderPid: number;
//   readonly processGroupId: number;
//   readonly sampledProcessGroupIds?: readonly number[];
// }
//
// /** Cleanup outcome with per-member diagnostics when ownership is uncertain. */
// export type ProcessCleanupResult =
//   | {
//       readonly cleaned: true;
//       readonly signaled: boolean;
//       readonly unverified?: readonly OwnershipSweepUnverifiedProcess[];
//     }
//   | ProcessCleanupFailure;
//
// /** Retained verification failures for one cleanup attempt, without additional signaling authority. */
// export interface ProcessCleanupFailure {
//   readonly cleaned: false;
//   readonly reason: string;
//   readonly failures?: readonly ProcessOwnershipValidationFailure[];
//   readonly unverified?: readonly OwnershipSweepUnverifiedProcess[];
// }
//
// /** Token-verified liveness result used by post-root-exit settlement. */
// export type ProcessGroupObservation =
//   | { readonly state: "empty" }
//   | { readonly state: "alive" }
//   | { readonly state: "unverifiable"; readonly reason: string };
//
// /**
//  * Terminate one Windows process tree through the platform utility.
//  *
//  * This is a bounded P0 cleanup mechanism, not Job Object ownership proof. The
//  * caller-visible Windows capability report remains unavailable until a native
//  * authority verifies Job Object creation, membership, and cleanup semantics.
//  */
// export const cleanupWindowsProcessTree = async (
//   rootPid: number,
//   host: WindowsProcessTreeHost = systemWindowsProcessTreeHost,
// ): Promise<ProcessCleanupResult> => {
//   if (!Number.isSafeInteger(rootPid) || rootPid <= 0)
//     return { cleaned: false, reason: "Windows process-tree PID is invalid" };
//   try {
//     const result = await host.terminateTree(rootPid);
//     return { cleaned: true, signaled: result === "terminated" };
//   } catch (cause: unknown) {
//     return {
//       cleaned: false,
//       reason: `Windows process-tree termination failed for PID ${String(rootPid)}: ${errorMessage(cause)}`,
//     };
//   }
// };
//
// const systemWindowsProcessTreeHost: WindowsProcessTreeHost = {
//   async terminateTree(rootPid) {
//     try {
//       await execFileAsync(
//         "taskkill.exe",
//         ["/pid", String(rootPid), "/t", "/f"],
//         { windowsHide: true, timeout: 5_000 },
//       );
//       return "terminated";
//     } catch (cause: unknown) {
//       if (
//         cause instanceof Error &&
//         "code" in cause &&
//         (cause.code === 128 || cause.code === "ESRCH")
//       )
//         return "missing";
//       throw cause;
//     }
//   },
// };
//
// /** Read the capture run token currently exposed by one live process. */
// export const readProcessRunId = async (
//   pid: number,
//   host: ProcessOwnershipHost = systemHost,
//   signal?: AbortSignal,
// ): Promise<string | undefined> =>
//   (await host.environment(pid, signal)).REA_PROCESS_RUN_ID;
//
// /** Keep unrelated-process uncertainty attached to every outcome of this cleanup attempt. */
// const withUnverifiedObservations = (
//   result: ProcessCleanupFailure,
//   unverified: readonly OwnershipSweepUnverifiedProcess[],
// ): ProcessCleanupFailure =>
//   unverified.length === 0 || (result.unverified?.length ?? 0) > 0
//     ? result
//     : { ...result, unverified };
//
// /** Token-validate every rooted POSIX process group before signaling any. */
// export const cleanupOwnedProcessGroup = async (
//   ownership: OwnedProcessGroup,
//   host: ProcessOwnershipHost = systemHost,
// ): Promise<ProcessCleanupResult> => {
//   const processTable = await readLiveProcessTable(host);
//   if (!processTable.available)
//     return {
//       cleaned: false,
//       reason: `process table could not be inspected: ${processTable.reason}`,
//     };
//   const plan = await createOwnedCleanupPlan(
//     ownership,
//     processTable.processes,
//     host,
//   );
//   if ("cleaned" in plan) return plan;
//   let signaled = false;
//   for (const processGroupId of plan.signalOrder) {
//     const revalidation = await revalidateOwnedProcessGroup(
//       processGroupId,
//       ownership,
//       host,
//       plan.tokenOwnedIdentities,
//     );
//     if ("cleaned" in revalidation) {
//       if (!revalidation.cleaned)
//         return withUnverifiedObservations(revalidation, plan.unverified);
//       return {
//         ...revalidation,
//         ...(revalidation.unverified?.length || plan.unverified.length === 0
//           ? {}
//           : { unverified: plan.unverified }),
//       };
//     }
//     if (revalidation.empty) continue;
//     try {
//       host.signalGroup(processGroupId, "SIGKILL");
//       signaled = true;
//     } catch (cause: unknown) {
//       const code =
//         cause instanceof Error && "code" in cause ? cause.code : undefined;
export const _l = 280;
