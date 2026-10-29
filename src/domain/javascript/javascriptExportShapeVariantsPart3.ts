export const __stub = 1;
//     status: "unknown",
//     path: "",
//     discriminant: null,
//     presence: UNKNOWN_COVERAGE_PRESENCE,
//     left: selectionAvailability(input.leftSelection.selection, "left"),
//     right: selectionAvailability(input.rightSelection.selection, "right"),
//     left_source_range: null,
//     right_source_range: null,
//     evidence_links: input.evidenceLinks,
//     limitations: [
//       "Both selectors must resolve one exact export with trusted static return shapes before comparison.",
//     ],
//   });
//
// const emptyShapeUnknownChange = (
//   input: ChangeBuildInput,
// ): JavaScriptExportShapeComparisonChange =>
//   changeWithId({
//     status: "unknown",
//     path: "",
//     discriminant: null,
//     presence: UNKNOWN_COVERAGE_PRESENCE,
//     left: emptyShapeAvailability(input.leftShapes, "left"),
//     right: emptyShapeAvailability(input.rightShapes, "right"),
//     left_source_range: null,
//     right_source_range: null,
//     evidence_links: input.evidenceLinks,
//     limitations: [
//       "At least one selected export has no retained direct return shape.",
//     ],
//   });
//
// const diffPair = (
//   left: Shape,
//   right: Shape,
//   discriminant: Discriminant,
//   evidenceLinks: [string, string],
// ): JavaScriptExportShapeComparisonChange[] => {
//   const leftFields = new Map(left.fields.map((field) => [field.path, field]));
//   const rightFields = new Map(right.fields.map((field) => [field.path, field]));
//   const paths = uniqueSorted([
//     ...leftFields.keys(),
//     ...rightFields.keys(),
//     ...left.property_coverage.map(({ path }) => path),
//     ...right.property_coverage.map(({ path }) => path),
//   ]);
//   return paths.flatMap((path) => {
//     const leftField = fieldAtPath(left, leftFields, path);
//     const rightField = fieldAtPath(right, rightFields, path);
//     const status = fieldChangeStatus({
//       leftShape: left,
//       rightShape: right,
//       path,
//       leftField,
//       rightField,
//     });
//     if (status === null) return [];
//     return [
//       changeWithId({
//         status,
//         path,
//         discriminant,
//         presence: {
//           left: fieldPresence(left, leftField, path),
//           right: fieldPresence(right, rightField, path),
//         },
//         left: fieldAvailability(leftField),
//         right: fieldAvailability(rightField),
//         left_source_range: left.source_range,
//         right_source_range: right.source_range,
//         evidence_links: evidenceLinks,
//         limitations:
//           status === "unknown"
//             ? [
//                 "The static value or relevant parent-property coverage is incomplete.",
//               ]
//             : [],
//       }),
//     ];
//   });
// };
//
// const fieldAtPath = (
//   shape: Shape,
//   fields: ReadonlyMap<string, Field>,
//   path: string,
// ): Field | undefined => {
//   const field = fields.get(path);
//   if (field !== undefined) return field;
//   if (!shape.property_coverage.some((coverage) => coverage.path === path))
//     return undefined;
//   return {
//     path,
//     presence: "present",
//     state: "unknown",
//     value: null,
//     reason:
//       "A static container is retained at this path, but no primitive field value is projected.",
//   };
// };
//
// interface FieldChangeInput {
//   readonly leftShape: Shape;
//   readonly rightShape: Shape;
//   readonly path: string;
//   readonly leftField: Field | undefined;
//   readonly rightField: Field | undefined;
// }
//
// const fieldChangeStatus = ({
//   leftShape,
//   rightShape,
//   path,
//   leftField,
//   rightField,
// }: FieldChangeInput):
//   | JavaScriptExportShapeComparisonChange["status"]
//   | null => {
//   const leftPresence = fieldPresence(leftShape, leftField, path);
//   const rightPresence = fieldPresence(rightShape, rightField, path);
//   if (
//     leftField !== undefined &&
//     rightField !== undefined &&
//     canonicalExportShapeValue(leftField) ===
//       canonicalExportShapeValue(rightField)
//   )
//     return null;
//   if (leftPresence === "absent" && rightPresence === "absent") return null;
//   if (
//     leftPresence === "unknown-coverage" ||
//     rightPresence === "unknown-coverage"
//   )
export const _l = 132;
