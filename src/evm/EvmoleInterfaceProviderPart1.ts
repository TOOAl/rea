export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import { access, readFile, stat, writeFile } from "node:fs/promises";
// import { constants } from "node:fs";
// import { isAbsolute, join } from "node:path";
// import { fileURLToPath } from "node:url";
// import { z } from "zod";
// import {
//   createAnalysisExecution,
//   type ExecutionOptions,
// } from "../application/AnalysisProvider.js";
// import type {
//   EvmInterfaceExecution,
//   EvmInterfacePort,
// } from "../application/evm/EvmInterfacePort.js";
// import { readStableArtifact } from "../artifacts/readStableArtifact.js";
// import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
// import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
// import {
//   OwnedCommandFailure,
//   ownedCommandResources,
// } from "../process/OwnedCommand.js";
// import type {
//   AnalysisError,
//   AnalysisCapturedOutput,
// } from "../domain/analysisErrorBase.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisUnsupportedTargetError,
//   AnalysisInputError,
//   AnalysisOutputError,
// } from "../domain/analysisErrorCore.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { createEvidence } from "../domain/evidence.js";
// import type { InspectEvmInterfaceInput } from "../domain/evm/evmInterface.js";
// import { evmInterfaceSchema } from "../domain/evm/evmInterface.js";
// import { solidityMetadataSchema } from "../domain/evm/solidityMetadata.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { runOwnedCommand } from "../process/OwnedCommand.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
// import {
//   evmInterfaceFailure,
//   capturedEvmOutput,
//   type EvmFileSizeFailureEvidence,
// } from "./EvmoleFailures.js";
// import {
//   evmoleInterfaceReplySchema,
//   projectEvmoleInterface,
// } from "./EvmoleInterfaceAdapter.js";
// import {
//   EVMOLE_PROVIDER_IDENTITY,
//   EVM_INTERFACE_LIMITS,
//   EVM_FILE_SIZE_FAILURE_EXIT,
// } from "./EvmoleRelease.js";
// import { decodeEvmBytecodeCarrier } from "./EvmBytecodeCarrier.js";
// import {
//   selectEvmWorkerLimits,
//   type EvmWorkerLimits,
// } from "./EvmWorkerLimits.js";
//
// const OPERATION = "inspect_evm_interface";
// const HOST_REQUIREMENT =
//   "Initial real-verified offline EVM interface profile supports Linux x64 only.";
// const replySchema = z.discriminatedUnion("ok", [
//   z.strictObject({
//     ok: z.literal(true),
//     version: z.literal("0.9.3"),
//     bytecode: z.strictObject({
//       sha256: z.string().regex(/^[a-f0-9]{64}$/),
//       bytes: z.number().int().nonnegative(),
//       hex: z.string().regex(/^(?:[a-f0-9]{2})*$/),
//       metadata: solidityMetadataSchema.optional(),
//     }),
//     raw: evmoleInterfaceReplySchema,
//   }),
//   z.strictObject({
//     ok: z.literal(false),
//     reason: z.enum(["format", "decoder", "output-limit", "unsupported"]),
//     message: z.string(),
//   }),
// ]);
// type Launcher = NonNullable<Parameters<typeof runOwnedCommand>[2]>["launcher"];
// type EvmOutcome = Result<EvmInterfaceExecution, AnalysisError>;
//
// const compactErrorProjection = (error: AnalysisError) => {
//   const projection = projectAnalysisError(error);
//   if (error.capturedOutput === undefined) return projection;
//   // The cleanup result owns this exact captured stream. Other diagnostics and
//   // partial Evidence retain their original fields, including stdout/stderr.
//   const details = { ...projection.details };
//   delete details.captured_output;
//   return { ...projection, details };
// };
//
// const evmExecutionEvidence = (
//   input: InspectEvmInterfaceInput,
//   execution: EvmInterfaceExecution,
// ) =>
//   createEvidence(execution.subject ?? undefined, execution.provider, {
//     operation: OPERATION,
//     parameters: input,
//     result: execution.result,
//     ...(execution.rawResult === null ? {} : { rawResult: execution.rawResult }),
//     confidence: "inferred",
//     locations: execution.locations,
//     limitations: execution.limitations,
//   });
//
// const evmCleanupFailure = (
//   input: InspectEvmInterfaceInput,
//   result: EvmOutcome,
//   resources: readonly string[],
//   reason: string,
//   output?: AnalysisCapturedOutput,
//   cause?: unknown,
// ): ProviderCleanupError => {
//   const partialObservation = result.ok
//     ? evmExecutionEvidence(input, result.value)
//     : result.error.partialObservation;
//   const capturedOutput = result.ok
//     ? output
//     : (result.error.capturedOutput ?? output);
//   return new ProviderCleanupError(
//     EVMOLE_PROVIDER_IDENTITY.id,
//     resources,
//     {
//       reason,
//       previous_error: result.ok ? null : compactErrorProjection(result.error),
//       ...(capturedOutput === undefined
//         ? {}
//         : { captured_output: { ...capturedOutput } }),
//     },
//     {
//       operation: OPERATION,
//       ...(cause === undefined ? {} : { cause }),
//       ...(partialObservation === undefined ? {} : { partialObservation }),
//     },
//   );
// };
//
// /** Run unchanged EVMole/WASM in an owned worker; no target, chain or network execution. */
// export class EvmoleInterfaceProvider implements EvmInterfacePort {
//   readonly #resources = new ArtifactResourceScope();
//   #tail: Promise<void> = Promise.resolve();
//   #closing = false;
//   #closePromise: Promise<void> | undefined;
//   #pendingCleanup:
//     | {
//         root: Pick<PrivateRuntimeRoot, "path" | "close"> | undefined;
//         process: ProviderProcessSupervisor | undefined;
//       }
//     | undefined;
//
//   constructor(
//     readonly environment: Readonly<NodeJS.ProcessEnv> = process.env,
//     readonly launcher?: Launcher,
//     readonly createRuntime: () => Promise<
//       Pick<PrivateRuntimeRoot, "path" | "close">
//     > = () => PrivateRuntimeRoot.create({ prefix: "rea-evm-interface-" }),
//   ) {}
//
//   /** Bind recovered interface candidates to both original carrier and decoded byte identity. */
//   inspect(
//     input: InspectEvmInterfaceInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<EvmInterfaceExecution, AnalysisError>> {
export const _l = 169;
