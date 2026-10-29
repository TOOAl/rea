export const __stub = 1;
//       resolveSemanticBindingState(state, input, input.name) !== binding
//     )
//       return undefined;
//     const required = semanticRequireOrigin(initial.node, state)?.origin;
//     if (required === undefined || required.importedPath.length !== 0)
//       return undefined;
//     if (convertedCall === undefined) return undefined;
//     const result = {
//       origin: required,
//       dependencies: convertedCall.dependencies,
//       defaultIsModule: convertedCall.defaultIsModule,
//     };
//     origins.set(binding.bindingId, result);
//     return result;
//   };
//   const invalidatedOrigin = (record: InteropOrigin | undefined): boolean =>
//     record?.dependencies.some(({ path, capturedAt }) => {
//       if (capturedAt === undefined) return true;
//       const scope = opaqueMutationPath(capturedAt).join(".");
//       // Captured function values survive later replacement of global
//       // properties. Other callable bodies are not execution evidence.
//       return writes.some(
//         (write) =>
//           (write.scope === scope || write.scope === "intrinsic") &&
//           write.offset < (capturedAt.start ?? -1) &&
//           write.coverage.covers(path),
//       );
//     }) ?? false;
//   return {
//     origin,
//     callOrigin,
//     intrinsicPath,
//     intrinsicInvocation: (node: t.CallExpression | t.OptionalCallExpression) =>
//       resolveJavaScriptIntrinsicInvocation(
//         node,
//         intrinsicPath,
//         boundIntrinsic,
//         intrinsicReadChanged,
//       ),
//     boundIntrinsic,
//     staticString,
//     isFreshObject,
//     opaqueMutationPath,
//     retainWrite: (node: t.Node, path: readonly (string | null)[]) => {
//       const coverage = new SemanticPropertyPathCoverage();
//       coverage.retain(path[0] === "opaque-intrinsic" ? ["intrinsic"] : path);
//       writes.push({
//         scope: opaqueMutationPath(node).join("."),
//         offset: node.start ?? Infinity,
//         coverage,
//       });
//     },
//     invalidated: (binding: JavaScriptSemanticBindingState): boolean => {
//       const cached = invalidatedBindings.get(binding.bindingId);
//       if (cached !== undefined) return cached;
//       const result = invalidatedOrigin(origins.get(binding.bindingId));
//       invalidatedBindings.set(binding.bindingId, result);
//       return result;
//     },
//     invalidatedCall: (node: t.Node): boolean => {
//       const cached = invalidatedCalls.get(node);
//       if (cached !== undefined) return cached;
//       const result = invalidatedOrigin(calls.get(node));
//       invalidatedCalls.set(node, result);
//       return result;
//     },
//   };
// };
//
// const identityFunction = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (
//     !t.isFunction(node) ||
//     node.async ||
//     node.generator ||
//     runtimeFunctionParameters(node).length !== 1
//   )
//     return false;
//   const parameter = runtimeFunctionParameters(node)[0];
//   const result = t.isBlockStatement(node.body)
//     ? node.body.body.length === 1 && t.isReturnStatement(node.body.body[0])
//       ? node.body.body[0].argument
//       : undefined
//     : node.body;
//   return (
//     t.isIdentifier(parameter) &&
//     t.isIdentifier(result) &&
//     resolveSemanticBindingState(state, parameter, parameter.name) !==
//       undefined &&
//     resolveSemanticBindingState(state, parameter, parameter.name) ===
//       resolveSemanticBindingState(state, result, result.name)
//   );
// };
//
// const unprojectedInitializer = (
//   binding: JavaScriptSemanticBindingState | undefined,
//   state: JavaScriptSemanticAnalysisState,
// ): t.Node | undefined => {
//   const initializer = semanticStableInitializer(binding, state);
//   return initializer?.projection.length === 0 ? initializer.node : undefined;
// };
//
// /** Match operations and lexical roles, allowing single-statement control blocks. */
// const canonicalRoles = (
//   actual: t.Node,
//   pattern: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): ReadonlyMap<string, JavaScriptSemanticBindingState> | undefined => {
//   const roles = new Map<string, JavaScriptSemanticBindingState>();
//   const used = new Map<string, string>();
//   const pending: { actual: t.Node; pattern: t.Node; parent: t.Node | null }[] =
//     [{ actual, pattern, parent: null }];
//   while (pending.length !== 0) {
//     const pair = pending.pop();
//     if (pair === undefined) return undefined;
//     const { parent } = pair;
//     const controlBody =
//       (t.isIfStatement(parent) &&
//         (parent.consequent === pair.pattern ||
//           parent.alternate === pair.pattern)) ||
//       (t.isForStatement(parent) && parent.body === pair.pattern);
//     const node = controlBody ? controlBodyOperation(pair.actual) : pair.actual;
//     const expected = controlBody
//       ? controlBodyOperation(pair.pattern)
//       : pair.pattern;
//     if (node.type !== expected.type) return undefined;
//     const literalKey =
//       parent !== null &&
//       ((t.isMemberExpression(parent) &&
//         !parent.computed &&
//         parent.property === expected) ||
//         (t.isObjectProperty(parent) &&
//           !parent.computed &&
//           parent.key === expected));
//     if (t.isIdentifier(expected) && t.isIdentifier(node) && !literalKey) {
//       const binding = resolveSemanticBindingState(state, node, node.name);
//       if (
//         binding === undefined ||
//         (roles.has(expected.name) && roles.get(expected.name) !== binding) ||
//         (used.has(binding.bindingId) &&
//           used.get(binding.bindingId) !== expected.name)
//       )
//         return undefined;
//       roles.set(expected.name, binding);
//       used.set(binding.bindingId, expected.name);
//     }
//     const visitorKeys = javaScriptAstChildKeys(expected);
//     for (const [key, field] of Object.entries(
//       t.NODE_FIELDS[expected.type] ?? {},
//     )) {
//       if (
//         visitorKeys.includes(key) ||
//         (t.isIdentifier(expected) && key === "name" && !literalKey)
//       )
//         continue;
//       const fallback: unknown = Reflect.get(field, "default");
//       if (
//         JSON.stringify(Reflect.get(node, key) ?? fallback) !==
//         JSON.stringify(Reflect.get(expected, key) ?? fallback)
//       )
//         return undefined;
//     }
//     const children = childNodes(node),
//       expectedChildren = childNodes(expected);
//     if (children.length !== expectedChildren.length) return undefined;
//     for (const [index, child] of children.entries()) {
//       const expectedChild = expectedChildren[index];
//       if (expectedChild !== undefined)
//         pending.push({
//           actual: child,
//           pattern: expectedChild,
//           parent: expected,
//         });
//     }
//   }
//   return roles;
// };
//
// // Braces around one control-body statement do not add operations. Keep other
// // blocks, directives and extra statements intact; their semantics need proof.
// // Lexical declarations/references still pass through canonicalRoles' bijection.
// const controlBodyOperation = (node: t.Node): t.Node => {
//   while (
//     t.isBlockStatement(node) &&
//     node.directives.length === 0 &&
//     node.body.length === 1
//   ) {
//     const statement = node.body[0];
//     if (statement === undefined) break;
//     node = statement;
//   }
//   return node;
// };
export const _l = 195;
