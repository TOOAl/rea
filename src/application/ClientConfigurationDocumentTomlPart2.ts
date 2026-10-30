import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

import { PRODUCT_IDENTITY } from "../identity.js";

// ClientConfigurationDocumentToml.ts 867-1286

const tomlServerEntry = (
  document: Record<string, unknown>,
  serverKey: string,
): unknown => {
  const servers = objectSchema.safeParse(document.mcp_servers);
  if (!servers.success || !Object.hasOwn(servers.data, serverKey))
    return undefined;
  return servers.data[serverKey];
};

/** Whether Grok Build's root disable list names `serverKey`. */
export const grokServerListedDisabled = (
  document: Record<string, unknown>,
  serverKey: string,
): boolean =>
  Array.isArray(document.disabled_mcp_servers) &&
  document.disabled_mcp_servers.includes(serverKey);

/**
 * OMP's user `disabledServers` denylist hides a server by name regardless of
 * its entry, so a listed REA registration is not loaded.
 */
export const OMP_DISABLED_SERVERS_KEY = "disabledServers";

/** Whether OMP's root `disabledServers` denylist names `serverKey`. */
export const ompServerListedDisabled = (
  document: Record<string, unknown>,
  serverKey: string,
): boolean => {
  const listed = document[OMP_DISABLED_SERVERS_KEY];
  return Array.isArray(listed) && listed.includes(serverKey);
};

/** OMP's user `enabledServers` allowlist overrides an entry's `enabled: false`. */
const OMP_ENABLED_SERVERS_KEY = "enabledServers";

/**
 * Whether OMP's allowlist forces `serverKey` on despite its entry's
 * `enabled: false`. The `disabledServers` denylist still wins over it.
 */
export const clientServerForcedEnabled = (
  parsed: ClientConfigurationDocument,
  serverKey: string,
): boolean => {
  if (parsed.dialect !== "omp") return false;
  const listed = parsed.document[OMP_ENABLED_SERVERS_KEY];
  return Array.isArray(listed) && listed.includes(serverKey);
};

/** Whether a client's own disable list suppresses `serverKey`. */
export const clientServerListedDisabled = (
  parsed: ClientConfigurationDocument,
  serverKey: string,
): boolean =>
  (parsed.dialect === "grok" &&
    grokServerListedDisabled(parsed.document, serverKey)) ||
  (parsed.dialect === "omp" &&
    ompServerListedDisabled(parsed.document, serverKey));

/** Keep an existing Grok document intact aside from the REA server tables. */
const serializeGrokConfiguration = (
  document: Record<string, unknown>,
  originalText: string | undefined,
): string => {
  const entry = tomlServerEntry(document, PRODUCT_IDENTITY.mcpServerKey);
  if (originalText === undefined) return stringifyToml(document);
  return upsertTomlServerSection(
    originalText,
    PRODUCT_IDENTITY.mcpServerKey,
    entry,
    "grok",
  );
};

/** Removing the last server leaves an empty table, which equals an absent one. */
const withoutEmptyServerTable = (
  document: Record<string, unknown>,
): Record<string, unknown> => {
  const servers = objectSchema.safeParse(document.mcp_servers);
  if (!servers.success || Object.keys(servers.data).length > 0) return document;
  const { mcp_servers: empty, ...rest } = document;
  void empty;
  return rest;
};

/**
 * Keep an existing Codex document intact aside from the REA server tables.
 * An edit that would change any other parsed value falls back to a full
 * rewrite, which keeps every value but not comments or spelling.
 */
const serializeCodexConfiguration = (
  document: Record<string, unknown>,
  originalText: string | undefined,
): string => {
  if (
    originalText === undefined ||
    isEmptyClientConfigurationText(originalText)
  )
    return stringifyToml(document);
  const upserted = upsertTomlServerSection(
    originalText,
    PRODUCT_IDENTITY.mcpServerKey,
    tomlServerEntry(document, PRODUCT_IDENTITY.mcpServerKey),
    "toml",
  );
  // Removing a final table also drops the file's last line break.
  const edited =
    originalText.endsWith("\n") && !upserted.endsWith("\n")
      ? `${upserted}${originalText.endsWith("\r\n") ? "\r\n" : "\n"}`
      : upserted;
  return tomlTextHolds(edited, document) ? edited : stringifyToml(document);
};

const tomlTextHolds = (
  text: string,
  document: Record<string, unknown>,
): boolean => {
  try {
    return clientConfigurationValuesEqual(
      withoutEmptyServerTable(objectSchema.parse(parseToml(text))),
      withoutEmptyServerTable(document),
    );
  } catch (cause: unknown) {
    // An unparsable edit is rejected in favor of the full rewrite.
    void cause;
    return false;
  }
};

/** Comments in the trivia between two properties. `undefined` when there are none. */
const commentsBetweenProperties = (gap: string): string | undefined => {
  const pieces: string[] = [];
  let index = 0;
  while (index < gap.length) {
    const line = gap.indexOf("//", index);
    const block = gap.indexOf("/*", index);
    if (line < 0 && block < 0) break;
    const start = line < 0 ? block : block < 0 ? line : Math.min(line, block);
    const lineComment = start === line;
    const close = lineComment
      ? gap.indexOf("\n", start)
      : gap.indexOf("*/", start + 2);
    if (!lineComment && close < 0) return undefined;
    const end = lineComment ? (close < 0 ? gap.length : close) : close + 2;
    const comment = gap.slice(start, end);
    const lineBreak = gap.lastIndexOf("\n", start - 1);
    if (lineBreak < 0) pieces.push(` ${comment}`);
    else {
      const prefix = gap.slice(lineBreak + 1, start);
      let indentEnd = 0;
      while (prefix[indentEnd] === " " || prefix[indentEnd] === "\t")
        indentEnd += 1;
      const newline =
        lineBreak > 0 && gap[lineBreak - 1] === "\r" ? "\r\n" : "\n";
      pieces.push(`${newline}${prefix.slice(0, indentEnd)}${comment}`);
    }
    index = end;
  }
  return pieces.length === 0 ? undefined : pieces.join("");
};

/**
 * Delete an object property without taking a comment from the gap before it.
 * jsonc-parser's removal span includes that gap, so a trailing comment on the
 * previous property would disappear. Returns `undefined` to keep the stock edit.
 */
