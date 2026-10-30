export const __stub = 1;
// import * as t from "@babel/types";
//
// import type { javascriptBootstrapAt } from "./javascriptBootstrap.js";
// import { semanticStaticPropertyKey } from "./javascriptAstValues.js";
// import {
//   resolveSemanticBindingState,
//   semanticStableInitializer,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";
// import { argumentValue } from "./javascriptStaticAnalysisHelpers.js";
//
// type Bootstrap = NonNullable<ReturnType<typeof javascriptBootstrapAt>>;
//
// /** Slots a visible literal write may have replaced; the rest stay as declared. */
// export interface JavaScriptBootstrapIntegrity {
//   readonly replacedKeys: ReadonlySet<string>;
// }
//
// interface LoaderShape {
//   readonly parameterId: string;
//   /** The single unconditional `table[key](...)` call. */
//   readonly dispatch: t.CallExpression;
//   readonly dispatches: ReadonlySet<t.Node>;
//   readonly moduleId: string;
//   readonly cacheId: string | undefined;
//   /** Cache reads, cache writes and deletes the loader itself performs. */
//   readonly cacheSites: ReadonlySet<t.Node>;
// }
//
// /**
//  * Prove that `loader(key)` returns the exports of the factory declared at
//  * `table[key]`: the loader returns only the dispatched module's exports or a
//  * cache entry it created for that module, the table has only literal keys,
//  * and the table and cache are referenced only by the loader or through the
//  * runtime's `loader.m`/`loader.c` exposure. Literal-key writes through that
//  * exposure replace their slot. Returns undefined when any of this is unproven.
//  */
// export const proveJavaScriptBootstrapIntegrity = (
//   call: t.CallExpression,
//   bootstrap: Bootstrap,
//   loaderIds: ReadonlySet<string>,
//   state: JavaScriptSemanticAnalysisState,
// ): JavaScriptBootstrapIntegrity | undefined => {
//   if (
//     bootstrap.table.properties.some((property) =>
//       t.isSpreadElement(property)
//         ? true
//         : semanticStaticPropertyKey(property.key, property.computed) === null,
//     )
//   )
//     return undefined;
//   const loader = bootstrap.body.body.find(
//     (statement): statement is t.FunctionDeclaration =>
//       t.isFunctionDeclaration(statement) &&
//       statement.id !== null &&
//       statement.id !== undefined &&
//       bindingOf(state, statement.id) === bootstrap.loaderBindingId,
//   );
//   const shape =
//     loader === undefined
//       ? undefined
//       : loaderShape(loader, bootstrap.tableBindingId, state);
//   if (shape === undefined) return undefined;
//   return referencesAreContained(call, { bootstrap, shape, loaderIds }, state);
// };
//
// const loaderShape = (
//   loader: t.FunctionDeclaration,
//   tableId: string,
//   state: JavaScriptSemanticAnalysisState,
// ): LoaderShape | undefined => {
//   const [parameter] = loader.params;
//   const parameterId = t.isIdentifier(parameter)
//     ? bindingOf(state, parameter)
//     : undefined;
//   // A rewritten key would dispatch a different slot than the caller named.
//   if (
//     parameterId === undefined ||
//     state.bindingsById.get(parameterId)?.definitions.length !== 1 ||
//     loader.async ||
//     loader.generator
//   )
//     return undefined;
//   const dispatches = new Set<t.Node>();
//   const calls: t.CallExpression[] = [];
//   const modules = new Set<string>();
//   const returns: (t.Expression | null | undefined)[] = [];
//   traverseJavaScriptAst(loader.body, {
//     skip: (node) => t.isFunction(node),
//     enter: (node) => {
//       if (t.isReturnStatement(node)) returns.push(node.argument);
//       if (!t.isCallExpression(node)) return;
//       const dispatch = tableDispatch(node, tableId, parameterId, state);
//       if (dispatch === undefined) return;
//       dispatches.add(dispatch.table);
//       calls.push(node);
//       if (dispatch.moduleId !== undefined) modules.add(dispatch.moduleId);
//     },
//   });
//   const [moduleId] = modules;
//   const [dispatch] = calls;
//   if (
//     calls.length !== 1 ||
//     dispatch === undefined ||
//     modules.size !== 1 ||
//     moduleId === undefined ||
//     !runsUnconditionally(dispatch, loader, state)
//   )
//     return undefined;
//   const cache = moduleCache(moduleId, parameterId, state);
//   if (
//     cache === null ||
//     !moduleObjectContained(loader, moduleId, dispatch, state)
//   )
//     return undefined;
//   const shape: LoaderShape = {
//     parameterId,
//     dispatch,
//     dispatches,
//     moduleId,
//     cacheId: cache?.cacheId,
//     cacheSites: new Set(cache === undefined ? [] : [cache.site]),
//   };
//   return returns.every((argument) =>
//     returnsModuleExports(argument, shape, state),
//   )
//     ? withCacheReads(loader, shape, state)
//     : undefined;
// };
//
// /** `table[key](module, ...)` or `table[key].call(thisArg, module, ...)`. */
export const _l = 132;
