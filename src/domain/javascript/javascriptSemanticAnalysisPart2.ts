import * as t from "@babel/types";
import type { JavaScriptSemanticAnalysisState } from "./javascriptSemanticState.js";
import { traverseJavaScriptAstSteps } from "./javascriptSemanticTraversal.js";
import { semanticRequireOrigin } from "./javascriptSemanticRequireOrigin.js";
import { semanticBundledRequireOrigin } from "./javascriptBundledRequireOrigin.js";
import { evaluateSemanticProvenance } from "./javascriptSemanticValues.js";
import {
  collectJavaScriptIdentityWritesSteps,
  electronExportPath,
  electronMemberPath,
  ELECTRON_MODULE,
} from "./javascriptElectronMemberWrites.js";
import { createSemanticModuleInterop } from "./javascriptModuleInterop.js";
import { SemanticPropertyPathCoverage } from "./javascriptSemanticPropertyPaths.js";
import { semanticStableInitializer } from "./javascriptSemanticState.js";

export function* indexJavaScriptElectronIdentitySteps(
  program: t.Program,
  state: JavaScriptSemanticAnalysisState,
): Generator<void, JavaScriptElectronIdentity> {
  const facts = new Map<number, readonly string[]>();
  const interop = createSemanticModuleInterop(state);
  const writes = new SemanticPropertyPathCoverage();
  let collectedWrites = false;
  const exportsByBinding = new Map<string, readonly string[] | null>();
  const rootExport = (root: t.Node): readonly string[] | undefined => {
    if (t.isIdentifier(root)) {
      const b = (() => {
        for (const s of state.bindingsById.values())
          if (s.name === (root as t.Identifier).name) return s;
        return undefined;
      })();
      if (b === undefined) return undefined;
      let exported = exportsByBinding.get(b.bindingId);
      if (exported === undefined) {
        exported = electronExport(b, state, interop);
        exportsByBinding.set(b.bindingId, exported);
      }
      return collectedWrites && interop.invalidated(b)
        ? undefined
        : (exported ?? undefined);
    }
    const wrapped = interop.callOrigin(root);
    const origin =
      wrapped === undefined
        ? electronRequireOrigin(root, state)?.origin
        : collectedWrites && interop.invalidatedCall(root)
          ? undefined
          : wrapped.origin;
    return origin !== undefined && ELECTRON_MODULE.test(origin.specifier)
      ? electronExportPath(origin.importedPath)
      : undefined;
  };
  yield* collectJavaScriptIdentityWritesSteps(
    program,
    (node, kind) => {
      if (kind === "opaque-call") return [interop.opaqueMutationPath(node)];
      const { root, members } = electronMemberPath(node);
      const exported = kind === "binding" ? undefined : rootExport(root);
      const path =
        exported === undefined
          ? (interop.intrinsicPath(root) ??
            (kind === "member"
              ? interop.boundIntrinsic(root)?.path
              : undefined))
          : ["electron", ...exported];
      return path === undefined ? [] : [[...path, ...members]];
    },
    interop.intrinsicInvocation,
    interop.staticString,
    interop.isFreshObject,
    (node, path) => {
      if (path[0] === "electron") writes.retain(path);
      else interop.retainWrite(node, path);
    },
  );
  collectedWrites = true;
  const intactExport = (path: readonly (string | null)[]): boolean =>
    ELECTRON_MODULE.test(path[0] ?? "") &&
    !writes.covers(["electron", ...path.slice(1)]);
  yield* traverseJavaScriptAstSteps(program, {
    enter: (node) => {
      if (
        !t.isCallExpression(node) &&
        !t.isOptionalCallExpression(node) &&
        !t.isNewExpression(node)
      )
        return;
      const { root, members } = electronMemberPath(node.callee);
      const exported = rootExport(root);
      if (
        exported !== undefined &&
        intactExport(["electron", ...exported, ...members])
      )
        facts.set(root.start ?? -1, exported);
    },
  });
  return { bindings: facts, intactExport, exportPath: rootExport };
}

const electronExport = (
  binding: import("./javascriptSemanticState.js").JavaScriptSemanticBindingState,
  state: JavaScriptSemanticAnalysisState,
  interop: ReturnType<typeof createSemanticModuleInterop>,
): readonly string[] | null => {
  const reassigned = binding.definitions.some(
    ({ kind }) => kind === "assignment",
  );
  const converted = interop.origin(binding);
  if (reassigned && converted === undefined) return null;
  const directOrigin = converted?.origin ?? bindingOrigin(binding, state);
  const initializer = semanticStableInitializer(binding, state);
  if (directOrigin === undefined && initializer === undefined) return null;
  const provenance =
    directOrigin === undefined
      ? evaluateSemanticProvenance(binding, state)
      : undefined;
  const origin =
    directOrigin ??
    (provenance?.status === "module" && provenance.origins.length === 1
      ? provenance.origins[0]
      : undefined);
  return origin !== undefined && ELECTRON_MODULE.test(origin.specifier)
    ? electronExportPath(origin.importedPath)
    : null;
};
const electronRequireOrigin = (
  node: t.Node,
  state: JavaScriptSemanticAnalysisState,
) =>
  semanticRequireOrigin(node, state) ??
  semanticBundledRequireOrigin(node, state);
const bindingOrigin = (
  binding: import("./javascriptSemanticState.js").JavaScriptSemanticBindingState,
  state: JavaScriptSemanticAnalysisState,
): import("./javascriptSemanticIr.js").JavaScriptModuleOrigin | undefined => {
  if (binding.directOrigins.length > 0)
    return binding.directOrigins.length === 1
      ? binding.directOrigins[0]
      : undefined;
  const initializer = semanticStableInitializer(binding, state);
  if (initializer === undefined) return undefined;
  const origin = electronRequireOrigin(initializer.node, state)?.origin;
  const projection = initializer.projection;
  return origin === undefined ||
    !projection.every((key): key is string => typeof key === "string")
    ? undefined
    : { ...origin, importedPath: [...origin.importedPath, ...projection] };
};
