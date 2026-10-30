export const __stub = 1;
//   if (argumentExpression === undefined) return undefined;
//   const node = unwrapJavaScriptExpression(argumentExpression).node;
//   if (!t.isNewExpression(node)) return undefined;
//   const callee = unwrapJavaScriptExpression(node.callee).node;
//   if (
//     !isUnmodifiedGlobalReference(callee, bindings, "URL") ||
//     !isUnmodifiedImportMetaUrl(argumentNode(node.arguments[1]), bindings)
//   )
//     return undefined;
//   const specifier = stringValue(node.arguments[0]);
//   if (specifier === undefined) return undefined;
//   const pathname = stripQueryAndFragment(specifier);
//   // The module URL's scheme and filesystem/origin root are unavailable. Only
//   // relative pathnames can establish a location within the artifact; retain
//   // rooted paths and paths requiring URL text normalization as expressions.
//   // Malformed percent escapes survive HTTP URL parsing but cannot be converted
//   // from a file URL to a Node Worker path. Without the base scheme, keep that
//   // ambiguity unknown; query and fragment bytes do not affect pathname lookup.
//   return pathname.length > 0 &&
//     !pathname.startsWith("/") &&
//     !/%(?![0-9a-f]{2})/iu.test(pathname) &&
//     stripQueryAndFragment(htmlUrlText(specifier)) === pathname
//     ? specifier
//     : undefined;
// };
//
// const workerConstructorKind = (
//   callee: t.Node,
//   bindings: JavaScriptSemanticAnalysisState,
// ): "browser" | "node" | undefined => {
//   const node = unwrapJavaScriptExpression(callee).node;
//   const member =
//     t.isMemberExpression(node) &&
//     semanticStaticPropertyName(node.property, node.computed) === "Worker";
//   const root = unwrapJavaScriptExpression(member ? node.object : node).node;
//   if (!t.isIdentifier(root)) return undefined;
//   const browserGlobal = member
//     ? ["globalThis", "window", "self"].includes(root.name)
//     : root.name === "Worker";
//   if (browserGlobal && isUnmodifiedGlobalReference(node, bindings, "Worker"))
//     return "browser";
//   const binding = resolveSemanticBindingState(bindings, root, root.name);
//   const [origin] = binding?.directOrigins ?? [];
//   // Named ESM exports and module namespace exports are read-only. Default
//   // imports and CommonJS objects can replace Worker, so their identity is unknown.
//   return binding?.runtimeImport === true &&
//     binding.definitions.length === 1 &&
//     binding.directOrigins.length === 1 &&
//     origin !== undefined &&
//     (origin.specifier === "worker_threads" ||
//       origin.specifier === "node:worker_threads") &&
//     (member
//       ? origin.importedPath.length === 0
//       : origin.importedPath.length === 1 && origin.importedPath[0] === "Worker")
//     ? "node"
//     : undefined;
// };
//
// // Element factories such as jsx("audio", props) and createElement("video",
// // props) carry the HTML media `preload` hint ("none", "metadata", "auto"),
// // which never names an Electron preload script.
// const noteMediaElementPreloads = (
//   node: JavaScriptCallLike,
//   accumulator: AnalysisAccumulator,
// ): void => {
//   const props = node.arguments[1];
//   if (!t.isObjectExpression(props)) return;
//   for (const property of props.properties)
//     if (
//       t.isObjectProperty(property) &&
//       semanticStaticPropertyName(property.key, property.computed) === "preload"
//     )
//       accumulator.mediaElementPreloads.add(property);
// };
//
// const requireCallSpecifier = (
//   node: JavaScriptCallLike,
//   bindings: JavaScriptSemanticAnalysisState,
//   context: FindingContext,
// ): { readonly specifier: string | undefined } | null => {
//   const bareRequire = t.isIdentifier(node.callee, { name: "require" });
//   if (bareRequire) {
//     const loader = semanticRequireLoaderAt(
//       node,
//       bindings,
//       context.accumulator.factoryRequireBindingIds,
//     );
//     if (loader === "local") return null;
//     if (loader === "unknown") context.accumulator.unknownFindings += 1;
//     return {
//       specifier:
//         loader === "unknown" ? undefined : argumentValue(node.arguments[0]),
//     };
//   }
//   const factoryLoader = semanticFactoryRequireLoaderAt(
//     node,
//     bindings,
//     context.accumulator.factoryRequireBindingIds,
//   );
//   if (factoryLoader === "factory-loader")
//     return {
//       specifier: argumentValue(
//         node.arguments[
//           t.isMemberExpression(unwrapJavaScriptExpression(node.callee).node) ||
//           t.isOptionalMemberExpression(
//             unwrapJavaScriptExpression(node.callee).node,
//           )
//             ? 1
//             : 0
//         ],
//       ),
//     };
//   if (factoryLoader === "unknown") {
//     context.accumulator.unknownFindings += 1;
//     return { specifier: undefined };
//   }
//   return null;
// };
//
// const chunkLoadSpecifier = (
//   node: JavaScriptCallLike,
//   bindings: JavaScriptSemanticAnalysisState,
//   context: FindingContext,
// ): { readonly specifier: string | undefined } | null => {
//   const loader = semanticFactoryLoaderMemberAt(
//     node,
//     bindings,
//     context.accumulator.factoryRequireBindingIds,
//     "e",
//   );
//   if (loader === undefined) return null;
//   if (loader === "unknown") return { specifier: undefined };
//   return { specifier: prefixedArgument("chunk:", node.arguments[0]) };
// };
//
// const vitePreloadDependencySpecifiers = (
//   node: JavaScriptCallLike,
//   name: string,
//   table: readonly (string | undefined)[] | null,
//   bindings: JavaScriptSemanticAnalysisState,
// ): readonly (string | undefined)[] => {
//   if (
//     name !== "__vite__mapDeps" ||
//     table === null ||
//     !t.isArrayExpression(node.arguments[0])
//   )
//     return [];
//   const indexes = node.arguments[0].elements;
//   // Explicit cache overrides change which table the helper reads. Retain the
//   // call slots as unknown unless every override is statically undefined.
//   if (
//     !node.arguments
//       .slice(1)
//       .every((argument) => isExplicitDefaultArgument(argument, bindings))
//   )
//     return indexes.map(() => undefined);
//   return indexes.map((element) => {
//     if (element === null || !t.isNumericLiteral(element)) return undefined;
export const _l = 158;
