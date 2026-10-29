export const __stub = 1;
// import { createHash } from "node:crypto";
// import { posix } from "node:path";
// import { fileURLToPath } from "node:url";
//
// import * as t from "@babel/types";
//
// import type {
//   JavaScriptBundlerRegistration,
//   JavaScriptSourceRange,
//   JavaScriptStaticAnalysis,
//   JavaScriptStaticPathContext,
//   JavaScriptStaticStorage,
// } from "./javascriptStaticAnalysisTypes.js";
// import {
//   readExactJavaScriptLiteral,
//   runtimeFunctionParameters,
//   semanticStaticPropertyKey,
//   semanticStaticPropertyName,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import type { JavaScriptOpenReceiverFact } from "./javascriptSemanticAnalysis.js";
// import {
//   compareUnicodeCodePoints,
//   compositeKey,
// } from "../unicodeCodePointOrder.js";
//
// /** Explicit result for source text that Babel cannot parse. */
// export const failedJavaScriptStaticAnalysis = (): JavaScriptStaticAnalysis => ({
//   parse_status: "failed",
//   parse_error_count: 1,
//   visited_ast_nodes: 0,
//   references: [],
//   endpoints: [],
//   storage: [],
//   bundler_registrations: [],
//   role_paths: [],
//   source_map_urls: [],
//   vendors: [],
//   electron: {
//     browser_windows: [],
//     context_bridge_apis: [],
//     ipc: [],
//     sender_validations: [],
//     utility_processes: [],
//     native_addon_bindings: [],
//   },
//   limitations: [
//     "JavaScript source could not be parsed; absence of findings is not evidence of absence.",
//     "JavaScript syntax was parsed as data and was never evaluated.",
//   ],
// });
//
// /** Normalize one Babel call/new argument into the inert node shared by inspectors. */
// export const argumentNode = (
//   argument:
//     | t.Expression
//     | t.SpreadElement
//     | t.JSXNamespacedName
//     | t.ArgumentPlaceholder
//     | null
//     | undefined,
// ): t.Node | undefined =>
//   argument !== null && t.isNode(argument) ? argument : undefined;
//
// /** Recognize the runtime name for a Webpack/Rspack push call. */
// export const chunkRuntime = (call: t.CallExpression): string | undefined => {
//   if (
//     !t.isMemberExpression(call.callee) &&
//     !t.isOptionalMemberExpression(call.callee)
//   )
//     return undefined;
//   if (
//     semanticStaticPropertyName(call.callee.property, call.callee.computed) !==
//     "push"
//   )
//     return undefined;
//   return findChunkRuntime(call.callee.object);
// };
//
// const findChunkRuntime = (node: t.Node): string | undefined => {
//   const pending: t.Node[] = [node];
//   while (pending.length > 0) {
//     const current = pending.pop();
//     if (current === undefined) continue;
//     if (
//       t.isIdentifier(current) &&
//       /(?:webpack|rspack)Chunk/iu.test(current.name)
//     )
//       return current.name;
//     if (
//       t.isMemberExpression(current) ||
//       t.isOptionalMemberExpression(current)
//     ) {
//       const property = semanticStaticPropertyName(
//         current.property,
//         current.computed,
//       );
//       if (/(?:webpack|rspack)Chunk/iu.test(property)) return property;
//       if (t.isNode(current.object)) pending.push(current.object);
//       continue;
//     }
//     if (t.isAssignmentExpression(current)) {
//       pending.push(current.right, current.left);
//       continue;
//     }
//     if (t.isLogicalExpression(current) || t.isBinaryExpression(current)) {
//       pending.push(current.right, current.left);
//       continue;
//     }
//     const unwrapped = unwrapJavaScriptExpression(current).node;
//     if (unwrapped !== current) pending.push(unwrapped);
//   }
//   return undefined;
// };
//
// /** Return a literal function factory from one module-table property. */
// export const moduleFactory = (
//   property: t.ObjectMethod | t.ObjectProperty | t.SpreadElement,
// ):
//   | t.FunctionExpression
//   | t.ArrowFunctionExpression
//   | t.ObjectMethod
//   | undefined => {
//   if (t.isObjectMethod(property)) return property;
//   if (
//     t.isObjectProperty(property) &&
//     (t.isFunctionExpression(property.value) ||
//       t.isArrowFunctionExpression(property.value))
//   )
//     return property.value;
//   return undefined;
// };
//
// /** Derive a literal or explicitly computed module key. */
// export const modulePropertyName = (
//   property: t.ObjectMethod | t.ObjectProperty | t.SpreadElement,
// ): string => {
//   if (!t.isObjectMethod(property) && !t.isObjectProperty(property))
//     return `[unknown@${String(property.start ?? -1)}]`;
//   const key = semanticStaticPropertyKey(property.key, property.computed);
//   if (key !== null) return key;
//   return property.computed
//     ? `[computed@${String(property.start ?? -1)}]`
//     : `[unknown@${String(property.start ?? -1)}]`;
// };
//
// /** Read the factory-local bundler require parameter when declared. */
// export const factoryRequireName = (
//   factory: t.FunctionExpression | t.ArrowFunctionExpression | t.ObjectMethod,
// ): string | null => {
//   const parameter = runtimeFunctionParameters(factory)[2];
//   return t.isIdentifier(parameter) ? parameter.name : null;
// };
//
// /** Collect all unique static literal values from an array. */
// export const staticArrayValues = (
//   array: t.ArrayExpression,
// ): {
//   readonly values: readonly string[];
//   readonly unknown: number;
// } => {
//   const staticValues = array.elements.flatMap((element) => {
//     const value = argumentValue(element);
//     return value === undefined ? [] : [value];
//   });
//   const values = [...new Set(staticValues)].sort(compareUnicodeCodePoints);
//   return {
//     values,
//     unknown: array.elements.length - staticValues.length,
//   };
// };
//
// /** Classify whether inert path syntax is a module specifier or file expression. */
// export const staticPathResolutionContext = (
//   node: t.Node,
// ): JavaScriptStaticPathContext =>
//   isFilesystemPathExpression(node)
//     ? "filesystem-expression"
//     : "module-specifier";
//
// /** Resolve a path composed only from inert literal syntax. */
// export const staticPath = (node: t.Node): string | undefined => {
//   node = unwrapJavaScriptExpression(node).node;
//   const value = stringValue(node);
//   if (value !== undefined) return value;
//   if (t.isBinaryExpression(node, { operator: "+" }))
//     return staticConcatenation(node);
//   if (t.isCallExpression(node) || t.isNewExpression(node))
//     return staticCallPath(node);
//   return undefined;
// };
//
// /**
//  * Concatenate inert text. A leading source directory contributes no text:
//  * `__dirname + "/preload.js"` names a file inside it, while text without a
//  * leading separator extends the directory's own name and stays unknown.
//  */
// const staticConcatenation = (node: t.BinaryExpression): string | undefined => {
//   const operands: t.Node[] = [];
//   let current: t.Node = node;
//   while (t.isBinaryExpression(current, { operator: "+" })) {
//     operands.push(current.right);
//     current = unwrapJavaScriptExpression(current.left).node;
//   }
//   const anchored = isDirectoryPath(current);
//   if (!anchored) operands.push(current);
//   let text = "";
//   for (const operand of operands.reverse()) {
//     const value = staticPath(operand);
//     if (value === undefined) return undefined;
//     text += value;
//   }
//   if (!anchored) return text;
export const _l = 213;
