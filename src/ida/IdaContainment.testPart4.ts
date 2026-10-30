export const __stub = 1;
//       const gap = await containing(client, "0x4000");
//
//       if (!inside.ok) throw inside.error;
//       if (!gap.ok) throw gap.error;
//       expect(inside.value.result).toMatchObject({ reason: "not_in_procedure" });
//       expect(gap.value.result).toMatchObject({ reason: "outside_segments" });
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("retains the completed replies when the survey is rejected", async () => {
//     const { client } = await session({
//       survey: survey([
//         { name: ".x", start: "0x2000", end: "0x1000", permissions: "r--" },
//       ]),
//     });
//     try {
//       const result = await containing(client, "0x4000");
//
//       expect(result.ok).toBe(false);
//       if (!result.ok)
//         expect(result.error.partialObservation).toMatchObject({
//           normalized_result: {
//             status: "partial",
//             observations: [
//               expect.objectContaining({ tool: "lookup_funcs" }),
//               expect.objectContaining({ tool: "survey_binary" }),
//             ],
//           },
//         });
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("rejects an address that is not hexadecimal and a document that is not the admitted target", async () => {
//     const { client, producer } = await session();
//     try {
//       const badAddress = await containing(client, "main");
//       const badDocument = await client.execute("resolve_containing_procedure", {
//         address: "0x1000",
//         document: "/somewhere/else",
//       });
//
//       for (const result of [badAddress, badDocument]) {
//         expect(result.ok).toBe(false);
//         if (!result.ok) expect(result.error._tag).toBe("AnalysisInputError");
//       }
//       expect(
//         producer.calls.some(({ name }) => name === "lookup_funcs"),
//         "invalid input never reaches upstream",
//       ).toBe(false);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
//
// describe("headless IDA document identity", () => {
//   it("accepts an explicit admitted document and rejects an unknown one for the same operations", async () => {
//     const { client, target, producer } = await session();
//     try {
//       const admitted = await client.execute("resolve_containing_procedure", {
//         address: "0x4000",
//         document: target.path,
//       });
//       const unknownContainment = await client.execute(
//         "resolve_containing_procedure",
//         { address: "0x4000", document: "/somewhere/else" },
//       );
//       const unknownListing = await client.execute("list_documents", {
//         document: "/somewhere/else",
//       });
//
//       expect(admitted.ok, "the admitted program is accepted").toBe(true);
//       for (const rejected of [unknownContainment, unknownListing]) {
//         expect(rejected.ok).toBe(false);
//         if (!rejected.ok)
//           expect(rejected.error._tag).toBe("AnalysisInputError");
//       }
//       expect(
//         producer.calls.filter(({ name }) => name === "lookup_funcs"),
//         "only the admitted request reached upstream",
//       ).toHaveLength(1);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("lists the admitted path, not its source alias or the private copy", async () => {
//     const { client, target, producer } = await session({
//       sourcePath: "/Applications/Fixture.app",
//     });
//     try {
//       const result = await client.execute("list_documents", {});
//
//       if (!result.ok) throw result.error;
//       expect(result.value.result).toEqual([target.path]);
//       expect(
//         producer.calls.filter(({ name }) => name === "server_health"),
//         "the target identity is checked before and after the local answer",
//       ).toHaveLength(2);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("fails when the target identity changes during the operation", async () => {
//     const { client } = await session({ identityChangesAfterOperation: true });
//     try {
//       const result = await client.execute("list_documents", {});
//
//       expect(result.ok).toBe(false);
//       if (!result.ok) {
//         expect(result.error.message).toContain("identity changed");
//       }
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("stops without dispatching when the request is already cancelled", async () => {
//     const controller = new AbortController();
//     controller.abort();
//     const { client, producer } = await session();
//     try {
//       const result = await client.execute(
//         "list_documents",
//         {},
//         { signal: controller.signal },
//       );
//
//       expect(result.ok).toBe(false);
//       if (!result.ok) expect(result.error._tag).toBe("AnalysisCancelledError");
//       expect(producer.calls).toEqual([]);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("lists exactly the admitted program", async () => {
//     const { client, target } = await session();
//     try {
//       const result = await client.execute("list_documents", {});
//
//       if (!result.ok) throw result.error;
//       expect(result.value.result).toEqual([target.path]);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
export const _l = 153;
