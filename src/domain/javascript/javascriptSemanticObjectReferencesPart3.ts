export const __stub = 1;
//     readonly parent: AliasVisit | undefined;
//   }
//   const pending: {
//     readonly node: t.Node;
//     readonly path: PropertyPath;
//     readonly aliases: AliasVisit | undefined;
//     readonly escapes?: true;
//     readonly privateRead?: {
//       readonly node: t.MemberExpression | t.OptionalMemberExpression;
//       readonly name: string;
//       readonly path: PropertyPath;
//     };
//   }[] = semanticCallableResultExpressions(getter).flatMap(({ node }) =>
//     node === null ? [] : [{ node, path, aliases: undefined }],
//   );
//   const references: JavaScriptSemanticObjectReference[] = [];
//   const expandedAliases = new Map<string, Set<string>>();
//   const getterScope = state.scopeByNode.get(getter)?.scopeId;
//   for (let cursor = 0; cursor < pending.length; cursor++) {
//     const current = pending[cursor];
//     if (current === undefined) break;
//     const { path: remaining } = current;
//     const expression = unwrapJavaScriptExpression(current.node).node;
//     const retain = (reference: JavaScriptSemanticObjectReference): void => {
//       references.push(
//         current.escapes ? { ...reference, escapes: true } : reference,
//       );
//     };
//     const retainPrivateRead = (): void => {
//       if (current.privateRead !== undefined)
//         retain({
//           node: current.privateRead.node,
//           path: current.escapes ? [] : current.privateRead.path,
//         });
//     };
//     if (t.isIdentifier(expression)) {
//       const binding = resolveSemanticBindingState(
//         state,
//         expression,
//         expression.name,
//       );
//       let scope =
//         binding === undefined
//           ? undefined
//           : state.scopesById.get(binding.scopeId);
//       while (scope !== undefined && scope.scopeId !== getterScope) {
//         if (scope.kind === "function" || scope.parentScopeId === null) {
//           scope = undefined;
//           break;
//         }
//         scope = state.scopesById.get(scope.parentScopeId);
//       }
//       if (
//         binding !== undefined &&
//         scope !== undefined &&
//         binding.referenceInitializers.every(
//           (initializer) => initializer.copyKind === undefined,
//         )
//       ) {
//         const identity = JSON.stringify([
//           binding.bindingId,
//           expression.start,
//           expression.end,
//         ]);
//         const known = expandedAliases.get(identity);
//         const key = JSON.stringify([
//           remaining,
//           current.privateRead?.name,
//           current.privateRead?.path,
//           current.escapes,
//         ]);
//         let cyclic = false;
//         let growing = false;
//         if (known !== undefined)
//           for (
//             let visit = current.aliases;
//             visit !== undefined;
//             visit = visit.parent
//           )
//             if (visit.identity === identity) {
//               cyclic = true;
//               growing = remaining.length > visit.pathLength;
//               break;
//             }
//         if (cyclic) {
//           // A repeated alias can select arbitrarily deep children. Revisit its
//           // roots as escapes rather than enumerating iterations or dropping them.
//           if (growing && !current.escapes)
//             pending.push({
//               ...current,
//               path: [],
//               aliases: undefined,
//               escapes: true,
//             });
//           continue;
//         }
//         if (known?.has(key)) continue;
//         const selections = known ?? new Set<string>();
//         selections.add(key);
//         expandedAliases.set(identity, selections);
//         const aliases = {
//           identity,
//           pathLength: remaining.length,
//           parent: current.aliases,
//         };
//         const origins = semanticReadInitializers(
//           binding,
//           expression,
//           state.parentsByNode,
//         );
//         for (const initializer of [
//           ...origins.initializers,
//           ...origins.referenceInitializers.filter(
//             (initializer) =>
//               !semanticReferenceSourcesInactive(initializer, state),
//           ),
//         ])
//           pending.push({
//             ...current,
//             node: initializer.node,
//             path: [...initializer.projection, ...remaining],
//             aliases,
//           });
//         continue;
//       }
//     }
//     if (t.isThisExpression(expression)) {
//       // An outer binding or a nested ordinary function has a different receiver.
//       let ownerNode = state.parentsByNode.get(expression);
//       while (
//         ownerNode !== undefined &&
//         !t.isClass(ownerNode) &&
//         !(t.isFunction(ownerNode) && !t.isArrowFunctionExpression(ownerNode))
//       )
//         ownerNode = state.parentsByNode.get(ownerNode);
//       if (ownerNode !== getter) continue;
//       if (current.privateRead !== undefined && t.isClass(owner)) {
//         if (
//           !t.isClass(receiver) ||
//           !privateReceiverProjection(
//             receiver,
//             owner,
//             remaining,
//             isStatic,
//             state,
//           )
//         ) {
//           retainPrivateRead();
//           continue;
//         }
//         for (const member of owner.body.body)
//           if (
//             t.isClassPrivateProperty(member) &&
//             member.static === isStatic &&
//             member.key.id.name === current.privateRead.name &&
//             member.value != null
//           )
//             retain({
//               node: member.value,
//               path: current.escapes ? [] : current.privateRead.path,
//             });
//         continue;
//       }
//       for (const reference of t.isClass(receiver)
//         ? semanticClassPropertyReferences(
//             { owner: receiver, kind: isStatic ? "static" : "instance" },
//             remaining,
//             state,
//             active,
//           )
//         : objectReceiverReference(receiver, remaining, state))
//         retain(reference);
//       continue;
//     }
//     if (
//       t.isMemberExpression(expression) ||
//       t.isOptionalMemberExpression(expression)
//     ) {
//       if (
//         current.privateRead !== undefined &&
//         t.isPrivateName(expression.property)
//       ) {
//         retainPrivateRead();
//         continue;
//       }
//       if (t.isPrivateName(expression.property) && t.isClass(owner)) {
//         pending.push({
//           ...current,
//           node: expression.object,
//           path: [],
//           privateRead: {
//             node: expression,
//             name: expression.property.id.name,
//             path: remaining,
//           },
//         });
//         continue;
//       }
//       const key = semanticStaticPropertyKey(
//         expression.property,
//         expression.computed,
//       );
//       if (
//         t.isSuper(expression.object) &&
//         t.isClass(owner) &&
//         owner.superClass != null
//       ) {
//         for (const base of semanticClassCandidates(owner.superClass, state))
//           for (const reference of semanticClassPropertyReferences(
//             {
//               owner: base,
//               receiver: t.isClass(receiver) ? receiver : owner,
//               kind: isStatic ? "static" : "prototype",
//             },
//             [key, ...remaining],
//             state,
//             active,
//           ))
//             retain(reference);
//         continue;
//       }
//       pending.push({
//         ...current,
//         node: expression.object,
//         path: [key, ...remaining],
//       });
//     } else if (t.isConditionalExpression(expression))
//       pending.push(
//         { ...current, node: expression.consequent },
//         { ...current, node: expression.alternate },
//       );
//     else if (t.isLogicalExpression(expression))
//       pending.push(
//         { ...current, node: expression.left },
//         { ...current, node: expression.right },
//       );
//     else if (t.isSequenceExpression(expression)) {
//       const last = expression.expressions.at(-1);
//       if (last !== undefined) pending.push({ ...current, node: last });
//     } else if (t.isAssignmentExpression(expression, { operator: "=" }))
//       pending.push({ ...current, node: expression.right });
//     else if (
//       t.isAssignmentExpression(expression) &&
export const _l = 243;
