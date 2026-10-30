import * as t from "@babel/types";

import { javascriptBootstrapAt } from "./javascriptBootstrap.js";
import { proveJavaScriptBootstrapIntegrity } from "./javascriptBootstrapIntegrity.js";
import {
  semanticStaticPropertyKey,
  unwrapJavaScriptExpression,
} from "./javascriptAstValues.js";
import { collectJavaScriptIdentityWritesSteps } from "./javascriptElectronMemberWrites.js";
import { createSemanticModuleInterop } from "./javascriptModuleInterop.js";
import {
  semanticMemberChain,
  semanticRequireOrigin,
  type JavaScriptRequireOrigin,
} from "./javascriptSemanticRequireOrigin.js";
import {
  resolveSemanticBindingState,
  semanticResolutionBlocked,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";
import {
  argumentValue,
  moduleFactory,
  modulePropertyName,
} from "./javascriptStaticAnalysisHelpers.js";
import {
  completeSemanticSteps,
  traverseJavaScriptAst,
} from "./javascriptSemanticTraversal.js";

/** Loader bindings and literal externals proven for one standalone bootstrap. */
interface BootstrapExternals {
  /** The runtime loader and every factory parameter it is passed as. */
  readonly loaderBindingIds: ReadonlySet<string>;
  /** Loader bindings with the canonical n.n getter installed before dispatch. */
  readonly interopGetterBindingIds: ReadonlySet<string>;
  /** Table keys whose factory only re-exports one unshadowed literal require; null when a key repeats. */
  readonly externals: ReadonlyMap<string, string | null>;
}

const proofs = new WeakMap<
  JavaScriptSemanticAnalysisState,
  WeakMap<t.CallExpression, BootstrapExternals | null>
>();

/**
 * Recover a literal require reached through a proven Webpack bootstrap.
 *
 * Webpack emits externals as `{45840: e => { e.exports = require("electron") }}`
 * and consumers call the runtime loader, `n(45840)`, instead of `require`. The
 * origin is accepted only when the loader binding is the bootstrap's own loader
 * or a factory parameter that the bootstrap proves it passes the loader as, and
 * the keyed factory consists solely of that re-export.
 */
export const semanticBundledRequireOrigin = (
  node: t.Node | null | undefined,
  state: JavaScriptSemanticAnalysisState,
): JavaScriptRequireOrigin | undefined => {
  const chain = semanticMemberChain(node);
  const current = chain?.root;
  if (
    chain?.members.length === 0 &&
    t.isCallExpression(current) &&
    t.isMemberExpression(current.callee) &&
    semanticStaticPropertyKey(
      current.callee.property,
      current.callee.computed,
    ) === "n" &&
    t.isIdentifier(current.callee.object) &&
    current.arguments.length === 1
  ) {
    // Webpack's `n.n(module)` returns its default-export getter. For a
    // CommonJS external, invoking that getter yields the exact exports object;
    // bind its identity to the proven registry result while retaining the
    // nested loader call as the source of provenance.
    const nested = semanticBundledRequireOrigin(current.arguments[0], state);
    const loaderBinding = resolveSemanticBindingState(
      state,
      current.callee.object,
      current.callee.object.name,
    );
    const proof =
      nested === undefined || loaderBinding === undefined
        ? undefined
        : bootstrapProofForLoaderCall(
            nested.call,
            loaderBinding.bindingId,
            state,
          );
    const nestedCallee = nested?.call.callee;
    const loaderBindingId = loaderBinding?.bindingId;
    if (
      nested !== undefined &&
      nested.origin.importedPath.length === 0 &&
      t.isIdentifier(nestedCallee) &&
      loaderBindingId !== undefined &&
      loaderBindingId ===
        resolveSemanticBindingState(state, nestedCallee, nestedCallee.name)
          ?.bindingId &&
      proof?.loaderBindingIds.has(loaderBindingId) === true &&
      proof.interopGetterBindingIds.has(loaderBindingId)
    )
      return nested;
  }
  if (
    chain === undefined ||
    !t.isCallExpression(current) ||
    !t.isIdentifier(current.callee) ||
    current.arguments.length !== 1
  )
    return undefined;
  const key = argumentValue(current.arguments[0]);
  if (key === undefined) return undefined;
  const loader = current.callee;
  if (semanticResolutionBlocked(state, loader, loader.name)) return undefined;
  const binding = resolveSemanticBindingState(state, loader, loader.name);
  if (
    binding === undefined ||
    binding.definitions.length !== 1 ||
    binding.definitions[0]?.kind === "assignment"
  )
    return undefined;
  for (
    let ancestor = state.parentsByNode.get(current);
    ancestor !== undefined;
    ancestor = state.parentsByNode.get(ancestor)
  ) {
    if (!t.isCallExpression(ancestor)) continue;
    const proof = bootstrapExternals(ancestor, state);
    if (proof === null || !proof.loaderBindingIds.has(binding.bindingId))
      continue;
    const specifier = proof.externals.get(key);
    return typeof specifier === "string"
      ? {
          origin: {
            specifier,
            importedPath: chain.members,
            resolutionMode: "require",
          },
          call: current,
        }
      : undefined;
  }
  return undefined;
};

/** Prove the source-local n.n getter and reject visible replacements. */
const canonicalWebpackInteropBindings = (
  loaderBindingIds: ReadonlySet<string>,
  bootstrapBody: t.BlockStatement,
  state: JavaScriptSemanticAnalysisState,
): ReadonlySet<string> => {
  // The shared identity-write owner covers assignment, delete, destructuring,
  // and Object/Reflect mutators; any write that may select `n` counts.
  const writes = new Set<t.Node>();
  const interop = createSemanticModuleInterop(state);
  completeSemanticSteps(
    collectJavaScriptIdentityWritesSteps(
      state.program,
      (root, kind) => {
        const node = unwrapJavaScriptExpression(root).node;
        return kind === "member" &&
          t.isIdentifier(node) &&
          loaderBindingIds.has(
            resolveSemanticBindingState(state, node, node.name)?.bindingId ??
              "",
          )
          ? [["loader"]]
          : [];
      },
      interop.intrinsicInvocation,
      interop.staticString,
      interop.isFreshObject,
      (node, path) => {
        if (path.length < 2 || path[1] === "n" || path[1] === null)
          writes.add(node);
      },
    ),
  );
  const proven = new Set<string>();
  const [write] = writes;
  if (
    writes.size === 1 &&
    t.isAssignmentExpression(write) &&
    isInstalledBeforeEntryDispatch(
      write,
      bootstrapBody,
      loaderBindingIds,
      state,
    ) &&
    isCanonicalGetter(write, state)
  )
    for (const bindingId of loaderBindingIds) proven.add(bindingId);
  return proven;
};

const isCanonicalGetter = (
  write: t.AssignmentExpression,
  state: JavaScriptSemanticAnalysisState,
): boolean => {
  if (
    !t.isArrowFunctionExpression(write.right) ||
    write.right.params.length !== 1 ||
    !t.isIdentifier(write.right.params[0])
  )
    return false;
  const parameter = write.right.params[0];
  const parameterBinding = resolveSemanticBindingState(
    state,
    parameter,
    parameter.name,
  );
  const body = write.right.body;
  return (
    parameterBinding !== undefined &&
    t.isConditionalExpression(body) &&
    t.isLogicalExpression(body.test, { operator: "&&" }) &&
    sameBinding(body.test.left, parameterBinding.bindingId, state) &&
    t.isMemberExpression(body.test.right) &&
    semanticStaticPropertyKey(
      body.test.right.property,
      body.test.right.computed,
    ) === "__esModule" &&
    sameBinding(body.test.right.object, parameterBinding.bindingId, state) &&
    getterReturnsDefault(body.consequent, parameterBinding.bindingId, state) &&
    getterReturnsModule(body.alternate, parameterBinding.bindingId, state)
  );
};
