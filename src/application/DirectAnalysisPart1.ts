export const __stub = 1;
// import type { ExecutableFormatHint } from "../domain/dosCom.js";
// import type { BinaryArchitecture } from "../domain/binaryTargetTypes.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import type { DirectAnalysisDependencies } from "./DirectAnalysisDependencies.js";
// import type { BinarySession } from "./binary/BinarySession.js";
// import type { SessionProviderRoute } from "./binary/SessionProviderRouter.js";
// import type { ResolvedSessionOpen } from "./binary/BinarySessionOpen.js";
// import { silentLogger } from "../logger.js";
// import type { Logger } from "pino";
// import { createEvidence } from "../domain/evidence.js";
// import type { Evidence } from "../domain/evidence.js";
// import type { NativeToolName } from "../contracts/native/nativeToolContracts.js";
// import {
//   ARTIFACT_ANALYSIS_OPERATIONS,
//   type ArtifactAnalysisOperation,
// } from "../contracts/artifactToolContracts.js";
// import {
//   isManagedToolName,
//   type ManagedToolName,
// } from "../contracts/managed/managedToolContracts.js";
// import {
//   EvidenceFileError,
//   EvidenceIntegrityError,
// } from "../domain/evidenceErrors.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import { access } from "node:fs/promises";
// import { readAnalysisSnapshot } from "./binary/AnalysisSnapshotFiles.js";
// import { requiresNativeSourceAdmissionBeforeReplay } from "./binary/AnalysisSnapshotCache.js";
// import { parseBinaryTarget } from "./BinaryTargetResolver.js";
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
// import {
//   snapshotEvidenceForQuery,
//   snapshotMatchesTarget,
// } from "../domain/analysisSnapshot.js";
// import type { AnalysisProfileCommitment } from "../domain/analysisProfile.js";
// import { err, ok, type Result } from "../domain/result.js";
// import type { AnalysisSnapshot } from "../domain/analysisSnapshot.js";
// import type {
//   AnalysisExecution,
//   ProviderIdentity,
// } from "./AnalysisProvider.js";
// import {
//   REA_WORKFLOW_PROVIDER,
//   workflowAnalysisProfile,
// } from "./InvestigationProviders.js";
// import {
//   executeComposedWorkflow,
//   createWorkflowEvidence,
//   workflowSnapshotRecord,
//   recordWorkflowUnknowns,
// } from "./WorkflowEvidence.js";
// import type { AnalysisProviderSelector } from "../contracts/providerSelection.js";
// import { artifactInspectionResultSchema } from "../domain/artifactInspection.js";
// import { resolveXrefsAddress } from "./XrefsAddressResolution.js";
// import { AnalysisInputError } from "../domain/analysisErrorCore.js";
// import {
//   directAnalysisCleanupFailure,
//   managedAnalysisCleanupFailure,
//   withSessionCleanup,
// } from "./DirectAnalysisCleanup.js";
//
// type DirectAnalysisTool =
//   | "annotate_native_function"
//   | "inspect_native_load_image"
//   | "read_bytes"
//   | "search_bytes"
//   | "address_to_file_offset"
//   | "binary_overview"
//   | "procedure_pseudo_code"
//   | "read_function_instructions"
//   | "inspect_native_instruction"
//   | "inspect_native_data_type"
//   | "resolve_native_call_targets"
//   | "analyze_function"
//   | "inspect_native_api"
//   | "inspect_native_dispatch_metadata"
//   | "search_strings"
//   | "search_procedures"
//   | "xrefs"
//   | "trace_feature"
//   | "trace_native_ui_action"
//   | "trace_native_values";
//
// const ARTIFACT_ANALYSIS_OPERATION_SET: ReadonlySet<string> = new Set(
//   ARTIFACT_ANALYSIS_OPERATIONS,
// );
//
// /**
//  * Open one binary, execute one tool, and always release provider resources.
//  * Unlike MCP mode, every CLI invocation is intentionally isolated and does not
//  * retain a target or provider client for a subsequent command.
//  */
// export const runDirectAnalysis = async (
//   dependencies: DirectAnalysisDependencies,
//   path: string,
//   tool: DirectAnalysisTool,
//   arguments_: Readonly<Record<string, JsonValue>>,
//   options: {
//     readonly logger?: Logger;
//     readonly snapshotPath?: string | undefined;
//     readonly signal?: AbortSignal;
//     readonly providerId?: AnalysisProviderSelector;
//     readonly formatHint?: ExecutableFormatHint;
//     readonly architecture?: BinaryArchitecture;
//     readonly entryPoint?: string;
//   } = {},
// ): Promise<JsonValue> =>
//   withProcessCancellation(options.signal, (signal) =>
//     runAnalysis(dependencies, path, tool, arguments_, {
//       logger: options.logger ?? silentLogger,
//       snapshotPath: options.snapshotPath,
//       signal,
//       ...(options.formatHint === undefined
//         ? {}
//         : { formatHint: options.formatHint }),
//       ...(options.architecture === undefined
//         ? {}
//         : { architecture: options.architecture }),
//       ...(options.entryPoint === undefined
//         ? {}
//         : { entryPoint: options.entryPoint }),
//       ...(options.providerId === undefined
//         ? {}
//         : { providerId: options.providerId }),
//     }),
//   );
//
// /** Execute one provider-native semantic operation with atomic provenance. */
// export const runProviderAnalysis = async (
//   dependencies: DirectAnalysisDependencies,
//   ...[path, tool, arguments_, logger = silentLogger, signal]: readonly [
//     path: string,
//     tool: NativeToolName | ArtifactAnalysisOperation | ManagedToolName,
//     arguments_: Readonly<Record<string, JsonValue>>,
//     logger?: Logger,
//     signal?: AbortSignal,
//   ]
// ): Promise<JsonValue> => {
//   if (isManagedToolName(tool))
//     return runManagedProviderAnalysis(
//       dependencies,
//       path,
//       tool,
//       arguments_,
//       signal,
//     );
//   return withProcessCancellation(signal, (operationSignal) =>
//     runAnalysis(dependencies, path, tool, arguments_, {
//       logger,
//       snapshotPath: undefined,
//       signal: operationSignal,
//       ...(ARTIFACT_ANALYSIS_OPERATION_SET.has(tool)
//         ? { createSession: dependencies.createArtifactBinarySession }
//         : {}),
//     }),
//   );
// };
//
// /** Execute managed metadata inspection in an isolated managed-only session. */
// export const runManagedProviderExecution = async (
export const _l = 161;
