import {
  Client,
  DEFAULT_REQUEST_TIMEOUT_MSEC,
  SdkError,
  SdkErrorCode,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { z } from "zod";
import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
import {
  AnalysisCancelledError,
  AnalysisProtocolError,
  AnalysisTimeoutError,
} from "../domain/analysisErrorCore.js";
import type { JebOperation } from "../domain/jeb/jebAnalysis.js";
import { ProviderStartupDeadline } from "../process/ProviderDeadline.js";

/** Upstream protocol names for the operations REA exposes. */
export const JEB_ENGINE_TOOLS = {
  inspect_jeb_client: "get_client_information",
  open_jeb_project: "open_project",
  list_jeb_units: "list_units",
  decompile_jeb_item: "decompile_code_item",
} as const satisfies Readonly<Record<JebOperation, string>>;
const RELEVANT_ENGINE_TOOLS = new Set<string>(Object.values(JEB_ENGINE_TOOLS));

/** Injectable MCP boundary used by the provider and conformance tests. */
export interface JebMcpConnection {
  /** Connect lazily and return advertised names used by REA. */
  connect(signal?: AbortSignal): Promise<readonly string[]>;
  /** Refresh support for REA operations from the live engine catalog. */
  listTools(signal?: AbortSignal): Promise<readonly string[]>;
  /** Invoke one JEB MCP tool and decode its single structured result. */
  call(
    name: string,
    args: Readonly<Record<string, JsonValue>>,
    signal?: AbortSignal,
  ): Promise<JsonValue>;
  close(): Promise<void>;
}

const toolResultSchema = z.object({
  isError: z.boolean().optional(),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  content: z
    .array(
      z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
    )
    .default([]),
});

/** Decode a JEB MCP tool result without inventing an empty observation. */
export const decodeJebToolResult = (input: unknown): JsonValue => {
  const result = toolResultSchema.parse(input);
  const blocks = result.content.flatMap((block) =>
    block.type === "text" && block.text !== undefined ? [block.text] : [],
  );
  let decoded: JsonValue;
  if (result.structuredContent !== undefined) {
    decoded = jsonValueSchema.parse(result.structuredContent);
  } else {
    if (blocks.length !== 1)
      throw new AnalysisProtocolError(
        "JEB MCP omitted a single structured or text result; unsupported content cannot establish an empty observation.",
      );
    const text = blocks[0] ?? "null";
    try {
      decoded = jsonValueSchema.parse(JSON.parse(text));
    } catch {
      decoded = text;
    }
  }
  if (result.isError === true && !isJebFailureEnvelope(decoded))
    throw new AnalysisProtocolError(
      `JEB MCP tool failed: ${blocks[0] ?? "error-marked result without a JEB failure envelope"}`,
      { cause: decoded },
    );
  return decoded;
};

const isJebFailureEnvelope = (value: JsonValue): boolean =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  value.success === false;

export interface JebMcpConnectionTimeouts {
  /** Absolute catalog connection and pagination deadline. */
  readonly discoveryTimeoutMs?: number;
  /** Absolute timeout for each upstream tools/call request. */
  readonly requestTimeoutMs?: number;
}

export type JebMcpConnectionFactory = (
  endpoint: URL,
  timeouts?: JebMcpConnectionTimeouts,
) => JebMcpConnection;

/** Serve JEB requests from a running engine client over streamable HTTP. */
