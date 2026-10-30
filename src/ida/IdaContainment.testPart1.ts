export const __stub = 1;
// import { rm } from "node:fs/promises";
// import { afterEach, describe, expect, it } from "vitest";
// import type { JsonValue } from "../domain/jsonValue.js";
// import {
//   createIdaTarget,
//   RecordingIdaMcp,
// } from "../../tests/fixtures/idaMcp.js";
// import { decodeIdaToolResult } from "./IdaMcpConnection.js";
// import { idaCapabilities } from "./IdaProviderCapabilities.js";
// import { IdaSessionClient } from "./IdaSessionClient.js";
//
// const roots: string[] = [];
// afterEach(async () => {
//   for (const root of roots.splice(0))
//     await rm(root, { recursive: true, force: true });
// });
//
// const segment = (name: string, start: string, end: string) => ({
//   name,
//   start,
//   end,
//   size: `0x${(BigInt(end) - BigInt(start)).toString(16)}`,
//   permissions: "r--",
// });
//
// /** Adjacent .text and .data, a gap, then a segment above 2^53. */
// const SEGMENTS = [
//   segment(".text", "0x1000", "0x2000"),
//   segment(".data", "0x2000", "0x3000"),
//   segment(".far", "0x5000", "0x6000"),
//   segment(".huge", "0x20000000000001", "0x20000000000002"),
// ];
//
// /** The same segments in descending order, which a scan may not rely on. */
// const UNSORTED = [...SEGMENTS].reverse();
//
// const survey = (segments: JsonValue = SEGMENTS) => ({
//   metadata: { path: "/db/target.i64", module: "target", arch: "metapc" },
//   statistics: { total_segments: Array.isArray(segments) ? segments.length : 0 },
//   segments,
//   entrypoints: [],
// });
//
// const function_ = { addr: "0x1000", name: "main", size: "0x20" };
//
// const MODERN_WITHOUT_SURVEY = [
//   "idb_open",
//   "idb_list",
//   "idb_close",
//   "server_health",
//   "list_funcs",
//   "lookup_funcs",
//   "find_regex",
//   "decompile",
//   "disasm",
//   "callees",
//   "xrefs_to",
// ];
//
// interface Upstream {
//   /** Answer for the lookup of the queried address; default is "Not a function". */
//   readonly lookup?: (query: string) => JsonValue;
//   readonly survey?: JsonValue;
//   readonly tools?: readonly string[];
//   readonly surveyFailure?: "error" | "preview";
//   /** A distinct source alias of the admitted target, as for an app bundle. */
//   readonly sourcePath?: string;
//   /** Report a different input from the second health read on. */
//   readonly identityChangesAfterOperation?: boolean;
// }
//
// const session = async (
//   upstream: Upstream = {},
//   mode: "headless" | "attached" = "headless",
// ) => {
//   const created = await createIdaTarget("x86_64");
//   const { root } = created;
//   const target =
//     upstream.sourcePath === undefined
//       ? created.target
//       : { ...created.target, sourcePath: upstream.sourcePath };
//   roots.push(root);
//   const producer = new RecordingIdaMcp(target, mode);
//   if (upstream.tools !== undefined) producer.tools = upstream.tools;
//   producer.beforeCall = async (name) => {
//     if (name !== "survey_binary") return;
//     if (upstream.surveyFailure === "error")
//       decodeIdaToolResult({
//         content: [{ type: "text", text: "survey failed" }],
//         isError: true,
//       });
//     if (upstream.surveyFailure === "preview")
//       decodeIdaToolResult({
//         content: [{ type: "text", text: "preview" }],
//         _meta: { ida_mcp: { output_truncated: true } },
//       });
//   };
//   let healthReads = 0;
//   producer.overrideCall = (name, args) => {
//     if (name === "server_health" && upstream.identityChangesAfterOperation) {
//       healthReads += 1;
//       if (healthReads === 2)
//         return {
//           status: "ok",
//           input_path: "/different/target.elf",
//           idb_path: "/different/target.elf.i64",
//           module: "target.elf",
//           imagebase: "0x1000",
//           auto_analysis_ready: true,
//         };
//     }
//     if (name === "lookup_funcs") {
//       const queries = Array.isArray(args.queries) ? args.queries : [];
//       return queries.map((query) =>
//         upstream.lookup === undefined
//           ? { query, fn: null, error: "Not a function" }
//           : upstream.lookup(String(query)),
//       );
//     }
//     if (name === "survey_binary") return upstream.survey ?? survey();
//     return undefined;
//   };
//   const client = new IdaSessionClient(
//     {
//       command: "fixture",
//       args: [],
//       env: {},
//       mode,
//       timeoutMs: 1000,
//       workspaceRoot: root,
//     },
//     target,
//     producer,
//   );
//   return { client, producer, target };
// };
//
// const containing = async (
//   client: IdaSessionClient,
//   address: string,
//   options?: Parameters<IdaSessionClient["execute"]>[2],
// ) => client.execute("resolve_containing_procedure", { address }, options);
//
// const found = (query: string, fn: typeof function_) => ({
//   query,
//   fn,
//   error: null,
// });
//
// describe("IDA containment capabilities", () => {
//   it("declares document identity in both profiles and address resolution only in headless", () => {
//     const declared = (mode: "attached" | "headless", native = false) =>
//       idaCapabilities(mode, false, native)
//         .map(({ operation }) => operation)
//         .filter(
export const _l = 155;
