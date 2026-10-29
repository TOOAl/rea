export const __stub = 1;
//     "not valid canonical base64",
//   );
// });
//
// it("redacts actual authentication fields and explicit binary values while preserving similarly named extensions", () => {
//   const fixture = historicalHar();
//   const entry = fixture.log.entries[0];
//   if (entry === undefined) throw new Error("fixture missing");
//   const raw = {
//     log: {
//       ...fixture.log,
//       entries: [
//         {
//           ...entry,
//           request: {
//             ...entry.request,
//             url: "https://user:password@example.test/a?token=ordinary#fragment",
//             headers: [
//               { name: "Authorization", value: "Bearer transport-secret" },
//               { name: "X-Test", value: "a" },
//               { name: "X-Test", value: "b" },
//             ],
//             cookies: [{ name: "session", value: "cookie-secret" }],
//           },
//           response: {
//             ...entry.response,
//             content: {
//               size: 5,
//               mimeType: "application/octet-stream",
//               encoding: "base64",
//               text: Buffer.from("chosen-private").toString("base64"),
//             },
//           },
//           _extension: {
//             response: {
//               headers: [{ name: "Authorization", value: "ordinary-extension" }],
//             },
//           },
//         },
//       ],
//     },
//   };
//   const result = decodeHarCapture(JSON.stringify(raw), ["chosen-private"]);
//   const output = JSON.stringify(result);
//   for (const secret of [
//     "password",
//     "transport-secret",
//     "cookie-secret",
//     Buffer.from("chosen-private").toString("base64"),
//   ])
//     expect(output).not.toContain(secret);
//   expect(output).toContain("token=ordinary#fragment");
//   expect(output).toContain("ordinary-extension");
//   expect(result.records[0]?.reported).toMatchObject({
//     request: {
//       headers: [
//         { name: "Authorization", value: null },
//         { name: "X-Test", value: "a" },
//         { name: "X-Test", value: "b" },
//       ],
//     },
//   });
//   expect(result.records[0]?.binary_fields[0]).toMatchObject({
//     state: "redacted",
//     sha256: null,
//     content_base64: null,
//   });
// });
//
// it.each([
//   "{",
//   '{"log":{},"log":{}}',
//   JSON.stringify({ log: { version: "1.2", entries: [] } }),
// ])("rejects malformed producer data %s", (text) => {
//   expect(() => decodeHarCapture(text, [])).toThrow();
// });
//
// it("preserves observed SaveHar null post-data without broadening arbitrary HAR producers", () => {
//   const fixture = historicalHar();
//   const first = fixture.log.entries[0];
//   if (first === undefined) throw new Error("fixture missing");
//   const log = {
//     ...fixture.log,
//     creator: { name: "mitmproxy", version: "12.2.3" },
//     entries: [
//       {
//         ...first,
//         request: {
//           ...first.request,
//           postData: { mimeType: "text/plain", text: null },
//         },
//       },
//     ],
//   };
//   expect(
//     decodeHarCapture(JSON.stringify({ log }), []).records[0]?.reported,
//   ).toMatchObject({ request: { postData: { text: null } } });
//   expect(() =>
//     decodeHarCapture(
//       JSON.stringify({
//         log: { ...log, creator: { name: "other", version: "1" } },
//       }),
//       [],
//     ),
//   ).toThrow("HAR schema validation failed");
// });
//
// it.each(["[2001:db8::1]", "[::1]", "[::ffff:192.0.2.1]"])(
//   "retains Playwright 1.58.2 bracketed IPv6 spelling in reported Evidence: %s",
//   (address) => {
//     const fixture = historicalHar();
//     const first = fixture.log.entries[0];
//     if (first === undefined) throw new Error("fixture missing");
//     const input = {
//       log: {
//         ...fixture.log,
//         creator: { name: "Playwright", version: "1.58.2" },
//         entries: [
//           {
//             ...first,
//             serverIPAddress: address,
//             _extension: { serverIPAddress: address },
//           },
//           structuredClone(first),
//         ],
//       },
//     };
//     const decoded = decodeHarCapture(JSON.stringify(input), []);
//     expect(decoded.records[0]).toMatchObject({
//       reported: {
//         serverIPAddress: address,
//         _extension: { serverIPAddress: address },
//       },
//     });
//     expect(decoded.records[0]?.limitations).toContain(
//       "This capture declares Playwright 1.58.2 and reports bracketed IPv6 serverIPAddress. Original spellings are retained; brackets were removed only from valid IPv6 values in the validation copy. Producer declarations are not authenticated.",
//     );
//     expect(
//       decoded.records[1]?.limitations.some((limitation) =>
//         limitation.includes("bracketed IPv6 serverIPAddress"),
//       ),
//     ).toBe(false);
//   },
// );
//
// it.each([
//   { name: "other", version: "1.58.2", address: "[2001:db8::1]" },
//   { name: "Playwright", version: "1.58.1", address: "[2001:db8::1]" },
//   { name: "Playwright", version: "1.58.2", address: "[192.0.2.1]" },
//   { name: "Playwright", version: "1.58.2", address: "[2001:db8::1]:443" },
//   { name: "Playwright", version: "1.58.2", address: "[fe80::1%eth0]" },
// ])(
//   "rejects unrecognized bracketed HAR address input: $name $version $address",
//   ({ name, version, address }) => {
//     const fixture = historicalHar();
//     const first = fixture.log.entries[0];
//     if (first === undefined) throw new Error("fixture missing");
//     expect(() =>
//       decodeHarCapture(
//         JSON.stringify({
//           log: {
//             ...fixture.log,
//             creator: { name, version },
//             entries: [{ ...first, serverIPAddress: address }],
//           },
//         }),
//         [],
//       ),
//     ).toThrow("HAR schema validation failed");
//   },
// );
//
// it.each([
//   "c2VjcmV0",
//   "c2Vj",
//   createHash("sha256").update("secret").digest("hex"),
// ])(
//   "excludes sensitive derived byte representations from spaced HAR text: %s",
//   (literal) => {
//     const fixture = historicalHar();
//     const first = fixture.log.entries[0];
//     if (first === undefined) throw new Error("fixture missing");
//     const result = decodeHarCapture(
//       JSON.stringify({
//         log: {
//           ...fixture.log,
//           entries: [
//             {
//               ...first,
//               response: {
export const _l = 190;
