export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import { readFile, rm, stat, writeFile } from "node:fs/promises";
// import { join } from "node:path";
// import { StringDecoder } from "node:string_decoder";
// import { fileURLToPath } from "node:url";
// import { getHeapStatistics } from "node:v8";
// import { z } from "zod";
// import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
// import type { JavaScriptStaticAnalysis } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
// import { estimateJavaScriptStaticApplicationProjection } from "../../domain/javascript/javascriptApplicationProjectionResources.js";
// import type { JavaScriptModuleSemanticIr } from "../../domain/javascript/javascriptModuleSemanticIr.js";
// import type { JavaScriptSemanticFileProjection } from "../../domain/javascript/javascriptSemanticFileProjection.js";
// import type {
//   JavaScriptAnalyzedSource,
//   JavaScriptSourceAnalysisFailure,
//   JavaScriptSourceAnalysisLimits,
// } from "../../domain/javascript/javascriptSourceAnalysis.js";
// import { AnalysisError } from "../../domain/analysisErrorBase.js";
// import {
//   AnalysisCancelledError,
//   AnalysisTimeoutError,
//   AnalysisOutputError,
//   AnalysisResourceConstraintError,
//   AnalysisCapabilityUnavailableError,
// } from "../../domain/analysisErrorCore.js";
// import { ProviderAdapterError } from "../../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../../domain/providerCleanupError.js";
// import { ok, err, type Result } from "../../domain/result.js";
// import { javaScriptRuntime } from "../../domain/runtimeVersion.js";
// import { PrivateRuntimeRoot } from "../../process/PrivateRuntimeRoot.js";
// import { PrivateRuntimeRootUnavailableError } from "../../process/PrivateRuntimeRootUnavailableError.js";
// import { javaScriptWorkerMemoryLimitBytes } from "../../process/JavaScriptWorkerMemoryLimit.js";
// import {
//   ProviderProcessSupervisor,
//   spawnOwnedProviderProcess,
// } from "../../process/ProviderProcess.js";
// import { cleanupOwnedProcessGroup } from "../../process/ProcessOwnership.js";
// import { prepareProcessOwnershipInspection } from "../../process/ProcessOwnershipObservation.js";
// import {
//   ProviderStartupDeadline,
//   waitForAbortableDelay,
// } from "../../process/ProviderDeadline.js";
// import {
//   readJavaScriptAnalysisTransfer,
//   JAVASCRIPT_ANALYSIS_TRANSFER_RECORD_BYTES,
//   javaScriptTransferRetentionBytes,
// } from "./JavaScriptAnalysisTransfer.js";
// import { javaScriptWorkerStaticAnalysisSchema } from "./JavaScriptAnalysisWorkerSchemas.js";
// import {
//   JAVASCRIPT_ANALYSIS_WORKER_DEFAULTS as DEFAULTS,
//   javaScriptWorkerMessageSchema,
//   javaScriptWorkerRequestSchema,
//   javaScriptWorkerAdmissionSchema,
//   type JavaScriptWorkerMessage,
// } from "./JavaScriptAnalysisWorkerProtocol.js";
//
// const OPERATION = "analyze_javascript_application";
// const PROVIDER = "javascript-static-analysis";
// const MIB = 1024 * 1024;
// const STATIC_CHECKPOINT_RETENTION_EXPANSION = 6;
// const pendingCleanup = new Set<JavaScriptAnalysisWorker>();
// /** The worker runs on this executable; Bun accepts but ignores V8 heap flags. */
// const WORKER_HEAP_FLAGS_ENFORCED =
//   javaScriptRuntime(process.versions).id === "node";
//
// /** One sequential owned worker, retained between source files and closed after analysis. */
// export class JavaScriptAnalysisWorker {
//   readonly #runId = `rea-javascript-analysis-${randomUUID()}`;
//   #root: PrivateRuntimeRoot | undefined;
//   #supervisor: ProviderProcessSupervisor | undefined;
//   #ready = false;
//   #heapLimitBytes = 0;
//   #frames: JavaScriptWorkerMessage[] = [];
//   #pending = "";
//   #decoder = new StringDecoder("utf8");
//   #protocolFailure: string | undefined;
//   #phase = "startup";
//   #lastFailure: AnalysisError | undefined;
//   #estimatedRetainedBytes = 0;
//   #applicationProjectionFailure: AnalysisResourceConstraintError | undefined;
//   #parentCapacityExhausted = false;
//   #sourcesRemaining: number | undefined;
//   readonly #resultBudgetBytes: number;
//   /** Null when the runtime enforces the V8 heap flags instead. */
//   readonly #processMemoryLimitBytes: number | null;
//   readonly #onStdinError = (): void => {};
//   readonly #onStdout = (chunk: Buffer | string): void => {
//     try {
//       this.#pending +=
//         typeof chunk === "string" ? chunk : this.#decoder.write(chunk);
//       let newline: number;
//       while ((newline = this.#pending.indexOf("\n")) >= 0) {
//         const line = this.#pending.slice(0, newline);
//         this.#pending = this.#pending.slice(newline + 1);
//         if (
//           Buffer.byteLength(line) > DEFAULTS.protocolBytes ||
//           this.#frames.length >= 16
//         )
//           throw new RangeError(
//             "JavaScript worker exceeded its control-frame budget",
//           );
//         const raw: unknown = JSON.parse(line);
//         this.#frames.push(javaScriptWorkerMessageSchema.parse(raw));
//       }
//       if (Buffer.byteLength(this.#pending) > DEFAULTS.protocolBytes)
//         throw new RangeError(
//           "JavaScript worker control frame is unterminated or oversized",
//         );
//     } catch (cause: unknown) {
//       this.#protocolFailure = message(cause);
//     }
//   };
//
//   constructor(
//     readonly limits: JavaScriptSourceAnalysisLimits = DEFAULTS,
//     readonly launcher: typeof spawnOwnedProviderProcess = spawnOwnedProviderProcess,
//     sourceCount?: number,
//   ) {
//     if (
//       !Number.isSafeInteger(limits.heapMb) ||
//       limits.heapMb < 128 ||
//       limits.heapMb > 16_384 ||
//       !Number.isSafeInteger(limits.timeoutMs) ||
//       limits.timeoutMs <= 0 ||
//       limits.timeoutMs > 2_147_483_647
//     )
//       throw new RangeError(
//         "JavaScript worker requires valid heap and execution limits",
//       );
//     if (
//       sourceCount !== undefined &&
//       (!Number.isSafeInteger(sourceCount) || sourceCount < 0)
//     )
//       throw new RangeError(
//         "JavaScript worker source count must be a nonnegative safe integer",
//       );
//     this.#sourcesRemaining = sourceCount;
//     this.#processMemoryLimitBytes = javaScriptWorkerMemoryLimitBytes(
//       limits.heapMb,
//     );
//     // Reserve host-side control, schema/Evidence work and a maximum record's
//     // transient copies. Admission also accounts for retained earlier files.
//     this.#resultBudgetBytes = Math.max(
//       0,
//       Math.floor(
//         (getHeapStatistics().heap_size_limit -
//           process.memoryUsage().heapUsed -
//           24 * JAVASCRIPT_ANALYSIS_TRANSFER_RECORD_BYTES) /
//           2,
//       ),
//     );
//   }
//
//   /** Analyze inert source; hard worker failure does not terminate this process. */
//   async analyze(
//     file: JavaScriptArtifactFile,
//     nodeBudget: number,
//     signal?: AbortSignal,
//   ): Promise<
//     Result<JavaScriptAnalyzedSource, JavaScriptSourceAnalysisFailure>
//   > {
//     let javascript: JavaScriptStaticAnalysis | null = null;
//     let module: JavaScriptModuleSemanticIr | null = null;
//     let projection: JavaScriptSemanticFileProjection | null = null;
//     const id = randomUUID();
//     this.#applicationProjectionFailure = undefined;
//     this.#parentCapacityExhausted = false;
//     if (this.#sourcesRemaining !== undefined)
//       this.#sourcesRemaining = Math.max(0, this.#sourcesRemaining - 1);
//     let deadline: ProviderStartupDeadline | undefined;
//     let result: Result<
//       JavaScriptAnalyzedSource,
//       JavaScriptSourceAnalysisFailure
//     >;
//     try {
//       if (signal?.aborted === true) throw new AnalysisCancelledError(OPERATION);
//       if (!file.text.included || file.kind !== "javascript")
//         throw new TypeError(
//           "JavaScript analysis worker requires included JavaScript text",
//         );
//       // Host ownership preparation is outside the parser execution deadline.
//       await prepareProcessOwnershipInspection(signal);
//       for (const owner of pendingCleanup) await owner.close();
//       deadline = new ProviderStartupDeadline(this.limits.timeoutMs, signal);
//       await this.#start(deadline);
//       const root = this.#root;
//       const supervisor = this.#supervisor;
//       if (root === undefined || supervisor === undefined)
//         throw new TypeError("JavaScript worker resources were not acquired");
//       if (this.#frames.length !== 0 || this.#pending !== "")
//         throw new AnalysisOutputError(
//           OPERATION,
//           "JavaScript worker has unsolicited or incomplete control frames",
//         );
//       supervisor.resetOutput();
//       this.#phase = "source-transfer";
//       await writeFile(join(root.path, `${id}.source`), file.text.value, {
//         flag: "wx",
//         mode: 0o600,
//         signal: deadline.signal,
//       });
//       const { text: _text, ...metadata } = file;
//       let offeredResultBudget = 0;
//       const request = javaScriptWorkerRequestSchema.parse({
//         id,
//         node_budget: nodeBudget,
//         text_sha256: createHash("sha256").update(file.text.value).digest("hex"),
export const _l = 207;
