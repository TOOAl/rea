export const __stub = 1;
// import * as t from "@babel/types";
// import { collectSemanticCallable } from "./javascriptSemanticProjection.js";
// import {
//   semanticObjectPatternKeys,
//   runtimeFunctionParameters,
//   semanticStaticPropertyKey,
//   semanticWriteTargets,
// } from "./javascriptAstValues.js";
// import type {
//   JavaScriptSemanticAnalysisState,
//   JavaScriptSemanticScopeState,
// } from "./javascriptSemanticState.js";
// import {
//   currentSemanticScope,
//   resolveSemanticBindingFromScope,
//   semanticBindingId,
//   semanticScopeId,
//   semanticVariableScope,
// } from "./javascriptSemanticState.js";
// import { traverseJavaScriptAstSteps } from "./javascriptSemanticTraversal.js";
// import { semanticImportEqualsSpecifier } from "./javascriptModuleDeclaration.js";
// import { range } from "./javascriptStaticAnalysisHelpers.js";
// import { SemanticPropertyPathCoverage } from "./javascriptSemanticPropertyPaths.js";
//
// interface BindPatternInput {
//   readonly pattern: t.Node;
//   readonly initializer: t.Node | null;
//   readonly scope: JavaScriptSemanticScopeState;
//   readonly state: JavaScriptSemanticAnalysisState;
//   readonly mutable: boolean;
//   readonly declarationKind?: "var" | "let" | "const" | "using" | "await using";
//   readonly kind?: import("./javascriptSemanticIr.js").JavaScriptSemanticDefinition["kind"];
//   readonly projection?: readonly (string | number | null)[];
//   readonly referenceOnly?: boolean;
//   readonly copyKind?: "object-rest" | "array-rest";
//   readonly copyProjectionOffset?: number;
//   readonly copyExcludedKeys?: readonly string[];
//   readonly copyStartIndex?: number;
//   readonly fallbackSources?: readonly {
//     readonly node: t.Node;
//     readonly projection: readonly (string | number | null)[];
//   }[];
//   readonly requiredSources?: readonly {
//     readonly node: t.Node;
//     readonly projection: readonly (string | number | null)[];
//   }[];
// }
// interface AddBindingInput {
//   readonly state: JavaScriptSemanticAnalysisState;
//   readonly scope: JavaScriptSemanticScopeState;
//   readonly name: string;
//   readonly kind: import("./javascriptSemanticIr.js").JavaScriptSemanticDefinition["kind"];
//   readonly mutable: boolean;
//   readonly declarationKind?: "var" | "let" | "const" | "using" | "await using";
//   readonly definitionNode: t.Node;
//   readonly initializer: t.Node | null;
//   readonly directOrigin?: import("./javascriptSemanticIr.js").JavaScriptModuleOrigin;
//   readonly runtimeImport?: boolean;
//   readonly projection?: readonly (string | number | null)[];
// }
// export const createState = (
//   program: t.Program,
//   staticImportResolutionMode: import("./javascriptModuleResolutionMode.js").JavaScriptModuleResolutionMode = "import",
// ): JavaScriptSemanticAnalysisState => {
//   const root: JavaScriptSemanticScopeState = {
//     scopeId: semanticScopeId("program", program),
//     parentScopeId: null,
//     kind: "program",
//     location: range(program),
//     bindingsComplete: true,
//     bindings: new Map(),
//   };
//   return {
//     program,
//     staticImportResolutionMode,
//     valueResourceLimits: new Set(),
//     parentsByNode: new WeakMap(),
//     scopes: [root],
//     scopesById: new Map([[root.scopeId, root]]),
//     scopeByNode: new WeakMap([[program, root]]),
//     bindingsById: new Map(),
//     callables: [],
//     callableNodesById: new Map(),
//     moduleLinks: [],
//     linkedRequireCalls: new WeakSet(),
//     moduleLinkBindings: new WeakMap(),
//     defaultExportExpressions: new WeakMap(),
//     conditionallySkippedExpressions: new WeakSet(),
//     requiredModuleEffects: new Map(),
//     ambientBindingWrites: new Map(),
//     ambientWrites: new SemanticPropertyPathCoverage(),
//     ambientWriteEffects: [],
//   };
// };
// export function* collectDefinitionsSteps(
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
// ): Generator<void, void> {
//   const stack: JavaScriptSemanticScopeState[] = [
//     currentSemanticScope(state.scopes),
//   ];
//   const openedScopes = new WeakMap<t.Node, number>();
//   const assignments: {
//     readonly node: t.Node;
//     readonly scope: JavaScriptSemanticScopeState;
//     readonly conditionallySkipped: boolean;
//   }[] = [];
//   const functionBodies: {
//     readonly body: t.BlockStatement;
//     readonly scope: JavaScriptSemanticScopeState;
//     readonly parameters: t.Function["params"];
//   }[] = [];
//   yield* traverseJavaScriptAstSteps(program, {
//     enter: (node, parent, readAncestors) => {
//       if (parent !== null) state.parentsByNode.set(node, parent);
//       let parentScope = currentSemanticScope(stack);
//       if (
//         parent !== null &&
//         (t.isObjectMethod(parent) || t.isClassMethod(parent)) &&
//         parent.computed &&
//         parent.key === node &&
//         parentScope.parentScopeId !== null
//       ) {
//         const keyScope = state.scopesById.get(parentScope.parentScopeId);
//         if (keyScope !== undefined) {
//           stack.push(keyScope);
//           openedScopes.set(node, 1);
//           parentScope = keyScope;
//         }
//       }
//       if (
//         parent !== null &&
//         t.isWithStatement(parent) &&
//         parent.body === node
//       ) {
//         const dynamicScope: JavaScriptSemanticScopeState = {
//           scopeId: `${semanticScopeId("block", parent)}:with`,
//           parentScopeId: parentScope.scopeId,
//           kind: "block",
//           location: range(parent),
//           bindingsComplete: false,
//           bindings: new Map(),
//         };
//         state.scopes.push(dynamicScope);
//         state.scopesById.set(dynamicScope.scopeId, dynamicScope);
//         stack.push(dynamicScope);
//         openedScopes.set(node, 1);
//         parentScope = dynamicScope;
//       }
//       bindOuterDeclaration(node, parentScope, state);
//       const nested = nestedScope(node, parent, parentScope, state);
//       if (nested !== undefined) {
//         stack.push(nested);
//         openedScopes.set(node, (openedScopes.get(node) ?? 0) + 1);
//         if (t.isBlockStatement(node) && t.isFunction(parent))
//           functionBodies.push({
//             body: node,
//             scope: nested,
//             parameters: runtimeFunctionParameters(parent),
//           });
//       }
//       const scope = currentSemanticScope(stack);
//       if (parent === null || openedScopes.has(node))
//         state.scopeByNode.set(node, scope);
//       collectSemanticCallable({
//         node,
//         parent,
//         containerScope: parentScope,
//         bodyScope: nested,
//         state,
//       });
//       bindInnerDeclaration(node, parent, scope, state);
//       if (
//         t.isVariableDeclarator(node) &&
//         node.init != null &&
//         parent !== null &&
//         t.isVariableDeclaration(parent, { kind: "var" }) &&
//         writeMayBeSkipped(node, readAncestors())
//       )
//         state.conditionallySkippedExpressions.add(node.init);
//       if (
//         t.isAssignmentExpression(node) ||
//         t.isUpdateExpression(node) ||
//         t.isForOfStatement(node) ||
//         t.isForInStatement(node)
//       )
//         assignments.push({
//           node,
//           scope,
//           conditionallySkipped:
//             t.isForOfStatement(node) ||
//             t.isForInStatement(node) ||
//             writeMayBeSkipped(node, readAncestors()),
//         });
//     },
//     exit: (node) => {
//       for (let count = openedScopes.get(node) ?? 0; count > 0; count--)
//         stack.pop();
//     },
//   });
//   for (const [
//     index,
//     { node, scope, conditionallySkipped },
//   ] of assignments.entries()) {
//     if (index % 64 === 0) yield;
//     bindAssignment(node, scope, state, conditionallySkipped);
//   }
//   for (const [index, { body, scope, parameters }] of functionBodies.entries()) {
//     if (index % 64 === 0) yield;
//     for (const parameter of parameters)
export const _l = 210;
