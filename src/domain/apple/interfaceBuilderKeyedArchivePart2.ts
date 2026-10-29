export const __stub = 1;
//     omittedHierarchyReferences: 0,
//   };
// };
//
// /**
//  * A UID decodes as a one-key `UID` (binary) or `CF$UID` (XML) dictionary with
//  * an integer value. Any other dictionary is ordinary archive data.
//  */
// const archiveUid = (value: unknown): number | undefined => {
//   if (typeof value !== "object" || value === null || Array.isArray(value))
//     return undefined;
//   if (Object.keys(value).length !== 1) return undefined;
//   const item = record(value);
//   const marker = Object.hasOwn(item, "UID") ? item.UID : item["CF$UID"];
//   return typeof marker === "number" && Number.isInteger(marker)
//     ? marker
//     : undefined;
// };
//
// const HIERARCHY_KEY =
//   /(?:subviews|contentview|childviewcontrollers|children|views)$/iu;
//
// /**
//  * Read an NSKeyedArchiver object table without expanding it into a tree.
//  * Archived objects reference each other freely, including cycles such as a
//  * view and its superview, so inlining every reference grows exponentially.
//  * A reference instead resolves to the referenced string, or to a stub that
//  * names the referenced object; the hierarchy walk visits each object once.
//  */
// const keyedArchiveTable = (objectTable: readonly unknown[]) => {
//   const classNameOf = (value: unknown): string | null => {
//     const classReference = record(value).$class;
//     const uid = archiveUid(classReference);
//     return firstString(
//       record(uid === undefined ? classReference : objectTable[uid]).$classname,
//     );
//   };
//   /** The string an archived string object holds, if it is one. */
//   const archivedString = (target: unknown): string | undefined => {
//     if (typeof target === "string") return target;
//     const text = record(target)["NS.string"];
//     return typeof text === "string" &&
//       /^NS(?:Mutable)?String$/u.test(classNameOf(target) ?? "")
//       ? text
//       : undefined;
//   };
//   const text = (value: unknown): string | null => {
//     const uid = archiveUid(value);
//     return firstString(
//       uid === undefined ? value : archivedString(objectTable[uid]),
//     );
//   };
//   const authoredId = (item: Record<string, unknown>): string | null =>
//     firstString(text(item.objectID), text(item["object-id"]));
//   const reference = (uid: number): unknown => {
//     // UID 0 is the archived nil.
//     const target = uid === 0 ? null : objectTable[uid];
//     if (target === undefined || target === null) return null;
//     if (typeof target !== "object") return target;
//     const string = archivedString(target);
//     if (string !== undefined) return string;
//     const objectId = authoredId(record(target));
//     return {
//       archiveUID: uid,
//       ...(objectId === null ? {} : { objectID: objectId }),
//       className: classNameOf(target),
//     };
//   };
//   /** Resolve one object's own fields, leaving references to other objects as stubs. */
//   const resolve = (value: unknown): unknown => {
//     const uid = archiveUid(value);
//     if (uid !== undefined) return reference(uid);
//     if (Array.isArray(value)) return value.map(resolve);
//     if (typeof value !== "object" || value === null) return value;
//     const output: Record<string, unknown> = {};
//     for (const [key, child] of Object.entries(value)) {
//       if (key === "$class") output.className = classNameOf(value);
//       else output[key] = resolve(child);
//     }
//     return output;
//   };
//   const hierarchy = (start: unknown) => {
//     let omittedReferences = 0;
//     const visited = new Set<number>();
//     const root: unknown[] = [];
//     const pending: { readonly value: unknown; readonly output: unknown[] }[] = [
//       { value: start, output: root },
//     ];
//     const appendNode = (
//       item: Record<string, unknown>,
//       uid: number | undefined,
//       output: unknown[],
//     ): void => {
//       const objectId = firstString(
//         authoredId(item),
//         text(item.id),
//         uid === undefined ? null : String(uid),
//       );
//       if (objectId === null) {
//         for (const [key, child] of Object.entries(item).reverse())
//           if (HIERARCHY_KEY.test(key)) pending.push({ value: child, output });
//         return;
//       }
//       const children: unknown[] = [];
//       output.push({ objectID: objectId, children });
//       for (const [key, child] of Object.entries(item).reverse())
//         if (HIERARCHY_KEY.test(key))
//           pending.push({ value: child, output: children });
//     };
//     while (pending.length > 0) {
//       const entry = pending.pop();
//       if (entry === undefined) break;
//       const { value, output } = entry;
//       const uid = archiveUid(value);
//       if (uid !== undefined) {
//         // UID0 is archived nil, not a missing hierarchy object.
//         if (uid === 0) continue;
//         const target = objectTable[uid];
//         if (target === undefined) {
//           omittedReferences += 1;
//           continue;
//         }
//         if (visited.has(uid)) continue;
//         visited.add(uid);
//         if (Array.isArray(target)) {
//           for (let index = target.length - 1; index >= 0; index -= 1) {
//             const child = target[index];
//             if (child !== undefined) pending.push({ value: child, output });
//           }
//           continue;
//         }
//         if (typeof target !== "object" || target === null) continue;
//         const item = record(target);
//         if (archivedArrayClass(item.$class)) {
//           const members = item["NS.objects"];
//           if (Array.isArray(members))
//             for (let index = members.length - 1; index >= 0; index -= 1) {
//               const child = members[index];
//               if (child !== undefined) pending.push({ value: child, output });
export const _l = 139;
