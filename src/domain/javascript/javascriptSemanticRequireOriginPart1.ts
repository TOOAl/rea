export const __stub = 1;
// import * as t from "@babel/types";
// import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
//
// import { BUILTIN_RESOURCE_METHODS } from "./javascriptBuiltinResourceMethods.js";
// import type { JavaScriptModuleOrigin } from "./javascriptSemanticIr.js";
// import {
//   resolveSemanticBindingState,
//   isUnmodifiedCommonJsWrapperBinding,
//   semanticResolutionBlocked,
//   semanticStableInitializer,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import {
//   semanticStaticPropertyKey,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import { semanticPropertyPathKeyMatches } from "./javascriptSemanticPropertyPaths.js";
// import { stringValue } from "./javascriptStaticAnalysisHelpers.js";
// import { semanticTopLevelEffectFollowsCapture } from "./javascriptSemanticMutationInitializers.js";
// import { createSemanticModuleInterop } from "./javascriptModuleInterop.js";
//
// export interface JavaScriptRequireOrigin {
//   readonly origin: JavaScriptModuleOrigin;
//   readonly call: t.CallExpression;
// }
//
// export type JavaScriptRequireLoaderFact =
//   | "commonjs-loader"
//   | "factory-loader"
//   | "create-require"
//   | "local"
//   | "unknown";
//
// /** Classify a bare `require(...)` using the shared lexical binding owner. */
// export const semanticRequireLoaderAt = (
//   node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
//   state: JavaScriptSemanticAnalysisState,
//   factoryBindingIds: ReadonlySet<string>,
// ): JavaScriptRequireLoaderFact => {
//   if (!t.isIdentifier(node.callee, { name: "require" })) return "local";
//   const binding = resolveSemanticBindingState(state, node.callee, "require");
//   if (binding === undefined)
//     return semanticResolutionBlocked(state, node.callee, "require")
//       ? "unknown"
//       : "commonjs-loader";
//   if (factoryBindingIds.has(binding.bindingId))
//     return binding.initializers.length === 0 ? "factory-loader" : "unknown";
//   if (isWrapperRequireInitializerCall(binding, node, state))
//     return "commonjs-loader";
//   if (isUnmodifiedCommonJsWrapperBinding(node.callee, "require", state))
//     return "commonjs-loader";
//   if (isSemanticCreateRequireBinding(binding, state)) return "create-require";
//   const initializer = semanticStableInitializer(binding, state)?.node;
//   if (
//     (binding.kind === "function" || binding.kind === "class") &&
//     initializer !== undefined
//   )
//     return "local";
//   if (
//     binding.declarationKinds.size === 1 &&
//     binding.declarationKinds.has("const") &&
//     (t.isFunctionExpression(initializer) ||
//       t.isArrowFunctionExpression(initializer))
//   )
//     return "local";
//   return "unknown";
// };
//
// /** Classify a call through an exact recovered factory-loader binding. */
// export const semanticFactoryRequireLoaderAt = (
//   node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
//   state: JavaScriptSemanticAnalysisState,
//   bindingIds: ReadonlySet<string>,
// ): JavaScriptRequireLoaderFact | undefined => {
//   const callee = unwrapJavaScriptExpression(node.callee).node;
//   if (t.isIdentifier(callee))
//     return semanticFactoryLoaderMemberAt(node, state, bindingIds, null);
//   if (
//     (t.isMemberExpression(callee) || t.isOptionalMemberExpression(callee)) &&
//     semanticStaticPropertyKey(callee.property, callee.computed) === "bind"
//   )
//     return semanticFactoryLoaderMemberAt(node, state, bindingIds, "bind");
//   return undefined;
// };
//
// /** Classify an exact loader call by binding identity and expected member. */
// export const semanticFactoryLoaderMemberAt = (
//   node: t.CallExpression | t.OptionalCallExpression | t.NewExpression,
//   state: JavaScriptSemanticAnalysisState,
//   bindingIds: ReadonlySet<string>,
//   member: string | null,
// ): JavaScriptRequireLoaderFact | undefined => {
//   const callee = unwrapJavaScriptExpression(node.callee).node;
//   let loader: t.Identifier | undefined;
//   if (member === null) {
//     if (t.isIdentifier(callee)) loader = callee;
//   } else if (
//     (t.isMemberExpression(callee) || t.isOptionalMemberExpression(callee)) &&
//     semanticStaticPropertyKey(callee.property, callee.computed) === member
//   ) {
//     const root = unwrapJavaScriptExpression(callee.object).node;
//     if (t.isIdentifier(root)) loader = root;
//   }
//   if (loader === undefined) return undefined;
//   const binding = resolveSemanticBindingState(state, loader, loader.name);
//   if (binding === undefined || !bindingIds.has(binding.bindingId))
//     return undefined;
//   return binding.initializers.length === 0 ? "factory-loader" : "unknown";
// };
//
// const isSemanticCreateRequireBinding = (
//   binding: NonNullable<ReturnType<typeof resolveSemanticBindingState>>,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (binding.initializers.length !== 1) return false;
//   const initializer = semanticStableInitializer(binding, state)?.node;
//   if (!t.isCallExpression(initializer)) return false;
//   const callee = unwrapJavaScriptExpression(initializer.callee).node;
//   if (t.isIdentifier(callee)) {
//     const origins = resolveSemanticBindingState(
//       state,
//       callee,
//       callee.name,
//     )?.directOrigins;
//     if (origins?.length !== 1) return false;
//     const [origin] = origins;
//     return (
//       origin?.importedPath.at(-1) === "createRequire" &&
//       ["module", "node:module"].includes(origin.specifier)
//     );
//   }
export const _l = 131;
