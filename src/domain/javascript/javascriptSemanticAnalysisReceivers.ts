import * as t from "@babel/types";
import {
  unwrapJavaScriptExpression,
  semanticStaticPropertyKey,
} from "./javascriptAstValues.js";
import type {
  JavaScriptSemanticAnalysisState,
  JavaScriptBindingIndex,
} from "./javascriptSemanticState.js";
import {
  resolveSemanticBindingState,
  semanticResolutionBlocked,
  semanticStableInitializer,
} from "./javascriptSemanticState.js";
import { traverseJavaScriptAstSteps } from "./javascriptSemanticTraversal.js";
import { semanticRequireOrigin } from "./javascriptSemanticRequireOrigin.js";
import { isJavaScriptRpcClientFactory } from "./javascriptRpcEndpoints.js";

export type JavaScriptOpenReceiverFact =
  | "window"
  | "indexed-db"
  | "cache-storage"
  | "local"
  | "local-indexed-db"
  | "local-cache-storage"
  | "configuration"
  | "extension-state";
export interface JavaScriptReceiverFacts {
  readonly openReceivers: ReadonlyMap<number, JavaScriptOpenReceiverFact>;
  readonly rpcClientRoots: ReadonlySet<t.Node>;
}
export interface JavaScriptReceiverIndex extends JavaScriptBindingIndex {
  readonly receivers: JavaScriptReceiverFacts;
}

export function* classifyDefinitionReceiversSteps(
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
): Generator<void, JavaScriptReceiverFacts> {
  const facts = new Map<number, JavaScriptOpenReceiverFact>();
  const extensionStateReads: number[] = [];
  const roots = new Set<t.Node>();
  const clients = new Map<string, boolean>();
  const classifyRpcRoot = (node: t.Node): void => {
    if (!t.isMemberExpression(node) && !t.isOptionalMemberExpression(node))
      return;
    const root = node.object;
    if (!t.isIdentifier(root)) return;
    const binding = resolveSemanticBindingState(state, root, root.name);
    if (binding === undefined) return;
    let client = clients.get(binding.bindingId);
    if (client === undefined) {
      const initializer = semanticStableInitializer(binding, state);
      client =
        initializer !== undefined &&
        initializer.projection.length === 0 &&
        isJavaScriptRpcClientFactory(initializer.node);
      clients.set(binding.bindingId, client);
    }
    if (client) roots.add(root);
  };
  const classifyOpenReceiver = (node: t.Node): void => {
    if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node)) return;
    const callee = unwrapJavaScriptExpression(node.callee).node;
    if (!t.isMemberExpression(callee) && !t.isOptionalMemberExpression(callee))
      return;
    const object = unwrapJavaScriptExpression(callee.object).node;
    const method = semanticStaticPropertyKey(callee.property, callee.computed);
    if (method === "get") {
      if (isConfigurationReceiver(state, object))
        facts.set(node.start ?? -1, "configuration");
      else if (isExtensionStateMember(object))
        extensionStateReads.push(node.start ?? -1);
      return;
    }
    if (method !== "open" || !t.isIdentifier(object)) return;
    const receiver = object.name;
    const binding = resolveSemanticBindingState(state, node, receiver);
    if (binding === undefined) {
      if (semanticResolutionBlocked(state, node, receiver)) return;
      const fact = openGlobalFact(receiver);
      if (fact !== undefined) facts.set(node.start ?? -1, fact);
      return;
    }
    facts.set(node.start ?? -1, "local");
    if (receiver === "indexedDB" || receiver === "caches") {
      facts.set(
        node.start ?? -1,
        receiver === "indexedDB" ? "local-indexed-db" : "local-cache-storage",
      );
      return;
    }
    if (binding.mutable || binding.initializers.length !== 1) return;
    const initializerSource = binding.initializers[0]?.node;
    if (initializerSource === undefined) return;
    const initializer = unwrapJavaScriptExpression(initializerSource).node;
    if (!t.isIdentifier(initializer)) return;
    const initializerBinding = resolveSemanticBindingState(
      state,
      initializer,
      initializer.name,
    );
    if (initializerBinding !== undefined) {
      if (initializer.name === "indexedDB" || initializer.name === "caches") {
        const localFact =
          initializer.name === "indexedDB"
            ? "local-indexed-db"
            : "local-cache-storage";
        facts.set(node.start ?? -1, localFact);
        if (
          initializerBinding.mutable ||
          initializerBinding.initializers.length !== 1
        )
          return;
        const nestedSource = initializerBinding.initializers[0]?.node;
        if (nestedSource === undefined) return;
        const nested = unwrapJavaScriptExpression(nestedSource).node;
        if (t.isIdentifier(nested)) {
          const nestedFact = resolveGlobalAliasFact(
            state,
            initializer,
            nested.name,
          );
          if (nestedFact !== undefined) facts.set(node.start ?? -1, nestedFact);
        }
      } else if (initializer.name === "window")
        facts.set(node.start ?? -1, "local");
      return;
    }
    const aliasFact = resolveGlobalAliasFact(
      state,
      initializer,
      initializer.name,
    );
    if (aliasFact !== undefined) facts.set(node.start ?? -1, aliasFact);
  };
  yield* traverseJavaScriptAstSteps(program, {
    enter: (node) => {
      classifyRpcRoot(node);
      classifyOpenReceiver(node);
    },
  });
  if (extensionStateReads.length > 0 && importsVsCodeModule(state))
    for (const start of extensionStateReads)
      facts.set(start, "extension-state");
  return { openReceivers: facts, rpcClientRoots: roots };
}
const isExtensionStateMember = (receiver: t.Node): boolean =>
  (t.isMemberExpression(receiver) || t.isOptionalMemberExpression(receiver)) &&
  (() => {
    const key = semanticStaticPropertyKey(receiver.property, receiver.computed);
    return key === "globalState" || key === "workspaceState";
  })();
