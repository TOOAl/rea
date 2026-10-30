export const __stub = 1;
//       .exactOptional(),
//     reason: z.enum(["symlink-escape", "unreadable"]),
//   }),
// ]);
//
// const vcsSchema = z
//   .discriminatedUnion("kind", [
//     z.strictObject({
//       kind: z.literal("git"),
//       head: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u),
//       dirty: z.boolean().nullable(),
//     }),
//     z.strictObject({
//       kind: z.literal("none"),
//       head: z.null(),
//       dirty: z.null(),
//     }),
//     z.strictObject({
//       kind: z.literal("unknown"),
//       head: z.null(),
//       dirty: z.null(),
//     }),
//   ])
//   .nullable();
//
// const graphShape = {
//   schema: z.literal("HistoricalSourceGraph"),
//   authority: z.literal("historical-reference"),
//   root_alias: z.literal("$REFERENCE_ROOT"),
//   root_sha256: digestSchema,
//   inventory_state: z.enum(["complete", "partial", "unknown"]),
//   entries: z.array(sourceEntrySchema),
//   relationships: z.array(sourceRelationshipSchema),
//   parse_failures: z.array(parseFailureSchema),
//   exclusions: z.array(exclusionSchema),
//   languages: z.array(z.string().min(1)),
//   manifests: z.array(relativePathSchema),
//   vcs: vcsSchema,
//   provenance: z.strictObject({
//     importer: z.string().min(1),
//     importer_version: z.string().min(1).nullable(),
//     caller: z
//       .string()
//       .min(1)
//       .regex(/^[\w .:@\x2f+\x2d]+$/u),
//   }),
//   limitations: z.array(boundedTextSchema),
// };
//
// const historicalSourceGraphStructureSchema = z
//   .strictObject(graphShape)
//   .superRefine(checkGraphInvariants);
//
// export const historicalSourceGraphSchema =
//   historicalSourceGraphStructureSchema.superRefine((graph, context) => {
//     if (
//       computeRootSha256(graph.entries, graph.exclusions) !== graph.root_sha256
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Historical source root commitment does not match entries",
//         path: ["root_sha256"],
//       });
//   });
//
// const historicalSourceGraphInputSchema = z.strictObject({
//   ...graphShape,
//   root_sha256: z.never().optional(),
// });
//
// const historicalSourceManifestBaseSchema = z.strictObject({
//   schema: z.literal("HistoricalSourceManifest"),
//   authority: z.literal("historical-reference"),
//   manifest_id: prefixedDigestSchema("hsm"),
//   graph_sha256: digestSchema,
//   root_sha256: digestSchema,
//   inventory_state: z.enum(["complete", "partial", "unknown"]),
//   entry_count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
//   relationship_count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
// });
//
// export type HistoricalSourceGraph = z.infer<typeof historicalSourceGraphSchema>;
// export type HistoricalSourceGraphInput = z.infer<
//   typeof historicalSourceGraphInputSchema
// >;
// export type HistoricalSourceManifest = z.infer<
//   typeof historicalSourceManifestBaseSchema
// >;
//
// /** Stable identity used to sort and deduplicate source parse failures. */
// export const historicalSourceParseFailureKey = (
//   failure: HistoricalSourceGraphInput["parse_failures"][number],
// ): string => `${failure.path}\u0000${failure.parser}\u0000${failure.reason}`;
//
// const relationshipKey = (
//   relationship: z.infer<typeof sourceRelationshipSchema>,
// ): string =>
//   `${relationship.from_path}\u0000${relationship.to}\u0000${relationship.kind}\u0000${relationship.resolution}\u0000${relationship.parse_state}`;
//
// const checkSortedUnique = (
//   values: readonly string[],
//   field: string,
//   context: z.RefinementCtx,
// ): void => {
//   for (let index = 1; index < values.length; index += 1)
//     if (
//       compareUnicodeCodePoints(values[index - 1] ?? "", values[index] ?? "") >=
//       0
//     ) {
//       context.addIssue({
//         code: "custom",
//         message: `${field} must be sorted and unique by Unicode code point`,
//         path: [field, index],
//       });
//       return;
//     }
// };
//
// /** Derive the canonical language index from inventoried source files. */
// export const historicalSourceLanguages = (
//   entries: readonly z.infer<typeof sourceEntrySchema>[],
// ): string[] =>
//   [
//     ...new Set(
//       entries.flatMap((entry) =>
//         entry.kind === "file" && entry.language !== null
//           ? [entry.language]
//           : [],
//       ),
//     ),
//   ].sort(compareUnicodeCodePoints);
//
// /** Derive the canonical manifest path index from inventoried source files. */
// export const historicalSourceManifests = (
//   entries: readonly z.infer<typeof sourceEntrySchema>[],
// ): string[] =>
//   entries
//     .flatMap((entry) =>
//       entry.kind === "file" && entry.classifications.includes("manifest")
//         ? [entry.path]
//         : [],
//     )
//     .sort(compareUnicodeCodePoints);
//
// type GraphStructure = z.infer<typeof historicalSourceGraphStructureSchema>;
//
// const checkRelationships = (
//   graph: GraphStructure,
//   paths: ReadonlySet<string>,
//   context: z.RefinementCtx,
export const _l = 150;
