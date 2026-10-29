export const __stub = 1;
// import { z } from "zod";
//
// import type { AnalysisOperationPort } from "../AnalysisProvider.js";
// import type { EnhancedResult } from "../EnhancedToolTypes.js";
// import type { enhancedInputSchemas } from "../../contracts/enhancedInputs.js";
// import { interfaceBuilderAnalysisSchema } from "../../domain/apple/interfaceBuilderGraph.js";
// import {
//   nativeInvestigationGraphSchema,
//   nativeInvestigationTraceSchema,
//   traceNativeInvestigationGraph,
//   joinInterfaceBuilderDispatch,
// } from "../../domain/native/nativeInvestigationGraph.js";
// import { nativeDispatchMetadataResultSchema } from "../../domain/native/objcSwiftMetadata.js";
// import { inspectNativeDispatch } from "./NativeDispatchMetadataInspection.js";
// import { jsonValueSchema } from "../../domain/jsonValue.js";
// import { readNativeCallRoutes } from "./NativeCallRoutes.js";
// import {
//   renderSourceLimitations,
//   type SourceLimitation,
// } from "../SourceLimitations.js";
// import { err, ok } from "../../domain/result.js";
// import { AnalysisOutputError } from "../../domain/analysisErrorCore.js";
// import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
//
// type Input = z.output<typeof enhancedInputSchemas.trace_native_ui_action>;
// /** Build a UI-to-code trace from the active app and selected native provider. */
// export const traceNativeUiAction = async (
//   analysis: AnalysisOperationPort,
//   input: Input,
//   signal?: AbortSignal,
// ): EnhancedResult => {
//   const [uiExecution, metadataExecution] = await Promise.all([
//     analysis.execute(
//       "decode_interface_builder",
//       {
//         max_documents: 64,
//         max_objects: input.max_nodes,
//         max_connections: input.max_edges,
//       },
//       signal === undefined ? {} : { signal },
//     ),
//     inspectNativeDispatch(analysis, 20_000, signal),
//   ]);
//   if (!uiExecution.ok && uiExecution.error._tag === "AnalysisCancelledError")
//     return err(uiExecution.error);
//   if (!metadataExecution.ok) return err(metadataExecution.error);
//   const metadata = nativeDispatchMetadataResultSchema.parse(
//     metadataExecution.value,
//   );
//   const targetSha256 = metadata.target_sha256;
//   if (targetSha256 === null)
//     return err(
//       new AnalysisOutputError(
//         "inspect_native_dispatch_metadata",
//         "Dispatch metadata lacks target identity",
//       ),
//     );
//
//   let graph = emptyGraph(targetSha256, metadata.provider);
//   const coverage = [];
//   if (uiExecution.ok) {
//     const decoded = interfaceBuilderAnalysisSchema.safeParse(
//       uiExecution.value.result,
//     );
//     if (!decoded.success)
//       return err(
//         new AnalysisOutputError(
//           "decode_interface_builder",
//           "artifact provider returned an invalid interface graph",
//         ),
//       );
//     if (decoded.data.target_sha256 !== targetSha256)
//       return err(
//         new AnalysisOutputError(
//           "decode_interface_builder",
//           "UI and native provider results refer to different target SHA-256 values",
//         ),
//       );
//     graph = joinInterfaceBuilderDispatch(decoded.data.graph, metadata.result);
//     const archiveDecode = decoded.data.graph.coverage.find(
//       (facet) => facet.facet === "archive_decode",
//     );
//     const documentsFound = decoded.data.documents.length > 0;
//     coverage.push({
//       facet: "interface_builder_archives",
//       status:
//         archiveDecode?.status === "partial" ||
//         archiveDecode?.status === "complete" ||
//         archiveDecode?.status === "unsupported"
//           ? archiveDecode.status
//           : documentsFound
//             ? "complete"
//             : "unsupported",
//       reason:
//         archiveDecode?.reason ??
//         (documentsFound
//           ? null
//           : "no_compiled_interface_builder_archives_found"),
//       examined: archiveDecode?.examined ?? decoded.data.documents.length,
//       omitted: archiveDecode?.omitted ?? 0,
//     });
//     const bounded = boundUiGraph(graph, input.max_nodes, input.max_edges);
//     graph = bounded.graph;
//     if (bounded.truncated)
//       coverage.push({
//         facet: "interface_builder_graph",
//         status: "partial",
//         reason: "native_trace_output_bounds_reached",
//         examined:
//           decoded.data.graph.nodes.length + decoded.data.graph.edges.length,
//         omitted: bounded.omitted,
//       });
//   } else {
//     coverage.push({
//       facet: "interface_builder_archives",
//       status: "unsupported",
//       reason: projectAnalysisError(uiExecution.error).message,
//       examined: 0,
//       omitted: 0,
//     });
//   }
//
//   let selected = resolveUiAction(graph, input.action);
//   if (selected.nodeId === null && selected.candidates.length === 0) {
//     const native = await analysis.execute(
//       "procedure_address",
//       { procedure: input.action },
//       signal === undefined ? {} : { signal },
//     );
//     if (!native.ok && native.error._tag === "AnalysisCancelledError")
//       return err(native.error);
//     if (
//       !native.ok &&
//       native.error._tag !== "AnalysisCapabilityUnavailableError"
//     )
//       return err(native.error);
//     if (native.ok) {
//       const address = z.string().safeParse(native.value.result);
//       if (!address.success || native.value.subject?.sha256 !== targetSha256)
//         return err(
//           new AnalysisOutputError(
//             "procedure_address",
//             "Native seed lacks a validated address or matching target identity",
//           ),
//         );
//       const id = `native:function:${address.data}`;
//       graph.nodes.push({
//         id,
export const _l = 148;
