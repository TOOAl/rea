export const __stub = 1;
// import { execFile } from "node:child_process";
// import { chmod, rm, writeFile } from "node:fs/promises";
// import { basename, dirname, extname, join } from "node:path";
// import { promisify } from "node:util";
//
// import {
//   HopperCancelledError,
//   HopperProcessError,
//   HopperStartError,
// } from "../domain/hopperErrors.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
// import { cleanupOwnedProcessGroup } from "../process/ProcessOwnership.js";
// import { execFileOutput } from "../process/ExecFileOutput.js";
// import {
//   type ProviderProcessLaunch,
//   spawnOwnedProviderProcess,
// } from "../process/ProviderProcess.js";
// import { waitForAbortableDelay } from "../process/ProviderDeadline.js";
// import {
//   selectLinuxPrivateDisplayStrategy,
//   type LinuxPrivateDisplayRunnableStrategy,
//   type LinuxPrivateDisplaySelection,
// } from "./LinuxPrivateDisplayProbe.js";
//
// import {
//   prepareHopperMachOImage,
//   type HopperMachOImage,
// } from "./HopperMachOImage.js";
//
// import {
//   acquireHopperTargetLease,
//   acquireLinuxHopperApplicationLease,
// } from "../process/HopperLease.js";
// import type { HopperTargetLease } from "../process/HopperLease.js";
// import { HOPPER_SHUTDOWN_TIMEOUT_MS } from "./HopperSessionValues.js";
// import { verifyMacHopperNativeHelper } from "./HopperMacPublisher.js";
// import { inspectLinuxHopperLauncher } from "../application/LinuxHopper.js";
// import { retryLinuxHopperPublisherCleanup } from "../application/LinuxHopperPublisher.js";
//
// const execFileAsync = promisify(execFile);
// const HOPPER_BACKGROUND_STARTUP_MS = 5_000;
//
// /** Coordinates for one private bridge session. */
// export interface BridgeSession {
//   readonly directory: string;
//   readonly socketPath: string;
//   readonly token: string;
//   readonly runId: string;
// }
//
// /** Process handle returned by a bridge launcher. */
// export type BridgeLaunch = {
//   /** Verified publisher and sealed native-helper identity; omission is unknown. */
//   readonly nativeHelperVerified?: true;
//   /** Only literal native-helper arguments support a pre-handoff denial conclusion. */
//   readonly authorizationDenialBeforeHandoff?: true;
//   /** Release application/target exclusivity only after verified document and process cleanup. */
//   readonly releaseLease?: () => Promise<void>;
//   /** Exact launch command retained in local ownership metadata. */
//   readonly launcherCommand?: string;
// } & (
//   | (ProviderProcessLaunch & {
//       readonly shutdownMode: "bridge-request";
//       readonly preparedImagePath?: string;
//       /** The owned helper may hand off to an external GUI application. */
//       readonly providerLifetime: "launcher-process" | "external-application";
//     })
//   | (Extract<ProviderProcessLaunch, { readonly ownsProcessLifetime: true }> & {
//       readonly shutdownMode: "process-cleanup";
//       readonly preparedImagePath?: string;
//       readonly providerLifetime: "launcher-process";
//       readonly cleanup: NonNullable<ProviderProcessLaunch["cleanup"]>;
//     })
// );
//
// /** Application-owned capability that starts the in-Hopper bridge. */
// export interface BridgeLauncher {
//   /** Retry owned pre-launch resources even when no application was started. */
//   cleanup?(): Promise<Result<null, ProviderCleanupError>>;
//   launch(
//     session: BridgeSession,
//     options?: { readonly signal?: AbortSignal },
//   ): Promise<
//     Result<
//       BridgeLaunch,
//       HopperStartError | HopperCancelledError | HopperProcessError
//     >
//   >;
// }
//
// interface SharedHopperApplicationLauncherOptions {
//   readonly environment: Readonly<NodeJS.ProcessEnv>;
//   readonly launcherPath: string;
//   readonly targetPath: string;
//   readonly targetKind: "executable" | "database";
//   readonly loaderArgs: readonly string[];
//   readonly bridgeScriptPath: string;
//   readonly preparedImage?: {
//     readonly image: HopperMachOImage;
//     readonly sourceSha256: string;
//   };
// }
//
// /** Explicit launcher contract; the Linux adapter verifies its pinned Hopper build before execution. */
// export type HopperApplicationLauncherOptions =
//   | (SharedHopperApplicationLauncherOptions & {
//       readonly launchMode: "native";
//       readonly demoHelperPath?: never;
//     })
//   | (SharedHopperApplicationLauncherOptions & {
//       readonly launchMode: "verified_linux_demo";
//       readonly demoHelperPath: string;
//     });
//
// export interface HopperApplicationLauncherDependencies {
//   readonly verifyNativeHelper?: typeof verifyMacHopperNativeHelper;
//   readonly verifyLinuxLauncher?: typeof inspectLinuxHopperLauncher;
//   readonly retryPublisherCleanup?: typeof retryLinuxHopperPublisherCleanup;
//   readonly platform?: NodeJS.Platform;
//   readonly acquireTargetLease?: typeof acquireHopperTargetLease;
//   readonly acquireApplicationLease?: typeof acquireLinuxHopperApplicationLease;
//   readonly selectPrivateDisplay?: (options: {
//     readonly environment: Readonly<NodeJS.ProcessEnv>;
//     readonly helperPath: string;
//     readonly signal?: AbortSignal;
//   }) => Promise<LinuxPrivateDisplaySelection>;
// }
//
// /**
//  * Launches Hopper through its documented CLI and injects only REA's owned bridge.
//  *
//  * Hopper's `hopper` helper internally issues an AppleScript `activate` command.
//  * Consequently, opening a target may bring Hopper to the foreground even though
//  * REA first asks macOS to start the application hidden and in the background.
//  * REA cannot reliably suppress that activation without replacing Hopper's
//  * supported launcher; callers must treat possible foreground UI as an upstream
//  * Hopper constraint, not as evidence that analysis failed.
//  *
//  * REA owns only the short-lived launcher helper's run-token-authenticated
//  * process group. It does not claim ownership of the Hopper GUI process that
//  * macOS LaunchServices may create or reuse.
//  */
// export class HopperApplicationLauncher implements BridgeLauncher {
//   constructor(
//     readonly options: HopperApplicationLauncherOptions,
//     readonly dependencies: HopperApplicationLauncherDependencies = {},
//   ) {}
//
//   async cleanup(): Promise<Result<null, ProviderCleanupError>> {
//     if (!usesLinuxDemo(this.options)) return ok(null);
//     try {
//       await (
//         this.dependencies.retryPublisherCleanup ??
//         retryLinuxHopperPublisherCleanup
export const _l = 156;
