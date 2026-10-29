export const __stub = 1;
//   );
//   const rightPairs = new Map(
//     input.pairing.pairs.map((pair) => [pair.rightIndex, pair]),
//   );
//   return [
//     ...input.leftShapes.map((shape, index) =>
//       inventoryFor("left", index, shape, leftPairs.get(index)),
//     ),
//     ...input.rightShapes.map((shape, index) =>
//       inventoryFor("right", index, shape, rightPairs.get(index)),
//     ),
//   ];
// };
//
// const inventoryFor = (
//   side: JavaScriptExportShapePropertyInventory["side"],
//   variantIndex: number,
//   shape: Shape,
//   pair: VariantPair | undefined,
// ): JavaScriptExportShapePropertyInventory => ({
//   side,
//   variant_index: variantIndex,
//   discriminant: pair?.discriminant ?? null,
//   paired: pair !== undefined,
//   source_range: shape.source_range,
//   properties: uniqueSorted([
//     ...shape.fields
//       .filter((field) => fieldPresence(shape, field, field.path) === "present")
//       .map(({ path }) => path),
//     ...shape.property_coverage.map(({ path }) => path),
//   ]).filter((path) => path !== ""),
//   property_coverage: shape.property_coverage.map(({ path, status }) => ({
//     path,
//     status,
//   })),
// });
//
// /** Report whether any retained shape lacks complete property coverage. */
// export const hasPartialJavaScriptExportPropertyCoverage = (
//   shapes: readonly Shape[],
// ): boolean =>
//   shapes.some(
//     (shape) =>
//       shape.property_coverage.some(({ status }) => status === "partial") ||
//       shape.fields.some(
//         (field) =>
//           fieldPresence(shape, field, field.path) === "unknown-coverage",
//       ),
//   );
//
// interface DiscriminantOccurrence {
//   readonly discriminant: Discriminant;
//   readonly indexes: number[];
// }
//
// const discriminantOccurrences = (
//   shapes: readonly Shape[],
// ): Map<string, DiscriminantOccurrence> => {
//   const output = new Map<string, DiscriminantOccurrence>();
//   shapes.forEach((shape, index) => {
//     for (const field of shape.fields) {
//       if (fieldPresence(shape, field, field.path) !== "present") continue;
//       const value = literalValue(field);
//       if (!value.found) continue;
//       const discriminant = { path: field.path, value: value.value };
//       const key = canonicalExportShapeValue(discriminant);
//       const current = output.get(key);
//       output.set(key, {
//         discriminant,
//         indexes: [...(current?.indexes ?? []), index],
//       });
//     }
//   });
//   return output;
// };
//
// const reciprocalPairs = (
//   leftTargets: ReadonlyMap<number, ReadonlySet<number>>,
//   rightTargets: ReadonlyMap<number, ReadonlySet<number>>,
//   edges: ReadonlyMap<string, readonly Discriminant[]>,
// ): VariantPair[] => {
//   const pairs: VariantPair[] = [];
//   for (const [leftIndex, targets] of leftTargets) {
//     if (targets.size !== 1) continue;
//     const rightIndex = [...targets][0];
//     if (
//       rightIndex === undefined ||
//       rightTargets.get(rightIndex)?.size !== 1 ||
//       !rightTargets.get(rightIndex)?.has(leftIndex)
//     )
//       continue;
//     const discriminants = edges
//       .get(`${String(leftIndex)}:${String(rightIndex)}`)
//       ?.toSorted(compareDiscriminants);
//     const discriminant = discriminants?.[0];
//     if (discriminant !== undefined)
//       pairs.push({ leftIndex, rightIndex, discriminant });
//   }
//   return pairs.sort((first, second) =>
//     compareDiscriminants(first.discriminant, second.discriminant),
//   );
// };
//
// const addTarget = (
//   map: Map<number, Set<number>>,
//   source: number,
//   target: number,
// ): void => {
//   const values = map.get(source) ?? new Set<number>();
//   values.add(target);
//   map.set(source, values);
// };
//
// const indexesNotIn = (
//   shapes: readonly Shape[],
//   paired: ReadonlySet<number>,
// ): number[] =>
//   shapes.map((_, index) => index).filter((index) => !paired.has(index));
//
// const compareDiscriminants = (
//   left: Discriminant,
//   right: Discriminant,
// ): number =>
//   compareUnicodeCodePoints(
//     canonicalExportShapeValue(left),
//     canonicalExportShapeValue(right),
//   );
//
// const selectionUnknownChange = (
//   input: ChangeBuildInput,
// ): JavaScriptExportShapeComparisonChange =>
//   changeWithId({
export const _l = 132;
