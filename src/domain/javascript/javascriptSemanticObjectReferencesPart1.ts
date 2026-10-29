export const __stub = 1;
// import * as t from "@babel/types";
// import {
//   resolveSemanticBindingState,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import { semanticCallableResultExpressions } from "./javascriptSemanticCallableResults.js";
// import { semanticReadInitializers } from "./javascriptSemanticMutationInitializers.js";
// import { semanticReferenceSourcesInactive } from "./javascriptSemanticReferenceSources.js";
// import {
//   semanticStaticPropertyKey,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import {
//   semanticPropertyPathKeyMatches,
//   type JavaScriptSemanticPropertyPath as PropertyPath,
// } from "./javascriptSemanticPropertyPaths.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
//
// export interface JavaScriptSemanticObjectReference {
//   readonly node: t.Node;
//   readonly path: PropertyPath;
//   readonly escapes?: true;
//   /** The allocation owned by this binding, rather than a read of its prior value. */
//   readonly ownerInitializer?: t.Node;
// }
//
// export const semanticClassCandidates = (
//   root: t.Node,
//   state: JavaScriptSemanticAnalysisState,
// ): readonly (t.ClassDeclaration | t.ClassExpression)[] => {
//   const pending: t.Node[] = [root];
//   const seenNodes = new Set<t.Node>();
//   const seenBindings = new Set<string>();
//   const classes: (t.ClassDeclaration | t.ClassExpression)[] = [];
//   for (let cursor = 0; cursor < pending.length; cursor++) {
//     const node = pending[cursor];
//     if (node === undefined) continue;
//     const expression = unwrapJavaScriptExpression(node).node;
//     if (seenNodes.has(expression)) continue;
//     seenNodes.add(expression);
//     if (t.isClass(expression)) {
//       classes.push(expression);
//     } else if (t.isIdentifier(expression)) {
//       const binding = resolveSemanticBindingState(
//         state,
//         expression,
//         expression.name,
//       );
//       if (binding === undefined || seenBindings.has(binding.bindingId))
//         continue;
//       seenBindings.add(binding.bindingId);
//       for (const initializer of binding.initializers)
//         pending.push(initializer.node);
//     } else if (
//       t.isConditionalExpression(expression) ||
//       t.isLogicalExpression(expression)
//     ) {
//       pending.push(
//         t.isConditionalExpression(expression)
//           ? expression.consequent
//           : expression.left,
//         t.isConditionalExpression(expression)
//           ? expression.alternate
//           : expression.right,
//       );
//     } else if (t.isSequenceExpression(expression)) {
//       const last = expression.expressions.at(-1);
//       if (last !== undefined) pending.push(last);
//     }
//   }
//   return classes;
// };
//
// const instanceFieldReferences = (
//   root: t.ClassDeclaration | t.ClassExpression,
//   propertyName: string | null,
//   path: PropertyPath,
//   state: JavaScriptSemanticAnalysisState,
//   initializedBefore?: t.ClassProperty,
// ): {
//   readonly references: readonly JavaScriptSemanticObjectReference[];
//   readonly definiteNames: ReadonlySet<string>;
// } => {
//   const references: JavaScriptSemanticObjectReference[] = [];
//   const pending = [{ klass: root, excluded: new Set<string>() }];
//   const selections = new Map<t.Node, ReadonlySet<string>>();
//   let definiteNames: ReadonlySet<string> | undefined;
//   for (let cursor = 0; cursor < pending.length; cursor++) {
//     const current = pending[cursor];
//     if (current === undefined) continue;
//     const previous = selections.get(current.klass);
//     // A shared base can be reached through different derived classes. Only
//     // exclusions common to those paths can suppress a field in that base.
//     const excluded =
//       previous === undefined
//         ? current.excluded
//         : new Set([...previous].filter((name) => current.excluded.has(name)));
//     if (previous !== undefined && previous.size === excluded.size) continue;
//     selections.set(current.klass, excluded);
//     const shadowed = new Set(excluded);
//     const before =
//       initializedBefore === undefined
//         ? -1
//         : current.klass.body.body.indexOf(initializedBefore);
//     const members =
//       before < 0
//         ? current.klass.body.body
//         : current.klass.body.body.slice(0, before);
//     for (const member of [...members].reverse()) {
//       if (!t.isClassProperty(member) || member.static) continue;
//       const key = semanticStaticPropertyKey(member.key, member.computed);
//       if (key !== null && shadowed.has(key)) continue;
//       if (key !== null) shadowed.add(key);
//       if (
//         (propertyName === null || key === null || key === propertyName) &&
//         member.value != null
//       )
//         references.push({ node: member.value, path });
//     }
//     const bases =
//       current.klass.superClass == null
//         ? []
//         : semanticClassCandidates(current.klass.superClass, state);
//     if (bases.length === 0)
//       definiteNames =
//         definiteNames === undefined
//           ? shadowed
//           : new Set([...definiteNames].filter((name) => shadowed.has(name)));
//     for (const klass of bases) pending.push({ klass, excluded: shadowed });
//   }
//   return { references, definiteNames: definiteNames ?? new Set() };
// };
//
// interface ClassPropertyLookup {
//   readonly owner: t.ClassDeclaration | t.ClassExpression;
//   readonly receiver?: t.ClassDeclaration | t.ClassExpression;
//   readonly kind: "instance" | "static" | "prototype";
//   readonly fieldsOnly?: true;
//   readonly initializedBefore?: t.ClassProperty;
// }
//
// const classPropertyDescriptors = (
//   klass: t.ClassDeclaration | t.ClassExpression,
//   propertyName: string | null,
//   kind: ClassPropertyLookup["kind"],
//   initializedBefore?: t.ClassProperty,
// ) => {
//   const isStatic = kind === "static";
//   const selectedGetters: t.ClassMethod[] = [];
//   const fields: t.ClassProperty[] = [];
//   const indexedMembers: {
//     readonly member: t.ClassMethod | t.ClassProperty;
//     readonly index: number;
//     readonly key: string | null;
//   }[] = [];
//   const before =
//     initializedBefore === undefined
//       ? -1
//       : klass.body.body.indexOf(initializedBefore);
//   klass.body.body.forEach((member, index) => {
//     if (before >= 0 && index >= before && t.isClassProperty(member)) return;
//     if (
//       (t.isClassMethod(member) ||
//         (kind === "static" && t.isClassProperty(member))) &&
//       member.static === isStatic
//     )
//       indexedMembers.push({
//         member,
//         index,
//         key: semanticStaticPropertyKey(member.key, member.computed),
//       });
//   });
//   const matchingMembers =
//     propertyName === null
//       ? []
//       : indexedMembers.filter(({ key }) => key === propertyName);
//   const uncertainGetters = indexedMembers.filter(
//     (entry): entry is typeof entry & { member: t.ClassMethod } => {
//       const { member, key } = entry;
//       return (
//         t.isClassMethod(member) &&
//         member.kind === "get" &&
//         (propertyName === null || (member.computed && key === null))
//       );
//     },
//   );
//   const getters = matchingMembers.filter(
//     (entry): entry is typeof entry & { member: t.ClassMethod } =>
//       t.isClassMethod(entry.member) && entry.member.kind === "get",
//   );
//   const getter = getters.at(-1);
//   const getterIndex = getter?.index ?? -1;
//   const laterDataMember = matchingMembers.some(
//     ({ member, index }) =>
//       t.isClassProperty(member) ||
//       (t.isClassMethod(member) &&
//         member.kind === "method" &&
//         index > getterIndex),
//   );
//   const seenFields = new Set<string>();
//   for (const { member, key } of [...indexedMembers].reverse()) {
//     if (!t.isClassProperty(member)) continue;
//     if (key !== null && seenFields.has(key)) continue;
//     if (key !== null) seenFields.add(key);
//     if (propertyName === null || key === null || key === propertyName)
//       fields.push(member);
//   }
//   if (getters.length > 0 && !laterDataMember && getter !== undefined)
//     selectedGetters.push(getter.member);
//   for (const { member, index } of uncertainGetters)
//     if (
//       !matchingMembers.some(
//         ({ member: matching, index: matchingIndex }) =>
//           (t.isClassProperty(matching) ||
//             (t.isClassMethod(matching) &&
//               (matching.kind === "method" || matching.kind === "get"))) &&
//           matchingIndex > index,
//       )
//     )
//       selectedGetters.push(member);
//   return {
//     getters: selectedGetters,
//     fields,
//     inherits: matchingMembers.length === 0,
//   };
// };
//
// export const semanticClassPropertyReferences = (
//   lookup: ClassPropertyLookup,
//   selection: PropertyPath,
//   state: JavaScriptSemanticAnalysisState,
//   activeGetters: ReadonlyMap<t.Node, number> = new Map(),
// ): readonly JavaScriptSemanticObjectReference[] => {
//   const root = lookup.owner;
//   const receiver = lookup.receiver ?? root;
//   const [key, ...path] = selection;
//   const propertyName =
//     key == null || typeof key === "object" ? null : String(key);
//   const pending: (t.ClassDeclaration | t.ClassExpression)[] = [root];
//   const seen = new Set<t.Node>();
//   const possibleResults: JavaScriptSemanticObjectReference[] = [];
//   // Instance fields are own properties, including fields initialized by base
//   // constructors. They take precedence over every prototype descriptor.
export const _l = 243;
