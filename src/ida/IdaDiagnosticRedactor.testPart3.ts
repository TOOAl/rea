export const __stub = 1;
//     expect(redactorFor("Basic " + encoded).text("p%2Fsecret / p/secret")).toBe(
//       marker + " / p/secret",
//     );
//   });
//
//   const canonical = Buffer.from(
//     "fixture-user:fixture-password",
//     "utf8",
//   ).toString("base64");
//   const alphabet =
//     "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
//   const nonzeroPadBits = canonical.replace(
//     /(.)(=)$/u,
//     (_match, symbol: string, padding: string) =>
//       (alphabet[alphabet.indexOf(symbol) + 1] ?? "!") + padding,
//   );
//   it.each([
//     { name: "unpadded", payload: canonical.slice(0, -1) },
//     { name: "at most two padding characters", payload: canonical + "=" },
//   ])(
//     "accepts the supported normalized Basic Base64 spelling: $name",
//     ({ payload }) => {
//       const redactor = redactorFor("Basic " + payload);
//       expect(
//         redactor.text(
//           "fixture-user:fixture-password / fixture-password / fixture-user",
//         ),
//       ).toBe(marker + " / " + marker + " / fixture-user");
//     },
//   );
//
//   it.each([
//     {
//       name: "non-alphabet character",
//       payload: canonical.slice(0, 4) + "!" + canonical.slice(4),
//     },
//     {
//       name: "embedded whitespace",
//       payload: canonical.slice(0, 4) + " " + canonical.slice(4),
//     },
//     { name: "more than two pad characters", payload: canonical + "==" },
//     { name: "nonzero pad bits", payload: nonzeroPadBits },
//     {
//       name: "missing colon separator",
//       payload: Buffer.from("fixture-user", "utf8").toString("base64"),
//     },
//     {
//       name: "ASCII control in user-pass",
//       payload: Buffer.from("fixture-user:fixture-password\n", "utf8").toString(
//         "base64",
//       ),
//     },
//     {
//       name: "auth-param-shaped malformed Basic data",
//       payload: "credential=fixture-password",
//     },
//   ])("retains only opaque configured Basic data for $name", ({ payload }) => {
//     const header = "Basic " + payload;
//     const redactor = redactorFor(header);
//     expect(redactor.text(header + " / " + payload)).toBe(
//       marker + " / " + marker,
//     );
//     expect(redactor.text("fixture-user / fixture-password /caller/input")).toBe(
//       "fixture-user / fixture-password /caller/input",
//     );
//   });
//
//   it("does not decode another scheme's base64-shaped opaque payload", () => {
//     const encoded = Buffer.from(
//       "fixture-user:fixture-password",
//       "utf8",
//     ).toString("base64");
//     const redactor = redactorFor("Custom " + encoded);
//     expect(redactor.text(encoded + " / fixture-user / fixture-password")).toBe(
//       marker + " / fixture-user / fixture-password",
//     );
//   });
// });
//
// it("redacts protocol-decoded Basic credentials and password without treating ordinary names as secrets", () => {
//   const redactor = createIdaDiagnosticRedactor({
//     url: "http://127.0.0.1:12345/mcp",
//     mode: "attached",
//     timeoutMs: 1000,
//     headers: {
//       Authorization: `Basic ${Buffer.from("user:secret").toString("base64")}`,
//     },
//   });
//   expect(redactor.text("user:secret / secret / user")).toBe(
//     "[redacted transport credential] / [redacted transport credential] / user",
//   );
//   expect(redactor.json('"\\u0073ecret"')).toBe(
//     '"[redacted transport credential]"',
//   );
// });
//
// it.each(["text", "json"] as const)(
//   "bounds short-secret diagnostic expansion before %s redaction",
//   (format) => {
//     const redactor = createIdaDiagnosticRedactor({
//       url: "http://127.0.0.1:12345/mcp",
//       mode: "attached",
//       timeoutMs: 1000,
//       headers: { Cookie: "a=Q" },
//     });
//     const result = redactor[format]("Q".repeat(2 * 1024 * 1024));
//     expect(result).toBe("[IDA diagnostic omitted: exceeds 65536 UTF-8 bytes]");
//   },
// );
//
// it.each(["text", "json"] as const)(
//   "applies the UTF-8 source-byte budget before %s processing even without credentials",
//   (format) => {
//     const atBudget = "£".repeat(IDA_DIAGNOSTIC_SOURCE_BYTES / 2);
//     const overBudget = atBudget + "£";
//     const configuredHeaders: readonly Readonly<Record<string, string>>[] = [
//       {},
//       { Cookie: "a=Q" },
//     ];
//     for (const headers of configuredHeaders) {
//       const redactor = createIdaDiagnosticRedactor({
//         url: "http://127.0.0.1:12345/mcp",
//         mode: "attached",
//         timeoutMs: 1000,
//         headers,
//       });
//       expect(redactor[format](atBudget)).toBe(atBudget);
//       expect(redactor[format](overBudget)).toBe(
//         "[IDA diagnostic omitted: exceeds 65536 UTF-8 bytes]",
//       );
//     }
//   },
// );
//
// it.each(["dXNlcjpzZWNyZXQ=", "dXNlcjpzZWNyZXQ", "dXNlcjpzZWNyZXQ=="])(
//   "redacts accepted canonical Basic spellings for %s",
//   (payload) => {
//     const redactor = createIdaDiagnosticRedactor({
//       url: "http://127.0.0.1:12345/mcp",
//       mode: "attached",
//       timeoutMs: 1000,
export const _l = 141;
