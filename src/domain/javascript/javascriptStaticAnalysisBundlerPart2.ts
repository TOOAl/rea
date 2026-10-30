import * as t from "@babel/types";
import { runtimeFunctionParameters } from "./javascriptAstValues.js";
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
import {
  argumentValue,
  chunkRuntime,
  factoryRequireName,
  moduleFactory,
  modulePropertyName,
  range,
  sha256Text,
  sourceSlice,
} from "./javascriptStaticAnalysisHelpers.js";
import type { JavaScriptAnalysisAccumulator as AnalysisAccumulator } from "./javascriptStaticAnalysisState.js";
import type { JavaScriptBundlerModule } from "./javascriptStaticAnalysisTypes.js";
import { JAVASCRIPT_AST_FINGERPRINT_ALGORITHM } from "./javascriptStaticAnalysisTypes.js";

/** Inspect a bundler registration call and recover its module table. */

const recoverBundlerModules = (
  source: string,
  table: t.ObjectExpression,
  accumulator: AnalysisAccumulator,
  context: BundlerRecoveryContext,
): RecoveredBundlerModules => {
  const modules: JavaScriptBundlerModule[] = [];
  const asyncChunkKeys: string[] = [];
  let unknownAsyncChunkKeys = 0;
  for (const property of table.properties) {
    const recovered = recoverBundlerModule(
      source,
      property,
      accumulator,
      context,
    );
    if (recovered === null) continue;
    modules.push(recovered.module);
    asyncChunkKeys.push(...recovered.asyncChunkKeys);
    unknownAsyncChunkKeys += recovered.unknownAsyncChunkKeys;
  }
  return {
    modules,
    asyncChunkKeys,
    unknownAsyncChunkKeys,
  };
};

const recoverBundlerModule = (
  source: string,
  property: t.ObjectMethod | t.ObjectProperty | t.SpreadElement,
  accumulator: AnalysisAccumulator,
  context: BundlerRecoveryContext,
): {
  readonly module: JavaScriptBundlerModule;
  readonly asyncChunkKeys: readonly string[];
  readonly unknownAsyncChunkKeys: number;
} | null => {
  const { runtime, bindings } = context;
  const factory = moduleFactory(property);
  if (factory === undefined) return null;
  const key = modulePropertyName(property);
  if (key.startsWith("[computed@") || key.startsWith("[unknown@"))
    accumulator.unknownFindings += 1;
  const fingerprint = fingerprintJavaScriptAst(factory);
  const exportsValue = collectJavaScriptExports(factory, bindings);
  const requireName = factoryRequireName(factory);
  const requireParameter = runtimeFunctionParameters(factory)[2];
  const requireBindingId = t.isIdentifier(requireParameter)
    ? (resolveSemanticBindingState(
        bindings,
        requireParameter,
        requireParameter.name,
      )?.bindingId ?? null)
    : null;
  if (requireBindingId !== null)
    accumulator.factoryRequireBindingIds.add(requireBindingId);
  const asyncChunks = collectBundlerAsyncChunkKeys(
    factory,
    requireBindingId,
    bindings,
  );
  if (typeof factory.start === "number" && typeof factory.end === "number") {
    const moduleRange = {
      start: factory.start,
      end: factory.end,
      key,
      runtime,
      requireName,
    };
    accumulator.moduleRangeIndex.add(moduleRange);
  }
  return {
    module: {
      module_key: key,
      factory_require_name: requireName,
      source_sha256: sha256Text(sourceSlice(source, factory)),
      structural_fingerprint_sha256: fingerprint,
      structural_fingerprint_algorithm: JAVASCRIPT_AST_FINGERPRINT_ALGORITHM,
      exports: exportsValue.values,
      location: range(factory),
    },
    asyncChunkKeys: asyncChunks.values,
    unknownAsyncChunkKeys: asyncChunks.unknown,
  };
};

