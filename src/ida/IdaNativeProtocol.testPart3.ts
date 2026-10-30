export const __stub = 1;
//         if (!result.ok) {
//           expect(result.error).toBeInstanceOf(AnalysisProtocolError);
//           expect(result.error.message).toContain("truncation marker");
//         }
//       }
//       producer.overrideCall = (name, args) =>
//         name === "callees"
//           ? [{ callees: null, error: "callee database failure" }]
//           : previous?.(name, args);
//       const result = await client.execute("procedure_callees", {
//         procedure: "main",
//       });
//       expect(result.ok).toBe(false);
//       if (!result.ok)
//         expect(result.error.message).toContain("callee database failure");
//     } finally {
//       await client.close();
//     }
//   });
// });
//
// describe("native IDA callee lookup batches", () => {
//   it("batches unique callees and binds reordered replies to their source queries", async () => {
//     const { client, producer } = await fixture();
//     const previous = producer.overrideCall;
//     producer.overrideCall = (name, args) => {
//       if (name === "callees")
//         return [
//           {
//             callees: [
//               { addr: "0x2004", name: "first", type: "internal" },
//               { addr: "0x2004", name: "first", type: "internal" },
//               { addr: "0x3000", name: "second", type: "internal" },
//               { addr: "0x4000", name: "import", type: "external" },
//             ],
//             more: false,
//             error: null,
//           },
//         ];
//       if (
//         name === "lookup_funcs" &&
//         Array.isArray(args.queries) &&
//         args.queries.length > 1
//       )
//         return [
//           {
//             query: "0x3000",
//             fn: { addr: "0x3000", name: "second", size: "0x20" },
//             error: null,
//           },
//           {
//             query: "0x2004",
//             fn: { addr: "0x2000", name: "first", size: "0x20" },
//             error: null,
//           },
//         ];
//       return previous?.(name, args);
//     };
//     try {
//       const result = await client.execute("procedure_callees", {
//         procedure: "main",
//       });
//       if (!result.ok) throw result.error;
//       expect(result.value.result).toEqual(["0x4000", "0x2000", "0x3000"]);
//       expect(
//         producer.calls
//           .filter(({ name }) => name === "lookup_funcs")
//           .map(({ args }) => args.queries),
//       ).toEqual([["main"], ["0x2004", "0x3000"]]);
//       expect(result.value.rawResult).toMatchObject({
//         observations: expect.arrayContaining([
//           expect.objectContaining({
//             tool: "lookup_funcs",
//             arguments: { queries: ["0x2004", "0x3000"] },
//             result: [
//               expect.objectContaining({ query: "0x3000" }),
//               expect.objectContaining({ query: "0x2004" }),
//             ],
//           }),
//         ]),
//       });
//     } finally {
//       await client.close();
//     }
//   });
//
//   it("rejects missing, duplicate, unrelated, and failed callee lookup rows as provider faults", async () => {
//     const { client, producer } = await fixture();
//     const previous = producer.overrideCall;
//     const first = {
//       query: "0x2000",
//       fn: { addr: "0x2000", name: "first", size: "0x20" },
//       error: null,
//     };
//     const second = {
//       query: "0x3000",
//       fn: { addr: "0x3000", name: "second", size: "0x20" },
//       error: null,
//     };
//     let rows: JsonValue = [];
//     producer.overrideCall = (name, args) => {
//       if (name === "callees")
//         return [
//           {
//             callees: [
//               { addr: "0x2000", name: "first", type: "internal" },
//               { addr: "0x3000", name: "second", type: "internal" },
//             ],
//             more: false,
//             error: null,
//           },
//         ];
//       if (
//         name === "lookup_funcs" &&
//         Array.isArray(args.queries) &&
//         args.queries.length > 1
//       )
//         return rows;
//       return previous?.(name, args);
//     };
//     try {
//       for (const reply of [
//         [first],
//         [first, first],
//         [first, { ...second, query: "unrequested" }],
//         [first, { query: "0x3000", fn: null, error: "Not found" }],
//       ]) {
//         rows = reply;
//         const result = await client.execute("procedure_callees", {
//           procedure: "main",
//         });
//         expect(result.ok).toBe(false);
//         if (!result.ok)
//           expect(result.error).toBeInstanceOf(AnalysisProtocolError);
//       }
//     } finally {
//       await client.close();
//     }
//   });
// });
//
// describe("native IDA literal matching", () => {
//   it("retains literal, Unicode, case, and regex semantics while narrowing native candidates", async () => {
//     const { client, producer } = await fixture();
//     const values = [
//       "A.B",
//       "axb",
//       "Kelvin",
//       "İstanbul",
//       "σ",
//       "ς",
//       "literal[bracket",
//       "a\\b",
//       "🧪",
//     ];
//     producer.overrideCall = (name, args) => {
//       if (name !== "find_regex") return undefined;
//       if (typeof args.pattern !== "string")
//         throw new Error("Invalid fixture pattern");
//       // Exercise a byte-oriented producer seam, including Unicode candidates
//       // whose final matching semantics belong to REA, not the upstream regex.
//       const regex = new RegExp(
//         Buffer.from(args.pattern).toString("latin1"),
//         "i",
//       );
//       return {
//         matches: values.flatMap((value, i) =>
//           regex.test(Buffer.from(value).toString("latin1"))
//             ? [{ addr: `0x${(0x3000 + i).toString(16)}`, string: value }]
//             : [],
//         ),
//         cursor: { done: true },
//       };
//     };
//     const cases = [
//       {
//         pattern: "a.b",
//         mode: "literal",
//         case_sensitive: false,
//         expected: ["A.B"],
//       },
//       { pattern: "a.b", mode: "literal", case_sensitive: true, expected: [] },
//       {
//         pattern: "kelvin",
//         mode: "literal",
//         case_sensitive: false,
//         expected: ["Kelvin"],
//       },
//       {
//         pattern: "İ",
//         mode: "literal",
//         case_sensitive: false,
//         expected: ["İstanbul"],
//       },
//       { pattern: "σ", mode: "literal", case_sensitive: false, expected: ["σ"] },
//       {
//         pattern: "σ",
//         mode: "regex",
//         case_sensitive: false,
//         expected: ["σ", "ς"],
//       },
export const _l = 201;
