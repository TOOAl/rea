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
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

export type ClientConfigurationFormat = NonNullable<SetupClient["format"]>;
export type ClientServersKey = "mcp_servers" | "mcpServers" | "mcp" | "servers";

/**
 * Registration entry dialect. OpenCode V2 reads V1 `mcp.<name>` entries, but a
 * document already using the native `mcp.servers` table takes native entries.
 */
export type ClientRegistrationDialect =
  | ClientConfigurationFormat
  | "opencode_v2";

/** Validated client document and its server table, preserving unrelated settings. */
export interface ClientConfigurationDocument {
  readonly document: Record<string, unknown>;
  /** Server table that registrations are written to. */
  readonly servers: Record<string, unknown>;
  /** Key path of `servers` in `document`. */
  readonly serversPath: readonly string[];
  readonly dialect: ClientRegistrationDialect;
  /**
   * OpenCode V1 server members beside a native V2 `mcp.servers` table. OpenCode
   * still loads them, and a native entry with the same name takes precedence.
   */
  readonly legacyServers: Record<string, unknown>;
}

const objectSchema = z.record(z.string(), z.unknown());

/** Compare parsed configuration values without depending on parser prototypes. */
export const clientConfigurationValuesEqual = (
  left: unknown,
  right: unknown,
): boolean =>
  isDeepStrictEqual(
    normalizeConfigurationValue(left),
    normalizeConfigurationValue(right),
  );

const normalizeConfigurationValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeConfigurationValue);
  if (typeof value !== "object" || value === null || value instanceof Date)
    return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
      .map(([key, nested]) => [key, normalizeConfigurationValue(nested)]),
  );
};

/** Return the top-level object used for MCP server registrations by a client. */
export const clientConfigurationServersKey = (
  format: ClientConfigurationFormat,
): ClientServersKey => {
  switch (format) {
    case "toml":
    case "grok":
    case "hermes":
      return "mcp_servers";
    case "opencode":
    case "zcode":
      return "mcp";
    case "vscode":
      return "servers";
    default:
      return "mcpServers";
  }
};

/**
 * Whether raw configuration text holds no settings to preserve. Some clients
 * create a zero-byte config file before any server is added.
 */
const isEmptyClientConfigurationText = (text: string): boolean =>
  text.replace(/^\uFEFF/, "").trim() === "";

const parseDocument = (
  text: string,
  format: ClientConfigurationFormat,
): Record<string, unknown> => {
  if (format === "toml" || format === "grok")
    return requireObject(parseToml(text), "The configuration root");
  // Pi loads `mcp.json` with a strict `JSON.parse` and no BOM tolerance, so
  // comments, trailing commas, a BOM, or an empty existing file must be
  // rejected instead of registering into a document the client cannot load.
  // Kimi also reads mcp.json with JSON.parse and an empty-file fallback.
  if (format === "pi" || format === "kimi") {
    if (format === "kimi" && text.trim().length === 0) return {};
    return requireObject(JSON.parse(text), "The configuration root");
  }
  // An empty file, which some clients create before any server is added,
  // holds no settings to preserve.
  if (isEmptyClientConfigurationText(text)) return {};
  // Hermes stores MCP servers in `mcp_servers` inside a YAML document.
  if (format === "hermes")
    return requireObject(
      parseHermesConfigurationYaml(text),
      "The configuration root",
    );
  // ZCode loads nonempty native files with strict JSON.parse.
  if (format === "zcode")
    return requireObject(JSON.parse(text), "The configuration root");
  const errors: ParseError[] = [];
  // Accept a UTF-8 BOM without shifting diagnostics or editing the original text.
  const jsonText = text.startsWith("\uFEFF") ? ` ${text.slice(1)}` : text;
  const document = parseJsonc(jsonText, errors, { allowTrailingComma: true });
  const firstError = errors[0];
  if (firstError !== undefined)
    throw new SyntaxError(
      `Invalid JSON/JSONC at offset ${firstError.offset}: ${printParseErrorCode(firstError.error)}`,
    );
  return requireObject(document, "The configuration root");
};

/** A parsed configuration whose structure, not its syntax, cannot hold MCP servers. */
export class ClientConfigurationShapeError extends TypeError {}

/** Validate and copy own properties, excluding non-record YAML values and parser-injected prototypes. */
const requireObject = (
  value: unknown,
  description: string,
): Record<string, unknown> => {
  const parsed = objectSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new ClientConfigurationShapeError(`${description} must be an object`, {
    cause: parsed.error,
  });
};

