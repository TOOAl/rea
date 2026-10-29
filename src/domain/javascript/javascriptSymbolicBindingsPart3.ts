export const __stub = 1;
//         ["require", "navigator", "String", "Boolean"].includes(node.name)
//         ? { kind: "external", path: [node.name] }
//         : symbolicUnknown("unbound identifier");
//     if (binding.definitions.some((d) => d.kind === "assignment"))
//       return symbolicUnknown("reassigned binding");
//     // Electron member identity is checked at the selected property. A write
//     // to one method must not erase the module origin or unaffected siblings.
//     const electronOrigin = this.#electronIdentity.exportPath(node);
//     if (electronOrigin === undefined && this.#mutated.has(binding.bindingId))
//       return symbolicUnknown("dynamic member writes");
//     for (let e: SymbolicEnvironment | undefined = env; e; e = e.parent) {
//       const value = e.values.get(binding.bindingId);
//       if (value) return value;
//     }
//     if (electronOrigin === undefined && this.#writes.has(binding.bindingId))
//       return symbolicUnknown("overwritten object members");
//     const initializer =
//       binding.initializers.length === 1 ? binding.initializers[0] : undefined;
//     if (!initializer)
//       return symbolicUnknown("missing or ambiguous initializer");
//     const point = this.#initializerReadPoint(binding.scopeId, env, node);
//     if (
//       !initializer.entryBody &&
//       !binding.definitions.every(({ kind }) => kind === "function") &&
//       (initializer.node.end == null ||
//         point == null ||
//         initializer.node.end > point)
//     ) {
//       this.unresolved = true;
//       return symbolicUnknown("initializer not available at this read");
//     }
//     if (this.state.conditionallySkippedExpressions.has(initializer.node))
//       return symbolicUnknown("conditional initializer");
//     let value = this.evaluate(initializer.node, env);
//     for (const key of initializer.projection) {
//       if (key === null) return symbolicUnknown("dynamic destructuring");
//       value = this.property(value, String(key));
//     }
//     return value;
//   }
//
//   #initializerReadPoint(
//     bindingScopeId: string,
//     environment: SymbolicEnvironment,
//     readNode: t.Node,
//   ): number | undefined {
//     let current: SymbolicEnvironment | undefined = environment;
//     let child: SymbolicEnvironment | undefined;
//     while (current) {
//       if (this.#scopeContains(bindingScopeId, current.scopeId)) {
//         const point = child?.point ?? readNode;
//         if (current.completedAt !== undefined)
//           return current.completedAt.end ?? undefined;
//         if (current.scopeNode && !this.#nodeWithin(point, current.scopeNode))
//           return undefined;
//         return point.start ?? undefined;
//       }
//       child = current;
//       current = current.parent;
//     }
//     let outermost = environment;
//     while (outermost.parent) outermost = outermost.parent;
//     const point = outermost.point ?? environment.point ?? readNode;
//     return point.start ?? undefined;
//   }
//
//   #scopeContains(bindingScopeId: string, environmentScopeId?: string): boolean {
//     let scopeId: string | null = bindingScopeId;
//     while (scopeId !== null) {
//       if (scopeId === environmentScopeId) return true;
//       scopeId = this.state.scopesById.get(scopeId)?.parentScopeId ?? null;
//     }
//     return false;
//   }
//
//   #nodeWithin(node: t.Node, ancestor?: t.Node): boolean {
//     if (!ancestor) return false;
//     let current: t.Node | undefined = node;
//     while (current) {
//       if (current === ancestor) return true;
//       current = this.state.parentsByNode.get(current);
//     }
//     return false;
//   }
//
//   #completedEnvironment(
//     environment: SymbolicEnvironment,
//     activation: SymbolicEnvironment,
//     returnPoint: t.Node,
//   ): SymbolicEnvironment | undefined {
//     if (environment === activation)
//       return { ...environment, completedAt: returnPoint };
//     if (environment.parent === undefined) return undefined;
//     const parent = this.#completedEnvironment(
//       environment.parent,
//       activation,
//       returnPoint,
//     );
//     return parent === undefined ? undefined : { ...environment, parent };
//   }
//
//   #completeReturnedFunction(
//     value: SymbolicFunction,
//     activation: SymbolicEnvironment,
//     returnPoint: t.Node,
//   ): SymbolicFunction {
//     const environment = this.#completedEnvironment(
//       value.environment,
//       activation,
//       returnPoint,
//     );
//     if (environment === undefined) return value;
//     const { returnPoint: _returnPoint, ...returned } = value;
//     return { ...returned, environment };
//   }
//
//   #moduleCompletionPoint(factory: t.Function): t.Node {
//     let earliestReturn: t.ReturnStatement | undefined;
//     // Use the shared traversal so source-sized child lists are pushed one at
//     // a time. Spreading array elements or call arguments overflows the stack.
//     traverseJavaScriptAst(factory.body, {
//       skip: (node) => t.isFunction(node) || t.isClass(node),
//       enter: (node) => {
//         if (
//           t.isReturnStatement(node) &&
//           (earliestReturn === undefined ||
//             (node.start ?? Infinity) < (earliestReturn.start ?? Infinity))
//         )
//           earliestReturn = node;
//       },
//     });
//     return earliestReturn ?? factory.body;
//   }
//
//   #call(
//     node: t.CallExpression | t.OptionalCallExpression,
//     env: SymbolicEnvironment,
//   ): SymbolicValue {
//     const callee = this.evaluate(node.callee, env);
//     const args = this.arguments(node, env);
//     return symbolicUnion(
//       symbolicVariants(callee).map((value) => {
//         let result: SymbolicValue;
//         if (value.kind === "loader") {
//           const key = args[0];
//           const loaded =
//             key?.kind === "literal"
//               ? (value.modules.get(String(key.value)) ??
//                 symbolicUnknown("missing module"))
//               : symbolicUnknown("dynamic module");
//           if (loaded.kind === "namespace") {
//             const factory = this.#namespaceOwners.get(loaded.bindingId);
//             result =
//               factory === undefined
//                 ? loaded
//                 : {
//                     ...loaded,
//                     environment: {
//                       ...loaded.environment,
//                       completedAt: this.#moduleCompletionPoint(factory),
//                     },
//                   };
//           } else result = loaded;
//         } else if (
//           value.kind === "external" &&
//           value.path.join(".") === "require"
//         ) {
//           const spec = args[0];
//           result =
//             spec?.kind === "literal" && typeof spec.value === "string"
//               ? { kind: "external", path: [spec.value] }
//               : symbolicUnknown("dynamic require");
//         } else if (
//           value.kind !== "function" ||
//           this.#activeFunctions.has(value.node)
//         ) {
//           result = symbolicUnknown("unresolved or recursive call");
//         } else {
//           this.#activeFunctions.add(value.node);
//           try {
//             const bound = this.bind(value, args, node);
//             const returned = t.isBlockStatement(value.node.body)
//               ? this.#returns(value.node.body.body, bound)
//               : this.evaluate(value.node.body, bound);
//             result = symbolicUnion(
//               symbolicVariants(returned).map((v) =>
//                 v.kind === "function"
//                   ? {
//                       ...this.#completeReturnedFunction(
//                         v,
//                         bound,
//                         v.returnPoint ?? value.node.body,
//                       ),
//                       origins: [...value.origins, node, ...v.origins],
//                     }
//                   : v,
//               ),
//             );
//           } finally {
//             this.#activeFunctions.delete(value.node);
//           }
//         }
//         for (const condition of value.conditions ?? [])
//           result = symbolicCondition(result, condition);
//         if (value.conditionUnresolved)
//           result = symbolicConditionsUnresolved(result);
//         return result;
//       }),
//     );
//   }
//
//   #returns(
//     statements: readonly t.Statement[],
//     env: SymbolicEnvironment,
//   ): SymbolicValue {
//     const flow = this.#returnFlow(statements, env);
//     return symbolicUnion([
//       ...flow.values,
//       ...(flow.fallsThrough
//         ? [{ kind: "literal" as const, value: undefined }]
//         : []),
//     ]);
//   }
//
//   #returnFlow(
//     statements: readonly t.Statement[],
//     env: SymbolicEnvironment,
//     depth = 0,
//   ): SymbolicReturnFlow {
//     const possible: SymbolicValue[] = [];
//     let unresolvedFallthrough = false;
//     const continuationConditions: SymbolicCondition[] = [];
//     const guardCurrentPath = (value: SymbolicValue): SymbolicValue => {
//       let guarded = value;
//       for (const condition of continuationConditions)
//         guarded = symbolicCondition(guarded, condition);
//       return unresolvedFallthrough
//         ? symbolicConditionsUnresolved(guarded)
//         : guarded;
//     };
//     for (const statement of statements) {
//       if (--this.#remainingEvaluations < 0 || depth >= 128) {
//         this.truncated = true;
//         return {
//           values: [...possible, symbolicUnknown("symbolic resource limit")],
//           fallsThrough: false,
//         };
//       }
//       if (t.isThrowStatement(statement))
//         return {
//           values: [...possible, symbolicUnknown("wrapper exits by throwing")],
//           fallsThrough: false,
//         };
//       if (t.isReturnStatement(statement)) {
//         const value = this.evaluate(statement.argument, env);
//         const returned = symbolicUnion(
//           symbolicVariants(value).map((variant) =>
//             variant.kind === "function"
//               ? { ...variant, returnPoint: statement }
//               : variant,
//           ),
//         );
//         return {
//           values: [...possible, guardCurrentPath(returned)],
export const _l = 264;
