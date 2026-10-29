export const __stub = 1;
// import {
//   type InspectPacketFieldsInput,
//   packetFieldsCatalogSchema,
// } from "../domain/captures/packetFields.js";
// import {
//   parseFieldDiscovery,
//   FieldDiscoveryBudgetError,
//   FIELD_RECORD_BUDGET,
// } from "./parseFieldDiscovery.js";
// import {
//   BOUNDED_PRODUCER_LIMITS as LIMITS,
//   prlimitArgumentVector,
//   readLinuxResourceLimits,
//   type LinuxResourceLimits,
// } from "../process/LinuxResourceLimits.js";
// import { parsePacketOutput } from "./parsePacketOutput.js";
// import { randomUUID } from "node:crypto";
// import { constants } from "node:fs";
// import { access, mkdir, realpath, writeFile } from "node:fs/promises";
// import { isAbsolute, join } from "node:path";
// import {
//   createAnalysisExecution,
//   type AnalysisExecution,
//   type ExecutionOptions,
// } from "../application/AnalysisProvider.js";
// import type { PacketCapturePort } from "../application/captures/PacketCaptureService.js";
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
// import {
//   type InspectPacketCaptureInput,
//   packetCaptureSchema,
// } from "../domain/captures/packetCapture.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   runOwnedCommand,
//   OwnedCommandFailure,
// } from "../process/OwnedCommand.js";
// import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
//
// const OPERATION = "inspect_packet_capture";
// export const TSHARK_PROVIDER_IDENTITY = {
//   id: "tshark-capture",
//   name: "REA TShark capture adapter",
//   version: "tshark@4",
// } as const;
// type Launcher = NonNullable<Parameters<typeof runOwnedCommand>[2]>["launcher"];
//
// /** Inspect selected capture files only, retaining cleanup ownership across failures. */
// export class TsharkCaptureProvider implements PacketCapturePort {
//   readonly #resources: ArtifactAnalysisResources;
//   constructor(
//     readonly environment: Readonly<NodeJS.ProcessEnv> = process.env,
//     readonly launcher?: Launcher,
//     readonly createRuntime: () => Promise<ArtifactAnalysisRuntime> = () =>
//       PrivateRuntimeRoot.create({ prefix: "rea-tshark-" }),
//     readonly platform: NodeJS.Platform = process.platform,
//     readonly readArtifact: typeof readStableArtifact = readStableArtifact,
//     readonly readLimits: typeof readLinuxResourceLimits = readLinuxResourceLimits,
//   ) {
//     this.#resources = new ArtifactAnalysisResources(
//       TSHARK_PROVIDER_IDENTITY.id,
//       OPERATION,
//       readArtifact,
//       readLimits,
//       {
//         message:
//           "A packet inspection is already active; retry after it completes.",
//         details: { max_concurrent_inspections: 1 },
//       },
//     );
//   }
//   inspect(
//     input: InspectPacketCaptureInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     return this.#resources.run(
//       () => this.#executeRequest(input, options),
//       options?.signal,
//     );
//   }
//   inspectFields(
//     input: InspectPacketFieldsInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     return this.#resources.run(
//       () => this.#executeRequest(input, options),
//       options?.signal,
//       "inspect_packet_fields",
//     );
//   }
//   close(): Promise<void> {
//     return this.#resources.close();
//   }
//   async #executeRequest(
//     input: InspectPacketCaptureInput | InspectPacketFieldsInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const operation = "path" in input ? OPERATION : "inspect_packet_fields";
//     // TShark 4.6.9 emits a 22.3 MB glossary; keep capture output capped at 4 MiB.
//     const limits =
//       "path" in input ? LIMITS : { ...LIMITS, output_bytes: 32 * 1024 * 1024 };
//     let phase:
//       | "configuration"
//       | "artifact"
//       | "workspace"
//       | "producer"
//       | "integrity" = "configuration";
//     let capturedOutput: AnalysisCapturedOutput | undefined;
//     let resourcePath = "path" in input ? input.path : "TShark field glossary";
//     let effectiveLimits: LinuxResourceLimits | undefined;
//     let root: ArtifactAnalysisRuntime | undefined;
//     let result: Result<AnalysisExecution, AnalysisError>;
//     try {
//       if (options?.signal?.aborted) throw new AnalysisCancelledError(operation);
//       await this.#resources.release();
//       if (this.platform !== "linux")
//         throw new Error(
//           "Packet inspection requires Linux with util-linux prlimit and REA_TSHARK_COMMAND so expanded captures are processed under an enforced address-space limit.",
//         );
//       const configured = this.environment.REA_TSHARK_COMMAND ?? "";
//       if (!isAbsolute(configured))
//         throw new Error("Supply absolute REA_TSHARK_COMMAND for TShark 4.x.");
//       const command = await realpath(configured);
//       await access(command, constants.X_OK);
//       const tool = await this.#resources.read(
export const _l = 144;
