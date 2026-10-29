export const __stub = 1;
//         kind: z.enum([
//           "local-storage",
//           "session-storage",
//           "indexed-db",
//           "cache-storage",
//           "sqlite",
//         ]),
//         name: z.string().nullable(),
//         mechanism: z.string(),
//       }),
//     ),
//     bundler_registrations: z.array(
//       z.strictObject({
//         bundler: z.enum(["webpack", "rspack", "esbuild"]),
//         runtime: z.string(),
//         chunk_keys: strings,
//         unknown_chunk_keys: count,
//         runtime_require_name: z.string().nullable(),
//         runtime_module_cache_status: z.enum(["observed", "not-observed"]),
//         entry_module_keys: strings,
//         unknown_entry_module_keys: count,
//         async_chunk_keys: strings,
//         unknown_async_chunk_keys: count,
//         modules: z.array(
//           z.strictObject({
//             module_key: z.string(),
//             factory_require_name: z.string().nullable(),
//             source_sha256: digestSchema,
//             exports: strings,
//             location: range,
//             structural_fingerprint_sha256: digestSchema,
//             structural_fingerprint_algorithm: z.literal(
//               JAVASCRIPT_AST_FINGERPRINT_ALGORITHM,
//             ),
//           }),
//         ),
//         location: range,
//       }),
//     ),
//     role_paths: z.array(
//       z.strictObject({
//         ...findingContext,
//         role: z.enum(["preload", "renderer"]),
//         path: z.string(),
//         resolution_context: pathContext,
//         mechanism: z.string(),
//       }),
//     ),
//     source_map_urls: z.array(
//       z.strictObject({ declared_url: z.string(), location: range }),
//     ),
//     vendors: strings,
//     electron,
//     limitations: strings,
//   })
//   .transform((analysis) => ({
//     ...analysis,
//     endpoints: analysis.endpoints.map(withRuntime),
//     storage: analysis.storage.map(withRuntime),
//     role_paths: analysis.role_paths.map(withRuntime),
//     electron: {
//       ...analysis.electron,
//       sender_validations: analysis.electron.sender_validations.map(withRuntime),
//       native_addon_bindings: analysis.electron.native_addon_bindings.map(
//         (value) => {
//           const { namespace_access, dynamic_member_access, ...rest } =
//             withRuntime(value);
//           return {
//             ...rest,
//             ...(namespace_access === undefined ? {} : { namespace_access }),
//             ...(dynamic_member_access === undefined
//               ? {}
//               : { dynamic_member_access }),
//           };
//         },
//       ),
//     },
//   })) satisfies z.ZodType<JavaScriptStaticAnalysis>;
//
// const resourceLimit = z.enum([
//   "primitive-candidates",
//   "primitive-bytes",
//   "expression-depth",
// ]);
// const primitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);
// const property: z.ZodType<JavaScriptSemanticProperty> = z.lazy(() =>
//   z.strictObject({
//     name: z.string(),
//     value: semanticValue,
//     presence: z.enum(["present", "absent", "unknown-coverage"]),
//   }),
// );
// const semanticValue: z.ZodType<JavaScriptSemanticValue> = z.lazy(() =>
//   z
//     .discriminatedUnion("status", [
//       z.strictObject({ status: z.literal("literal"), value: primitive }),
//       z.strictObject({
//         status: z.literal("union"),
//         values: z.array(primitive),
//       }),
//       z.discriminatedUnion("unknownProperties", [
//         z.strictObject({
//           status: z.literal("object"),
//           properties: z.array(property),
//           unknownProperties: z.literal(false),
//           omittedProperties: z.literal(0),
//         }),
//         z.strictObject({
//           status: z.literal("object"),
//           properties: z.array(property),
//           unknownProperties: z.literal(true),
//           omittedProperties: count.nullable(),
//         }),
//       ]),
//       z.discriminatedUnion("unknownItems", [
//         z.strictObject({
//           status: z.literal("array"),
//           items: z.array(property),
//           unknownItems: z.literal(false),
//           omittedItems: z.literal(0),
//         }),
//         z.strictObject({
//           status: z.literal("array"),
//           items: z.array(property),
//           unknownItems: z.literal(true),
//           omittedItems: count.nullable(),
//         }),
//       ]),
//       z.strictObject({
//         status: z.enum(["unknown", "ambiguous", "cycle"]),
//         reason: z.string(),
//         resourceLimit: resourceLimit.optional(),
//       }),
//     ])
//     .transform((value) => {
//       if (
//         value.status === "literal" ||
//         value.status === "union" ||
//         value.status === "object" ||
//         value.status === "array"
//       )
//         return value;
//       const { resourceLimit: limit, ...rest } = value;
//       return {
//         ...rest,
//         ...(limit === undefined ? {} : { resourceLimit: limit }),
//       };
//     }),
// );
// const origin = z
//   .strictObject({
//     specifier: z.string(),
//     importedPath: strings,
//     resolutionMode: z
//       .enum(["import", "require", "compiler-dependent"])
//       .optional(),
//   })
//   .transform(({ resolutionMode, ...rest }) => ({
//     ...rest,
//     ...(resolutionMode === undefined ? {} : { resolutionMode }),
//   }));
// const provenance = z.discriminatedUnion("status", [
//   z.strictObject({
//     status: z.literal("module"),
//     origins: z.tuple([origin]),
//     reason: z.null(),
//   }),
//   z.strictObject({
export const _l = 168;
