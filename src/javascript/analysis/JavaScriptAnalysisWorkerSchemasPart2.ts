export const __stub = 1;
//                 "factory",
//                 "function",
//                 "call",
//                 "ipc",
//                 "terminal",
//               ]),
//               label: z.string(),
//               location: range,
//               module_key: z.string().nullable(),
//               module_runtime: z.string().nullable(),
//             }),
//           ),
//           conditions: z.array(
//             z.strictObject({ expression: z.string(), location: range }),
//           ),
//         }),
//       )
//       .transform((paths) =>
//         paths.map(({ entry_kind, entry, entry_path, ...rest }) =>
//           entry_path === undefined
//             ? { entry_kind, entry, ...rest }
//             : { entry_kind, entry, entry_path, ...rest },
//         ),
//       )
//       .optional(),
//     browser_windows: z.array(
//       z.union([
//         z
//           .strictObject({
//             ...windowShape,
//             preload_path: z.string(),
//             preload_resolution_context: pathContext,
//           })
//           .transform(withRuntime),
//         z
//           .strictObject({
//             ...windowShape,
//             preload_path: z.null(),
//             preload_resolution_context: z.null(),
//           })
//           .transform(withRuntime),
//       ]),
//     ),
//     context_bridge_apis: z.array(
//       z.union([
//         z
//           .strictObject({
//             ...bridgeShape,
//             api_key: z.string(),
//             api_key_expression: z.null(),
//           })
//           .transform(withRuntime),
//         z
//           .strictObject({
//             ...bridgeShape,
//             api_key: z.null(),
//             api_key_expression: z.string(),
//           })
//           .transform(withRuntime),
//         z
//           .strictObject({
//             ...bridgeShape,
//             api_key: z.null(),
//             api_key_expression: z.null(),
//           })
//           .transform(withRuntime),
//       ]),
//     ),
//     ipc: z.array(ipc),
//     sender_validations: z.array(
//       z.strictObject({
//         ...findingContext,
//         subject: z.enum([
//           "sender-url",
//           "sender-origin",
//           "sender-frame",
//           "sender-id",
//           "frame-id",
//           "process-id",
//         ]),
//         mechanism: z.string(),
//         expected: staticValue,
//         enforcement: z.literal("unknown"),
//       }),
//     ),
//     utility_processes: z.array(
//       z.union([
//         z
//           .strictObject({
//             ...utilityShape,
//             module_path: z.string(),
//             module_resolution_context: pathContext,
//             module_expression: z.null(),
//           })
//           .transform(withRuntime),
//         z
//           .strictObject({
//             ...utilityShape,
//             module_path: z.null(),
//             module_resolution_context: z.null(),
//             module_expression: z.string(),
//           })
//           .transform(withRuntime),
//       ]),
//     ),
//     native_addon_bindings: z.array(
//       z.strictObject({
//         ...findingContext,
//         specifier: z.string(),
//         binding_kind: z.enum(["import", "require", "re-export"]),
//         module_kind: z.enum(["import", "require"]),
//         members: strings,
//         namespace_access: z.boolean().optional(),
//         dynamic_member_access: z.boolean().optional(),
//       }),
//     ),
//   })
//   .transform(({ call_paths, ...rest }) => ({
//     ...rest,
//     ...(call_paths === undefined ? {} : { call_paths }),
//   }));
// const referenceShape = {
//   ...findingContext,
//   kind: z.enum([
//     "static-import",
//     "dynamic-import",
//     "require",
//     "worker",
//     "service-worker",
//   ]),
// };
//
// /** Exact producer facts recoverable before a later semantic worker failure. */
// export const javaScriptWorkerStaticAnalysisSchema = z
//   .strictObject({
//     parse_status: z.enum(["complete", "partial", "failed"]),
//     parse_error_count: count,
//     visited_ast_nodes: count,
//     references: z.array(
//       z.union([
//         z
//           .strictObject({
//             ...referenceShape,
//             specifier: z.string(),
//             expression: z.null(),
//           })
//           .transform(withRuntime),
//         z
//           .strictObject({
//             ...referenceShape,
//             specifier: z.null(),
//             expression: z.string(),
//           })
//           .transform(withRuntime),
//       ]),
//     ),
//     endpoints: z.array(
//       z.strictObject({
//         ...findingContext,
//         kind: z.enum(["route", "network"]),
//         value: z.string(),
//         mechanism: z.string(),
//         interpretation: z.literal("candidate").exactOptional(),
//       }),
//     ),
//     storage: z.array(
//       z.strictObject({
//         ...findingContext,
export const _l = 168;
