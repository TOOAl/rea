export const __stub = 1;
// import { readFile, readdir, rm } from "node:fs/promises";
// import { sep } from "node:path";
// import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// import { z } from "zod";
// import {
//   createIdaTarget,
//   RecordingIdaMcp,
// } from "../../tests/fixtures/idaMcp.js";
// import { IdaSessionClient } from "./IdaSessionClient.js";
// import { functionDossierSchema } from "../domain/hopperValues.js";
// import { jsonValueSchema, type JsonValue } from "../domain/jsonValue.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { WindowsPrivateRuntime } from "../windows/WindowsPrivateRuntime.js";
//
// const roots: string[] = [];
// const windowsRuntimes = new Set<WindowsPrivateRuntime>();
// beforeEach(() => {
//   if (process.platform !== "win32") return;
//   const create = WindowsPrivateRuntime.create;
//   vi.spyOn(WindowsPrivateRuntime, "create").mockImplementation(
//     (parent, prefix) => {
//       const runtime = create(parent, prefix);
//       windowsRuntimes.add(runtime);
//       return runtime;
//     },
//   );
// });
// afterEach(async () => {
//   try {
//     // These pure producer fixtures spawn no IDA worker. After the retention
//     // assertions, release only the actual native owners this test created.
//     for (const runtime of windowsRuntimes) {
//       await runtime.close();
//       windowsRuntimes.delete(runtime);
//     }
//     for (const root of roots.splice(0))
//       await rm(root, { recursive: true, force: true });
//   } finally {
//     vi.restoreAllMocks();
//   }
// });
// /** A failed close whose diagnostic names exactly these unverified sessions. */
// const reportsSessions = (...sessions: readonly object[]) => ({
//   error: {
//     diagnostics: { upstream_sessions: { state: "unverified", sessions } },
//   },
// });
// const LIVE_PEER = {
//   session_id: "unrelated-live-peer",
//   backend: "worker",
//   owned: false,
// } as const;
//
// const fixture = async (
//   mode: "attached" | "headless" = "attached",
//   timeoutMs = 1000,
//   protocol?: "native",
// ) => {
//   const { root, target } = await createIdaTarget();
//   roots.push(root);
//   const producer = new RecordingIdaMcp(target, mode);
//   const client = new IdaSessionClient(
//     {
//       command: "fixture",
//       args: [],
//       env: {},
//       mode,
//       ...(protocol === undefined ? {} : { protocol }),
//       timeoutMs,
//       workspaceRoot: root,
//     },
//     target,
//     producer,
//   );
//   return { root, target, producer, client };
// };
//
// describe("headless IDA producer pagination", () => {
//   it("follows reported cursors for modern inventories, pseudocode, and bare-hex assembly without losing pages", async () => {
//     const { producer, client } = await fixture("headless");
//     producer.overrideCall = (name, args) => {
//       const first = args.offset === 0;
//       const cursor = first ? { next: 1 } : { done: true };
//       if (name === "decompile")
//         return { code: first ? "first line" : "second line", cursor };
//       if (name === "disasm")
//         return {
//           asm: {
//             name: "main",
//             start_ea: "0x1000",
//             lines: [
//               {
//                 addr: first ? "1000" : "1001",
//                 instruction: first ? "push rbp" : "ret",
//               },
//             ],
//           },
//           cursor,
//         };
//       if (name === "find_regex")
//         return {
//           matches: [
//             {
//               addr: first ? "0x3000" : "0x3002",
//               string: first ? "a.b" : "a+b",
//             },
//           ],
//           cursor,
//         };
//       if (name === "list_funcs") {
//         const page = z
//           .object({ offset: z.number() })
//           .parse(args.queries).offset;
//         return [
//           {
//             data: [
//               {
//                 addr: page === 0 ? "0x1000" : "0x2000",
//                 name: page === 0 ? "main" : "other",
//                 size: "0x20",
//               },
//             ],
//             next_offset: page === 0 ? 1 : null,
//           },
//         ];
//       }
//       return undefined;
//     };
//     const inventory = await client.execute("list_procedures", {});
//     expect(inventory.ok && inventory.value.result).toHaveLength(2);
//     const strings = await client.execute("list_strings", {});
//     expect(strings.ok && strings.value.result).toHaveLength(2);
//     const result = await client.execute("analyze_function", {
//       procedure: "main",
//     });
//     if (!result.ok) throw result.error;
//     const dossier = functionDossierSchema.parse(result.value.result);
//     expect(dossier.pseudocode).toBe("first line\nsecond line");
//     expect(dossier.assembly).toEqual(["0x1000: push rbp", "0x1001: ret"]);
//     expect(dossier).toMatchObject({
//       procedure: {
//         classification: null,
//         body: {
//           available: false,
//           reason: "IDA MCP does not report complete function body ranges.",
//         },
//       },
//       native_api: null,
//       native_value_flow: null,
//     });
//     await client.close();
//   });
// });
//
// describe("attached IDA readiness and queued cancellation", () => {
//   it("allows ready-only work after an attached provider has initialized", async () => {
//     const { producer, client } = await fixture("attached");
//     await expect(client.executeIfReady("list_procedures", {})).resolves.toBe(
//       undefined,
//     );
//
//     const startup = await client.execute("list_procedures", {});
//     if (!startup.ok) throw startup.error;
//     const result = await client.executeIfReady("list_procedures", {});
//     if (result === undefined)
//       throw new Error("expected ready attached IDA dispatch");
//     if (!result.ok) throw result.error;
//     expect(result.value.result).toEqual([
//       expect.objectContaining({ address: "0x1000", value: "main" }),
//     ]);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_open"),
//     ).toHaveLength(0);
//     await client.close();
//   });
//
//   it("returns cold and pending startup calls immediately, then cancels queued work before dispatch", async () => {
//     const { producer, client } = await fixture("headless");
//     await expect(client.executeIfReady("list_procedures", {})).resolves.toBe(
//       undefined,
//     );
//     expect(producer.connects).toBe(0);
//
//     let enterOpen: (() => void) | undefined;
//     let finishOpen: (() => void) | undefined;
//     const openEntered = new Promise<void>((resolve) => {
//       enterOpen = resolve;
//     });
//     const openGate = new Promise<void>((resolve) => {
//       finishOpen = resolve;
//     });
//     producer.beforeCall = async (name) => {
//       if (name === "idb_open") {
//         enterOpen?.();
//         await openGate;
//       }
//     };
//     const startup = client.execute("list_procedures", {});
//     await openEntered;
//     await expect(client.executeIfReady("list_strings", {})).resolves.toBe(
//       undefined,
//     );
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_open"),
//     ).toHaveLength(1);
//     finishOpen?.();
//     const started = await startup;
//     if (!started.ok) throw started.error;
//     const warm = await client.executeIfReady("list_procedures", {});
//     if (warm === undefined) throw new Error("expected ready IDA dispatch");
//     if (!warm.ok) throw warm.error;
//     expect(warm.value.result).toEqual([
//       expect.objectContaining({ address: "0x1000", value: "main" }),
//     ]);
//
//     let enterRead: (() => void) | undefined;
//     let finishRead: (() => void) | undefined;
//     const readEntered = new Promise<void>((resolve) => {
//       enterRead = resolve;
//     });
//     const readGate = new Promise<void>((resolve) => {
//       finishRead = resolve;
//     });
//     producer.beforeCall = async (name) => {
//       if (name === "list_funcs") {
//         enterRead?.();
//         await readGate;
//       }
//     };
//     const active = client.execute("list_procedures", {});
//     await readEntered;
//     const controller = new AbortController();
//     const queued = client.executeIfReady(
//       "list_strings",
//       {},
//       {
//         signal: controller.signal,
//       },
//     );
//     controller.abort();
//     await expect(queued).resolves.toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisCancelledError" },
//     });
//     finishRead?.();
//     const activeResult = await active;
//     if (!activeResult.ok) throw activeResult.error;
//     expect(
//       producer.calls.filter(({ name }) => name === "list_funcs"),
//     ).toHaveLength(3);
//     expect(producer.calls.some(({ name }) => name === "find_regex")).toBe(
//       false,
//     );
//     await client.close();
//   });
// });
//
// describe("attached IDA input identity and validation", () => {
//   it("accepts a normalized spelling of the bound document path", async () => {
//     const { target, producer, client } = await fixture();
//     const equivalent =
//       process.platform === "win32"
//         ? target.path.toLowerCase().replaceAll("\\", "/")
//         : target.path.split(sep).join(`${sep}.${sep}`);
//
//     const result = await client.execute("list_procedures", {
//       document: equivalent,
//     });
//
//     expect(result.ok).toBe(true);
//     expect(producer.calls.some(({ name }) => name === "list_functions")).toBe(
//       true,
//     );
//     await client.close();
//   });
//
//   it("rejects an unrelated document before connecting or opening a provider", async () => {
//     const { producer, client } = await fixture();
//     const result = await client.execute("list_procedures", {
//       document: "/unrelated/input",
//     });
//     expect(result.ok).toBe(false);
//     if (!result.ok) {
//       expect(result.error._tag).toBe("AnalysisInputError");
//       expect(result.error.message).toContain("list_procedures");
//     }
//     expect(producer.connects).toBe(0);
//     expect(producer.calls).toEqual([]);
//     await client.close();
//   });
//   it("preserves hexadecimal-looking function names as names unless the caller uses an explicit 0x address", async () => {
//     const { producer, client } = await fixture();
//     producer.overrideCall = (name, args) =>
//       name === "get_function_by_name" && args.name === "f"
//         ? { address: "0x1000", name: "f", size: "0x20" }
//         : undefined;
//     const found = await client.execute("procedure_address", { procedure: "f" });
//     expect(found.ok && found.value.result).toBe("0x1000");
//     expect(
//       producer.calls.some(({ name }) => name === "get_function_by_address"),
//     ).toBe(false);
//     await client.close();
//   });
//   it("preserves omitted optional arguments and rejects explicit null before connecting", async () => {
//     const { producer, client } = await fixture();
//     for (const [operation, parameters] of [
//       ["list_procedures", { document: null }],
//       ["list_strings", { address: null }],
//       ["procedure_pseudo_code", { procedure: null }],
//     ] as const) {
//       const result = await client.execute(operation, parameters);
//       expect(result.ok).toBe(false);
//       if (!result.ok)
//         expect(result.error).toMatchObject({
//           _tag: "AnalysisInputError",
//           operation,
//           issues: [{ path: Object.keys(parameters), reason: "invalid_type" }],
//         });
//     }
//     expect(producer.connects).toBe(0);
//     expect(producer.calls).toEqual([]);
//     expect((await client.execute("list_procedures", {})).ok).toBe(true);
//     expect((await client.execute("list_strings", {})).ok).toBe(true);
//     expect(
//       (await client.execute("procedure_pseudo_code", { procedure: "main" })).ok,
//     ).toBe(true);
//     expect(
//       producer.calls.filter(({ name }) => name === "decompile_function"),
//     ).toHaveLength(1);
//     await client.close();
//   });
// });
//
// describe("attached IDA function observations", () => {
//   it("resolves interior addresses and call sites to canonical entries, preserves externals, and reports unknown body evidence", async () => {
//     const { producer, client } = await fixture();
//     const result = await client.execute("analyze_function", {
//       procedure: "0x1004",
//     });
//     if (!result.ok) throw result.error;
//     const dossier = functionDossierSchema.parse(result.value.result);
//     expect(dossier.procedure.address).toBe("0x1000");
//     expect(dossier.callers.map((caller) => caller.address)).toEqual(["0x1000"]);
//     expect(dossier.callees.map((callee) => callee.address)).toEqual(["0x2000"]);
//     expect(dossier.procedure.body.available).toBe(false);
//     expect(dossier.comments).toEqual([]);
//     expect(result.value.rawResult).toMatchObject({
//       observations: expect.arrayContaining([
//         expect.objectContaining({ tool: "get_callers" }),
//       ]),
//     });
//     expect(result.value.provider.version).toBe("1");
//     expect(producer.serverInfo()).toMatchObject({
//       version: "sdk-version-is-not-ida",
//     });
//     await client.close();
//     expect(producer.calls.some(({ name }) => name.startsWith("idb_"))).toBe(
//       false,
//     );
//   });
//   it("returns complete paged inventory and distinguishes literal from regex search", async () => {
//     const { producer, client } = await fixture();
//     producer.overrideCall = (name, args) =>
//       name === "list_functions"
//         ? {
//             data: [
//               {
//                 address: args.offset === 0 ? "0x1000" : "0x2000",
//                 name: "main",
//                 size: "0x10",
//               },
//             ],
//             next_offset: args.offset === 0 ? 100 : null,
//           }
//         : undefined;
//     const inventory = await client.execute("list_procedures", {});
//     expect(inventory.ok && inventory.value.result).toHaveLength(2);
//     for (const [pattern, mode, count] of [
//       ["a.b", "literal", 1],
//       ["a+b", "literal", 0],
//       ["a.b", "regex", 1],
//     ] as const) {
//       const found = await client.execute("search_strings", { pattern, mode });
//       expect(found.ok && found.value.result).toHaveLength(count);
//     }
//     expect(
//       (await client.execute("search_strings", { pattern: "[", mode: "regex" }))
//         .ok,
//     ).toBe(false);
//     await client.close();
//   });
//   it("rejects mismatched identities and target switches rather than returning a successful observation", async () => {
//     const { producer, client, target } = await fixture();
//     producer.inputSha256 = "a".repeat(64);
//     const mismatch = await client.execute("health", {});
//     expect(mismatch.ok).toBe(false);
//     if (!mismatch.ok) expect(mismatch.error.message).toContain("SHA-256");
//     producer.inputSha256 = target.sha256;
//     producer.beforeCall = async (name) => {
//       if (name === "decompile_function") producer.imageBase = "0x2000";
//     };
export const _l = 402;
