export const __stub = 1;
//     async (more) => {
//       const { client, producer } = await fixture();
//       const original = producer.overrideCall;
//       producer.overrideCall = (name, args) =>
//         name === "callees"
//           ? [
//               {
//                 callees: [{ addr: "0x2000", name: "puts", type: "external" }],
//                 more,
//                 error: null,
//               },
//             ]
//           : original?.(name, args);
//       try {
//         const direct = await client.execute("procedure_callees", {
//           procedure: "main",
//         });
//         if (!direct.ok) throw direct.error;
//         expect(direct.value.relationshipCoverage).toMatchObject({
//           status: more ? "partial" : "complete",
//         });
//         const dossier = await client.execute("analyze_function", {
//           procedure: "main",
//         });
//         if (!dossier.ok) throw dossier.error;
//         expect(dossier.value.relationshipCoverage).toMatchObject({
//           status: "unknown",
//           reason: more
//             ? expect.stringContaining(
//                 "Callees: Upstream callees capped results at 500; additional callees remain unknown.",
//               )
//             : expect.stringContaining(
//                 "Callers: Upstream xrefs do not establish direct caller relationships.",
//               ),
//         });
//         if (more)
//           expect(dossier.value.relationshipCoverage).toMatchObject({
//             reason: expect.stringContaining(
//               "Callers: Upstream xrefs do not establish direct caller relationships.",
//             ),
//           });
//         expect(dossier.value.result).toMatchObject({
//           callers: [],
//           callees: [{ address: "0x2000", name: "puts" }],
//           facet_availability: {
//             callers: { available: false },
//             callees: { available: true },
//           },
//         });
//         if (more)
//           expect(dossier.value.limitations).toContain(
//             "Upstream callees capped results at 500; additional callees remain unknown.",
//           );
//       } finally {
//         await client.close();
//       }
//     },
//   );
//
//   it("retains native tool provenance, reads recorded metadata, and closes only its connection", async () => {
//     const { client, producer, resources } = await fixture();
//     for (const operation of [
//       "list_procedures",
//       "list_strings",
//       "procedure_assembly",
//       "procedure_pseudo_code",
//       "procedure_callees",
//       "xrefs",
//       "analyze_function",
//     ] as const) {
//       const result = await client.execute(
//         operation,
//         operation === "list_procedures" || operation === "list_strings"
//           ? {}
//           : operation === "xrefs"
//             ? { address: "0x1000" }
//             : { procedure: "main" },
//       );
//       if (!result.ok) throw result.error;
//       expect(result.value.provider.name).toBe("IDA MCP adapter");
//       if (operation === "xrefs")
//         expect(
//           result.value.referencesTruncated,
//           "the native producer's explicit cap flag is forwarded",
//         ).toBe(false);
//       if (operation === "procedure_assembly")
//         expect(result.value.result).toBe("0x1000: ret");
//       if (operation === "procedure_pseudo_code") {
//         expect(result.value.result).toBe(producer.pseudocode);
//         expect(result.value.rawResult).toMatchObject({
//           observations: expect.arrayContaining([
//             expect.objectContaining({
//               tool: "decompile",
//               result: {
//                 addr: "0x1000",
//                 ok: true,
//                 pseudocode: producer.pseudocode,
//                 lines: 1,
//               },
//             }),
//           ]),
//         });
//       }
//     }
//     expect(resources).toHaveLength(14);
//     expect(new Set(resources)).toEqual(new Set(["ida://idb/metadata"]));
//     expect(
//       producer.calls.find(({ name }) => name === "find_regex")?.args.pattern,
//     ).toBe("[\\s\\S]*");
//     expect(
//       (await client.execute("procedure_callers", { procedure: "main" })).ok,
//     ).toBe(false);
//     expect((await client.close()).ok).toBe(true);
//     expect(producer.closes).toBe(1);
//     expect(producer.calls.some(({ name }) => name.startsWith("idb_"))).toBe(
//       false,
//     );
//     const capabilities = idaCapabilities("attached", false, true);
//     expect(
//       capabilities.find(({ operation }) => operation === "procedure_callers")
//         ?.available,
//     ).toBe(false);
//     expect(
//       capabilities.find(
//         ({ operation }) => operation === "procedure_pseudo_code",
//       )?.effects,
//     ).toMatchObject({ mayShowUi: true, mayAccessNetwork: true });
//     expect(
//       idaCapabilities("attached", false).find(
//         ({ operation }) => operation === "procedure_callers",
//       )?.available,
//     ).toBe(true);
//   });
//
//   it("rejects unavailable or mismatched recorded input hashes and database switches", async () => {
//     const { client, producer, target } = await fixture();
//     for (const hash of ["unavailable", "a".repeat(64)]) {
//       producer.inputSha256 = hash;
//       expect((await client.execute("health", {})).ok).toBe(false);
//     }
//     producer.inputSha256 = target.sha256;
//     expect((await client.execute("health", {})).ok).toBe(true);
//     producer.inputPath += ".other.i64";
//     expect((await client.execute("list_procedures", {})).ok).toBe(false);
//     await client.close();
//   });
// });
//
// describe("native IDA query identity", () => {
//   it.each([
//     "procedure_address",
//     "procedure_assembly",
//     "procedure_pseudo_code",
//     "analyze_function",
//   ] as const)(
//     "rejects a successful lookup for another query before %s can accept the wrong function",
//     async (operation) => {
//       const { client, producer } = await fixture();
//       producer.overrideCall = (name) =>
//         name === "lookup_funcs"
//           ? [
//               {
//                 query: "helper",
//                 fn: { addr: "0x2000", name: "helper", size: "0x20" },
//                 error: null,
//               },
//             ]
//           : undefined;
//       try {
//         const result = await client.execute(operation, { procedure: "main" });
//         if (result.ok)
//           throw new Error("Expected a mismatched lookup rejection");
//         expect(result.error._tag).toBe("AnalysisProtocolError");
//         expect(result.error.message).toContain("different query");
//         expect(
//           producer.calls.some(
//             ({ name }) => name === "disasm" || name === "decompile",
//           ),
//         ).toBe(false);
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
// });
//
// describe("native IDA callee truncation", () => {
//   it("rejects native successes without an explicit truncation marker and preserves upstream failures", async () => {
//     const { client, producer } = await fixture();
//     const previous = producer.overrideCall;
//     try {
//       producer.overrideCall = (name, args) =>
//         name === "callees"
//           ? [{ callees: [], error: null }]
//           : previous?.(name, args);
//       for (const operation of [
//         "procedure_callees",
//         "analyze_function",
//       ] as const) {
//         const result = await client.execute(operation, { procedure: "main" });
//         expect(result.ok).toBe(false);
export const _l = 201;
