export const __stub = 1;
// import { parseExpression } from "@babel/parser";
// import * as t from "@babel/types";
//
// import type { JavaScriptModuleOrigin } from "./javascriptSemanticIr.js";
// import {
//   isUnshadowedGlobal,
//   resolveSemanticBindingState,
//   semanticScopeId,
//   semanticStableInitializer,
//   type JavaScriptSemanticAnalysisState,
//   type JavaScriptSemanticBindingState,
// } from "./javascriptSemanticState.js";
// import { semanticRequireOrigin } from "./javascriptSemanticRequireOrigin.js";
// import {
//   childNodes,
//   javaScriptAstChildKeys,
// } from "./javascriptSemanticTraversal.js";
// import {
//   electronMemberPath,
//   type JavaScriptIntrinsicInvocation,
// } from "./javascriptElectronMemberWrites.js";
// import {
//   expandJavaScriptInvocationArguments,
//   resolveJavaScriptIntrinsicInvocation,
// } from "./javascriptIntrinsicInvocation.js";
// import { SemanticPropertyPathCoverage } from "./javascriptSemanticPropertyPaths.js";
// import {
//   readExactJavaScriptLiteral,
//   runtimeFunctionParameters,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
//
// // Match the complete Rolldown runtime operations, including its live getters.
// // Names and formatting are irrelevant; lexical roles, operators and keys are not.
// const TO_ESM = parseExpression(`(mod, isNodeMode, target) => (
//   target = mod != null ? __create(__getProtoOf(mod)) : {},
//   __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default")
//     ? __defProp(target, "default", {value: mod, enumerable: true}) : target, mod)
// )`);
// const COPY_PROPS = parseExpression(`(to, from, except, desc) => {
//   if (from && typeof from === "object" || typeof from === "function")
//     for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
//       key = keys[i];
//       if (!__hasOwnProp.call(to, key) && key !== except)
//         __defProp(to, key, {
//           get: ((k) => from[k]).bind(null, key),
//           enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
//         });
//     }
//   return to;
// }`);
// const INTRINSICS: Readonly<Record<string, readonly string[]>> = {
//   __create: ["Object", "create"],
//   __getProtoOf: ["Object", "getPrototypeOf"],
//   __defProp: ["Object", "defineProperty"],
//   __getOwnPropNames: ["Object", "getOwnPropertyNames"],
//   __getOwnPropDesc: ["Object", "getOwnPropertyDescriptor"],
//   __hasOwnProp: ["Object", "prototype", "hasOwnProperty"],
// };
//
// interface IntrinsicDependency {
//   readonly path: readonly string[];
//   readonly capturedAt?: t.Node;
// }
//
// interface InteropOrigin {
//   readonly origin: JavaScriptModuleOrigin;
//   readonly dependencies: readonly IntrinsicDependency[];
//   readonly defaultIsModule: boolean;
// }
//
// interface InteropHelper {
//   readonly dependencies: readonly IntrinsicDependency[];
//   readonly readyAfter: number;
//   readonly identity: boolean;
// }
//
// /** Prove one inert namespace conversion without relaxing general assignment semantics. */
// export const createSemanticModuleInterop = (
//   state: JavaScriptSemanticAnalysisState,
//   options?: {
//     readonly intrinsicPath: (node: t.Node) => readonly string[] | undefined;
//   },
// ) => {
//   const helpers = new Map<string, InteropHelper | null>();
//   const origins = new Map<string, InteropOrigin>();
//   const calls = new WeakMap<t.Node, InteropOrigin>();
//   const intrinsicBindings = new Map<string, readonly string[] | null>();
//   const writes: {
//     readonly scope: string;
//     readonly offset: number;
//     readonly coverage: SemanticPropertyPathCoverage;
//   }[] = [];
//   const invalidatedBindings = new Map<string, boolean>();
//   const invalidatedCalls = new WeakMap<t.Node, boolean>();
//   const opaqueMutationPath = (node: t.Node): readonly string[] => {
//     let current: t.Node | undefined = node;
//     while (current !== undefined) {
//       if (t.isFunction(current))
//         return ["opaque-intrinsic", semanticScopeId("function", current)];
//       current = state.parentsByNode.get(current);
//     }
//     return ["intrinsic"];
//   };
//
//   const intrinsicPath =
//     options?.intrinsicPath ??
//     ((node: t.Node): readonly string[] | undefined => {
//       let current = node;
//       const visited = new Set<string>();
//       const pending: { id: string; suffixLength: number }[] = [];
//       let suffix: readonly string[] = [];
//       const finish = (
//         path: readonly string[] | undefined,
//       ): readonly string[] | undefined => {
//         for (const binding of pending)
//           intrinsicBindings.set(
//             binding.id,
//             path === undefined
//               ? null
//               : path.slice(0, path.length - binding.suffixLength),
//           );
//         return path;
//       };
//       for (;;) {
//         const { root, members } = electronMemberPath(current);
//         if (members.some((member) => member === null)) return finish(undefined);
//         suffix = [...(members as readonly string[]), ...suffix];
//         for (const global of ["Object", "Function", "Reflect"])
//           if (isUnshadowedGlobal(root, state, global))
//             return finish(["intrinsic", global, ...suffix]);
//         for (const global of ["globalThis", "global", "window", "self"])
//           if (isUnshadowedGlobal(root, state, global))
//             return finish(["intrinsic", ...suffix]);
//         if (!t.isIdentifier(root)) return finish(undefined);
//         const binding = resolveSemanticBindingState(state, root, root.name);
//         const cached =
//           binding === undefined
//             ? undefined
//             : intrinsicBindings.get(binding.bindingId);
//         if (cached !== undefined)
//           return finish(cached === null ? undefined : [...cached, ...suffix]);
//         const initializer = semanticStableInitializer(binding, state);
//         if (
//           binding === undefined ||
//           initializer === undefined ||
//           initializer.projection.some((segment) => segment === null) ||
//           visited.has(binding.bindingId)
//         )
//           return finish(undefined);
//         visited.add(binding.bindingId);
//         pending.push({ id: binding.bindingId, suffixLength: suffix.length });
//         suffix = [...initializer.projection.map(String), ...suffix];
//         current = initializer.node;
//       }
//     });
//
//   // A nominal alias path is sufficient for conservative mutation lookup, but
//   // helper proof also needs each read to follow initialization. An alias copy
//   // retains the earlier function capture; a member read captures it anew.
//   const capturedIntrinsic = (node: t.Node): IntrinsicDependency | undefined => {
//     const path = intrinsicPath(node);
//     if (path === undefined) return undefined;
//     const visited = new Set<string>();
//     let current = node;
//     let capturedAt = node;
//     let suffixLength = 0;
//     for (;;) {
//       const { root, members } = electronMemberPath(current);
//       suffixLength += members.length;
//       if (!t.isIdentifier(root)) return undefined;
//       const binding = resolveSemanticBindingState(state, root, root.name);
//       if (binding === undefined) return { path, capturedAt };
//       const initializer = semanticStableInitializer(binding, state);
//       if (
//         initializer === undefined ||
//         (initializer.node.end ?? Infinity) >= (root.start ?? -1) ||
//         visited.has(binding.bindingId)
//       )
//         return undefined;
//       visited.add(binding.bindingId);
//       if (suffixLength === 0) capturedAt = initializer.node;
//       suffixLength += initializer.projection.length;
//       current = initializer.node;
//     }
//   };
//
//   const staticString = (node: t.Node | undefined): string | undefined => {
//     if (node === undefined) return undefined;
//     const visited = new Set<string>();
//     let current = node;
//     for (;;) {
//       const literal = readExactJavaScriptLiteral(current);
//       if (literal.found)
//         return typeof literal.value === "string" ? literal.value : undefined;
//       const expression = unwrapJavaScriptExpression(current).node;
export const _l = 196;
