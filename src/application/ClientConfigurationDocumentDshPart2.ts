import { parse as parseToml } from "smol-toml";

import {
  editHermesConfigurationYaml,
  parseHermesConfigurationYaml,
  stringifyHermesConfigurationYaml,
} from "./HermesConfigurationYaml.js";
import { z } from "zod";

import type { SetupClient } from "./SupportedClients.js";

// ClientConfigurationDocumentDsh.ts 424-866

const tomlInlineKey = (key: string): string =>
  /^[A-Za-z0-9_-]+$/u.test(key) ? key : tomlBasicString(key);

const tomlInlineValue = (value: unknown): string => {
  if (typeof value === "string") return tomlBasicString(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value))
    return `[${value.map((item) => tomlInlineValue(item)).join(", ")}]`;
  if (typeof value === "object" && value !== null) {
    const body = Object.entries(value)
      .map(
        ([key, nested]) => `${tomlInlineKey(key)} = ${tomlInlineValue(nested)}`,
      )
      .join(", ");
    return `{ ${body} }`;
  }
  return '""';
};

interface InlinePair {
  readonly leading: string;
  readonly text: string;
  readonly drop: boolean;
}

const readTrivia = (
  text: string,
  start: number,
  limit: number,
): { readonly text: string; readonly next: number } => {
  let index = start;
  while (index < limit) {
    const char = text[index];
    if (
      char === " " ||
      char === "\t" ||
      char === "\n" ||
      char === "\r" ||
      char === ","
    ) {
      index += 1;
      continue;
    }
    if (char === "#") {
      while (index < limit && text[index] !== "\n") index += 1;
      continue;
    }
    break;
  }
  return { text: text.slice(start, index), next: index };
};

const commasOutsideComments = (trivia: string): string =>
  trivia
    .split("\n")
    .map((part) => {
      const comment = part.indexOf("#");
      if (comment < 0) return part.replaceAll(",", "");
      return `${part.slice(0, comment).replaceAll(",", "")}${part.slice(comment)}`;
    })
    .join("\n");

const hasSeparatorComma = (trivia: string): boolean =>
  trivia.split("\n").some((part) => {
    const comment = part.indexOf("#");
    const code = comment < 0 ? part : part.slice(0, comment);
    return code.includes(",");
  });

/**
 * Replace or remove `serverKey` inside one `{ ... }` table. A closed inline
 * table cannot later grow a `[mcp_servers.rea]` header.
 */
const editInlineServerTable = (
  table: string,
  serverKey: string,
  entry: unknown,
): string | undefined => {
  if (!table.startsWith("{")) return undefined;
  const end = endOfContainer(table, 0);
  if (table[end - 1] !== "}") return undefined;
  const pairs: InlinePair[] = [];
  let index = 1;
  let trailing = "";
  while (index < end - 1) {
    const trivia = readTrivia(table, index, end - 1);
    if (trivia.next >= end - 1) {
      trailing = trivia.text;
      break;
    }
    const key = parseKeyPath(table, trivia.next);
    if (key === undefined) return undefined;
    const equals = skipWsAndComments(table, key.next);
    if (table[equals] !== "=") return undefined;
    const valueEnd = endOfTomlValue(table, equals + 1);
    if (valueEnd > end - 1) return undefined;
    pairs.push({
      leading: trivia.text,
      text: table.slice(trivia.next, valueEnd),
      drop: key.segments[0] === serverKey,
    });
    index = valueEnd;
  }
  const insertion =
    entry === undefined
      ? undefined
      : `${tomlInlineKey(serverKey)} = ${tomlInlineValue(entry)}`;
  if (insertion === undefined && pairs.every((pair) => !pair.drop))
    return table;
  return rebuildInlineTable(pairs, trailing, insertion);
};

const rebuildInlineTable = (
  pairs: readonly InlinePair[],
  trailing: string,
  insertion: string | undefined,
): string => rebuildDelimitedEntries(pairs, trailing, insertion, "{", "}");

/**
 * Rebuild `{ ... }` or `[ ... ]` after dropping entries. An empty container
 * keeps comment trivia; a table with no comments stays `{}`.
 */
const rebuildDelimitedEntries = (
  pairs: readonly InlinePair[],
  trailing: string,
  insertion: string | undefined,
  open: "{" | "[",
  close: "}" | "]",
): string => {
  const parts: string[] = [open];
  let emitted = false;
  // A comma already emitted in a dropped pair's comment trivia.
  let separatorPending = false;
  for (const pair of pairs) {
    if (pair.drop) {
      if (!pair.leading.includes("#")) continue;
      // A separator already emitted must not be repeated for the next field.
      const dropped: string =
        !emitted || separatorPending
          ? commasOutsideComments(pair.leading)
          : pair.leading;
      parts.push(dropped);
      separatorPending = separatorPending || hasSeparatorComma(dropped);
      continue;
    }
    const kept = emitted ? pair.leading : commasOutsideComments(pair.leading);
    parts.push(separatorPending ? commasOutsideComments(kept) : kept);
    if (emitted && !separatorPending && !pair.leading.includes(","))
      parts.push(", ");
    separatorPending = false;
    parts.push(pair.text);
    emitted = true;
  }
  if (insertion !== undefined) {
    if (!(emitted && separatorPending)) parts.push(emitted ? ", " : " ");
    parts.push(insertion);
    emitted = true;
  }
  if (!emitted) {
    const retained = `${parts.slice(1).join("")}${commasOutsideComments(trailing)}`;
    return retained.includes("#")
      ? `${open}${retained}${close}`
      : `${open}${close}`;
  }
  const tail = commasOutsideComments(trailing);
  parts.push(tail);
  if (tail === "" && open === "{") parts.push(" ");
  parts.push(close);
  return parts.join("");
};

/**
 * Decoded TOML string, or undefined when the token is not a string.
 * The document parser accepts multiline basic and literal strings.
 */
const tomlStringValue = (text: string): string | undefined => {
  try {
    const value = parseToml(`value = ${text}`)["value"];
    return typeof value === "string" ? value : undefined;
  } catch (cause: unknown) {
    void cause;
    return undefined;
  }
};

/**
 * Array text with `serverKey` removed. `""` means the assignment itself can
 * be deleted. Undefined when the array cannot be edited safely.
 */
const tomlArrayWithoutString = (
  array: string,
  serverKey: string,
): string | undefined => {
  if (!array.startsWith("[")) return undefined;
  const end = endOfContainer(array, 0);
  if (end !== array.length || array[end - 1] !== "]") return undefined;
  const pairs: InlinePair[] = [];
  let index = 1;
  let trailing = "";
  while (index < end - 1) {
    const trivia = readTrivia(array, index, end - 1);
    if (trivia.next >= end - 1) {
      trailing = trivia.text;
      break;
    }
    const valueEnd = endOfTomlValue(array, trivia.next);
    if (valueEnd > end - 1) return undefined;
    const text = array.slice(trivia.next, valueEnd);
    pairs.push({
      leading: trivia.text,
      text,
      drop: tomlStringValue(text) === serverKey,
    });
    index = valueEnd;
  }
  if (pairs.every((pair) => !pair.drop)) return array;
  const rebuilt = rebuildDelimitedEntries(pairs, trailing, undefined, "[", "]");
  return rebuilt === "[]" ? "" : rebuilt;
};

type DisabledServerListEdit =
  | { readonly kind: "ignore" }
  | { readonly kind: "keep" }
  | { readonly kind: "delete"; readonly comment: string | undefined }
  | { readonly kind: "replace"; readonly text: string };
