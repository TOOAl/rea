import * as t from "@babel/types";
import { runtimeFunctionParameters } from "./javascriptAstValues.js";
import { javascriptBootstrapAt } from "./javascriptBootstrap.js";
import {
  resolveSemanticBindingState,
  type JavaScriptSemanticAnalysisState,
} from "./javascriptSemanticState.js";
import { semanticFactoryLoaderMemberAt } from "./javascriptSemanticRequireOrigin.js";

import { traverseJavaScriptAst } from "./javascriptSemanticTraversal.js";

import {
  collectJavaScriptExports,
  fingerprintJavaScriptAst,
} from "./javascriptAstFingerprint.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
import { addFindingOnce } from "./javascriptStaticAnalysisFindings.js";
import {
  argumentValue,
  calleeName,
  chunkRuntime,
  factoryRequireName,
  moduleFactory,
  modulePropertyName,
  range,
  registrationKey,
  sha256Text,
  sourceSlice,
  staticArrayValues,
} from "./javascriptStaticAnalysisHelpers.js";
import type { JavaScriptAnalysisAccumulator as AnalysisAccumulator } from "./javascriptStaticAnalysisState.js";
import type {
  JavaScriptBundlerModule,
  JavaScriptBundlerRegistration,
} from "./javascriptStaticAnalysisTypes.js";
import { JAVASCRIPT_AST_FINGERPRINT_ALGORITHM } from "./javascriptStaticAnalysisTypes.js";

/** Inspect a bundler registration call and recover its module table. */
export const inspectBundlerRegistration = (
  source: string,
  call: t.CallExpression,
  accumulator: AnalysisAccumulator,
  bindings: JavaScriptSemanticAnalysisState,
): void => {
  const runtime = chunkRuntime(call);
  const entry = call.arguments[0];
  if (runtime === undefined || !t.isArrayExpression(entry)) return;
  const chunkIds = entry.elements[0];
  const table = entry.elements[1];
  const runtimeValue = runtimeMetadata(
    entry.elements[2],
    bindings,
    accumulator,
  );
  if (!t.isArrayExpression(chunkIds) || !t.isObjectExpression(table)) return;
  const recovered = recoverBundlerModules(source, table, accumulator, {
    runtime,
    bindings,
  });
  const chunkKeys = staticArrayValues(chunkIds);
  accumulator.unknownFindings += chunkKeys.unknown;
  accumulator.unknownFindings +=
    runtimeValue.unknownEntryModuleKeys +
    runtimeValue.unknownAsyncChunkKeys +
    recovered.unknownAsyncChunkKeys;
  const asyncChunkKeys = uniqueValues([
    ...runtimeValue.asyncChunkKeys,
    ...recovered.asyncChunkKeys,
  ]);
  const registration: JavaScriptBundlerRegistration = {
    bundler: runtime.toLowerCase().includes("rspack")
      ? ("rspack" as const)
      : ("webpack" as const),
    runtime,
    chunk_keys: chunkKeys.values,
    unknown_chunk_keys: chunkKeys.unknown,
    runtime_require_name: runtimeValue.requireName,
    // A name appearing in the source does not establish cache behavior or
    // associate it with this registration. Until the analyzed runtime body
    // proves cache reads and writes, preserve the honest unknown state.
    runtime_module_cache_status: "not-observed",
    entry_module_keys: runtimeValue.entryModuleKeys,
    unknown_entry_module_keys: runtimeValue.unknownEntryModuleKeys,
    async_chunk_keys: asyncChunkKeys.values,
    unknown_async_chunk_keys:
      runtimeValue.unknownAsyncChunkKeys + recovered.unknownAsyncChunkKeys,
    modules: recovered.modules.sort((left, right) =>
      compareUnicodeCodePoints(left.module_key, right.module_key),
    ),
    location: range(call),
  };
  addFindingOnce(
    accumulator,
    `registration\0${registrationKey(registration)}`,
    () => accumulator.registrations.push(registration),
  );
};

