export const __stub = 1;
//       headers: { Authorization: `Basic ${payload}` },
//     });
//     const marker = "[redacted transport credential]";
//     expect(
//       redactor.text(
//         "dXNlcjpzZWNyZXQ= / dXNlcjpzZWNyZXQ / user:secret / secret",
//       ),
//     ).toBe(`${marker} / ${marker} / ${marker} / ${marker}`);
//   },
// );
//
// describe("overlapping IDA credential source spans", () => {
//   it.each([false, true])(
//     "unions all overlapping plain credentials before writing (reversed: %s)",
//     (reversed) => {
//       const entries = [
//         ["Authorization", "Custom X]"],
//         ["Cookie", "a=]SECRET"],
//       ];
//       const redactor = createIdaDiagnosticRedactor({
//         url: "http://127.0.0.1:12345/mcp",
//         headers: Object.fromEntries(reversed ? entries.reverse() : entries),
//         mode: "attached",
//         timeoutMs: 1000,
//       });
//       const result = redactor.text(
//         "Rejected X]SECRET at /caller/input?cursor=visible",
//       );
//       expect(result).toBe("Rejected ␟ at /caller/input?cursor=visible");
//       expect(result).not.toContain("]SECRET");
//     },
//   );
//
//   it("unions a chain of different overlapping credentials", () => {
//     const redactor = createIdaDiagnosticRedactor({
//       url: "http://127.0.0.1:12345/mcp",
//       headers: { Authorization: "Custom abc", Cookie: "a=cde; b=def" },
//       mode: "attached",
//       timeoutMs: 1000,
//     });
//     expect(redactor.text("prefix abcdefg suffix")).toBe(
//       "prefix " + marker + "g suffix",
//     );
//   });
//
//   it("merges dense same-credential overlaps without retaining a per-match collection", () => {
//     const redactor = redactorFor("Custom AA");
//     const result = redactor.text("A".repeat(IDA_DIAGNOSTIC_SOURCE_BYTES));
//     expect(result.length).toBe(marker.length);
//     expect(result).toBe(marker);
//   });
//
//   it("retains adjacent disjoint credential occurrences", () => {
//     expect(redactorFor("Custom AA").text("AA-AA")).toBe(marker + "-" + marker);
//   });
// });
//
// describe("credential-safe redaction markers", () => {
//   it.each([
//     { secret: "]SECRET", source: "XSECRET", expected: "␟SECRET" },
//     { secret: "SECRET[", source: "SECRETX", expected: "SECRET␟" },
//     {
//       secret: "a[redacted transport credential]b",
//       source: "aXb",
//       expected: "a␟b",
//     },
//     { secret: "redacted", source: "redacted", expected: "␟" },
//   ])(
//     "does not create $secret from replacement text or boundaries",
//     ({ secret, source, expected }) => {
//       const redactor = createIdaDiagnosticRedactor({
//         url: "http://127.0.0.1:12345/mcp",
//         mode: "attached",
//         timeoutMs: 1000,
//         headers: { Authorization: "Custom " + secret, Cookie: "a=X" },
//       });
//       expect(redactor.text(source)).toBe(expected);
//       expect(
//         redactor.json(
//           JSON.stringify({ reason: source, context: "/caller/input" }),
//         ),
//       ).toBe(JSON.stringify({ reason: expected, context: "/caller/input" }));
//       expect(redactor.json('"' + source + '",x')).toBe('"' + expected + '",x');
//     },
//   );
//   it("chooses a different graphic scalar when a decoded Basic credential contains the first marker", () => {
//     const redactor = createIdaDiagnosticRedactor({
//       url: "http://127.0.0.1:12345/mcp",
//       mode: "attached",
//       timeoutMs: 1000,
//       headers: {
//         Authorization:
//           "Basic " + Buffer.from("user:␟", "utf8").toString("base64"),
//         Cookie: "a=]SECRET",
//       },
//     });
//     expect(redactor.text("␟ at /caller/input")).toBe("␠ at /caller/input");
//     expect(redactor.json(String.raw`{"reason":"␟","context":"kept"}`)).toBe(
//       '{"reason":"␠","context":"kept"}',
//     );
//   });
// });
//
// describe("unclassified diagnostic blocks and message ownership", () => {
//   it.each<Readonly<Record<string, string>>>([{}, { Cookie: "a=Q" }])(
//     "budgets the entire source block list before redaction: %s",
//     (headers) => {
//       const redactor = createIdaDiagnosticRedactor({
//         url: "http://127.0.0.1:12345/mcp",
//         mode: "attached",
//         timeoutMs: 1000,
//         headers,
//       });
//       const first = "£".repeat(IDA_DIAGNOSTIC_SOURCE_BYTES / 4);
//       expect(redactor.blocks([first, first])).toBe(
//         "[IDA diagnostic omitted: exceeds 65536 UTF-8 bytes]",
//       );
//       expect(redactor.blocks([first, first.slice(1)])).toBe(
//         first + "\n" + first.slice(1),
//       );
//     },
//   );
//   it("keeps complete quoted plain credentials while preserving explicit JSON semantics", () => {
//     const redactor = redactorFor(String.raw`Custom folder\tmp`);
//     const source = String.raw`"folder\tmp at /caller/input"`;
//     expect(redactor.blocks([source])).toBe(
//       '"[redacted transport credential] at /caller/input"',
//     );
//     expect(redactor.json(source)).toBe(source);
//   });
//   it("sanitizes the omission notice as diagnostic text", () => {
//     const redactor = redactorFor("Custom omitted");
//     expect(
//       redactor.blocks(["Q".repeat(IDA_DIAGNOSTIC_SOURCE_BYTES + 1)]),
//     ).toContain("[redacted transport credential]");
//     expect(
//       redactor.text("Q".repeat(IDA_DIAGNOSTIC_SOURCE_BYTES + 1)),
//     ).not.toContain("omitted");
//   });
// });
export const _l = 140;
