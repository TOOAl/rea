export const __stub = 1;
//                 ...first.response,
//                 content: {
//                   size: 6,
//                   mimeType: "application/octet-stream",
//                   encoding: "base64",
//                   text: "c2 VjcmV0",
//                 },
//               },
//             },
//           ],
//         },
//       }),
//       [literal],
//     );
//     expect(result.records[0]?.reported).toMatchObject({
//       response: { content: { text: null } },
//     });
//     expect(result.records[0]?.binary_fields).toContainEqual({
//       pointer: "/response/content/text",
//       representation: "har-base64-content",
//       state: "redacted",
//       content_base64: null,
//       bytes: null,
//       sha256: null,
//     });
//   },
// );
//
// it("excludes a declared literal in encoded HAR text from its binary sidecar too", () => {
//   const fixture = historicalHar();
//   const first = fixture.log.entries[0];
//   if (first === undefined) throw new Error("fixture missing");
//   const log = {
//     ...fixture.log,
//     entries: [
//       {
//         ...first,
//         response: {
//           ...first.response,
//           content: {
//             size: 3,
//             mimeType: "application/octet-stream",
//             encoding: "base64",
//             text: "AP9B",
//           },
//         },
//       },
//     ],
//   };
//   const result = decodeHarCapture(JSON.stringify({ log }), ["AP9B"]);
//   expect(JSON.stringify(result)).not.toContain("AP9B");
//   expect(result.records[0]?.binary_fields[0]?.state).toBe("redacted");
// });
//
// it("rejects excessive extension nesting instead of returning a partial capture", () => {
//   let extension: unknown = null;
//   for (let index = 0; index < 66; index++) extension = { child: extension };
//   expect(() =>
//     decodeHarCapture(
//       JSON.stringify({ ...historicalHar(), _extension: extension }),
//       [],
//     ),
//   ).toThrow("nesting budget");
// });
//
// it.each([
//   { name: "Location", side: "response" as const },
//   { name: "Referer", side: "request" as const },
//   { name: "Origin", side: "request" as const },
// ])(
//   "excludes leading-OWS userinfo from a producer $name header",
//   ({ name, side }) => {
//     const fixture = historicalHar();
//     const first = fixture.log.entries[0];
//     if (first === undefined) throw new Error("fixture missing");
//     const value =
//       " \tHTTPS://user:password@example.test/path?token=ordinary#fragment\t ";
//     const result = decodeHarCapture(
//       JSON.stringify({
//         log: {
//           ...fixture.log,
//           entries: [
//             {
//               ...first,
//               [side]: { ...first[side], headers: [{ name, value }] },
//             },
//           ],
//         },
//       }),
//       [],
//     );
//     expect(result.records[0]?.reported).toMatchObject({
//       [side]: {
//         headers: [
//           {
//             name,
//             value: " \tHTTPS://example.test/path?token=ordinary#fragment\t ",
//           },
//         ],
//       },
//     });
//     expect(result.records[0]?.redactions).toContainEqual({
//       pointer: `/${side}/headers/0/value`,
//       reason: "transport-credential",
//     });
//   },
// );
//
// it("ignores one leading byte-order mark, as HAR 1.2 requires of readers", () => {
//   const text = JSON.stringify(historicalHar());
//   const body = Buffer.from(text, "utf8");
//   const marked = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]);
//   expect(decodeCaptureText(marked, "HAR")).toBe(text);
//   expect(decodeHarCapture(decodeCaptureText(marked, "HAR"), [])).toEqual(
//     decodeHarCapture(decodeCaptureText(body, "HAR"), []),
//   );
//   // A second mark is content, not an encoding signature.
//   expect(() =>
//     decodeHarCapture(
//       decodeCaptureText(
//         Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), marked]),
//         "HAR",
//       ),
//       [],
//     ),
//   ).toThrow("HAR is malformed JSON.");
//   expect(() =>
//     decodeCaptureText(Buffer.from([0x7b, 0xff, 0x7d]), "HAR"),
//   ).toThrow("HAR is not valid UTF-8 JSON.");
// });
//
// const reportedAt = (reported: unknown, pointer: string): unknown =>
//   pointer
//     .split("/")
//     .slice(1)
//     .reduce<unknown>(
//       (value, key) =>
//         value !== null && typeof value === "object"
//           ? Reflect.get(value, key)
//           : undefined,
//       reported,
//     );
//
// it.each([
//   {
//     from: '"time":1.25',
//     literal: "0.123456789012345678901",
//     pointer: "/time",
//   },
//   { from: '"bodySize":99', literal: "1e400", pointer: "/response/bodySize" },
// ])(
//   "admits a schema-valid number that evidence cannot publish exactly: $literal",
//   ({ from, literal, pointer }) => {
//     const key = from.slice(0, from.indexOf(":") + 1);
//     const text = JSON.stringify(historicalHar()).replace(
//       from,
//       `${key}${literal}`,
//     );
//     expect(text).toContain(`${key}${literal}`);
//     const record = decodeHarCapture(text, []).records[0];
//     // The exact producer lexeme is retained, and the published value stays unknown.
//     expect(record?.numeric_literals).toContainEqual({
//       pointer,
//       producer_type: "json-number",
//       literal,
//     });
//     expect(reportedAt(record?.reported, pointer)).toBeNull();
//   },
// );
//
// it.each([
//   "9007199254740993.5",
//   "1e-400",
//   "1.0000000000000000001",
//   `1${"0".repeat(309)}.5`,
//   `-1${"0".repeat(309)}.5`,
// ])(
//   "judges an integer field by the lexeme when rounding or overflow would hide a fraction: %s",
//   (literal) => {
//     const text = JSON.stringify(historicalHar()).replace(
//       '"bodySize":99',
//       `"bodySize":${literal}`,
//     );
//     expect(() => decodeHarCapture(text, [])).toThrow(
//       "HAR schema validation failed: type (must be integer).",
//     );
//   },
// );
export const _l = 188;
