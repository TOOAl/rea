export const __stub = 1;
// import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
// import {
//   NATIVE_MACOS_PROVIDER_IDENTITY as IDENTITY,
//   nativeMacOSCapabilities,
// } from "./NativeMacOSProviderMetadata.js";
// import { inspectAppleDispatchMetadata } from "./AppleDispatchMetadata.js";
// import { observeNativeUi } from "./NativeUiObservation.js";
// import { LldbCallTracer, type NativeCallTracer } from "./LldbCallTracer.js";
// import { observeNativeCalls } from "./NativeCallObservation.js";
// import { basename, dirname, isAbsolute, resolve } from "node:path";
// import { open, realpath, stat } from "node:fs/promises";
//
// import { z } from "zod";
//
// import {
//   createAnalysisExecution,
//   type AnalysisClient,
//   type AnalysisOperation,
//   type AnalysisProvider,
//   type CapabilityDescriptor,
//   type ProviderIdentity,
// } from "../application/AnalysisProvider.js";
// import {
//   NATIVE_TOOL_CONTRACTS,
//   type NativeToolName,
// } from "../contracts/native/nativeToolContracts.js";
// import {
//   isMachOFormat,
//   type BinaryTarget,
// } from "../domain/binaryTargetTypes.js";
// import { toolContract } from "../contracts/toolContracts.js";
// import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";
// import type { EvidenceLocation } from "../domain/evidence.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
//   AnalysisOutputError,
//   AnalysisResourceConstraintError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import { BinaryTargetError } from "../domain/configurationErrors.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import type { NativeUiObservationResult } from "../domain/native/nativeUiObservation.js";
// import {
//   omittedPrototypeKeysLimitation,
//   parseXmlPropertyList,
// } from "../domain/propertyListKeys.js";
// import {
//   demangleSwiftSchema,
//   inspectPlistSchema,
//   inspectSignatureSchema,
//   listArchitecturesSchema,
//   type NativeCommandInvocation,
// } from "../domain/native/nativeInspection.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   NATIVE_COMMAND_TIMEOUT_MS,
//   NATIVE_COMMAND_OUTPUT_BUDGET_BYTES,
//   NativeCommandFailure,
//   XcrunCommandRunner,
//   failureCapture,
//   type NativeCommandCleanupFailure,
//   type NativeCommandCapture,
//   type NativeCommandRunner,
// } from "./CommandRunner.js";
// import {
//   withSignatureTarget,
//   verifySignatureTarget,
//   type SignatureTargetBinding,
// } from "./SignatureTargetBinding.js";
// import { parseCodeSignature } from "./parsers/codesign.js";
// import { parseDemangledSymbols } from "./parsers/demangle.js";
// import { parseLipoOutput } from "./parsers/lipo.js";
// import {
//   parsePlistJson,
//   parsePlistXml,
//   plistJsonNeedsNumberTypes,
// } from "./parsers/plist.js";
// import {
//   architectureLocations,
//   inspectNativeMacho,
// } from "./NativeMachoInspection.js";
// import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";
// import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
// import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
// import type { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
// import {
//   createNativeUiHelperRuntime,
//   type NativeUiHelperRuntime,
// } from "./NativeUiHelperRuntime.js";
//
// type SignatureRuntimeRootFactory = () => Promise<
//   Pick<PrivateRuntimeRoot, "path" | "close">
// >;
//
// /** Read-only semantic provider composed from Xcode command-line utilities. */
// export class NativeMacOSProvider implements AnalysisProvider {
//   readonly #capabilities: readonly CapabilityDescriptor[];
//   readonly #environment: NodeJS.ProcessEnv;
//   readonly #tracerFactory: () => NativeCallTracer;
//   readonly #privateRuntimeRootFactory: SignatureRuntimeRootFactory | undefined;
//
//   constructor(
//     environment: Readonly<NodeJS.ProcessEnv>,
//     private readonly runner: NativeCommandRunner = new XcrunCommandRunner(
//       environment,
//     ),
//     platform: NodeJS.Platform = process.platform,
//     tracerFactory?: () => NativeCallTracer,
//     privateRuntimeRootFactory?: SignatureRuntimeRootFactory,
//   ) {
//     this.#environment = snapshotEnvironment(environment, platform);
//     this.#tracerFactory =
//       tracerFactory ?? (() => new LldbCallTracer(this.#environment));
//     this.#privateRuntimeRootFactory = privateRuntimeRootFactory;
//     this.#capabilities = nativeMacOSCapabilities(platform);
//   }
//
//   identity(): ProviderIdentity {
//     return IDENTITY;
//   }
//
//   capabilities(): readonly CapabilityDescriptor[] {
//     return this.#capabilities;
//   }
//
//   createClient(target: BinaryTarget): AnalysisClient {
//     return new NativeMacOSClient(
//       target,
//       this.runner,
//       this.#tracerFactory(),
//       this.#environment,
//       this.#privateRuntimeRootFactory,
//     );
//   }
// }
//
// class NativeMacOSClient implements AnalysisClient {
//   readonly #pendingNativeUiRuntimes = new Set<NativeUiHelperRuntime>();
//   readonly #pendingCommands = new Set<Promise<unknown>>();
//   readonly #signatureResources = new ArtifactResourceScope();
//   #nativeUiTail: Promise<void> = Promise.resolve();
//   #closed = false;
//
//   constructor(
//     private readonly target: BinaryTarget,
//     private readonly runner: NativeCommandRunner,
//     private readonly tracer: NativeCallTracer,
//     private readonly environment: Readonly<NodeJS.ProcessEnv>,
//     private readonly privateRuntimeRootFactory:
//       | SignatureRuntimeRootFactory
//       | undefined,
//   ) {}
//
//   async execute(
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options?: { readonly signal?: AbortSignal },
//   ) {
//     if (this.#closed)
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           IDENTITY.id,
//           operation,
//           "Native provider client is closed",
//         ),
//       );
//     if (options?.signal?.aborted === true)
//       return err(new AnalysisCancelledError(operation));
//     if (operation === "health")
//       return ok(createAnalysisExecution(null, IDENTITY));
//     if (operation === "inspect_native_dispatch_metadata") {
//       const input = toolContract(operation).inputSchema.safeParse(parameters);
//       if (!input.success)
//         return err(
//           analysisInputErrorFromIssues(
//             operation,
//             input.error.issues,
//             parameters,
//             {
//               cause: input.error,
//             },
//           ),
//         );
//       if (
//         this.target.kind !== "executable" ||
//         !isMachOFormat(this.target.format)
//       )
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             IDENTITY.id,
//             operation,
//             "Binary Apple metadata requires Mach-O; other providers can report symbol-only metadata",
//           ),
//         );
//       try {
//         const result = await inspectAppleDispatchMetadata(
//           this.target,
//           input.data.max_records,
//           options?.signal,
//         );
//         return ok(
//           createAnalysisExecution(result, result.provider, {
//             locations: [{ kind: "artifact-path", path: this.target.path }],
//             limitations: result.result.coverage.flatMap(({ reason }) =>
//               reason === null ? [] : [reason],
//             ),
//           }),
//         );
//       } catch (cause) {
//         if (cause instanceof AnalysisError) return err(cause);
//         return err(
//           options?.signal?.aborted
//             ? new AnalysisCancelledError(operation)
//             : new ProviderAdapterError(IDENTITY.id, operation, {
//                 cause,
//                 diagnostics: {
//                   target_path: this.target.path,
//                   reason:
//                     cause instanceof Error ? cause.message : String(cause),
//                 },
//               }),
//         );
//       }
//     }
//     if (!isNativeOperation(operation))
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           IDENTITY.id,
//           operation,
//           "Operation is not implemented by native macOS tools.",
//         ),
//       );
//     if (operation === "observe_native_calls") {
//       const result = await observeNativeCalls(
//         this.target,
//         parameters,
//         this.tracer,
//         options?.signal,
//       );
//       return result.ok
//         ? ok(
//             createAnalysisExecution(result.value, IDENTITY, {
//               limitations: result.value.limitations,
//               locations: [{ kind: "artifact-path", path: this.target.path }],
//             }),
//           )
//         : result;
//     }
//     if (
//       operation === "observe_native_ui" ||
//       operation === "capture_native_ui_scenario"
//     ) {
//       return this.#observeNativeUi(operation, parameters, options?.signal);
//     }
//     try {
//       const observation = await this.#dispatch(
//         operation,
//         parameters,
//         options?.signal,
//       );
//       return observation.ok
//         ? ok(
//             createAnalysisExecution(observation.value.result, IDENTITY, {
//               limitations: observation.value.limitations,
//               locations: observation.value.locations,
//             }),
//           )
//         : observation;
//     } catch (cause: unknown) {
//       return err(
//         new AnalysisOutputError(operation, "Native output parsing failed", {
//           cause,
//         }),
//       );
//     }
//   }
//
//   async close(): Promise<Result<null, AnalysisError>> {
//     this.#closed = true;
//     await Promise.allSettled(this.#pendingCommands);
//     const uiCleanupFailures = await this.#serializeNativeUi(() =>
//       this.#retryNativeUiCleanup(),
//     );
//     let signatureCleanup: AnalysisError | undefined;
//     try {
//       await this.#signatureResources.close();
//     } catch (cause: unknown) {
//       const observation = ArtifactReaderFailure.cleanupObservation(
//         cause,
//         "signature-snapshot",
//       );
//       signatureCleanup = new ProviderCleanupError(
export const _l = 297;
