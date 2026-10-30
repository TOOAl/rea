export const __stub = 1;
//
//   it("replaces an unknown network error graph with a safe owned reason", async () => {
//     const upstream = Object.assign(
//       new Error("fixture-secret refused at /caller/input", {
//         cause: new Error("nested fixture-secret"),
//       }),
//       { headers: { Authorization: "Custom fixture-secret" } },
//     );
//     const connection = failingHttpConnection("fixture-secret", upstream);
//     const failure: unknown = await connection
//       .connect()
//       .catch((cause: unknown) => cause);
//     expect(failure).toBeInstanceOf(Error);
//     if (!(failure instanceof Error))
//       throw new Error("Expected a network failure");
//     expect(failure.message).toContain("refused at /caller/input");
//     expect(failure.cause).not.toBe(upstream);
//     expect(inspectRetainedError(failure)).not.toContain("fixture-secret");
//     await connection.close();
//   });
//
//   it("retains meaningful HTTP status without unsafe SDK metadata", async () => {
//     const connection = failingHttpConnection(
//       "fixture-secret",
//       new Response("unavailable fixture-secret at /caller/input", {
//         status: 500,
//         statusText: "fixture-secret",
//         headers: { "Content-Type": "text/plain" },
//       }),
//     );
//     const failure: unknown = await connection
//       .connect()
//       .catch((cause: unknown) => cause);
//     expect(failure).toBeInstanceOf(Error);
//     if (!(failure instanceof Error))
//       throw new Error("Expected an HTTP failure");
//     expect(failure.cause).toMatchObject({ data: { status: 500 } });
//     expect(failure.message).toContain(
//       "unavailable [redacted transport credential] at /caller/input",
//     );
//     expect(inspectRetainedError(failure)).not.toContain("fixture-secret");
//     await connection.close();
//   });
// });
//
// it.each([
//   {
//     code: SdkErrorCode.ClientHttpNotImplemented,
//     message: "Changed SDK context: fixture-secret",
//   },
//   {
//     code: SdkErrorCode.ClientHttpFailedToOpenStream,
//     message: "Error POSTing to endpoint: fixture-secret",
//   },
// ])(
//   "does not infer owned body spans from an unknown SDK shape: $code / $message",
//   async ({ code, message }) => {
//     const connection = failingHttpConnection(
//       "fixture-secret",
//       new SdkHttpError(code, message, { status: 500, text: "fixture-secret" }),
//     );
//     try {
//       const failure = await connection
//         .connect()
//         .catch((cause: unknown) => cause);
//       if (!(failure instanceof Error)) throw new Error("Expected SDK failure");
//       expect(inspectRetainedError(failure)).not.toContain("fixture-secret");
//       expect(failure.message).toContain("[redacted transport credential]");
//       expect(failure.cause).toMatchObject({ code, data: { status: 500 } });
//     } finally {
//       await connection.close();
//     }
//   },
// );
//
// it("redacts JSON character candidates in unclassified SDK errors", async () => {
//   const connection = failingHttpConnection(
//     'q"uote',
//     new Error(String.raw`network context {"error":"q\"uote"} at /caller/input`),
//   );
//   try {
//     const failure = await connection.connect().catch((cause: unknown) => cause);
//     if (!(failure instanceof Error)) throw new Error("Expected SDK failure");
//     expect(failure.message).toContain(
//       '{"error":"[redacted transport credential]"} at /caller/input',
//     );
//     expect(inspectRetainedError(failure)).not.toContain(String.raw`q\"uote`);
//   } finally {
//     await connection.close();
//   }
// });
//
// it("owns unclassified truncated-output hints separately from their context", () => {
//   const diagnostic = createIdaDiagnosticRedactor({
//     url: "http://127.0.0.1:12345/mcp",
//     mode: "attached",
//     timeoutMs: 1000,
//     headers: { Authorization: 'Custom q"uote' },
//   });
//   let failure: unknown;
//   try {
//     decodeIdaToolResult(
//       {
//         content: [],
//         _meta: {
//           ida_mcp: {
//             output_truncated: true,
//             download_hint: String.raw`{"error":"q\"uote","path":"/caller/output"}`,
//           },
//         },
//       },
//       undefined,
//       diagnostic,
//     );
//   } catch (cause: unknown) {
//     failure = cause;
//   }
//   if (!(failure instanceof Error))
//     throw new Error("Expected truncation failure");
//   expect(failure.message).toContain(
//     '{"error":"[redacted transport credential]","path":"/caller/output"}',
//   );
//   expect(inspectRetainedError(failure)).not.toContain(String.raw`q\"uote`);
// });
export const _l = 124;
