import { isDeepStrictEqual } from "node:util";

import {
  serializeDshDocument,
  dshClientRegistrationEntry,
} from "./DshCordisPatch.js";
import {
  editHermesConfigurationYaml,
  stringifyHermesConfigurationYaml,
} from "./HermesConfigurationYaml.js";
import {
  applyEdits,
  findNodeAtLocation,
  modify,
  parseTree,
  type ParseError,
} from "jsonc-parser";
import { z } from "zod";

import { PRODUCT_IDENTITY } from "../identity.js";

// ClientConfigurationDocumentServers.ts 1287-1565
const deleteJsonPropertyPreservingComments = (
  text: string,
  path: readonly string[],
): string | undefined => {
  const root = parseTree(text, [], { allowTrailingComma: true });
  const value =
    root === undefined ? undefined : findNodeAtLocation(root, [...path]);
  const property = value?.parent;
  const parent = property?.parent;
  if (
    property === undefined ||
    parent?.type !== "object" ||
    property.type !== "property" ||
    parent.children === undefined
  )
    return undefined;
  const propertyIndex = parent.children.indexOf(property);
  const previous = parent.children[propertyIndex - 1];
  if (propertyIndex <= 0 || previous === undefined) return undefined;
  const comments = commentsBetweenProperties(
    text.slice(previous.offset + previous.length, property.offset),
  );
  if (comments === undefined) return undefined;
  let removeEnd = property.offset + property.length;
  const hasNext = parent.children[propertyIndex + 1] !== undefined;
  if (hasNext) {
    let comma = removeEnd;
    while (comma < text.length) {
      const char = text[comma];
      if (char === " " || char === "\t" || char === "\r" || char === "\n") {
        comma += 1;
        continue;
      }
      if (text.startsWith("/*", comma)) {
        const close = text.indexOf("*/", comma + 2);
        if (close < 0) return undefined;
        comma = close + 2;
        continue;
      }
      if (text.startsWith("//", comma)) {
        while (
          comma < text.length &&
          text[comma] !== "\n" &&
          text[comma] !== "\r"
        )
          comma += 1;
        continue;
      }
      break;
    }
    if (text[comma] !== ",") return undefined;
    removeEnd = comma + 1;
  }
  // A line comment runs to the next break. Keep the following token outside it.
  const remainder = text.slice(removeEnd);
  let suffix = `${hasNext ? "," : ""}${comments}`;
  if (
    suffix.includes("//") &&
    !suffix.endsWith("\n") &&
    !suffix.endsWith("\r") &&
    !remainder.startsWith("\n") &&
    !remainder.startsWith("\r")
  )
    suffix += "\n";
  return `${text.slice(0, previous.offset + previous.length)}${suffix}${remainder}`;
};

/** Serialize a validated client document, retaining JSONC and TOML comments. */
export const serializeClientConfiguration = (
  document: Record<string, unknown>,
  format: ClientConfigurationFormat | undefined,
  originalText?: string,
  editedPaths?: readonly (readonly string[])[],
): string => {
  if (format === undefined || format === "unsupported")
    throw new TypeError("client does not have a supported MCP config format");
  if (format === "toml")
    return serializeCodexConfiguration(document, originalText);
  if (format === "grok")
    return serializeGrokConfiguration(document, originalText);
  if (format === "hermes")
    return serializeHermesConfiguration(document, originalText);
  if (format === "dsh") return serializeDshDocument(document);
  // An empty original holds no comments or settings to preserve. Writing a
  // fresh document also keeps a lone BOM from shifting past the closing brace.
  if (
    originalText !== undefined &&
    !isEmptyClientConfigurationText(originalText) &&
    editedPaths !== undefined
  )
    return editedPaths.reduce((text, path) => {
      const value = valueAt(document, path);
      if (value === undefined) {
        const preserved = deleteJsonPropertyPreservingComments(text, path);
        if (preserved !== undefined) return preserved;
      }
      return applyEdits(
        text,
        modify(text, [...path], value, {
          formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
        }),
      );
    }, originalText);
  return `${JSON.stringify(document, null, 2)}\n`;
};

/** Key path of a named registration in the server table. */
export const clientServerPath = (
  parsed: ClientConfigurationDocument,
  name: string,
): string[] => [...parsed.serversPath, name];

/** Key path of a present OpenCode V1 entry beside a native V2 table. */
export const legacyClientServerPath = (
  parsed: ClientConfigurationDocument,
  name: string,
): string[] | undefined =>
  Object.hasOwn(parsed.legacyServers, name)
    ? [parsed.serversPath[0] ?? "mcp", name]
    : undefined;

