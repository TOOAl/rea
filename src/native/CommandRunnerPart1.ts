export const __stub = 1;
// import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
// import { createHash, randomUUID } from "node:crypto";
// import { createReadStream } from "node:fs";
// import { realpath } from "node:fs/promises";
//
// import { err, ok, type Result } from "../domain/result.js";
// import { DarwinProcessOwnershipInspectionError } from "../process/DarwinProcessRunTokenReader.js";
// import {
//   OwnedCommandFailure,
//   runOwnedCommand,
// } from "../process/OwnedCommand.js";
// import type {
//   OwnedProviderProcessSpawnOptions,
//   ProviderProcessSnapshot,
//   ProviderProcessSupervisor,
//   SpawnedOwnedProviderProcess,
// } from "../process/ProviderProcess.js";
// import { boundedUtf8Text } from "../process/boundedUtf8Text.js";
//
// /** Maximum wall-clock duration for one native command. */
// export const NATIVE_COMMAND_TIMEOUT_MS = 60_000;
// /** Retain complete command output up to a bounded aggregate size. */
// export const NATIVE_COMMAND_OUTPUT_BUDGET_BYTES = 64 * 1024 * 1024;
// /**
//  * Failure diagnostics keep only an excerpt of each stream. Successful
//  * analysis needs complete output, but a failed command's error would
//  * otherwise repeat up to the whole output budget to the caller.
//  */
// export const NATIVE_FAILURE_DIAGNOSTIC_BYTES = 64 * 1024;
//
// export interface NativeCommandCapture {
//   readonly tool: string;
//   readonly executable: string;
//   readonly executableSha256: string;
//   readonly toolVersion: string | null;
//   readonly versionReason: string | null;
//   readonly arguments: readonly string[];
//   readonly stdout: string;
//   readonly stderr: string;
//   readonly stdoutBytes: number;
//   readonly stderrBytes: number;
//   readonly exitCode: number | null;
//   readonly signal: string | null;
// }
//
// /** Native command failure with retained partial output and cleanup status. */
// export class NativeCommandFailure extends Error {
//   readonly cleanupOwner: ProviderProcessSupervisor | undefined;
//   readonly cleanupFailures: readonly NativeCommandCleanupFailure[];
//   readonly detail: string | null;
//
//   constructor(
//     readonly tool: string,
//     readonly reason:
//       | "unavailable"
//       | "cancelled"
//       | "timeout"
//       | "output-limit"
//       | "nonzero-exit"
//       | "io",
//     readonly exitCode: number | null = null,
//     options?: NativeCommandFailureOptions,
//     readonly capture: NativeCommandFailureCapture | null = null,
//     readonly cleanupFailure: string | null = null,
//     readonly cleanupResources: readonly string[] = [],
//   ) {
//     super(`Native command ${tool} failed: ${reason}`, options);
//     this.cleanupOwner = options?.cleanupOwner;
//     this.cleanupFailures = options?.cleanupFailures ?? [];
//     this.detail = options?.detail ?? null;
//   }
// }
//
// /** Named cleanup ownership carried alongside the ordinary error cause. */
// export interface NativeCommandFailureOptions extends ErrorOptions {
//   /** Typed owner retained when command process cleanup was incomplete. */
//   readonly cleanupOwner?: ProviderProcessSupervisor;
//   /** All owners still incomplete after a preflight retry blocked this command. */
//   readonly cleanupFailures?: readonly NativeCommandCleanupFailure[];
//   /** Host-side reason the command could not be supervised, such as a missing ownership helper compiler. */
//   readonly detail?: string;
// }
//
// /** One failed cleanup attempt; the runner retains `owner` until it is verified stopped. */
// export interface NativeCommandCleanupFailure {
//   readonly owner: ProviderProcessSupervisor;
//   readonly reason: string;
//   readonly resources: readonly string[];
// }
//
// /** Partial output and lifecycle details retained when a native command fails. */
// export interface NativeCommandFailureCapture {
//   readonly stdout: string;
//   readonly stderr: string;
//   readonly stdoutBytes: number;
//   readonly stderrBytes: number;
//   readonly exitCode: number | null;
//   readonly signal: string | null;
//   readonly truncated: boolean;
// }
//
// /** Cancellation and exit handling for one allowlisted native command. */
// export interface NativeCommandOptions {
//   readonly signal?: AbortSignal;
//   readonly acceptNonZero?: boolean;
// }
//
// export interface NativeCommandRunner {
//   run(
//     tool: string,
//     arguments_: readonly string[],
//     options: NativeCommandOptions,
//   ): Promise<Result<NativeCommandCapture, NativeCommandFailure>>;
//   /** Retry only owners from completed commands whose cleanup was incomplete. */
//   retryCleanup?(): Promise<readonly NativeCommandCleanupFailure[]>;
// }
//
// /** Optional launch seam for production-boundary lifecycle verification. */
// export type NativeCommandLauncher = (
//   options: OwnedProviderProcessSpawnOptions,
// ) => Promise<SpawnedOwnedProviderProcess>;
//
// /** Resolve one allowlisted native tool to an immutable executable identity. */
// export type NativeToolResolver = (
//   tool: string,
//   signal?: AbortSignal,
//   launcher?: NativeCommandLauncher,
// ) => Promise<Result<ResolvedTool, NativeCommandFailure>>;
//
// /** Run allowlisted Xcode tools directly without a shell. */
// export class XcrunCommandRunner implements NativeCommandRunner {
export const _l = 131;
