export const __stub = 1;
// });
//
// it("previews a byte-backed path but not a byte-backed port", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a", port: 443 },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       binaryFields: [
//         retainedBytes("/request/path", "/a"),
//         retainedBytes("/request/port", "443"),
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
// it("adds no mitmproxy headline fields when the flow type has a child facet", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       sidecars: [
//         { pointer: "/type/child", producer_type: "integer", literal: "1" },
//       ],
//     },
//   ).items[0]?.reported;
//   expect(reported).toMatchObject({ request: { method: "GET" } });
//   expect(reported).not.toMatchObject({ request: { path: "/a" } });
// });
//
// it.each([
//   [
//     "a child sidecar",
//     {
//       sidecars: [
//         { pointer: "/request/path/0", producer_type: "integer", literal: "1" },
//       ],
//     },
//   ],
//   [
//     "a child redaction",
//     {
//       redactions: [
//         { pointer: "/request/path/0", reason: "explicit-sensitive-value" },
//       ],
//     },
//   ],
//   [
//     "HAR content bytes",
//     {
//       binaryFields: [
//         {
//           ...retainedBytes("/request/path", "/a"),
//           representation: "har-base64-content",
//         },
//       ],
//     },
//   ],
//   [
//     "bytes that are not its text",
//     { binaryFields: [retainedBytes("/request/path", "/b")] },
//   ],
//   [
//     "a byte count that is not its text",
//     { binaryFields: [{ ...retainedBytes("/request/path", "/a"), bytes: 3 }] },
//   ],
//   [
//     "a digest that is not its text",
//     {
//       binaryFields: [
//         { ...retainedBytes("/request/path", "/a"), sha256: "0".repeat(64) },
//       ],
//     },
//   ],
// ] as const)(
//   "keeps a mitmproxy path with %s out of the preview",
//   (_label, facets) => {
//     const reported = nativePreview(
//       "mitmproxy",
//       { method: "GET", host: "example.test", path: "/a" },
//       { response: { http_version: "HTTP/1.1", reason: "OK" }, ...facets },
//     ).items[0]?.reported;
//     expect(reported).toEqual({
//       type: "http",
//       request: { method: "GET", host: "example.test" },
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//     });
//   },
// );
//
// it.each([
//   ["path", { method: "GET", path: "/\ud800" }, { method: "GET" }],
//   [
//     "host",
//     { method: "GET", host: "a\udc00.test", path: "/a" },
//     { method: "GET", path: "/a" },
//   ],
// ])(
//   "keeps a mitmproxy %s with an unpaired surrogate out of the preview",
//   (_field, request, expected) => {
//     const reported = nativePreview("mitmproxy", request, {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//     }).items[0]?.reported;
//     expect(reported).toEqual({
//       type: "http",
//       request: expected,
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//     });
//   },
// );
//
// it("keeps an unpaired-surrogate path out despite replacement-character bytes", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/\ud800" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       binaryFields: [retainedBytes("/request/path", "/�")],
//     },
//   ).items[0]?.reported;
//   expect(reported).toEqual({
//     type: "http",
//     request: { method: "GET" },
//     response: { http_version: "HTTP/1.1", reason: "OK" },
//   });
// });
//
// it("keeps mitmproxy headlines under a numeric sidecar out of the preview", () => {
//   const [item] = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a", port: 443 },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK", status_code: 200 },
//       sidecars: [
//         { pointer: "/request", producer_type: "integer", literal: "7" },
//         { pointer: "/request/port", producer_type: "integer", literal: "443" },
//         {
//           pointer: "/response/status_code",
//           producer_type: "integer",
//           literal: "200",
//         },
//       ],
//     },
//   ).items;
//   expect(item?.reported).toEqual({
//     type: "http",
//     request: { method: "GET" },
//     response: { http_version: "HTTP/1.1", reason: "OK", status_code: 200 },
//   });
//   expect(item?.numeric_literals).toEqual([
//     {
//       pointer: "/response/status_code",
//       producer_type: "integer",
//       literal: "200",
//     },
//   ]);
// });
//
// it("keeps sibling mitmproxy headlines next to an omitted property name", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", host: "example.test", path: "/a" },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK" },
//       redactions: [
//         {
//           pointer: "/request",
//           reason: "explicit-sensitive-value",
//           scope: "property-name",
//         },
//       ],
//     },
//   ).items[0]?.reported;
//   expect(reported).toMatchObject({
//     request: { method: "GET", host: "example.test", path: "/a" },
//   });
// });
//
// it("selects mitmproxy target fields from the request and the status from the response only", () => {
//   const reported = nativePreview(
//     "mitmproxy",
//     { method: "GET", path: "/a", status_code: 200 },
//     {
//       response: { http_version: "HTTP/1.1", reason: "OK", path: "/extension" },
//     },
//   ).items[0]?.reported;
//   expect(reported).toEqual({
//     type: "http",
//     request: { method: "GET", path: "/a" },
//     response: { http_version: "HTTP/1.1", reason: "OK" },
//   });
// });
//
// it.each(["scheme", "host", "port", "authority"])(
//   "keeps a userinfo-bearing mitmproxy %s out of the preview",
//   (field) => {
//     const preview = nativePreview("mitmproxy", {
//       method: "GET",
//       path: "/users/42",
//       [field]: "user:password@example.test",
//     });
//     const reported = preview.items[0]?.reported;
//     expect(reported).toMatchObject({
//       request: { method: "GET", path: "/users/42" },
//     });
//     expect(JSON.stringify(reported)).not.toContain("password");
//   },
// );
export const _l = 214;