/**
 * Keep an existing Hermes `config.yaml` intact aside from the REA server entry.
 * Hermes config files carry user comments and unrelated settings, so the rea
 * entry is upserted into the parsed YAML document (which retains formatting and
 * comments) rather than re-serializing the whole object.
 */
const serializeHermesConfiguration = (
  document: Record<string, unknown>,
  originalText: string | undefined,
): string => {
  if (
    originalText === undefined ||
    isEmptyClientConfigurationText(originalText)
  )
    return stringifyHermesConfigurationYaml(document);
  const serversKey = clientConfigurationServersKey("hermes");
  const servers = document[serversKey];
  const entry =
    typeof servers === "object" && servers !== null
      ? (servers as Record<string, unknown>)[PRODUCT_IDENTITY.mcpServerKey]
      : undefined;
  return editHermesConfigurationYaml(
    originalText,
    [serversKey, PRODUCT_IDENTITY.mcpServerKey],
    entry,
  );
};

/** Build the stdio entry shape expected by one client's configuration dialect. */
export const clientRegistrationEntry = (
  format: ClientRegistrationDialect,
  command: readonly string[],
  environment: Readonly<Record<string, string>>,
): Record<string, unknown> => {
  const [executable = "rea", ...args] = command;
  switch (format) {
    case "opencode":
      return {
        type: "local",
        command: [...command],
        enabled: true,
        ...(Object.keys(environment).length === 0
          ? {}
          : { environment: { ...environment } }),
      };
    case "kimi":
      // Kimi infers stdio from command; it uses `transport`, not `type`.
      return {
        command: executable,
        args,
        ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
      };
    case "opencode_v2":
      // V2 connects servers unless `disabled` is true.
      return {
        type: "local",
        command: [...command],
        ...(Object.keys(environment).length === 0
          ? {}
          : { environment: { ...environment } }),
      };
    case "vscode":
    case "omp":
    case "pi":
      return {
        type: "stdio",
        command: executable,
        args,
        ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
      };
    case "copilot_cli":
      return {
        type: "stdio",
        command: executable,
        args,
        tools: ["*"],
        ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
      };
    case "commandcode":
      return {
        transport: "stdio",
        enabled: true,
        command: executable,
        args,
        ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
      };
    case "dsh":
      return dshClientRegistrationEntry(command, environment);
    case "hermes":
      // Hermes reads stdio servers from `mcp_servers.<name>` and connects them
      // unless `enabled` is false, so the entry states it explicitly.
      return {
        command: executable,
        args,
        ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
        enabled: true,
      };
    default:
      return {
        command: executable,
        args,
        ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
      };
  }
};

/** Parse one Gemini policy at its source boundary before consolidating scopes. */
export const parseGeminiMcpPolicy = (parsed: ClientConfigurationDocument) =>
  z
    .object({
      allowed: z.array(z.string()).optional(),
      excluded: z.array(z.string()).optional(),
    })
    .passthrough()
    .parse(parsed.document.mcp ?? {});

/** One server-name comparison for the exclusion, intersection and membership rules below. */
const normalizeGeminiServerName = (name: string): string =>
  name.toLowerCase().trim();

/** Gemini consolidates excludes by union and allowlists by normalized intersection. */
export const geminiServerPolicyBlock = (
  policies: readonly ReturnType<typeof parseGeminiMcpPolicy>[],
  serverKey: string,
): string | undefined => {
  // Hand-authored settings cannot be assumed to spell the product key exactly,
  // so every rule compares normalized names. Testing the consolidated list
  // against the raw key instead would make the outcome depend on which policy
  // supplied the spelling that survived the intersection.
  const key = normalizeGeminiServerName(serverKey);
  if (
    policies.some(({ excluded }) =>
      excluded?.some((name) => normalizeGeminiServerName(name) === key),
    )
  )
    return `Gemini mcp.excluded blocks ${serverKey}. Review the selected settings policies before rerunning setup.`;
  const allowlists = policies.flatMap(({ allowed }) =>
    allowed === undefined ? [] : [allowed],
  );
  const allowed = allowlists.reduce<string[] | undefined>(
    (previous, current) => {
      if (previous === undefined) return current;
      const normalized = new Set(current.map(normalizeGeminiServerName));
      return previous.filter((name) =>
        normalized.has(normalizeGeminiServerName(name)),
      );
    },
    undefined,
  );
  // Gemini's manager applies the consolidated allowlist only when nonempty.
  if (
    allowed !== undefined &&
    allowed.length > 0 &&
    !allowed.some((name) => normalizeGeminiServerName(name) === key)
  )
    return `Gemini mcp.allowed does not include ${serverKey}. Review the selected settings policies before rerunning setup.`;
  return undefined;
};
