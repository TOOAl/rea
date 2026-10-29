export const __stub = 1;
//       const id = `unknown-dispatch:${current.address}:${unknown.address}`;
//       edges.set(id, {
//         id,
//         from: current.node.id,
//         to: null,
//         relation: "indirect_call",
//         resolution: "unresolved",
//         reason: unknown.reason,
//         evidence: [
//           {
//             kind: "reference",
//             provider: unknown.provider,
//             description: `${unknown.provider.name} reported an unresolved call: ${unknown.reason}`,
//             location: { address: unknown.address, file_offset: null },
//             artifact_path: null,
//             artifact_sha256: input.targetSha256,
//           },
//         ],
//         limitations: [],
//       });
//     }
//     if (!execution.ok) {
//       if (edges.size >= input.input.max_edges) {
//         truncated = true;
//         omitted += 1;
//         continue;
//       }
//       const id = `unknown-callees:${current.address}`;
//       edges.set(id, {
//         id,
//         from: current.node.id,
//         to: null,
//         relation: "direct_call",
//         resolution: "unresolved",
//         reason: projectAnalysisError(execution.error).message,
//         evidence: [],
//         limitations: [
//           "The provider could not enumerate resolved direct callees.",
//         ],
//       });
//       continue;
//     }
//     for (const [index, route] of execution.value.routes.entries()) {
//       const address = route.address;
//       if (edges.size >= input.input.max_edges) {
//         truncated = true;
//         omitted += execution.value.routes.length - index;
//         break;
//       }
//       const targetId = `native:function:${address}`;
//       const evidence = [
//         {
//           kind: "reference" as const,
//           provider: execution.value.provider,
//           description: `${execution.value.provider.name} reported ${route.relation} from ${current.address} to ${address}`,
//           location: { address: route.site, file_offset: null },
//           artifact_path: null,
//           artifact_sha256: input.targetSha256,
//         },
//       ];
//       if (!nodes.has(targetId)) {
//         if (nodes.size >= input.input.max_nodes) {
//           truncated = true;
//           omitted += 1;
//           const id = `unknown-node-bound:${current.address}:${address}`;
//           edges.set(id, {
//             id,
//             from: current.node.id,
//             to: null,
//             relation: "direct_call",
//             resolution: "unresolved",
//             reason: "native_trace_node_bound_reached",
//             evidence,
//             limitations: [],
//           });
//           continue;
//         }
//         const name = addressNames.get(address) ?? address;
//         const node = {
//           id: targetId,
//           kind: "function" as const,
//           name,
//           location: { address, file_offset: null },
//           attributes: { resolved_by: execution.value.provider.id },
//           evidence,
//         };
//         nodes.set(targetId, node);
//         queue.push({ node, address, depth: current.depth + 1 });
//       }
//       const edgeId = `call:${current.address}:${route.site}:${address}`;
//       edges.set(edgeId, {
//         id: edgeId,
//         from: current.node.id,
//         to: targetId,
//         relation: route.relation,
//         resolution: route.resolution,
//         evidence,
//         limitations: [
//           "A resolved static call edge does not establish runtime reachability.",
//         ],
//       });
//     }
//   }
//   return {
//     nodes: [...nodes.values()],
//     edges: [...edges.values()],
//     examined,
//     omitted,
//     truncated,
//     limitations: sourceLimitations,
//   };
// };
//
// const graphNodeDepths = (
//   start: string,
//   nodes: readonly z.infer<
//     typeof nativeInvestigationGraphSchema
//   >["nodes"][number][],
//   edges: readonly z.infer<
//     typeof nativeInvestigationGraphSchema
//   >["edges"][number][],
// ): ReadonlyMap<string, number> => {
//   const known = new Set(nodes.map(({ id }) => id));
//   const depths = new Map([[start, 0]]);
//   const queue = [start];
//   for (let index = 0; index < queue.length; index += 1) {
//     const current = queue[index];
//     if (current === undefined) continue;
//     const depth = depths.get(current) ?? 0;
//     for (const edge of edges) {
//       if (
//         edge.resolution === "unresolved" ||
//         edge.from !== current ||
//         edge.to === null ||
//         !known.has(edge.to) ||
//         depths.has(edge.to)
//       )
//         continue;
//       depths.set(edge.to, depth + 1);
//       queue.push(edge.to);
//     }
//   }
//   return depths;
// };
export const _l = 144;
