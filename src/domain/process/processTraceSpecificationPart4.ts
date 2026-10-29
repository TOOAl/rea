export const __stub = 1;
//     context,
//     known,
//   );
//   const unorderedGroups = validateUnorderedGroups(
//     specification.language,
//     context,
//     known,
//   );
//   // Preserve independent declaration diagnostics on cyclic input. Computing
//   // all pair relations cannot establish a valid partial order in that case.
//   if (graph.kind === "total-order") {
//     validateTotalOrderRelations(
//       specification.language,
//       graph,
//       unorderedGroups,
//       notBeforePairs,
//       context,
//     );
//   } else if (graph.kind === "partial-order") {
//     validatePartialOrderRelations(
//       ids,
//       specification.language,
//       adjacency,
//       graph,
//       unorderedGroups,
//       notBeforePairs,
//       context,
//     );
//   }
//   for (const [kind, values] of [
//     ["prefix", specification.language.prefix],
//     ["suffix", specification.language.suffix],
//   ] as const)
//     for (const [index, id] of values.entries())
//       addReferenceIssue(context, known, id, ["language", kind, index]);
// };
//
// const countVariantEvents = (
//   trace: readonly (string | { readonly unordered: readonly string[] })[],
// ): ReadonlyMap<string, number> => {
//   const counts = new Map<string, number>();
//   for (const token of trace)
//     for (const id of typeof token === "string" ? [token] : token.unordered)
//       counts.set(id, (counts.get(id) ?? 0) + 1);
//   return counts;
// };
//
// const validateFiniteTraces = (
//   specification: ProcessTraceSpecification,
//   context: z.RefinementCtx,
// ): void => {
//   if (specification.language.kind !== "finite_traces") return;
//   const known = new Set(specification.events.map(({ id }) => id));
//   const variantIds = new Set<string>();
//   const variantTraces = new Set<string>();
//   for (const [
//     variantIndex,
//     variant,
//   ] of specification.language.variants.entries()) {
//     const variantPath = ["language", "variants", variantIndex];
//     if (variantIds.has(variant.id))
//       context.addIssue({
//         code: "custom",
//         message: "finite trace variant ids must be unique",
//         path: [...variantPath, "id"],
//       });
//     variantIds.add(variant.id);
//     const canonicalTrace = canonicalTraceJson(variant.trace);
//     if (variantTraces.has(canonicalTrace))
//       context.addIssue({
//         code: "custom",
//         message: "finite trace variants must not duplicate a trace",
//         path: [...variantPath, "trace"],
//       });
//     variantTraces.add(canonicalTrace);
//     for (const [tokenIndex, token] of variant.trace.entries()) {
//       const values = typeof token === "string" ? [token] : token.unordered;
//       for (const [eventIndex, id] of values.entries())
//         addReferenceIssue(context, known, id, [
//           ...variantPath,
//           "trace",
//           tokenIndex,
//           ...(typeof token === "string" ? [] : ["unordered", eventIndex]),
//         ]);
//     }
//     const counts = countVariantEvents(variant.trace);
//     for (const event of specification.events) {
//       const [minimum, maximum] = processTraceCardinalityBounds(
//         event.cardinality,
//       );
//       const count = counts.get(event.id) ?? 0;
//       if (count < minimum || count > maximum)
//         context.addIssue({
//           code: "custom",
//           message: `variant ${variant.id} violates ${event.id} cardinality`,
//           path: [...variantPath, "trace"],
//         });
//     }
//   }
// };
//
// /** Strict, bounded concurrency model for Process Capture observations. */
// export const processTraceSpecificationSchema =
//   specificationShapeSchema.superRefine((specification, context) => {
//     const ids = new Set<string>();
//     const predicates = new Set<string>();
//     const ignoredFieldsBySource = new Map<string, string>();
//     for (const [index, event] of specification.events.entries()) {
//       if (ids.has(event.id))
//         context.addIssue({
//           code: "custom",
//           message: "event ids must be unique",
//           path: ["events", index, "id"],
//         });
//       ids.add(event.id);
//       const ignoredFields = [...(event.ignore_fields ?? [])].sort();
//       if (
//         ignoredFields.length > 0 &&
//         (typeof event.exact !== "object" ||
//           event.exact === null ||
//           Array.isArray(event.exact))
//       )
//         context.addIssue({
//           code: "custom",
//           message: "ignored schedule fields require an exact object payload",
//           path: ["events", index, "ignore_fields"],
//         });
//       const ignoredKey = canonicalTraceJson(ignoredFields);
//       const priorIgnoredKey = ignoredFieldsBySource.get(event.source);
//       if (priorIgnoredKey !== undefined && priorIgnoredKey !== ignoredKey)
//         context.addIssue({
//           code: "custom",
//           message:
//             "events from one source must use the same ignored schedule fields",
//           path: ["events", index, "ignore_fields"],
//         });
//       ignoredFieldsBySource.set(event.source, ignoredKey);
//       if (
//         ignoredFields.some(
//           (field) =>
//             typeof event.exact === "object" &&
//             event.exact !== null &&
//             !Array.isArray(event.exact) &&
//             field in event.exact,
//         )
//       )
//         context.addIssue({
//           code: "custom",
//           message: "exact payload must omit every ignored schedule field",
//           path: ["events", index, "exact"],
//         });
//       const predicate = `${event.source}\0${canonicalTraceJson(
//         comparableProcessObservationPayload(event.exact, ignoredFields),
//       )}`;
//       if (predicates.has(predicate))
//         context.addIssue({
//           code: "custom",
//           message: "exact event predicates must not overlap",
//           path: ["events", index],
//         });
//       predicates.add(predicate);
//     }
//     validatePartialOrder(specification, context);
//     validateFiniteTraces(specification, context);
//   });
export const _l = 165;
