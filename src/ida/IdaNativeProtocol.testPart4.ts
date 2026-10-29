export const __stub = 1;
//       {
//         pattern: "[",
//         mode: "literal",
//         case_sensitive: false,
//         expected: ["literal[bracket"],
//       },
//       {
//         pattern: "\\",
//         mode: "literal",
//         case_sensitive: true,
//         expected: ["a\\b"],
//       },
//       {
//         pattern: "\ud800",
//         mode: "literal",
//         case_sensitive: false,
//         expected: [],
//       },
//       {
//         pattern: "🧪",
//         mode: "literal",
//         case_sensitive: true,
//         expected: ["🧪"],
//       },
//     ];
//     try {
//       for (const { expected, ...query } of cases) {
//         const before = producer.calls.length;
//         const result = await client.execute("search_strings", query);
//         if (!result.ok) throw result.error;
//         expect(result.value.result).toEqual(
//           expected.map((value) => ({
//             address: `0x${(0x3000 + values.indexOf(value)).toString(16)}`,
//             value,
//           })),
//         );
//         const reads = producer.calls
//           .slice(before)
//           .filter(({ name }) => name === "find_regex");
//         expect(reads).toHaveLength(1);
//         if (query.mode === "regex" || query.pattern === "\ud800")
//           expect(reads[0]?.args.pattern).toBe("[\\s\\S]*");
//         else expect(reads[0]?.args.pattern).not.toBe("[\\s\\S]*");
//       }
//       const before = producer.calls.length;
//       const invalid = await client.execute("search_strings", {
//         pattern: "[",
//         mode: "regex",
//       });
//       expect(invalid.ok).toBe(false);
//       if (!invalid.ok) expect(invalid.error).toBeInstanceOf(AnalysisInputError);
//       expect(
//         producer.calls.slice(before).some(({ name }) => name === "find_regex"),
//       ).toBe(false);
//     } finally {
//       await client.close();
//     }
//   });
// });
//
// describe("native IDA string pagination and failures", () => {
//   it("reads all candidate pages and reports native search failures explicitly", async () => {
//     const { client, producer } = await fixture();
//     producer.overrideCall = (name, args) =>
//       name === "find_regex"
//         ? {
//             matches: [
//               {
//                 addr: args.offset === 0 ? "0x3000" : "0x3001",
//                 string: args.offset === 0 ? "σ" : "needle",
//               },
//             ],
//             cursor: args.offset === 0 ? { next: 1 } : { done: true },
//           }
//         : undefined;
//     try {
//       const found = await client.execute("search_strings", {
//         pattern: "needle",
//       });
//       if (!found.ok) throw found.error;
//       expect(found.value.result).toEqual([
//         { address: "0x3001", value: "needle" },
//       ]);
//       const reads = producer.calls.filter(({ name }) => name === "find_regex");
//       expect(reads.map(({ args }) => args.offset)).toEqual([0, 1]);
//       expect(new Set(reads.map(({ args }) => args.pattern)).size).toBe(1);
//       producer.overrideCall = (name) =>
//         name === "find_regex"
//           ? {
//               matches: [],
//               cursor: { done: true },
//               error: "Regex resource failure",
//             }
//           : undefined;
//       const failed = await client.execute("search_strings", {
//         pattern: "needle",
//       });
//       expect(failed.ok).toBe(false);
//       if (!failed.ok) {
//         expect(failed.error).toBeInstanceOf(AnalysisProtocolError);
//         expect(failed.error.message).toContain("Regex resource failure");
//       }
//     } finally {
//       await client.close();
//     }
//   });
// });
//
// describe("native IDA malformed observations", () => {
//   it("rejects wrong-function pseudocode, upstream cloud failures, and malformed assembly", async () => {
//     const { client, producer } = await fixture();
//     for (const value of [
//       { addr: "0x2000", ok: true, pseudocode: "int wrong(void);" },
//       {
//         addr: "0x1000",
//         ok: false,
//         error: "No pseudocode widget for this function after decompilation",
//       },
//       { addr: "0x1000", ok: true },
//     ]) {
//       producer.overrideCall = (name) =>
//         name === "decompile" ? value : undefined;
//       const result = await client.execute("procedure_pseudo_code", {
//         procedure: "main",
//       });
//       expect(result.ok).toBe(false);
//     }
//     producer.overrideCall = (name) =>
//       name === "disasm"
//         ? {
//             asm: {
//               name: "main",
//               start_ea: "0x1000",
//               lines: "main (.text @ 0x1000):\nunsupported",
//             },
//             cursor: { done: true },
//           }
//         : undefined;
//     expect(
//       (await client.execute("procedure_assembly", { procedure: "main" })).ok,
//     ).toBe(false);
//     await client.close();
//   });
//
//   it("follows native assembly pages and rejects non-advancing cursors", async () => {
//     const { client, producer } = await fixture();
//     producer.overrideCall = (name, args): JsonValue | undefined =>
//       name === "disasm"
//         ? {
//             asm: {
//               name: "main",
//               start_ea: "0x1000",
//               lines: `main (.text @ 0x1000):\n${args.offset === 0 ? "1000  nop" : "1001  ret"}`,
//             },
//             cursor: args.offset === 0 ? { next: 1 } : { done: true },
//           }
//         : undefined;
//     const result = await client.execute("procedure_assembly", {
//       procedure: "main",
//     });
//     expect(result.ok && result.value.result).toBe("0x1000: nop\n0x1001: ret");
//     producer.overrideCall = (name) =>
//       name === "find_regex" ? { matches: [], cursor: { next: 0 } } : undefined;
//     expect((await client.execute("list_strings", {})).ok).toBe(false);
//     await client.close();
//   });
// });
//
// describe("native IDA attached operation admission", () => {
//   it("forwards the native producer's explicit reference cap flag", async () => {
//     const { client } = await fixture();
//     const result = await client.execute("xrefs", { address: "0x1000" });
//
//     if (!result.ok) throw result.error;
//     expect(result.value.referencesTruncated).toBe(false);
//     await client.close();
//   });
//
//   it("reports the bound document but not headless-only address resolution", async () => {
//     const { client, producer, target } = await fixture();
//     const containing = await client.execute("resolve_containing_procedure", {
//       address: "0x1000",
//     });
//     expect(containing.ok).toBe(false);
//     if (!containing.ok)
//       expect(containing.error._tag).toBe("AnalysisCapabilityUnavailableError");
//
//     const documents = await client.execute("list_documents", {});
//     if (!documents.ok) throw documents.error;
//     expect(documents.value.result).toEqual([target.path]);
//     expect(
//       producer.calls.some(({ name }) => name === "lookup_funcs"),
//       "nothing is dispatched upstream",
//     ).toBe(false);
//     await client.close();
//   });
// });
export const _l = 197;