/** ZCode reads the same-scope fallback as strict JSON with a mcpServers table. */
export const parseZcodeFallbackConfiguration = (
  text: string,
): ClientConfigurationDocument => {
  const document = requireObject(JSON.parse(text), "ZCode fallback root");
  return {
    document,
    servers:
      document.mcpServers === undefined
        ? {}
        : requireObject(document.mcpServers, "ZCode fallback mcpServers"),
    serversPath: ["mcpServers"],
    dialect: "zcode_fallback",
    legacyServers: {},
  };
};

/** Members of OpenCode V2's `mcp` object that are not server names. */
const OPENCODE_V2_MCP_SETTINGS = new Set(["servers", "timeout"]);

/** Parse a client document and reject malformed roots or MCP server tables. */
export const parseClientConfiguration = (
  text: string,
  format: ClientConfigurationFormat | undefined,
): ClientConfigurationDocument => {
  if (format === undefined || format === "unsupported")
    throw new TypeError("client does not have a supported MCP config format");
  // DeepSeek Harness stores a Cordis patch list, not a server table.
  if (format === "zcode_fallback") return parseZcodeFallbackConfiguration(text);
  if (format === "dsh") return parseDshCordisDocument(text);
  const document = parseDocument(text, format);
  const serversKey = clientConfigurationServersKey(format);
  const value = document[serversKey];
  const servers =
    value === undefined ? {} : requireObject(value, `"${serversKey}"`);
  // ZCode reads stdio servers from the nested `mcp.servers` table of
  // `~/.zcode/cli/config.json`; entries carry `command`, `args`, and `env`.
  if (format === "zcode") {
    const nested = servers.servers;
    return {
      document,
      servers:
        nested === undefined
          ? {}
          : requireObject(nested, `"${serversKey}.servers"`),
      serversPath: [serversKey, "servers"],
      dialect: format,
      legacyServers: {},
    };
  }
  const native = servers.servers;
  // A V1 server named `servers` has a string `type` discriminator; the V2
  // table may instead hold a server object named `type`.
  if (
    format !== "opencode" ||
    native === undefined ||
    (typeof native === "object" &&
      native !== null &&
      "type" in native &&
      typeof native.type === "string")
  )
    return {
      document,
      servers,
      serversPath: [serversKey],
      dialect: format,
      legacyServers: {},
    };
  return {
    document,
    servers: requireObject(native, `"${serversKey}.servers"`),
    serversPath: [serversKey, "servers"],
    dialect: "opencode_v2",
    legacyServers: Object.fromEntries(
      Object.entries(servers).filter(
        ([name]) => !OPENCODE_V2_MCP_SETTINGS.has(name),
      ),
    ),
  };
};

/** The registration a client loads for `name`, including OpenCode V1 entries. */
export const effectiveClientServer = (
  parsed: ClientConfigurationDocument,
  name: string,
): unknown =>
  Object.hasOwn(parsed.servers, name)
    ? parsed.servers[name]
    : parsed.legacyServers[name];

/**
 * Return `parsed.document` with `servers` at its server table. A legacy OpenCode
 * V1 member named in `removeLegacy` is removed beside a native V2 table.
 */
export const withClientServers = (
  parsed: ClientConfigurationDocument,
  servers: Record<string, unknown>,
  removeLegacy?: string,
): Record<string, unknown> => {
  // The Harness patch list upserts or removes by entry id, not by table.
  if (parsed.dialect === "dsh")
    return Object.hasOwn(servers, PRODUCT_IDENTITY.mcpServerKey)
      ? editDshDocument(
          parsed,
          objectSchema.parse(servers[PRODUCT_IDENTITY.mcpServerKey]),
        )
      : editDshDocument(parsed);
  const [key = "", nested] = parsed.serversPath;
  if (nested === undefined) return { ...parsed.document, [key]: servers };
  // A fresh document may not hold the outer table yet (for example a new
  // ZCode `config.json` without an `mcp` object), so treat absence as empty.
  const outerValue = parsed.document[key];
  const outer =
    outerValue === undefined ? {} : { ...objectSchema.parse(outerValue) };
  if (
    parsed.dialect === "opencode_v2" &&
    removeLegacy !== undefined &&
    !OPENCODE_V2_MCP_SETTINGS.has(removeLegacy)
  )
    delete outer[removeLegacy];
  return { ...parsed.document, [key]: { ...outer, [nested]: servers } };
};

