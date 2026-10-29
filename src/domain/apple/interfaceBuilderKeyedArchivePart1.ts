export const __stub = 1;
// import { z } from "zod";
//
// import { jsonValueSchema } from "../jsonValue.js";
//
// const recordSchema = z.record(z.string(), z.unknown());
//
// const objectNode = z.strictObject({
//   id: z.string().min(1),
//   kind: z.enum([
//     "view_controller",
//     "view",
//     "control",
//     "constraint",
//     "layout_guide",
//     "resource",
//     "placeholder",
//     "external_object",
//     "other",
//   ]),
//   class_name: z.string().nullable(),
//   name: z.string().min(1),
//   attributes: z.record(z.string(), jsonValueSchema),
// });
//
// const connection = z.strictObject({
//   id: z.string().min(1),
//   kind: z.enum(["outlet", "action", "segue", "other"]),
//   source_id: z.string().min(1),
//   destination_id: z.string().nullable(),
//   label: z.string().nullable(),
//   attributes: z.record(z.string(), jsonValueSchema),
// });
//
// type InterfaceBuilderObject = z.infer<typeof objectNode>;
// type InterfaceBuilderConnection = z.infer<typeof connection>;
//
// /** UIKit runtime connection classes store their endpoints and labels under UI-prefixed keys. */
// export const isUIKitRuntimeConnectionClass = (className: string): boolean =>
//   /^UIRuntime\w*Connection$/u.test(className);
//
// /** The connection class selects the source archive field namespace. */
// export const interfaceBuilderConnectionFieldNames = (className: string) =>
//   isUIKitRuntimeConnectionClass(className)
//     ? { source: "UISource", destination: "UIDestination", label: "UILabel" }
//     : { source: "NSSource", destination: "NSDestination", label: "NSLabel" };
//
// /** Parse ibtool dictionaries or compiled keyed archives into typed records. */
// export const parseInterfaceBuilderRecords = (
//   value: unknown,
// ): {
//   readonly objects: readonly InterfaceBuilderObject[];
//   readonly connections: readonly InterfaceBuilderConnection[];
//   readonly hierarchy: readonly unknown[];
//   readonly classes: Readonly<Record<string, unknown>>;
//   readonly objectCount: number;
//   readonly omittedObjects: number;
//   readonly omittedConnections: number;
//   readonly unresolvedConnections: number;
//   readonly omittedHierarchyReferences: number;
// } => {
//   const root = record(value);
//   const keyed = parseKeyedArchive(root);
//   if (keyed !== null) return keyed;
//   const objectsRaw = record(root["com.apple.ibtool.document.objects"]);
//   const connectionsRaw = record(root["com.apple.ibtool.document.connections"]);
//   const hierarchyRaw = root["com.apple.ibtool.document.hierarchy"];
//   const classesRaw = record(root["com.apple.ibtool.document.classes"]);
//   const objects: InterfaceBuilderObject[] = [];
//   const connections: InterfaceBuilderConnection[] = [];
//   let omittedConnections = 0;
//   const objectEntries = Object.entries(objectsRaw);
//   for (const [id, raw] of objectEntries.slice(0, 20_000)) {
//     const attributes = record(raw);
//     const className = firstString(
//       attributes["customClass"],
//       attributes["class"],
//       attributes["isa"],
//     );
//     const label = firstString(
//       attributes["label"],
//       attributes["title"],
//       attributes["name"],
//       className,
//     );
//     // class_name, name, and id already carry these values; repeating them in
//     // attributes doubled them on every graph node.
//     const carried = new Set<string>();
//     if (attributes["customClass"] === className) carried.add("customClass");
//     if (attributes["label"] === label) carried.add("label");
//     if (attributes["objectID"] === id) carried.add("objectID");
//     objects.push(
//       objectNode.parse({
//         id,
//         kind: classifyObject(className),
//         class_name: className,
//         name: label ?? id,
//         attributes: jsonSafeRecord(
//           Object.fromEntries(
//             Object.entries(attributes).filter(([key]) => !carried.has(key)),
//           ),
//         ),
//       }),
//     );
//   }
//   for (const [sourceId, rawConnections] of Object.entries(connectionsRaw)) {
//     if (!Array.isArray(rawConnections)) continue;
//     for (const [index, raw] of rawConnections.entries()) {
//       if (connections.length >= 40_000) {
//         omittedConnections += rawConnections.length - index;
//         break;
//       }
//       const item = record(raw);
//       const type = firstString(item.type, item.connectionType) ?? "unknown";
//       const destination = firstString(
//         item["destination-id"],
//         item.destinationId,
//       );
//       const label = firstString(item.label, item.selector, item.identifier);
//       connections.push(
//         connection.parse({
//           id: `${sourceId}:connection:${index}`,
//           kind: classifyConnection(type),
//           source_id: sourceId,
//           destination_id: destination,
//           label,
//           attributes: jsonSafeRecord(item),
//         }),
//       );
//     }
//   }
//   return {
//     objects,
//     connections,
//     hierarchy: Array.isArray(hierarchyRaw) ? hierarchyRaw : [],
//     classes: classesRaw,
//     objectCount: objectEntries.length,
//     omittedObjects: Math.max(0, objectEntries.length - 20_000),
//     omittedConnections,
//     unresolvedConnections: 0,
export const _l = 139;
