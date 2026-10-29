export const __stub = 1;
// import {
//   canonicalExportShapeValue,
//   digestExportShapeValue,
// } from "./javascriptExportShapeComparisonIdentity.js";
// import type {
//   JavaScriptExportShapeComparisonChange,
//   JavaScriptExportShapeComparisonResult,
//   JavaScriptExportShapePropertyInventory,
// } from "./javascriptExportShapeComparisonSchemas.js";
// import { uniqueSorted } from "../canonicalOrdering.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import type {
//   SelectedJavaScriptExport,
//   RetainedJavaScriptExportShapes,
// } from "./javascriptExportShapeSelection.js";
//
// type Primitive = string | number | boolean | null;
// type Shape = RetainedJavaScriptExportShapes["shapes"][number];
// type Field = Shape["fields"][number];
// type SelectorResult = JavaScriptExportShapeComparisonResult["left"];
// type ValueAvailability = JavaScriptExportShapeComparisonChange["left"];
// type PropertyPresence =
//   JavaScriptExportShapeComparisonChange["presence"]["left"];
// type Discriminant = NonNullable<
//   JavaScriptExportShapeComparisonChange["discriminant"]
// >;
// const UNKNOWN_COVERAGE_PRESENCE = {
//   left: "unknown-coverage",
//   right: "unknown-coverage",
// } as const satisfies JavaScriptExportShapeComparisonChange["presence"];
//
// interface VariantPair {
//   readonly leftIndex: number;
//   readonly rightIndex: number;
//   readonly discriminant: Discriminant;
// }
//
// /** Unique-only return-variant pairings plus every unpaired retained variant. */
// export interface JavaScriptExportShapePairing {
//   readonly pairs: readonly VariantPair[];
//   readonly unpairedLeft: readonly number[];
//   readonly unpairedRight: readonly number[];
// }
//
// /** Pair variants only through reciprocal unique exact literal discriminants. */
// export const pairJavaScriptExportShapeVariants = (
//   left: readonly Shape[],
//   right: readonly Shape[],
// ): JavaScriptExportShapePairing => {
//   const leftKeys = discriminantOccurrences(left);
//   const rightKeys = discriminantOccurrences(right);
//   const edges = new Map<string, Discriminant[]>();
//   const leftTargets = new Map<number, Set<number>>();
//   const rightTargets = new Map<number, Set<number>>();
//   for (const [key, leftOccurrence] of leftKeys) {
//     const rightOccurrence = rightKeys.get(key);
//     if (
//       leftOccurrence.indexes.length !== 1 ||
//       rightOccurrence?.indexes.length !== 1
//     )
//       continue;
//     const leftIndex = leftOccurrence.indexes[0];
//     const rightIndex = rightOccurrence.indexes[0];
//     if (leftIndex === undefined || rightIndex === undefined) continue;
//     const edgeKey = `${String(leftIndex)}:${String(rightIndex)}`;
//     edges.set(edgeKey, [
//       ...(edges.get(edgeKey) ?? []),
//       leftOccurrence.discriminant,
//     ]);
//     addTarget(leftTargets, leftIndex, rightIndex);
//     addTarget(rightTargets, rightIndex, leftIndex);
//   }
//   const pairs = reciprocalPairs(leftTargets, rightTargets, edges);
//   const pairedLeft = new Set(pairs.map(({ leftIndex }) => leftIndex));
//   const pairedRight = new Set(pairs.map(({ rightIndex }) => rightIndex));
//   return {
//     pairs,
//     unpairedLeft: indexesNotIn(left, pairedLeft),
//     unpairedRight: indexesNotIn(right, pairedRight),
//   };
// };
//
// interface ChangeBuildInput {
//   readonly leftSelection: SelectedJavaScriptExport;
//   readonly rightSelection: SelectedJavaScriptExport;
//   readonly pairing: JavaScriptExportShapePairing;
//   readonly leftShapes: readonly Shape[];
//   readonly rightShapes: readonly Shape[];
//   readonly evidenceLinks: [string, string];
// }
//
// /** Build bounded-ready field and unpaired-variant changes before caller slicing. */
// export const buildJavaScriptExportShapeChanges = (
//   input: ChangeBuildInput,
// ): JavaScriptExportShapeComparisonChange[] => {
//   if (
//     input.leftSelection.selection.status !== "selected" ||
//     input.rightSelection.selection.status !== "selected"
//   )
//     return [selectionUnknownChange(input)];
//   if (input.leftShapes.length === 0 && input.rightShapes.length === 0)
//     return [emptyShapeUnknownChange(input)];
//   const paired = input.pairing.pairs.flatMap((pair) => {
//     const left = input.leftShapes[pair.leftIndex];
//     const right = input.rightShapes[pair.rightIndex];
//     return left === undefined || right === undefined
//       ? []
//       : diffPair(left, right, pair.discriminant, input.evidenceLinks);
//   });
//   const unpairedLeft = input.pairing.unpairedLeft.flatMap((index) => {
//     const shape = input.leftShapes[index];
//     return shape === undefined
//       ? []
//       : [unpairedChange("left", shape, input.evidenceLinks)];
//   });
//   const unpairedRight = input.pairing.unpairedRight.flatMap((index) => {
//     const shape = input.rightShapes[index];
//     return shape === undefined
//       ? []
//       : [unpairedChange("right", shape, input.evidenceLinks)];
//   });
//   return [...paired, ...unpairedLeft, ...unpairedRight];
// };
//
// /** List observed property names per retained variant, including unknown values. */
// export const buildJavaScriptExportShapeInventories = (input: {
//   readonly pairing: JavaScriptExportShapePairing;
//   readonly leftShapes: readonly Shape[];
//   readonly rightShapes: readonly Shape[];
// }): JavaScriptExportShapePropertyInventory[] => {
//   const leftPairs = new Map(
//     input.pairing.pairs.map((pair) => [pair.leftIndex, pair]),
export const _l = 132;
