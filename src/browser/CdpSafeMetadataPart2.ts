import { sanitizeBrowserUrl } from "../domain/browserObservation.js";

const parseLinks = (
  value: string | undefined,
  baseUrl: string,
  allowedOrigins: ReadonlySet<string>,
): LinkMetadata[] => {
  const links: LinkMetadata[] = [];
  for (const entry of splitLinkHeader(value ?? "")) {
    const match = /^\s*<([^>]*)>(.*)$/u.exec(entry);
    if (match === null) continue;
    const parameters = linkParameters(match[2] ?? "");
    const destination = safeDestination(
      match[1] ?? "",
      baseUrl,
      allowedOrigins,
    );
    links.push({
      href: destination.url,
      destination_scope: destination.scope,
      rel: (parameters.get("rel") ?? "")
        .toLowerCase()
        .split(/\s+/u)
        .filter(Boolean),
      as: boundedHeader(parameters.get("as")),
      type: boundedHeader(parameters.get("type")),
      crossorigin: boundedHeader(parameters.get("crossorigin")),
    });
  }
  return links;
};

const splitLinkHeader = (
  value: string,
  delimiter: "," | ";" = ",",
): string[] => {
  const entries: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  let target = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"' && !target) quoted = true;
    else if (delimiter === "," && character === "<") target = true;
    else if (delimiter === "," && character === ">") target = false;
    else if (character === delimiter && !target) {
      entries.push(value.slice(start, index));
      start = index + 1;
    }
  }
  entries.push(value.slice(start));
  return entries;
};

const linkParameters = (value: string): ReadonlyMap<string, string> => {
  const parameters = new Map<string, string>();
  for (const raw of splitLinkHeader(value, ";").slice(1)) {
    const separator = raw.indexOf("=");
    const name = (separator < 0 ? raw : raw.slice(0, separator))
      .trim()
      .toLowerCase();
    if (!/^[a-z][a-z0-9\x2d]*$/u.test(name)) continue;
    const parameter = separator < 0 ? "" : raw.slice(separator + 1).trim();
    parameters.set(name, unquote(parameter));
  }
  return parameters;
};

const safeDestination = (
  value: string,
  baseUrl: string,
  allowedOrigins: ReadonlySet<string>,
): {
  readonly url: string | null;
  readonly scope: LinkMetadata["destination_scope"];
} => {
  try {
    const parsed = new URL(value, baseUrl);
    const sanitized = sanitizeBrowserUrl(parsed.href).url;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return { url: sanitized, scope: "unsupported" };
    if (!allowedOrigins.has(parsed.origin))
      return { url: sanitized, scope: "outside_policy" };
    return { url: sanitized, scope: "approved" };
  } catch (cause: unknown) {
    // Unparseable link values keep their raw text for the analyst.
    void cause;
    return { url: value, scope: "unsupported" };
  }
};

const permissionFeatures = (value: string | undefined): string[] =>
  [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((entry) => entry.split("=", 1)[0]?.trim().toLowerCase() ?? "")
        .filter((feature) => /^[a-z][a-z0-9\x2d]*$/u.test(feature)),
    ),
  ].sort();

const wellKnownHint = (url: string): AgentHint[] => {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return wellKnownAgentPaths.has(path)
      ? [agentHint("well_known_resource", path, sanitizeBrowserUrl(url).url)]
      : [];
  } catch (cause: unknown) {
    // Non-URL input yields no well-known hint.
    void cause;
    return [];
  }
};

const agentHint = (
  mechanism: AgentHint["mechanism"],
  declaration: string,
  url: string | null,
): AgentHint => ({
  mechanism,
  declaration,
  url,
  trust: "page-declared-untrusted",
});

const isAgentRel = (value: string): boolean =>
  ["mcp", "model-context", "ai-plugin", "service-desc"].includes(value);

const referrerPolicies = new Set([
  "no-referrer",
  "no-referrer-when-downgrade",
  "same-origin",
  "origin",
  "strict-origin",
  "origin-when-cross-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
]);

const referrerPolicy = (value: string | undefined): string | null => {
  let policy: string | null = null;
  for (const raw of (value ?? "").split(",")) {
    const token = raw.trim().toLowerCase();
    if (token === "") continue;
    if (!/^[a-z\x2d]+$/u.test(token)) return null;
    if (referrerPolicies.has(token)) policy = token;
  }
  return policy;
};

const policyToken = (value: string | undefined): string | null => {
  const token = (value ?? "").trim().toLowerCase();
  return /^[a-z][a-z0-9_.\x2d]*$/u.test(token) ? token : null;
};

// RFC 9110 section 8.6: Content-Length = 1*DIGIT. Other spellings declare no length.
const contentLength = (value: string | undefined): number | null => {
  const token = (value ?? "").trim();
  if (!/^[0-9]+$/u.test(token)) return null;
  const length = Number(token);
  return Number.isSafeInteger(length) ? length : null;
};

const boundedHeader = (value: string | undefined): string | null =>
  value === undefined ? null : value.trim().toLowerCase();

const unquote = (value: string): string =>
  value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;

const agentHeaderNames = ["x-model-context", "x-webmcp", "mcp-server"] as const;
const wellKnownAgentPaths: ReadonlySet<string> = new Set([
  "/.well-known/ai-plugin.json",
  "/.well-known/mcp",
  "/.well-known/model-context",
]);
