export const __stub = 1;
//     if (name === null) {
//       unknownProperties = true;
//       if (omittedProperties !== null) omittedProperties += 1;
//       invalidateEarlierProperties();
//       continue;
//     }
//     // This spelling changes the prototype instead of defining an own slot.
//     if (
//       t.isObjectProperty(property) &&
//       !property.computed &&
//       !property.shorthand &&
//       name === "__proto__"
//     ) {
//       unknownProperties = true;
//       if (omittedProperties !== null) omittedProperties += 1;
//       continue;
//     }
//     propertiesByName.set(name, {
//       name,
//       presence: "present",
//       value: t.isObjectProperty(property)
//         ? evaluateCapturedExpression(property.value, nestedContext(context))
//         : {
//             status: "unknown",
//             reason: "Object method or accessor value is not a primitive.",
//           },
//     });
//   }
//   const properties = [...propertiesByName.values()].sort((left, right) =>
//     compareUnicodeCodePoints(left.name, right.name),
//   );
//   return unknownProperties
//     ? {
//         status: "object",
//         properties,
//         unknownProperties: true,
//         omittedProperties,
//       }
//     : {
//         status: "object",
//         properties,
//         unknownProperties: false,
//         omittedProperties: 0,
//       };
// };
//
// const evaluateArray = (
//   node: t.ArrayExpression,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   const items: JavaScriptSemanticProperty[] = [];
//   let unknownItems = false;
//   let omittedItems: number | null = 0;
//   for (const element of node.elements) {
//     if (t.isSpreadElement(element)) {
//       unknownItems = true;
//       omittedItems = null;
//       // Subsequent elements have no fixed index after an unknown-length spread.
//       break;
//     }
//     if (element === null) {
//       items.push({
//         name: String(items.length),
//         presence: "absent",
//         value: { status: "unknown", reason: "Array hole has no own value." },
//       });
//       continue;
//     }
//     items.push({
//       name: String(items.length),
//       presence: "present",
//       value: evaluateCapturedExpression(element, nestedContext(context)),
//     });
//   }
//   return unknownItems
//     ? { status: "array", items, unknownItems: true, omittedItems }
//     : {
//         status: "array",
//         items,
//         unknownItems: false,
//         omittedItems: 0,
//       };
// };
//
// const evaluateMember = (
//   node: t.MemberExpression | t.OptionalMemberExpression,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   const keys: string[] = [];
//   let current: t.Node = node;
//   let value: JavaScriptSemanticValue | undefined;
//   while (
//     t.isMemberExpression(current) ||
//     t.isOptionalMemberExpression(current)
//   ) {
//     if (!t.isNode(current.object)) {
//       value = { status: "unknown", reason: "Unsupported member base." };
//       break;
//     }
//     const key = semanticStaticPropertyKey(current.property, current.computed);
//     if (key === null) {
//       value = { status: "unknown", reason: "Dynamic member key." };
//       break;
//     }
//     keys.push(key);
//     current = current.object;
//   }
//   value ??= evaluateExpression(current, nestedContext(context));
//   for (const key of keys.reverse()) value = projectValue(value, [key]);
//   return value;
// };
//
// const evaluateAddition = (
//   node: t.BinaryExpression,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   const pending: {
//     readonly node: t.BinaryExpression;
//     left: JavaScriptSemanticValue | undefined;
//   }[] = [];
//   let current: t.Node = node;
//   while (true) {
//     if (t.isBinaryExpression(current, { operator: "+" })) {
//       pending.push({ node: current, left: undefined });
//       current = current.left;
//       continue;
//     }
//     let value = evaluateExpression(current, nestedContext(context));
//     while (true) {
//       const parent = pending.at(-1);
//       if (parent === undefined) return value;
//       if (parent.left === undefined) {
//         parent.left = value;
//         current = parent.node.right;
//         break;
//       }
//       value = addPrimitiveValues(parent.left, value);
//       pending.pop();
//     }
//   }
// };
//
// const addPrimitiveValues = (
//   leftValue: JavaScriptSemanticValue,
//   rightValue: JavaScriptSemanticValue,
// ): JavaScriptSemanticValue => {
//   const left = primitiveCandidates(leftValue);
//   const right = primitiveCandidates(rightValue);
//   if (left === null || right === null) {
//     if (isSemanticResourceLimit(leftValue)) return leftValue;
//     if (isSemanticResourceLimit(rightValue)) return rightValue;
//     return { status: "unknown", reason: "Non-primitive addition." };
//   }
//   if (left.length > SEMANTIC_PRIMITIVE_CANDIDATE_LIMIT / right.length)
//     return semanticResourceLimitUnknown("primitive-candidates");
//   if (exceedsSemanticPrimitiveAdditionByteBudget(left, right))
//     return semanticResourceLimitUnknown("primitive-bytes");
//   const values = left.flatMap((leftValue) =>
//     right.map((rightValue) =>
//       typeof leftValue === "string" || typeof rightValue === "string"
//         ? `${String(leftValue)}${String(rightValue)}`
//         : Number(leftValue) + Number(rightValue),
//     ),
//   );
//   return primitiveSet(values);
// };
//
// const evaluateUnary = (
//   node: t.UnaryExpression,
//   context: EvaluationContext,
// ): JavaScriptSemanticValue => {
//   const evaluated = evaluateExpression(node.argument, nestedContext(context));
//   const argument = primitiveCandidates(evaluated);
//   if (argument === null) {
//     if (isSemanticResourceLimit(evaluated)) return evaluated;
//     return { status: "unknown", reason: "Non-primitive unary operand." };
//   }
//   if (node.operator === "!")
//     return primitiveSet(argument.map((value) => !value));
//   if (node.operator === "+")
//     return primitiveSet(argument.map((value) => Number(value)));
//   if (node.operator === "-")
//     return primitiveSet(argument.map((value) => -Number(value)));
//   return { status: "unknown", reason: `Unsupported unary ${node.operator}.` };
// };
//
// const projectValue = (
//   value: JavaScriptSemanticValue,
//   projection: readonly (string | number | null)[],
// ): JavaScriptSemanticValue => {
//   if (isSemanticResourceLimit(value)) return value;
//   if (projection.includes(null))
//     return { status: "unknown", reason: "Cannot project a dynamic property." };
//   const path = projection.map((key) => String(key));
//   const slot = semanticSlotAtPath(value, path);
//   return slot.presence === "present" || isSemanticResourceLimit(slot.value)
//     ? slot.value
//     : {
//         status: "unknown",
//         reason: `Own property ${path.join("/")} is ${slot.presence}.`,
//       };
// };
//
// const provenanceForBinding = (
//   binding: JavaScriptSemanticBindingState,
//   context: EvaluationContext,
// ): JavaScriptBindingProvenance => {
//   recordBindingDependency(binding, context);
//   const cycleHead = context.bindings.get(binding.bindingId);
//   if (cycleHead !== undefined) {
//     context.dependence.lowest = Math.min(context.dependence.lowest, cycleHead);
//     return semanticUnresolvedProvenance(
//       "cycle",
//       `Alias cycle at ${binding.name}.`,
//     );
//   }
//   let depths = context.memo.provenance.get(binding.bindingId);
//   const prior = readMemoizedEvaluation(
//     depths?.get(context.expressionDepth),
//     context,
//   );
//   if (prior !== undefined) return prior;
//   const position = context.bindings.size;
//   const callerDependence = context.dependence.lowest;
//   context.dependence.lowest = CALLER_INDEPENDENT;
//   let result: MemoizedEvaluation<JavaScriptBindingProvenance>;
//   let callerIndependent = false;
//   try {
//     result = collectEvaluationDependencies(binding, context, () =>
//       provenanceForBindingUncached(binding, context),
//     );
//     callerIndependent = context.dependence.lowest > position;
//   } finally {
//     context.dependence.lowest = callerIndependent
//       ? callerDependence
//       : Math.min(callerDependence, context.dependence.lowest);
//   }
//   if (callerIndependent) {
//     if (depths === undefined) {
//       depths = new Map();
//       context.memo.provenance.set(binding.bindingId, depths);
//     }
//     depths.set(context.expressionDepth, result);
//   }
//   return result.value;
// };
//
// const provenanceForBindingUncached = (
//   binding: JavaScriptSemanticBindingState,
//   context: EvaluationContext,
// ): JavaScriptBindingProvenance => {
//   const provenance = provenanceForBindingValue(binding, context);
//   const assigned = binding.definitions.some(
//     ({ kind }) => kind === "assignment",
//   );
//   const conditionallyInitialized = binding.initializers.some(({ node }) =>
//     context.state.conditionallySkippedExpressions.has(node),
//   );
//   if (
//     provenance.status !== "module" ||
//     (!assigned && !conditionallyInitialized)
//   )
//     return provenance;
//   return semanticAmbiguousProvenance(
//     provenance.origins,
//     assigned
//       ? `Binding ${binding.name} may be reassigned.`
//       : `Binding ${binding.name} may remain uninitialized.`,
//   );
// };
//
// const provenanceForBindingValue = (
//   binding: JavaScriptSemanticBindingState,
//   context: EvaluationContext,
// ): JavaScriptBindingProvenance => {
//   if (binding.kind === "parameter" || binding.kind === "catch")
//     return semanticUnresolvedProvenance(
//       "unknown",
//       binding.kind === "parameter"
//         ? "Parameter provenance depends on caller arguments."
//         : "Catch binding provenance depends on the thrown value.",
//     );
//   if (binding.directOrigins.length > 0)
//     return semanticOriginsProvenance(binding.directOrigins);
//   if (binding.initializers.length === 0) return semanticLocalProvenance();
//   if (binding.initializers.length > 1)
//     return semanticAmbiguousProvenance(
//       [],
export const _l = 288;
