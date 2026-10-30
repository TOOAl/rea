export const __stub = 1;
//   let instanceFields: ReadonlySet<string> = new Set();
//   if (lookup.kind === "instance") {
//     const fields = instanceFieldReferences(
//       root,
//       propertyName,
//       path,
//       state,
//       lookup.initializedBefore,
//     );
//     possibleResults.push(...fields.references);
//     instanceFields = fields.definiteNames;
//     if (propertyName !== null && instanceFields.has(propertyName))
//       return possibleResults;
//   }
//   for (let cursor = 0; cursor < pending.length; cursor++) {
//     const klass = pending[cursor];
//     if (klass === undefined || seen.has(klass)) continue;
//     seen.add(klass);
//     const descriptors = classPropertyDescriptors(
//       klass,
//       propertyName,
//       lookup.kind,
//       lookup.initializedBefore,
//     );
//     for (const field of descriptors.fields)
//       if (field.value != null)
//         possibleResults.push({ node: field.value, path });
//     for (const getter of lookup.fieldsOnly ? [] : descriptors.getters) {
//       const key = semanticStaticPropertyKey(getter.key, getter.computed);
//       if (key !== null && instanceFields.has(key)) continue;
//       possibleResults.push(
//         ...getterResultReferences(
//           { getter, owner: klass, receiver },
//           path,
//           state,
//           activeGetters,
//         ),
//       );
//     }
//     // An exact own descriptor suppresses inherited lookup. Dynamic computed
//     // descriptors may or may not match, so retain possible superclass results.
//     if (
//       descriptors.inherits &&
//       klass.superClass !== null &&
//       klass.superClass !== undefined
//     )
//       pending.push(...semanticClassCandidates(klass.superClass, state));
//   }
//   return possibleResults;
// };
//
// const objectReceiverReference = (
//   object: t.ObjectExpression,
//   path: PropertyPath,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly JavaScriptSemanticObjectReference[] => {
//   // A literal's enclosing binding owns its slots. Returning the literal
//   // itself would bypass invalidation of that binding's observed properties.
//   let current: t.Node = object;
//   const projection: PropertyPath[number][] = [];
//   while (true) {
//     const parent = state.parentsByNode.get(current);
//     if (
//       t.isVariableDeclarator(parent) &&
//       parent.init === current &&
//       t.isIdentifier(parent.id)
//     )
//       return [
//         {
//           node: parent.id,
//           path: [...projection, ...path],
//           ownerInitializer: current,
//         },
//       ];
//     if (
//       t.isAssignmentExpression(parent, { operator: "=" }) &&
//       parent.right === current &&
//       t.isIdentifier(parent.left)
//     )
//       return [
//         {
//           node: parent.left,
//           path: [...projection, ...path],
//           ownerInitializer: current,
//         },
//       ];
//     if (t.isArrayExpression(parent)) {
//       let minimumIndex = 0;
//       let uncertainIndex = false;
//       for (const element of parent.elements) {
//         if (element === current) break;
//         if (t.isSpreadElement(element)) uncertainIndex = true;
//         else minimumIndex++;
//       }
//       // A spread contributes an unknown number of slots. Retain the known
//       // prefix without treating the element's syntax position as its index.
//       projection.unshift(
//         uncertainIndex
//           ? { excludedKeys: [], startIndex: minimumIndex }
//           : minimumIndex,
//       );
//       current = parent;
//       continue;
//     }
//     if (t.isObjectProperty(parent) && parent.value === current) {
//       projection.unshift(
//         semanticStaticPropertyKey(parent.key, parent.computed),
//       );
//       const container = state.parentsByNode.get(parent);
//       if (t.isObjectExpression(container)) {
//         current = container;
//         continue;
//       }
//     }
//     break;
//   }
//   return [{ node: object, path }];
// };
//
// // Getter return expressions use the receiver of the property read. Keep that
// // identity when translating `this`, private fields, and superclass reads into
// // the same reference paths used by ordinary member mutations.
// interface GetterInvocation {
//   readonly getter: t.ObjectMethod | t.ClassMethod;
//   readonly owner: t.ObjectExpression | t.ClassDeclaration | t.ClassExpression;
//   readonly receiver?:
//     | t.ObjectExpression
//     | t.ClassDeclaration
//     | t.ClassExpression;
// }
//
// /** Follow only data fields whose initializers retain a class receiver. */
// const privateReceiverProjection = (
//   receiver: t.ClassDeclaration | t.ClassExpression,
//   owner: t.ClassDeclaration | t.ClassExpression,
//   path: PropertyPath,
//   isStatic: boolean,
//   state: JavaScriptSemanticAnalysisState,
// ): boolean => {
//   if (path.some((key) => key === null || typeof key === "object")) return false;
//   type Selection = { readonly key: string; readonly before?: t.ClassProperty };
//   const pending: {
//     receiver: typeof receiver;
//     path: readonly Selection[];
//     visits: ReadonlyMap<string, number>;
//   }[] = [
//     {
//       receiver,
//       path: path.map((key) => ({ key: String(key) })),
//       visits: new Map(),
//     },
//   ];
//   const seen = new Set<string>();
//   const declaringClass = (field: t.ClassProperty) => {
//     const body = state.parentsByNode.get(field);
//     return body === undefined ? undefined : state.parentsByNode.get(body);
//   };
//   for (let cursor = 0; cursor < pending.length; cursor++) {
//     const current = pending[cursor];
//     if (current === undefined) break;
//     const [selection, ...remaining] = current.path;
//     if (selection === undefined) {
//       if (!isStatic || current.receiver === owner) return true;
//       continue;
//     }
//     const origin = JSON.stringify([
//       current.receiver.start,
//       selection.key,
//       selection.before?.start,
//     ]);
//     const previous = current.visits.get(origin);
//     // Repeated fields may consume a finite getter path. An initializer cycle
//     // that preserves or grows it cannot establish another receiver identity.
//     if (previous !== undefined && previous <= current.path.length) continue;
//     const visits = new Map(current.visits).set(origin, current.path.length);
//     const identity = JSON.stringify([
//       current.receiver.start,
//       current.path.map(({ key, before }) => [key, before?.start]),
//     ]);
//     if (seen.has(identity)) continue;
//     seen.add(identity);
//     const lookupOwner =
//       selection.before === undefined
//         ? current.receiver
//         : declaringClass(selection.before);
//     if (!t.isClass(lookupOwner)) continue;
//     for (const reference of semanticClassPropertyReferences(
//       {
//         owner: lookupOwner,
//         receiver: current.receiver,
//         kind: isStatic ? "static" : "instance",
//         fieldsOnly: true,
//         ...(selection.before === undefined
//           ? {}
//           : { initializedBefore: selection.before }),
//       },
//       [selection.key],
//       state,
//     )) {
//       const field = state.parentsByNode.get(reference.node);
//       if (!t.isClassProperty(field)) continue;
//       const fieldOwner = declaringClass(field);
//       if (!t.isClass(fieldOwner)) continue;
//       const projection: Selection[] = [];
//       let value = unwrapJavaScriptExpression(reference.node).node;
//       while (
//         t.isMemberExpression(value) ||
//         t.isOptionalMemberExpression(value)
//       ) {
//         const key = semanticStaticPropertyKey(value.property, value.computed);
//         if (key === null || t.isPrivateName(value.property)) break;
//         projection.unshift({ key, before: field });
//         value = unwrapJavaScriptExpression(value.object).node;
//       }
//       if (!t.isThisExpression(value)) continue;
//       // Instance fields retain the actual instance. Static field `this` belongs
//       // to its declaring class, even when a subclass inherits the field.
//       pending.push({
//         receiver: isStatic ? fieldOwner : current.receiver,
//         path: [...projection, ...remaining],
//         visits,
//       });
//     }
//   }
//   return false;
// };
//
// const getterResultReferences = (
//   invocation: GetterInvocation,
//   path: PropertyPath,
//   state: JavaScriptSemanticAnalysisState,
//   activeGetters: ReadonlyMap<t.Node, number> = new Map(),
// ): readonly JavaScriptSemanticObjectReference[] => {
//   const { getter, owner, receiver = owner } = invocation;
//   const previousLength = activeGetters.get(getter);
//   if (previousLength !== undefined && previousLength <= path.length) return [];
//   // Repeated receiver reads may revisit a getter while consuming a finite
//   // path; recursive getters that preserve or grow that path cannot progress.
//   const active = new Map(activeGetters).set(getter, path.length);
//   const isStatic = t.isClassMethod(getter) && getter.static;
//   interface AliasVisit {
//     readonly identity: string;
//     readonly pathLength: number;
export const _l = 243;
