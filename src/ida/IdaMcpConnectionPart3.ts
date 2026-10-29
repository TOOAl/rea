export const __stub = 1;
//   )
//     return redactor.json(text);
//   if (mediaType.value.essence === "text/plain") return redactor.text(text);
//   return omitted;
// };
//
// /** Keep error-body materialization within the diagnostic source-byte budget. */
// const readBoundedResponseText = async (
//   response: Response,
// ): Promise<string | undefined> => {
//   if (response.body === null) return "";
//   const reader = response.body.getReader();
//   const chunks: Buffer[] = [];
//   let total = 0;
//   try {
//     for (;;) {
//       const { done, value } = await reader.read();
//       if (done) return Buffer.concat(chunks, total).toString("utf8");
//       total += value.byteLength;
//       if (total > IDA_DIAGNOSTIC_SOURCE_BYTES) {
//         await reader.cancel().catch(() => undefined);
//         return undefined;
//       }
//       chunks.push(Buffer.from(value));
//     }
//   } finally {
//     reader.releaseLock();
//   }
// };
//
// const diagnosticFetch =
//   (redactor: IdaDiagnosticRedactor): typeof fetch =>
//   async (input, init) => {
//     const response = await fetch(input, init);
//     const readText = response.text.bind(response);
//     let safeBody: string | undefined;
//     if (!response.ok) {
//       // Normalize before the SDK can swallow a body-consumer failure or drop
//       // its format metadata. Both consumers use this one owned diagnostic.
//       const sourceBody = await readBoundedResponseText(response);
//       safeBody =
//         sourceBody === undefined
//           ? redactor.text(
//               `IDA MCP response body omitted: exceeds ${IDA_DIAGNOSTIC_SOURCE_BYTES} UTF-8 bytes.`,
//             )
//           : httpErrorBody(response, sourceBody, redactor);
//       const body = safeBody;
//       Object.defineProperty(response, "text", {
//         value: async (): Promise<string> => body,
//       });
//     }
//     // Successful JSON remains lazy, and SSE keeps its original body stream.
//     Object.defineProperty(response, "json", {
//       value: async (): Promise<unknown> => {
//         const text = safeBody ?? (await readText());
//         try {
//           const value: unknown = JSON.parse(text);
//           return value;
//         } catch {
//           // Parsing failure owns diagnostics even when the HTTP status succeeded.
//           throw new IdaHttpJsonError(
//             safeBody ?? httpErrorBody(response, text, redactor),
//             redactor,
//           );
//         }
//       },
//     });
//     return response;
//   };
//
// const retainedTransportCause = (cause: unknown, message: string): Error => {
//   // Do not clone arbitrary upstream fields, stacks, data or nested causes.
//   if (cause instanceof SdkHttpError)
//     return new SdkHttpError(cause.code, message, {
//       status: cause.data.status,
//       statusText: "",
//     });
//   if (cause instanceof ProtocolError)
//     return new ProtocolError(cause.code, message);
//   return new Error(message);
// };
// /** Create a standard SDK connection to an existing upstream registration. */
// export const createIdaMcpConnection = (
//   config: IdaConfiguration,
//   environment: Readonly<NodeJS.ProcessEnv>,
//   dependencies: IdaMcpConnectionDependencies = {},
// ): IdaMcpConnection => {
//   const client = new Client({ name: "rea-ida-provider", version: "1" });
//   const redactor = (
//     dependencies.createDiagnosticRedactor ?? createIdaDiagnosticRedactor
//   )(config);
//   let stderr = Buffer.alloc(0);
//   let stderrBytes = 0;
//   const transportFailure = (
//     cause: unknown,
//     operation = "ida_mcp_response",
//     requestTimeoutMs = config.timeoutMs,
//   ): never => {
//     const bufferLimit =
//       cause instanceof Error
//         ? /ReadBuffer exceeded maximum size of (\d+) bytes/u.exec(cause.message)
//         : null;
//     if (cause instanceof IdaDiagnosticResourceError) throw cause;
//     let failure: Error;
//     if (cause instanceof IdaHttpJsonError)
//       failure = new Error(cause.message, { cause });
//     else {
//       const message =
//         cause instanceof Error
//           ? cause.message
//           : "Unknown IDA MCP transport failure";
//       const body = cause instanceof SdkHttpError ? cause.data.text : undefined;
//       // Only the pinned SDK POST producer places this owned body at a known
//       // span. Equal substrings elsewhere remain untrusted SDK context.
//       const prefix = "Error POSTing to endpoint: ";
//       const ownedPostBody =
//         cause instanceof SdkHttpError &&
//         cause.code === SdkErrorCode.ClientHttpNotImplemented &&
//         typeof body === "string" &&
//         message === prefix + body;
//       // Normalized wire headers and supported decoded candidates have no LF.
//       // Separating owners prevents their concatenation from spelling a credential.
//       const safeMessage = ownedPostBody
//         ? redactor.message(prefix, body)
//         : redactor.blocks([message]);
//       failure = new Error(safeMessage, {
//         cause: retainedTransportCause(cause, safeMessage),
//       });
export const _l = 128;
