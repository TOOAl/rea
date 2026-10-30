export const __stub = 1;
// import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
// import { randomUUID } from "node:crypto";
// import { open, readFile, writeFile } from "node:fs/promises";
// import { join } from "node:path";
// import { fileURLToPath } from "node:url";
//
// import { z } from "zod";
//
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import { EvidenceIntegrityError } from "../domain/evidenceErrors.js";
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import type { AnalysisCleanupObservation } from "../domain/analysisErrorBase.js";
// import type { NativeCallPartialObservation } from "../domain/native/nativeCallPartialObservation.js";
// import {
//   nativeCallEventSchema,
//   nativeCodeLocationSchema,
//   type NativeCallObservationInput,
// } from "../domain/native/nativeCallObservation.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { safeParseJson } from "../domain/safeJson.js";
// import {
//   ProviderProcessSupervisor,
//   spawnOwnedProviderProcess,
// } from "../process/ProviderProcess.js";
// import { cleanupOwnedProcessGroup } from "../process/ProcessOwnership.js";
// import {
//   observeProcessStartIdentity,
//   signalProcessWithStartIdentity,
// } from "../process/ProcessOwnershipObservation.js";
// import type { ProcessIdentityObservation } from "../process/ProcessOwnership.js";
// import {
//   ProviderStartupDeadline,
//   waitForAbortableDelay,
// } from "../process/ProviderDeadline.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import { resolveXcrunTool, type ResolvedTool } from "./CommandRunner.js";
// import {
//   readLldbObservationJournal,
//   readBoundedPrefix,
//   readPartialCapture,
//   projectLldbPartialObservation,
// } from "./LldbRetainedObservations.js";
//
// const OPERATION = "observe_native_calls";
// const PROVIDER = "native-macos";
// const LLDB_REQUIREMENT =
//   "LLDB from Xcode or the Command Line Tools is not available";
// /** Captured target output kept per stream; the rest is counted, not stored. */
// const MAX_OUTPUT_BYTES = 1024 * 1024;
// /** LLDB startup, symbol loading and teardown beyond the observation window. */
// const DEADLINE_GRACE_MS = 60_000;
// const DIAGNOSTIC_BYTES = 16 * 1024;
//
// const BRIDGE = fileURLToPath(
//   new URL("../../bridge/native/rea_lldb_tracer.py", import.meta.url),
// );
//
// /** JSON the LLDB bridge writes after a completed run. */
// const tracedSchema = z.strictObject({
//   status: z.literal("traced"),
//   version: z.string(),
//   pid: z.number().int().positive(),
//   outcome: z.enum([
//     "exited",
//     "duration-elapsed",
//     "event-limit",
//     "stop-limit",
//     "resource-limit",
//   ]),
//   exit_status: z.number().int().nullable(),
//   exit_description: z.string().nullable(),
//   killed: z.boolean(),
//   terminated: z.boolean(),
//   target_identity: z.strictObject({
//     loaded_image_sha256: z.null(),
//     selected_file_sha256: z
//       .string()
//       .regex(/^[0-9a-f]{64}$/u)
//       .nullable(),
//     file_device: z.string().nullable(),
//     file_inode: z.string().nullable(),
//     module_path: z.string().nullable(),
//     module_uuid: z.string().nullable(),
//     stable: z.boolean(),
//   }),
//   resource_limit_reached: z.boolean(),
//   breakpoint_locations_truncated: z.boolean().optional(),
//   target_output: z.strictObject({
//     stdout_bytes: z.number().int().nonnegative(),
//     stderr_bytes: z.number().int().nonnegative(),
//     stdout_truncated: z.boolean(),
//     stderr_truncated: z.boolean(),
//     stdout_complete: z.boolean(),
//     stderr_complete: z.boolean(),
//   }),
//   elapsed_ms: z.number().nonnegative(),
//   breakpoints: z.array(
//     z.strictObject({
//       index: z.number().int().nonnegative(),
//       location_count: z.number().int().nonnegative(),
//       locations: z.array(nativeCodeLocationSchema),
//     }),
//   ),
//   events: z.array(nativeCallEventSchema),
//   other_stops: z.array(z.string()),
// });
//
// const tracerOutputSchema = z.discriminatedUnion("status", [
//   tracedSchema,
//   z.strictObject({
//     status: z.enum([
//       "target-error",
//       "target-integrity-error",
//       "target-identity-unavailable",
//       "launch-error",
//       "tracer-error",
//     ]),
//     error: z.string().nullable(),
//     target_process_created: z.boolean().optional(),
//   }),
// ]);
//
// /** Bounded text of one target output stream. */
// export interface CapturedOutput {
//   readonly text: string;
//   /** Bytes drained from the target, which may exceed the retained prefix. */
//   readonly bytes: number;
//   readonly truncated: boolean;
//   /** Whether the bridge confirms it drained the stream through EOF. */
//   readonly complete: boolean;
// }
//
// /** One completed LLDB observation, before projection into the result contract. */
// export interface NativeCallTrace {
//   readonly debugger: ResolvedTool & { readonly version: string | null };
//   readonly run: z.infer<typeof tracedSchema>;
//   readonly stdout: CapturedOutput;
//   readonly stderr: CapturedOutput;
//   /** REA confirmed the traced process no longer exists. */
//   readonly terminated: boolean;
// }
//
// /** Launch one owned process under a debugger and record calls. */
// export interface NativeCallTracer {
//   trace(
//     request: {
//       readonly executable: string;
//       readonly architecture: string;
//       readonly expectedSha256: string;
//       readonly input: NativeCallObservationInput;
//     },
//     signal?: AbortSignal,
//   ): Promise<Result<NativeCallTrace, AnalysisError>>;
//   /** Retry cleanup retained after a trace could not verify process exit. */
//   close(): Promise<Result<null, AnalysisError>>;
// }
//
// /** Remediation for a target LLDB may not debug. */
// const ATTACH_REMEDIATION =
//   "Allow debugging for this user (Developer Tools access: `DevToolsSecurity -enable`, or membership in the _developer group). A hardened-runtime target is debuggable only with the com.apple.security.get-task-allow entitlement; inspect_signature reports hardened_runtime and entitlements.";
//
// /** Production tracer: `lldb --batch` running the REA LLDB bridge. */
// export class LldbCallTracer implements NativeCallTracer {
//   private readonly environment: NodeJS.ProcessEnv;
//   #tail: Promise<void> = Promise.resolve();
//   #pendingCleanup: RetainedLldbResources | undefined;
//   constructor(
//     environment: Readonly<NodeJS.ProcessEnv>,
//     private readonly launch: typeof runLldb = runLldb,
//     private readonly resolveTool: (
//       tool: string,
//       signal?: AbortSignal,
//     ) => ReturnType<typeof resolveXcrunTool> = (tool, signal) =>
//       resolveXcrunTool(tool, this.environment, signal),
//   ) {
//     this.environment = snapshotEnvironment(environment);
//   }
//
//   async trace(
//     request: Parameters<NativeCallTracer["trace"]>[0],
//     signal?: AbortSignal,
//   ): Promise<Result<NativeCallTrace, AnalysisError>> {
//     return this.#serialize(() => this.#trace(request, signal));
//   }
//
//   async #trace(
//     request: Parameters<NativeCallTracer["trace"]>[0],
//     signal?: AbortSignal,
//   ): Promise<Result<NativeCallTrace, AnalysisError>> {
//     const pendingCleanup = await this.#retryPendingCleanup();
//     if (pendingCleanup !== undefined) return err(pendingCleanup);
//     const lldb = await this.resolveTool("lldb", signal);
//     if (!lldb.ok)
//       return err(
//         lldb.error.reason === "cancelled"
//           ? new AnalysisCancelledError(OPERATION)
//           : new AnalysisCapabilityUnavailableError(
//               PROVIDER,
//               OPERATION,
//               LLDB_REQUIREMENT,
//               { userMessage: LLDB_REQUIREMENT },
//             ),
//       );
//     const root = await PrivateRuntimeRoot.create({ prefix: "rea-lldb-" });
//     const paths = lldbRuntimePaths(root.path);
//     let result: Result<NativeCallTrace, AnalysisError>;
//     try {
//       result = await this.#run(lldb.value, root, request, signal);
//     } catch (cause: unknown) {
//       const partialObservation = await partialNativeObservation({
//         request,
//         pidPath: paths.pid,
//         stdoutPath: paths.stdoutCapture,
//         stderrPath: paths.stderrCapture,
//         observationPath: paths.observations,
//         version: null,
//         reason: "tracer-failure",
//       });
//       const retained = this.#pendingCleanup;
//       const resources =
//         retained === undefined ? [] : await lldbCleanupResources(retained);
//       result = err(
//         new ProviderAdapterError(PROVIDER, OPERATION, {
//           cause,
//           diagnostics: {
//             reason: cause instanceof Error ? cause.message : String(cause),
//           },
//           partialObservation,
//           ...(retained === undefined
//             ? {}
//             : {
//                 cleanup: {
//                   reason: "LLDB trace failed while owned resources remain",
//                   resources,
//                 },
//               }),
//         }),
//       );
//     }
//     if (this.#pendingCleanup?.root === root) return result;
//     try {
//       await root.close();
//     } catch (cause: unknown) {
//       this.#pendingCleanup = {
//         root,
//         supervisor: undefined,
//         pidPath: paths.pid,
//         targetIdentity: undefined,
export const _l = 255;
