export const __stub = 1;
// import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
// import { fileURLToPath } from "node:url";
// import { GHIDRA_BRIDGE_SOURCES } from "./GhidraBridgeSources.js";
//
// import {
//   createAnalysisExecution,
//   type AnalysisClient,
//   type AnalysisClientContext,
//   type AnalysisOperation,
// } from "../application/AnalysisProvider.js";
// import type { AppConfig } from "../config/types.js";
// import {
//   ghidraSeedCommitmentSchema,
//   ghidraSeedFailure,
//   ghidraSeedLimitations,
// } from "./GhidraAnalysisSeeds.js";
// import {
//   ghidraPinnedLanguage,
//   ghidraProfileDisabledAnalyzers,
//   ghidraProfileLanguageOverride,
//   sameGhidraDisabledAnalyzers,
//   sameGhidraLanguageOverride,
// } from "./GhidraAnalysisProfile.js";
// import { ghidraPinnedMipsLanguage } from "./GhidraMipsProfile.js";
// import type { AnalysisProfileCommitment } from "../domain/analysisProfile.js";
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
// import {
//   AnalysisCancelledError,
//   AnalysisArtifactChangedError,
//   AnalysisAccessDeniedError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
//   AnalysisResourceConstraintError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import type { EvidenceLocation } from "../domain/evidence.js";
// import type { RelationshipCoverage } from "../domain/relationshipCoverage.js";
// import {
//   providerRetryAction,
//   type ProviderOperationHealth,
// } from "../domain/providerOperationHealth.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { err, ok, type Result } from "../domain/result.js";
// import type { Logger } from "pino";
// import { GhidraClient } from "./GhidraClient.js";
// import type { GhidraClientOptions } from "./GhidraClientTypes.js";
// import {
//   isGhidraFunctionOperation,
//   parseGhidraFunctionInput,
//   parseGhidraFunctionResult,
// } from "./GhidraFunctionValues.js";
// import {
//   isGhidraInventoryOperation,
//   parseGhidraInventoryInput,
//   parseGhidraInventoryResult,
// } from "./GhidraInventoryValues.js";
// import {
//   ghidraInstallationDiagnostics,
//   type GhidraInstallationInspection,
// } from "./GhidraInstallation.js";
// import {
//   isGhidraPspTarget,
//   GHIDRA_PSP_LIMITATIONS,
// } from "./GhidraPspProfile.js";
// import { ghidraPspExtensionSchema } from "./GhidraPspExtension.js";
// import {
//   GHIDRA_MIPS_SOFT_FLOAT_STORAGE,
//   ghidraMipsSoftFloatFailure,
//   ghidraMipsRelocatableLimitations,
//   ghidraMipsSharedLimitations,
//   ghidraMipsSoftFloatLimitations,
//   isGhidraMipsSoftFloatTarget,
// } from "./GhidraMipsProfile.js";
// import { ghidraRiscvLimitations } from "./GhidraRiscvProfile.js";
// import { ghidraPePdbLimitations } from "./GhidraPeProfile.js";
// import { unverifiedGhidraBuildLimitation } from "./GhidraReleasePolicy.js";
// import { GhidraHeadlessLauncher } from "./GhidraLauncher.js";
// import { attestGhidraNativeLoadImage } from "./GhidraLoadImageAttest.js";
// import {
//   NATIVE_AOT_MAX_REPORT_BYTES,
//   NATIVE_AOT_MAX_SOURCE_BYTES,
//   nativeAotSnapshotOverCapacity,
//   parseNativeAotPe,
//   type NativeAotPeResult,
// } from "../domain/native/nativeAotPe.js";
// import { ABORTED, waitForAbortable } from "../process/AbortablePromise.js";
// import { nativeLoadImageObservationSchema } from "../domain/native/nativeLoadImage.js";
// import {
//   GHIDRA_PROVIDER_IDENTITY,
//   healthLimitations,
//   windowsP0Limitations,
//   limitationsFor,
// } from "./GhidraProviderCapabilities.js";
// import type { GhidraSessionError } from "./GhidraSessionError.js";
// import type { GhidraSessionInfo } from "./GhidraSessionValues.js";
// import { ghidraExtensionFailure } from "./extensions/GhidraExtensionFailures.js";
// import {
//   ghidraExtensionSchema,
//   validateGhidraExtensionProfile,
//   ghidraExtensionLimitations,
// } from "./extensions/GhidraExtensions.js";
// import { inspectWindowsNativeReadiness } from "../process/WindowsAuthority.js";
// import { ghidraRawBinaryLanguage } from "./GhidraRawBinaryLanguage.js";
//
// /** Production seam for exercising provider projection without a real process. */
// export type GhidraProviderClientFactory = (
//   options: GhidraClientOptions,
// ) => Pick<GhidraClient, "start" | "callTool" | "close"> &
//   Partial<
//     Pick<
//       GhidraClient,
//       | "callToolIfReady"
//       | "operationHealthSnapshot"
//       | "runtimeLineage"
//       | "readTargetSnapshot"
//       | "hashTargetSnapshot"
//     >
//   >;
//
// type GhidraProviderClientInstance = ReturnType<GhidraProviderClientFactory>;
//
// type NativeAotSnapshotOwner = {
//   readonly derive: (
//     imageBase: string,
//     operation: AnalysisOperation,
//     callerSignal: AbortSignal | undefined,
//     observations: JsonValue,
//   ) => Promise<Result<NativeAotPeResult, AnalysisError>>;
//   readonly readTypeDetail: (
//     address: string,
//   ) => ReturnType<NativeAotPeResult["readTypeDetail"]>;
//   readonly close: () => void;
// };
//
// /** Own one session's captured PE snapshot and immutable NativeAOT derivation. */
// const createNativeAotSnapshotOwner = (input: {
//   readonly client: GhidraProviderClientInstance;
//   readonly target: BinaryTarget;
//   readonly startupTimeoutMs: number;
// }): NativeAotSnapshotOwner => {
//   const { client, target, startupTimeoutMs } = input;
//   const controller = new AbortController();
//   let identity: string | undefined;
//   let result: NativeAotPeResult | undefined;
//   let pending:
//     | {
//         readonly identity: string;
//         readonly promise: Promise<Result<NativeAotPeResult, AnalysisError>>;
//       }
//     | undefined;
//   let closed = false;
//   let identityConflict = false;
//   let identityConflictObservation:
//     | { readonly imageBase: string; readonly observations: JsonValue }
//     | undefined;
//   const identityError = (
//     operation: AnalysisOperation,
//     reason: string,
//     observedBase: string,
//     observations: JsonValue,
//   ): AnalysisError =>
//     new ProviderAdapterError("ghidra", operation, {
//       diagnostics: {
//         reason,
//         artifact_sha256: target.sha256,
//         bound_image_base:
//           identity === undefined
//             ? null
//             : `0x${identity.slice(target.sha256.length + 1)}`,
//         observed_image_base: observedBase,
//         measured_observation: observations,
//         conflicting_image_base: identityConflictObservation?.imageBase ?? null,
//         conflicting_observation:
//           identityConflictObservation?.observations ?? null,
//       },
//     });
//   const identityConflictFailure = (
//     operation: AnalysisOperation,
//     observedBase: string,
//     observations: JsonValue,
//   ): Result<NativeAotPeResult, AnalysisError> => {
//     return err(
//       identityError(
//         operation,
//         "The Ghidra session reported conflicting loaded image bases; reopen the analysis session to establish a new identity.",
//         observedBase,
//         observations,
//       ),
//     );
//   };
//   const derive = async (
//     imageBase: string,
//     operation: AnalysisOperation,
//     callerSignal: AbortSignal | undefined,
//     observations: JsonValue,
//   ): Promise<Result<NativeAotPeResult, AnalysisError>> => {
//     if (callerSignal?.aborted || closed)
//       return err(new AnalysisCancelledError(operation));
//     if (identityConflict)
//       return identityConflictFailure(operation, imageBase, observations);
//     if (controller.signal.aborted)
//       return err(new AnalysisCancelledError(operation));
//     let normalizedBase: string;
//     try {
//       normalizedBase = BigInt(imageBase).toString(16);
//     } catch (cause: unknown) {
//       return err(
//         new ProviderAdapterError("ghidra", operation, {
//           diagnostics: {
//             reason:
//               "Ghidra returned an invalid loaded image base for NativeAOT identity binding.",
//             artifact_sha256: target.sha256,
//             observed_image_base: imageBase,
//             measured_observation: observations,
//           },
//           cause,
//         }),
//       );
//     }
//     const key = `${target.sha256}:${normalizedBase}`;
//     if (identity !== undefined && identity !== key) {
//       identityConflict = true;
//       identityConflictObservation = { imageBase, observations };
//       result = undefined;
//       controller.abort();
//       return err(
//         identityError(
//           operation,
//           "The Ghidra session reported a different loaded image base after NativeAOT metadata was bound to its captured snapshot; reopen the analysis session to establish a new identity.",
//           imageBase,
//           observations,
//         ),
//       );
//     }
//     identity ??= key;
//     if (result !== undefined) {
//       const settled = await waitForAbortable(
//         Promise.resolve(ok(result)),
//         callerSignal,
//       );
//       if (closed) return err(new AnalysisCancelledError(operation));
//       if (identityConflict)
//         return identityConflictFailure(operation, imageBase, observations);
//       if (controller.signal.aborted)
//         return err(new AnalysisCancelledError(operation));
//       return settled === ABORTED
//         ? err(new AnalysisCancelledError(operation))
//         : settled;
//     }
//     if (pending !== undefined && pending.identity !== key)
//       return err(
//         identityError(
//           operation,
//           "A NativeAOT snapshot derivation is already bound to a different loaded image base.",
//           imageBase,
//           observations,
//         ),
//       );
//     if (pending === undefined) {
//       const promise: Promise<Result<NativeAotPeResult, AnalysisError>> =
//         (async () => {
//           try {
//             if (client.readTargetSnapshot === undefined)
//               return err(
//                 new ProviderAdapterError("ghidra", operation, {
//                   diagnostics: {
//                     reason:
//                       "The Ghidra client does not expose its immutable target snapshot for NativeAOT metadata inspection.",
//                   },
//                 }),
//               );
//             const snapshot = await client.readTargetSnapshot(
//               NATIVE_AOT_MAX_SOURCE_BYTES,
//               controller.signal,
//             );
//             if (!snapshot.ok)
//               return err(
//                 projectSessionError(
//                   operation,
//                   snapshot.error,
//                   startupTimeoutMs,
//                 ),
//               );
//             if (closed) return err(new AnalysisCancelledError(operation));
//             if (identityConflict)
//               return identityConflictFailure(
//                 operation,
//                 imageBase,
export const _l = 290;
