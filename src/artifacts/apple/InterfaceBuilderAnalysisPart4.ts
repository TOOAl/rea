export const __stub = 1;
//       ? "outlet"
//       : className.includes("Control") || className.includes("Event")
//         ? "action"
//         : className;
//     budget.reserveJsonStringOccurrence(type);
//     const eventMask = values.UIEventMask;
//     // The source is the outlet owner or the sending control; the destination
//     // is the outlet value or the action target, and a nil target is the
//     // first responder.
//     (connections[String(source)] ??= []).push({
//       type,
//       "destination-id": destination === null ? null : String(destination),
//       label,
//       source_id: String(source),
//       archive_object_id: String(object.id),
//       ...(typeof eventMask === "number" ? { ui_event_mask: eventMask } : {}),
//     });
//   }
//   let hierarchyOmitted = 0;
//   let hierarchyNodeCount = 0;
//   const hierarchyFor = (
//     objectId: number,
//     seen: Set<number>,
//     depth: number,
//   ): NibHierarchyNode | null => {
//     if (depth > 32 || seen.has(objectId)) {
//       hierarchyOmitted += 1;
//       return null;
//     }
//     if (hierarchyNodeCount >= maxHierarchyNodes) {
//       hierarchyOmitted += 1;
//       return null;
//     }
//     if (!budget.tryReserve(128)) {
//       hierarchyOmitted += 1;
//       return null;
//     }
//     const object = byId.get(objectId);
//     if (object === undefined) {
//       hierarchyOmitted += 1;
//       return null;
//     }
//     hierarchyNodeCount += 1;
//     const nextSeen = new Set(seen).add(objectId);
//     const children: NibHierarchyNode[] = [];
//     for (const [key, value] of Object.entries(object.values)) {
//       if (!/(?:subviews|contentview|childviewcontrollers|view)$/iu.test(key))
//         continue;
//       const direct = reference(value);
//       if (direct === null) continue;
//       const target = byId.get(direct);
//       if (target === undefined) {
//         hierarchyOmitted += 1;
//         continue;
//       }
//       if (/array|set/iu.test(target.class_name)) {
//         for (const candidate of Object.values(target.values)) {
//           const child = reference(candidate);
//           const nested =
//             child === null ? null : hierarchyFor(child, nextSeen, depth + 1);
//           if (nested !== null) children.push(nested);
//         }
//       } else {
//         const nested = hierarchyFor(direct, nextSeen, depth + 1);
//         if (nested !== null) children.push(nested);
//       }
//     }
//     return { objectID: String(objectId), children };
//   };
//   const ibData = archive.objects.find(
//     ({ class_name }) => normalizeClassName(class_name) === "NSIBObjectData",
//   );
//   const rootId = reference(ibData?.values.NSRoot);
//   const hierarchyRoots = rootId === null ? [] : [rootId];
//   for (const hierarchyRoot of hierarchyRoots) {
//     const root = hierarchyFor(hierarchyRoot, new Set(), 0);
//     if (root !== null) hierarchy.push(root);
//   }
//   const viewHierarchy = projectNibViewHierarchy(
//     archive.objects,
//     new Set(Object.keys(objects).map(Number)),
//     () => budget.tryReserve(128),
//     maxHierarchyNodes,
//   );
//   const merged = mergeNibHierarchies(
//     hierarchy,
//     viewHierarchy.hierarchy ?? [],
//     () => budget.tryReserve(96),
//     maxHierarchyNodes,
//   );
//   return {
//     omitted: viewHierarchy.omitted + hierarchyOmitted + merged.omitted,
//     unresolvedConnections,
//     raw: jsonValueSchema.parse({
//       "com.apple.ibtool.document.objects": objects,
//       "com.apple.ibtool.document.connections": connections,
//       "com.apple.ibtool.document.hierarchy": merged.hierarchy,
//       "com.apple.ibtool.document.classes": Object.fromEntries(
//         archive.classes.map((name) => {
//           const className = normalizeClassName(name);
//           budget.reserveJsonPropertyNameOccurrence(className);
//           return [className, {}];
//         }),
//       ),
//     }),
//   };
// };
//
// const isInterfaceBuilderArchive = (path: string): boolean => {
//   const lower = path.toLowerCase();
//   return lower.endsWith(".nib") || lower.endsWith("/objects.nib");
// };
//
// const readEntry = async (
//   reader: DirectoryArtifactReader,
//   entry: ArtifactEntry,
//   signal?: AbortSignal,
//   maxInputBytes = MAX_AGGREGATE_INPUT_BYTES,
// ): Promise<Buffer> => {
//   if (entry.declaredSize !== null && entry.declaredSize > maxInputBytes)
//     throw new InterfaceBuilderDecodeBudgetExceeded(
//       "aggregate_decode_budget_exhausted",
//       "archive exceeds the aggregate Interface Builder decode budget",
//     );
//   const stream = await reader.open(entry, signal);
//   const chunks: Buffer[] = [];
//   let length = 0;
//   for await (const chunk of stream) {
//     const bytes = Buffer.isBuffer(chunk)
//       ? chunk
//       : Buffer.from(chunk as Uint8Array);
//     length += bytes.length;
//     if (length > maxInputBytes) {
//       stream.destroy();
//       throw new InterfaceBuilderDecodeBudgetExceeded(
//         "aggregate_decode_budget_exhausted",
//         "archive exceeded the aggregate Interface Builder decode budget",
//       );
//     }
//     chunks.push(bytes);
//   }
//   return Buffer.concat(chunks, length);
// };
//
// /**
//  * The shared parser bounds plist value nesting before its recursive decode and
//  * reports the limit as a RangeError; that is an omitted archive, not a
//  * malformed one.
//  */
// const parseXmlWithinDecodeBudget = (text: string) => {
//   try {
//     return parseXmlPropertyList(text);
//   } catch (cause: unknown) {
//     if (cause instanceof RangeError)
//       throw new InterfaceBuilderDecodeBudgetExceeded(
//         "aggregate_decode_budget_exhausted",
//         cause.message,
//       );
//     throw cause;
//   }
// };
//
// /** Project decoded plist data and dates while retaining omitted-key coverage. */
// const decodePlist = (
//   bytes: Buffer,
//   xmlText: string | undefined,
//   binaryPrototypeKeyObserved: boolean,
// ): {
//   readonly value: JsonValue;
//   readonly omittedPrototypeKeys: number | null;
//   readonly unknownDateCount: number;
// } => {
//   const binary = hasBinaryPlistSignature(bytes);
//   const { value, omittedPrototypeKeys } = binary
//     ? {
//         value: parseBinary(bytes),
//         omittedPrototypeKeys: binaryPrototypeKeyObserved ? null : 0,
//       }
//     : parseXmlWithinDecodeBudget(xmlText ?? decodeXmlPlistText(bytes));
//   const projected = projectPlistValue(value);
//   return {
//     value: projected.value,
//     omittedPrototypeKeys,
//     unknownDateCount: projected.unknownDateCount,
//   };
// };
export const _l = 186;
