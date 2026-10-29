export const __stub = 1;
//   if (t.isTSParameterProperty(pattern)) {
//     bindPattern({ ...input, pattern: pattern.parameter });
//     return;
//   }
//   if (t.isIdentifier(pattern)) {
//     if (referenceOnly) {
//       const binding = resolveSemanticBindingFromScope(
//         scope,
//         pattern.name,
//         state,
//       );
//       if (binding !== undefined && initializer !== null)
//         binding.referenceInitializers.push({
//           node: initializer,
//           projection,
//           ...(copyKind === undefined ? {} : { copyKind }),
//           ...(copyProjectionOffset === undefined
//             ? {}
//             : { copyProjectionOffset }),
//           ...(copyExcludedKeys === undefined ? {} : { copyExcludedKeys }),
//           ...(copyStartIndex === undefined ? {} : { copyStartIndex }),
//           ...(fallbackSources === undefined ? {} : { fallbackSources }),
//           ...(requiredSources === undefined ? {} : { requiredSources }),
//         });
//       return;
//     }
//     addBinding({
//       state,
//       scope,
//       name: pattern.name,
//       kind,
//       mutable,
//       ...(declarationKind === undefined ? {} : { declarationKind }),
//       definitionNode: pattern,
//       initializer,
//       projection,
//     });
//     return;
//   }
//   if (t.isAssignmentPattern(pattern)) {
//     bindPattern({
//       ...input,
//       pattern: pattern.left,
//       initializer:
//         kind === "parameter" || kind === "catch"
//           ? initializer
//           : (initializer ?? pattern.right),
//       requiredSources: [
//         ...(requiredSources ?? []),
//         ...(initializer === null ? [] : [{ node: initializer, projection }]),
//       ],
//     });
//     bindPattern({
//       state,
//       scope,
//       mutable,
//       kind,
//       pattern: pattern.left,
//       initializer: pattern.right,
//       projection: [],
//       referenceOnly: true,
//       fallbackSources: [
//         ...(fallbackSources ?? []),
//         ...(initializer === null ? [] : [{ node: initializer, projection }]),
//       ],
//       ...(requiredSources === undefined ? {} : { requiredSources }),
//     });
//     return;
//   }
//   if (t.isRestElement(pattern)) {
//     bindPattern({
//       ...input,
//       pattern: pattern.argument,
//       initializer: null,
//       mutable: true,
//     });
//     return;
//   }
//   if (t.isObjectPattern(pattern))
//     for (const property of pattern.properties) {
//       if (t.isRestElement(property)) {
//         bindPattern({
//           ...input,
//           pattern: property.argument,
//           initializer: null,
//           mutable: true,
//           projection: [],
//         });
//         bindPattern({
//           ...input,
//           pattern: property.argument,
//           projection: [...projection, null],
//           referenceOnly: true,
//           copyKind: "object-rest",
//           copyProjectionOffset: projection.length,
//           copyExcludedKeys: semanticObjectPatternKeys(pattern),
//         });
//       } else {
//         const name = semanticStaticPropertyKey(property.key, property.computed);
//         bindPattern({
//           ...input,
//           pattern: property.value,
//           projection: [...projection, name],
//         });
//       }
//     }
//   else if (t.isArrayPattern(pattern))
//     pattern.elements.forEach((element, index) => {
//       if (element !== null) {
//         bindPattern({
//           ...input,
//           pattern: element,
//           projection: [...projection, index],
//         });
//         if (t.isRestElement(element))
//           bindPattern({
//             ...input,
//             pattern: element.argument,
//             projection: [...projection, null],
//             referenceOnly: true,
//             copyKind: "array-rest",
//             copyProjectionOffset: projection.length,
//             copyStartIndex: index,
//           });
//       }
//     });
// };
// const addBinding = (input: AddBindingInput): void => {
//   const {
//     state,
//     scope,
//     name,
//     kind,
//     mutable,
//     declarationKind,
//     definitionNode,
//     initializer,
//     directOrigin,
//     runtimeImport,
//     projection = [],
//   } = input;
//   let binding = scope.bindings.get(name);
//   if (binding === undefined) {
//     if (!scope.bindingsComplete) return;
//     binding = createBinding(scope, name, kind, mutable);
//     scope.bindings.set(name, binding);
//     state.bindingsById.set(binding.bindingId, binding);
//   }
//   binding.mutable ||= mutable;
//   if (declarationKind !== undefined)
//     binding.declarationKinds.add(declarationKind);
//   binding.definitions.push({ kind, location: range(definitionNode) });
//   if (initializer !== null)
//     binding.initializers.push({ node: initializer, projection });
//   if (directOrigin !== undefined)
//     binding.directOrigins.push(
//       directOrigin.resolutionMode === undefined &&
//         state.staticImportResolutionMode !== "import"
//         ? { ...directOrigin, resolutionMode: state.staticImportResolutionMode }
//         : directOrigin,
//     );
//   binding.runtimeImport ||= runtimeImport === true;
// };
// const createBinding = (
//   scope: JavaScriptSemanticScopeState,
//   name: string,
//   kind: import("./javascriptSemanticIr.js").JavaScriptSemanticDefinition["kind"],
//   mutable: boolean,
// ): import("./javascriptSemanticState.js").JavaScriptSemanticBindingState => ({
//   bindingId: semanticBindingId(scope.scopeId, name),
//   scopeId: scope.scopeId,
//   name,
//   kind,
//   mutable,
//   declarationKinds: new Set(),
//   memberWrites: [],
//   escapedPaths: [],
//   definitions: [],
//   initializers: [],
//   referenceInitializers: [],
//   directOrigins: [],
//   runtimeImport: false,
// });
// const addAssignment = (
//   identifier: t.Identifier,
//   initializer: t.Node,
//   scope: JavaScriptSemanticScopeState,
//   state: JavaScriptSemanticAnalysisState,
//   conditionallySkipped: boolean,
// ): void => {
//   const binding = resolveSemanticBindingFromScope(
//     scope,
//     identifier.name,
//     state,
//   );
//   if (binding === undefined) {
//     const writes = state.ambientBindingWrites.get(identifier.name) ?? [];
//     writes.push(identifier);
//     state.ambientBindingWrites.set(identifier.name, writes);
//     return;
//   }
//   binding.mutable = true;
//   binding.definitions.push({ kind: "assignment", location: range(identifier) });
//   binding.initializers.push({ node: initializer, projection: [] });
//   if (conditionallySkipped)
//     state.conditionallySkippedExpressions.add(initializer);
// };
export const _l = 207;
