export const __stub = 1;
//     expected: "[redacted transport credential] / encoded/credential",
//   },
// ];
// it.each(credentialCases)(
//   "parses $name at the configured credential boundary",
//   ({ headers, message, expected }) => {
//     const redact = createIdaDiagnosticRedactor({
//       url: "http://127.0.0.1:12345/mcp",
//       headers,
//       mode: "attached",
//       timeoutMs: 1000,
//     }).text;
//     expect(redact(message)).toBe(expected);
//   },
// );
//
// it("redacts full configured malformed headers without guessing their internal values", () => {
//   const header = 'Digest broken="unterminated, second=visible';
//   const redactor = createIdaDiagnosticRedactor({
//     url: "http://127.0.0.1:12345/mcp",
//     headers: { Authorization: header },
//     mode: "attached",
//     timeoutMs: 1000,
//   });
//   expect(redactor.text(header)).toBe("[redacted transport credential]");
//   expect(redactor.json(JSON.stringify(header))).toBe(
//     '"[redacted transport credential]"',
//   );
// });
//
// const marker = "[redacted transport credential]";
// const redactorFor = (header: string, name = "Authorization") =>
//   createIdaDiagnosticRedactor({
//     url: "http://127.0.0.1:12345/mcp",
//     headers: { [name]: header },
//     mode: "attached",
//     timeoutMs: 1000,
//   });
//
// describe("IDA Basic authentication payload components", () => {
//   it.each(["aUtHoRiZaTiOn", "pRoXy-AuThOrIzAtIoN"])(
//     "protects decoded Basic pairs and passwords while preserving user names for %s",
//     (name) => {
//       const pair = "fixture-user:fixture-password:tail";
//       const encoded = Buffer.from(pair, "utf8").toString("base64");
//       const redactor = redactorFor("bAsIc " + encoded, name);
//       const reason =
//         "pair=" +
//         pair +
//         "; user=fixture-user; password=fixture-password:tail; wire=" +
//         encoded;
//       const safe =
//         "pair=" +
//         marker +
//         "; user=fixture-user; password=" +
//         marker +
//         "; wire=" +
//         marker;
//       expect(redactor.text(reason + "; path=/caller/input?token=visible")).toBe(
//         safe + "; path=/caller/input?token=visible",
//       );
//       expect(
//         redactor.json(JSON.stringify({ reason, path: "/caller/input" })),
//       ).toBe(JSON.stringify({ reason: safe, path: "/caller/input" }));
//     },
//   );
//
//   it.each([
//     [
//       ":fixture-password",
//       "pair=:fixture-password; password=fixture-password; empty values leave spaces",
//       "pair=" + marker + "; password=" + marker + "; empty values leave spaces",
//     ],
//     [
//       "fixture-user:",
//       "pair=fixture-user:; user=fixture-user; empty values leave spaces",
//       "pair=" + marker + "; user=fixture-user; empty values leave spaces",
//     ],
//     [
//       ":",
//       "pair=:; empty values leave spaces",
//       "pair=" + marker + "; empty values leave spaces",
//     ],
//   ])(
//     "protects a decoded pair with empty components: %s",
//     (pair, reason, safe) => {
//       const encoded = Buffer.from(pair, "utf8").toString("base64");
//       expect(redactorFor("Basic " + encoded).text(reason)).toBe(safe);
//     },
//   );
// });
//
// describe("IDA Basic authentication charset and invalid data", () => {
//   it("retains both strict UTF-8 and exact octet-compatible interpretations when charset is unknown", () => {
//     const pair = "tést-user:päss£word";
//     const bytes = Buffer.from(pair, "utf8");
//     const octets = bytes.toString("latin1");
//     const redactor = redactorFor("Basic " + bytes.toString("base64"));
//     const reason =
//       "utf8=" +
//       pair +
//       "; octets=" +
//       octets +
//       "; user=tést-user; password=päss£word; octet-user=tÃ©st-user; octet-password=pÃ¤ssÂ£word; caller=/caller/input";
//     expect(redactor.text(reason)).toBe(
//       "utf8=" +
//         marker +
//         "; octets=" +
//         marker +
//         "; user=tést-user; password=" +
//         marker +
//         "; octet-user=tÃ©st-user; octet-password=" +
//         marker +
//         "; caller=/caller/input",
//     );
//   });
//
//   it("preserves exact Latin-1 octets without inventing lossy UTF-8 replacement credentials", () => {
//     const bytes = Buffer.from("latin-user:pässword", "latin1");
//     const redactor = redactorFor("Basic " + bytes.toString("base64"));
//     expect(
//       redactor.text(
//         "latin-user:pässword / latin-user / pässword / p\ufffdssword /caller/input",
//       ),
//     ).toBe(
//       marker + " / latin-user / " + marker + " / p\ufffdssword /caller/input",
//     );
//   });
//
//   it("preserves a UTF-8 BOM as credential data rather than dropping it", () => {
//     const pair = "\ufefffixture-user:fixture-password";
//     const encoded = Buffer.from(pair, "utf8").toString("base64");
//     expect(
//       redactorFor("Basic " + encoded).text(pair + " / \ufefffixture-user"),
//     ).toBe(marker + " / \ufefffixture-user");
//   });
//
//   it("keeps decoded Basic values opaque without URL decoding", () => {
//     const encoded = Buffer.from("fixture-user:p%2Fsecret", "utf8").toString(
//       "base64",
//     );
export const _l = 141;
