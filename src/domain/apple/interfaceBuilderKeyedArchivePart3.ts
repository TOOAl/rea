export const __stub = 1;
//             }
//           continue;
//         }
//         appendNode(item, uid, output);
//         continue;
//       }
//       if (Array.isArray(value)) {
//         for (let index = value.length - 1; index >= 0; index -= 1) {
//           const child = value[index];
//           if (child !== undefined) pending.push({ value: child, output });
//         }
//       } else if (typeof value === "object" && value !== null) {
//         appendNode(record(value), undefined, output);
//       }
//     }
//     return { items: root, omittedReferences };
//   };
//   const archivedArrayClass = (classReference: unknown): boolean => {
//     const uid = archiveUid(classReference);
//     const descriptor = record(
//       uid === undefined ? classReference : objectTable[uid],
//     );
//     const classNames = Array.isArray(descriptor.$classes)
//       ? descriptor.$classes.filter(
//           (name): name is string => typeof name === "string",
//         )
//       : [];
//     return (
//       classNames.includes("NSArray") || classNames.includes("NSMutableArray")
//     );
//   };
//   return { resolve, hierarchy };
// };
//
// /** Project class and connection objects from an NSKeyedArchiver object table. */
// const parseKeyedArchive = (
//   root: Record<string, unknown>,
// ): ReturnType<typeof parseInterfaceBuilderRecords> | null => {
//   if (root.$archiver !== "NSKeyedArchiver" || !Array.isArray(root.$objects))
//     return null;
//   const objectTable: readonly unknown[] = root.$objects;
//   const { resolve, hierarchy: toHierarchy } = keyedArchiveTable(objectTable);
//   const objects: InterfaceBuilderObject[] = [];
//   const connections: InterfaceBuilderConnection[] = [];
//   let objectCount = 0;
//   let omittedConnections = 0;
//   let unresolvedConnections = 0;
//   for (const [index, raw] of objectTable.entries()) {
//     if (index === 0) continue;
//     const resolved = record(resolve(raw));
//     const className = firstString(resolved.className);
//     // An archived object names its class with its own `$class` reference;
//     // when that reference cannot be resolved the object is still observed,
//     // with an unknown class. Scalars and class descriptors are not objects.
//     if (className === null && !Object.hasOwn(record(raw), "$class")) continue;
//     objectCount += 1;
//     const fields = Object.fromEntries(
//       Object.entries(resolved).filter(([key]) => key !== "className"),
//     );
//     // Keep the unresolvable class reference itself, e.g. a dangling UID.
//     if (className === null) fields.$class = record(raw).$class;
//     const authoredId = firstString(fields.objectID, fields["object-id"]);
//     const objectId =
//       authoredId ??
//       (typeof fields.archiveUID === "number"
//         ? String(fields.archiveUID)
//         : String(index));
//     const kind = classifyObject(className);
//     if (objects.length < 20_000)
//       objects.push(
//         objectNode.parse({
//           id: objectId,
//           kind,
//           class_name: className,
//           name:
//             firstString(
//               fields.label,
//               fields.title,
//               fields.identifier,
//               fields.accessibilityLabel,
//               className,
//             ) ?? `object ${String(index)}`,
//           attributes: jsonSafeRecord(fields),
//         }),
//       );
//     if (
//       className !== null &&
//       /(?:Outlet|Connection|Segue|ActionConnection|ControlConnector)/iu.test(
//         className,
//       )
//     ) {
//       const controlAction = /ControlConnector/iu.test(className);
//       const uiKit = isUIKitRuntimeConnectionClass(className);
//       // AppKit and UIKit archive the same endpoint roles under their own
//       // class-specific field namespaces; the source is the outlet owner.
//       const connectionFields = interfaceBuilderConnectionFieldNames(className);
//       const source = uiKit
//         ? archivedObjectReference(fields[connectionFields.source])
//         : firstObjectReference(
//             controlAction ? fields.destination : fields.source,
//             archivedObjectReference(fields[connectionFields.source]),
//             controlAction ? fields.to : fields.from,
//             controlAction ? fields.target : fields.owner,
//           );
//       if (source === null) {
//         // A recognized connector that cannot name its owner is an unresolved
//         // connection, not an absent one, and cannot be represented as a
//         // connection because connection identity requires a source.
//         unresolvedConnections += 1;
//         continue;
//       }
//       const kind = controlAction ? "action" : classifyConnection(className);
//       const parsedConnection = connection.parse({
//         id: `archive:${objectId}`,
//         kind,
//         source_id: source,
//         destination_id: uiKit
//           ? archivedObjectReference(fields[connectionFields.destination])
//           : firstObjectReference(
//               controlAction ? fields.source : fields.destination,
//               archivedObjectReference(fields[connectionFields.destination]),
//               controlAction ? fields.from : fields.to,
//               controlAction ? fields.owner : fields.target,
//             ),
//         label: uiKit
//           ? firstString(fields[connectionFields.label])
//           : firstString(
//               fields.label,
//               fields[connectionFields.label],
//               fields.selector,
//               fields.identifier,
//               fields.action,
//             ),
//         attributes: jsonSafeRecord(fields),
//       });
//       if (connections.length < 40_000) connections.push(parsedConnection);
//       else omittedConnections += 1;
//     }
//   }
export const _l = 139;
