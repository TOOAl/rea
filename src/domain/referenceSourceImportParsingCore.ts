import type {
  CallExpression,
  ImportExpression,
  Node,
  StringLiteral,
} from "@babel/types";
import {
  parseRecoveredJavaScript,
  parserPluginsForPath,
} from "./javascript/javascriptSourceParser.js";
import { isRelativeJavaScriptModuleSpecifier } from "./javascript/javascriptModuleSpecifier.js";
import {
  isCallExpression,
  isExportAllDeclaration,
  isExportNamedDeclaration,
  isImport,
  isImportDeclaration,
  isMemberExpression,
  isStringLiteral,
  isTSExternalModuleReference,
  isTSImportEqualsDeclaration,
  isTSModuleDeclaration,
} from "@babel/types";

type ReferenceSourceImportKind =
  | "imports"
  | "requires"
  | "references"
  | "declares-module";

type ReferenceSourceImportResolution =
  | "internal"
  | "external"
  | "unresolved"
  | "unknown";

type ReferenceSourceImportParseState = "parsed" | "partial" | "unknown";

interface ReferenceSourceImportRelationship {
  readonly from_path: string;
  readonly to: string;
  readonly kind: ReferenceSourceImportKind;
  readonly resolution: ReferenceSourceImportResolution;
  readonly parse_state: ReferenceSourceImportParseState;
}

interface ReferenceSourceParseFailure {
  readonly path: string;
  readonly parser: string;
  readonly reason: string;
}

export interface ReferenceSourceImportParseResult {
  readonly relationships: readonly ReferenceSourceImportRelationship[];
  readonly parse_failures: readonly ReferenceSourceParseFailure[];
  readonly limitations: readonly string[];
}

export const PARSEABLE_REFERENCE_SOURCE_LANGUAGES: ReadonlySet<string> =
  new Set(["JavaScript", "TypeScript", "JSX", "TSX"]);

const safeModuleName = (node: Node | null | undefined): string | undefined => {
  if (isStringLiteral(node)) return node.value;
  return undefined;
};

const resolveSpecifier = (
  specifier: string,
): ReferenceSourceImportResolution => {
  if (
    isRelativeJavaScriptModuleSpecifier(specifier) ||
    specifier.startsWith("/")
  )
    return "internal";
  return "external";
};

const isModuleExpression = (
  expression: Node | null | undefined,
): expression is StringLiteral | CallExpression =>
  isStringLiteral(expression) || isCallExpression(expression);

const moduleSpecifierFromExpression = (
  expression: Node | null | undefined,
):
  | { specifier: string; parseState: ReferenceSourceImportParseState }
  | undefined => {
  if (isStringLiteral(expression))
    return { specifier: expression.value, parseState: "parsed" };
  if (
    isCallExpression(expression) &&
    isImport(expression.callee) &&
    expression.arguments.length > 0
  ) {
    const first = expression.arguments[0];
    if (isStringLiteral(first)) {
      return { specifier: first.value, parseState: "parsed" };
    }
    return { specifier: "<dynamic-import>", parseState: "partial" };
  }
  return undefined;
};

const appendRelationship = (
  relationships: ReferenceSourceImportRelationship[],
  input: {
    readonly fromPath: string;
    readonly to: string | undefined;
    readonly kind: ReferenceSourceImportKind;
    readonly parseState: ReferenceSourceImportParseState;
    readonly resolution?: ReferenceSourceImportResolution;
  },
): void => {
  if (input.to === undefined) return;
  relationships.push({
    from_path: input.fromPath,
    to: input.to,
    kind: input.kind,
    resolution: input.resolution ?? resolveSpecifier(input.to),
    parse_state: input.parseState,
  });
};

const extractImportDeclarations = (
  body: readonly Node[],
  from_path: string,
  relationships: ReferenceSourceImportRelationship[],
): void => {
  for (const statement of body) {
    if (isImportDeclaration(statement)) {
      appendRelationship(relationships, {
        fromPath: from_path,
        to: safeModuleName(statement.source),
        kind: "imports",
        parseState: "parsed",
      });
      continue;
    }

    if (isExportNamedDeclaration(statement)) {
      if (statement.source !== null && statement.source !== undefined) {
        appendRelationship(relationships, {
          fromPath: from_path,
          to: safeModuleName(statement.source),
          kind: "imports",
          parseState: "parsed",
        });
      }
      continue;
    }

    if (isExportAllDeclaration(statement)) {
      appendRelationship(relationships, {
        fromPath: from_path,
        to: safeModuleName(statement.source),
        kind: "imports",
        parseState: "parsed",
      });
      continue;
    }

    if (isTSImportEqualsDeclaration(statement)) {
      const reference = statement.moduleReference;
      if (isTSExternalModuleReference(reference)) {
        appendRelationship(relationships, {
          fromPath: from_path,
          to: safeModuleName(reference.expression),
          kind: "requires",
          parseState: "parsed",
        });
      }
      continue;
    }

    if (isTSModuleDeclaration(statement)) {
      if (statement.declare === true && isStringLiteral(statement.id)) {
        appendRelationship(relationships, {
          fromPath: from_path,
          to: statement.id.value,
          kind: "declares-module",
          parseState: "parsed",
          resolution: "unknown",
        });
      }
    }
  }
};
