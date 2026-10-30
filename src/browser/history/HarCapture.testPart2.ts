export const __stub = 1;
//   )
//     throw new Error("No HAR object record was retained");
//   const extension = reported["_extension"];
//   expect(extension).toEqual({
//     ["__proto__"]: { preserved: 7 },
//     constructor: "ordinary",
//   });
//   expect(Object.getPrototypeOf(extension)).toBe(Object.prototype);
//   expect(Reflect.get(Object.prototype, "preserved")).toBeUndefined();
// });
//
// it("preserves Unicode, offsets, sizes, duplicate URLs and opaque extensions without inventing bytes", () => {
//   const fixture = historicalHar();
//   const first = fixture.log.entries[0];
//   if (first === undefined) throw new Error("fixture missing");
//   fixture.log.entries.push(structuredClone(first));
//   const result = decodeHarCapture(
//     JSON.stringify({
//       ...fixture,
//       _extension: { isLosslessNumber: true, value: "ordinary" },
//     }),
//     [],
//   );
//   expect(result.total_records).toBe(2);
//   expect(result.records[0]?.reported).toEqual(fixture.log.entries[0]);
//   expect(result.records[0]?.binary_fields).toEqual([]);
//   expect(result.records[0]?.numeric_literals).toContainEqual({
//     pointer: "/response/bodySize",
//     producer_type: "json-number",
//     literal: "99",
//   });
//   expect(result.records[1]?.location).toEqual({
//     kind: "json-pointer",
//     pointer: "/log/entries/1",
//   });
//   expect(result.container.reported).toMatchObject({
//     _extension: { isLosslessNumber: true, value: "ordinary" },
//     log: { entries: null },
//   });
// });
//
// it.each(["9007199254740993", "4740993", "99"])(
//   "excludes explicitly sensitive numeric lexemes and their reported values: %s",
//   (literal) => {
//     const text = JSON.stringify(historicalHar()).replace(
//       '"cache":{}',
//       '"cache":{},"_big":9007199254740993',
//     );
//     const result = decodeHarCapture(text, [literal]);
//     for (const record of result.records) {
//       expect(
//         record.numeric_literals.every(
//           (number) => !number.literal.includes(literal),
//         ),
//       ).toBe(true);
//     }
//     const pointer = literal === "99" ? "/response/bodySize" : "/_big";
//     expect(result.records[0]?.redactions).toContainEqual({
//       pointer,
//       reason: "explicit-sensitive-value",
//     });
//     if (literal === "99")
//       expect(result.records[0]?.reported).toMatchObject({
//         response: { bodySize: null },
//       });
//     else expect(result.records[0]?.reported).toMatchObject({ _big: null });
//   },
// );
//
// it.each([
//   { encoded: "1e3", sensitive: "1000" },
//   { encoded: "123.4500", sensitive: "123.45" },
//   { encoded: "0.0000001", sensitive: "1e-7" },
// ])(
//   "excludes sensitive numbers introduced by JSON normalization: $encoded",
//   ({ encoded, sensitive }) => {
//     const text = JSON.stringify(historicalHar())
//       .replace('"log":{', `"_number":${encoded},"log":{`)
//       .replace('"cache":{}', `"cache":{},"_number":${encoded}`);
//     const result = decodeHarCapture(text, [sensitive]);
//     for (const projection of [result.container, ...result.records]) {
//       expect(projection.reported).toMatchObject({ _number: null });
//       expect(projection.numeric_literals).not.toContainEqual(
//         expect.objectContaining({ pointer: "/_number" }),
//       );
//       expect(projection.redactions).toContainEqual({
//         pointer: "/_number",
//         reason: "explicit-sensitive-value",
//       });
//     }
//     const unmarked = decodeHarCapture(text, []);
//     for (const projection of [unmarked.container, ...unmarked.records]) {
//       expect(projection.reported).toMatchObject({ _number: Number(encoded) });
//       expect(projection.numeric_literals).toContainEqual({
//         pointer: "/_number",
//         producer_type: "json-number",
//         literal: encoded,
//       });
//     }
//   },
// );
//
// it("keeps unsafe numeric lexemes in extension and mandatory schema fields", () => {
//   const text = JSON.stringify(historicalHar());
//   const result = decodeHarCapture(
//     text.replace('"cache":{}', '"cache":{},"_big":9007199254740993'),
//     [],
//   );
//   expect(result.records[0]?.numeric_literals).toContainEqual({
//     pointer: "/_big",
//     producer_type: "json-number",
//     literal: "9007199254740993",
//   });
//   expect(result.records[0]?.reported).toMatchObject({ _big: null });
//   // The pinned schema admits a valid integer the evidence cannot publish exactly.
//   const mandatory = decodeHarCapture(
//     text.replace('"bodySize":0', '"bodySize":9007199254740993'),
//     [],
//   ).records[0];
//   expect(mandatory?.numeric_literals).toContainEqual({
//     pointer: "/request/bodySize",
//     producer_type: "json-number",
//     literal: "9007199254740993",
//   });
//   expect(mandatory?.reported).toMatchObject({ request: { bodySize: null } });
// });
//
// it.each(["container", "record"] as const)(
//   "retains %s extension content without interpreting it as an HTTP body",
//   (location) => {
//     const fixture = historicalHar();
//     const extension = {
//       response: { content: { encoding: "base64", text: "opaque extension" } },
//     };
//     const input =
//       location === "container"
//         ? { ...fixture, _extension: extension }
//         : {
//             log: {
//               ...fixture.log,
//               entries: fixture.log.entries.map((entry) => ({
//                 ...entry,
//                 _extension: extension,
//               })),
//             },
//           };
//     const result = decodeHarCapture(JSON.stringify(input), []);
//     expect(
//       location === "container"
//         ? result.container.reported
//         : result.records[0]?.reported,
//     ).toMatchObject({ _extension: extension });
//     expect(result.records[0]?.binary_fields).toEqual([]);
//   },
// );
//
// it("retains valid base64 bytes independently of declared sizes", () => {
//   const fixture = historicalHar();
//   const entry = fixture.log.entries[0];
//   if (entry === undefined) throw new Error("fixture missing");
//   const text = JSON.stringify({
//     log: {
//       ...fixture.log,
//       entries: [
//         {
//           ...entry,
//           response: {
//             ...entry.response,
//             content: {
//               size: 999,
//               mimeType: "application/octet-stream",
//               encoding: "base64",
//               text: "AP9B\n",
//             },
//           },
//         },
//       ],
//     },
//   });
//   const result = decodeHarCapture(text, []);
//   expect(result.records[0]?.binary_fields[0]).toMatchObject({
//     pointer: "/response/content/text",
//     state: "retained",
//     content_base64: "AP9B",
//     bytes: 3,
//   });
//   expect(result.records[0]?.reported).toMatchObject({
//     response: { content: { size: 999, text: "AP9B\n" } },
//   });
//   expect(() => decodeHarCapture(text.replace("AP9B", "AR=="), [])).toThrow(
export const _l = 190;
