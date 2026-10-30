export const __stub = 1;
//   response: Response | Error,
// ) => {
//   // Exercise the real SDK consumer with an explicitly simulated Fetch boundary.
//   vi.stubGlobal(
//     "fetch",
//     response instanceof Error
//       ? vi.fn().mockRejectedValue(response)
//       : vi.fn().mockResolvedValue(response),
//   );
//   return createIdaMcpConnection(
//     {
//       url: "http://127.0.0.1:12345/mcp",
//       headers: { Authorization: "Custom " + credential },
//       mode: "attached",
//       timeoutMs: 1000,
//     },
//     {},
//   );
// };
//
// interface MockedIdaHttpRequest {
//   readonly id?: string | number;
//   readonly method: string;
//   readonly params?: Record<string, unknown>;
// }
//
// const jsonRpcResponse = (value: unknown): Response =>
//   new Response(JSON.stringify(value), {
//     headers: { "Content-Type": "application/json" },
//   });
//
// const stalledResponse = (signal: AbortSignal | null | undefined) =>
//   new Promise<Response>((_resolve, reject) => {
//     const aborted = () =>
//       reject(new DOMException("The request was aborted", "AbortError"));
//     if (signal?.aborted === true) {
//       aborted();
//       return;
//     }
//     signal?.addEventListener("abort", aborted, { once: true });
//   });
//
// const mockedHttpBoundary = ({
//   serverName,
//   tools,
//   call,
// }: {
//   readonly serverName: string;
//   readonly tools: readonly {
//     readonly name: string;
//     readonly inputSchema: object;
//   }[];
//   readonly call: (
//     request: MockedIdaHttpRequest,
//     signal: AbortSignal | null | undefined,
//   ) => Response | Promise<Response>;
// }): void => {
//   vi.stubGlobal(
//     "fetch",
//     vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
//       const request = JSON.parse(
//         String(init?.body ?? ""),
//       ) as MockedIdaHttpRequest;
//       if (request.method === "initialize")
//         return jsonRpcResponse({
//           jsonrpc: "2.0",
//           id: request.id,
//           result: {
//             protocolVersion: request.params?.protocolVersion,
//             capabilities: { tools: {} },
//             serverInfo: { name: serverName, version: "1" },
//           },
//         });
//       if (
//         request.method === "notifications/initialized" ||
//         request.method === "notifications/cancelled"
//       )
//         return new Response(null, { status: 202 });
//       if (request.method === "tools/list")
//         return jsonRpcResponse({
//           jsonrpc: "2.0",
//           id: request.id,
//           result: { tools },
//         });
//       if (request.method === "tools/call") return call(request, init?.signal);
//       throw new Error(`Unexpected fixture request: ${request.method}`);
//     }),
//   );
// };
//
// it("preserves the SDK request timeout as a typed IDA timeout", async () => {
//   const timeoutMs = 1000;
//   const requestTimeoutMs = 40;
//   const pendingCall = vi.fn();
//   mockedHttpBoundary({
//     serverName: "ida-timeout-fixture",
//     tools: [],
//     call: (_request, signal) => {
//       pendingCall();
//       return stalledResponse(signal);
//     },
//   });
//   const connection = createIdaMcpConnection(
//     {
//       url: "http://127.0.0.1:12345/mcp",
//       headers: { Authorization: "Bearer fixture-secret" },
//       mode: "attached",
//       timeoutMs,
//     },
//     {},
//   );
//   try {
//     await expect(connection.connect()).resolves.toEqual([]);
//     const failure = await connection
//       .call("decompile", {}, { timeoutMs: requestTimeoutMs })
//       .catch((cause: unknown) => cause);
//     expect(pendingCall).toHaveBeenCalledOnce();
//     expect(failure).toBeInstanceOf(AnalysisTimeoutError);
//     expect(failure).toMatchObject({
//       operation: "decompile",
//       timeoutMs: requestTimeoutMs,
//     });
//     if (!(failure instanceof AnalysisTimeoutError))
//       throw new Error("Expected a typed IDA request timeout");
//     expect(failure.cause).toBeInstanceOf(Error);
//     expect(inspectRetainedError(failure)).not.toContain("fixture-secret");
//   } finally {
export const _l = 127;
