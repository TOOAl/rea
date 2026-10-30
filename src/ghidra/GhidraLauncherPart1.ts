export const __stub = 1;
// import { parseGhidraJavaProperties } from "./GhidraJavaProperties.js";
// import { GHIDRA_BRIDGE_SOURCES } from "./GhidraBridgeSources.js";
// import {
//   snapshotGhidraAnalysisSeeds,
//   type GhidraSeedCommitment,
// } from "./GhidraAnalysisSeeds.js";
// import type { GhidraLanguageOverride } from "../config/ghidraLanguageOverride.js";
// import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
// import { mkdir, readFile, realpath } from "node:fs/promises";
// import { basename, dirname, join, posix, win32 } from "node:path";
//
// import writeFileAtomic from "write-file-atomic";
//
// import { windowsPrivateRuntime } from "../windows/WindowsPrivateRuntime.js";
// import {
//   quoteWindowsBatchToken,
//   windowsBatchCommand,
//   WindowsBatchCommandError,
// } from "../process/WindowsBatchCommand.js";
//
// import { AnalysisCancelledError } from "../domain/analysisErrorCore.js";
// import { err, ok, type Result } from "../domain/result.js";
// import type { AnalysisCapturedOutput } from "../domain/analysisErrorBase.js";
// import { execFileOutputFailure } from "../process/ExecFileOutput.js";
// import { boundedUtf8Text } from "../process/boundedUtf8Text.js";
// import { redactCapturedTransportCredential } from "../process/ProviderDiagnosticRedaction.js";
// import {
//   cleanupOwnedProcessGroup,
//   cleanupWindowsProcessTree,
//   type ProcessCleanupResult,
// } from "../process/ProcessOwnership.js";
// import {
//   type ProviderProcessLaunch,
//   type SpawnedOwnedProviderProcess,
//   spawnOwnedProviderProcess,
// } from "../process/ProviderProcess.js";
// import { ghidraJavaEnvironment } from "./GhidraInstallation.js";
// import { ghidraJavaLaunch } from "./GhidraJavaLaunch.js";
// import type { GhidraTransportKind } from "./GhidraTransport.js";
// import {
//   snapshotGhidraExtensions,
//   type GhidraExtension,
// } from "./extensions/GhidraExtensions.js";
//
// import {
//   inspectGhidraPspExtension,
//   type GhidraPspExtension,
// } from "./GhidraPspExtension.js";
//
// /** Private paths and identity material for one headless Ghidra import. */
// export interface GhidraLaunchSession {
//   readonly runtimeRoot: string;
//   readonly transport: GhidraTransportKind;
//   readonly endpointPath: string;
//   readonly token: string;
//   readonly runId: string;
//   readonly targetPath: string;
//   readonly targetSha256: string;
//   readonly providerVersion: string;
//   readonly profileDigest: string;
// }
//
// /** Process plus private log coordinates returned by a Ghidra launcher. */
// export type GhidraLaunch = ProviderProcessLaunch & {
//   readonly projectRoot: string;
//   readonly ghidraLogPath: string;
//   readonly scriptLogPath: string;
//   readonly launchSupport?: readonly GhidraLaunchSupportDiagnostic[];
// };
//
// /** Same per-stream projection budget for helper warnings and failed commands. */
// export const GHIDRA_LAUNCH_COMMAND_OUTPUT_BYTES = 8 * 1024;
//
// /** Successful helper stderr, retained independently of the analysis JVM output. */
// export type GhidraLaunchSupportDiagnostic = {
//   readonly mode: "-envvars" | "-vmargs";
//   readonly stderr: string;
//   readonly stderr_bytes: number;
//   readonly stderr_truncated: boolean;
// };
//
// /** Provider-owned capability that starts one isolated headless analysis. */
// export interface GhidraLauncher {
//   launch(
//     session: GhidraLaunchSession,
//     options?: { readonly signal?: AbortSignal },
//   ): Promise<Result<GhidraLaunch, GhidraLaunchError | AnalysisCancelledError>>;
// }
//
// /** Local launch failure retained as the cause of a provider-neutral error. */
// export class GhidraLaunchError extends Error {
//   readonly #partialLaunch: GhidraLaunch | undefined;
//   readonly #capturedOutput: AnalysisCapturedOutput | undefined;
//   readonly launchSupport: readonly GhidraLaunchSupportDiagnostic[];
//
//   constructor(
//     message: string,
//     options?: ErrorOptions & {
//       readonly partialLaunch?: GhidraLaunch;
//       readonly capturedOutput?: AnalysisCapturedOutput;
//       readonly launchSupport?: readonly GhidraLaunchSupportDiagnostic[];
//     },
//   ) {
//     const { partialLaunch, capturedOutput, launchSupport, ...errorOptions } =
//       options ?? {};
//     super(message, errorOptions);
//     this.name = "GhidraLaunchError";
//     this.#partialLaunch = partialLaunch;
//     this.#capturedOutput =
//       capturedOutput === undefined ? undefined : { ...capturedOutput };
//     this.launchSupport = (launchSupport ?? []).map((output) => ({ ...output }));
//   }
//
//   /** Process ownership retained for the client to retry an incomplete rollback. */
//   get partialLaunch(): GhidraLaunch | undefined {
//     return this.#partialLaunch;
//   }
//
//   /** Launcher command outcome retained when a launch command reported one. */
//   get capturedOutput(): AnalysisCapturedOutput | undefined {
//     return this.#capturedOutput === undefined
//       ? undefined
//       : { ...this.#capturedOutput };
//   }
// }
//
// /**
//  * Retain a failed launcher command's exit/signal and output in the shared
//  * captured-output envelope. Bounds apply at projection; truncation there stays
//  * explicit, matching the compiler-outcome diagnostics.
//  */
// const ghidraLaunchCommandOutput = (
//   cause: unknown,
// ): AnalysisCapturedOutput | undefined => {
//   const failure = execFileOutputFailure(cause);
//   if (failure === undefined) return undefined;
//   return {
//     stdout: failure.stdout,
//     stderr: failure.stderr,
//     truncated: failure.outputTruncated,
//     exit_code: typeof failure.code === "number" ? failure.code : null,
//     signal: failure.signal,
//   };
// };
//
// /** Static coordinates for an extracted Ghidra release and packaged script. */
// export interface GhidraHeadlessLauncherOptions {
//   readonly environment: Readonly<NodeJS.ProcessEnv>;
//   readonly analyzeHeadlessPath: string;
//   readonly javaHome?: string;
//   readonly javaVmName?: string;
//   readonly bridgeScriptPath: string;
//   readonly platform?: NodeJS.Platform;
//   readonly comSpec?: string;
//   /** Select the admitted 16-bit real-mode MZ import instead of auto-detection. */
//   readonly dosMz?: true;
//   readonly dosCom?: true;
//   readonly rawBinary?: {
//     readonly languageId: string;
//     readonly compilerSpecId: string;
//     readonly baseAddr: string;
//   };
//   /** Explicit import language committed by the analysis profile. */
//   readonly languageOverride?: GhidraLanguageOverride;
//   /** Auto-analyzers disabled before default auto-analysis, as configured. */
//   readonly disabledAnalyzers?: readonly string[];
//   /** Caller seeds committed by the analysis profile, applied before analysis. */
//   readonly analysisSeeds?: GhidraSeedCommitment;
//   readonly analysisExtensions?: readonly GhidraExtension[];
//   readonly pspExtension?: GhidraPspExtension;
//   /** Remap typed float storage for the soft-float o32 ABI after analysis. */
//   readonly mipsSoftFloat?: true;
//   /** Spawn seam for provider-boundary lifecycle tests. */
//   readonly spawnProcess?: typeof spawnOwnedProviderProcess;
//   /** LaunchSupport probe seam for Java-free launcher fixtures. */
//   readonly javaLaunch?: typeof ghidraJavaLaunch;
// }
//
// /** Launch Ghidra without copying scripts into or modifying its installation. */
// export class GhidraHeadlessLauncher implements GhidraLauncher {
//   readonly options: GhidraHeadlessLauncherOptions;
//   constructor(options: GhidraHeadlessLauncherOptions) {
//     this.options = {
//       ...options,
//       environment: snapshotEnvironment(options.environment, options.platform),
//     };
//   }
//
//   async launch(
//     session: GhidraLaunchSession,
//     options: { readonly signal?: AbortSignal } = {},
//   ): Promise<Result<GhidraLaunch, GhidraLaunchError | AnalysisCancelledError>> {
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     const paths = ghidraRuntimePaths(session.runtimeRoot);
//     const platform = this.options.platform ?? process.platform;
//     let started: SpawnedOwnedProviderProcess | undefined;
//     const launchSupport: GhidraLaunchSupportDiagnostic[] = [];
//     try {
//       const psp = this.options.pspExtension;
//       if (psp !== undefined) {
//         const installedRoot = await realpath(
//           join(
//             dirname(this.options.analyzeHeadlessPath),
//             "..",
//             "Ghidra",
//             "Extensions",
//             "ghidra-allegrex",
//           ),
//         );
//         if (installedRoot !== psp.root)
//           throw new GhidraLaunchError(
//             "Allegrex profile does not belong to the selected Ghidra installation.",
//           );
//         const inspected = await inspectGhidraPspExtension(
//           psp.root,
//           psp.ghidra_version,
//           options.signal,
export const _l = 218;
