export const __stub = 1;
// import {
//   createIdaDiagnosticRedactor,
//   IDA_DIAGNOSTIC_SOURCE_BYTES,
// } from "./IdaDiagnosticRedactor.js";
// import { IdaDiagnosticResourceError } from "./IdaDiagnosticWriter.js";
// import { ChildProcess } from "node:child_process";
// import { Socket } from "node:net";
// import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
// import {
//   Client,
//   ProtocolError,
//   SdkError,
//   SdkErrorCode,
//   SdkHttpError,
//   StreamableHTTPClientTransport,
// } from "@modelcontextprotocol/client";
// import {
//   DEFAULT_INHERITED_ENV_VARS,
//   StdioClientTransport,
// } from "@modelcontextprotocol/client/stdio";
// import { z } from "zod";
// import type { IdaConfiguration } from "./IdaConfiguration.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   AnalysisTimeoutError,
//   AnalysisProtocolError,
//   AnalysisResourceConstraintError,
// } from "../domain/analysisErrorCore.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
//
// /** Injectable MCP boundary used by the provider and transport conformance tests. */
// export interface IdaMcpConnection {
//   connect(): Promise<readonly string[]>;
//   call(
//     name: string,
//     args: Readonly<Record<string, JsonValue>>,
//     options?: { readonly timeoutMs?: number | undefined },
//   ): Promise<JsonValue>;
//   readResource?(uri: string): Promise<JsonValue>;
//   serverInfo(): JsonValue;
//   close(): Promise<void>;
//   /**
//    * Keep a connection retained after failed cleanup from holding the host
//    * process open. A long-lived MCP server can still retry through it; a
//    * one-shot CLI exits, and the upstream proxy observes end of input.
//    */
//   detach(): void;
// }
//
// export type IdaMcpConnectionDependencies = Readonly<{
//   createDiagnosticRedactor?: typeof createIdaDiagnosticRedactor;
// }>;
//
// const toolResultSchema = z.object({
//   isError: z.boolean().optional(),
//   structuredContent: z.record(z.string(), z.unknown()).optional(),
//   content: z.array(
//     z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
//   ),
//   _meta: z
//     .object({
//       ida_mcp: z
//         .object({
//           output_truncated: z.boolean().optional(),
//           download_hint: z.string().optional(),
//         })
//         .passthrough()
//         .optional(),
//     })
//     .passthrough()
//     .optional(),
// });
//
// const IDA_STDIO_MAX_MESSAGE_BYTES = 64 * 1024 * 1024;
//
// const parseIdaJsonText = (text: string): JsonValue => {
//   let value: unknown;
//   try {
//     value = JSON.parse(text);
//   } catch {
//     throw new AnalysisProtocolError("IDA MCP returned malformed JSON text.");
//   }
//   return jsonValueSchema.parse(value);
// };
//
// /** Decode Python FastMCP's scalar wrapper without dropping structured dictionaries. */
// export const decodeIdaToolResult = (
//   input: unknown,
//   protocol?: "native",
//   diagnostic: IdaDiagnosticRedactor = createIdaDiagnosticRedactor(),
// ): JsonValue => {
//   const result = toolResultSchema.parse(input);
//   const blocks = result.content.flatMap((block) =>
//     block.type === "text" && block.text !== undefined ? [block.text] : [],
//   );
//   if (result.isError === true) {
//     const reason = diagnostic.blocks(blocks);
//     throw new AnalysisProtocolError(
//       diagnostic.message("IDA MCP tool failed: ", reason),
//       {
//         diagnostics: { reason },
//       },
//     );
//   }
//   if (result._meta?.ida_mcp?.output_truncated === true)
//     throw new AnalysisProtocolError(
//       diagnostic.message(
//         "IDA MCP truncated its output; the preview cannot establish a complete observation. ",
//         diagnostic.blocks([
//           result._meta.ida_mcp.download_hint ??
//             "Use the upstream output download workflow to retrieve the full result.",
//         ]),
//       ),
//     );
//   // Native MCP retains the complete JSON text while structuredContent may
//   // contain a shortened preview. Parse that producer-owned representation once.
//   if (protocol === "native") {
//     if (blocks.length !== 1)
//       throw new AnalysisProtocolError(
//         "Native IDA MCP omitted its complete JSON text result.",
//       );
//     return parseIdaJsonText(blocks[0] ?? "");
//   }
//   if (result.structuredContent !== undefined) {
//     const value = result.structuredContent;
//     return jsonValueSchema.parse(
//       Object.keys(value).length === 1 && "result" in value
export const _l = 128;
