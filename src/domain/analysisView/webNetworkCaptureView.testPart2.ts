export const __stub = 1;
//         .map(([field, value]) => ({
//           pointer: `/${side}/${field}`,
//           producer_type: producerType,
//           literal: String(value),
//         })),
//     );
//   const artifact = {
//     path: "/recordings/flows.mitm",
//     sha256: "c".repeat(64),
//     bytes: 100,
//   };
//   const decoder = { id: "fixture", name: "Fixture", version: "1" };
//   const report = webNetworkCaptureSchema.parse({
//     artifact,
//     decoder,
//     format,
//     runtime_attribution: "unknown",
//     limitations: [],
//     container: {
//       reported: null,
//       numeric_literals: [],
//       redactions: [],
//       records_pointer: null,
//     },
//     total_records: 1,
//     records: [
//       {
//         ordinal: 0,
//         location: { kind: "byte-range", offset: 0, bytes: 10 },
//         reported: {
//           ...(flowType === null ? {} : { type: flowType }),
//           request: { ...request, headers: [["Accept", "*/*"]] },
//           response,
//         },
//         binary_fields: binaryFields,
//         numeric_literals: literals,
//         redactions,
//         limitations: [],
//       },
//     ],
//   });
//   const evidence = createEvidence({ ...artifact, format: "file" }, decoder, {
//     operation: "inspect_web_network_capture",
//     parameters: {},
//     result: report,
//     confidence: "observed",
//     authority: "historical-reference",
//   });
//   const preview = projectAnalysisView(
//     {
//       evidenceId: evidence.evidence_id,
//       operation: evidence.operation,
//       normalizedResult: report,
//       subject: evidence.subject,
//       limitations: evidence.limitations,
//     },
//     { kind: "capture", detail: "preview", offset: 0, limit: 1 },
//   );
//   if (!preview.ok || preview.value.kind !== "capture")
//     throw new Error("Expected a capture preview page.");
//   return preview.value;
// };
//
// it("previews the mitmproxy request target and status code as headline fields", () => {
//   const preview = nativePreview("mitmproxy", {
//     host: "example.test",
//     port: 443,
//     method: "GET",
//     scheme: "https",
//     authority: "",
//     path: "/users/42",
//     http_version: "HTTP/1.1",
//   });
//   expect(preview).toMatchObject({
//     items: [
//       {
//         reported: {
//           type: "http",
//           request: {
//             method: "GET",
//             scheme: "https",
//             host: "example.test",
//             port: 443,
//             authority: "",
//             path: "/users/42",
//             http_version: "HTTP/1.1",
//           },
//           response: {
//             http_version: "HTTP/1.1",
//             status_code: 404,
//             reason: "Not Found",
//           },
//         },
//         numeric_literals: [
//           {
//             pointer: "/request/port",
//             producer_type: "integer",
//             literal: "443",
//           },
//           {
//             pointer: "/response/status_code",
//             producer_type: "integer",
//             literal: "404",
//           },
//         ],
//       },
//     ],
//   });
//   expect(JSON.stringify(preview)).not.toContain("Accept");
//   expect(JSON.stringify(preview)).not.toContain("omitted body");
// });
//
// it("previews the asterisk-form OPTIONS target", () => {
//   expect(
//     nativePreview("mitmproxy", { method: "OPTIONS", path: "*" }).items[0]
//       ?.reported,
//   ).toMatchObject({ request: { method: "OPTIONS", path: "*" } });
// });
//
// it.each([
//   [
//     "an ambiguous absolute path",
//     "mitmproxy",
//     "https:user:password@example.test/a",
//   ],
//   ["a network-path reference", "mitmproxy", "//user:password@example.test/a"],
//   [
//     "a slash-backslash reference",
//     "mitmproxy",
//     "/\\user:password@example.test/a",
//   ],
//   [
//     "a slash-backslash reference with an unparseable port",
//     "mitmproxy",
//     "/\\user:password@example.test:65536/a",
//   ],
//   ["a path with an at-sign", "mitmproxy", "/users/password@example"],
//   ["a slash-tab reference", "mitmproxy", "/\t/user:password@example.test/a"],
//   ["an oversized path", "mitmproxy", `/${"password".repeat(1024)}`],
//   ["a nested path value", "mitmproxy", { content: "password ".repeat(64) }],
//   ["a path in a non-mitmproxy record", "har", "/users/password"],
// ] as const)("keeps %s out of the preview", (_label, format, path) => {
//   const preview = nativePreview(format, { method: "GET", path });
//   const [item] = preview.items;
//   expect(item?.reported).toMatchObject({ request: { method: "GET" } });
//   expect(JSON.stringify(item?.reported)).not.toContain("password");
//   if (format === "har")
//     expect(JSON.stringify(item?.reported)).not.toContain("status_code");
// });
//
// it("bounds the serialized mitmproxy headline of each preview record", () => {
//   const control = "\u0001".repeat(8 * 1024);
//   const malformed = nativePreview("mitmproxy", {
//     method: "GET",
//     scheme: control,
//     host: control,
//     port: control,
//     authority: control,
//     path: `/${control}`,
//   });
//   expect(malformed.items[0]?.reported).toMatchObject({
//     request: { method: "GET" },
//   });
//   expect(
//     Buffer.byteLength(JSON.stringify(malformed.items[0]?.reported)),
//   ).toBeLessThan(1024);
//   const escaped = nativePreview("mitmproxy", {
//     method: "GET",
//     path: `/${'"'.repeat(2 * 1024 - 1)}`,
//   });
//   expect(escaped.items[0]?.reported).toMatchObject({
//     request: { path: `/${'"'.repeat(2 * 1024 - 1)}` },
//   });
//   expect(
//     Buffer.byteLength(JSON.stringify(escaped.items[0]?.reported)),
//   ).toBeLessThan(5 * 1024);
// });
//
// it("keeps producer floats out of integer mitmproxy headline slots", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", port: 443, path: "/a" },
//     {
//       response: {
//         http_version: "HTTP/1.1",
//         status_code: 404,
//         reason: "Not Found",
//       },
//       producerType: "float",
//     },
//   ).items[0]?.reported;
//   expect(reported).toMatchObject({
//     request: { method: "GET", path: "/a" },
//     response: { reason: "Not Found" },
//   });
//   expect(reported).not.toMatchObject({ request: { port: 443 } });
//   expect(reported).not.toMatchObject({ response: { status_code: 404 } });
// });
//
// it.each([
//   [
//     "an oversized literal",
//     [
//       {
//         pointer: "/request/port",
//         producer_type: "integer",
//         literal: "4".repeat(100_000),
//       },
//     ],
//   ],
//   [
//     "a literal that does not represent the value",
//     [{ pointer: "/request/port", producer_type: "integer", literal: "444" }],
//   ],
//   [
export const _l = 215;
