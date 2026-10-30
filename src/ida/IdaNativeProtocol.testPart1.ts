export const __stub = 1;
// import { rm, writeFile } from "node:fs/promises";
// import { join } from "node:path";
// import { afterEach, describe, expect, it } from "vitest";
// import {
//   createIdaTarget,
//   RecordingIdaMcp,
// } from "../../tests/fixtures/idaMcp.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import {
//   AnalysisInputError,
//   AnalysisProtocolError,
// } from "../domain/analysisErrorCore.js";
// import { readIdaConfiguration } from "./IdaConfiguration.js";
// import {
//   decodeIdaToolResult,
//   type IdaMcpConnection,
// } from "./IdaMcpConnection.js";
// import { parseConfig } from "../config/parseConfig.js";
// import { IdaProvider } from "./IdaProvider.js";
// import { idaCapabilities } from "./IdaProviderCapabilities.js";
// import { IdaSessionClient } from "./IdaSessionClient.js";
//
// const roots: string[] = [];
// afterEach(async () => {
//   for (const root of roots.splice(0))
//     await rm(root, { recursive: true, force: true });
// });
//
// const fixture = async () => {
//   const { root, target } = await createIdaTarget();
//   roots.push(root);
//   const producer = new RecordingIdaMcp(target);
//   producer.overrideCall = (name) => {
//     if (name === "decompile")
//       return {
//         addr: "0x1000",
//         ok: true,
//         pseudocode: producer.pseudocode,
//         lines: 1,
//       };
//     if (name === "disasm")
//       return {
//         asm: {
//           name: "main",
//           start_ea: "0x1000",
//           lines: "main (.text @ 0x1000):\n1000  ret",
//         },
//         cursor: { done: true },
//       };
//     if (name === "callees")
//       return [
//         {
//           callees: [{ addr: "0x2000", name: "puts", type: "external" }],
//           more: false,
//           error: null,
//         },
//       ];
//     if (name === "xrefs_to")
//       return [
//         {
//           xrefs: [{ addr: "0x1004", type: "code", fn: null }],
//           more: false,
//           error: null,
//         },
//       ];
//     return undefined;
//   };
//   const resources: string[] = [];
//   const connection: IdaMcpConnection = {
//     connect: async () => [
//       "list_funcs",
//       "lookup_funcs",
//       "find_regex",
//       "decompile",
//       "disasm",
//       "callees",
//       "xrefs_to",
//     ],
//     call: (name, args) => producer.call(name, args),
//     readResource: async (uri) => {
//       resources.push(uri);
//       const metadata = await producer.call("get_metadata", {});
//       if (
//         metadata === null ||
//         typeof metadata !== "object" ||
//         Array.isArray(metadata)
//       )
//         throw new Error("Invalid metadata fixture");
//       return { ...metadata, path: `${producer.inputPath}.i64` };
//     },
//     serverInfo: () => producer.serverInfo(),
//     close: () => producer.close(),
//     detach: () => producer.detach(),
//   };
//   const client = new IdaSessionClient(
//     {
//       url: "http://127.0.0.1:13337/mcp",
//       headers: {},
//       mode: "attached",
//       protocol: "native",
//       timeoutMs: 1000,
//     },
//     target,
//     connection,
//   );
//   return { producer, client, target, resources, root };
// };
//
// describe("native IDA attached protocol", () => {
//   it("requires explicit opt-in and rejects native headless registrations", async () => {
//     const { root } = await fixture();
//     const path = join(root, "native.json");
//     await writeFile(
//       path,
//       JSON.stringify({ url: "http://127.0.0.1:13337/mcp", protocol: "native" }),
//     );
//     expect(readIdaConfiguration(path)).toMatchObject({
//       ok: true,
//       value: { mode: "attached", protocol: "native" },
//     });
//     await writeFile(
//       path,
//       JSON.stringify({
//         url: "http://127.0.0.1:13337/mcp",
//         protocol: "native",
//         mode: "headless",
//       }),
//     );
//     expect(readIdaConfiguration(path).ok).toBe(false);
//     await writeFile(path, JSON.stringify({ command: "python" }));
//     const old = readIdaConfiguration(path);
//     expect(old.ok && old.value.protocol).toBeUndefined();
//   });
//
//   it("commits native profile semantics and advertises GUI effects without starting a provider", async () => {
//     const { root, target, producer } = await fixture();
//     const path = join(root, "profile.json");
//     await writeFile(
//       path,
//       JSON.stringify({ url: "http://127.0.0.1:13337/mcp", protocol: "native" }),
//     );
//     const config = parseConfig({ REA_IDA_MCP_CONFIG: path });
//     if (!config.ok) throw config.error;
//     const provider = new IdaProvider(config.value, {}, () => {
//       throw new Error("Unexpected discovery startup");
//     });
//     expect(provider.inspectAvailability().status).toBe("available");
//     const profile = await provider.resolveAnalysisProfile(target);
//     if (!profile.ok) throw profile.error;
//     expect(profile.value.profile.provider.name).toBe("IDA MCP adapter");
//     expect(profile.value.profile.parameters).toMatchObject({
//       compatibility_profile: "native-ida-mcp",
//       mode: "attached",
//       cache_policy: "live",
//       engine_version: null,
//     });
//     expect(
//       provider
//         .capabilities()
//         .find(({ operation }) => operation === "procedure_pseudo_code")?.effects
//         .mayShowUi,
//     ).toBe(true);
//     expect(
//       provider
//         .capabilities()
//         .find(({ operation }) => operation === "procedure_assembly")?.effects
//         .mayShowUi,
//     ).toBe(false);
//     expect(producer.connects).toBe(0);
//   });
//
//   it("uses complete native JSON text instead of a shortened structured preview", () => {
//     const complete = [
//       {
//         data: [{ addr: "0x1000", name: "main", size: "0x20" }],
//         next_offset: null,
//       },
//     ];
//     const response = {
//       content: [{ type: "text", text: JSON.stringify(complete) }],
//       structuredContent: { result: [], _output_truncated: true },
//     };
//     expect(decodeIdaToolResult(response, "native")).toEqual(complete);
//     expect(() =>
//       decodeIdaToolResult({ ...response, content: [] }, "native"),
//     ).toThrow("complete JSON");
//     expect(() =>
//       decodeIdaToolResult(
//         { ...response, content: [{ type: "text", text: "broken JSON" }] },
//         "native",
//       ),
//     ).toThrow();
//     expect(() =>
//       decodeIdaToolResult({ ...response, isError: true }, "native"),
//     ).toThrow("tool failed");
//   });
// });
//
// describe("native IDA provider observations", () => {
//   it.each([false, true])(
//     "keeps unknown callers in dossier coverage when callee truncation is %s",
export const _l = 201;
