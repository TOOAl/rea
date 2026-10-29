export const __stub = 1;
//       ["&&=", "||=", "??="].includes(expression.operator)
//     )
//       pending.push(
//         { ...current, node: expression.left },
//         { ...current, node: expression.right },
//       );
//     else if (current.privateRead !== undefined) retainPrivateRead();
//     else retain({ node: expression, path: remaining });
//   }
//   return references;
// };
//
// type ObjectLiteralMember = t.ObjectExpression["properties"][number];
//
// /** Property positions grouped by whether an exact key can reach them. */
// interface ObjectPropertyIndex {
//   /** Spreads, computed keys and `__proto__` data entries reach every key. */
//   readonly keyIndependent: readonly number[];
//   readonly byName: ReadonlyMap<string, readonly number[]>;
// }
//
// // Mutation tracking resolves one key of the same literal per write, so the
// // index removes the per-write scan of every property.
// const propertyIndexes = new WeakMap<t.ObjectExpression, ObjectPropertyIndex>();
//
// const objectPropertyIndex = (node: t.ObjectExpression): ObjectPropertyIndex => {
//   const cached = propertyIndexes.get(node);
//   if (cached !== undefined) return cached;
//   const keyIndependent: number[] = [];
//   const byName = new Map<string, number[]>();
//   node.properties.forEach((property, index) => {
//     const name = t.isSpreadElement(property)
//       ? null
//       : semanticStaticPropertyKey(property.key, property.computed);
//     if (
//       name === null ||
//       (t.isObjectProperty(property) &&
//         !property.computed &&
//         !property.shorthand &&
//         name === "__proto__")
//     ) {
//       keyIndependent.push(index);
//       return;
//     }
//     const positions = byName.get(name);
//     if (positions === undefined) byName.set(name, [index]);
//     else positions.push(index);
//   });
//   const index = { keyIndependent, byName };
//   propertyIndexes.set(node, index);
//   return index;
// };
//
// /**
//  * Properties in reverse source order that can affect `key`. For an exact key,
//  * another static name only updates bookkeeping for that other name, which
//  * this key never reads, so only same-name and key-independent entries remain.
//  */
// const relevantPropertiesInReverse = (
//   node: t.ObjectExpression,
//   key: PropertyPath[number] | undefined,
// ): readonly ObjectLiteralMember[] => {
//   if (typeof key !== "string" && typeof key !== "number")
//     return [...node.properties].reverse();
//   const { keyIndependent, byName } = objectPropertyIndex(node);
//   const named = byName.get(String(key)) ?? [];
//   const relevant: ObjectLiteralMember[] = [];
//   let left = keyIndependent.length - 1;
//   let right = named.length - 1;
//   while (left >= 0 || right >= 0) {
//     const fromLeft =
//       right < 0 ||
//       (left >= 0 && (keyIndependent[left] ?? -1) > (named[right] ?? -1));
//     const position = fromLeft ? keyIndependent[left--] : named[right--];
//     const property =
//       position === undefined ? undefined : node.properties[position];
//     if (property !== undefined) relevant.push(property);
//   }
//   return relevant;
// };
//
// export const semanticObjectPropertyReferences = (
//   node: t.ObjectExpression,
//   path: PropertyPath,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly JavaScriptSemanticObjectReference[] => {
//   const [key, ...remaining] = path;
//   const references: JavaScriptSemanticObjectReference[] = [];
//   const overwritten = new Set<string>();
//   const dataOverwritten = new Set<string>();
//   const accessorNames = new Set<string>();
//   const getterNames = new Set<string>();
//   const setterNames = new Set<string>();
//   for (const property of relevantPropertiesInReverse(node, key)) {
//     if (t.isSpreadElement(property)) {
//       const selected = key ?? null;
//       if (typeof selected !== "object" && overwritten.has(String(selected)))
//         continue;
//       references.push({
//         node: property.argument,
//         path: [
//           typeof selected === "object"
//             ? {
//                 ...selected,
//                 excludedKeys: [
//                   ...new Set([
//                     ...(selected?.excludedKeys ?? []),
//                     ...overwritten,
//                   ]),
//                 ].sort(compareUnicodeCodePoints),
//               }
//             : selected,
//           ...remaining,
//         ],
//       });
//       if (
//         selected !== null &&
//         typeof selected !== "object" &&
//         t.isObjectExpression(property.argument) &&
//         objectExpressionDefinesKey(property.argument, String(selected))
//       ) {
//         overwritten.add(String(selected));
//         dataOverwritten.add(String(selected));
//       }
//       continue;
//     }
//     const name = semanticStaticPropertyKey(property.key, property.computed);
//     if (
//       t.isObjectProperty(property) &&
//       !property.computed &&
//       !property.shorthand &&
//       name === "__proto__"
//     ) {
//       const selected = key ?? null;
//       if (
//         (selected === null || typeof selected === "object") &&
//         t.isExpression(property.value)
//       ) {
//         references.push({
//           node: property.value,
//           path: [selected, ...remaining],
//         });
//       } else if (
//         typeof selected === "string" &&
//         !objectExpressionDefinesKey(node, selected) &&
//         t.isExpression(property.value)
//       ) {
//         references.push({
//           node: property.value,
//           path: [selected, ...remaining],
//         });
//       }
//       continue;
//     }
//     const isGetter = t.isObjectMethod(property) && property.kind === "get";
//     const isSetter = t.isObjectMethod(property) && property.kind === "set";
//     if (
//       name !== null &&
//       (isGetter || isSetter
//         ? dataOverwritten.has(name) ||
//           (isGetter ? getterNames.has(name) : setterNames.has(name))
//         : dataOverwritten.has(name) || accessorNames.has(name))
//     )
//       continue;
//     if (name === null || semanticPropertyPathKeyMatches(key ?? null, name)) {
//       if (t.isObjectMethod(property) && property.kind === "get") {
//         references.push(
//           ...getterResultReferences(
//             { getter: property, owner: node },
//             remaining,
//             state,
//           ),
//         );
//       } else if (t.isObjectMethod(property) && property.kind === "set") {
//         // A setter contributes no readable reference. A paired getter is
//         // handled independently when it appears earlier in this object.
//       } else {
//         references.push({
//           node: t.isObjectProperty(property) ? property.value : property,
//           path: remaining,
//         });
//       }
//     }
//     if (name !== null) {
//       if (isGetter) {
//         getterNames.add(name);
//         accessorNames.add(name);
//         overwritten.add(name);
//       } else if (isSetter) {
//         setterNames.add(name);
//         accessorNames.add(name);
//         overwritten.add(name);
//       } else if (
//         !(
//           t.isObjectProperty(property) &&
//           !property.computed &&
//           !property.shorthand &&
//           name === "__proto__"
//         )
//       ) {
//         overwritten.add(name);
//         dataOverwritten.add(name);
//       }
//     }
//   }
//   return references;
// };
//
// const objectExpressionDefinesKey = (
//   root: t.ObjectExpression,
//   key: string,
// ): boolean => {
//   const pending: t.ObjectExpression[] = [root];
//   const seen = new Set<t.ObjectExpression>();
//   for (let cursor = 0; cursor < pending.length; cursor++) {
//     const object = pending[cursor];
//     if (object === undefined || seen.has(object)) continue;
//     seen.add(object);
//     for (const property of object.properties) {
//       if (t.isSpreadElement(property)) {
//         if (t.isObjectExpression(property.argument))
//           pending.push(property.argument);
//         continue;
//       }
//       const name = semanticStaticPropertyKey(property.key, property.computed);
//       if (
//         name === key &&
//         !(
//           t.isObjectProperty(property) &&
//           !property.computed &&
//           !property.shorthand &&
//           name === "__proto__"
//         )
//       )
//         return true;
//     }
//   }
//   return false;
// };
export const _l = 239;
