export const __stub = 1;
// import { z } from "zod";
// import { digestSchema } from "../../domain/digests.js";
// import type { JavaScriptStaticAnalysis } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
// import { JAVASCRIPT_AST_FINGERPRINT_ALGORITHM } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
// import type {
//   JavaScriptSemanticProperty,
//   JavaScriptSemanticValue,
// } from "../../domain/javascript/javascriptSemanticValueTypes.js";
// import {
//   javaScriptSemanticNodeSchema,
//   javaScriptSemanticRelationSchema,
//   javaScriptSemanticUnknownSchema,
//   javaScriptSemanticFingerprintSchema,
//   javaScriptSemanticEvidenceContextSchema,
// } from "../../domain/javascript/javascriptSemanticGraphSchemas.js";
//
// const range =
//   javaScriptSemanticNodeSchema.shape.identity.shape.source_range.unwrap();
// const count = z.number().int().nonnegative();
// const strings = z.array(z.string());
// const pathContext = z.enum(["module-specifier", "filesystem-expression"]);
// const findingContext = {
//   module_key: z.string().nullable(),
//   module_runtime: z.string().optional(),
//   location: range,
// };
// const withRuntime = <
//   Value extends {
//     module_runtime?: string | undefined;
//     resolution_basis?: "wrapper-substitution" | undefined;
//   },
// >(
//   value: Value,
// ) => {
//   const { module_runtime, resolution_basis, ...rest } = value;
//   return {
//     ...rest,
//     ...(module_runtime === undefined ? {} : { module_runtime }),
//     ...(resolution_basis === undefined ? {} : { resolution_basis }),
//   };
// };
// const staticValue = z.discriminatedUnion("status", [
//   z.strictObject({
//     status: z.literal("literal"),
//     value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
//     expression: z.null(),
//   }),
//   z.strictObject({
//     status: z.literal("dynamic"),
//     value: z.null(),
//     expression: z.string(),
//   }),
// ]);
// const nullHandler = { handler_kind: z.null(), handler_location: z.null() };
// const missingHandler = {
//   handler_kind: z.literal("missing"),
//   handler_location: z.null(),
// };
// const locatedHandler = {
//   handler_kind: z.enum([
//     "inline-function",
//     "identifier",
//     "member-expression",
//     "dynamic-expression",
//   ]),
//   handler_location: range,
// };
// const ipcChannel = <Shape extends z.ZodRawShape>(shape: Shape) =>
//   z.union([
//     z.strictObject({
//       ...findingContext,
//       invocation_location: range.optional(),
//       resolution_basis: z.literal("wrapper-substitution").optional(),
//       ...shape,
//       channel: z.string(),
//       channel_expression: z.null(),
//     }),
//     z.strictObject({
//       ...findingContext,
//       invocation_location: range.optional(),
//       resolution_basis: z.literal("wrapper-substitution").optional(),
//       ...shape,
//       channel: z.null(),
//       channel_expression: z.string(),
//     }),
//   ]);
// const ipc = z
//   .union([
//     ipcChannel({
//       side: z.literal("renderer"),
//       operation: z.enum(["send", "send-sync", "post-message", "send-to-host"]),
//       mode: z.literal("send"),
//       ...nullHandler,
//     }),
//     ipcChannel({
//       side: z.literal("renderer"),
//       operation: z.literal("invoke"),
//       mode: z.literal("invoke"),
//       ...nullHandler,
//     }),
//     ipcChannel({
//       side: z.enum(["renderer", "main"]),
//       operation: z.enum(["on", "once"]),
//       mode: z.literal("listen"),
//       ...missingHandler,
//     }),
//     ipcChannel({
//       side: z.enum(["renderer", "main"]),
//       operation: z.enum(["on", "once"]),
//       mode: z.literal("listen"),
//       ...locatedHandler,
//     }),
//     ipcChannel({
//       side: z.literal("main"),
//       operation: z.enum(["handle", "handle-once"]),
//       mode: z.literal("handle"),
//       ...missingHandler,
//     }),
//     ipcChannel({
//       side: z.literal("main"),
//       operation: z.enum(["handle", "handle-once"]),
//       mode: z.literal("handle"),
//       ...locatedHandler,
//     }),
//   ])
//   .transform((value) => {
//     const { module_runtime, resolution_basis, invocation_location, ...rest } =
//       value;
//     return {
//       ...rest,
//       ...(module_runtime === undefined ? {} : { module_runtime }),
//       ...(resolution_basis === undefined ? {} : { resolution_basis }),
//       ...(invocation_location === undefined ? {} : { invocation_location }),
//     };
//   });
// const windowShape = {
//   ...findingContext,
//   options_status: z.enum(["object-literal", "dynamic", "missing"]),
//   web_preferences_status: z.enum(["object-literal", "dynamic", "missing"]),
//   web_preferences: z.array(
//     z.strictObject({ name: z.string(), value: staticValue }),
//   ),
// };
// const bridgeShape = {
//   resolution_basis: z.literal("wrapper-substitution").optional(),
//   ...findingContext,
//   world: z.enum(["main", "isolated"]),
//   world_id: staticValue.nullable(),
//   api_status: z.enum(["object-literal", "dynamic", "missing"]),
//   members: strings,
//   unknown_members: count,
// };
// const utilityShape = { ...findingContext, service_name: z.string().nullable() };
// const electron = z
//   .strictObject({
//     call_paths: z
//       .array(
//         z.strictObject({
//           entry_kind: z.enum(["bridge-member", "ipc-handler"]),
//           entry: z.string(),
//           entry_path: strings.optional(),
//           channel: z.string().nullable(),
//           terminal: z.string(),
//           resolution: z.literal("candidate"),
//           steps: z.array(
//             z.strictObject({
//               kind: z.enum([
//                 "exposure",
export const _l = 168;