/** Read the value at a key path, or `undefined` when any member is absent. */
const valueAt = (
  document: Record<string, unknown>,
  path: readonly string[],
): unknown => {
  let current: unknown = document;
  for (const key of path) {
    const object = objectSchema.safeParse(current);
    if (!object.success || !Object.hasOwn(object.data, key)) return undefined;
    current = object.data[key];
  }
  return current;
};

type TomlStringMode = "none" | "ml-basic" | "ml-literal";

const TOML_BASIC_ESCAPES: Readonly<Record<string, string>> = {
  b: "\b",
  t: "\t",
  n: "\n",
  f: "\f",
  r: "\r",
  e: "\u001b",
  '"': '"',
  "\\": "\\",
};

/** A `[table]` or `[[array]]` header outside strings, with decoded key segments. */
interface TomlTableHeader {
  readonly path: readonly string[];
}

const skipHorizontalSpace = (line: string, index: number): number => {
  let next = index;
  while (line[next] === " " || line[next] === "\t") next += 1;
  return next;
};

const decodeBasicEscape = (
  line: string,
  slash: number,
): { readonly value: string; readonly next: number } | undefined => {
  const escape = line[slash + 1];
  if (escape === undefined) return undefined;
  const simple = TOML_BASIC_ESCAPES[escape];
  if (simple !== undefined) return { value: simple, next: slash + 2 };
  // smol-toml accepts `\xHH` even though TOML 1.0 does not.
  if (escape === "x") {
    const hex = line.slice(slash + 2, slash + 4);
    if (!/^[0-9A-Fa-f]{2}$/u.test(hex)) return undefined;
    return {
      value: String.fromCodePoint(Number.parseInt(hex, 16)),
      next: slash + 4,
    };
  }
  if (escape !== "u" && escape !== "U") return undefined;
  const length = escape === "u" ? 4 : 8;
  const hex = line.slice(slash + 2, slash + 2 + length);
  if (!new RegExp(`^[0-9A-Fa-f]{${String(length)}}$`, "u").test(hex))
    return undefined;
  const code = Number.parseInt(hex, 16);
  if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return undefined;
  return { value: String.fromCodePoint(code), next: slash + 2 + length };
};

/** Read one single-line quoted key. Multiline quotes are not a header key. */
const parseQuotedKey = (
  line: string,
  start: number,
): { readonly value: string; readonly next: number } | undefined => {
  const quote = line[start];
  if (
    (quote !== '"' && quote !== "'") ||
    line.startsWith(quote === '"' ? '"""' : "'''", start)
  )
    return undefined;
  if (quote === "'") {
    const end = line.indexOf("'", start + 1);
    if (end < 0 || line.slice(start + 1, end).includes("\n")) return undefined;
    return { value: line.slice(start + 1, end), next: end + 1 };
  }
  let value = "";
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    if (char === "\n" || char === "\r") return undefined;
    if (char === '"') return { value, next: index + 1 };
    if (char !== "\\") {
      value += char ?? "";
      index += 1;
      continue;
    }
    const decoded = decodeBasicEscape(line, index);
    if (decoded === undefined) return undefined;
    value += decoded.value;
    index = decoded.next;
  }
  return undefined;
};

const parseBareKey = (
  line: string,
  start: number,
): { readonly value: string; readonly next: number } | undefined => {
  let index = start;
  while (/[A-Za-z0-9_-]/u.test(line[index] ?? "")) index += 1;
  if (index === start) return undefined;
  return { value: line.slice(start, index), next: index };
};

/**
 * Parse a table header. Quoted segments stay one key, so `mcp_servers."rea.env"`
 * is not the dotted path `mcp_servers.rea.env`.
 */
const parseTomlTableHeader = (line: string): TomlTableHeader | undefined => {
  let index = skipHorizontalSpace(line, 0);
  const array = line.startsWith("[[", index);
  if (!array && line[index] !== "[") return undefined;
  index += array ? 2 : 1;
  const path: string[] = [];
  for (;;) {
    index = skipHorizontalSpace(line, index);
    const key =
      line[index] === '"' || line[index] === "'"
        ? parseQuotedKey(line, index)
        : parseBareKey(line, index);
    if (key === undefined) return undefined;
    path.push(key.value);
    index = skipHorizontalSpace(line, key.next);
    if (line[index] !== ".") break;
    index += 1;
  }
  const close = array ? "]]" : "]";
  if (!line.startsWith(close, index)) return undefined;
  index = skipHorizontalSpace(line, index + close.length);
  if (index < line.length && line[index] !== "#") return undefined;
  return { path };
};

/**
 * String state after one physical line, starting at `start`. A multiline
 * closer does not end the scan: `""", """` closes one string and opens another.
 */
