export const __stub = 1;
// import * as t from "@babel/types";
// import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
//
// import { htmlUrlText, stripQueryAndFragment } from "../artifactPathSyntax.js";
// import { sanitizeEndpointCandidate } from "../browserObservation.js";
// import {
//   addFindingOnce,
//   addLocatedFinding,
// } from "./javascriptStaticAnalysisFindings.js";
// import {
//   STATIC_ROUTE_CALL_NAMES,
//   argumentNode,
//   argumentValue,
//   calleeName,
//   endpointArgument as endpointArgumentHelper,
//   prefixedArgument,
//   range,
//   rangeForOffsets,
//   sourceSlice,
//   staticPath,
//   staticPathResolutionContext,
//   storageKind,
//   stringValue,
// } from "./javascriptStaticAnalysisHelpers.js";
// import {
//   semanticStaticPropertyName,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import type {
//   JavaScriptAnalysisAccumulator as AnalysisAccumulator,
//   JavaScriptEndpointInput as EndpointInput,
//   JavaScriptFindingContext as FindingContext,
//   JavaScriptReferenceInput as ReferenceInput,
// } from "./javascriptStaticAnalysisState.js";
// import {
//   resolveSemanticBindingState,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import {
//   isUnmodifiedGlobalReference,
//   isUnmodifiedImportMetaUrl,
// } from "./javascriptSemanticAmbientWrites.js";
// import {
//   semanticFactoryLoaderMemberAt,
//   semanticFactoryRequireLoaderAt,
//   semanticRequireLoaderAt,
// } from "./javascriptSemanticRequireOrigin.js";
//
// type JavaScriptCallLike =
//   | t.CallExpression
//   | t.OptionalCallExpression
//   | t.NewExpression;
//
// /** Inspect one call or new expression for references, endpoints, storage, and roles. */
// export const inspectCall = (
//   source: string,
//   node: JavaScriptCallLike,
//   context: FindingContext,
//   bindings: JavaScriptSemanticAnalysisState,
// ): void => {
//   const { accumulator } = context;
//   const name = calleeName(node.callee);
//   const first = stringValue(node.arguments[0]);
//   const requireCall = requireCallSpecifier(node, bindings, context);
//   if (requireCall !== null)
//     addReference(context, {
//       node,
//       kind: "require",
//       specifier: requireCall.specifier,
//     });
//   const chunkLoad = chunkLoadSpecifier(node, bindings, context);
//   if (chunkLoad !== null)
//     addReference(context, {
//       node,
//       kind: "dynamic-import",
//       specifier: chunkLoad.specifier,
//     });
//   for (const specifier of vitePreloadDependencySpecifiers(
//     node,
//     name,
//     context.vitePreloadDependencyTable,
//     bindings,
//   ))
//     addReference(context, { node, kind: "dynamic-import", specifier });
//   const worker = t.isNewExpression(node) ? node : undefined;
//   const workerConstructor =
//     worker === undefined
//       ? undefined
//       : workerConstructorKind(worker.callee, bindings);
//   if (
//     workerConstructor !== undefined ||
//     name === "Worker" ||
//     name.endsWith(".Worker")
//   )
//     addReference(context, {
//       node,
//       kind: "worker",
//       // A string path is relative to the document base URL in a browser and
//       // to the process cwd in Node; the analyzed source's artifact location
//       // establishes neither. Only `new URL(path, import.meta.url)` names a
//       // location relative to this module.
//       specifier:
//         workerConstructor === undefined || worker === undefined
//           ? undefined
//           : workerUrlSpecifier(worker, bindings),
//     });
//   // Service worker script URLs are also relative to the document base URL.
//   if (
//     name === "serviceWorker.register" ||
//     name.endsWith(".serviceWorker.register")
//   )
//     addReference(context, {
//       node,
//       kind: "service-worker",
//       specifier: undefined,
//     });
//   inspectEndpointCall(node, name, first, context);
//   inspectStorageCall(node, name, first, context);
//   if (first === "audio" || first === "video")
//     noteMediaElementPreloads(node, accumulator);
//   if (
//     (name === "loadFile" || name.endsWith(".loadFile")) &&
//     first !== undefined
//   )
//     addLocatedFinding(context, {
//       collection: accumulator.roles,
//       key: `role\0renderer\0${first}`,
//       node,
//       value: {
//         role: "renderer",
//         path: first,
//         resolution_context: "filesystem-expression",
//         mechanism: `call:${name}`,
//         module_key: null,
//         location: range(node),
//       },
//     });
//   if ((name === "loadURL" || name.endsWith(".loadURL")) && first !== undefined)
//     addLocatedFinding(context, {
//       collection: accumulator.roles,
//       key: `role\0renderer\0${first}`,
//       node,
//       value: {
//         role: "renderer",
//         path: first,
//         resolution_context: "module-specifier",
//         mechanism: `call:${name}`,
//         module_key: null,
//         location: range(node),
//       },
//     });
// };
//
// const workerUrlSpecifier = (
//   worker: t.NewExpression,
//   bindings: JavaScriptSemanticAnalysisState,
// ): string | undefined => {
//   const argumentExpression = argumentNode(worker.arguments[0]);
export const _l = 158;
