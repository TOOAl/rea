import * as t from "@babel/types";
import {
  unwrapJavaScriptExpression,
  semanticStaticPropertyKey,
  semanticFinalObjectProperty,
  semanticFinalObjectStringProperty,
} from "./javascriptAstValues.js";
import { range } from "./javascriptStaticAnalysisHelpers.js";
import type { JavaScriptSemanticReference } from "./javascriptSemanticIr.js";
import {
  resolveSemanticBindingState,
  semanticStableInitializer,
  type JavaScriptSemanticAnalysisState,
  type JavaScriptBindingIndex,
} from "./javascriptSemanticState.js";
import type { JavaScriptRpcEndpoint } from "./javascriptRpcEndpoints.js";

/**
 * Find source-body string values owned by a GraphQL Source-shaped literal.
 * A later duplicate or spread can make the effective `body` unknown, but the
 * earlier strings still belong to this object and must not become standalone
 * operation findings during the string scan.
 */
const graphqlSourceBodyLiterals = (
  node: t.ObjectExpression,
): readonly t.StringLiteral[] | undefined => {
  const hasLocationOffset = node.properties.some(
    (property) =>
      t.isObjectProperty(property) &&
      semanticStaticPropertyKey(property.key, property.computed) ===
        "locationOffset",
  );
  if (!hasLocationOffset) return undefined;

  const bodyStrings = (object: t.ObjectExpression) =>
    object.properties.flatMap((property) =>
      t.isObjectProperty(property) &&
      semanticStaticPropertyKey(property.key, property.computed) === "body" &&
      t.isStringLiteral(property.value)
        ? [property.value]
        : [],
    );
  const bodies = bodyStrings(node);

  // Inline object spreads can own additional body values which the surrounding
  // Source object may select. Include only body-key string literals from those
  // spread values; ordinary strings elsewhere in the object remain scannable.
  const visited = new WeakSet<t.ObjectExpression>();
  visited.add(node);
  const pending = node.properties.flatMap((property) => {
    if (!t.isSpreadElement(property)) return [];
    const spread = unwrapJavaScriptExpression(property.argument).node;
    return t.isObjectExpression(spread) ? [spread] : [];
  });
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    bodies.push(...bodyStrings(current));
    for (const property of current.properties) {
      if (t.isSpreadElement(property)) {
        const spread = unwrapJavaScriptExpression(property.argument).node;
        if (t.isObjectExpression(spread)) pending.push(spread);
      }
    }
  }
  return bodies.length === 0 ? undefined : bodies;
};

const GRAPHQL_OPERATION_TYPES: ReadonlySet<string> = new Set([
  "query",
  "mutation",
  "subscription",
]);

// GraphQL October 2021 §2.1.7: ignored BOM, tab/space, line endings, commas;
// comments are consumed separately below.
const isGraphqlIgnoredCharacter = (character: string): boolean =>
  character === "," ||
  character === "\uFEFF" ||
  character === "\t" ||
  character === " " ||
  character === "\n" ||
  character === "\r";

/** Return the first offset after GraphQL ignored tokens. */
const skipGraphqlIgnored = (text: string, start: number): number => {
  const limit = text.length;
  let index = start;
  while (index < limit) {
    const character = text.charAt(index);
    if (isGraphqlIgnoredCharacter(character)) index += 1;
    else if (character === "#") {
      while (index < limit && !/[\n\r]/u.test(text.charAt(index))) index += 1;
    } else break;
  }
  return index;
};

const graphqlNameAt = (
  text: string,
  index: number,
): { readonly value: string; readonly end: number } | undefined => {
  const name = /^[_A-Za-z][_0-9A-Za-z]*/u.exec(text.slice(index))?.[0];
  return name === undefined
    ? undefined
    : { value: name, end: index + name.length };
};