const importsVsCodeModule = (state: JavaScriptSemanticAnalysisState): boolean =>
  [...state.bindingsById.values()].some(
    (binding) =>
      binding.directOrigins.some(({ specifier }) => specifier === "vscode") ||
      semanticRequireOrigin(
        semanticStableInitializer(binding, state)?.node,
        state,
      )?.origin.specifier === "vscode",
  );
const isConfigurationAccessorCall = (
  state: JavaScriptSemanticAnalysisState,
  node: t.Node,
): boolean => {
  node = unwrapJavaScriptExpression(node).node;
  if (!t.isCallExpression(node) && !t.isOptionalCallExpression(node))
    return false;
  const callee = unwrapJavaScriptExpression(node.callee).node;
  if (
    (!t.isMemberExpression(callee) && !t.isOptionalMemberExpression(callee)) ||
    semanticStaticPropertyKey(callee.property, callee.computed) !==
      "getConfiguration"
  )
    return false;
  const host = unwrapJavaScriptExpression(callee.object).node;
  const matchesSpelling = t.isIdentifier(host)
    ? host.name === "workspace"
    : (t.isMemberExpression(host) || t.isOptionalMemberExpression(host)) &&
      semanticStaticPropertyKey(host.property, host.computed) === "workspace";
  if (!matchesSpelling) return false;
  const root = t.isIdentifier(host)
    ? host
    : t.isMemberExpression(host) || t.isOptionalMemberExpression(host)
      ? unwrapJavaScriptExpression(host.object).node
      : undefined;
  if (!t.isIdentifier(root)) return false;
  const binding = resolveSemanticBindingState(state, root, root.name);
  if (binding === undefined)
    return !semanticResolutionBlocked(state, root, root.name);
  const initializer = semanticStableInitializer(binding, state);
  const origins = [
    ...binding.directOrigins,
    ...(initializer === undefined
      ? []
      : [semanticRequireOrigin(initializer.node, state)?.origin]),
  ];
  return origins.some(
    (origin) =>
      origin?.specifier === "vscode" &&
      (t.isIdentifier(host)
        ? origin.importedPath.at(-1) === "workspace" ||
          initializer?.projection.at(-1) === "workspace"
        : origin.importedPath.length === 0 ||
          (origin.importedPath.length === 1 &&
            (origin.importedPath[0] === "*" ||
              origin.importedPath[0] === "default"))),
  );
};
const isConfigurationReceiver = (
  state: JavaScriptSemanticAnalysisState,
  receiver: t.Node,
): boolean => {
  if (isConfigurationAccessorCall(state, receiver)) return true;
  if (!t.isIdentifier(receiver)) return false;
  const binding = resolveSemanticBindingState(state, receiver, receiver.name);
  const initializer = semanticStableInitializer(binding, state);
  return (
    initializer !== undefined &&
    initializer.projection.length === 0 &&
    isConfigurationAccessorCall(state, initializer.node)
  );
};
const openGlobalFact = (
  name: string,
): JavaScriptOpenReceiverFact | undefined => {
  if (
    name === "window" ||
    name === "self" ||
    name === "globalThis" ||
    name === "top" ||
    name === "parent" ||
    name === "opener" ||
    name === "frames" ||
    name === "document"
  )
    return "window";
  if (name === "indexedDB") return "indexed-db";
  if (name === "caches") return "cache-storage";
  return undefined;
};
const resolveGlobalAliasFact = (
  state: JavaScriptSemanticAnalysisState,
  node: t.Node,
  name: string,
): JavaScriptOpenReceiverFact | undefined => {
  if (
    resolveSemanticBindingState(state, node, name) !== undefined ||
    semanticResolutionBlocked(state, node, name)
  )
    return undefined;
  return openGlobalFact(name);
};
