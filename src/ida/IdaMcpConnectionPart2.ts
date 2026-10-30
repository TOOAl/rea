import { createIdaDiagnosticRedactor } from "./IdaDiagnosticRedactor.js";
import { IdaDiagnosticResourceError } from "./IdaDiagnosticWriter.js";
import { ChildProcess } from "node:child_process";
import { Socket } from "node:net";
import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
import {
  Client,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  DEFAULT_INHERITED_ENV_VARS,
  StdioClientTransport,
} from "@modelcontextprotocol/client/stdio";

// src/ida/IdaMcpConnectionPart2.ts
export const createIdaMcpConnection = (
  config: IdaConfiguration,
  environment: Readonly<NodeJS.ProcessEnv>,
  dependencies: IdaMcpConnectionDependencies = {},
): IdaMcpConnection => {
  const client = new Client({ name: "rea-ida-provider", version: "1" });
  const redactor = (
    dependencies.createDiagnosticRedactor ?? createIdaDiagnosticRedactor
  )(config);
  let stderr = Buffer.alloc(0);
  let stderrBytes = 0;
  const transportFailure = (
    cause: unknown,
    operation = "ida_mcp_response",
    requestTimeoutMs = config.timeoutMs,
  ): never => {
    const bufferLimit =
      cause instanceof Error
        ? /ReadBuffer exceeded maximum size of (\d+) bytes/u.exec(cause.message)
        : null;
    if (cause instanceof IdaDiagnosticResourceError) throw cause;
    let failure: Error;
    if (cause instanceof IdaHttpJsonError)
      failure = new Error(cause.message, { cause });
    else {
      const message =
        cause instanceof Error
          ? cause.message
          : "Unknown IDA MCP transport failure";
      const body = cause instanceof SdkHttpError ? cause.data.text : undefined;
      // Only the pinned SDK POST producer places this owned body at a known
      // span. Equal substrings elsewhere remain untrusted SDK context.
      const prefix = "Error POSTing to endpoint: ";
      const ownedPostBody =
        cause instanceof SdkHttpError &&
        cause.code === SdkErrorCode.ClientHttpNotImplemented &&
        typeof body === "string" &&
        message === prefix + body;
      // Normalized wire headers and supported decoded candidates have no LF.
      // Separating owners prevents their concatenation from spelling a credential.
      const safeMessage = ownedPostBody
        ? redactor.message(prefix, body)
        : redactor.blocks([message]);
      failure = new Error(safeMessage, {
        cause: retainedTransportCause(cause, safeMessage),
      });
    }
    let start = 0;
    if (stderrBytes > stderr.length)
      while (start < stderr.length && (stderr[start]! & 0xc0) === 0x80) start++;
    const capturedOutput = {
      stdout: "",
      stderr: redactor.blocks([stderr.subarray(start).toString("utf8")]),
      truncated: stderrBytes > stderr.length - start,
      stdout_bytes: 0,
      stderr_bytes: stderrBytes,
    };
    if (cause instanceof SdkError && cause.code === SdkErrorCode.RequestTimeout)
      throw new AnalysisTimeoutError(operation, requestTimeoutMs, {
        cause: failure,
        capturedOutput,
      });
    if (bufferLimit !== null)
      throw new AnalysisResourceConstraintError(
        operation,
        "transport",
        `Upstream IDA MCP reply exceeded the ${bufferLimit[1]}-byte transport limit; no partial Evidence was returned.`,
        { max_response_bytes: Number(bufferLimit[1]) },
        { cause, capturedOutput },
      );
    if (stderrBytes === 0) throw failure;
    throw new ProviderAdapterError("ida", "transport", {
      cause: failure,
      diagnostics: { reason: failure.message },
      capturedOutput,
    });
  };
  const transport =
    "command" in config
      ? new StdioClientTransport({
          command: config.command,
          args: config.args,
          env: {
            // The SDK always merges ambient defaults. Its string-only environment
            // API requires empty values to suppress omitted caller-selected keys.
            ...Object.fromEntries(
              DEFAULT_INHERITED_ENV_VARS.map((key) => [key, ""]),
            ),
            ...Object.fromEntries(
              Object.entries(snapshotEnvironment(environment)).filter(
                (entry): entry is [string, string] => entry[1] !== undefined,
              ),
            ),
            IDA_MCP_MAX_WORKERS: "1",
            ...snapshotEnvironment(config.env),
          },
          stderr: "pipe",
          maxBufferSize: IDA_STDIO_MAX_MESSAGE_BYTES,
        })
      : new StreamableHTTPClientTransport(new URL(config.url), {
          requestInit: { headers: config.headers, redirect: "error" },
          fetch: diagnosticFetch(redactor),
        });
  // Keep a bounded diagnostic tail for genuine failures; never persist ambient variables.
  if (transport instanceof StdioClientTransport)
    transport.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      const combined = Buffer.concat([stderr, chunk]);
      stderr = Buffer.from(
        combined.subarray(Math.max(0, combined.length - 16_384)),
      );
    });
  return {
    async connect() {
      await client
        .connect(transport, { timeout: config.timeoutMs })
        .catch((cause: unknown) => transportFailure(cause, "ida_mcp_connect"));
      const catalog = await client
        .listTools(undefined, {
          timeout: config.timeoutMs,
        })
        .catch((cause: unknown) => transportFailure(cause, "ida_mcp_catalog"));
      return catalog.tools.map(({ name }) => name);
    },
    async call(name, args, options) {
      const requestTimeoutMs = Math.min(
        config.timeoutMs,
        options?.timeoutMs ?? config.timeoutMs,
      );
      return decodeIdaToolResult(
        await client
          .callTool({ name, arguments: args }, { timeout: requestTimeoutMs })
          .catch((cause: unknown) =>
            transportFailure(cause, name, requestTimeoutMs),
          ),
        config.protocol,
        redactor,
      );
    },
    async readResource(uri) {
      const response = await client
        .readResource({ uri }, { timeout: config.timeoutMs })
        .catch((cause: unknown) =>
          transportFailure(cause, "ida_mcp_read_resource"),
        );
      const resource = z
        .object({
          contents: z
            .array(
              z.object({
                uri: z.literal(uri),
                mimeType: z.literal("application/json"),
                text: z.string(),
              }),
            )
            .length(1),
        })
        .parse(response);
      return parseIdaJsonText(resource.contents[0]?.text ?? "");
    },
    serverInfo: () => jsonValueSchema.parse(client.getServerVersion() ?? null),
    close: () => client.close().catch(transportFailure),
    detach() {
      if (!(transport instanceof StdioClientTransport)) return;
      // The SDK exposes only the child's pid, not the handles it holds.
      const child: unknown = Reflect.get(transport, "_process");
      if (!(child instanceof ChildProcess)) return;
      child.unref();
      for (const stream of [child.stdin, child.stdout, child.stderr])
        if (stream instanceof Socket) stream.unref();
    },
  };
};
