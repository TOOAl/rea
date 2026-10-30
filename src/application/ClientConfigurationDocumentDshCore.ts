import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import { isDeepStrictEqual } from "node:util";

import {
  parseDshCordisDocument,
  serializeDshDocument,
  editDshDocument,
  dshClientRegistrationEntry,
} from "./DshCordisPatch.js";
import {
  editHermesConfigurationYaml,
  parseHermesConfigurationYaml,
  stringifyHermesConfigurationYaml,
} from "./HermesConfigurationYaml.js";
import {
  applyEdits,
  findNodeAtLocation,
  modify,
  parse as parseJsonc,
  parseTree,
  printParseErrorCode,
  type ParseError,
} from "jsonc-parser";
import { z } from "zod";

import { PRODUCT_IDENTITY } from "../identity.js";
import type { SetupClient } from "./SupportedClients.js";

// ClientConfigurationDocumentDsh.ts 424-866
const tomlStringModeAfter = (
  line: string,
  mode: TomlStringMode,
  start = 0,
): TomlStringMode => {
  if (mode === "ml-basic" || mode === "ml-literal") {
    const delimiter = mode === "ml-basic" ? '"""' : "'''";
    const closed = closeMultiline(line, start, delimiter, mode === "ml-basic");
    if (closed === undefined) return mode;
    return tomlStringModeAfter(line, "none", closed);
  }
  let index = start;
  while (index < line.length) {
    if (line[index] === "#") return "none";
    if (line.startsWith('"""', index)) {
      const closed = closeMultiline(line, index + 3, '"""', true);
      if (closed === undefined) return "ml-basic";
      index = closed;
      continue;
    }
    if (line.startsWith("'''", index)) {
      const closed = closeMultiline(line, index + 3, "'''", false);
      if (closed === undefined) return "ml-literal";
      index = closed;
      continue;
    }
    const quote = line[index];
    if (quote === '"' || quote === "'") {
      const quoted = parseQuotedKey(line, index);
      if (quoted === undefined) return "none";
      index = quoted.next;
      continue;
    }
    index += 1;
  }
  return "none";
};

/** Index after a multiline delimiter, or undefined when this line does not close it. */
const closeMultiline = (
  line: string,
  start: number,
  delimiter: '"""' | "'''",
  escapes: boolean,
): number | undefined => {
  let index = start;
  while (index < line.length) {
    if (escapes && line[index] === "\\") {
      if (line[index + 1] === undefined) return undefined;
      index += 2;
      continue;
    }
    if (line.startsWith(delimiter, index)) {
      // One or two quotes before the closer belong to the string: """keep""""
      let end = index + delimiter.length;
      const quote = delimiter[0];
      let extra = 0;
      while (extra < 2 && line[end] === quote) {
        extra += 1;
        end += 1;
      }
      return end;
    }
    index += 1;
  }
  return undefined;
};

const isBlankOrComment = (line: string): boolean => {
  const trimmed = line.trimStart();
  return trimmed === "" || trimmed.startsWith("#");
};

const looksLikeTomlHeader = (line: string): boolean =>
  line.trimStart().startsWith("[");

/** `mcp_servers.<server>` and tables nested under it, compared by key segment. */
const isTomlServerTable = (
  path: readonly string[],
  serverKey: string,
): boolean => path[0] === "mcp_servers" && path[1] === serverKey;

const parseKeyPath = (
  text: string,
  start: number,
):
  | { readonly segments: readonly string[]; readonly next: number }
  | undefined => {
  const segments: string[] = [];
  let index = start;
  for (;;) {
    index = skipHorizontalSpace(text, index);
    const current = text[index];
    if (current === undefined || current === "\n" || current === "\r")
      return undefined;
    const key =
      current === '"' || current === "'"
        ? parseQuotedKey(text, index)
        : parseBareKey(text, index);
    if (key === undefined) return undefined;
    segments.push(key.value);
    index = skipHorizontalSpace(text, key.next);
    if (text[index] !== ".") return { segments, next: index };
    index += 1;
  }
};

const parseAssignment = (
  line: string,
):
  | { readonly segments: readonly string[]; readonly equals: number }
  | undefined => {
  const key = parseKeyPath(line, 0);
  if (key === undefined) return undefined;
  const equals = skipHorizontalSpace(line, key.next);
  if (line[equals] !== "=") return undefined;
  return { segments: key.segments, equals };
};

const skipWsAndComments = (text: string, start: number): number => {
  let index = start;
  while (index < text.length) {
    const char = text[index];
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      index += 1;
      continue;
    }
    if (char === "#") {
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    return index;
  }
  return index;
};

/** Index after one TOML value. Containers and multiline strings may cross lines. */
const endOfTomlValue = (text: string, start: number): number => {
  const index = skipWsAndComments(text, start);
  if (index >= text.length) return index;
  if (text.startsWith('"""', index)) {
    const closed = closeMultiline(text, index + 3, '"""', true);
    return closed ?? text.length;
  }
  if (text.startsWith("'''", index)) {
    const closed = closeMultiline(text, index + 3, "'''", false);
    return closed ?? text.length;
  }
  const quote = text[index];
  if (quote === '"' || quote === "'") {
    const quoted = parseQuotedKey(text, index);
    return quoted === undefined ? text.length : quoted.next;
  }
  if (quote === "{" || quote === "[") return endOfContainer(text, index);
  let cursor = index;
  while (cursor < text.length) {
    const char = text[cursor];
    if (
      char === "\n" ||
      char === "#" ||
      char === "," ||
      char === "}" ||
      char === "]"
    )
      break;
    cursor += 1;
  }
  return cursor;
};

const endOfContainer = (text: string, open: number): number => {
  const closers: string[] = [text[open] === "{" ? "}" : "]"];
  let index = open + 1;
  while (index < text.length && closers.length > 0) {
    if (text.startsWith('"""', index)) {
      const closed = closeMultiline(text, index + 3, '"""', true);
      if (closed === undefined) return text.length;
      index = closed;
      continue;
    }
    if (text.startsWith("'''", index)) {
      const closed = closeMultiline(text, index + 3, "'''", false);
      if (closed === undefined) return text.length;
      index = closed;
      continue;
    }
    const quote = text[index];
    if (quote === '"' || quote === "'") {
      const quoted = parseQuotedKey(text, index);
      if (quoted === undefined) return text.length;
      index = quoted.next;
      continue;
    }
    if (quote === "#") {
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (quote === "{" || quote === "[") {
      closers.push(quote === "{" ? "}" : "]");
      index += 1;
      continue;
    }
    if (quote === closers[closers.length - 1]) {
      closers.pop();
      index += 1;
      continue;
    }
    index += 1;
  }
  return index;
};

/** TOML basic string. JSON leaves U+007F raw, which TOML rejects. */
const tomlBasicString = (value: string): string =>
  JSON.stringify(value).replaceAll("\u007f", "\\u007f");
