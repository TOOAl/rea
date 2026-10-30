export const __stub = 1;
// import * as t from "@babel/types";
//
// import {
//   semanticGlobalProcessOrigin,
//   semanticGlobalProcessPathOrigin,
//   semanticOriginalGlobalProcessAt,
//   semanticMutableBuiltinOrigin,
//   semanticRequireExportsIdentity,
//   semanticRequireOrigin,
// } from "./javascriptSemanticRequireOrigin.js";
//
// import {
//   resolveSemanticBindingState,
//   type JavaScriptSemanticBindingState,
//   type JavaScriptSemanticAnalysisState,
// } from "./javascriptSemanticState.js";
// import {
//   clearSemanticValueCaches,
//   evaluateSemanticBinding,
//   // removed unused: evaluateSemanticExpression, (evaluateSemanticExpression)
// } from "./javascriptSemanticValues.js";
// import { semanticContainer } from "./javascriptSemanticSlots.js";
// import {
//   semanticClassCandidates,
//   semanticClassPropertyReferences,
//   semanticObjectPropertyReferences,
//   type JavaScriptSemanticObjectReference,
// } from "./javascriptSemanticObjectReferences.js";
// import { semanticIterationSources } from "./javascriptSemanticIterationSources.js";
// import { semanticCallableResultExpressions } from "./javascriptSemanticCallableResults.js";
// import { createSemanticReturnedReferences } from "./javascriptSemanticReturnedReferences.js";
// import { semanticMutationInitializers } from "./javascriptSemanticMutationInitializers.js";
// import {
//   semanticReferenceSourcesInactive,
//   semanticSelectedReferenceSlot,
// } from "./javascriptSemanticReferenceSources.js";
// import {
//   semanticArrayIndex,
//   SemanticPropertyPathCoverage,
//   semanticPropertyPathKeyMatches,
//   type JavaScriptSemanticPropertyPath,
// } from "./javascriptSemanticPropertyPaths.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import { traverseJavaScriptAstSteps } from "./javascriptSemanticTraversal.js";
// import {
//   semanticStaticPropertyKey,
//   semanticWriteSiteTarget,
//   semanticWriteTargets,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
//
// type PropertyPath = JavaScriptSemanticPropertyPath;
// type ValueEffect = "write" | "escape";
//
// /** Preserve uncertainty from property writes and references exposed to calls, yielding during traversal and fixpoint iteration. */
//
// /** Setter keys of one object literal; a computed setter key may match any key. */
// interface SetterKeys {
//   readonly names: ReadonlySet<string>;
//   readonly computed: boolean;
// }
//
// // Writes to one literal repeat; scan its properties once, including the
// // common result that it defines no setter.
// const setterKeysByObject = new WeakMap<t.ObjectExpression, SetterKeys | null>();
//
// const setterKeys = (object: t.ObjectExpression): SetterKeys | null => {
//   const cached = setterKeysByObject.get(object);
//   if (cached !== undefined) return cached;
//   const names = new Set<string>();
//   let computed = false;
//   // Follow definition order: a later data property or method with the same
//   // static name replaces the accessor, so its setter no longer runs. Spreads
//   // and unknown computed keys may or may not replace it and keep it.
//   for (const property of object.properties) {
//     if (t.isSpreadElement(property)) continue;
//     const name = semanticStaticPropertyKey(property.key, property.computed);
//     if (t.isObjectMethod(property) && property.kind === "set") {
//       if (name === null) computed = true;
//       else names.add(name);
//     } else if (
//       name !== null &&
//       !(t.isObjectMethod(property) && property.kind === "get")
//     )
//       names.delete(name);
//   }
//   const keys = names.size === 0 && !computed ? null : { names, computed };
//   setterKeysByObject.set(object, keys);
//   return keys;
// };
//
// /**
//  * The receiver path whose own object-literal setter an assignment to `path`
//  * runs, following nested literal members from the binding's initializer.
//  */
// const localSetterReceiver = (
//   initializers: readonly {
//     readonly node: t.Node;
//     readonly projection: readonly unknown[];
//   }[],
//   path: readonly unknown[],
// ): readonly string[] | undefined => {
//   const key = path.at(-1);
//   if (typeof key !== "string") return undefined;
//   const receiver = path.slice(0, -1);
//   if (!receiver.every((segment) => typeof segment === "string"))
//     return undefined;
//   for (const { node, projection } of initializers) {
//     if (projection.length !== 0) continue;
//     let object: t.Node | undefined = unwrapJavaScriptExpression(node).node;
//     for (const segment of receiver) {
//       if (!t.isObjectExpression(object)) break;
//       const member: t.ObjectExpression["properties"][number] | undefined =
//         object.properties.findLast(
//           (property) =>
//             t.isObjectProperty(property) &&
//             semanticStaticPropertyKey(property.key, property.computed) ===
//               segment,
//         );
//       object = t.isObjectProperty(member)
//         ? unwrapJavaScriptExpression(member.value).node
//         : undefined;
//     }
//     if (!t.isObjectExpression(object)) continue;
//     const keys = setterKeys(object);
//     if (keys !== null && (keys.computed || keys.names.has(key)))
//       return receiver as readonly string[];
//   }
//   return undefined;
// };
//
// export function* collectSemanticMemberMutationsSteps(
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
// ): Generator<void, void> {
//   const parents = state.parentsByNode;
//   const observablePaths = observableMutationPaths(state);
//   const returnedReferences = createSemanticReturnedReferences(state);
//   const recordedRequiredEffects = new Set<string>();
//   let recordedEffectCount = 0;
//   const recordRequiredEffect = (
//     specifier: string,
//     path: PropertyPath,
//     effect: ValueEffect,
//     node: t.Node | undefined,
//   ): void => {
//     const identity = semanticRequireExportsIdentity(specifier, path);
//     let effectPath = identity.path;
//     // Only known value slots are primitive. Unknown or inherited selections
//     // can expose the container prototype and affect any subsequently read slot.
//     if (
//       effect === "escape" &&
//       identity.specifier === "process" &&
//       effectPath.length === 2 &&
//       (effectPath[0] === "env" || effectPath[0] === "argv")
//     ) {
//       const selected = effectPath[1];
//       if (
//         (typeof selected === "string" || typeof selected === "number") &&
//         (effectPath[0] === "env"
//           ? !Object.hasOwn(Object.prototype, selected)
//           : selected === "length" || semanticArrayIndex(selected) !== null)
//       )
//         return;
//       effectPath = [effectPath[0], null];
//     }
//     const key = JSON.stringify([
//       "required",
//       identity.specifier,
//       effect,
//       effectPath,
//       node?.start,
//       node?.end,
//     ]);
//     if (recordedRequiredEffects.has(key)) return;
//     recordedRequiredEffects.add(key);
//     recordedEffectCount += 1;
//     const effects = state.requiredModuleEffects.get(identity.specifier) ?? [];
//     effects.push({ path: effectPath, node, kind: effect });
//     state.requiredModuleEffects.set(identity.specifier, effects);
//   };
//   // Ambient indexing owns aliases of global objects. Consume its canonical
//   // writes instead of reparsing qualified or aliased process assignments.
//   for (const { path, node } of state.ambientWriteEffects)
//     if (
//       path[0] === "global" &&
//       path[1] === "process" &&
//       path.length > 2 &&
//       node !== undefined &&
//       semanticOriginalGlobalProcessAt(node, state)
//     )
//       recordRequiredEffect("node:process", path.slice(2), "write", node);
//   const selections = new Map<string, readonly string[]>();
//   const coveringPaths = new Map<string, SemanticPropertyPathCoverage>();
//   let arrayIterationUnknown = false;
//   // Definition collection finishes before this phase, so a scope's bindings no
//   // longer change and one node resolves to one binding. Repeated visits of the
//   // same node otherwise repeat the same scope walk.
//   const resolvedBindings = new WeakMap<
//     t.Node,
//     JavaScriptSemanticBindingState | null
//   >();
//   const resolveBinding = (
//     node: t.Node,
//     name: string,
//   ): JavaScriptSemanticBindingState | undefined => {
//     const cached = resolvedBindings.get(node);
//     if (cached !== undefined) return cached ?? undefined;
//     const resolved = resolveSemanticBindingState(state, node, name);
//     resolvedBindings.set(node, resolved ?? null);
//     return resolved;
//   };
//   // One capture tuple recurs across every alias it reaches. Re-encoding it
//   // would rebuild the same long key and force a fresh string hash per lookup.
//   const captureKeys = new WeakMap<
//     JavaScriptSemanticBindingState,
//     Map<string, string>
//   >();
//   const captureKeyOf = (
//     binding: JavaScriptSemanticBindingState,
//     originAt: t.Node | undefined,
//     ownerInitializer: t.Node | undefined,
//   ): string => {
//     let byPosition = captureKeys.get(binding);
//     if (byPosition === undefined) {
//       byPosition = new Map();
//       captureKeys.set(binding, byPosition);
//     }
//     const positionKey = `${originAt?.start ?? "u"}:${originAt?.end ?? "u"}:${
//       ownerInitializer?.start ?? "u"
//     }:${ownerInitializer?.end ?? "u"}`;
//     const cached = byPosition.get(positionKey);
//     if (cached !== undefined) return cached;
//     const created = JSON.stringify([
//       binding.bindingId,
//       originAt?.start,
//       originAt?.end,
//       ownerInitializer?.start,
//       ownerInitializer?.end,
//     ]);
//     byPosition.set(positionKey, created);
//     return created;
//   };
//   // A capture key already ends the array; a path stays one nested element.
//   const lifetimeKey = (captureKey: string, path: PropertyPath): string =>
//     `${captureKey.slice(0, -1)},${JSON.stringify(path)}]`;
//   const pendingReferences: {
//     readonly initializer: JavaScriptSemanticBindingState["referenceInitializers"][number];
//     readonly path: PropertyPath;
//     readonly bindings: ReadonlySet<string>;
//     readonly effect: ValueEffect;
//     readonly mutation?: t.Node;
//     readonly originAt: t.Node | undefined;
//   }[] = [];
//   const iterableReferences: IterableReference[] = [];
//   const iterableReferenceKeys = new WeakMap<t.Node, Set<string>>();
//   const deferIterable = (reference: IterableReference): void => {
//     const keys = iterableReferenceKeys.get(reference.node) ?? new Set<string>();
//     const key = JSON.stringify([
//       reference.projection,
//       reference.path,
//       reference.fallbackPath,
//       reference.effect,
//       reference.mutation?.start,
//       reference.mutation?.end,
//       reference.originAt?.start,
//       reference.originAt?.end,
//       reference.iterationOnly,
//       reference.requiredSources?.map((source) => [
//         source.node.start,
//         source.node.end,
//         source.projection,
//       ]),
//       reference.fallbackSources?.map((source) => [
//         source.node.start,
//         source.node.end,
//         source.projection,
//       ]),
//       [...reference.bindings].sort(compareUnicodeCodePoints),
//     ]);
//     if (keys.has(key)) return;
//     keys.add(key);
//     iterableReferenceKeys.set(reference.node, keys);
//     iterableReferences.push(reference);
//   };
//   const markValue = (
//     node: t.Node,
//     path: PropertyPath,
//     bindings: ReadonlySet<string>,
//     effect: ValueEffect = "write",
//     mutation?: t.Node,
//     originAt: t.Node | undefined = mutation,
//     ownerInitializer?: t.Node,
//   ): void => {
//     const pending: (ReferencedValue & {
//       readonly bindings: ReadonlySet<string>;
//       readonly originAt: t.Node | undefined;
//     })[] = [
//       {
//         node,
//         path,
//         bindings,
//         originAt,
//         ...(ownerInitializer === undefined ? {} : { ownerInitializer }),
//       },
//     ];
//     // Visit shallower alias traversals first so their exact prefixes suppress
//     // longer loop paths before those paths enumerate every assignment order.
//     for (let cursor = 0; cursor < pending.length; cursor++) {
//       const current = pending[cursor];
//       if (current === undefined) break;
//       const expression = unwrapJavaScriptExpression(current.node).node;
//       const required = semanticRequireOrigin(expression, state);
//       if (required !== undefined) {
//         recordRequiredEffect(
//           required.origin.specifier,
//           [...required.origin.importedPath, ...current.path],
//           effect,
//           mutation,
//         );
//         continue;
//       }
//       const globalProcess = semanticGlobalProcessPathOrigin(expression, state);
//       if (globalProcess !== undefined) {
//         recordRequiredEffect(
//           globalProcess.specifier,
//           [...globalProcess.importedPath, ...current.path],
//           effect,
//           mutation,
//         );
//         continue;
//       }
//       if (t.isIdentifier(expression)) {
//         const binding = resolveBinding(expression, expression.name);
//         if (binding === undefined) {
//           const processOrigin = semanticGlobalProcessOrigin(expression, state);
//           if (processOrigin !== undefined)
//             recordRequiredEffect(
//               processOrigin.specifier,
//               current.path,
//               effect,
export const _l = 341;
