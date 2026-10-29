export const __stub = 1;
//     await connection.close();
//   }
// });
//
// it("bounds a stalled health poll by the remaining readiness deadline", async () => {
//   const timeoutMs = 800;
//   const _pendingCall = vi.fn();
//   let clockNow = 0;
//   const clock = {
//     now: () => clockNow,
//     delay: async (ms: number) => {
//       clockNow += ms;
//     },
//   };
//   let pendingCalls = 0;
//   const busy = {
//     status: "busy",
//     busy_tool: "config_json_get",
//     busy_sec: 1,
//     queued_calls: 0,
//   };
//   mockedHttpBoundary({
//     serverName: "ida-health-deadline-fixture",
//     tools: [{ name: "server_health", inputSchema: { type: "object" } }],
//     call: (request, signal) => {
//       pendingCalls += 1;
//       if (pendingCalls === 1) {
//         clockNow += 450;
//         const result = {
//           content: [{ type: "text", text: JSON.stringify(busy) }],
//           structuredContent: busy,
//         };
//         return jsonRpcResponse({ jsonrpc: "2.0", id: request.id, result });
//       }
//       return stalledResponse(signal);
//     },
//   });
//   const connection = createIdaMcpConnection(
//     {
//       url: "http://127.0.0.1:12345/mcp",
//       headers: {},
//       mode: "headless",
//       timeoutMs,
//     },
//     {},
//   );
//   try {
//     await connection.connect();
//     const failure = await readSettledHealth(connection, {
//       database: "fixture-db",
//       timeoutMs,
//       clock,
//     }).catch((cause: unknown) => cause);
//
//     expect(pendingCalls).toBe(2);
//     expect(failure).toBeInstanceOf(AnalysisTimeoutError);
//     expect(failure).toMatchObject({
//       operation: "server_health: headless worker still busy in config_json_get",
//       timeoutMs,
//       cause: busy,
//       diagnostics: {
//         health_request_operation: "server_health",
//         health_request_timeout_ms: 250,
//       },
//     });
//     if (!(failure instanceof AnalysisTimeoutError))
//       throw new Error("Expected the readiness deadline to expire");
//     expect(failure.capturedOutput).toBeDefined();
//   } finally {
//     await connection.close();
//   }
// });
//
// const inspectRetainedError = (error: unknown): string =>
//   inspect(error, { depth: null, maxStringLength: null, breakLength: Infinity });
//
// describe("retained IDA diagnostic errors", () => {
//   it.each([
//     {
//       credential: "fixture-secret",
//       body: '{"reason":"fixture-secret at /caller/input",',
//       forbidden: "fixture-secret",
//     },
//     {
//       credential: "<token>",
//       body: String.raw`["\u003ctoken\u003e",x]`,
//       forbidden: "u003ctoken",
//     },
//   ])(
//     "retains only sanitized malformed HTTP JSON: $credential",
//     async ({ credential, body, forbidden }) => {
//       const connection = failingHttpConnection(
//         credential,
//         new Response(body, { headers: { "Content-Type": "application/json" } }),
//       );
//       const failure: unknown = await connection
//         .connect()
//         .catch((cause: unknown) => cause);
//       expect(failure).toBeInstanceOf(Error);
//       if (!(failure instanceof Error))
//         throw new Error("Expected a malformed HTTP JSON failure");
//       expect(failure.message).toContain("[redacted transport credential]");
//       expect(inspectRetainedError(failure)).not.toContain(forbidden);
//       expect(inspectRetainedError(failure)).not.toContain(credential);
//       await connection.close();
//     },
//   );
//
//   it("does not rescan an owned malformed JSON replacement marker", async () => {
//     const connection = failingHttpConnection(
//       "redacted",
//       new Response("Rejected redacted", {
//         headers: { "Content-Type": "application/json" },
//       }),
//     );
//     const failure: unknown = await connection
//       .connect()
//       .catch((cause: unknown) => cause);
//     expect(failure).toBeInstanceOf(Error);
//     if (!(failure instanceof Error))
//       throw new Error("Expected a malformed HTTP JSON failure");
//     expect(failure.message).toBe(
//       "IDA MCP returned malformed HTTP JSON. Response body: \nRejected ␟",
//     );
//     expect(inspectRetainedError(failure)).not.toContain("[[redacted");
//     await connection.close();
//   });
export const _l = 127;
