export const __stub = 1;
//     "duplicate sidecars",
//     [
//       { pointer: "/request/port", producer_type: "integer", literal: "443" },
//       { pointer: "/request/port", producer_type: "integer", literal: "443" },
//     ],
//   ],
// ])(
//   "keeps a port whose sidecar has %s out of the preview",
//   (_label, sidecars) => {
//     const [item] = nativePreview(
//       "mitmproxy",
//       { method: "GET", port: 443, path: "/a" },
//       { response: { http_version: "HTTP/1.1", reason: "OK" }, sidecars },
//     ).items;
//     expect(item?.reported).toEqual({
//       type: "http",
//       request: { method: "GET", path: "/a" },
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//     });
//     expect(item?.numeric_literals).toEqual([]);
//   },
// );
//
// it.each(["tcp", null])(
//   "adds no mitmproxy headline fields to a %s flow",
//   (flowType) => {
//     const reported = nativePreview(
//       "mitmproxy",
//       { method: "GET", path: "/a", port: 443 },
//       { flowType },
//     ).items[0]?.reported;
//     expect(reported).toEqual({
//       ...(flowType === null ? {} : { type: flowType }),
//       request: { method: "GET" },
//       response: { http_version: "HTTP/1.1", reason: "Not Found" },
//     });
//   },
// );
//
// it("keeps a string target that carries a numeric sidecar out of the preview", () => {
//   const [item] = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       sidecars: [
//         {
//           pointer: "/request/path",
//           producer_type: "integer",
//           literal: "9".repeat(100_000),
//         },
//       ],
//     },
//   ).items;
//   expect(item?.reported).toEqual({
//     type: "http",
//     request: { method: "GET" },
//     response: { http_version: "HTTP/1.1", reason: "OK" },
//   });
//   expect(item?.numeric_literals).toEqual([]);
// });
//
// it("keeps a mitmproxy headline the record marks as redacted out of the preview", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", host: "secret", path: "/a" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       redactions: [
//         { pointer: "/request/host", reason: "explicit-sensitive-value" },
//       ],
//     },
//   ).items[0]?.reported;
//   expect(reported).toEqual({
//     type: "http",
//     request: { method: "GET", path: "/a" },
//     response: { http_version: "HTTP/1.1", reason: "OK" },
//   });
// });
//
// it("rejects a non-number integer headline without throwing", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a", port: { toString: null } },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       sidecars: [
//         { pointer: "/request/port", producer_type: "integer", literal: "443" },
//       ],
//     },
//   ).items[0]?.reported;
//   expect(reported).toEqual({
//     type: "http",
//     request: { method: "GET", path: "/a" },
//     response: { http_version: "HTTP/1.1", reason: "OK" },
//   });
// });
//
// it.each([
//   ["the request", "/request", { method: "GET" }],
//   ["the record root", "", {}],
// ] as const)(
//   "keeps mitmproxy headlines under a redacted %s out of the preview",
//   (_label, pointer, request) => {
//     const reported = nativePreview(
//       "mitmproxy",
//       { method: "GET", host: "secret", path: "/secret" },
//       {
//         response: { http_version: "HTTP/1.1", reason: "OK" },
//         redactions: [{ pointer, reason: "explicit-sensitive-value" }],
//       },
//     ).items[0]?.reported;
//     expect(JSON.stringify(reported)).not.toContain("secret");
//     expect(reported).toMatchObject({ request });
//   },
// );
//
// it("keeps a mitmproxy headline with a redacted byte descriptor out of the preview", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", host: "example.test", path: "/secret" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       binaryFields: [
//         {
//           pointer: "/request/path",
//           representation: "producer-bytes",
//           state: "redacted",
//           content_base64: null,
//           bytes: null,
//           sha256: null,
//         },
//       ],
//     },
//   ).items[0]?.reported;
//   expect(reported).toMatchObject({
//     request: { method: "GET", host: "example.test" },
//   });
//   expect(JSON.stringify(reported)).not.toContain("secret");
// });
//
// it("adds no mitmproxy headline fields when the flow type is redacted", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       redactions: [{ pointer: "/type", reason: "explicit-sensitive-value" }],
//     },
//   ).items[0]?.reported;
//   expect(reported).toMatchObject({ request: { method: "GET" } });
//   expect(reported).not.toMatchObject({ request: { path: "/a" } });
// });
//
// it.each([
//   ["the flow type", "/type"],
//   ["the record root", ""],
// ])(
//   "adds no mitmproxy headline fields when %s carries a numeric sidecar",
//   (_label, pointer) => {
//     const reported = nativePreview(
//       "mitmproxy",
//       { method: "GET", path: "/a" },
//       {
//         response: { http_version: "HTTP/1.1", reason: "OK" },
//         sidecars: [{ pointer, producer_type: "integer", literal: "1" }],
//       },
//     ).items[0]?.reported;
//     expect(reported).toMatchObject({ request: { method: "GET" } });
//     expect(reported).not.toMatchObject({ request: { path: "/a" } });
//   },
// );
//
// const retainedBytes = (pointer: string, text: string) => {
//   const bytes = Buffer.from(text);
//   return {
//     pointer,
//     representation: "producer-bytes",
//     state: "retained",
//     content_base64: bytes.toString("base64"),
//     bytes: bytes.length,
//     sha256: createHash("sha256").update(bytes).digest("hex"),
//   };
// };
//
// it("adds no mitmproxy headline fields when the flow type was producer bytes", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       binaryFields: [retainedBytes("/type", "http")],
//     },
//   ).items[0]?.reported;
//   expect(reported).toMatchObject({ type: "http", request: { method: "GET" } });
//   expect(reported).not.toMatchObject({ request: { path: "/a" } });
// });
//
// it("keeps mitmproxy headlines under a byte-valued side out of the preview", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a", port: 443 },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK", status_code: 200 },
//       binaryFields: [
//         retainedBytes("/request", "GET /a"),
//         retainedBytes("/response", "200"),
//       ],
//     },
//   ).items[0]?.reported;
//   expect(reported).toEqual({
//     type: "http",
//     request: { method: "GET" },
//     response: { http_version: "HTTP/1.1", reason: "OK" },
//   });
export const _l = 215;
