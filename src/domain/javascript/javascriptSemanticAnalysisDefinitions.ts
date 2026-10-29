import * as t from "@babel/types";
import { collectSemanticCallable } from "./javascriptSemanticProjection.js";
import {
  semanticObjectPatternKeys,
  runtimeFunctionParameters,
  semanticStaticPropertyKey,
  semanticWriteTargets,
} from "./javascriptAstValues.js";
import type {
  JavaScriptSemanticAnalysisState,
  JavaScriptSemanticScopeState,
} from "./javascriptSemanticState.js";
import {
  currentSemanticScope,
  resolveSemanticBindingFromScope,
  semanticBindingId,
  semanticScopeId,
  semanticVariableScope,
} from "./javascriptSemanticState.js";
import { traverseJavaScriptAstSteps } from "./javascriptSemanticTraversal.js";
import { semanticImportEqualsSpecifier } from "./javascriptModuleDeclaration.js";
import { range } from "./javascriptStaticAnalysisHelpers.js";
import { SemanticPropertyPathCoverage } from "./javascriptSemanticPropertyPaths.js";

interface BindPatternInput {
  readonly pattern: t.Node;
  readonly initializer: t.Node | null;
  readonly scope: JavaScriptSemanticScopeState;
  readonly state: JavaScriptSemanticAnalysisState;
  readonly mutable: boolean;
  readonly declarationKind?: "var" | "let" | "const" | "using" | "await using";
  readonly kind?: import("./javascriptSemanticIr.js").JavaScriptSemanticDefinition["kind"];
  readonly projection?: readonly (string | number | null)[];
  readonly referenceOnly?: boolean;
  readonly copyKind?: "object-rest" | "array-rest";
  readonly copyProjectionOffset?: number;
  readonly copyExcludedKeys?: readonly string[];
  readonly copyStartIndex?: number;
  readonly fallbackSources?: readonly {
    readonly node: t.Node;
    readonly projection: readonly (string | number | null)[];
  }[];
  readonly requiredSources?: readonly {
    readonly node: t.Node;
    readonly projection: readonly (string | number | null)[];
  }[];
}
interface AddBindingInput {
  readonly state: JavaScriptSemanticAnalysisState;
  readonly scope: JavaScriptSemanticScopeState;
  readonly name: string;
  readonly kind: import("./javascriptSemanticIr.js").JavaScriptSemanticDefinition["kind"];
  readonly mutable: boolean;
  readonly declarationKind?: "var" | "let" | "const" | "using" | "await using";
  readonly definitionNode: t.Node;
  readonly initializer: t.Node | null;
  readonly directOrigin?: import("./javascriptSemanticIr.js").JavaScriptModuleOrigin;
  readonly runtimeImport?: boolean;
  readonly projection?: readonly (string | number | null)[];
}
export const createState = (
  program: t.Program,
  staticImportResolutionMode: import("./javascriptModuleResolutionMode.js").JavaScriptModuleResolutionMode = "import",
): JavaScriptSemanticAnalysisState => {
  const root: JavaScriptSemanticScopeState = {
    scopeId: semanticScopeId("program", program),
    parentScopeId: null,
    kind: "program",
    location: range(program),
    bindingsComplete: true,
    bindings: new Map(),
  };
  return {
    program,
    staticImportResolutionMode,
    valueResourceLimits: new Set(),
    parentsByNode: new WeakMap(),
    scopes: [root],
    scopesById: new Map([[root.scopeId, root]]),
    scopeByNode: new WeakMap([[program, root]]),
    bindingsById: new Map(),
    callables: [],
    callableNodesById: new Map(),
    moduleLinks: [],
    linkedRequireCalls: new WeakSet(),
    moduleLinkBindings: new WeakMap(),
    defaultExportExpressions: new WeakMap(),
    conditionallySkippedExpressions: new WeakSet(),
    requiredModuleEffects: new Map(),
    ambientBindingWrites: new Map(),
    ambientWrites: new SemanticPropertyPathCoverage(),
    ambientWriteEffects: [],
  };
};
export function* collectDefinitionsSteps(
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
): Generator<void, void> {
  const stack: JavaScriptSemanticScopeState[] = [
    currentSemanticScope(state.scopes),
  ];
  const openedScopes = new WeakMap<t.Node, number>();
  const assignments: {
    readonly node: t.Node;
    readonly scope: JavaScriptSemanticScopeState;
    readonly conditionallySkipped: boolean;
  }[] = [];
  const functionBodies: {
    readonly body: t.BlockStatement;
    readonly scope: JavaScriptSemanticScopeState;
    readonly parameters: t.Function["params"];
  }[] = [];
  yield* traverseJavaScriptAstSteps(program, {
    enter: (node, parent, readAncestors) => {
      if (parent !== null) state.parentsByNode.set(node, parent);
      let parentScope = currentSemanticScope(stack);
      if (
        parent !== null &&
        (t.isObjectMethod(parent) || t.isClassMethod(parent)) &&
        parent.computed &&
        parent.key === node &&
        parentScope.parentScopeId !== null
      ) {
        const keyScope = state.scopesById.get(parentScope.parentScopeId);
        if (keyScope !== undefined) {
          stack.push(keyScope);
          openedScopes.set(node, 1);
          parentScope = keyScope;
        }
      }
      if (
        parent !== null &&
        t.isWithStatement(parent) &&
        parent.body === node
      ) {
        const dynamicScope: JavaScriptSemanticScopeState = {
          scopeId: `${semanticScopeId("block", parent)}:with`,
          parentScopeId: parentScope.scopeId,
          kind: "block",
          location: range(parent),
          bindingsComplete: false,
          bindings: new Map(),
        };
        state.scopes.push(dynamicScope);
        state.scopesById.set(dynamicScope.scopeId, dynamicScope);
        stack.push(dynamicScope);
        openedScopes.set(node, 1);
        parentScope = dynamicScope;
      }
      bindOuterDeclaration(node, parentScope, state);
      const nested = nestedScope(node, parent, parentScope, state);
      if (nested !== undefined) {
        stack.push(nested);
        openedScopes.set(node, (openedScopes.get(node) ?? 0) + 1);
        if (t.isBlockStatement(node) && t.isFunction(parent))
          functionBodies.push({
            body: node,
            scope: nested,
            parameters: runtimeFunctionParameters(parent),
          });
      }
      const scope = currentSemanticScope(stack);
      if (parent === null || openedScopes.has(node))
        state.scopeByNode.set(node, scope);
      collectSemanticCallable({
        node,
        parent,
        containerScope: parentScope,
        bodyScope: nested,
        state,
      });
      bindInnerDeclaration(node, parent, scope, state);
      if (
        t.isVariableDeclarator(node) &&
        node.init != null &&
        parent !== null &&
        t.isVariableDeclaration(parent, { kind: "var" }) &&
        writeMayBeSkipped(node, readAncestors())
      )
        state.conditionallySkippedExpressions.add(node.init);
      if (
        t.isAssignmentExpression(node) ||
        t.isUpdateExpression(node) ||
        t.isForOfStatement(node) ||
        t.isForInStatement(node)
      )
        assignments.push({
          node,
          scope,
          conditionallySkipped:
            t.isForOfStatement(node) ||
            t.isForInStatement(node) ||
            writeMayBeSkipped(node, readAncestors()),
        });
    },
    exit: (node) => {
      for (let count = openedScopes.get(node) ?? 0; count > 0; count--)
        stack.pop();
    },
  });
  for (const [
    index,
    { node, scope, conditionallySkipped },
  ] of assignments.entries()) {
    if (index % 64 === 0) yield;
    bindAssignment(node, scope, state, conditionallySkipped);
  }
  for (const [index, { body, scope, parameters }] of functionBodies.entries()) {
    if (index % 64 === 0) yield;
    for (const parameter of parameters)
      for (const identifier of semanticWriteTargets(
        t.isTSParameterProperty(parameter) ? parameter.parameter : parameter,
      ))
        if (t.isIdentifier(identifier))
          copyParameterToBody({ identifier, body, scope, state });
  }
}
const copyParameterToBody = (input: {
  readonly identifier: t.Identifier;
  readonly body: t.BlockStatement;
  readonly scope: JavaScriptSemanticScopeState;
  readonly state: JavaScriptSemanticAnalysisState;
}): void => {
  const { identifier, body, scope, state } = input;
  const binding = scope.bindings.get(identifier.name);
  if (
    binding === undefined ||
    binding.kind !== "variable" ||
    binding.definitions.some(({ kind }) => kind === "function")
  )
    return;
  binding.initializers.unshift({
    node: identifier,
    projection: [],
    entryBody: body,
  });
  for (let index = binding.initializers.length - 1; index >= 0; index -= 1) {
    const initializer = binding.initializers[index];
    if (
      initializer !== undefined &&
      initializer.entryBody === undefined &&
      initializer.projection.length === 0 &&
      t.isIdentifier(initializer.node) &&
      resolveSemanticBindingState(
        state,
        initializer.node,
        initializer.node.name,
      ) === binding
    )
      binding.initializers.splice(index, 1);
  }
};
const writeMayBeSkipped = (
  node: t.Node,
  ancestors: readonly t.Node[],
): boolean => {
  let child = node;
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (
      parent === undefined ||
      t.isFunction(parent) ||
      t.isProgram(parent) ||
      t.isStaticBlock(parent)
    )
      return false;
    if (isSkippedBranch(parent, child)) return true;
    child = parent;
  }
  return false;
};
const isSkippedBranch = (parent: t.Node, child: t.Node): boolean => {
  if (t.isIfStatement(parent))
    return child === parent.consequent || child === parent.alternate;
  if (t.isSwitchCase(parent)) return true;
  if (t.isTryStatement(parent))
    return child === parent.block || child === parent.handler;
  if (t.isForStatement(parent))
    return child === parent.body || child === parent.update;
  if (t.isWhileStatement(parent)) return child === parent.body;
  if (t.isDoWhileStatement(parent)) return false;
  if (t.isForInStatement(parent) || t.isForOfStatement(parent))
    return child === parent.left || child === parent.body;
  if (t.isLogicalExpression(parent)) return child === parent.right;
  if (t.isConditionalExpression(parent))
    return child === parent.consequent || child === parent.alternate;
  if (t.isOptionalCallExpression(parent) || t.isCallExpression(parent))
    return (
      parent.arguments.includes(child as t.Expression) &&
      optionalCallArgumentsMayBeSkipped(parent)
    );
  if (t.isOptionalMemberExpression(parent))
    return parent.optional && parent.computed && child === parent.property;
  return false;
};
const optionalCallArgumentsMayBeSkipped = (
  call: t.CallExpression | t.OptionalCallExpression,
): boolean => {
  if (t.isOptionalCallExpression(call) && call.optional) return true;
  let callee: t.Node = call.callee;
  while (true) {
    if (callee.extra?.parenthesized === true) return false;
    if (t.isOptionalMemberExpression(callee)) {
      if (callee.optional) return true;
      callee = callee.object;
    } else if (t.isMemberExpression(callee)) callee = callee.object;
    else if (t.isOptionalCallExpression(callee)) {
      if (callee.optional) return true;
      callee = callee.callee;
    } else if (t.isCallExpression(callee)) callee = callee.callee;
    else return false;
  }
};
const bindOuterDeclaration = (
  node: t.Node,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): void => {
  if (t.isFunctionDeclaration(node) && t.isIdentifier(node.id))
    addBinding({
      state,
      scope,
      name: node.id.name,
      kind: "function",
      mutable: false,
      definitionNode: node.id,
      initializer: node,
    });
  else if (t.isClassDeclaration(node) && t.isIdentifier(node.id))
    addBinding({
      state,
      scope,
      name: node.id.name,
      kind: "class",
      mutable: false,
      definitionNode: node.id,
      initializer: node,
    });
};
const bindInnerDeclaration = (
  node: t.Node,
  parent: t.Node | null,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): void => {
  if (t.isImportDeclaration(node)) bindImports(node, scope, state);
  else if (t.isTSImportEqualsDeclaration(node))
    bindImportEquals(node, scope, state);
  else if (t.isVariableDeclarator(node))
    bindPattern({
      pattern: node.id,
      initializer: node.init ?? null,
      scope: semanticVariableScope(scope, parent, state),
      state,
      mutable:
        parent !== null && t.isVariableDeclaration(parent)
          ? parent.kind !== "const"
          : true,
      ...(parent !== null && t.isVariableDeclaration(parent)
        ? { declarationKind: parent.kind }
        : {}),
    });
  else if (t.isClassExpression(node) && t.isIdentifier(node.id))
    addBinding({
      state,
      scope,
      name: node.id.name,
      kind: "class",
      mutable: false,
      definitionNode: node.id,
      initializer: node,
    });
  else if (t.isFunction(node)) bindFunctionLocals(node, scope, state);
  else if (t.isCatchClause(node) && node.param != null)
    bindPattern({
      pattern: node.param,
      initializer: null,
      scope,
      state,
      mutable: true,
      kind: "catch",
    });
};
const bindImportEquals = (
  node: t.TSImportEqualsDeclaration,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): void => {
  const specifier = semanticImportEqualsSpecifier(node);
  if (specifier === null) return;
  addBinding({
    state,
    scope,
    name: node.id.name,
    kind: "import",
    mutable: false,
    definitionNode: node.id,
    initializer: null,
    directOrigin: { specifier, importedPath: [], resolutionMode: "require" },
  });
};
const hasIncomingValue = (
  identifier: t.Identifier,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  const kind = resolveSemanticBindingFromScope(
    scope,
    identifier.name,
    state,
  )?.kind;
  return kind === "parameter" || kind === "catch";
};
const bindAssignment = (
  node: t.Node,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
  conditionallySkipped: boolean,
): void => {
  if (t.isAssignmentExpression(node)) {
    const left = unwrapJavaScriptExpression(node.left).node;
    if (t.isIdentifier(left))
      addAssignment(
        left,
        node.operator === "=" ||
          ((node.operator === "||=" || node.operator === "??=") &&
            !hasIncomingValue(left, scope, state))
          ? node.right
          : node,
        scope,
        state,
        conditionallySkipped,
      );
    else
      for (const identifier of semanticWriteTargets(node.left))
        if (t.isIdentifier(identifier))
          addAssignment(identifier, node, scope, state, conditionallySkipped);
  } else if (t.isUpdateExpression(node)) {
    const argument = unwrapJavaScriptExpression(node.argument).node;
    if (t.isIdentifier(argument))
      addAssignment(argument, node, scope, state, conditionallySkipped);
  } else if (t.isForOfStatement(node) || t.isForInStatement(node))
    for (const pattern of t.isVariableDeclaration(node.left)
      ? node.left.declarations.map(({ id }) => id)
      : [node.left]) {
      for (const identifier of semanticWriteTargets(pattern))
        if (t.isIdentifier(identifier))
          addAssignment(identifier, node, scope, state, conditionallySkipped);
      if (t.isForOfStatement(node))
        bindPattern({
          pattern,
          initializer: node,
          scope,
          state,
          mutable: true,
          referenceOnly: true,
        });
    }
};
const nestedScope = (
  node: t.Node,
  parent: t.Node | null,
  parentScope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptSemanticScopeState | undefined => {
  const switchOwner =
    t.isSwitchCase(node) && parent !== null && t.isSwitchStatement(parent)
      ? parent
      : undefined;
  if (switchOwner !== undefined) {
    const existing = state.scopesById.get(
      semanticScopeId("block", switchOwner),
    );
    if (existing !== undefined) return existing;
  }
  const kind = scopeKind(node, parent);
  if (kind === undefined) return undefined;
  const scope: JavaScriptSemanticScopeState = {
    scopeId: semanticScopeId(kind, switchOwner ?? node),
    parentScopeId:
      functionNameScope(node, parentScope, state)?.scopeId ??
      parentScope.scopeId,
    kind,
    location: range(switchOwner ?? node),
    bindingsComplete: true,
    bindings: new Map(),
  };
  state.scopes.push(scope);
  state.scopesById.set(scope.scopeId, scope);
  return scope;
};
const functionNameScope = (
  node: t.Node,
  parentScope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptSemanticScopeState | undefined => {
  if (!t.isFunctionExpression(node) || !t.isIdentifier(node.id))
    return undefined;
  const scope: JavaScriptSemanticScopeState = {
    scopeId: `${semanticScopeId("block", node)}:function-name`,
    parentScopeId: parentScope.scopeId,
    kind: "block",
    location: range(node),
    bindingsComplete: true,
    bindings: new Map(),
  };
  state.scopes.push(scope);
  state.scopesById.set(scope.scopeId, scope);
  addBinding({
    state,
    scope,
    name: node.id.name,
    kind: "function",
    mutable: false,
    definitionNode: node.id,
    initializer: node,
  });
  return scope;
};
const scopeKind = (
  node: t.Node,
  parent: t.Node | null,
): JavaScriptSemanticScopeState["kind"] | undefined => {
  if (t.isFunction(node)) return "function";
  if (t.isClass(node)) return "class";
  if (t.isCatchClause(node)) return "catch";
  if (
    t.isForStatement(node) ||
    t.isForOfStatement(node) ||
    t.isForInStatement(node)
  )
    return "block";
  if (t.isSwitchCase(node)) return "block";
  if (t.isStaticBlock(node)) return "static-block";
  if (
    t.isBlockStatement(node) &&
    parent !== null &&
    t.isFunction(parent) &&
    parent.body === node
  )
    return functionParametersHaveExpressions(parent) ? "function" : undefined;
  if (t.isBlockStatement(node)) return "block";
  return undefined;
};
const functionParametersHaveExpressions = (node: t.Function): boolean => {
  const pending: t.Node[] = [...runtimeFunctionParameters(node)];
  while (pending.length > 0) {
    const parameter = pending.pop();
    if (t.isAssignmentPattern(parameter)) return true;
    if (t.isTSParameterProperty(parameter)) pending.push(parameter.parameter);
    else if (t.isRestElement(parameter)) pending.push(parameter.argument);
    else if (t.isArrayPattern(parameter)) {
      for (const element of parameter.elements)
        if (element !== null) pending.push(element);
    } else if (t.isObjectPattern(parameter)) {
      for (const property of parameter.properties) {
        if (t.isRestElement(property)) pending.push(property.argument);
        else {
          if (property.computed) return true;
          pending.push(property.value);
        }
      }
    }
  }
  return false;
};
const bindImports = (
  node: t.ImportDeclaration,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): void => {
  for (const specifier of node.specifiers) {
    const importedPath = t.isImportDefaultSpecifier(specifier)
      ? ["default"]
      : t.isImportNamespaceSpecifier(specifier)
        ? []
        : [semanticStaticPropertyKey(specifier.imported, false) ?? "[dynamic]"];
    addBinding({
      state,
      scope,
      name: specifier.local.name,
      kind: "import",
      mutable: false,
      definitionNode: specifier.local,
      initializer: null,
      directOrigin: { specifier: node.source.value, importedPath },
      runtimeImport:
        node.importKind !== "type" &&
        node.importKind !== "typeof" &&
        (!t.isImportSpecifier(specifier) ||
          (specifier.importKind !== "type" &&
            specifier.importKind !== "typeof")),
    });
  }
};
const bindFunctionLocals = (
  node: t.Function,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
): void => {
  for (const parameter of runtimeFunctionParameters(node))
    bindPattern({
      pattern: t.isTSParameterProperty(parameter)
        ? parameter.parameter
        : parameter,
      initializer: null,
      scope,
      state,
      mutable: true,
      kind: "parameter",
    });
};
const bindPattern = (input: BindPatternInput): void => {
  const {
    pattern,
    initializer,
    scope,
    state,
    mutable,
    declarationKind,
    kind = "variable",
    projection = [],
    referenceOnly = false,
    copyKind,
    copyProjectionOffset,
    copyExcludedKeys,
    copyStartIndex,
    fallbackSources,
    requiredSources,
  } = input;
  if (t.isTSParameterProperty(pattern)) {
    bindPattern({ ...input, pattern: pattern.parameter });
    return;
  }
  if (t.isIdentifier(pattern)) {
    if (referenceOnly) {
      const binding = resolveSemanticBindingFromScope(
        scope,
        pattern.name,
        state,
      );
      if (binding !== undefined && initializer !== null)
        binding.referenceInitializers.push({
          node: initializer,
          projection,
          ...(copyKind === undefined ? {} : { copyKind }),
          ...(copyProjectionOffset === undefined
            ? {}
            : { copyProjectionOffset }),
          ...(copyExcludedKeys === undefined ? {} : { copyExcludedKeys }),
          ...(copyStartIndex === undefined ? {} : { copyStartIndex }),
          ...(fallbackSources === undefined ? {} : { fallbackSources }),
          ...(requiredSources === undefined ? {} : { requiredSources }),
        });
      return;
    }
    addBinding({
      state,
      scope,
      name: pattern.name,
      kind,
      mutable,
      ...(declarationKind === undefined ? {} : { declarationKind }),
      definitionNode: pattern,
      initializer,
      projection,
    });
    return;
  }
  if (t.isAssignmentPattern(pattern)) {
    bindPattern({
      ...input,
      pattern: pattern.left,
      initializer:
        kind === "parameter" || kind === "catch"
          ? initializer
          : (initializer ?? pattern.right),
      requiredSources: [
        ...(requiredSources ?? []),
        ...(initializer === null ? [] : [{ node: initializer, projection }]),
      ],
    });
    bindPattern({
      state,
      scope,
      mutable,
      kind,
      pattern: pattern.left,
      initializer: pattern.right,
      projection: [],
      referenceOnly: true,
      fallbackSources: [
        ...(fallbackSources ?? []),
        ...(initializer === null ? [] : [{ node: initializer, projection }]),
      ],
      ...(requiredSources === undefined ? {} : { requiredSources }),
    });
    return;
  }
  if (t.isRestElement(pattern)) {
    bindPattern({
      ...input,
      pattern: pattern.argument,
      initializer: null,
      mutable: true,
    });
    return;
  }
  if (t.isObjectPattern(pattern))
    for (const property of pattern.properties) {
      if (t.isRestElement(property)) {
        bindPattern({
          ...input,
          pattern: property.argument,
          initializer: null,
          mutable: true,
          projection: [],
        });
        bindPattern({
          ...input,
          pattern: property.argument,
          projection: [...projection, null],
          referenceOnly: true,
          copyKind: "object-rest",
          copyProjectionOffset: projection.length,
          copyExcludedKeys: semanticObjectPatternKeys(pattern),
        });
      } else {
        const name = semanticStaticPropertyKey(property.key, property.computed);
        bindPattern({
          ...input,
          pattern: property.value,
          projection: [...projection, name],
        });
      }
    }
  else if (t.isArrayPattern(pattern))
    pattern.elements.forEach((element, index) => {
      if (element !== null) {
        bindPattern({
          ...input,
          pattern: element,
          projection: [...projection, index],
        });
        if (t.isRestElement(element))
          bindPattern({
            ...input,
            pattern: element.argument,
            projection: [...projection, null],
            referenceOnly: true,
            copyKind: "array-rest",
            copyProjectionOffset: projection.length,
            copyStartIndex: index,
          });
      }
    });
};
const addBinding = (input: AddBindingInput): void => {
  const {
    state,
    scope,
    name,
    kind,
    mutable,
    declarationKind,
    definitionNode,
    initializer,
    directOrigin,
    runtimeImport,
    projection = [],
  } = input;
  let binding = scope.bindings.get(name);
  if (binding === undefined) {
    if (!scope.bindingsComplete) return;
    binding = createBinding(scope, name, kind, mutable);
    scope.bindings.set(name, binding);
    state.bindingsById.set(binding.bindingId, binding);
  }
  binding.mutable ||= mutable;
  if (declarationKind !== undefined)
    binding.declarationKinds.add(declarationKind);
  binding.definitions.push({ kind, location: range(definitionNode) });
  if (initializer !== null)
    binding.initializers.push({ node: initializer, projection });
  if (directOrigin !== undefined)
    binding.directOrigins.push(
      directOrigin.resolutionMode === undefined &&
        state.staticImportResolutionMode !== "import"
        ? { ...directOrigin, resolutionMode: state.staticImportResolutionMode }
        : directOrigin,
    );
  binding.runtimeImport ||= runtimeImport === true;
};
const createBinding = (
  scope: JavaScriptSemanticScopeState,
  name: string,
  kind: import("./javascriptSemanticIr.js").JavaScriptSemanticDefinition["kind"],
  mutable: boolean,
): import("./javascriptSemanticState.js").JavaScriptSemanticBindingState => ({
  bindingId: semanticBindingId(scope.scopeId, name),
  scopeId: scope.scopeId,
  name,
  kind,
  mutable,
  declarationKinds: new Set(),
  memberWrites: [],
  escapedPaths: [],
  definitions: [],
  initializers: [],
  referenceInitializers: [],
  directOrigins: [],
  runtimeImport: false,
});
const addAssignment = (
  identifier: t.Identifier,
  initializer: t.Node,
  scope: JavaScriptSemanticScopeState,
  state: JavaScriptSemanticAnalysisState,
  conditionallySkipped: boolean,
): void => {
  const binding = resolveSemanticBindingFromScope(
    scope,
    identifier.name,
    state,
  );
  if (binding === undefined) {
    const writes = state.ambientBindingWrites.get(identifier.name) ?? [];
    writes.push(identifier);
    state.ambientBindingWrites.set(identifier.name, writes);
    return;
  }
  binding.mutable = true;
  binding.definitions.push({ kind: "assignment", location: range(identifier) });
  binding.initializers.push({ node: initializer, projection: [] });
  if (conditionallySkipped)
    state.conditionallySkippedExpressions.add(initializer);
};
