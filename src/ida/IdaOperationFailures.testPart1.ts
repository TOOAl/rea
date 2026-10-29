export const __stub = 1;
// import { rm, stat } from "node:fs/promises";
// import { dirname } from "node:path";
// import { afterEach, describe, expect, it } from "vitest";
// import { z } from "zod";
// import {
//   createIdaTarget,
//   RecordingIdaMcp,
// } from "../../tests/fixtures/idaMcp.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { AnalysisInputError } from "../domain/analysisErrorCore.js";
// import { createIdaDiagnosticRedactor } from "./IdaDiagnosticRedactor.js";
// import { decodeIdaToolResult } from "./IdaMcpConnection.js";
// import type { AnalysisOperation } from "../application/AnalysisProvider.js";
// import { IdaSessionClient } from "./IdaSessionClient.js";
//
// const roots: string[] = [];
// afterEach(async () => {
//   for (const root of roots.splice(0))
//     await rm(root, { recursive: true, force: true });
// });
//
// it("preserves a rejected headless decompile diagnostic with completed lookup evidence and releases its owned worker", async () => {
//   const { root, target } = await createIdaTarget();
//   roots.push(root);
//   const producer = new RecordingIdaMcp(target, "headless");
//   const reason =
//     "Invalid params: unexpected parameters: ['offset', 'max_lines']";
//   const config = {
//     url: "http://127.0.0.1:12345/mcp",
//     headers: {
//       Authorization: "Token custom-fixture-token",
//       Cookie: "session=cookie-fixture-secret",
//     },
//     mode: "headless" as const,
//     timeoutMs: 1000,
//     workspaceRoot: root,
//   };
//   const redactor = createIdaDiagnosticRedactor(config);
//   producer.beforeCall = async (name) => {
//     if (name === "decompile")
//       decodeIdaToolResult(
//         {
//           isError: true,
//           content: [
//             {
//               type: "text",
//               text: reason + " (custom-fixture-token / cookie-fixture-secret)",
//             },
//           ],
//         },
//         undefined,
//         redactor,
//       );
//   };
//   const safeReason =
//     reason +
//     " ([redacted transport credential] / [redacted transport credential])";
//   const client = new IdaSessionClient(config, target, producer);
//   try {
//     const result = await client.execute("procedure_pseudo_code", {
//       procedure: "main",
//     });
//     if (result.ok) throw new Error("Expected the upstream rejection");
//     expect(projectAnalysisError(result.error)).toMatchObject({
//       code: "unreadable_output",
//       details: {
//         diagnostics: { reason: safeReason },
//         partial_observation: {
//           provider: { id: "ida" },
//           operation: "procedure_pseudo_code",
//           normalized_result: {
//             status: "partial",
//             observations: [expect.objectContaining({ tool: "lookup_funcs" })],
//             target_binding: {
//               status: "not_verified",
//               reason: "IDA MCP tool failed: \n" + safeReason,
//             },
//           },
//         },
//       },
//     });
//     expect(JSON.stringify(projectAnalysisError(result.error))).not.toContain(
//       "custom-fixture-token",
//     );
//     expect(JSON.stringify(projectAnalysisError(result.error))).not.toContain(
//       "cookie-fixture-secret",
//     );
//     expect(
//       producer.calls.find(({ name }) => name === "decompile"),
//     ).toMatchObject({
//       args: { addr: "0x1000", offset: 0, max_lines: 100 },
//     });
//   } finally {
//     const database = producer.database;
//     expect((await client.close()).ok).toBe(true);
//     expect(producer.calls.filter(({ name }) => name === "idb_close")).toEqual([
//       { name: "idb_close", args: { database, save: false } },
//     ]);
//     expect(producer.closes).toBe(1);
//     await expect(stat(dirname(producer.inputPath))).rejects.toMatchObject({
//       code: "ENOENT",
//     });
//   }
// });
//
// describe("headless IDA tool diagnostics in partial evidence", () => {
//   const callerPath = "/caller/input?token=visible";
//   const marker = "[redacted transport credential]";
//   it.each([
//     {
//       name: "a decoded Basic password matching the tool failure prefix",
//       password: "failed",
//       upstream: "Rejected decompile request for " + callerPath,
//       safeReason: "Rejected decompile request for " + callerPath,
//       forbiddenInBinding: ["failed"],
//     },
//     {
//       name: "a JSON-encoded tool explanation",
//       password: "<secret>",
//       upstream: String.raw`{"reason":"\u003csecret\u003e","user":"user","path":"/caller/input?token=visible"}`,
//       safeReason:
//         '{"reason":"' +
//         marker +
//         '","user":"user","path":"/caller/input?token=visible"}',
//       forbiddenInBinding: ["<secret>", String.raw`\u003csecret\u003e`],
//     },
//   ])(
//     "redacts $name before retaining the public target-binding reason",
//     async ({ password, upstream, safeReason, forbiddenInBinding }) => {
//       const { root, target } = await createIdaTarget();
//       roots.push(root);
//       const producer = new RecordingIdaMcp(target, "headless");
//       const config = {
//         url: "http://127.0.0.1:12345/mcp",
//         headers: {
//           Authorization:
//             "Basic " +
//             Buffer.from("user:" + password, "utf8").toString("base64"),
//         },
//         mode: "headless" as const,
//         timeoutMs: 1000,
//         workspaceRoot: root,
//       };
//       const redactor = createIdaDiagnosticRedactor(config);
//       producer.beforeCall = async (name) => {
//         if (name === "decompile")
//           decodeIdaToolResult(
//             { isError: true, content: [{ type: "text", text: upstream }] },
//             undefined,
//             redactor,
//           );
//       };
//       const client = new IdaSessionClient(config, target, producer);
//       try {
//         const result = await client.execute("procedure_pseudo_code", {
//           procedure: "main",
//         });
//         if (result.ok) throw new Error("Expected the producer's tool error");
//         const projected = projectAnalysisError(result.error);
//         expect(projected).toMatchObject({
//           code: "unreadable_output",
//           details: {
//             partial_observation: {
//               provider: { id: "ida" },
//               operation: "procedure_pseudo_code",
//               normalized_result: {
//                 status: "partial",
//                 observations: [
//                   expect.objectContaining({ tool: "lookup_funcs" }),
//                 ],
//                 target_binding: {
//                   status: "not_verified",
//                   reason: expect.any(String),
//                 },
//               },
//             },
//           },
export const _l = 178;
