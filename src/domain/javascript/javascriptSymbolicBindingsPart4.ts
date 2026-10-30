export const __stub = 1;
//           fallsThrough: false,
//         };
//       }
//       if (t.isBlockStatement(statement)) {
//         const flow = this.#returnFlow(statement.body, env, depth + 1);
//         possible.push(...flow.values.map(guardCurrentPath));
//         if (!flow.fallsThrough)
//           return { values: possible, fallsThrough: false };
//       }
//       if (t.isIfStatement(statement)) {
//         const truth = symbolicTruth(this.evaluate(statement.test, env));
//         const branches =
//           truth === undefined
//             ? [statement.consequent, statement.alternate]
//             : [truth ? statement.consequent : statement.alternate];
//         const flows = branches.map((branch) =>
//           this.#returnFlow(branch ? [branch] : [], env, depth + 1),
//         );
//         possible.push(
//           ...flows.flatMap((flow, index) =>
//             flow.values.map((value) => {
//               const guarded = guardCurrentPath(value);
//               return truth === undefined
//                 ? symbolicCondition(guarded, {
//                     node: statement.test,
//                     positive: index === 0,
//                   })
//                 : guarded;
//             }),
//           ),
//         );
//         if (flows.every((flow) => !flow.fallsThrough))
//           return { values: possible, fallsThrough: false };
//         if (truth === undefined) {
//           const fallthrough = flows.flatMap((flow, index) =>
//             flow.fallsThrough ? [{ flow, index }] : [],
//           );
//           if (
//             fallthrough.length === 1 &&
//             fallthrough[0]?.flow.values.length === 0
//           )
//             continuationConditions.push({
//               node: statement.test,
//               positive: fallthrough[0].index === 0,
//             });
//           else if (
//             fallthrough.length > 0 &&
//             (fallthrough.length < flows.length ||
//               fallthrough.some(({ flow }) => flow.values.length > 0))
//           )
//             unresolvedFallthrough = true;
//         }
//       }
//       if (
//         t.isWhileStatement(statement) ||
//         t.isDoWhileStatement(statement) ||
//         t.isForStatement(statement) ||
//         t.isForInStatement(statement) ||
//         t.isForOfStatement(statement) ||
//         t.isSwitchStatement(statement) ||
//         t.isTryStatement(statement)
//       ) {
//         if (containsOwnedReturn(statement)) {
//           possible.push(
//             symbolicUnknown(
//               `unsupported return control flow: ${statement.type}`,
//             ),
//           );
//           unresolvedFallthrough = true;
//         }
//       }
//     }
//     return { values: possible, fallsThrough: true };
//   }
//
//   #indexBootstrap(call: t.CallExpression): void {
//     const bootstrap = javascriptBootstrapAt(call, this.state);
//     if (!bootstrap) return;
//     const modules = new Map<string, SymbolicValue>();
//     const tableAliases = new Set([bootstrap.tableBindingId]);
//     const pendingAliases = [bootstrap.tableBindingId];
//     while (pendingAliases.length > 0) {
//       const source = pendingAliases.pop()!;
//       for (const alias of this.#aliasesByBinding.get(source) ?? [])
//         if (!tableAliases.has(alias)) {
//           tableAliases.add(alias);
//           pendingAliases.push(alias);
//         }
//     }
//     for (const property of bootstrap.table.properties) {
//       const factory = moduleFactory(property);
//       if (!factory) continue;
//       const moduleKey = modulePropertyName(property);
//       const values = new Map<string, SymbolicValue>();
//       const environment: SymbolicEnvironment = {
//         values,
//         point: factory.body,
//         scopeNode: factory,
//         ...(this.state.scopeByNode.get(factory)?.scopeId === undefined
//           ? {}
//           : { scopeId: this.state.scopeByNode.get(factory)!.scopeId }),
//       };
//       const [first, second, third] = runtimeFunctionParameters(factory);
//       const binding = (n: t.Node | undefined) =>
//         t.isIdentifier(n)
//           ? resolveSemanticBindingState(this.state, n, n.name)?.bindingId
//           : undefined;
//       const moduleId = binding(first);
//       const exportsId = binding(second);
//       const loaderId = binding(third);
//       const namespaceId = `${String(factory.start)}:exports`;
//       this.#namespaceOwners.set(namespaceId, factory);
//       const namespace: SymbolicValue = {
//         kind: "namespace",
//         bindingId: namespaceId,
//         environment,
//       };
//       if (moduleId) {
//         values.set(moduleId, {
//           kind: "record",
//           values: new Map([["exports", namespace]]),
//         });
//         this.#exportAliases.set(moduleId, namespaceId);
//         this.#moduleBindings.add(moduleId);
//       }
//       if (exportsId) {
//         values.set(exportsId, namespace);
//         this.#exportAliases.set(exportsId, namespaceId);
//       }
//       if (loaderId) values.set(loaderId, { kind: "loader", modules });
//       this.#environments.set(factory, environment);
//       modules.set(moduleKey, namespace);
//     }
//     this.#bootstrapTables.push({ tableAliases, modules });
//   }
//
//   #indexBindingAliases(): void {
//     for (const binding of this.state.bindingsById.values()) {
//       const initializer = binding.initializers[0];
//       if (
//         !initializer ||
//         initializer.entryBody !== undefined ||
//         initializer.projection.length !== 0 ||
//         !t.isIdentifier(initializer.node)
//       )
//         continue;
//       const source = resolveSemanticBindingState(
//         this.state,
//         initializer.node,
//         initializer.node.name,
//       );
//       if (!source) continue;
//       const aliases = this.#aliasesByBinding.get(source.bindingId) ?? [];
//       aliases.push(binding.bindingId);
//       this.#aliasesByBinding.set(source.bindingId, aliases);
//     }
//   }
//
//   #invalidateBootstrapTable(
//     tableAliases: ReadonlySet<string>,
//     modules: Map<string, SymbolicValue>,
//   ): void {
//     let invalidateAll = false;
//     const invalidSlots = new Set<string>();
//     for (const bindingId of tableAliases) {
//       if (this.#mutated.has(bindingId)) invalidateAll = true;
//       for (const definition of this.state.bindingsById.get(bindingId)
//         ?.definitions ?? [])
//         if (definition.kind === "assignment") invalidateAll = true;
//       for (const write of this.#writes.get(bindingId) ?? []) {
//         if (write.path.length === 0) invalidateAll = true;
//         else invalidSlots.add(write.path[0]!);
//       }
//     }
//     if (invalidateAll) modules.clear();
//     else for (const key of invalidSlots) modules.delete(key);
//   }
//
//   #indexWriteSite(target: t.Node, site: t.Node): void {
//     const direct = unwrapJavaScriptExpression(target).node;
//     if (
//       (t.isIdentifier(direct) || t.isMemberExpression(direct)) &&
//       !t.isForOfStatement(site) &&
//       !t.isForInStatement(site)
//     ) {
//       this.#indexWrite(
//         direct,
//         t.isAssignmentExpression(site) ? site.right : site,
//         site,
//       );
//       return;
//     }
//     for (const leaf of semanticWriteTargets(target))
//       this.#indexWrite(leaf, site, site, false);
//   }
//
//   #indexWrite(target: t.Node, value: t.Node, site: t.Node, exact = true): void {
//     const path: string[] = [];
//     let root = unwrapJavaScriptExpression(target).node;
//     let dynamic = !exact;
//     while (t.isMemberExpression(root)) {
//       const key = semanticStaticPropertyKey(root.property, root.computed);
//       if (key === null) dynamic = true;
//       else path.unshift(key);
//       root = unwrapJavaScriptExpression(root.object).node;
//     }
//     if (dynamic && t.isIdentifier(root)) {
//       const binding = resolveSemanticBindingState(this.state, root, root.name);
//       if (binding)
//         this.#mutated.add(
//           this.#exportAliases.get(binding.bindingId) ?? binding.bindingId,
//         );
//       return;
//     }
//     if (t.isIdentifier(root)) this.#addWrite(root, path, value, site);
//   }
//
//   #addWrite(
//     root: t.Identifier,
//     path: readonly string[],
//     value: t.Node,
//     site: t.Node,
//   ): void {
//     const binding = resolveSemanticBindingState(this.state, root, root.name);
//     if (!binding) return;
//     const alias = this.#exportAliases.get(binding.bindingId);
//     if (this.#moduleBindings.has(binding.bindingId) && path[0] !== "exports")
//       return;
//     const key = alias ?? binding.bindingId;
//     const selected = this.#moduleBindings.has(binding.bindingId)
//       ? path.slice(1)
//       : path;
//     if (alias) {
//       const owner = this.#namespaceOwners.get(alias);
//       for (
//         let parent = this.state.parentsByNode.get(site);
//         parent && parent !== owner;
//         parent = this.state.parentsByNode.get(parent)
//       ) {
//         if (
//           t.isFunction(parent) ||
//           t.isIfStatement(parent) ||
//           t.isConditionalExpression(parent) ||
//           t.isLogicalExpression(parent) ||
//           t.isLoop(parent) ||
//           t.isSwitchCase(parent) ||
//           t.isTryStatement(parent)
//         ) {
//           if (selected.length === 0) this.#mutated.add(key);
//           else this.#unsafeExports.add(`${key}:${selected[0] ?? ""}`);
//           return;
//         }
//       }
//     }
//     if (alias && selected.length === 0) {
//       this.#replacements.set(key, value);
//       return;
//     }
//     const writes = this.#writes.get(key) ?? [];
//     writes.push({ path: selected, value, site });
//     this.#writes.set(key, writes);
//   }
// }
export const _l = 263;
