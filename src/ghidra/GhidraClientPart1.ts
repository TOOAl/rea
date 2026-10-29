export const __stub = 1;
// import { createHash, randomBytes, randomUUID } from "node:crypto";
// import type { Stats } from "node:fs";
// import type { FileHandle } from "node:fs/promises";
// import type { Socket } from "node:net";
// import type { ProgressReporter } from "../application/ProgressReporter.js";
//
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import {
//   providerRetryAction,
//   type ProviderOperationHealth,
// } from "../domain/providerOperationHealth.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { silentLogger } from "../logger.js";
// import type { Logger } from "pino";
// import { PendingOperations } from "../process/PendingOperations.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import { ProviderStartupDeadline } from "../process/ProviderDeadline.js";
// import { ProviderRunLineage } from "../process/ProviderRunLineage.js";
// import {
//   type ProviderProcessDiagnostic,
//   type ProviderProcessSnapshot,
//   ProviderProcessSupervisor,
// } from "../process/ProviderProcess.js";
// import { DEFAULT_GHIDRA_STARTUP_TIMEOUT_MS } from "../config/providerStartupTimeout.js";
// import type {
//   GhidraClientOptions,
//   GhidraRequestOptions,
//   GhidraStartResult,
// } from "./GhidraClientTypes.js";
// import type { GhidraInventoryOperation } from "./GhidraInventoryValues.js";
// import type { GhidraFunctionOperation } from "./GhidraFunctionValues.js";
// import {
//   createGhidraDiagnostics,
//   GHIDRA_PROCESS_DIAGNOSTIC_BYTES,
// } from "./GhidraDiagnostics.js";
// import { GhidraLaunchError, type GhidraLaunch } from "./GhidraLauncher.js";
// import { GhidraResponseBuffer } from "./GhidraResponseBuffer.js";
// import { GhidraResponseRouter } from "./GhidraResponseRouter.js";
// import { GhidraRequestQueue } from "./GhidraRequestQueue.js";
// import {
//   bindGhidraSessionFailure,
//   GhidraSessionError,
// } from "./GhidraSessionError.js";
// import {
//   isGhidraShutdownAcknowledgement,
//   parseGhidraSessionInfo,
//   type GhidraSessionInfo,
// } from "./GhidraSessionValues.js";
// import { createGhidraTargetSnapshot } from "./GhidraTargetSnapshot.js";
// import { readFileHandleChunks } from "../filesystem/readFileHandleChunks.js";
// import { readBoundedFileBytes } from "../process/BoundedFileBytes.js";
// import {
//   openRegularFile,
//   RegularFileChangedError,
//   RegularFileAdmissionFailure,
//   sameRegularFileState,
// } from "../filesystem/RegularFile.js";
// import { OwnedFileHandle } from "../filesystem/OwnedFileHandle.js";
// import { redactCapturedTransportCredential } from "../process/ProviderDiagnosticRedaction.js";
//
// export type GhidraTargetSnapshot =
//   | { readonly kind: "captured"; readonly bytes: Buffer }
//   | {
//       readonly kind: "over-capacity";
//       readonly sourceBytesAtLeast: number;
//       readonly maximumBytes: number;
//     };
// import { connectGhidraSocket } from "./GhidraSocketConnection.js";
// import {
//   createGhidraEndpoint,
//   type GhidraEndpoint,
// } from "./GhidraTransport.js";
// import { GhidraWire } from "./GhidraClientWire.js";
// import { completeGhidraStartupHandshake } from "./GhidraClientStartup.js";
// import { ghidraSessionRoot } from "./GhidraSessionRoot.js";
//
// const SHUTDOWN_TIMEOUT_MS = 10_000;
// const SESSION_ROOT = ghidraSessionRoot();
//
// /** Closed Java-bridge operation union callable after the exact handshake. */
// export type GhidraOperation =
//   | GhidraInventoryOperation
//   | GhidraFunctionOperation;
//
// /** Owns an authenticated private Ghidra session with transport-bound mutation authority. */
// export class GhidraClient {
//   readonly #options: Required<
//     Pick<GhidraClientOptions, "startupTimeoutMs" | "transport" | "platform">
//   > &
//     GhidraClientOptions;
//   readonly #logger: Logger;
//   readonly #pending = new PendingOperations<
//     number,
//     Result<JsonValue, GhidraSessionError>
//   >();
//   #socket: Socket | undefined;
//   #detachSocket: (() => void) | undefined;
//   #launch: GhidraLaunch | undefined;
//   #process: ProviderProcessSupervisor | undefined;
//   #runtimeRoot: PrivateRuntimeRoot | undefined;
//   #socketRoot: PrivateRuntimeRoot | undefined;
//   #endpointPath: string | undefined;
//   #snapshotPath: string | undefined;
//   readonly #snapshotOwners = new Set<OwnedFileHandle>();
//   #targetAdmission: JsonValue | undefined;
//   #token: string | undefined;
//   // Retain authentication identities for diagnostics from late request settlement.
//   readonly #authenticationTokens = new Set<string>();
//   #runId: string | undefined;
//   readonly #lineage = new ProviderRunLineage();
//   #nextId = 1;
//   #closing = false;
//   #processSnapshot: ProviderProcessSnapshot | undefined;
//   #lastDiagnostics: Readonly<Record<string, JsonValue>> = {};
//   #startupController: AbortController | undefined;
//   #startPromise: Promise<GhidraStartResult> | undefined;
//   #ready = false;
//   #closePromise: Promise<void> | undefined;
//   readonly #failure = bindGhidraSessionFailure(
//     () => this.#diagnostics(),
//     (value, incomplete) => this.#redactAuthentication(value, incomplete),
//   );
//   readonly #wire: GhidraWire;
//   readonly #requestQueue: GhidraRequestQueue;
//   readonly #responseRouter = new GhidraResponseRouter({
//     pending: this.#pending,
//     nextId: () => this.#nextId,
//     remoteFailure: (failure) =>
//       this.#failure("remote", failure.message, failure, {
//         remoteCode: failure.code,
//       }),
//     protocolFailure: (message, cause) => this.#abortProtocol(message, cause),
//   });
//   readonly #responseBuffer = new GhidraResponseBuffer({
//     onLine: (line) => this.#responseRouter.route(line),
//   });
//   readonly #onSocketData = (chunk: string): void =>
//     this.#responseBuffer.push(chunk);
//   readonly #onSocketError = (): void => {
//     this.#failAll(this.#failure("process", "Ghidra bridge socket failed"));
//   };
//   readonly #onSocketClose = (): void => {
//     if (!this.#closing)
//       this.#failAll(this.#failure("process", "Ghidra bridge socket closed"));
//   };
//
//   constructor(options: GhidraClientOptions) {
//     this.#options = {
//       ...options,
//       startupTimeoutMs:
//         options.startupTimeoutMs ?? DEFAULT_GHIDRA_STARTUP_TIMEOUT_MS,
//       platform: options.platform ?? process.platform,
//       transport: options.transport ?? "unix-socket",
//     };
//     this.#logger = options.logger ?? silentLogger;
//     this.#wire = new GhidraWire({
//       getSocket: () => this.#socket,
//       getToken: () => this.#token,
//       nextId: () => this.#nextId++,
//       pending: this.#pending,
//       logger: this.#logger,
//       failure: this.#failure,
//     });
//     this.#requestQueue = new GhidraRequestQueue(
//       (method, parameters, requestOptions) =>
//         this.#wire.request(method, parameters, requestOptions),
//       (kind, message, cause) => this.#failure(kind, message, cause),
//       () => this.#stopAfterActiveCancellation(),
//     );
//   }
//
//   /** Launch Ghidra once and require its exact post-analysis handshake. */
//   start(
//     signal?: AbortSignal,
//     progress?: ProgressReporter,
//   ): Promise<GhidraStartResult> {
//     if (progress !== undefined)
//       return this.#reportStartupWait(this.start(signal), signal, progress);
//     if (this.#closePromise !== undefined)
//       return this.#closePromise.then(
//         () => this.start(signal),
//         (cause: unknown) =>
//           err(
//             new GhidraSessionError(
//               "process",
//               "Ghidra cleanup remains incomplete",
//               this.#diagnostics(),
//               { cause, cleanupFailure: this.#cleanupError(cause) },
//             ),
//           ),
//       );
//     if (this.#startPromise !== undefined) {
//       if (this.#startupController?.signal.aborted && !signal?.aborted)
//         return this.#startPromise.then((result) =>
//           result.ok || result.error.cleanupFailure !== undefined
//             ? result
//             : this.start(signal),
//         );
//       return this.#startPromise;
//     }
//     const controller = new AbortController();
//     const onAbort = (): void => controller.abort(signal?.reason);
//     if (signal?.aborted === true) onAbort();
//     else signal?.addEventListener("abort", onAbort, { once: true });
//     const started = this.#start(controller.signal);
//     this.#startupController = controller;
//     this.#startPromise = started;
//     const reset = (): void => {
//       signal?.removeEventListener("abort", onAbort);
//       if (this.#startPromise === started) {
//         this.#startPromise = undefined;
//         if (this.#startupController === controller)
//           this.#startupController = undefined;
//       }
//     };
//     void started.then(
//       (result) => {
//         signal?.removeEventListener("abort", onAbort);
//         if (result.ok) this.#ready = true;
//         else reset();
//       },
//       (cause: unknown) => {
//         this.#logger.debug(
//           { error: cause instanceof Error ? cause.message : String(cause) },
//           "Ghidra startup promise rejected during bookkeeping",
//         );
//         reset();
//       },
//     );
//     return started;
//   }
//
//   async #reportStartupWait(
//     started: Promise<GhidraStartResult>,
//     signal: AbortSignal | undefined,
//     progress: ProgressReporter,
//   ): Promise<GhidraStartResult> {
//     const startedAt = performance.now();
//     let active = true;
//     let reporting = false;
//     const timer = setInterval(() => {
//       if (!active || reporting || signal?.aborted) return;
//       reporting = true;
//       void Promise.resolve()
//         .then(() => {
//           if (!active || signal?.aborted) return;
//           return progress.report({
//             phase: "ghidra_startup",
export const _l = 250;
