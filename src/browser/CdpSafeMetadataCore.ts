import type { WebPageInspection } from "../domain/browserObservationSchemas.js";
import { cdpStringValue, type UnknownRecord } from "./CdpCaptureValues.js";

type ResponseMetadata = WebPageInspection["metadata"]["responses"][number];
type LinkMetadata = ResponseMetadata["links"][number];
type AgentHint = WebPageInspection["metadata"]["agent_hints"][number];

/** Normalize an allowlisted subset of response metadata and discard raw headers. */
export const safeResponseMetadata = (
  requestId: string,
  url: string,
  response: UnknownRecord,
  allowedOrigins: ReadonlySet<string>,
): {
  readonly response: ResponseMetadata;
  readonly agentHints: AgentHint[];
} => {
  const headers = normalizedHeaders(response.headers);
  const links = parseLinks(headers.get("link"), url, allowedOrigins);
  const csp = parseCsp(
    headers.get("content-security-policy"),
    url,
    allowedOrigins,
  );
  const agentHints = [
    ...links.flatMap((link) =>
      link.rel.some(isAgentRel)
        ? [agentHint("link_rel", link.rel.join(" "), link.href)]
        : [],
    ),
    ...agentHeaderNames.flatMap((name) =>
      headers.has(name) ? [agentHint("response_header", name, null)] : [],
    ),
    ...wellKnownHint(url),
  ];
  return {
    response: {
      request_id: requestId,
      url,
      mime_type: boundedHeader(cdpStringValue(response.mimeType)),
      content_length: contentLength(headers.get("content-length")),
      content_encoding: boundedHeader(headers.get("content-encoding")),
      csp,
      links,
      policies: {
        coop: policyToken(headers.get("cross-origin-opener-policy")),
        coep: policyToken(headers.get("cross-origin-embedder-policy")),
        corp: policyToken(headers.get("cross-origin-resource-policy")),
        referrer_policy: referrerPolicy(headers.get("referrer-policy")),
        x_content_type_options: policyToken(
          headers.get("x-content-type-options"),
        ),
        permissions_policy_features: permissionFeatures(
          headers.get("permissions-policy"),
        ),
      },
    },
    agentHints,
  };
};

const normalizedHeaders = (value: unknown): ReadonlyMap<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return new Map();
  const headers = new Map<string, string>();
  for (const [name, raw] of Object.entries(value)) {
    const normalized = name.toLowerCase();
    const header =
      typeof raw === "string"
        ? raw
        : typeof raw === "number" && Number.isFinite(raw)
          ? String(raw)
          : undefined;
    if (header !== undefined) headers.set(normalized, header);
  }
  return headers;
};

const parseCsp = (
  value: string | undefined,
  baseUrl: string,
  allowedOrigins: ReadonlySet<string>,
): ResponseMetadata["csp"] => {
  const directives: ResponseMetadata["csp"]["directives"] = [];
  let nonceCount = 0;
  let hashCount = 0;
  for (const rawDirective of (value ?? "").split(";")) {
    const [rawName, ...tokens] = rawDirective.trim().split(/\s+/u);
    const name = (rawName ?? "").toLowerCase();
    if (!/^[a-z][a-z0-9\x2d]*$/u.test(name)) continue;
    const sources: ResponseMetadata["csp"]["directives"][number]["sources"] =
      [];
    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (lower.startsWith("'nonce-")) {
        nonceCount += 1;
        continue;
      }
      if (
        lower.startsWith("'sha256-") ||
        lower.startsWith("'sha384-") ||
        lower.startsWith("'sha512-")
      ) {
        hashCount += 1;
        continue;
      }
      sources.push(cspSource(token, baseUrl, allowedOrigins));
    }
    directives.push({ name, sources });
  }
  return { directives, nonce_count: nonceCount, hash_count: hashCount };
};

const cspSource = (
  token: string,
  baseUrl: string,
  allowedOrigins: ReadonlySet<string>,
): ResponseMetadata["csp"]["directives"][number]["sources"][number] => {
  const lower = token.toLowerCase();
  if (/^'[a-z0-9\x2d]+'$/u.test(lower))
    return { kind: "keyword", value: lower };
  if (/^[a-z][a-z0-9+.\x2d]*:$/u.test(lower))
    return { kind: "scheme", value: lower };
  const hostOrigin = cspHostSourceOrigin(token, baseUrl);
  if (hostOrigin === undefined) return { kind: "other", value: null };
  return hostOrigin !== null && allowedOrigins.has(hostOrigin)
    ? { kind: "approved_origin", value: hostOrigin }
    : { kind: "external_origin", value: null };
};

/**
 * Resolve a CSP host-source (CSP3 §2.3.1) to the single origin it names. A
 * scheme-less source inherits the protected resource's scheme instead of being
 * resolved as a page-relative path. Returns `null` for a recognized wildcard
 * host or port, which denotes a set of origins rather than one origin, and
 * `undefined` when the token is not a host-source at all.
 */
const cspHostSourceOrigin = (
  token: string,
  baseUrl: string,
): string | null | undefined => {
  const match =
    /^(?:([a-z][a-z0-9+.\x2d]*):\/\/)?([^\x2f?#]+)(?:\/[^?#]*)?$/iu.exec(token);
  const authority = match?.[2];
  if (authority === undefined || authority.length === 0) return undefined;
  const scheme = (match?.[1] ?? schemeOf(baseUrl))?.toLowerCase();
  if (scheme === undefined || !/^[a-z][a-z0-9+.\x2d]*$/u.test(scheme))
    return undefined;
  if (
    !/^(?:\*|(?:\*\.)?[a-z0-9\x2d]+(?:\.[a-z0-9\x2d]+)*\.?)(?::(?:\*|\d+))?$/iu.test(
      authority,
    )
  )
    return undefined;
  if (authority.includes("*")) return null;
  try {
    const parsed = new URL(`${scheme}://${authority}`);
    return parsed.username === "" &&
      parsed.password === "" &&
      parsed.pathname === "/" &&
      parsed.origin !== "null"
      ? parsed.origin
      : undefined;
  } catch (cause: unknown) {
    // Authorities that are not a bare host[:port] are classified as other.
    void cause;
    return undefined;
  }
};

const schemeOf = (baseUrl: string): string | undefined => {
  try {
    return new URL(baseUrl).protocol.replace(/:$/u, "");
  } catch (cause: unknown) {
    // An unparseable protected-resource URL cannot lend a scheme.
    void cause;
    return undefined;
  }
};
