export const __stub = 1;
//   const top = record(root.$top);
//   const hierarchy = toHierarchy(top.root ?? top.UITopLevelObjectsKey);
//   const classes = Object.fromEntries(
//     objectTable.flatMap((raw) => {
//       const item = record(raw);
//       const name = firstString(item.$classname);
//       return name === null
//         ? []
//         : [
//             [
//               name,
//               {
//                 superclasses: Array.isArray(item.$classes) ? item.$classes : [],
//               },
//             ],
//           ];
//     }),
//   );
//   return {
//     objects,
//     connections,
//     hierarchy: hierarchy.items,
//     classes,
//     objectCount,
//     omittedObjects: Math.max(0, objectCount - 20_000),
//     omittedConnections,
//     unresolvedConnections,
//     omittedHierarchyReferences: hierarchy.omittedReferences,
//   };
// };
//
// /** Coerce unknown values to a string-keyed record; non-objects become `{}`. */
// export const record = (value: unknown): Record<string, unknown> =>
//   recordSchema.safeParse(value).data ?? {};
//
// /** First non-empty string among the candidates, otherwise null. */
// export const firstString = (...values: unknown[]): string | null => {
//   for (const value of values)
//     if (typeof value === "string" && value.length > 0) return value;
//   return null;
// };
//
// /**
//  * The node identity of a resolved archive reference: its authored object ID,
//  * otherwise its archive UID, which is how the referenced object's node is keyed.
//  */
// const archivedObjectReference = (value: unknown): string | null => {
//   const item = record(value);
//   if (typeof item.archiveUID !== "number") return null;
//   return (
//     firstString(item.objectID, item["object-id"]) ?? String(item.archiveUID)
//   );
// };
//
// const firstObjectReference = (...values: unknown[]): string | null => {
//   for (const value of values) {
//     const direct = firstString(value);
//     if (direct !== null) return direct;
//     const item = record(value);
//     const objectId = firstString(
//       item.objectID,
//       item["object-id"],
//       item.id,
//       item.identifier,
//       typeof item.archiveUID === "number" ? String(item.archiveUID) : null,
//     );
//     if (objectId !== null) return objectId;
//   }
//   return null;
// };
//
// const classifyObject = (
//   className: string | null,
// ): InterfaceBuilderObject["kind"] => {
//   const value = className?.toLowerCase() ?? "";
//   if (value.includes("constraint")) return "constraint";
//   if (value.includes("layoutguide")) return "layout_guide";
//   if (
//     value.includes("placeholder") ||
//     value.includes("firstresponder") ||
//     value === "uiproxyobject"
//   )
//     return "placeholder";
//   if (
//     value.includes("image") ||
//     value.includes("color") ||
//     value.includes("font")
//   )
//     return "resource";
//   if (value.includes("external")) return "external_object";
//   if (value.includes("viewcontroller") || value.includes("windowcontroller"))
//     return "view_controller";
//   if (
//     value.includes("button") ||
//     value.includes("control") ||
//     value.includes("textfield") ||
//     value.includes("slider") ||
//     value.includes("menuitem")
//   )
//     return "control";
//   if (
//     value.includes("view") ||
//     value.includes("window") ||
//     value.includes("cell")
//   )
//     return "view";
//   return "other";
// };
//
// const classifyConnection = (
//   type: string,
// ): InterfaceBuilderConnection["kind"] => {
//   const value = type.toLowerCase();
//   if (value.includes("outlet")) return "outlet";
//   if (value.includes("action") || value.includes("eventconnection"))
//     return "action";
//   if (value.includes("segue")) return "segue";
//   return "other";
// };
//
// const jsonSafeRecord = (value: Record<string, unknown>) =>
//   Object.fromEntries(
//     Object.entries(value).flatMap(([key, item]) => {
//       try {
//         const serialized = JSON.stringify(item);
//         if (serialized === undefined) return [];
//         const parsed = jsonValueSchema.safeParse(JSON.parse(serialized));
//         return parsed.success ? [[key, parsed.data]] : [];
//       } catch (cause: unknown) {
//         // Unserializable entries are omitted from the record.
//         void cause;
//         return [];
//       }
//     }),
//   );
export const _l = 135;
