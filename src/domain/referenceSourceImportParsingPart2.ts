import type {
  CallExpression,
  File,
  ImportExpression,
  Node,
} from "@babel/types";
import { traverseJavaScriptAst } from "./javascript/javascriptSemanticTraversal.js";
import {
  parseRecoveredJavaScript,
  parserPluginsForPath,
} from "./javascript/javascriptSourceParser.js";
import { unshadowedReferenceSourceRequireCalls } from "./referenceSourceRequireBindings.js";
import {
  isCallExpression,
  isExportNamedDeclaration,
  isIdentifier,
  isImport,
  isImportExpression,
  isMemberExpression,
  isStringLiteral,
  isTSImportEqualsDeclaration,
} from "@babel/types";

const isRequireCallee = (callee: Node | null | undefined): boolean => {
  if (isIdentifier(callee) && callee.name === "require") return true;
  if (
    isMemberExpression(callee) &&
    isIdentifier(callee.object) &&
    callee.object.name === "require" &&
    ((!callee.computed && isIdentifier(callee.property)) ||
      isStringLiteral(callee.property))
  ) {
    const propertyName = isIdentifier(callee.property)
      ? callee.property.name
      : isStringLiteral(callee.property)
        ? callee.property.value
        : undefined;
    return propertyName === "resolve" || propertyName === "main";
  }
  return false;
};

const extractRequireAndDynamicImports = (
  body: readonly Node[],
  from_path: string,
  relationships: ReferenceSourceImportRelationship[],
  unshadowedRequireCalls: ReadonlySet<CallExpression>,
): void => {
  // Single traversal owner: iterative, VISITOR_KEYS-gated, no recursion over
  // loc/comment objects. Survives deeply nested generated member chains that
  // overflowed the previous hand-rolled Object.values walker.
  const expressions: Array<CallExpression | ImportExpression> = [];
  for (const statement of body)
    traverseJavaScriptAst(statement, {
      enter: (node) => {
        if (isCallExpression(node) || isImportExpression(node))
          expressions.push(node);
      },
    });

  for (const call of expressions) {
    if (isImportExpression(call)) {
      const specifier = safeModuleName(call.source);
      appendRelationship(relationships, {
        fromPath: from_path,
        to: specifier ?? "<dynamic-import>",
        kind: "imports",
        parseState: specifier === undefined ? "partial" : "parsed",
        ...(specifier === undefined ? { resolution: "unknown" } : {}),
      });
      continue;
    }
    const first = call.arguments[0];
    if (
      isRequireCallee(call.callee) &&
      unshadowedRequireCalls.has(call) &&
      isModuleExpression(first)
    ) {
      const result = moduleSpecifierFromExpression(first);
      if (result !== undefined) {
        appendRelationship(relationships, {
          fromPath: from_path,
          to: result.specifier,
          kind: "requires",
          parseState: result.parseState,
        });
      }
      continue;
    }

    if (isImport(call.callee) && isModuleExpression(first)) {
      const result = moduleSpecifierFromExpression(first);
      if (result !== undefined) {
        appendRelationship(relationships, {
          fromPath: from_path,
          to: result.specifier,
          kind: "imports",
          parseState: result.parseState,
        });
      }
    }
  }
};

const parseWithBabel = (
  path: string,
  source: string,
  language: string | null,
): {
  ast: File | undefined;
  reasons: readonly string[];
  moduleOnlyErrors: readonly string[];
} => {
  // Single parser-mode owner: path-driven plugins (dts/JSX/mts) shared with
  // the semantic pipeline. `language` only gates non-JS/TS callers upstream;
  // TypeScript syntax must parse identically here and in semantic analysis.
  void language;
  const plugins = parserPluginsForPath(path);

  try {
    const { file: ast, moduleOnlyErrors } = parseRecoveredJavaScript(
      source,
      path,
      {
        allowImportExportEverywhere: false,
        allowReturnOutsideFunction: true,
        allowUndeclaredExports: true,
        plugins,
      },
    );
    return {
      ast,
      reasons: ast.errors.map((error) => error.message),
      moduleOnlyErrors,
    };
  } catch (cause: unknown) {
    return {
      ast: undefined,
      reasons: [cause instanceof Error ? cause.message : "Parse failed"],
      moduleOnlyErrors: [],
    };
  }
};

/** Parse ESM/CommonJS imports and dynamic imports from source bytes. */
export const parseReferenceSourceImports = (
  path: string,
  bytes: Uint8Array,
  language: string | null,
): ReferenceSourceImportParseResult => {
  if (language !== null && !PARSEABLE_REFERENCE_SOURCE_LANGUAGES.has(language))
    return { relationships: [], parse_failures: [], limitations: [] };

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      relationships: [],
      parse_failures: [
        {
          path,
          parser: "utf-8",
          reason:
            "Source bytes are not valid UTF-8; import targets were not parsed.",
        },
      ],
      limitations: [],
    };
  }
  const { ast, reasons, moduleOnlyErrors } = parseWithBabel(
    path,
    source,
    language,
  );
  const limitations =
    moduleOnlyErrors.length === 0
      ? []
      : [
          `Strict-mode errors apply only if this file is an ES module: ${moduleOnlyErrors.join("; ")}`,
        ];
  const parseFailures = reasons.map((reason) => ({
    path,
    parser: "babel",
    reason,
  }));

  if (ast === undefined) {
    return {
      relationships: [],
      parse_failures: parseFailures,
      limitations,
    };
  }

  const relationships: ReferenceSourceImportRelationship[] = [];
  extractImportDeclarations(ast.program.body, path, relationships);
  extractRequireAndDynamicImports(
    ast.program.body,
    path,
    relationships,
    unshadowedReferenceSourceRequireCalls(ast, path),
  );

  return {
    relationships: relationships.map((relationship) => ({
      ...relationship,
      parse_state:
        parseFailures.length > 0 && relationship.parse_state === "parsed"
          ? "partial"
          : relationship.parse_state,
    })),
    parse_failures: parseFailures,
    limitations,
  };
};
