export const __stub = 1;
//         }
//         this.#literalPropertyIndex.set(value.node, index);
//       }
//       if (index !== null) {
//         const property = index.get(key);
//         if (property !== undefined)
//           return this.#objectPropertyValue(property, value.environment);
//         if (key === "__proto__") {
//           const prototypeSetter = [...value.node.properties]
//             .reverse()
//             .filter(
//               (candidate): candidate is t.ObjectMethod | t.ObjectProperty =>
//                 !t.isSpreadElement(candidate),
//             )
//             .find((candidate) => isObjectPrototypeSetter(candidate, key));
//           if (prototypeSetter !== undefined)
//             return this.#objectPropertyValue(
//               prototypeSetter,
//               value.environment,
//             );
//         }
//         return symbolicUnknown("missing property");
//       }
//       for (const p of [...value.node.properties].reverse()) {
//         if (t.isSpreadElement(p)) {
//           const spread = this.evaluate(p.argument, value.environment);
//           const found = this.property(spread, key);
//           if (found.kind !== "unknown") return found;
//           if (
//             this.unknownMembers(spread) > 0 ||
//             this.members(spread).includes(key)
//           )
//             return found;
//         } else if (semanticStaticPropertyKey(p.key, p.computed) === key) {
//           return this.#objectPropertyValue(p, value.environment);
//         } else if (semanticStaticPropertyKey(p.key, p.computed) === null)
//           return symbolicUnknown("dynamic property overwrite");
//       }
//     }
//     if (value.kind === "array" && /^\d+$/u.test(key))
//       return value.values[Number(key)] ?? symbolicUnknown("missing argument");
//     return symbolicUnknown("unresolved property");
//   }
//
//   #objectPropertyValue(
//     property: t.ObjectMethod | t.ObjectProperty,
//     environment: SymbolicEnvironment,
//   ): SymbolicValue {
//     return t.isObjectMethod(property) && property.kind !== "method"
//       ? symbolicUnknown("accessor property")
//       : this.evaluate(
//           t.isObjectProperty(property) ? property.value : property,
//           environment,
//         );
//   }
//
//   members(
//     value: SymbolicValue,
//     active = new Set<SymbolicValue>(),
//   ): readonly string[] {
//     if (active.has(value)) return [];
//     active.add(value);
//     if (value.kind === "union")
//       return [...new Set(value.values.flatMap((v) => this.members(v, active)))];
//     if (value.kind === "record") return [...value.values.keys()];
//     if (value.kind === "namespace") {
//       const replacement = this.#replacements.get(value.bindingId);
//       return replacement
//         ? this.members(this.evaluate(replacement, value.environment), active)
//         : [
//             ...new Set(
//               (this.#writes.get(value.bindingId) ?? []).flatMap((w) =>
//                 w.path.length === 1 ? w.path : [],
//               ),
//             ),
//           ];
//     }
//     if (value.kind !== "object") return [];
//     return [
//       ...new Set(
//         value.node.properties.flatMap((p) =>
//           t.isSpreadElement(p)
//             ? this.members(this.evaluate(p.argument, value.environment), active)
//             : [semanticStaticPropertyKey(p.key, p.computed)].filter(
//                 (k): k is string =>
//                   k !== null && !isObjectPrototypeSetter(p, k),
//               ),
//         ),
//       ),
//     ];
//   }
//
//   unknownMembers(
//     value: SymbolicValue,
//     active = new Set<SymbolicValue>(),
//   ): number {
//     if (active.has(value)) return 1;
//     active.add(value);
//     if (value.kind === "union")
//       return value.values.reduce(
//         (sum, v) => sum + this.unknownMembers(v, active),
//         0,
//       );
//     if (value.kind === "record") return 0;
//     if (value.kind === "namespace") {
//       if (this.#mutated.has(value.bindingId)) return 1;
//       const replacement = this.#replacements.get(value.bindingId);
//       return replacement
//         ? this.unknownMembers(
//             this.evaluate(replacement, value.environment),
//             active,
//           )
//         : 0;
//     }
//     if (value.kind !== "object") return 1;
//     return value.node.properties.reduce(
//       (sum, p) =>
//         sum +
//         (t.isSpreadElement(p)
//           ? this.unknownMembers(
//               this.evaluate(p.argument, value.environment),
//               new Set(active),
//             )
//           : Number(semanticStaticPropertyKey(p.key, p.computed) === null)),
//       0,
//     );
//   }
//
//   bind(
//     fn: SymbolicFunction,
//     args: readonly SymbolicValue[],
//     invocationNode?: t.Node,
//   ): SymbolicEnvironment {
//     const values = new Map<string, SymbolicValue>();
//     runtimeFunctionParameters(fn.node).forEach((param, index) => {
//       const target = t.isRestElement(param) ? param.argument : param;
//       if (!t.isIdentifier(target)) return;
//       const binding = resolveSemanticBindingState(
//         this.state,
//         target,
//         target.name,
//       );
//       if (binding)
//         values.set(
//           binding.bindingId,
//           t.isRestElement(param)
//             ? { kind: "array", values: args.slice(index) }
//             : (args[index] ?? symbolicUnknown("runtime parameter")),
//         );
//     });
//     const scopeId =
//       this.state.scopeByNode.get(fn.node)?.scopeId ??
//       this.state.scopeByNode.get(fn.node.body)?.scopeId;
//     return {
//       values,
//       parent: fn.environment,
//       point: invocationNode ?? fn.node,
//       scopeNode: fn.node,
//       ...(scopeId === undefined ? {} : { scopeId }),
//     };
//   }
//
//   arguments(
//     node: t.CallExpression | t.OptionalCallExpression,
//     env: SymbolicEnvironment,
//   ): readonly SymbolicValue[] {
//     return node.arguments.flatMap((a) => {
//       if (!t.isSpreadElement(a)) return [this.evaluate(a, env)];
//       const value = this.evaluate(a.argument, env);
//       return value.kind === "array"
//         ? value.values
//         : [symbolicUnknown("dynamic spread arguments")];
//     });
//   }
//
//   #evaluate(node: t.Node, env: SymbolicEnvironment): SymbolicValue {
//     if (
//       t.isStringLiteral(node) ||
//       t.isNumericLiteral(node) ||
//       t.isBooleanLiteral(node)
//     )
//       return { kind: "literal", value: node.value };
//     if (t.isNullLiteral(node)) return { kind: "literal", value: null };
//     if (t.isFunction(node))
//       return { kind: "function", node, environment: env, origins: [] };
//     if (t.isObjectExpression(node))
//       return { kind: "object", node, environment: env };
//     if (t.isIdentifier(node)) return this.#identifier(node, env);
//     if (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
//       const key = semanticStaticPropertyKey(node.property, node.computed);
//       return key === null
//         ? symbolicUnknown("dynamic member")
//         : this.property(this.evaluate(node.object, env), key);
//     }
//     if (t.isSequenceExpression(node))
//       return this.evaluate(node.expressions.at(-1), env);
//     if (t.isAssignmentExpression(node)) return this.evaluate(node.right, env);
//     if (t.isAwaitExpression(node)) return this.evaluate(node.argument, env);
//     if (t.isUnaryExpression(node)) {
//       const value = this.evaluate(node.argument, env);
//       if (node.operator === "void")
//         return { kind: "literal", value: undefined };
//       const truth = symbolicTruth(value);
//       if (node.operator === "!" && truth !== undefined)
//         return { kind: "literal", value: !truth };
//     }
//     if (t.isConditionalExpression(node)) {
//       const truth = symbolicTruth(this.evaluate(node.test, env));
//       return truth === undefined
//         ? symbolicUnion([
//             symbolicCondition(this.evaluate(node.consequent, env), {
//               node: node.test,
//               positive: true,
//             }),
//             symbolicCondition(this.evaluate(node.alternate, env), {
//               node: node.test,
//               positive: false,
//             }),
//           ])
//         : this.evaluate(truth ? node.consequent : node.alternate, env);
//     }
//     if (t.isLogicalExpression(node)) {
//       const left = this.evaluate(node.left, env);
//       const right = symbolicLogicalRight(node.operator, left);
//       if (right !== undefined)
//         return right ? this.evaluate(node.right, env) : left;
//       const leftCondition: SymbolicCondition = {
//         node: node.left,
//         positive:
//           node.operator === "&&"
//             ? false
//             : node.operator === "||"
//               ? true
//               : "not-nullish",
//       };
//       const rightCondition: SymbolicCondition = {
//         node: node.left,
//         positive:
//           node.operator === "&&"
//             ? true
//             : node.operator === "||"
//               ? false
//               : "nullish",
//       };
//       return symbolicUnion([
//         symbolicCondition(left, leftCondition),
//         symbolicCondition(this.evaluate(node.right, env), rightCondition),
//       ]);
//     }
//     if (t.isCallExpression(node) || t.isOptionalCallExpression(node))
//       return this.#call(node, env);
//     return symbolicUnknown(`unsupported ${node.type}`);
//   }
//
//   #identifier(node: t.Identifier, env: SymbolicEnvironment): SymbolicValue {
//     const binding = resolveSemanticBindingState(this.state, node, node.name);
//     if (
//       !binding &&
//       node.name === "undefined" &&
//       !semanticResolutionBlocked(this.state, node, node.name)
//     )
//       return { kind: "literal", value: undefined };
//     if (!binding)
//       return !semanticResolutionBlocked(this.state, node, node.name) &&
export const _l = 264;
