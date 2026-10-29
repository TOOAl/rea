export const __stub = 1;
//         kind: "function",
//         name: input.action,
//         location: { address: address.data, file_offset: null },
//         attributes: { resolved_by: native.value.provider.id },
//         evidence: [
//           {
//             kind: "reference",
//             description: `Provider resolved the explicit native seed ${input.action}`,
//             location: { address: address.data, file_offset: null },
//             artifact_path: null,
//             artifact_sha256: targetSha256,
//           },
//         ],
//       });
//       selected = { nodeId: id, candidates: [], reason: null };
//     }
//   }
//   if (selected.nodeId === null) {
//     coverage.push(...graph.coverage);
//     const trace = {
//       target_sha256: graph.target_sha256,
//       provider: graph.provider,
//       start: input.action,
//       direction: "forward" as const,
//       nodes: selected.candidates,
//       edges: [],
//       unresolved: [],
//       reached_depth: 0,
//       truncated: graph.truncated,
//       reason: selected.reason,
//       coverage,
//       limitations: [
//         "The query did not identify one unique authored UI action or native function; no handler path was inferred.",
//       ],
//     };
//     return ok(
//       jsonValueSchema.parse(nativeInvestigationTraceSchema.parse(trace)),
//     );
//   }
//
//   const initial = traceNativeInvestigationGraph(graph, {
//     start: selected.nodeId,
//     direction: "forward",
//     limits: {
//       max_depth: input.max_depth,
//       max_nodes: input.max_nodes,
//       max_edges: input.max_edges,
//     },
//   });
//   const expanded = await addDirectCallees({
//     analysis,
//     graph,
//     initial,
//     input,
//     targetSha256,
//     signal,
//   });
//   if (expanded.error !== undefined) return err(expanded.error);
//   coverage.push({
//     facet: "static_native_calls",
//     status: "partial",
//     reason:
//       "typed_direct_and_indirect_references_do_not_cover_all_runtime_dispatch; untyped_provider_callees_remain_inferred",
//     examined: expanded.examined,
//     omitted: expanded.omitted,
//   });
//   coverage.push({
//     facet: "cross_function_value_flow",
//     status: "unsupported",
//     reason:
//       "call edges identify control-flow candidates but do not recover argument, return, or shared-memory value relationships",
//     examined: 0,
//     omitted: 0,
//   });
//
//   const finalGraph = nativeInvestigationGraphSchema.parse({
//     ...graph,
//     nodes: expanded.nodes,
//     edges: expanded.edges,
//     coverage: [...graph.coverage, ...coverage],
//     truncated: graph.truncated || expanded.truncated,
//   });
//   const trace = traceNativeInvestigationGraph(finalGraph, {
//     start: selected.nodeId,
//     direction: "forward",
//     limits: {
//       max_depth: input.max_depth,
//       max_nodes: input.max_nodes,
//       max_edges: input.max_edges,
//     },
//   });
//   return ok(
//     jsonValueSchema.parse(
//       nativeInvestigationTraceSchema.parse({
//         ...trace,
//         truncated: trace.truncated || expanded.truncated || graph.truncated,
//         reason:
//           expanded.truncated && trace.reason === null
//             ? "native_call_traversal_bound_reached"
//             : graph.truncated && trace.reason === null
//               ? "native_trace_output_bound_reached"
//               : trace.reason,
//         limitations: [
//           ...trace.limitations,
//           ...renderSourceLimitations(expanded.limitations),
//         ],
//       }),
//     ),
//   );
// };
//
// const emptyGraph = (
//   targetSha256: string,
//   provider: {
//     readonly id: string;
//     readonly version: string | null;
//   },
// ) =>
//   nativeInvestigationGraphSchema.parse({
//     target_sha256: targetSha256,
//     provider: {
//       id: provider.id,
//       version: provider.version,
//       tool_version: "rea-native-ui-trace/1",
//     },
//     nodes: [],
//     edges: [],
//     coverage: [],
//     truncated: false,
//   });
//
// const boundUiGraph = (
//   graph: z.infer<typeof nativeInvestigationGraphSchema>,
//   maxNodes: number,
//   maxEdges: number,
// ): {
//   readonly graph: z.infer<typeof nativeInvestigationGraphSchema>;
//   readonly truncated: boolean;
//   readonly omitted: number;
// } => {
//   const nodes = graph.nodes.slice(0, maxNodes);
//   const nodeIds = new Set(nodes.map(({ id }) => id));
//   const eligibleEdges = graph.edges.filter(
//     (edge) =>
//       nodeIds.has(edge.from) && (edge.to === null || nodeIds.has(edge.to)),
//   );
//   const edges = eligibleEdges.slice(0, maxEdges);
//   const omitted =
export const _l = 148;
