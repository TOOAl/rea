export const __stub = 1;
//     context.memo.dependencyFrames.pop();
//     retainDependencyProof(frame.proof, context);
//   }
// };
//
// const evaluateBinding = (
//   binding: JavaScriptSemanticBindingState,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   recordBindingDependency(binding, context);
//   const cycleHead = context.bindings.get(binding.bindingId);
//   if (cycleHead !== undefined) {
//     context.dependence.lowest = Math.min(context.dependence.lowest, cycleHead);
//     return { status: "cycle", reason: `Alias cycle at ${binding.name}.` };
//   }
//   if (
//     context.capturePoint !== undefined &&
//     !semanticBindingPrecedesCapture(
//       binding,
//       context.capturePoint,
//       context.state.parentsByNode,
//     )
//   ) {
//     const { capturePoint: _capturePoint, ...liveContext } = context;
//     return evaluateBinding(binding, {
//       ...liveContext,
//       primitiveBindingValues: primitiveBindingValuesFor(context.state),
//     });
//   }
//   const cached = context.primitiveBindingValues.get(binding.bindingId);
//   if (cached !== undefined) return cached;
//   // Each closure that aliases an outer binding evaluates it both live and at
//   // its capture point, so re-deriving it doubles the work at every level of
//   // nesting. A deeper reader derives it again: the retained value would carry
//   // more nesting than the remaining depth budget allows it to observe.
//   const independent =
//     context.capturePoint === undefined
//       ? callerIndependentBindingValuesFor(context.state)
//       : undefined;
//   const retained = independent?.get(binding.bindingId);
//   if (
//     retained !== undefined &&
//     context.expressionDepth <= retained.expressionDepth
//   ) {
//     const reusable = readMemoizedEvaluation(retained, context);
//     if (reusable !== undefined) return reusable;
//   }
//   if (binding.initializers.length === 0)
//     return {
//       status: "unknown",
//       reason: `Binding ${binding.name} has no constant initializer.`,
//     };
//   if (
//     binding.initializers.some(
//       ({ node }) =>
//         t.isUpdateExpression(node) ||
//         (t.isAssignmentExpression(node) &&
//           node.operator !== "=" &&
//           node.operator !== "&&=" &&
//           node.operator !== "||=" &&
//           node.operator !== "??="),
//     )
//   )
//     return {
//       status: "unknown",
//       reason: `Binding ${binding.name} has a compound or update write.`,
//     };
//   if (binding.initializers.length > 1)
//     return {
//       status: "ambiguous",
//       reason: `Binding ${binding.name} has multiple possible assignments.`,
//     };
//   const initializer = binding.initializers[0];
//   if (initializer === undefined)
//     return { status: "unknown", reason: "Missing binding initializer." };
//   if (context.state.conditionallySkippedExpressions.has(initializer.node))
//     return {
//       status: "unknown",
//       reason: `Binding ${binding.name} may remain uninitialized.`,
//     };
//   const position = context.bindings.size;
//   const callerDependence = context.dependence.lowest;
//   context.dependence.lowest = CALLER_INDEPENDENT;
//   context.bindings.set(binding.bindingId, position);
//   let value: JavaScriptSemanticValue;
//   let callerIndependent = false;
//   let evaluated: MemoizedEvaluation<JavaScriptSemanticValue>;
//   try {
//     evaluated = collectEvaluationDependencies(binding, context, () => {
//       const nested = nestedContext(context);
//       let value = projectValue(
//         evaluateExpression(initializer.node, nested),
//         initializer.projection,
//       );
//       if (!isPrimitive(value)) {
//         const captureContext = primitiveCaptureContext(
//           initializer.node,
//           nested,
//         );
//         if (captureContext !== undefined) {
//           const captured = projectValue(
//             evaluateExpression(initializer.node, captureContext),
//             initializer.projection,
//           );
//           if (isPrimitive(captured)) value = captured;
//         }
//       }
//       return value;
//     });
//     value = evaluated.value;
//     // A cycle among bindings this one reads is part of its value. A cycle
//     // through this binding is cut elsewhere when a caller holds another member.
//     callerIndependent = context.dependence.lowest > position;
//   } finally {
//     context.bindings.delete(binding.bindingId);
//     context.dependence.lowest = callerIndependent
//       ? callerDependence
//       : Math.min(callerDependence, context.dependence.lowest);
//   }
//   let projected = invalidateSemanticMutationPaths(
//     value,
//     binding.memberWrites.map(({ path }) => path),
//   );
//   for (const escape of binding.escapedPaths) {
//     // Escapes only invalidate object references; other lattice values survive.
//     if (projected.status !== "object" && projected.status !== "array") break;
//     if (
//       context.capturePoint !== undefined &&
//       semanticEscapeFollowsCapture(
//         binding,
//         context.capturePoint,
//         escape.node,
//         context.state.parentsByNode,
//       )
//     )
//       continue;
//     projected = invalidateSemanticEscapedPath(projected, escape.path);
//   }
//   if (
//     callerIndependent &&
//     independent !== undefined &&
//     (retained === undefined ||
//       retained.expressionDepth < context.expressionDepth)
//   )
//     independent.set(binding.bindingId, {
//       value: projected,
//       dependencies: evaluated.dependencies,
//       expressionDepth: context.expressionDepth,
//     });
//   // Point-local memoization also bounds failed speculative captures. Only a
//   // primitive result is allowed back into ordinary value evaluation.
//   if (
//     context.capturePoint !== undefined ||
//     projected.status === "literal" ||
//     projected.status === "union" ||
//     (isSemanticResourceLimit(projected) &&
//       (projected.resourceLimit === "primitive-bytes" ||
//         projected.resourceLimit === "primitive-candidates"))
//   )
//     context.primitiveBindingValues.set(binding.bindingId, projected);
//   return projected;
// };
//
// const evaluateExpression = (
//   node: t.Node,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   const value = evaluateExpressionValue(node, context);
//   recordSemanticValueLimit(context.state, value);
//   return value;
// };
//
// const evaluateExpressionValue = (
//   node: t.Node,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   if (context.expressionDepth > SEMANTIC_EXPRESSION_DEPTH_LIMIT) {
//     context.dependence.lowest = EVERY_CALLER;
//     return semanticResourceLimitUnknown("expression-depth");
//   }
//   const unwrapped = unwrapJavaScriptExpression(node);
//   if (unwrapped.depth > 0) {
//     if (
//       context.expressionDepth + unwrapped.depth >
//       SEMANTIC_EXPRESSION_DEPTH_LIMIT
//     ) {
//       context.dependence.lowest = EVERY_CALLER;
//       return semanticResourceLimitUnknown("expression-depth");
//     }
//     return evaluateExpression(unwrapped.node, {
//       ...context,
//       expressionDepth: context.expressionDepth + unwrapped.depth,
//     });
//   }
//   const literal = readExactJavaScriptLiteral(node);
//   if (literal.found) return primitiveSet([literal.value]);
//   if (t.isIdentifier(node)) {
//     const binding = resolveSemanticBindingState(context.state, node, node.name);
//     return binding === undefined
//       ? { status: "unknown", reason: `Unbound identifier ${node.name}.` }
//       : evaluateBinding(binding, nestedContext(context));
//   }
//   if (t.isTemplateLiteral(node)) return evaluateTemplate(node, context);
//   if (t.isConditionalExpression(node))
//     return mergeValues([
//       evaluateExpression(node.consequent, nestedContext(context)),
//       evaluateExpression(node.alternate, nestedContext(context)),
//     ]);
//   if (t.isLogicalExpression(node))
//     return mergeValues([
//       evaluateExpression(node.left, nestedContext(context)),
//       evaluateExpression(node.right, nestedContext(context)),
//     ]);
//   if (t.isObjectExpression(node)) return evaluateObject(node, context);
//   if (t.isArrayExpression(node)) return evaluateArray(node, context);
//   if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node))
//     return evaluateMember(node, context);
//   if (t.isBinaryExpression(node, { operator: "+" }))
//     return evaluateAddition(node, context);
//   if (t.isUnaryExpression(node)) return evaluateUnary(node, context);
//   return { status: "unknown", reason: `Unsupported ${node.type} value.` };
// };
//
// const evaluateTemplate = (
//   node: t.TemplateLiteral,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   let candidates = [""];
//   for (let index = 0; index < node.quasis.length; index += 1) {
//     const quasi = node.quasis[index];
//     const text = quasi?.value.cooked;
//     if (text === undefined || text === null)
//       return {
//         status: "unknown",
//         reason: "Template text has no cooked representation.",
//       };
//     if (exceedsSemanticTemplateByteBudget(candidates, [text]))
//       return semanticResourceLimitUnknown("primitive-bytes");
//     candidates = candidates.map((prefix) => `${prefix}${text}`);
//     const expression = node.expressions[index];
//     if (expression === undefined) continue;
//     const evaluated = evaluateExpression(expression, nestedContext(context));
//     const values = primitiveCandidates(evaluated);
//     if (values === null) {
//       if (isSemanticResourceLimit(evaluated)) return evaluated;
//       return {
//         status: "unknown",
//         reason: "Template expression is not a bounded primitive.",
//       };
//     }
//     if (candidates.length > SEMANTIC_PRIMITIVE_CANDIDATE_LIMIT / values.length)
//       return semanticResourceLimitUnknown("primitive-candidates");
//     const suffixes = values.map((value) => String(value));
//     if (exceedsSemanticTemplateByteBudget(candidates, suffixes))
//       return semanticResourceLimitUnknown("primitive-bytes");
//     candidates = candidates.flatMap((prefix) =>
//       suffixes.map((suffix) => `${prefix}${suffix}`),
//     );
//   }
//   return primitiveSet(candidates);
// };
//
// const evaluateObject = (
//   node: t.ObjectExpression,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   const propertiesByName = new Map<string, JavaScriptSemanticProperty>();
//   let unknownProperties = false;
//   let omittedProperties: number | null = 0;
//   const invalidateEarlierProperties = (): void => {
//     for (const [name] of propertiesByName)
//       propertiesByName.set(name, {
//         name,
//         presence: "present",
//         value: {
//           status: "unknown",
//           reason: "A later property may overwrite this value.",
//         },
//       });
//   };
//   for (const property of node.properties) {
//     if (t.isSpreadElement(property)) {
//       unknownProperties = true;
//       omittedProperties = null;
//       invalidateEarlierProperties();
//       continue;
//     }
//     const name = semanticStaticPropertyKey(property.key, property.computed);
export const _l = 288;
