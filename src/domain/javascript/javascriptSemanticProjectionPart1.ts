export const __stub = 1;
// import * as t from "@babel/types";
//
// import type {
//   JavaScriptSemanticBinding,
//   JavaScriptSemanticModuleLink,
//   JavaScriptSemanticReference,
//   JavaScriptSemanticScope,
// } from "./javascriptSemanticIr.js";
// import {
//   resolveSemanticBindingState,
//   semanticResolutionBlocked,
//   type JavaScriptSemanticAnalysisState,
//   type JavaScriptSemanticScopeState,
// } from "./javascriptSemanticState.js";
// import { semanticRequireOrigin } from "./javascriptSemanticRequireOrigin.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import {
//   completeSemanticSteps,
//   traverseJavaScriptAstSteps,
// } from "./javascriptSemanticTraversal.js";
// import {
//   evaluateSemanticBinding,
//   evaluateSemanticProvenance,
// } from "./javascriptSemanticValues.js";
// import { range } from "./javascriptStaticAnalysisHelpers.js";
// import {
//   propertyName,
//   semanticStaticPropertyKey,
//   semanticWrappedWriteSite,
//   semanticWriteSiteReadsFirst,
//   semanticWriteSiteTarget,
//   unwrapJavaScriptExpression,
// } from "./javascriptAstValues.js";
// import {
//   isTypeOnlyExportDeclaration,
//   isTypeOnlyExportSpecifier,
//   isTypeOnlyImportDeclaration,
//   isTypeOnlyImportSpecifier,
//   semanticImportEqualsSpecifier,
// } from "./javascriptModuleDeclaration.js";
// import {
//   commonJsExportName,
//   type CommonJsExportReceiverEffect,
// } from "./javascriptCommonJsExportReceivers.js";
//
// interface CollectCallableInput {
//   readonly node: t.Node;
//   readonly parent: t.Node | null;
//   readonly containerScope: JavaScriptSemanticScopeState;
//   readonly bodyScope: JavaScriptSemanticScopeState | undefined;
//   readonly state: JavaScriptSemanticAnalysisState;
// }
//
// /** Retain callable identity without polluting lexical bindings. */
// export const collectSemanticCallable = (input: CollectCallableInput): void => {
//   const { node, parent, containerScope, bodyScope, state } = input;
//   const kind = callableKind(node);
//   if (kind === undefined) return;
//   const callableId =
//     semanticCallableIdForNode(node) ?? "callable:unknown:-1:-1";
//   state.callables.push({
//     callableId,
//     kind,
//     name: callableName(node, parent),
//     containerScopeId: containerScope.scopeId,
//     bodyScopeId:
//       bodyScope === undefined || !bodyScope.bindingsComplete
//         ? null
//         : bodyScope.scopeId,
//     location: range(node),
//     returnSites: [],
//     returnCoverage: {
//       status: "partial",
//       retainedCount: 0,
//       omittedCount: null,
//     },
//   });
//   state.callableNodesById.set(callableId, node);
// };
//
// /** Collect one static import/export relationship for later composition. */
// export const collectSemanticModuleLink = (
//   node: t.Node,
//   state: JavaScriptSemanticAnalysisState,
//   commonJsReceivers: ReadonlyMap<
//     t.AssignmentExpression,
//     CommonJsExportReceiverEffect
//   >,
// ): void => {
//   if (t.isTSImportEqualsDeclaration(node)) collectImportEquals(node, state);
//   else if (t.isImportDeclaration(node)) collectImports(node, state);
//   else if (t.isExportAllDeclaration(node))
//     addModuleLink(
//       state,
//       {
//         kind: isTypeOnlyExportDeclaration(node) ? "type-import" : "re-export",
//         specifier: node.source.value,
//         importedName: "*",
//         localName: null,
//         exportedName: "*",
//         location: range(node),
//       },
//       node,
//     );
//   else if (t.isExportNamedDeclaration(node)) collectNamedExports(node, state);
//   else if (t.isExportDefaultDeclaration(node))
//     addModuleLink(
//       state,
//       {
//         kind: "export",
//         specifier: null,
//         importedName: null,
//         localName: defaultExportLocalName(node.declaration),
//         exportedName: "default",
//         callableId: semanticCallableIdForNode(node.declaration),
//         location: range(node),
//       },
//       node,
//     );
//   else if (t.isVariableDeclarator(node)) collectRequireLink(node, state);
//   else if (t.isAssignmentExpression(node))
//     collectCommonJsExport(node, state, commonJsReceivers.get(node));
//   else if (t.isCallExpression(node)) collectUnboundRequireLink(node, state);
// };
//
// const collectImportEquals = (
//   node: t.TSImportEqualsDeclaration,
//   state: JavaScriptSemanticAnalysisState,
// ): void => {
//   const moduleReference = node.moduleReference;
//   const specifier =
//     semanticImportEqualsSpecifier(node) ??
//     (node.importKind === "type" &&
//     t.isTSExternalModuleReference(moduleReference) &&
//     t.isStringLiteral(moduleReference.expression)
//       ? moduleReference.expression.value
//       : null);
//   if (specifier === null) return;
//   addModuleLink(
//     state,
//     {
//       kind: node.importKind === "type" ? "type-import" : "require",
//       specifier,
//       importedName: null,
//       localName: node.id.name,
//       exportedName: null,
//       location: range(node),
//     },
//     node,
//   );
// };
//
// /** Collect lexical references after definitions exist, optionally for one name. */
// export const collectSemanticReferences = (
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
//   name?: string,
// ): JavaScriptSemanticReference[] =>
//   completeSemanticSteps(collectSemanticReferencesSteps(program, state, name));
//
// /** Collect lexical references in steps while preserving resolution and visit order. */
// export function* collectSemanticReferencesSteps(
//   program: t.Program,
//   state: JavaScriptSemanticAnalysisState,
//   name?: string,
// ): Generator<void, JavaScriptSemanticReference[]> {
//   const output: JavaScriptSemanticReference[] = [];
//   const seen = new Set<string>();
//   const patterns: t.Node[] = [];
//   yield* traverseJavaScriptAstSteps(program, {
//     enter: (node, parent, readAncestors) => {
//       if (isPatternNode(node)) patterns.push(node);
//       if (
//         !t.isIdentifier(node) ||
//         parent === null ||
//         (name !== undefined && node.name !== name) ||
//         (isNonReferenceKey(node, parent) &&
//           !patterns.some((pattern) => bindsIdentifier(pattern, parent, node)))
//       )
//         return;
//       const ancestors = readAncestors();
//       const role = semanticIdentifierRole(node, parent, ancestors);
//       if (role === null) return;
//       // A compound assignment or update reads before it writes; emit both so
//       // reference consumers see the read they actually execute.
//       const roles =
//         role === "write" &&
//         semanticReadsBeforeWrite(
//           node,
//           semanticWrappedWriteSite(node, parent, ancestors) ?? parent,
//         )
//           ? (["read", "write"] as const)
//           : ([role] as const);
//       for (const resolvedRole of roles) {
//         const key = `${String(node.start)}:${resolvedRole}:${node.name}`;
//         if (seen.has(key)) continue;
//         seen.add(key);
//         const binding = resolveSemanticBindingState(state, node, node.name);
//         const blocked =
//           binding === undefined &&
export const _l = 200;
