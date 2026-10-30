import * as t from "@babel/types";

import {
  semanticStaticPropertyKey,
  unwrapJavaScriptExpression,
} from "./javascriptAstValues.js";
import {
  collectJavaScriptIdentityWritesSteps,
  electronMemberPath,
} from "./javascriptElectronMemberWrites.js";
import { createSemanticModuleInterop } from "./javascriptModuleInterop.js";
import {
  isUnshadowedGlobal,
  resolveSemanticBindingState,
  semanticStableInitializer,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";
import { isImportMetaUrl } from "./javascriptStaticAnalysisHelpers.js";
import { semanticMutationInitializers } from "./javascriptSemanticMutationInitializers.js";

const GLOBAL_OBJECT_NAMES = ["globalThis", "global", "window", "self"];

const globalObjectName = (
  node: t.Node,
  state: JavaScriptSemanticAnalysisState,
): string | undefined =>
  GLOBAL_OBJECT_NAMES.find((name) => isUnshadowedGlobal(node, state, name));

/** Global self references retain object identity, rather than adding a property. */
const canonicalAmbientPath = (
  path: readonly (string | null)[],
): readonly (string | null)[] => {
  if (path[0] !== "global") return path;
  let firstProperty = 1;
  while (GLOBAL_OBJECT_NAMES.includes(path[firstProperty] ?? ""))
    firstProperty += 1;
  return ["global", ...path.slice(firstProperty)];
};

type AmbientPath = readonly (string | null)[];

/** Undefined means a cyclic or conflicting projection can select any depth. */
type AmbientProjection = AmbientPath | undefined;

// Ghidra basic-block: identifier branch
const handleIdentifierBranch = (input: {
  readonly root: t.Identifier;
  readonly state: JavaScriptSemanticAnalysisState;
  readonly suffix: AmbientProjection;
  readonly current: { readsAtSelf?: true };
  readonly possibleWrites: boolean;
  readonly capture: t.Node | undefined;
  readonly pending: { node: t.Node; suffix: AmbientProjection; readsAtSelf?: true }[];
  readonly retain: (path: AmbientPath) => void;
}): boolean => {
  const { root, state, suffix, current, possibleWrites, capture, pending, retain } = input;
  if (isUnshadowedGlobal(root, state, "module")) {
    retain(["commonjs-module", ...(suffix ?? [])]);
    return true;
  }
  if (globalObjectName(root, state) !== undefined) {
    retain(["global", ...(suffix ?? [])]);
    return true;
  }
  if (isUnshadowedGlobal(root, state, root.name)) {
    retain(["global", root.name, ...(suffix ?? [])]);
    return true;
  }
  const binding = resolveSemanticBindingState(state, root, root.name);
  if (binding === undefined) return true;
  const stable = semanticStableInitializer(binding, state);
  const readAt = current.readsAtSelf ? root : capture;
  const initializers = possibleWrites
    ? readAt === undefined
      ? binding.initializers
      : semanticMutationInitializers(binding, readAt, state.parentsByNode).initializers
    : stable === undefined ? [] : [stable];
  for (const initializer of initializers)
    pending.push({
      node: initializer.node,
      readsAtSelf: true,
      suffix: suffix === undefined ? undefined : [...initializer.projection.map((key) => (key === null ? null : String(key))), ...suffix],
    });
  return true;
};

// Ghidra: object expression branch
const handleObjectExpression = (input: {
  readonly root: t.ObjectExpression;
  readonly suffix: AmbientProjection;
  readonly key: string | null | undefined;
  readonly possibleWrites: boolean;
  readonly continueWith: (node: t.Node, path?: AmbientProjection) => void;
}): boolean => {
  if (input.possibleWrites) {
    for (const property of input.root.properties) {
      if (t.isSpreadElement(property)) input.continueWith(property.argument);
      else if (t.isObjectProperty(property) && t.isExpression(property.value)) {
        const ownKey = semanticStaticPropertyKey(property.key, property.computed);
        if (input.suffix === undefined || input.key === null || ownKey === null || ownKey === input.key)
          input.continueWith(property.value, input.suffix?.slice(1));
      }
    }
    return true;
  }
  if (input.suffix !== undefined && input.key !== null && input.root.properties.every((p) => t.isObjectProperty(p) && semanticStaticPropertyKey(p.key, p.computed) !== null)) {
    const property = input.root.properties.findLast((p) => t.isObjectProperty(p) && semanticStaticPropertyKey(p.key, p.computed) === input.key);
    if (t.isObjectProperty(property) && t.isExpression(property.value)) input.continueWith(property.value, input.suffix.slice(1));
  }
  return true;
};

// Ghidra: array expression branch
const handleArrayExpression = (input: {
  readonly root: t.ArrayExpression;
  readonly suffix: AmbientProjection;
  readonly key: string | null | undefined;
  readonly possibleWrites: boolean;
  readonly continueWith: (node: t.Node, path?: AmbientProjection) => void;
}): boolean => {
  if (input.suffix === undefined) {
    for (const element of input.root.elements) if (t.isSpreadElement(element)) input.continueWith(element.argument); else if (t.isExpression(element)) input.continueWith(element);
  } else if (!input.root.elements.some(t.isSpreadElement)) {
    const index = Number(input.key);
    if (input.key === null && input.possibleWrites) {
      for (const element of input.root.elements) if (t.isExpression(element)) input.continueWith(element, input.suffix.slice(1));
    } else if (input.key !== null && Number.isInteger(index) && index >= 0 && String(index) === input.key) {
      const element = input.root.elements[index];
      if (t.isExpression(element)) input.continueWith(element, input.suffix.slice(1));
    }
  }
  return true;
};

/**
 * Follow local object identities without equating shallow copies with their
 * sources. Write lookup retains every visible initializer: reassigning an alias
 * later cannot erase a possible earlier mutation. Intrinsic reads stay strict.
 */
const createAmbientPathResolver = (
  state: JavaScriptSemanticAnalysisState,
  possibleWrites: boolean,
) => {
  const cached = new WeakMap<t.Node, readonly AmbientPath[]>();
  return (node: t.Node, capture?: t.Node): readonly AmbientPath[] => {
    const prior = possibleWrites ? undefined : cached.get(node);
    if (prior !== undefined) return prior;
    const result = new Map<string, AmbientPath>();
    const pending: {
      node: t.Node;
      suffix: AmbientProjection;
      readsAtSelf?: true;
    }[] = [{ node, suffix: [] }];
    const expanded = new WeakMap<t.Node, AmbientProjection>();
    const retain = (path: AmbientPath) => {
      let canonical = canonicalAmbientPath(path);
      for (;;) {
        result.set(JSON.stringify(canonical), canonical);
        if (!possibleWrites || canonical[0] !== "global" || canonical[1] !== null) break;
        canonical = canonicalAmbientPath(["global", ...canonical.slice(2)]);
      }
    };
    while (pending.length > 0) {
      const current = pending.pop();
      if (current === undefined) break;
      const { root, members } = electronMemberPath(current.node);
      let suffix: AmbientProjection = current.suffix === undefined ? undefined : [...members, ...current.suffix];
      if (expanded.has(root)) {
        const previous = expanded.get(root);
        if (previous === undefined) continue;
        if (suffix !== undefined && previous.length === suffix.length) {
          const joined: AmbientPath = previous.map((key, index) => (key === suffix?.[index] ? key : null));
          if (joined.every((key, index) => key === previous[index])) continue;
          suffix = joined;
        } else suffix = undefined;
        if (!possibleWrites) {
          cached.set(node, []);
          return [];
        }
      }
      expanded.set(root, suffix);
      if (suffix === undefined && !possibleWrites) continue;
      const continueWith = (node: t.Node, path: AmbientProjection = suffix) =>
        pending.push({ node, suffix: path, ...(current.readsAtSelf && { readsAtSelf: true }) });
      if (t.isMetaProperty(root) && root.meta.name === "import" && root.property.name === "meta") {
        retain(["import-meta", ...(suffix ?? [])]);
        continue;
      }
      if (t.isIdentifier(root)) {
        handleIdentifierBranch({ root, state, suffix, current, possibleWrites, capture, pending, retain });
        continue;
      }
      if (possibleWrites && t.isConditionalExpression(root)) {
        continueWith(root.consequent);
        continueWith(root.alternate);
        continue;
      }
      if (possibleWrites && t.isLogicalExpression(root)) {
        continueWith(root.left);
        continueWith(root.right);
        continue;
      }
      const key = suffix?.[0];
      if (suffix !== undefined && key === undefined) continue;
      if (t.isObjectExpression(root)) {
        handleObjectExpression({ root, suffix, key, possibleWrites, continueWith });
      } else if (t.isArrayExpression(root)) {
        handleArrayExpression({ root, suffix, key, possibleWrites, continueWith });
      }
    }
    const paths = [...result.values()];
    if (!possibleWrites) cached.set(node, paths);
    return paths;
  };
};

/**
 * Index source-local writes through ambient identities and stable aliases.
 * The shared invocation owner resolves intrinsic aliases, bind/call/apply and
 * literal argument spreads. Runtime reachability and arbitrary call effects
 * remain unevaluated; a visible possible write is sufficient.
 */
export function* indexJavaScriptAmbientWritesSteps(
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
): Generator<void> {
  const ambientReads = createAmbientPathResolver(state, false);
  const ambientWrites = createAmbientPathResolver(state, true);
  const interop = createSemanticModuleInterop(state, {
    intrinsicPath: (node) => {
      const [path] = ambientReads(node);
      return path?.[0] === "global" && path.every((key) => key !== null)
        ? ["intrinsic", ...(path.slice(1) as readonly string[])]
        : undefined;
    },
  });
  yield* collectJavaScriptIdentityWritesSteps(
    program,
    (root, kind, writeSite) => {
      if (kind === "opaque-call") return [];
      if (kind === "binding")
        return t.isIdentifier(root) && isUnshadowedGlobal(root, state, root.name) ? [["global", root.name]] : [];
      return ambientWrites(root, writeSite);
    },
    interop.intrinsicInvocation,
    interop.staticString,
    interop.isFreshObject,
    (node, path) => {
      state.ambientWrites.retain(path);
      state.ambientWriteEffects.push({ path, node });
    },
  );
}

/**
 * Recognize an ambient name or direct global-object property without a visible
 * source-local overwrite. This is a syntax-local identity fact, not proof that
 * the runtime's globals have never been patched by other code.
 */
export const isUnmodifiedGlobalReference = (
  callee: t.Node,
  state: JavaScriptSemanticAnalysisState,
  name: string,
): boolean => {
  const node = unwrapJavaScriptExpression(callee).node;
  if (state.ambientWrites.covers(["global", name])) return false;
  if (isUnshadowedGlobal(node, state, name)) return true;
  if (!t.isMemberExpression(node) || semanticStaticPropertyKey(node.property, node.computed) !== name) return false;
  const root = unwrapJavaScriptExpression(node.object).node;
  const namespace = globalObjectName(root, state);
  return namespace !== undefined && !state.ambientWrites.covers(["global", namespace]);
};

/** A module URL base is known only while its property has no visible write. */
export const isUnmodifiedImportMetaUrl = (
  node: t.Node | undefined,
  state: JavaScriptSemanticAnalysisState,
): boolean =>
  isImportMetaUrl(node) && !state.ambientWrites.covers(["import-meta", "url"]);
