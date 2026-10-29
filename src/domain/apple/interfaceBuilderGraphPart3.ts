export const __stub = 1;
//       if (item.kind === "action") {
//         const actionId = graphId("action", [item.id]);
//         const selectorId =
//           item.label === null
//             ? null
//             : graphId("selector", [item.destination_id, item.label]);
//         addNode({
//           id: actionId,
//           kind: "action",
//           name: item.label ?? "unlabeled action",
//           location: null,
//           attributes: {
//             selector: item.label,
//             destination_id: item.destination_id,
//             ...item.attributes,
//           },
//           evidence: evidenceFor(`action ${item.id}`),
//         });
//         connect(
//           graphId("action-edge", [item.id, "source"]),
//           sourceId,
//           actionId,
//           "target_action",
//           `action source ${item.source_id}`,
//         );
//         if (selectorId !== null) {
//           addNode({
//             id: selectorId,
//             kind: "objc_selector",
//             name: item.label ?? "unknown selector",
//             location: null,
//             attributes: { destination_id: item.destination_id },
//             evidence: evidenceFor(`selector ${item.label}`),
//           });
//           connect(
//             graphId("action-edge", [item.id, "selector"]),
//             actionId,
//             selectorId,
//             "target_action",
//             `selector ${item.label}`,
//           );
//         }
//         if (destinationId === null || !nodes.has(destinationId))
//           connect(
//             graphId("action-edge", [item.id, "destination"]),
//             actionId,
//             null,
//             "target_action",
//             `action destination ${item.destination_id ?? "missing"}`,
//             "destination_object_missing_or_external",
//           );
//         else
//           connect(
//             graphId("action-edge", [item.id, "destination"]),
//             actionId,
//             destinationId,
//             "target_action",
//             `action destination ${item.destination_id}`,
//           );
//       } else if (item.kind === "outlet") {
//         const outletId = graphId("outlet", [item.id]);
//         addNode({
//           id: outletId,
//           kind: "outlet",
//           name: item.label ?? item.id,
//           location: null,
//           attributes: item.attributes,
//           evidence: evidenceFor(`outlet ${item.id}`),
//         });
//         connect(
//           graphId("outlet-edge", [item.id, "source"]),
//           sourceId,
//           outletId,
//           "contains",
//           `outlet source ${item.source_id}`,
//         );
//         if (destinationId === null || !nodes.has(destinationId))
//           connect(
//             graphId("outlet-edge", [item.id, "destination"]),
//             outletId,
//             null,
//             "outlet_to",
//             `outlet ${item.label ?? item.id}`,
//             "destination_object_missing_or_external",
//           );
//         else
//           connect(
//             graphId("outlet-edge", [item.id, "destination"]),
//             outletId,
//             destinationId,
//             "outlet_to",
//             `outlet ${item.label ?? item.id}`,
//           );
//       } else if (item.kind === "segue") {
//         if (destinationId === null || !nodes.has(destinationId))
//           connect(
//             graphId("segue", [index]),
//             sourceId,
//             null,
//             "segue_to",
//             `segue ${item.label ?? item.id}`,
//             "destination_scene_missing",
//           );
//         else
//           connect(
//             graphId("segue", [index]),
//             sourceId,
//             destinationId,
//             "segue_to",
//             `segue ${item.label ?? item.id}`,
//           );
//       } else {
//         connect(
//           graphId("unknown-connection", [index]),
//           sourceId,
//           null,
//           "contains",
//           `connection type ${item.kind}`,
//           "unsupported_connection_type",
//         );
//       }
//     }
//     const objectsTruncated =
//       parsed.omittedObjects > 0 || parsed.objects.length > documentObjectCount;
//     const parserOmittedHierarchyReferences = parsed.omittedHierarchyReferences;
//     const omittedSerializedHierarchyReferences =
//       document.omittedSerializedHierarchyReferences ?? 0;
//     omittedHierarchyReferences +=
//       parserOmittedHierarchyReferences + omittedSerializedHierarchyReferences;
//     const parserOmittedConnections = parsed.omittedConnections;
//     const connectionsTruncated =
//       parserOmittedConnections > 0 ||
//       parsed.connections.length > input.limits.max_connections;
//     // A recognized connector the parser could not attach to an owner produces
//     // no connection record, so its coverage is partial with its own reason
//     // rather than absent or truncated.
//     const connectionsUnresolved = parsed.unresolvedConnections > 0;
//     omittedObjects +=
//       parsed.omittedObjects +
//       Math.max(0, parsed.objects.length - documentObjectCount);
//     omittedConnections +=
//       Math.max(0, parsed.connections.length - input.limits.max_connections) +
//       parserOmittedConnections +
//       parsed.unresolvedConnections;
//     const hierarchyStatus =
//       parserOmittedHierarchyReferences > 0 ||
export const _l = 146;
