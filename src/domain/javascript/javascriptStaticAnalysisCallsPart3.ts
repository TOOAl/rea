export const __stub = 1;
//     const index = element.value;
//     return Number.isSafeInteger(index) && index >= 0 ? table[index] : undefined;
//   });
// };
//
// const isExplicitDefaultArgument = (
//   argument: t.CallExpression["arguments"][number],
//   bindings: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (!t.isNode(argument)) return false;
//   const value = unwrapJavaScriptExpression(argument).node;
//   return (
//     (t.isUnaryExpression(value) && value.operator === "void") ||
//     (t.isIdentifier(value, { name: "undefined" }) &&
//       isUnmodifiedGlobalReference(value, bindings, "undefined"))
//   );
// };
//
// type ViteMapDepsFunction =
//   | t.FunctionDeclaration
//   | t.FunctionExpression
//   | t.ArrowFunctionExpression;
//
// /** Index the canonical Vite helper's cache initializer from parsed syntax. */
// export const indexVitePreloadDependencyTable = (
//   program: t.Program,
// ): readonly (string | undefined)[] | null => {
//   const helpers: ViteMapDepsFunction[] = [];
//   traverseJavaScriptAst(program, {
//     enter: (node) => {
//       if (t.isFunctionDeclaration(node) && node.id?.name === "__vite__mapDeps")
//         helpers.push(node);
//       else if (
//         t.isVariableDeclarator(node) &&
//         t.isIdentifier(node.id, { name: "__vite__mapDeps" })
//       ) {
//         const init = node.init;
//         if (t.isFunctionExpression(init) || t.isArrowFunctionExpression(init))
//           helpers.push(init);
//       }
//     },
//   });
//   if (helpers.length !== 1) return null;
//   const helper = helpers[0];
//   if (helper === undefined) return null;
//   const mapParameter = helper.params[1];
//   const mapIdentifier = t.isAssignmentPattern(mapParameter)
//     ? mapParameter.left
//     : mapParameter;
//   if (!t.isIdentifier(mapIdentifier)) return [];
//   const tables: t.ArrayExpression[] = [];
//   traverseJavaScriptAst(helper, {
//     skip: (node) => t.isFunction(node),
//     enter: (node) => {
//       if (
//         t.isAssignmentExpression(node) &&
//         node.operator === "=" &&
//         (t.isMemberExpression(node.left) ||
//           t.isOptionalMemberExpression(node.left)) &&
//         t.isIdentifier(node.left.object, { name: mapIdentifier.name }) &&
//         semanticStaticPropertyName(node.left.property, node.left.computed) ===
//           "f" &&
//         t.isArrayExpression(node.right)
//       )
//         tables.push(node.right);
//     },
//   });
//   if (tables.length !== 1) return [];
//   const table = tables[0];
//   if (table === undefined) return [];
//   const dependencies = table.elements.map((element) =>
//     element === null || t.isSpreadElement(element)
//       ? undefined
//       : stringValue(element),
//   );
//   let escapedOrMutated = false;
//   traverseJavaScriptAst(program, {
//     skip: (node) => node === helper,
//     enter: (node, parent) => {
//       if (!t.isIdentifier(node, { name: "__vite__mapDeps" })) return;
//       if (
//         (parent === helper &&
//           t.isFunctionDeclaration(parent) &&
//           parent.id === node) ||
//         (t.isVariableDeclarator(parent) &&
//           parent.init === helper &&
//           parent.id === node)
//       )
//         return;
//       if (
//         (t.isCallExpression(parent) || t.isOptionalCallExpression(parent)) &&
//         parent.callee === node
//       )
//         return;
//       escapedOrMutated = true;
//     },
//   });
//   return escapedOrMutated ? dependencies.map(() => undefined) : dependencies;
// };
//
// const inspectEndpointCall = (
//   node: JavaScriptCallLike,
//   name: string,
//   first: string | undefined,
//   context: FindingContext,
// ): void => {
//   const route = STATIC_ROUTE_CALL_NAMES.some(
//     (candidate) => name === candidate || name.endsWith(`.${candidate}`),
//   );
//   if (route && first !== undefined)
//     addEndpoint(context, {
//       node,
//       kind: "route",
//       value: first,
//       mechanism: `call:${name}`,
//     });
//   const receiverFact = context.openReceiverFacts?.get(node.start ?? -1);
//   const endpoint = endpointArgumentHelper(
//     name,
//     node.arguments,
//     node.callee,
//     receiverFact,
//   );
//   if (endpoint !== undefined)
//     addEndpoint(context, {
//       node,
//       kind: "network",
//       value: endpoint.value,
//       mechanism: `call:${name}`,
//       ...(endpoint.kind === "candidate" ? { interpretation: "candidate" } : {}),
//     });
// };
//
// /** Record tRPC procedures, tRPC link URLs and named GraphQL operations. */
// export const inspectRpcNode = (node: t.Node, context: FindingContext): void => {
//   const rpc = context.rpcScan.inspect(node);
//   if (rpc !== undefined)
//     addEndpoint(context, { node, kind: "network", ...rpc });
// };
//
// /** Resolve deferred Source bodies after their document owners have been seen. */
// export function* finishRpcScanSteps(
//   context: FindingContext,
// ): Generator<void, void> {
//   for (const rpc of context.rpcScan.finish()) {
//     if (rpc !== undefined) addEndpoint(context, { kind: "network", ...rpc });
//     yield;
//   }
// }
//
// export const inspectRouteProperty = (
//   node: t.ObjectProperty,
//   context: FindingContext,
// ): void => {
//   const key = semanticStaticPropertyName(node.key, node.computed);
//   const value = stringValue(node.value);
//   if ((key === "path" || key === "route") && value !== undefined)
//     addEndpoint(context, {
export const _l = 158;
