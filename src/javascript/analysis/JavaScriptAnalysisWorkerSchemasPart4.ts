export const __stub = 1;
//     status: z.literal("local"),
//     origins: z.tuple([]),
//     reason: z.null(),
//   }),
//   z.strictObject({
//     status: z.literal("ambiguous"),
//     origins: z.array(origin),
//     reason: z.string(),
//   }),
//   z.strictObject({
//     status: z.enum(["unknown", "cycle"]),
//     origins: z.tuple([]),
//     reason: z.string(),
//   }),
// ]);
// const coverage = z
//   .discriminatedUnion("status", [
//     z.strictObject({
//       status: z.literal("complete"),
//       omittedCount: z.literal(0),
//       resourceLimits: z.array(resourceLimit).optional(),
//     }),
//     z.strictObject({
//       status: z.literal("partial"),
//       omittedCount: z.union([z.literal(0), z.null()]),
//       resourceLimits: z.array(resourceLimit).optional(),
//     }),
//     z.strictObject({
//       status: z.literal("failed"),
//       omittedCount: z.null(),
//       resourceLimits: z.array(resourceLimit).optional(),
//     }),
//   ])
//   .transform((value) => {
//     const { resourceLimits, ...rest } = value;
//     return {
//       ...rest,
//       ...(resourceLimits === undefined ? {} : { resourceLimits }),
//     };
//   });
// const moduleLink = z
//   .strictObject({
//     resolutionMode: z
//       .enum(["import", "require", "compiler-dependent"])
//       .optional(),
//     kind: z.enum([
//       "import",
//       "type-import",
//       "require",
//       "export",
//       "re-export",
//       "commonjs-export",
//     ]),
//     specifier: z.string().nullable(),
//     importedName: z.string().nullable(),
//     localName: z.string().nullable(),
//     exportedName: z.string().nullable(),
//     callableId: z.string().nullable(),
//     location: range,
//   })
//   .transform(({ resolutionMode, ...rest }) => ({
//     ...rest,
//     ...(resolutionMode === undefined ? {} : { resolutionMode }),
//   }));
// const definitionKind = z.enum([
//   "import",
//   "variable",
//   "parameter",
//   "function",
//   "class",
//   "catch",
//   "assignment",
// ]);
// const scope = z.strictObject({
//   scopeId: z.string(),
//   parentScopeId: z.string().nullable(),
//   kind: z.enum([
//     "program",
//     "function",
//     "block",
//     "static-block",
//     "class",
//     "catch",
//   ]),
//   location: range,
//   bindingsComplete: z.boolean(),
//   bindingIds: strings,
// });
// const binding = z.strictObject({
//   bindingId: z.string(),
//   scopeId: z.string(),
//   name: z.string(),
//   kind: definitionKind,
//   mutable: z.boolean(),
//   definitions: z.array(
//     z.strictObject({ kind: definitionKind, location: range }),
//   ),
//   value: semanticValue,
//   provenance,
// });
// const callable = z.strictObject({
//   callableId: z.string(),
//   kind: z.enum(["function", "class", "method"]),
//   name: z.string().nullable(),
//   containerScopeId: z.string(),
//   bodyScopeId: z.string().nullable(),
//   location: range,
//   returnSites: z.array(
//     z.strictObject({
//       returnSiteId: z.string(),
//       location: range,
//       identityReferenceLocation: range.nullable(),
//       value: semanticValue,
//     }),
//   ),
//   returnCoverage: z.strictObject({
//     retainedCount: count,
//     status: z.enum(["complete", "partial"]),
//     omittedCount: z.union([z.literal(0), z.null()]),
//   }),
// });
//
// /** Validate each transferred graph fact independently of its emitting realm. */
// export const javaScriptWorkerGraphRecordSchema = z.discriminatedUnion("kind", [
//   z.strictObject({
//     kind: z.literal("evidence-context"),
//     value: javaScriptSemanticEvidenceContextSchema,
//   }),
//   z.strictObject({
//     kind: z.literal("node"),
//     value: javaScriptSemanticNodeSchema,
//   }),
//   z.strictObject({
//     kind: z.literal("relation"),
//     value: javaScriptSemanticRelationSchema,
//   }),
//   z.strictObject({
//     kind: z.literal("unknown"),
//     value: javaScriptSemanticUnknownSchema,
//   }),
//   z.strictObject({
//     kind: z.literal("fingerprint"),
//     value: javaScriptSemanticFingerprintSchema,
//   }),
// ]);
//
// /** Portable per-file header, before any graph binding or immutable proof. */
// export const javaScriptWorkerProjectionHeaderSchema = z.strictObject({
//   roots: z.array(javaScriptSemanticNodeSchema.shape.node_id),
//   truncated: z.boolean(),
// });
//
// /** Module facts are transferred individually to avoid a whole-IR JSON string. */
// export const javaScriptWorkerModuleRecordSchema = z.discriminatedUnion("kind", [
//   z.strictObject({ kind: z.literal("scope"), value: scope }),
//   z.strictObject({ kind: z.literal("binding"), value: binding }),
//   z.strictObject({ kind: z.literal("callable"), value: callable }),
//   z.strictObject({ kind: z.literal("module-link"), value: moduleLink }),
// ]);
//
// /** Coverage and limitations are independent of module collection sizes. */
// export const javaScriptWorkerModuleHeaderSchema = z.strictObject({
//   coverage,
//   limitations: strings,
// });
export const _l = 165;
