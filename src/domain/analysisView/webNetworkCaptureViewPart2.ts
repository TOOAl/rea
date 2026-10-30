export const __stub = 1;
//  * canonical decimal, and no byte descriptor. String slots need no sidecar and
//  * at most one byte descriptor, which must describe the value's own UTF-8.
//  * Selecting a field also selects its sidecars, so this keeps every copied
//  * literal small and consistent.
//  */
// const representationMatches = (
//   field: string,
//   value: JsonValue,
//   sidecars: readonly NumericSidecar[],
//   bytes: readonly BinaryField[],
// ): boolean => {
//   if (MITMPROXY_INTEGER_FIELDS.has(field))
//     return (
//       bytes.length === 0 &&
//       typeof value === "number" &&
//       sidecars.length === 1 &&
//       sidecars[0]?.producer_type === "integer" &&
//       sidecars[0].literal === String(value)
//     );
//   if (sidecars.length !== 0 || bytes.length > 1) return false;
//   const [descriptor] = bytes;
//   return (
//     descriptor === undefined ||
//     (typeof value === "string" && describesText(descriptor, value))
//   );
// };
// const headlineShape = (field: string, value: JsonValue): boolean => {
//   switch (field) {
//     case "scheme":
//       return (
//         typeof value === "string" &&
//         /^[A-Za-z][A-Za-z0-9+.-]{0,31}$/u.test(value)
//       );
//     case "host":
//       return hostLike(value, 255);
//     case "authority":
//       return hostLike(value, 262);
//     case "port":
//       return integerIn(value, 0, 65_535);
//     case "status_code":
//       return integerIn(value, 100, 999);
//     case "path":
//       return (
//         typeof value === "string" &&
//         value.length <= MITMPROXY_PATH_MAX_LENGTH &&
//         !hasControl(value, false) &&
//         !value.includes("@") &&
//         !LONE_SURROGATE.test(value) &&
//         (value === "*" ||
//           (value.startsWith("/") &&
//             !value.startsWith("//") &&
//             !value.startsWith("/\\")))
//       );
//     default:
//       return false;
//   }
// };
// /** Strict ancestors of a JSON pointer, from the root down. */
// const ancestorsOf = (pointer: string): string[] => {
//   const ancestors: string[] = [];
//   for (
//     let at = pointer.indexOf("/");
//     at !== -1;
//     at = pointer.indexOf("/", at + 1)
//   )
//     ancestors.push(pointer.slice(0, at));
//   return ancestors;
// };
// /** Add a pointer's strict ancestors, stopping at one already present (its own ancestors are too). */
// const addAncestors = (pointer: string, into: Set<string>): void => {
//   for (
//     let at = pointer.lastIndexOf("/");
//     at !== -1;
//     at = at === 0 ? -1 : pointer.lastIndexOf("/", at - 1)
//   ) {
//     const ancestor = pointer.slice(0, at);
//     if (into.has(ancestor)) return;
//     into.add(ancestor);
//   }
// };
// const groupByPointer = <T extends { readonly pointer: string }>(
//   facets: readonly T[],
// ): Map<string, T[]> => {
//   const groups = new Map<string, T[]>();
//   for (const facet of facets) {
//     const group = groups.get(facet.pointer);
//     if (group === undefined) groups.set(facet.pointer, [facet]);
//     else group.push(facet);
//   }
//   return groups;
// };
//
// /** A record's facet coordinates, indexed once for every headline check. */
// type FacetIndex = {
//   readonly sidecars: ReadonlyMap<string, readonly NumericSidecar[]>;
//   readonly bytes: ReadonlyMap<string, readonly BinaryField[]>;
//   /** The producer held a number or bytes here. */
//   readonly scalars: ReadonlySet<string>;
//   /** A facet lies beneath: the producer held a container here. */
//   readonly containers: ReadonlySet<string>;
//   /**
//    * Withheld by a value redaction or a redacted byte descriptor; either facet
//    * withholds the value even when the other one is missing.
//    */
//   readonly withheld: ReadonlySet<string>;
//   /** The parent of an omitted property name; it hides no sibling values. */
//   readonly omittedNames: ReadonlySet<string>;
// };
// const indexFacets = (record: WebNetworkCaptureRecord): FacetIndex => {
//   const containers = new Set<string>();
//   const withheld = new Set<string>();
//   const omittedNames = new Set<string>();
//   for (const { pointer } of record.numeric_literals)
//     addAncestors(pointer, containers);
//   for (const { pointer, state } of record.binary_fields) {
//     addAncestors(pointer, containers);
//     if (state === "redacted") withheld.add(pointer);
//   }
//   for (const redaction of record.redactions) {
//     addAncestors(redaction.pointer, containers);
//     ("scope" in redaction ? omittedNames : withheld).add(redaction.pointer);
//   }
//   const sidecars = groupByPointer(record.numeric_literals);
//   const bytes = groupByPointer(record.binary_fields);
//   return {
//     sidecars,
//     bytes,
//     scalars: new Set([...sidecars.keys(), ...bytes.keys()]),
//     containers,
//     withheld,
//     omittedNames,
//   };
// };
// /**
//  * A value the record marks as redacted, or that lies under a redacted value,
export const _l = 135;
