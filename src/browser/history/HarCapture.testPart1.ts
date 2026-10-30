export const __stub = 1;
// import { createHash } from "node:crypto";
// import { expect, it } from "vitest";
// import { historicalHar } from "../../../tests/fixtures/historicalHar.js";
// import { decodeCaptureText } from "./CaptureJson.js";
// import { decodeHarCapture } from "./HarCapture.js";
//
// it.each([
//   { values: [] },
//   { values: ["response"] },
//   { values: ["content"] },
//   { values: ["log"] },
//   { values: ["entries"] },
// ])(
//   "validates canonical base64 even when its parent property is sensitive: %j",
//   ({ values }) => {
//     const fixture = historicalHar();
//     const first = fixture.log.entries[0];
//     if (first === undefined) throw new Error("fixture missing");
//     const input = {
//       log: {
//         ...fixture.log,
//         entries: [
//           {
//             ...first,
//             response: {
//               ...first.response,
//               content: {
//                 size: 1,
//                 mimeType: "application/octet-stream",
//                 encoding: "base64",
//                 text: "AR==",
//               },
//             },
//           },
//         ],
//       },
//     };
//     expect(() => decodeHarCapture(JSON.stringify(input), values)).toThrow(
//       "not valid canonical base64",
//     );
//   },
// );
//
// it.each(["log", "entries", "ntries"])(
//   "excludes extracted record payloads beneath the marked structural property %s",
//   (literal) => {
//     const decoded = decodeHarCapture(JSON.stringify(historicalHar()), [
//       literal,
//     ]);
//     expect(decoded.total_records).toBeGreaterThan(0);
//     expect(decoded.container.records_pointer).toBe(null);
//     for (const [ordinal, record] of decoded.records.entries()) {
//       expect(record).toMatchObject({
//         ordinal,
//         location: { kind: "unknown", reason: "explicit-sensitive-value" },
//         reported: null,
//         binary_fields: [],
//         numeric_literals: [],
//         redactions: [{ pointer: "", reason: "explicit-sensitive-value" }],
//       });
//     }
//   },
// );
//
// it("excludes sensitive property identities before emitting keys and sidecar coordinates", () => {
//   const fixture = historicalHar();
//   const first = fixture.log.entries[0];
//   if (first === undefined) throw new Error("fixture missing");
//   const result = decodeHarCapture(
//     JSON.stringify({
//       ...fixture,
//       _extension: {
//         "api-secret/~": { numeric: 123, text: "api-secret" },
//         kept: 7,
//       },
//       log: { ...fixture.log, entries: [{ ...first, "api-secret": 42 }] },
//     }),
//     ["api-secret"],
//   );
//   expect(JSON.stringify(result)).not.toContain("api-secret");
//   expect(result.container.reported).toMatchObject({ _extension: { kept: 7 } });
//   expect(result.container.redactions).toContainEqual({
//     pointer: "/_extension",
//     reason: "explicit-sensitive-value",
//     scope: "property-name",
//   });
//   expect(result.records[0]?.redactions).toContainEqual({
//     pointer: "",
//     reason: "explicit-sensitive-value",
//     scope: "property-name",
//   });
// });
//
// it.each([
//   { value: "REDACTED", sensitive: ["REDACTED"] },
//   { value: "literal[", sensitive: ["["] },
//   { value: "before secret after", sensitive: ["secret", "REDACTED"] },
//   { value: "before secret after", sensitive: ["secret", "[RED"] },
// ])(
//   "excludes sensitive text without introducing replacement literals: $value",
//   ({ value, sensitive }) => {
//     const fixture = historicalHar();
//     const result = decodeHarCapture(
//       JSON.stringify({ ...fixture, _sensitive: value, _ordinary: "unmarked" }),
//       sensitive,
//     );
//     expect(result.container.reported).toMatchObject({
//       _sensitive: null,
//       _ordinary: "unmarked",
//     });
//     expect(result.container.redactions).toContainEqual({
//       pointer: "/_sensitive",
//       reason: "explicit-sensitive-value",
//     });
//   },
// );
//
// it("excludes a declared literal introduced by stripping transport URL userinfo", () => {
//   const fixture = historicalHar();
//   const entry = fixture.log.entries[0];
//   if (entry === undefined) throw new Error("fixture missing");
//   const url = "https://example.test/sensitive";
//   const input = {
//     log: {
//       ...fixture.log,
//       entries: [
//         {
//           ...entry,
//           request: {
//             ...entry.request,
//             url: "https://user:password@example.test/sensitive",
//           },
//         },
//       ],
//     },
//   };
//   const result = decodeHarCapture(JSON.stringify(input), [url]);
//   expect(result.records[0]?.reported).toMatchObject({ request: { url: null } });
// });
//
// it.each([
//   '"_duplicate":1,"_duplicate":1',
//   '"_duplicate":null,"_duplicate":null',
//   '"_duplicate":{"value":1},"_duplicate":{"value":1}',
//   '"_duplicate":1,"\\u005fduplicate":1',
// ])(
//   "rejects equal-valued duplicate JSON members before projection: %s",
//   (members) => {
//     const text = JSON.stringify(historicalHar()).replace(
//       '"cache":{}',
//       `"cache":{},${members}`,
//     );
//     expect(() => decodeHarCapture(text, [])).toThrow("duplicate");
//   },
// );
//
// it("rejects identical duplicate core fields before schema validation", () => {
//   const text = JSON.stringify(historicalHar()).replace(
//     '"version":"1.2"',
//     '"version":"1.2","version":"1.2"',
//   );
//   expect(() => decodeHarCapture(text, [])).toThrow("duplicate");
// });
//
// it("names the violated HAR schema constraint without restating capture values", () => {
//   expect(() =>
//     decodeHarCapture(
//       JSON.stringify({
//         log: { creator: { name: "x", version: "1" }, entries: [] },
//       }),
//       [],
//     ),
//   ).toThrow(
//     "HAR schema validation failed: required (must have required property 'version').",
//   );
// });
//
// it("preserves prototype-named producer members through the capture boundary", () => {
//   const text = JSON.stringify(historicalHar()).replace(
//     '"cache":{}',
//     '"cache":{},"_extension":{"__proto__":{"preserved":7},"constructor":"ordinary"}',
//   );
//   const result = decodeHarCapture(text, []);
//   const reported = result.records[0]?.reported;
//   expect(reported).toBeDefined();
//   if (
//     reported === undefined ||
//     reported === null ||
//     typeof reported !== "object" ||
//     Array.isArray(reported)
export const _l = 190;
