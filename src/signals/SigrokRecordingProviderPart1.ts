export const __stub = 1;
// import {
//   type InspectSignalDecodersInput,
//   signalDecodersSchema,
// } from "../domain/signals/signalDecoders.js";
// import {
//   DecoderDiscoveryBudgetError,
//   parseDecoderDiscovery,
// } from "./parseDecoderDiscovery.js";
// import {
//   BOUNDED_PRODUCER_LIMITS as LIMITS,
//   prlimitArgumentVector,
//   readLinuxResourceLimits,
//   type LinuxResourceLimits,
// } from "../process/LinuxResourceLimits.js";
// import { randomUUID } from "node:crypto";
// import { constants } from "node:fs";
// import { access, realpath, writeFile } from "node:fs/promises";
// import { isAbsolute, join } from "node:path";
// import {
//   createAnalysisExecution,
//   type AnalysisExecution,
//   type ExecutionOptions,
// } from "../application/AnalysisProvider.js";
// import type { SignalRecordingPort } from "../application/signals/SignalRecordingService.js";
// import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
// import {
//   ArtifactAnalysisResources,
//   type ArtifactAnalysisRuntime,
// } from "../process/ArtifactAnalysisResources.js";
// import { readStableArtifact } from "../artifacts/readStableArtifact.js";
// import {
//   AnalysisError,
//   type AnalysisCapturedOutput,
// } from "../domain/analysisErrorBase.js";
// import {
//   AnalysisAccessDeniedError,
//   AnalysisArtifactChangedError,
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
//   AnalysisOutputError,
//   AnalysisResourceConstraintError,
// } from "../domain/analysisErrorCore.js";
// import { createEvidence } from "../domain/evidence.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { windowAnnotationText } from "../domain/signals/annotationTextWindow.js";
// import {
//   type DecodeSignalRecordingInput,
//   signalRecordingSchema,
// } from "../domain/signals/signalRecording.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   runOwnedCommand,
//   OwnedCommandFailure,
// } from "../process/OwnedCommand.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
//
// const OPERATION = "decode_signal_recording";
// export const SIGROK_PROVIDER_IDENTITY = {
//   id: "sigrok-recording",
//   name: "REA sigrok recording adapter",
//   version: "sigrok-cli@0.7.2",
// } as const;
// type Launcher = NonNullable<Parameters<typeof runOwnedCommand>[2]>["launcher"];
//
// /** Decode selected recordings only, retaining cleanup ownership across failures. */
// export class SigrokRecordingProvider implements SignalRecordingPort {
//   readonly #resources: ArtifactAnalysisResources;
//   constructor(
//     readonly environment: Readonly<NodeJS.ProcessEnv> = process.env,
//     readonly launcher?: Launcher,
//     readonly createRuntime: () => Promise<ArtifactAnalysisRuntime> = () =>
//       PrivateRuntimeRoot.create({ prefix: "rea-sigrok-" }),
//     readonly platform: NodeJS.Platform = process.platform,
//     readonly readArtifact: typeof readStableArtifact = readStableArtifact,
//     readonly readLimits: typeof readLinuxResourceLimits = readLinuxResourceLimits,
//   ) {
//     this.#resources = new ArtifactAnalysisResources(
//       SIGROK_PROVIDER_IDENTITY.id,
//       OPERATION,
//       readArtifact,
//       readLimits,
//       {
//         message:
//           "A sigrok operation is already active; retry after it completes.",
//         details: { max_concurrent_decodes: 1 },
//       },
//     );
//   }
//   decode(
//     input: DecodeSignalRecordingInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     return this.#resources.run(
//       () => this.#executeRequest(input, options),
//       options?.signal,
//     );
//   }
//   inspectDecoders(
//     input: InspectSignalDecodersInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     return this.#resources.run(
//       () => this.#executeRequest(input, options),
//       options?.signal,
//       "inspect_signal_decoders",
//     );
//   }
//   close(): Promise<void> {
//     return this.#resources.close();
//   }
//   async #executeRequest(
//     input: DecodeSignalRecordingInput | InspectSignalDecodersInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const operation = "path" in input ? OPERATION : "inspect_signal_decoders";
//     let phase:
//       | "configuration"
//       | "artifact"
//       | "workspace"
//       | "producer"
//       | "integrity" = "configuration";
//     let capturedOutput: AnalysisCapturedOutput | undefined;
//     let resourcePath = "path" in input ? input.path : "sigrok decoder catalog";
//     let effectiveLimits: LinuxResourceLimits | undefined;
//     let root: ArtifactAnalysisRuntime | undefined;
//     let result: Result<AnalysisExecution, AnalysisError>;
//     try {
//       if (options?.signal?.aborted) throw new AnalysisCancelledError(operation);
//       await this.#resources.release();
//       if (this.platform !== "linux")
//         throw new Error(
//           "Signal decoding requires Linux with util-linux prlimit and REA_SIGROK_COMMAND so expanded recordings are processed under an enforced address-space limit.",
//         );
export const _l = 134;