interface RuntimeMetadata {
  readonly requireName: string | null;
  readonly entryModuleKeys: readonly string[];
  readonly unknownEntryModuleKeys: number;
  readonly asyncChunkKeys: readonly string[];
  readonly unknownAsyncChunkKeys: number;
}

interface StaticValues {
  readonly values: readonly string[];
  readonly unknown: number;
}

type BundlerFunction =
  | t.FunctionExpression
  | t.ArrowFunctionExpression
  | t.ObjectMethod;

const runtimeMetadata = (
  node: t.Node | null | undefined,
  bindings: JavaScriptSemanticAnalysisState,
  accumulator: AnalysisAccumulator,
): RuntimeMetadata => {
  if (!isBundlerFunction(node))
    return {
      requireName: null,
      entryModuleKeys: [],
      unknownEntryModuleKeys: node === null || node === undefined ? 0 : 1,
      asyncChunkKeys: [],
      unknownAsyncChunkKeys: 0,
    };
  const parameter = runtimeFunctionParameters(node)[0];
  const requireName = t.isIdentifier(parameter) ? parameter.name : null;
  const requireBindingId = t.isIdentifier(parameter)
    ? (resolveSemanticBindingState(bindings, parameter, parameter.name)
        ?.bindingId ?? null)
    : null;
  if (requireBindingId !== null)
    accumulator.factoryRequireBindingIds.add(requireBindingId);
  if (requireName === null)
    return {
      requireName,
      entryModuleKeys: [],
      unknownEntryModuleKeys: 1,
      asyncChunkKeys: [],
      unknownAsyncChunkKeys: 0,
    };
  const entries = collectBundlerCallArgumentValues(
    node,
    requireBindingId,
    bindings,
    null,
  );
  const asyncChunks = collectBundlerCallArgumentValues(
    node,
    requireBindingId,
    bindings,
    "e",
  );
  return {
    requireName,
    entryModuleKeys: entries.values,
    unknownEntryModuleKeys: entries.unknown,
    asyncChunkKeys: asyncChunks.values,
    unknownAsyncChunkKeys: asyncChunks.unknown,
  };
};

const collectBundlerAsyncChunkKeys = (
  factory: BundlerFunction,
  requireBindingId: string | null,
  bindings: JavaScriptSemanticAnalysisState,
): StaticValues =>
  requireBindingId === null
    ? { values: [], unknown: 0 }
    : collectBundlerCallArgumentValues(
        factory,
        requireBindingId,
        bindings,
        "e",
      );

const collectBundlerCallArgumentValues = (
  factory: BundlerFunction,
  bindingId: string | null,
  bindings: JavaScriptSemanticAnalysisState,
  member: string | null,
): StaticValues => {
  if (bindingId === null) return { values: [], unknown: 0 };
  const values: string[] = [];
  let unknown = 0;
  const bindingIds = new Set([bindingId]);
  traverseJavaScriptAst(factory, {
    enter: (node) => {
      if (!t.isCallExpression(node) && !t.isNewExpression(node))
        return undefined;
      const loader = semanticFactoryLoaderMemberAt(
        node,
        bindings,
        bindingIds,
        member,
      );
      if (loader === undefined) return undefined;
      if (loader === "unknown") {
        unknown += 1;
        return undefined;
      }
      const value = argumentValue(node.arguments[0]);
      if (value === undefined) unknown += 1;
      else values.push(value);
      return undefined;
    },
  });
  return uniqueValues(values, unknown);
};

const isBundlerFunction = (
  node: t.Node | null | undefined,
): node is BundlerFunction =>
  t.isFunctionExpression(node) ||
  t.isArrowFunctionExpression(node) ||
  t.isObjectMethod(node);

const uniqueValues = (values: readonly string[], unknown = 0): StaticValues => {
  const unique = [...new Set(values)].sort(compareUnicodeCodePoints);
  return {
    values: unique,
    unknown,
  };
};
