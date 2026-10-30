export const __stub = 1;
//       `Binding ${binding.name} has multiple possible assignments.`,
//     );
//   const initializer = binding.initializers[0];
//   if (initializer === undefined)
//     return semanticUnresolvedProvenance(
//       "unknown",
//       "Missing binding initializer.",
//     );
//   if (initializer.projection.includes(null))
//     return semanticUnresolvedProvenance(
//       "unknown",
//       "Dynamic provenance projection.",
//     );
//   context.bindings.set(binding.bindingId, context.bindings.size);
//   let resolved: JavaScriptBindingProvenance;
//   try {
//     resolved = provenanceForExpression(
//       initializer.node,
//       nestedContext(context),
//     );
//   } finally {
//     context.bindings.delete(binding.bindingId);
//   }
//   if (resolved.status !== "module" || initializer.projection.length === 0)
//     return resolved;
//   return semanticOriginsProvenance(
//     resolved.origins.map((origin) => ({
//       ...origin,
//       importedPath: [
//         ...origin.importedPath,
//         ...initializer.projection.map((segment) => String(segment)),
//       ],
//     })),
//   );
// };
//
// const provenanceForExpression = (
//   node: t.Node,
//   context: EvaluationContext,
// ): JavaScriptBindingProvenance => {
//   if (context.expressionDepth > SEMANTIC_EXPRESSION_DEPTH_LIMIT) {
//     context.dependence.lowest = EVERY_CALLER;
//     return semanticUnresolvedProvenance(
//       "unknown",
//       semanticResourceLimitReason("expression-depth"),
//     );
//   }
//   const unwrapped = unwrapJavaScriptExpression(node);
//   if (unwrapped.depth > 0) {
//     if (
//       context.expressionDepth + unwrapped.depth >
//       SEMANTIC_EXPRESSION_DEPTH_LIMIT
//     ) {
//       context.dependence.lowest = EVERY_CALLER;
//       return semanticUnresolvedProvenance(
//         "unknown",
//         semanticResourceLimitReason("expression-depth"),
//       );
//     }
//     return provenanceForExpression(unwrapped.node, {
//       ...context,
//       expressionDepth: context.expressionDepth + unwrapped.depth,
//     });
//   }
//   const required = semanticRequireOrigin(node, context.state);
//   if (required !== undefined)
//     return semanticOriginsProvenance([required.origin]);
//   if (t.isSequenceExpression(node)) {
//     const finalExpression = node.expressions.at(-1);
//     return finalExpression === undefined
//       ? semanticUnresolvedProvenance("unknown", "Empty sequence expression.")
//       : provenanceForExpression(finalExpression, nestedContext(context));
//   }
//   if (t.isAssignmentExpression(node) && node.operator === "=")
//     return provenanceForExpression(node.right, nestedContext(context));
//   if (t.isIdentifier(node)) {
//     const binding = resolveSemanticBindingState(context.state, node, node.name);
//     return binding === undefined
//       ? semanticUnresolvedProvenance(
//           "unknown",
//           `Unbound identifier ${node.name}.`,
//         )
//       : provenanceForBindingAtRead(binding, node, nestedContext(context));
//   }
//   if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
//     const members: string[] = [];
//     let current: t.Node = node;
//     while (
//       t.isMemberExpression(current) ||
//       t.isOptionalMemberExpression(current)
//     ) {
//       if (!t.isNode(current.object))
//         return semanticUnresolvedProvenance(
//           "unknown",
//           "Unsupported member base.",
//         );
//       const member = semanticStaticPropertyKey(
//         current.property,
//         current.computed,
//       );
//       if (member === null)
//         return semanticUnresolvedProvenance(
//           "unknown",
//           "Dynamic provenance member.",
//         );
//       members.push(member);
//       current = current.object;
//     }
//     const base = provenanceForExpression(current, nestedContext(context));
//     const path = members.reverse();
//     return base.status !== "module"
//       ? base
//       : semanticOriginsProvenance(
//           base.origins.map((origin) => ({
//             ...origin,
//             importedPath: [...origin.importedPath, ...path],
//           })),
//         );
//   }
//   if (t.isConditionalExpression(node) || t.isLogicalExpression(node)) {
//     const left = t.isConditionalExpression(node) ? node.consequent : node.left;
//     const right = t.isConditionalExpression(node) ? node.alternate : node.right;
//     const candidates = [
//       provenanceForExpression(left, nestedContext(context)),
//       provenanceForExpression(right, nestedContext(context)),
//     ];
//     const origins = uniqueSemanticOrigins(
//       candidates.flatMap((candidate) => candidate.origins),
//     );
//     const allModuleOrigins = candidates.every(
//       ({ status }) => status === "module",
//     );
//     if (allModuleOrigins && origins.length === 1)
//       return semanticOriginsProvenance(origins);
//     return origins.length > 0
//       ? semanticAmbiguousProvenance(
//           origins,
//           allModuleOrigins
//             ? "Multiple module origins."
//             : "Conditional provenance includes a non-module alternative.",
//         )
//       : semanticUnresolvedProvenance(
//           "unknown",
//           "Conditional provenance is unresolved.",
//         );
//   }
//   if (isLocallyCreatedValue(node)) return semanticLocalProvenance();
//   return semanticUnresolvedProvenance(
//     "unknown",
//     `Unsupported ${node.type} provenance.`,
//   );
// };
//
// /** Resolve an alias from the value visible at this read, before later rebinds. */
// const provenanceForBindingAtRead = (
//   binding: JavaScriptSemanticBindingState,
//   read: t.Identifier,
//   context: EvaluationContext,
// ): JavaScriptBindingProvenance => {
//   const selected = semanticReadInitializers(
//     binding,
//     read,
//     context.state.parentsByNode,
//   );
//   if (selected.initializers === binding.initializers)
//     return provenanceForBinding(binding, context);
//   if (context.bindings.has(binding.bindingId))
//     return semanticUnresolvedProvenance(
//       "cycle",
//       `Alias cycle at ${binding.name}.`,
//     );
//   const snapshot: JavaScriptSemanticBindingState = {
//     ...binding,
//     ...selected,
//     // Assignment facts after the read cannot change the captured value.
//     definitions: binding.definitions.filter(
//       ({ kind }) => kind !== "assignment",
//     ),
//   };
//   context.bindings.set(binding.bindingId, context.bindings.size);
//   try {
//     return provenanceForBindingValue(snapshot, context);
//   } finally {
//     context.bindings.delete(binding.bindingId);
//   }
// };
//
// const isLocallyCreatedValue = (node: t.Node): boolean =>
//   readExactJavaScriptLiteral(node).found ||
//   t.isObjectExpression(node) ||
//   t.isArrayExpression(node) ||
//   t.isFunctionExpression(node) ||
//   t.isArrowFunctionExpression(node) ||
//   t.isClassExpression(node) ||
//   t.isTemplateLiteral(node) ||
//   t.isUnaryExpression(node) ||
//   t.isBinaryExpression(node) ||
//   t.isUpdateExpression(node);
//
// const mergeValues = (
//   values: readonly JavaScriptSemanticValue[],
// ): JavaScriptSemanticValue => {
//   const resourceLimit = values.find(isSemanticResourceLimit);
//   if (resourceLimit !== undefined) return resourceLimit;
//   const primitives = values.flatMap(
//     (value) => primitiveCandidates(value) ?? [],
//   );
//   return values.every(
//     (value) => value.status === "union" || value.status === "literal",
//   )
//     ? primitiveSet(primitives)
//     : { status: "ambiguous", reason: "Branches have incompatible values." };
// };
//
// const nestedContext = (context: EvaluationContext): EvaluationContext => ({
//   state: context.state,
//   primitiveBindingValues: context.primitiveBindingValues,
//   ...(context.capturePoint === undefined
//     ? {}
//     : { capturePoint: context.capturePoint }),
//   expressionDepth: context.expressionDepth + 1,
//   bindings: context.bindings,
//   dependence: context.dependence,
//   memo: context.memo,
// });
//
// const isPrimitive = (value: JavaScriptSemanticValue): boolean =>
//   value.status === "literal" || value.status === "union";
//
// const primitiveCaptureContext = (
//   node: t.Node,
//   context: EvaluationContext,
// ): EvaluationContext | undefined => {
//   if (t.isObjectExpression(node) || t.isArrayExpression(node)) return undefined;
//   return captureContextAt(node, context);
// };
//
// const captureContextAt = (
//   node: t.Node,
//   context: EvaluationContext,
// ): EvaluationContext | undefined => {
//   if (
//     context.capturePoint !== undefined ||
//     semanticCapturePosition(node, context.state.parentsByNode) === null
//   )
//     return undefined;
//   let captures = capturedBindingValuesByState.get(context.state);
//   if (captures === undefined) {
//     captures = new WeakMap();
//     capturedBindingValuesByState.set(context.state, captures);
//   }
//   let values = captures.get(node);
//   if (values === undefined) {
//     values = new Map();
//     captures.set(node, values);
//   }
//   return { ...context, capturePoint: node, primitiveBindingValues: values };
// };
//
// const evaluateCapturedExpression = (
//   node: t.Node,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   // A literal field captures its primitive at construction, even when its
//   // containing object is subsequently read at another capture point.
//   let values = primitiveExpressionValuesByState.get(context.state);
//   const cached = values?.get(node);
//   if (cached !== undefined) return cached;
//   let value = evaluateExpression(node, context);
//   if (!isPrimitive(value)) {
//     const captureContext = primitiveCaptureContext(node, context);
//     if (captureContext !== undefined) {
//       const captured = evaluateExpression(node, captureContext);
//       if (isPrimitive(captured)) value = captured;
//     }
//   }
//   // Never publish values evaluated at somebody else's capture point. Like
//   // binding caches, these entries are discarded whenever effects change.
//   if (context.capturePoint === undefined && isPrimitive(value)) {
//     if (values === undefined) {
//       values = new WeakMap();
//       primitiveExpressionValuesByState.set(context.state, values);
//     }
//     values.set(node, value);
//   }
//   return value;
// };
export const _l = 287;
