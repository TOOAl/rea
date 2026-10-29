export const __stub = 1;
// import { join, isAbsolute } from "node:path";
// import { z } from "zod";
// import type { FirmwareAnalysisPort } from "../application/firmware/FirmwareAnalysisPort.js";
// import {
//   createAnalysisExecution,
//   type AnalysisExecution,
//   type ExecutionOptions,
// } from "../application/AnalysisProvider.js";
// import {
//   firmwareResultSchemas,
//   type FirmwareRequest,
//   type FirmwarePartialObservation,
// } from "../domain/firmware/firmwareAnalysis.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
// import {
//   AnalysisCancelledError,
//   AnalysisInputError,
//   AnalysisOutputError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
// import { err, ok } from "../domain/result.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
// import type { SafeOutputTree } from "../artifacts/SafeOutputTree.js";
// import { publishFirmwareExtraction } from "./FirmwarePublication.js";
// import {
//   FIRMWARE_LIMITS,
//   BINWALK_PROVIDER_IDENTITY,
//   UNBLOB_PROVIDER_IDENTITY,
// } from "./FirmwareRelease.js";
// import { admitFirmwareVersion } from "./FirmwareVersion.js";
// import {
//   firmwareToolUnavailable,
//   resolveFirmwareCommand,
//   runFirmwareCommand,
//   readFirmwareCommandReport,
//   type FirmwareLauncher,
// } from "./FirmwareCommand.js";
// import { inventoryFirmwareOutput, snapshotFirmware } from "./FirmwareFiles.js";
// import {
//   normalizeBinwalkReport,
//   normalizeUnblobReport,
// } from "./FirmwareReports.js";
//
// type Outcome = Awaited<ReturnType<FirmwareAnalysisPort["execute"]>>;
// interface PendingFirmwareCleanup {
//   supervisor?: ProviderProcessSupervisor;
//   tree?: SafeOutputTree;
//   readonly root: PrivateRuntimeRoot;
//   readonly engine: string;
//   readonly operation: string;
// }
//
// interface FirmwareCleanupAttempt {
//   readonly failure: ProviderCleanupError | undefined;
//   readonly processUnverified: boolean;
// }
//
// const combineCleanupFailures = (
//   failures: readonly ProviderCleanupError[],
// ): ProviderCleanupError | undefined => {
//   if (failures.length < 2) return failures[0];
//   return new ProviderCleanupError(
//     "firmware",
//     failures.flatMap((failure) => [...failure.cleanupResources]),
//     {
//       reason: "Multiple owned firmware resources could not be cleaned",
//       failures: failures.map((failure) => ({
//         engine: failure.providerId,
//         operation: failure.operation,
//         resources: [...failure.cleanupResources],
//         reason: failure.diagnostics?.reason ?? failure.message,
//       })),
//     },
//     { operation: "close_firmware", cause: new AggregateError(failures) },
//   );
// };
// const waitForPredecessor = (
//   predecessor: Promise<void>,
//   operation: string,
//   signal?: AbortSignal,
// ): Promise<void> =>
//   new Promise((resolve, reject) => {
//     const abort = () => reject(new AnalysisCancelledError(operation));
//     signal?.addEventListener("abort", abort, { once: true });
//     if (signal?.aborted === true) abort();
//     void predecessor.then(() => {
//       signal?.removeEventListener("abort", abort);
//       resolve();
//     });
//   });
// const limitations = [
//   "Signature matches and reported sizes do not establish partition validity, encryption or runtime mappings. Binwalk may infer unknown lengths before emitting its report.",
//   "Only Linux is supported by this integration. One worker, inherited per-process address-space/file-size/CPU limits and a deadline constrain execution; staging byte and entry budgets are polled and may transiently overshoot. Limits are not aggregate process-memory or filesystem quotas.",
//   "Unblob's default sandbox and skip rules remain enabled. Missing external extractors, unknown chunks, encrypted chunks and depth limits yield partial coverage. Extracted code is never executed; only regular files are published, without executable permission bits.",
//   "extraction_gaps lists regions that were carved or left unextracted and names extractor dependencies the producer reported as missing. A listed gap does not mean the target is corrupt or that a retained region is empty.",
//   "The actual launcher executable is hashed. Interpreter, shared libraries and installed Python package dependencies are not independently attested; source revision remains unknown for caller-supplied builds.",
// ] as const;
//
// /** Queued bring-your-own firmware adapters with private snapshots and owned cleanup. */
// export class FirmwareProvider implements FirmwareAnalysisPort {
//   #tail: Promise<void> = Promise.resolve();
//   #closed = false;
//   readonly #pendingCleanup = new Map<string, PendingFirmwareCleanup>();
//   constructor(
//     readonly environment: Readonly<
//       Record<string, string | undefined>
//     > = process.env,
//     readonly launcher?: FirmwareLauncher,
//   ) {}
//
//   /** Inspect regions or explicitly extract selected bytes without changing the source. */
//   async execute(
//     request: FirmwareRequest,
//     options?: ExecutionOptions,
//   ): Promise<Outcome> {
//     if (this.#closed) return err(new AnalysisCancelledError(request.operation));
//     const predecessor = this.#tail;
//     let release = () => {};
//     this.#tail = new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     // Cancel the caller promptly without letting a later request bypass its predecessor.
//     try {
//       await waitForPredecessor(predecessor, request.operation, options?.signal);
//     } catch (cause: unknown) {
//       void predecessor.then(release);
//       return err(
//         cause instanceof AnalysisError
//           ? cause
//           : new AnalysisCancelledError(request.operation),
//       );
//     }
//     try {
//       if (this.#closed)
//         return err(new AnalysisCancelledError(request.operation));
//       const cleanup = await this.#retryCleanup();
export const _l = 141;
