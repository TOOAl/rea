export const __stub = 1;
// import { z } from "zod";
// import { ABORTED, waitForAbortable } from "../process/AbortablePromise.js";
// import {
//   createAnalysisExecution,
//   type AnalysisClient,
//   type AnalysisOperation,
//   type ExecutionOptions,
// } from "../application/AnalysisProvider.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisProtocolError,
//   AnalysisOutputError,
//   AnalysisInputError,
// } from "../domain/analysisErrorCore.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
// import type { AnalysisProfileCommitment } from "../domain/analysisProfile.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { err, ok, type Result } from "../domain/result.js";
// import type { IdaConfiguration } from "./IdaConfiguration.js";
// import { idaProtocol } from "./IdaConfiguration.js";
// import type { IdaMcpConnection } from "./IdaMcpConnection.js";
// import { nativeTools } from "./IdaNativeProtocol.js";
// import { readSettledHealth } from "./IdaBusyHealth.js";
// import { isX86OnlyTarget } from "./IdaCallGraph.js";
// import { IdaOperationRunner } from "./IdaOperationRunner.js";
// import {
//   IDA_LIMITATIONS,
//   IDA_OPERATIONS,
//   IDA_PROVIDER_IDENTITY,
//   idaProfileAdmits,
//   type IdaOperation,
// } from "./IdaProviderCapabilities.js";
// import {
//   absentDatabaseCloseSchema,
//   closeDatabaseSchema,
//   databaseListSchema,
//   legacyMetadataSchema,
//   modernHealthSchema,
//   openDatabaseSchema,
//   rejectedOpenDatabaseSchema,
// } from "./IdaProtocolValues.js";
// import {
//   idaFileDigest,
//   IdaWorkspace,
//   sameIdaHostPath,
// } from "./IdaWorkspace.js";
// import { parseIdaInput } from "./IdaInput.js";
// import { createEvidence } from "../domain/evidence.js";
//
// const legacyTools = [
//   "get_metadata",
//   "list_functions",
//   "list_strings",
//   "get_function_by_name",
//   "get_function_by_address",
//   "decompile_function",
//   "disassemble_function",
//   "get_callers",
//   "get_callees",
//   "get_xrefs_to",
// ];
// const modernTools = [
//   "idb_open",
//   "idb_list",
//   "idb_close",
//   "server_health",
//   "list_funcs",
//   "lookup_funcs",
//   "find_regex",
//   "decompile",
//   "disasm",
//   "callees",
//   "xrefs_to",
// ];
// const operationSet: ReadonlySet<string> = new Set(IDA_OPERATIONS);
//
// const isIdaOperation = (operation: string): operation is IdaOperation =>
//   operationSet.has(operation);
// const wasCancelled = (options: ExecutionOptions | undefined): boolean =>
//   options?.signal?.aborted === true;
//
// interface IdaOperationFailureContext {
//   runner: IdaOperationRunner | undefined;
//   metadataBefore: JsonValue | undefined;
//   metadataAfter: JsonValue | undefined;
//   postOperationIdentityCheck: "not_attempted" | "started" | "verified";
//   parameters: Readonly<Record<string, JsonValue>>;
// }
//
// /** Upstream session ids of inventory entries, omitting unreported ones. */
// interface UpstreamSession {
//   readonly session_id: string;
//   readonly backend: "worker" | "gui";
//   /** Upstream ownership; null when no inventory has reported it. */
//   readonly owned: boolean | null;
//   /** Last inventoried input binding; null until upstream reports it. */
//   readonly input_path: string | null;
//   /** Last inventoried activity; null before upstream reports it. */
//   readonly is_active: boolean | null;
// }
//
// /** A failed cleanup retains its private workspace and reports the remaining resource. */
// class IdaCleanupError extends ProviderAdapterError {
//   override readonly cleanupIncomplete = true;
//   override readonly cleanupResources: readonly string[];
//   constructor(
//     path: string,
//     cause: unknown,
//     sessions?: readonly UpstreamSession[],
//   ) {
//     super("ida", "close", {
//       cause,
//       capturedOutput:
//         cause instanceof AnalysisError ? cause.capturedOutput : undefined,
//       diagnostics: {
//         ...(cause instanceof AnalysisError ? cause.diagnostics : undefined),
//         reason:
//           "IDA cleanup could not be verified; the remaining connection or private workspace is retained for retry.",
//         failure_reason:
//           cause instanceof AnalysisError
//             ? (cause.diagnostics?.reason ?? cause.message)
//             : cause instanceof Error
//               ? cause.message
//               : String(cause),
//         workspace: path,
//         ...(sessions === undefined
//           ? {}
//           : {
//               upstream_sessions: {
//                 state: "unverified",
//                 sessions: sessions.map(
//                   ({ session_id, backend, owned, input_path, is_active }) => ({
//                     session_id,
//                     backend,
//                     owned,
//                     input_path,
//                     is_active,
//                   }),
//                 ),
//                 reason:
//                   "Release of upstream sessions matching the requested session ID or private input was not confirmed; input_path preserves the last observed binding and is null when no inventory has reported it. is_active preserves registry activity and is null when unknown; it does not establish process liveness. A worker outlives its supervisor and may keep running until it finishes and reaches its idle timeout; exiting REA does not stop it. A gui session belongs to an IDA instance REA does not control. An empty session_id means upstream reported none; owned is null when no inventory has reported ownership; an empty list means the requested worker's close was confirmed but no inventory has identified any remaining session.",
//               },
//             }),
//       },
//     });
//     this.cleanupResources = [path];
//   }
// }
//
// /** Serial read-only session whose lifecycle authority excludes an attached GUI. */
// export class IdaSessionClient implements AnalysisClient {
//   #tail: Promise<void> = Promise.resolve();
//   #startup: Promise<void> | undefined;
//   #closed = false;
//   #closing = false;
//   #closePromise: Promise<Result<null, AnalysisError>> | undefined;
//   #workspace: IdaWorkspace | undefined;
//   #database: string | undefined;
//   #databaseCloseCompleted = false;
//   #openAttempted = false;
//   #openCompleted = false;
//   #ready = false;
//   #blockingSessions: readonly UpstreamSession[] | undefined;
//   #openRejected = false;
//   #callGraphAdvertised = false;
//   #surveyAdvertised = false;
//   #initialIdentity: string | undefined;
//   #metadata: JsonValue = null;
//   #lifecycle: JsonValue[] = [];
//
//   constructor(
//     private readonly config: IdaConfiguration,
//     private readonly target: BinaryTarget,
//     private readonly connection: IdaMcpConnection,
//     private readonly profile?: AnalysisProfileCommitment,
//   ) {}
//
//   execute(
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options?: ExecutionOptions,
//   ) {
//     const call = this.#tail.then(() =>
//       this.#execute(operation, parameters, options),
//     );
//     this.#tail = call.then(
//       () => undefined,
//       () => undefined,
//     );
//     return call;
//   }
//
//   async executeIfReady(
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options?: ExecutionOptions,
//   ) {
//     if (!this.#ready || this.#closed || this.#closing)
//       return Promise.resolve(undefined);
//     const call = this.#tail.then(() => {
//       if (!this.#ready || this.#closed || this.#closing) return undefined;
//       if (wasCancelled(options))
//         return err(new AnalysisCancelledError(operation));
//       return this.#execute(operation, parameters, options, true);
//     });
//     this.#tail = call.then(
//       () => undefined,
//       () => undefined,
//     );
//     const result = await waitForAbortable(call, options?.signal);
//     return result === ABORTED
export const _l = 214;
