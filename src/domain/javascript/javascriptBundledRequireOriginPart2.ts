import * as t from "@babel/types";

import { javascriptBootstrapAt } from "./javascriptBootstrap.js";
import { proveJavaScriptBootstrapIntegrity } from "./javascriptBootstrapIntegrity.js";
import { semanticStaticPropertyKey } from "./javascriptAstValues.js";
import { semanticRequireOrigin } from "./javascriptSemanticRequireOrigin.js";
import {
  resolveSemanticBindingState,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";
import {
  moduleFactory,
  modulePropertyName,
} from "./javascriptStaticAnalysisHelpers.js";
import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";

/** Loader bindings and literal externals proven for one standalone bootstrap. */

const isInstalledBeforeEntryDispatch = (
  write: t.AssignmentExpression,
  body: t.BlockStatement,
  loaderBindingIds: ReadonlySet<string>,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  const statement = state.parentsByNode.get(write);
  if (!t.isExpressionStatement(statement)) return false;
  const writeIndex = body.body.indexOf(statement);
  if (writeIndex < 0) return false;
  let entryIndex = -1;
  for (let index = 0; index < body.body.length; index += 1) {
    const topLevel = body.body[index];
    if (topLevel === undefined) continue;
    traverseJavaScriptAst(topLevel, {
      enter: (node, _parent, ancestors) => {
        if (
          entryIndex < 0 &&
          t.isCallExpression(node) &&
          t.isIdentifier(node.callee) &&
          ancestors().every((ancestor) => !t.isFunction(ancestor)) &&
          loaderBindingIds.has(
            resolveSemanticBindingState(state, node.callee, node.callee.name)
              ?.bindingId ?? "",
          )
        )
          entryIndex = index;
      },
    });
    if (entryIndex >= 0) break;
  }
  return entryIndex > writeIndex;
};

const bootstrapProofForLoaderCall = (
  call: t.CallExpression,
  loaderBindingId: string,
  state: JavaScriptSemanticAnalysisState,
): BootstrapExternals | undefined => {
  for (
    let ancestor = state.parentsByNode.get(call);
    ancestor !== undefined;
    ancestor = state.parentsByNode.get(ancestor)
  ) {
    if (!t.isCallExpression(ancestor)) continue;
    const proof = bootstrapExternals(ancestor, state);
    if (proof?.loaderBindingIds.has(loaderBindingId)) return proof;
  }
  return undefined;
};

const sameBinding = (
  node: t.Node,
  bindingId: string,
  state: JavaScriptSemanticAnalysisState,
): boolean =>
  t.isIdentifier(node) &&
  resolveSemanticBindingState(state, node, node.name)?.bindingId === bindingId;

const getterReturnsDefault = (
  node: t.Node,
  bindingId: string,
  state: JavaScriptSemanticAnalysisState,
): boolean =>
  t.isArrowFunctionExpression(node) &&
  node.params.length === 0 &&
  t.isMemberExpression(node.body) &&
  semanticStaticPropertyKey(node.body.property, node.body.computed) ===
    "default" &&
  sameBinding(node.body.object, bindingId, state);

const getterReturnsModule = (
  node: t.Node,
  bindingId: string,
  state: JavaScriptSemanticAnalysisState,
): boolean =>
  t.isArrowFunctionExpression(node) &&
  node.params.length === 0 &&
  sameBinding(node.body, bindingId, state);

const bootstrapExternals = (
  call: t.CallExpression,
  state: JavaScriptSemanticAnalysisState,
): BootstrapExternals | null => {
  let byCall = proofs.get(state);
  if (byCall === undefined) {
    byCall = new WeakMap();
    proofs.set(state, byCall);
  }
  const cached = byCall.get(call);
  if (cached !== undefined) return cached;
  const proof = proveBootstrapExternals(call, state);
  byCall.set(call, proof);
  return proof;
};

const proveBootstrapExternals = (
  call: t.CallExpression,
  state: JavaScriptSemanticAnalysisState,
): BootstrapExternals | null => {
  const bootstrap = javascriptBootstrapAt(call, state);
  // A replaced loader no longer dispatches the declared table.
  if (
    bootstrap === undefined ||
    !singleDefinition(state, bootstrap.loaderBindingId, "function")
  )
    return null;
  const loaderBindingIds = new Set([bootstrap.loaderBindingId]);
  const factories = bootstrap.table.properties.flatMap((property) => {
    const factory = moduleFactory(property);
    return factory === undefined ? [] : [{ property, factory }];
  });
  for (const { factory } of factories) {
    // The bootstrap proves `table[key](module, module.exports, loader)`.
    const loaderParameter = factory.params[2];
    const bindingId = t.isIdentifier(loaderParameter)
      ? resolveSemanticBindingState(
          state,
          loaderParameter,
          loaderParameter.name,
        )?.bindingId
      : undefined;
    if (
      bindingId !== undefined &&
      singleDefinition(state, bindingId, "parameter")
    )
      loaderBindingIds.add(bindingId);
  }
  const integrity = proveJavaScriptBootstrapIntegrity(
    call,
    bootstrap,
    loaderBindingIds,
    state,
  );
  if (integrity === undefined) return null;
  const externals = new Map<string, string | null>();
  for (const { property, factory } of factories) {
    const key = modulePropertyName(property);
    const specifier = integrity.replacedKeys.has(key)
      ? undefined
      : externalSpecifier(factory, state);
    if (externals.has(key)) externals.set(key, null);
    else externals.set(key, specifier ?? null);
  }
  return {
    loaderBindingIds,
    interopGetterBindingIds: canonicalWebpackInteropBindings(
      loaderBindingIds,
      bootstrap.body,
      state,
    ),
    externals,
  };
};

/**
 * Accept only `module.exports = require("specifier")` as the whole body of an
 * ordinary factory; generator, async and accessor factories do not run it.
 */
const externalSpecifier = (
  factory: t.FunctionExpression | t.ArrowFunctionExpression | t.ObjectMethod,
  state: JavaScriptSemanticAnalysisState,
): string | undefined => {
  const moduleParameter = factory.params[0];
  const names = factory.params.map((parameter) =>
    t.isIdentifier(parameter) ? parameter.name : null,
  );
  if (
    !t.isIdentifier(moduleParameter) ||
    // A duplicated name binds the later argument, not the module object.
    new Set(names).size !== names.length ||
    factory.generator ||
    factory.async ||
    (t.isObjectMethod(factory) && factory.kind !== "method")
  )
    return undefined;
  let expression: t.Node | undefined;
  if (t.isBlockStatement(factory.body)) {
    const [statement] = factory.body.body;
    if (factory.body.body.length !== 1 || !t.isExpressionStatement(statement))
      return undefined;
    expression = statement.expression;
  } else expression = factory.body;
  if (
    !t.isAssignmentExpression(expression, { operator: "=" }) ||
    !t.isMemberExpression(expression.left) ||
    !t.isIdentifier(expression.left.object) ||
    semanticStaticPropertyKey(
      expression.left.property,
      expression.left.computed,
    ) !== "exports"
  )
    return undefined;
  const moduleBinding = resolveSemanticBindingState(
    state,
    moduleParameter,
    moduleParameter.name,
  );
  const target = resolveSemanticBindingState(
    state,
    expression.left.object,
    expression.left.object.name,
  );
  if (
    moduleBinding === undefined ||
    target?.bindingId !== moduleBinding.bindingId
  )
    return undefined;
  const required = semanticRequireOrigin(expression.right, state)?.origin;
  return required !== undefined && required.importedPath.length === 0
    ? required.specifier
    : undefined;
};

const singleDefinition = (
  state: JavaScriptSemanticAnalysisState,
  bindingId: string,
  kind: "function" | "parameter",
): boolean => {
  const definitions = state.bindingsById.get(bindingId)?.definitions;
  return definitions?.length === 1 && definitions[0]?.kind === kind;
};
