export const __stub = 1;
//       omittedSerializedHierarchyReferences > 0
//         ? "partial"
//         : parsed.hierarchy.length === 0
//           ? "unsupported"
//           : hierarchyTruncated
//             ? "partial"
//             : "complete";
//     summaries.push({
//       relative_path: document.relativePath,
//       archive_sha256: document.archiveSha256,
//       document_kind: document.documentKind,
//       object_count: parsed.objectCount,
//       connection_count:
//         parsed.connections.length +
//         parserOmittedConnections +
//         parsed.unresolvedConnections,
//       hierarchy_complete: hierarchyStatus === "complete",
//     });
//     coverage.push(
//       {
//         facet: `objects:${document.relativePath}`,
//         status: objectsTruncated ? "partial" : "complete",
//         reason: objectsTruncated ? "object_limit_reached" : null,
//         examined: documentObjectCount,
//         omitted:
//           parsed.omittedObjects +
//           Math.max(0, parsed.objects.length - documentObjectCount),
//       },
//       {
//         facet: `connections:${document.relativePath}`,
//         status:
//           connectionsTruncated ||
//           documentOmittedConnections > 0 ||
//           connectionsUnresolved
//             ? "partial"
//             : "complete",
//         reason:
//           connectionsTruncated || documentOmittedConnections > 0
//             ? "connection_limit_reached"
//             : connectionsUnresolved
//               ? "connection_unresolved"
//               : null,
//         examined: Math.min(
//           parsed.connections.length,
//           input.limits.max_connections,
//         ),
//         omitted:
//           Math.max(
//             0,
//             parsed.connections.length - input.limits.max_connections,
//           ) +
//           documentOmittedConnections +
//           parserOmittedConnections +
//           parsed.unresolvedConnections,
//       },
//       {
//         facet: `hierarchy:${document.relativePath}`,
//         status: hierarchyStatus,
//         reason:
//           parserOmittedHierarchyReferences > 0
//             ? "archive_hierarchy_references_missing"
//             : omittedSerializedHierarchyReferences > 0
//               ? "serialized_view_hierarchy_incomplete"
//               : parsed.hierarchy.length === 0
//                 ? "archive_hierarchy_not_decoded"
//                 : hierarchyTruncated
//                   ? "graph_limit_reached"
//                   : null,
//         examined: hierarchyCount,
//         omitted:
//           documentOmittedHierarchyNodes +
//           documentOmittedHierarchyEdges +
//           parserOmittedHierarchyReferences +
//           omittedSerializedHierarchyReferences,
//       },
//       {
//         facet: `classes:${document.relativePath}`,
//         status:
//           Object.keys(parsed.classes).length > 0 ? "complete" : "unsupported",
//         reason:
//           Object.keys(parsed.classes).length > 0
//             ? null
//             : "archive_class_table_not_decoded",
//         examined: Object.keys(parsed.classes).length,
//         omitted: 0,
//       },
//     );
//   }
//   if (input.documents.length > input.limits.max_documents) {
//     truncated = true;
//     coverage.push({
//       facet: "documents",
//       status: "partial",
//       reason: "document_limit_reached",
//       examined: input.limits.max_documents,
//       omitted: input.documents.length - input.limits.max_documents,
//     });
//   }
//   if (omittedGraphNodes > 0)
//     coverage.push({
//       facet: "graph_nodes",
//       status: "partial",
//       reason: "max_objects_reached",
//       examined: nodes.size,
//       omitted: omittedGraphNodes,
//     });
//   return interfaceBuilderAnalysisSchema.parse({
//     target_sha256: input.targetSha256,
//     documents: summaries,
//     graph: {
//       target_sha256: input.targetSha256,
//       provider: {
//         id: "rea-artifact-graph",
//         version: "1",
//         tool_version: input.toolVersion,
//       },
//       nodes: [...nodes.values()],
//       edges,
//       coverage,
//       truncated:
//         truncated ||
//         omittedObjects > 0 ||
//         omittedConnections > 0 ||
//         omittedHierarchyReferences > 0,
//     },
//     limitations: [
//       "The graph reflects recognized Interface Builder archive fields and connections; omitted private or unrecognized archive fields remain unknown.",
//       "A target-action selector is an Interface Builder observation and does not prove that the binary contains a matching implementation.",
//       "Decoded constraints, runtime visibility, dynamic UI creation, and pixel geometry are not inferred from these archives.",
//     ],
//   });
// };
//
// /** Hard limits shared by Interface Builder archive aggregation and tracing. */
// export const interfaceBuilderLimitsSchema = z.strictObject({
//   max_documents: z.number().int().min(1).max(64).default(64),
//   max_objects: z.number().int().min(1).max(20_000).default(20_000),
//   max_connections: z.number().int().min(1).max(40_000).default(40_000),
//   trace: nativeInvestigationTraceLimitsSchema.default({
//     max_depth: 8,
//     max_nodes: 250,
//     max_edges: 500,
//   }),
// });
export const _l = 144;
