export const __stub = 1;
// };
//
// /** Project decoded NIB records into the same bounded graph input as ibtool. */
// const projectNibArchive = (
//   archive: NibArchiveDocument,
//   budget: InterfaceBuilderDecodeBudget,
//   maxHierarchyNodes: number,
// ) => {
//   const byId = new Map(archive.objects.map((object) => [object.id, object]));
//   const normalizedClassNames = new Map<string, string>();
//   const normalizeClassName = (value: string): string => {
//     const known = normalizedClassNames.get(value);
//     if (known !== undefined) return known;
//     const normalized = value.replace(/\0+$/u, "");
//     normalizedClassNames.set(value, normalized);
//     return normalized;
//   };
//   const decodedStrings = new Map<number, string | null>();
//   const decodedString = (
//     objectId: number,
//     object: NibArchiveDocument["objects"][number],
//   ): string | null => {
//     if (decodedStrings.has(objectId))
//       return decodedStrings.get(objectId) ?? null;
//     const data = object.values["NS.bytes"];
//     if (typeof data !== "object" || data === null || Array.isArray(data)) {
//       decodedStrings.set(objectId, null);
//       return null;
//     }
//     const encoded = data.$nib_data_base64;
//     if (typeof encoded !== "string") {
//       decodedStrings.set(objectId, null);
//       return null;
//     }
//     budget.reserve(
//       64 + encoded.length * 2,
//       "NIBArchive string projection exceeds the aggregate Interface Builder decode budget",
//     );
//     const value = Buffer.from(encoded, "base64").toString("utf8");
//     decodedStrings.set(objectId, value);
//     return value;
//   };
//   let projectedFields = 0;
//   for (const object of archive.objects)
//     projectedFields += Object.keys(object.values).length;
//   budget.reserve(
//     archive.objects.length * 128 + projectedFields * 128,
//     "NIBArchive graph projection exceeds the aggregate Interface Builder decode budget",
//   );
//   budget.reserve(
//     archive.classes.length * 96,
//     "NIBArchive class projection exceeds the aggregate Interface Builder decode budget",
//   );
//   const dereference = (value: JsonValue | undefined): JsonValue | undefined => {
//     if (typeof value !== "object" || value === null || Array.isArray(value))
//       return value;
//     const encodedData = value.$nib_data_base64;
//     if (typeof encodedData === "string") {
//       budget.reserveBase64JsonStringOccurrence(encodedData);
//       return value;
//     }
//     const ref = value.$nib_object_ref;
//     if (typeof ref !== "number") return value;
//     const target = byId.get(ref);
//     if (target === undefined) return undefined;
//     if (normalizeClassName(target.class_name) === "NSString") {
//       const string = decodedString(ref, target);
//       if (string !== null) {
//         budget.reserveJsonStringOccurrence(string);
//         return string;
//       }
//     }
//     return { objectID: String(ref) };
//   };
//   const referencedString = (value: JsonValue | undefined): string | null => {
//     if (typeof value !== "object" || value === null || Array.isArray(value))
//       return null;
//     const ref = value.$nib_object_ref;
//     if (typeof ref !== "number") return null;
//     const target = byId.get(ref);
//     if (
//       target === undefined ||
//       normalizeClassName(target.class_name) !== "NSString"
//     )
//       return null;
//     const string = decodedString(ref, target);
//     if (string === null) return null;
//     budget.reserveJsonStringOccurrence(string);
//     return string;
//   };
//   const runtimeClasses = new Map<number, string | null>();
//   const runtimeClass = (objectId: number): string | null => {
//     if (runtimeClasses.has(objectId))
//       return runtimeClasses.get(objectId) ?? null;
//     const object = byId.get(objectId);
//     if (object === undefined) return null;
//     const storedClass = normalizeClassName(object.class_name);
//     const resolvedClass =
//       storedClass === "NSClassSwapper"
//         ? (referencedString(object.values.NSClassName) ?? storedClass)
//         : storedClass === "UIClassSwapper"
//           ? (referencedString(object.values.UIClassName) ?? storedClass)
//           : storedClass;
//     runtimeClasses.set(objectId, resolvedClass);
//     return resolvedClass;
//   };
//   const objects = Object.fromEntries(
//     archive.objects
//       .filter((object) => {
//         const name = runtimeClass(object.id) ?? "";
//         return (
//           !/^(?:NSObject|NSIBObjectData|NSString|NSMutableString|NSNumber|NSArray|NSMutableArray|NSSet|NSMutableSet|NSDictionary|NSMutableDictionary|NSApplication|NSNib.*Connector)$/u.test(
//             name,
//           ) && !isUIKitRuntimeConnectionClass(name)
//         );
//       })
//       .map((object) => {
//         const className =
//           runtimeClass(object.id) ?? normalizeClassName(object.class_name);
//         budget.reserveJsonStringOccurrence(className);
//         let name = className;
//         for (const [key, value] of Object.entries(object.values)) {
//           if (
//             !/(?:title|label|identifier|accessibility|name|contents)/iu.test(
//               key,
//             )
//           )
//             continue;
//           const resolved = dereference(value);
//           if (typeof resolved !== "string") continue;
//           name = resolved;
//           break;
//         }
//         budget.reserveJsonStringOccurrence(name);
//         const nibValues = Object.fromEntries(
//           Object.entries(object.values).map(([key, value]) => {
//             budget.reserveJsonPropertyNameOccurrence(key);
//             return [key, dereference(value) ?? null];
//           }),
//         );
//         // Normalize only recognized scalar fields at the format owner. A keyed
//         // archive's authored nibValues dictionary must not gain this meaning.
//         const resourceFields = appleResourceKeyFields(nibValues);
//         for (const [field, value] of resourceFields) {
//           budget.reserveJsonPropertyNameOccurrence(field);
//           budget.reserveJsonStringOccurrence(value);
//         }
//         return [
//           String(object.id),
//           {
//             customClass: className,
//             label: name,
//             objectID: String(object.id),
//             nibValues,
//             ...Object.fromEntries(resourceFields),
//           },
//         ];
//       }),
//   );
//   const connections: Record<string, JsonValue[]> = {};
//   const hierarchy: NibHierarchyNode[] = [];
//   // A recognized connector whose owner reference cannot be resolved produces no
//   // connection entry, so the omission has to be counted here: the projected
//   // dictionary carries no trace of it for a downstream consumer to find.
//   let unresolvedConnections = 0;
//   const reference = (value: JsonValue | undefined): number | null => {
//     if (typeof value !== "object" || value === null || Array.isArray(value))
//       return null;
//     return typeof value.$nib_object_ref === "number"
//       ? value.$nib_object_ref
//       : null;
//   };
//   for (const object of archive.objects) {
//     const className = normalizeClassName(object.class_name);
//     // AppKit connectors use NS-prefixed keys; UIKit's runtime outlet and
//     // event connections use UI-prefixed keys with the same roles.
//     const uiKit = isUIKitRuntimeConnectionClass(className);
//     if (!uiKit && !className.includes("Connector")) continue;
//     const values = object.values;
//     const connectionFields = interfaceBuilderConnectionFieldNames(className);
//     const source = reference(values[connectionFields.source]);
//     if (source === null) {
//       unresolvedConnections += 1;
//       continue;
//     }
//     const destination = reference(values[connectionFields.destination]);
//     const label = referencedString(values[connectionFields.label]);
//     const type = className.includes("Outlet")
export const _l = 188;
