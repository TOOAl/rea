export const __stub = 1;
// import { randomBytes, randomUUID } from "node:crypto";
// import { access } from "node:fs/promises";
// import type { Socket } from "node:net";
// import { tmpdir } from "node:os";
// import { join } from "node:path";
// import writeFileAtomic from "write-file-atomic";
//
// import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
// import { AnalysisCapabilityUnavailableError } from "../domain/analysisErrorCore.js";
// import {
//   HopperCancelledError,
//   type HopperError,
//   type HopperLauncherOutcome,
//   HopperProcessError,
//   HopperProtocolError,
//   HopperRemoteError,
//   HopperStartError,
//   HopperTimeoutError,
// } from "../domain/hopperErrors.js";
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import {
//   hopperStartupFailure,
//   type HopperStartupFailureDiagnostic,
// } from "../domain/hopperStartupFailure.js";
// import {
//   providerRetryAction,
//   sharedProviderFailureStage,
//   type ProviderOperationHealth,
//   type ProviderOperationRequest,
// } from "../domain/providerOperationHealth.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import type { ProgressReporter } from "../application/ProgressReporter.js";
// import { silentLogger } from "../logger.js";
// import type { Logger } from "pino";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import {
//   ProviderStartupDeadline,
//   waitForAbortableDelay,
// } from "../process/ProviderDeadline.js";
// import { redactCapturedTransportCredential } from "../process/ProviderDiagnosticRedaction.js";
// import { ProviderRunLineage } from "../process/ProviderRunLineage.js";
// import {
//   type ProviderProcessDiagnostic,
//   ProviderProcessSupervisor,
// } from "../process/ProviderProcess.js";
// import { observeProcessStartIdentity } from "../process/ProcessOwnershipObservation.js";
// import type { BridgeLaunch, BridgeLauncher } from "./BridgeLauncher.js";
// import { hopperOperationStage } from "./HopperOperationStage.js";
// import type { HopperDiagnostic } from "./HopperDiagnostics.js";
// import {
//   cleanupHopperSession,
//   confirmExternalApplicationExit,
//   type HopperOwnedResources,
// } from "./HopperCleanup.js";
// import {
//   parseHopperServerInfo,
//   HOPPER_SHUTDOWN_TIMEOUT_MS,
//   type HopperServerInfo,
// } from "./HopperSessionValues.js";
// import { connectHopperSocketOnce } from "./HopperSocketConnection.js";
// import {
//   hopperLauncherFailureDiagnostic,
//   hopperLauncherReportedApplicationNotFound,
//   nativeHopperLaunchWasDenied,
// } from "./HopperProcessDiagnostic.js";
// import { DEFAULT_HOPPER_STARTUP_TIMEOUT_MS } from "../config/providerStartupTimeout.js";
// import {
//   HopperRequestQueue,
//   type HopperRequestActivity,
// } from "./HopperRequestQueue.js";
// import { HopperResponseStream } from "./HopperResponseStream.js";
// import {
//   type HopperBridgeEvent,
//   type HopperBridgeMessage,
//   responseResult,
// } from "./protocol.js";
//
// /** Aggregate in-memory retention budget for this provider's launcher output. */
// export const HOPPER_PROCESS_DIAGNOSTIC_BYTES = 8 * 1024 * 1024;
//
// const SESSION_ROOT = process.platform === "darwin" ? "/tmp" : tmpdir();
//
// /** Dependencies, deadlines, and redacted diagnostics for one bridge client. */
// export interface HopperClientOptions {
//   readonly launcher: BridgeLauncher;
//   readonly runId?: string;
//   readonly startupTimeoutMs?: number;
//   readonly onDiagnostic?: (event: HopperDiagnostic) => void;
//   readonly logger?: Logger;
// }
//
// type HopperClientCloseOptions = {
//   readonly progress?: ProgressReporter;
//   readonly retainDocument?: boolean;
// };
//
// /**
//  * Owns one authenticated NDJSON-over-Unix-socket bridge session.
//  *
//  * Each instance creates a private directory and random bearer token, correlates
//  * concurrent requests by numeric id, and removes its artifacts on close. It
//  * only terminates launch processes explicitly marked as owned; the normal
//  * Hopper launcher does not confer ownership of the GUI application.
//  */
// export class HopperClient {
//   readonly #options: Required<Pick<HopperClientOptions, "startupTimeoutMs">> &
//     HopperClientOptions;
//   readonly #requests: HopperRequestQueue;
//   readonly #responses: HopperResponseStream;
//   readonly #logger: Logger;
//   #socket: Socket | undefined;
//   readonly #resources: HopperOwnedResources = {
//     launch: undefined,
//     processSupervisor: undefined,
//     runtimeRoot: undefined,
//     shutdownConfirmed: false,
//     externalApplication: undefined,
//   };
//   #token: string | undefined;
//   readonly #lineage = new ProviderRunLineage();
//   #nextId = 1;
//   #closing = false;
//   #launcherExitCode: number | null | undefined;
//   #launcherFailureDiagnostic: HopperStartupFailureDiagnostic | undefined;
//   #operationFailure: OperationFailureRecord | undefined;
//   #startupController: AbortController | undefined;
//   #ready = false;
//   #startupFailureResult: AnalysisError | undefined;
//   #runId: string | undefined;
//   #startPromise: Promise<Result<HopperServerInfo, AnalysisError>> | undefined;
//   #closePromise: Promise<Result<null, AnalysisError>> | undefined;
//   readonly #onSocketData = (chunk: string): void => {
//     this.#responses.push(chunk);
//   };
//   readonly #onSocketError = (): void => {
//     const error = new HopperProcessError(null, {
//       providerState: "unreachable",
//     });
//     this.#failAll(error);
//     this.#rememberProcessFailure(error, []);
//   };
//   readonly #onSocketClose = (): void => {
//     if (this.#closing) return;
//     const launch = this.#resources.launch;
//     if (
//       launch?.providerLifetime === "launcher-process" &&
//       this.#launcherExitCode !== undefined
//     )
//       return;
//     if (launch?.providerLifetime === "launcher-process") {
//       setImmediate(() => {
//         if (this.#closing || this.#launcherExitCode !== undefined) return;
//         const exitCode = launch.process.exitCode ?? null;
//         const error = new HopperProcessError(exitCode, {
//           diagnostic: this.#launcherFailureDiagnostic,
//           providerState: exitCode !== null ? "exited" : "unreachable",
//         });
//         this.#failAll(error);
//         this.#rememberProcessFailure(error, []);
//       });
//       return;
//     }
//     const error = new HopperProcessError(null, {
//       providerState: "unreachable",
//     });
//     this.#failAll(error);
//     this.#rememberProcessFailure(error, []);
//   };
//
//   constructor(options: HopperClientOptions) {
//     this.#logger = options.logger ?? silentLogger;
//     this.#options = {
//       ...options,
//       startupTimeoutMs:
//         options.startupTimeoutMs ?? DEFAULT_HOPPER_STARTUP_TIMEOUT_MS,
//     };
//     this.#requests = new HopperRequestQueue(
//       ({ id, method, params }, failed) => {
//         const socket = this.#socket;
//         const token = this.#token;
//         if (socket === undefined || socket.destroyed || token === undefined) {
//           failed();
//           return;
//         }
//         socket.write(
//           `${JSON.stringify({ id, token, method, params })}\n`,
//           (cause) => {
//             if (cause !== undefined && cause !== null) failed();
//           },
//         );
//       },
//     );
//     this.#responses = new HopperResponseStream({
//       accept: (message) => this.#acceptBridgeMessage(message),
//       hasQueued: (id) => this.#requests.hasQueued(id),
//       nextRequestId: () => this.#nextId,
//       abort: (message, cause) => this.#abortProtocol(message, cause),
//     });
//   }
//
//   /** Latest token-verified launcher lineage for the active run. */
//   runtimeLineage() {
//     return this.#lineage.snapshot();
//   }
//
//   /** Observe a request that still occupies Hopper after caller timeout/cancel. */
//   requestActivity(): HopperRequestActivity | null {
//     return this.#requests.activity();
//   }
//
//   /**
//    * Latest operational health for this owned bridge.
//    * A recorded exit remains visible after request activity returns to idle.
//    */
//   operationHealth(): ProviderOperationHealth {
//     const failure = this.#operationFailure;
//     if (failure !== undefined) {
//       const requests: readonly ProviderOperationRequest[] =
//         failure.requests.map((request) => ({
//           ...request,
//           stage: failure.startupFailure
//             ? "launch"
//             : hopperOperationStage(request.operation),
//         }));
//       return {
//         state: failure.state,
//         stage:
//           requests.length === 0
//             ? failure.startupFailure
//               ? "launch"
//               : "connection"
//             : sharedProviderFailureStage(requests),
//         retryAction: providerRetryAction(failure.state, failure.startupFailure),
//         exitCode: failure.exitCode,
//         requests,
//       };
//     }
//     const activity = this.requestActivity();
//     if (activity !== null) {
//       const stage = hopperOperationStage(activity.operation);
//       return {
//         state: "busy",
//         stage,
//         retryAction: "wait",
//         exitCode: null,
//         requests: [
//           {
//             requestId: activity.requestId,
//             operation: activity.operation,
//             stage,
//           },
//         ],
//       };
//     }
//     return {
//       state: "idle",
//       stage: null,
//       retryAction: null,
//       exitCode: null,
//       requests: [],
//     };
//   }
//
//   /** True only after the authenticated health handshake has completed. */
//   isReady(): boolean {
//     return (
//       this.#ready &&
//       this.#socket !== undefined &&
//       !this.#socket.destroyed &&
//       this.#closePromise === undefined
//     );
//   }
//
//   /** Launch the bridge once and complete its authenticated health handshake. */
//   start(
//     signal?: AbortSignal,
//   ): Promise<Result<HopperServerInfo, AnalysisError>> {
//     if (this.#closePromise !== undefined) {
//       return this.#closePromise.then((closed) =>
export const _l = 281;