/** Recover standalone Webpack tables whose factories are called by a local loader. */
export const inspectBundlerBootstrap = (
  source: string,
  call: t.CallExpression,
  accumulator: AnalysisAccumulator,
  bindings: JavaScriptSemanticAnalysisState,
): void => {
  const bootstrap = javascriptBootstrapAt(call, bindings);
  if (bootstrap === undefined) return;
  const runtime = `webpack-bootstrap@${String(call.start ?? 0)}`;
  const recovered = recoverBundlerModules(
    source,
    bootstrap.table,
    accumulator,
    { runtime, bindings },
  );
  const entries: string[] = [];
  let unknownEntries = 0;
  traverseJavaScriptAst(bootstrap.body, {
    enter: (node, _parent, ancestors) => {
      if (
        !t.isCallExpression(node) ||
        ancestors().some((node) => t.isFunction(node)) ||
        !t.isIdentifier(node.callee) ||
        resolveSemanticBindingState(bindings, node.callee, node.callee.name)
          ?.bindingId !== bootstrap.loaderBindingId
      )
        return;
      const value = argumentValue(node.arguments[0]);
      if (value === undefined) unknownEntries++;
      else entries.push(value);
    },
  });
  const registration: JavaScriptBundlerRegistration = {
    bundler: "webpack",
    runtime,
    chunk_keys: [`bootstrap@${String(call.start ?? 0)}`],
    unknown_chunk_keys: 0,
    runtime_require_name: bootstrap.loaderName,
    runtime_module_cache_status: "not-observed",
    entry_module_keys: uniqueValues(entries).values,
    unknown_entry_module_keys: unknownEntries,
    async_chunk_keys: recovered.asyncChunkKeys,
    unknown_async_chunk_keys: recovered.unknownAsyncChunkKeys,
    modules: recovered.modules.sort((left, right) =>
      compareUnicodeCodePoints(left.module_key, right.module_key),
    ),
    location: range(call),
  };
  accumulator.unknownFindings +=
    unknownEntries + recovered.unknownAsyncChunkKeys;
  addFindingOnce(
    accumulator,
    `registration\0${registrationKey(registration)}`,
    () => accumulator.registrations.push(registration),
  );
};

/** Inspect esbuild helper wrappers and recover their literal module tables. */
export const inspectEsbuildWrapper = (
  source: string,
  call: t.CallExpression,
  accumulator: AnalysisAccumulator,
  bindings: JavaScriptSemanticAnalysisState,
): void => {
  const name = calleeName(call.callee);
  const wrapperKind =
    name === "__commonJS" || name.endsWith(".__commonJS")
      ? "commonjs"
      : name === "__esm" || name.endsWith(".__esm")
        ? "esm"
        : null;
  const table = call.arguments[0];
  if (wrapperKind === null || !t.isObjectExpression(table)) return;
  const runtime = `esbuild-${wrapperKind}`;
  const recovered = recoverBundlerModules(source, table, accumulator, {
    runtime,
    bindings,
  });
  if (recovered.modules.length === 0) return;
  accumulator.unknownFindings += recovered.unknownAsyncChunkKeys;
  const registration: JavaScriptBundlerRegistration = {
    bundler: "esbuild",
    runtime,
    chunk_keys: [`${wrapperKind}@${String(call.start ?? 0)}`],
    unknown_chunk_keys: 0,
    runtime_require_name: null,
    runtime_module_cache_status: "not-observed",
    entry_module_keys: [],
    unknown_entry_module_keys: 0,
    async_chunk_keys: recovered.asyncChunkKeys,
    unknown_async_chunk_keys: recovered.unknownAsyncChunkKeys,
    modules: recovered.modules.sort((left, right) =>
      compareUnicodeCodePoints(left.module_key, right.module_key),
    ),
    location: range(call),
  };
  addFindingOnce(
    accumulator,
    `registration\0${registrationKey(registration)}`,
    () => accumulator.registrations.push(registration),
  );
};

interface RecoveredBundlerModules {
  readonly modules: JavaScriptBundlerModule[];
  readonly asyncChunkKeys: readonly string[];
  readonly unknownAsyncChunkKeys: number;
}

interface BundlerRecoveryContext {
  readonly runtime: string;
  readonly bindings: JavaScriptSemanticAnalysisState;
}
