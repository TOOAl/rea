export const __stub = 1;
//           (operation) =>
//             operation === "resolve_containing_procedure" ||
//             operation === "list_documents",
//         );
//
//     expect(
//       idaCapabilities("headless", false)
//         .filter(
//           ({ operation }) =>
//             operation === "resolve_containing_procedure" ||
//             operation === "list_documents",
//         )
//         .map(({ available }) => available),
//       "both are declared available, not merely listed",
//     ).toEqual([true, true]);
//     expect(declared("headless")).toEqual([
//       "resolve_containing_procedure",
//       "list_documents",
//     ]);
//     expect(declared("attached")).toEqual(["list_documents"]);
//     expect(declared("attached", true)).toEqual(["list_documents"]);
//     expect(
//       idaCapabilities("attached", false).map(({ operation }) => operation),
//       "attached profiles declare the bound document but not address resolution",
//     ).toContain("list_documents");
//   });
//
//   it("refuses address resolution on the legacy attached profile", async () => {
//     const { client, producer } = await session({}, "attached");
//     try {
//       const result = await client.execute("resolve_containing_procedure", {
//         address: "0x1000",
//       });
//       expect(result.ok).toBe(false);
//       if (!result.ok)
//         expect(result.error._tag).toBe("AnalysisCapabilityUnavailableError");
//       expect(producer.calls.some(({ name }) => name === "lookup_funcs")).toBe(
//         false,
//       );
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
//
// describe("headless IDA containing procedure", () => {
//   it("returns the canonical entry for an interior address without reading segments", async () => {
//     const { client, producer } = await session({
//       lookup: (query) => found(query, function_),
//     });
//     try {
//       const result = await containing(client, "1ffe");
//
//       if (!result.ok) throw result.error;
//       expect(result.value.result).toEqual({
//         query_address: "0x1ffe",
//         found: true,
//         procedure: {
//           address: "0x1000",
//           name: "main",
//           classification: null,
//           body: {
//             available: false,
//             reason: "IDA MCP does not report complete function body ranges.",
//           },
//         },
//       });
//       expect(
//         producer.calls.filter(({ name }) => name === "lookup_funcs"),
//         "the normalized address is the only query",
//       ).toMatchObject([{ args: { queries: ["0x1ffe"] } }]);
//       expect(
//         producer.calls.some(({ name }) => name === "survey_binary"),
//         "a positive answer needs no segment facts",
//       ).toBe(false);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it.each([
//     ["inside the first segment", "0x1000", "not_in_procedure"],
//     ["inside an adjacent segment", "0x2000", "not_in_procedure"],
//     [
//       "at the exclusive end of the last adjacent segment",
//       "0x3000",
//       "outside_segments",
//     ],
//     ["in the gap between segments", "0x4000", "outside_segments"],
//     ["one below a segment start", "0xfff", "outside_segments"],
//     ["the last byte of a segment", "0x5fff", "not_in_procedure"],
//     ["above every segment", "0x6000", "outside_segments"],
//     [
//       "inside a one-byte segment above 2^53",
//       "0x20000000000001",
//       "not_in_procedure",
//     ],
//     [
//       "one below that segment, which a rounded number cannot tell apart",
//       "0x20000000000000",
//       "outside_segments",
//     ],
//     [
//       "at the exclusive end of that segment",
//       "0x20000000000002",
//       "outside_segments",
//     ],
//   ] as const)(
//     "reports an address that is not a function %s as %s",
//     async (_description, address, reason) => {
//       const { client, producer } = await session();
//       try {
//         const result = await containing(client, address);
//
//         if (!result.ok) throw result.error;
//         expect(result.value.result).toEqual({
//           query_address: address,
//           found: false,
//           procedure: null,
//           reason,
//         });
//         expect(
//           producer.calls.find(({ name }) => name === "survey_binary")?.args,
//           "the minimal survey is the only segment source",
//         ).toMatchObject({ detail_level: "minimal" });
//         expect(
//           producer.calls.filter(({ name }) => name === "survey_binary"),
//         ).toHaveLength(1);
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
// });
//
// describe("headless IDA containment failures", () => {
//   it.each([
//     ["no segments field", { metadata: {}, statistics: {} }],
//     ["segments that are null", survey(null)],
//     ["an empty segment list", survey([])],
//     [
//       "a row with a malformed address",
//       survey([
//         {
//           name: ".x",
//           start: "0xzz",
//           end: "0x2000",
//           size: "0x1000",
//           permissions: "r--",
//         },
//       ]),
//     ],
//     [
//       "a reversed segment",
//       survey([
export const _l = 155;
