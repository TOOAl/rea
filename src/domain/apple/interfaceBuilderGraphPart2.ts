export const __stub = 1;
//           hierarchyTruncated = true;
//           documentOmittedHierarchyEdges += 1;
//         } else {
//           omittedConnections += 1;
//           documentOmittedConnections += 1;
//         }
//         return;
//       }
//       edges.push(edge);
//       if (isHierarchy) hierarchyEdgeCount += 1;
//       else connectionEdgeCount += 1;
//     };
//     const connect = (
//       id: string,
//       from: string,
//       to: string | null,
//       relation: "contains" | "outlet_to" | "target_action" | "segue_to",
//       description: string,
//       reason?: string,
//     ) => {
//       const isHierarchy = relation === "contains" && id.includes(":hierarchy:");
//       if (!nodes.has(from)) {
//         truncated = true;
//         if (isHierarchy) {
//           hierarchyTruncated = true;
//           documentOmittedHierarchyEdges += 1;
//         } else {
//           omittedConnections += 1;
//           documentOmittedConnections += 1;
//         }
//         return;
//       }
//       const evidence = evidenceFor(description);
//       const unresolvedEndpoint = to !== null && !nodes.has(to);
//       if (unresolvedEndpoint) {
//         truncated = true;
//         if (isHierarchy) hierarchyTruncated = true;
//       }
//       const edgeTo = unresolvedEndpoint ? null : to;
//       const edgeReason = unresolvedEndpoint
//         ? "endpoint_omitted_by_object_limit"
//         : (reason ?? "destination_unresolved");
//       addEdge(
//         edgeTo === null
//           ? {
//               id,
//               from,
//               to: null,
//               relation,
//               resolution: "unresolved",
//               reason: edgeReason,
//               evidence,
//               limitations: [],
//             }
//           : {
//               id,
//               from,
//               to: edgeTo,
//               relation,
//               resolution: "observed",
//               evidence,
//               limitations: [],
//             },
//         isHierarchy,
//       );
//     };
//     let hierarchyCount = 0;
//     let documentOmittedHierarchyNodes = 0;
//     const visitHierarchy = (
//       initial: unknown,
//       initialParentId: string,
//     ): void => {
//       const pending: { readonly value: unknown; readonly parentId: string }[] =
//         [{ value: initial, parentId: initialParentId }];
//       while (pending.length > 0) {
//         const entry = pending.pop();
//         if (entry === undefined) break;
//         const { value, parentId } = entry;
//         if (Array.isArray(value)) {
//           for (let index = value.length - 1; index >= 0; index -= 1) {
//             const child = value[index];
//             if (child !== undefined) pending.push({ value: child, parentId });
//           }
//           continue;
//         }
//         if (typeof value !== "object" || value === null) continue;
//         const item = record(value);
//         const objectId = firstString(
//           item.objectID,
//           item["object-id"],
//           item.id,
//           typeof item.archiveUID === "number" ? String(item.archiveUID) : null,
//         );
//         let nextParent = parentId;
//         if (objectId !== null && hierarchyCount >= input.limits.max_objects) {
//           // The walk continues over the decoded records so the omission is
//           // counted rather than reported as an unknown remainder.
//           truncated = true;
//           hierarchyTruncated = true;
//           documentOmittedHierarchyNodes += 1;
//         } else if (objectId !== null) {
//           const known = objectIds.has(objectId);
//           const childId = known
//             ? objectNodeId(objectId)
//             : graphId("unknown", [objectId]);
//           if (
//             !known &&
//             !addNode({
//               id: childId,
//               kind: "unknown",
//               name: firstString(item.label, item.name) ?? objectId,
//               location: null,
//               attributes: { interface_builder_object_id: objectId },
//               evidence: evidenceFor(`hierarchy item ${objectId}`),
//             })
//           )
//             hierarchyTruncated = true;
//           connect(
//             graphId("hierarchy", [parentId, childId]),
//             parentId,
//             childId,
//             "contains",
//             `hierarchy ${objectId}`,
//           );
//           nextParent = childId;
//           hierarchyCount += 1;
//         }
//         pending.push({ value: item.children, parentId: nextParent });
//       }
//     };
//     for (const hierarchy of parsed.hierarchy) visitHierarchy(hierarchy, rootId);
//     for (const [index, item] of parsed.connections
//       .slice(0, input.limits.max_connections)
//       .entries()) {
//       const sourceId = objectNodeId(item.source_id);
//       if (!nodes.has(sourceId))
//         addNode({
//           id: sourceId,
//           kind: "unknown",
//           name: item.source_id,
//           location: null,
//           attributes: { interface_builder_object_id: item.source_id },
//           evidence: evidenceFor(`connection source ${item.source_id}`),
//         });
//       const destinationId =
//         item.destination_id === null ? null : objectNodeId(item.destination_id);
export const _l = 146;