/** Recover a named operation from GraphQL document text. */
const graphqlOperationFromText = (
  text: string,
): JavaScriptRpcEndpoint | undefined => {
  const type = graphqlNameAt(text, skipGraphqlIgnored(text, 0));
  if (type === undefined || !GRAPHQL_OPERATION_TYPES.has(type.value))
    return undefined;
  const name = graphqlNameAt(text, skipGraphqlIgnored(text, type.end));
  if (name === undefined) return undefined;
  const index = skipGraphqlIgnored(text, name.end);
  const next = text.charAt(index);
  // Keep the existing bounded recognition scope: a named operation followed
  // by variable definitions, a directive, or a selection set with a field.
  const hasHeader =
    next === "("
      ? text.charAt(skipGraphqlIgnored(text, index + 1)) === "$"
      : (next === "@" || next === "{") &&
        graphqlNameAt(text, skipGraphqlIgnored(text, index + 1)) !== undefined;
  return hasHeader
    ? { value: name.value, mechanism: `graphql:${type.value}` }
    : undefined;
};

/** Recover a named operation from a precompiled GraphQL document object. */
const graphqlOperationFromDocumentNode = (
  node: t.ObjectExpression,
): JavaScriptRpcEndpoint | undefined => {
  if (semanticFinalObjectStringProperty(node, "kind") !== "OperationDefinition")
    return undefined;
  const type = semanticFinalObjectStringProperty(node, "operation");
  if (type === undefined || !GRAPHQL_OPERATION_TYPES.has(type))
    return undefined;
  const name = semanticFinalObjectProperty(node, "name");
  if (
    !t.isObjectExpression(name) ||
    semanticFinalObjectStringProperty(name, "kind") !== "Name"
  )
    return undefined;
  const value = semanticFinalObjectStringProperty(name, "value");
  return value === undefined
    ? undefined
    : { value, mechanism: `graphql:${type}` };
};

interface GraphqlSourceDependency {
  readonly bindingId: string;
  readonly name: string;
  readonly location?: JavaScriptSemanticReference["location"];
}

interface GraphqlSourceCopy {
  readonly source: t.ObjectExpression;
  readonly dependencies: readonly GraphqlSourceDependency[];
  readonly operations: readonly JavaScriptRpcEndpoint[];
}

/** One private constant owns its initializer; exported or projected values do not. */
const graphqlPrivateBinding = (
  node: t.Identifier,
  state: JavaScriptSemanticAnalysisState,
  sourceType: t.Program["sourceType"],
) => {
  const binding = resolveSemanticBindingState(state, node, node.name);
  if (binding === undefined || binding.mutable) return undefined;
  const scope = state.scopesById.get(binding.scopeId);
  if (
    scope === undefined ||
    (scope.kind === "program" && sourceType !== "module")
  )
    return undefined;
  const initializer = semanticStableInitializer(binding, state);
  if (initializer?.projection.length !== 0) return undefined;
  const declaration = state.parentsByNode.get(initializer.node);
  const statement = t.isVariableDeclarator(declaration)
    ? state.parentsByNode.get(declaration)
    : undefined;
  return t.isVariableDeclaration(statement) &&
    !t.isExportNamedDeclaration(state.parentsByNode.get(statement))
    ? { binding, initializer }
    : undefined;
};

/** Resolve potential metadata ownership; references must still prove exclusivity. */
const graphqlSourceObjectValue = (
  node: t.Node | undefined,
  index: JavaScriptBindingIndex,
  dependencies: GraphqlSourceDependency[],
): t.ObjectExpression | undefined => {
  if (node === undefined) return undefined;
  const state = index.bindings;
  const visited = new Set<t.Node>();
  while (node !== undefined && !visited.has(node)) {
    visited.add(node);
    node = unwrapJavaScriptExpression(node).node;
    if (t.isObjectExpression(node)) return node;
    if (!t.isIdentifier(node)) return undefined;
    const owner = graphqlPrivateBinding(node, state, index.sourceType);
    if (owner === undefined) return undefined;
    const { binding, initializer } = owner;
    if (
      initializer.node.end == null ||
      node.start == null ||
      node.loc == null ||
      initializer.node.end > node.start
    )
      return undefined;
    dependencies.push({
      bindingId: binding.bindingId,
      name: binding.name,
      location: range(node),
    });
    node = initializer.node;
  }
  return undefined;
};
