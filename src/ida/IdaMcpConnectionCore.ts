import {
  createIdaDiagnosticRedactor,
  IDA_DIAGNOSTIC_SOURCE_BYTES,
} from "./IdaDiagnosticRedactor.js";
import { IdaDiagnosticResourceError } from "./IdaDiagnosticWriter.js";
import { ChildProcess } from "node:child_process";
import { Socket } from "node:net";
import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
import {
  Client,
  ProtocolError,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  DEFAULT_INHERITED_ENV_VARS,
  StdioClientTransport,
} from "@modelcontextprotocol/client/stdio";
import { z } from "zod";
import type { IdaConfiguration } from "./IdaConfiguration.js";
import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
import { err, ok, type Result } from "../domain/result.js";
import {
  AnalysisTimeoutError,
  AnalysisProtocolError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { ProviderAdapterError } from "../domain/providerAdapterError.js";

/** Injectable MCP boundary used by the provider and transport conformance tests. */
export interface IdaMcpConnection {
  connect(): Promise<readonly string[]>;
  call(
    name: string,
    args: Readonly<Record<string, JsonValue>>,
    options?: { readonly timeoutMs?: number | undefined },
  ): Promise<JsonValue>;
  readResource?(uri: string): Promise<JsonValue>;
  serverInfo(): JsonValue;
  close(): Promise<void>;
  /**
   * Keep a connection retained after failed cleanup from holding the host
   * process open. A long-lived MCP server can still retry through it; a
   * one-shot CLI exits, and the upstream proxy observes end of input.
   */
  detach(): void;
}

export type IdaMcpConnectionDependencies = Readonly<{
  createDiagnosticRedactor?: typeof createIdaDiagnosticRedactor;
}>;

const toolResultSchema = z.object({
  isError: z.boolean().optional(),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  content: z.array(
    z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
  ),
  _meta: z
    .object({
      ida_mcp: z
        .object({
          output_truncated: z.boolean().optional(),
          download_hint: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

const IDA_STDIO_MAX_MESSAGE_BYTES = 64 * 1024 * 1024;

const parseIdaJsonText = (text: string): JsonValue => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AnalysisProtocolError("IDA MCP returned malformed JSON text.");
  }
  return jsonValueSchema.parse(value);
};

/** Decode Python FastMCP's scalar wrapper without dropping structured dictionaries. */
export const decodeIdaToolResult = (
  input: unknown,
  protocol?: "native",
  diagnostic: IdaDiagnosticRedactor = createIdaDiagnosticRedactor(),
): JsonValue => {
  const result = toolResultSchema.parse(input);
  const blocks = result.content.flatMap((block) =>
    block.type === "text" && block.text !== undefined ? [block.text] : [],
  );
  if (result.isError === true) {
    const reason = diagnostic.blocks(blocks);
    throw new AnalysisProtocolError(
      diagnostic.message("IDA MCP tool failed: ", reason),
      {
        diagnostics: { reason },
      },
    );
  }
  if (result._meta?.ida_mcp?.output_truncated === true)
    throw new AnalysisProtocolError(
      diagnostic.message(
        "IDA MCP truncated its output; the preview cannot establish a complete observation. ",
        diagnostic.blocks([
          result._meta.ida_mcp.download_hint ??
            "Use the upstream output download workflow to retrieve the full result.",
        ]),
      ),
    );
  // Native MCP retains the complete JSON text while structuredContent may
  // contain a shortened preview. Parse that producer-owned representation once.
  if (protocol === "native") {
    if (blocks.length !== 1)
      throw new AnalysisProtocolError(
        "Native IDA MCP omitted its complete JSON text result.",
      );
    return parseIdaJsonText(blocks[0] ?? "");
  }
  if (result.structuredContent !== undefined) {
    const value = result.structuredContent;
    return jsonValueSchema.parse(
      Object.keys(value).length === 1 && "result" in value
        ? value.result
        : value,
    );
  }
  if (blocks.length !== 1)
    throw new AnalysisProtocolError(
      "IDA MCP omitted a single structured or text result; unsupported content cannot establish an empty observation.",
    );
  const values = blocks.map((text): JsonValue => {
    try {
      return jsonValueSchema.parse(JSON.parse(text));
    } catch {
      return text;
    }
  });
  return values[0] ?? null;
};

// Retain only producer-sanitized JSON diagnostics, never a native parser cause.
class IdaHttpJsonError extends Error {
  constructor(text: string, redactor: IdaDiagnosticRedactor) {
    super(
      redactor.message(
        "IDA MCP returned malformed HTTP JSON. Response body: ",
        text,
      ),
    );
  }
}

type IdaDiagnosticRedactor = ReturnType<typeof createIdaDiagnosticRedactor>;

type IdaContentType = Readonly<{
  essence: string;
  subtype: string;
  charset: string | undefined;
  parameters: ReadonlyMap<string, string>;
}>;

const httpQuotedOctet = (code: number): boolean =>
  code === 9 ||
  code === 32 ||
  (code >= 33 && code <= 126) ||
  (code >= 128 && code <= 255);

/** Consume one complete RFC 9110 media type; never discard a malformed parameter. */
const parseIdaContentType = (
  text: string,
): Result<IdaContentType, "malformed" | "ambiguous"> => {
  let cursor = 0;
  const token = new RegExp("[!#$%&'*+.^_`|~0-9A-Za-z-]+", "y");
  const readToken = (): string | undefined => {
    token.lastIndex = cursor;
    const match = token.exec(text);
    if (match === null) return undefined;
    cursor = token.lastIndex;
    return match[0];
  };
  const readOws = (): void => {
    while (text[cursor] === " " || text[cursor] === "\t") cursor++;
  };
  const readQuoted = (): string | undefined => {
    cursor++;
    let value = "";
    while (cursor < text.length) {
      let code = text.charCodeAt(cursor++);
      if (code === 34) return value;
      if (code === 92) {
        code = text.charCodeAt(cursor++);
        if (!httpQuotedOctet(code)) return undefined;
      } else if (!httpQuotedOctet(code)) return undefined;
      value += String.fromCharCode(code);
    }
    return undefined;
  };
  readOws();
  const type = readToken()?.toLowerCase();
  if (type === undefined || text[cursor++] !== "/") return err("malformed");
  const subtype = readToken()?.toLowerCase();
  if (subtype === undefined) return err("malformed");
  const parameters = new Map<string, string>();
  let ambiguous = false;
  while (true) {
    readOws();
    if (cursor === text.length) break;
    if (text[cursor++] !== ";") return err("malformed");
    readOws();
    // RFC 9110 parameters admit an empty item after a semicolon.
    if (cursor === text.length || text[cursor] === ";") continue;
    const name = readToken()?.toLowerCase();
    if (name === undefined || text[cursor++] !== "=") return err("malformed");
    const value = text[cursor] === '"' ? readQuoted() : readToken();
    if (value === undefined) return err("malformed");
    // Repetition is ambiguous for this owner, even if both values agree.
    // Keep parsing so syntax errors anywhere in the field cannot be discarded.
    if (parameters.has(name)) ambiguous = true;
    else parameters.set(name, value);
  }
  return ambiguous
    ? err("ambiguous")
    : ok({
        essence: type + "/" + subtype,
        subtype,
        charset: parameters.get("charset"),
        parameters,
      });
};
const httpErrorBody = (
  response: Response,
  text: string,
  redactor: IdaDiagnosticRedactor,
): string => {
  const omitted = redactor.text(
    "IDA MCP response body omitted: unsupported or unknown format or character encoding.",
  );
  const contentType = response.headers.get("content-type");
  if (contentType === null) return omitted;
  const mediaType = parseIdaContentType(contentType);
  if (!mediaType.ok) return omitted;
  const charset = mediaType.value.charset?.toLowerCase();
  if (
    charset !== undefined &&
    !["utf-8", "utf8", "us-ascii", "ascii"].includes(charset)
  )
    return omitted;
  if (
    mediaType.value.subtype === "json" ||
    mediaType.value.subtype.endsWith("+json")
  )
    return redactor.json(text);
  if (mediaType.value.essence === "text/plain") return redactor.text(text);
  return omitted;
};

/** Keep error-body materialization within the diagnostic source-byte budget. */
const readBoundedResponseText = async (
  response: Response,
): Promise<string | undefined> => {
  if (response.body === null) return "";
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, total).toString("utf8");
      total += value.byteLength;
      if (total > IDA_DIAGNOSTIC_SOURCE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return undefined;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
};

const diagnosticFetch =
  (redactor: IdaDiagnosticRedactor): typeof fetch =>
  async (input, init) => {
    const response = await fetch(input, init);
    const readText = response.text.bind(response);
    let safeBody: string | undefined;
    if (!response.ok) {
      // Normalize before the SDK can swallow a body-consumer failure or drop
      // its format metadata. Both consumers use this one owned diagnostic.
      const sourceBody = await readBoundedResponseText(response);
      safeBody =
        sourceBody === undefined
          ? redactor.text(
              `IDA MCP response body omitted: exceeds ${IDA_DIAGNOSTIC_SOURCE_BYTES} UTF-8 bytes.`,
            )
          : httpErrorBody(response, sourceBody, redactor);
      const body = safeBody;
      Object.defineProperty(response, "text", {
        value: async (): Promise<string> => body,
      });
    }
    // Successful JSON remains lazy, and SSE keeps its original body stream.
    Object.defineProperty(response, "json", {
      value: async (): Promise<unknown> => {
        const text = safeBody ?? (await readText());
        try {
          const value: unknown = JSON.parse(text);
          return value;
        } catch {
          // Parsing failure owns diagnostics even when the HTTP status succeeded.
          throw new IdaHttpJsonError(
            safeBody ?? httpErrorBody(response, text, redactor),
            redactor,
          );
        }
      },
    });
    return response;
  };

const retainedTransportCause = (cause: unknown, message: string): Error => {
  // Do not clone arbitrary upstream fields, stacks, data or nested causes.
  if (cause instanceof SdkHttpError)
    return new SdkHttpError(cause.code, message, {
      status: cause.data.status,
      statusText: "",
    });
  if (cause instanceof ProtocolError)
    return new ProtocolError(cause.code, message);
  return new Error(message);
};
/** Create a standard SDK connection to an existing upstream registration. */
