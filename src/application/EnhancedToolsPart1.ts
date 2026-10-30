export const __stub = 1;
// import { z } from "zod";
//
// import type {
//   AnalysisExecution,
//   AnalysisOperation,
//   AnalysisOperationPort,
//   ExecutionOptions,
// } from "./AnalysisProvider.js";
// import type { EnhancedToolName } from "../contracts/enhancedInputs.js";
// import { enhancedInputSchemas } from "../contracts/enhancedInputs.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisOutputError,
// } from "../domain/analysisErrorCore.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import {
//   addressDistance,
//   functionDossierSchema,
//   parseFunctionDossier,
//   parseListCount,
//   parseRelatedAddresses,
//   parseSegments,
//   parseSegmentImageBase,
// } from "../domain/hopperValues.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   categorizeSwiftTypes,
//   discoverObjcClasses,
//   discoverObjcProtocols,
// } from "../domain/symbolAnalysis.js";
// import { inspectNativeDispatch } from "./native/NativeDispatchMetadataInspection.js";
// import { traceNativeValues } from "./native/NativeValueTrace.js";
// import { traceNativeUiAction } from "./native/NativeUiActionTrace.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
//
// import {
//   invalidEnhancedInput,
//   type EnhancedResult,
//   type ValidatedEnhancedCall,
// } from "./EnhancedToolTypes.js";
// import { resolveAnalysisDocument } from "./AnalysisDocument.js";
// import { traceCallPath } from "./CallPathTracing.js";
// import { resolveProcedureAddress } from "./ProcedureAddressResolution.js";
// import { traceLiteralFeature } from "./EnhancedLiteralTracing.js";
// import { projectNativeApiInspection } from "./native/NativeApiInspection.js";
//
// type BatchProcedureIdentity =
//   | {
//       readonly status: "resolved";
//       readonly address: string;
//       readonly name: string | null;
//       readonly name_error?: ReturnType<typeof projectAnalysisError>;
//     }
//   | {
//       readonly status: "unknown";
//       readonly error: ReturnType<typeof projectAnalysisError>;
//     };
//
// type BatchResolution = {
//   readonly address: string;
//   readonly result: Result<string, AnalysisError>;
// };
//
// type BatchReadyItem = {
//   readonly address: string;
//   readonly procedure: BatchProcedureIdentity;
//   readonly providerProcedure: string;
// };
//
// type BatchDecompileItem = {
//   readonly address: string;
//   readonly procedure: BatchProcedureIdentity;
//   readonly status: "ok" | "error";
//   readonly pseudocode?: string;
//   readonly error?: ReturnType<typeof projectAnalysisError>;
// };
//
// const isAnalysisCancellation = (
//   error: AnalysisError,
// ): error is AnalysisCancelledError => error._tag === "AnalysisCancelledError";
//
// const firstAnalysisCancellation = <Value>(
//   results: readonly Result<Value, AnalysisError>[],
// ): AnalysisCancelledError | undefined => {
//   for (const result of results)
//     if (!result.ok && isAnalysisCancellation(result.error)) return result.error;
//   return undefined;
// };
//
// /**
//  * Composes direct provider operations into bounded reverse-engineering tools.
//  * Direct callers use `execute`; adapters that own validation use
//  * `executeValidated` so an MCP input is parsed exactly once.
//  */
// export class EnhancedTools {
//   constructor(private readonly analysis: AnalysisOperationPort) {}
//
//   /** Parse an untrusted direct-call input once, then dispatch exhaustively. */
//   execute(
//     name: EnhancedToolName,
//     input: unknown,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     if (name === "trace_feature" || name === "trace_call_path")
//       return this.#executeTracing(name, input, signal);
//     if (name === "trace_native_values") {
//       const parsed = enhancedInputSchemas.trace_native_values.safeParse(input);
//       return parsed.success
//         ? this.executeValidated({ name, input: parsed.data }, signal)
//         : invalidEnhancedInput(name, parsed.error);
//     }
//     if (name === "trace_native_ui_action") {
//       const parsed =
//         enhancedInputSchemas.trace_native_ui_action.safeParse(input);
//       return parsed.success
//         ? this.executeValidated({ name, input: parsed.data }, signal)
//         : invalidEnhancedInput(name, parsed.error);
//     }
//     if (name === "analyze_function" || name === "inspect_native_api")
//       return this.#executeFunctionAnalysis(name, input, signal);
//     switch (name) {
//       case "inspect_native_dispatch_metadata": {
//         const parsed =
//           enhancedInputSchemas.inspect_native_dispatch_metadata.safeParse(
//             input,
//           );
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//       case "get_objc_classes": {
//         const parsed = enhancedInputSchemas.get_objc_classes.safeParse(input);
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//       case "get_objc_protocols":
//         return this.executeValidated({ name, input: {} }, signal);
//       case "batch_decompile": {
//         const parsed = enhancedInputSchemas.batch_decompile.safeParse(input);
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//       case "get_call_graph": {
//         const parsed = enhancedInputSchemas.get_call_graph.safeParse(input);
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//       case "analyze_swift_types": {
//         const parsed =
//           enhancedInputSchemas.analyze_swift_types.safeParse(input);
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//       case "find_xrefs_to_name": {
//         const parsed = enhancedInputSchemas.find_xrefs_to_name.safeParse(input);
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//       case "binary_overview": {
//         const parsed = enhancedInputSchemas.binary_overview.safeParse(input);
//         return parsed.success
//           ? this.executeValidated({ name, input: parsed.data }, signal)
//           : invalidEnhancedInput(name, parsed.error);
//       }
//     }
//   }
//
//   /** Dispatch input already parsed by a trusted adapter boundary. */
//   executeValidated(
//     call: ValidatedEnhancedCall,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     switch (call.name) {
//       case "inspect_native_dispatch_metadata":
//         return this.#inspectNativeDispatchMetadata(
export const _l = 183;
