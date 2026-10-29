export const __stub = 1;
//         { name: ".x", start: "0x2000", end: "0x1000", permissions: "r--" },
//       ]),
//     ],
//     [
//       "a size that disagrees with the bounds",
//       survey([{ ...segment(".x", "0x1000", "0x2000"), size: "0x10" }]),
//     ],
//     [
//       "a total that disagrees with the rows",
//       { ...survey(), statistics: { total_segments: 9 } },
//     ],
//     ["a malformed row after valid ones", survey([...SEGMENTS, { name: ".y" }])],
//   ] as const)(
//     "fails instead of guessing a reason when the survey has %s",
//     async (_description, reply) => {
//       const { client } = await session({ survey: reply as JsonValue });
//       try {
//         const result = await containing(client, "0x4000");
//
//         expect(result.ok).toBe(false);
//         if (!result.ok) expect(result.error._tag).toBe("AnalysisOutputError");
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
//
//   it.each(["error", "preview"] as const)(
//     "fails when the survey tool reports %s",
//     async (surveyFailure) => {
//       const { client } = await session({ surveyFailure });
//       try {
//         const result = await containing(client, "0x4000");
//
//         expect(result.ok).toBe(false);
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
//
//   it("fails without a segment source when the server does not advertise the survey", async () => {
//     const { client, producer } = await session({
//       tools: MODERN_WITHOUT_SURVEY,
//     });
//     try {
//       const negative = await containing(client, "0x4000");
//
//       expect(negative.ok).toBe(false);
//       expect(
//         producer.calls.some(({ name }) => name === "survey_binary"),
//         "an unadvertised tool is never requested",
//       ).toBe(false);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("still answers a positive lookup when the server does not advertise the survey", async () => {
//     const { client } = await session({
//       lookup: (query) => found(query, function_),
//       tools: MODERN_WITHOUT_SURVEY,
//     });
//     try {
//       const result = await containing(client, "0x1010");
//
//       expect(result.ok).toBe(true);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
//
// describe("headless IDA containment lookup failures", () => {
//   it.each([
//     ["an answer for another query", () => found("0x9999", function_)],
//     [
//       "a function together with an error",
//       (query: string) => ({ query, fn: function_, error: "Not found" }),
//     ],
//     [
//       "neither a function nor an error",
//       (query: string) => ({ query, fn: null, error: null }),
//     ],
//     [
//       "an unknown error text",
//       (query: string) => ({ query, fn: null, error: "boom" }),
//     ],
//     [
//       "a padded missing answer",
//       (query: string) => ({ query, fn: null, error: " Not a function" }),
//     ],
//   ] as const)(
//     "treats %s as a producer failure and reads no segments",
//     async (_description, lookup) => {
//       const { client, producer } = await session({ lookup });
//       try {
//         const result = await containing(client, "0x4000");
//
//         expect(result.ok).toBe(false);
//         if (!result.ok) expect(result.error._tag).toBe("AnalysisProtocolError");
//         expect(
//           producer.calls.some(({ name }) => name === "survey_binary"),
//         ).toBe(false);
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
//
//   it('treats "Not found" for an address like any expected missing answer', async () => {
//     const { client } = await session({
//       lookup: (query) => ({ query, fn: null, error: "Not found" }),
//     });
//     try {
//       const result = await containing(client, "0x4000");
//
//       if (!result.ok) throw result.error;
//       expect(result.value.result).toMatchObject({
//         found: false,
//         reason: "outside_segments",
//       });
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("stops before the survey when the request is cancelled after the lookup", async () => {
//     const controller = new AbortController();
//     const { client, producer } = await session();
//     const inner = producer.beforeCall;
//     producer.beforeCall = async (name, args) => {
//       await inner?.(name, args);
//       if (name === "lookup_funcs") controller.abort();
//     };
//     try {
//       const result = await containing(client, "0x4000", {
//         signal: controller.signal,
//       });
//
//       expect(result.ok).toBe(false);
//       if (!result.ok) expect(result.error._tag).toBe("AnalysisCancelledError");
//       expect(
//         producer.calls.some(({ name }) => name === "survey_binary"),
//         "nothing is dispatched after cancellation",
//       ).toBe(false);
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("does not depend on the order of the surveyed segments", async () => {
//     const { client } = await session({ survey: survey(UNSORTED) });
//     try {
//       const inside = await containing(client, "0x1000");
export const _l = 155;
