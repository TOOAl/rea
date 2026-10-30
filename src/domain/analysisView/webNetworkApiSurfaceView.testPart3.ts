export const __stub = 1;
// });
//
// it("refuses parents whose sensitive declarations it cannot check", () => {
//   for (const parameters of [{ sensitive_value_count: 1 }, {}, null]) {
//     const result = project(analysisViewCaptureFixture(), 0, 50, parameters);
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisUnsupportedTargetError" },
//     });
//     if (result.ok) continue;
//     expect(result.error).toMatchObject({
//       reason: "sensitive_values_unretained",
//     });
//     expect(result.error.message).not.toContain("path templates");
//   }
// });
//
// it("rejects cyclic captures and accessor members without invoking them", () => {
//   const cyclic: { self?: unknown } = {};
//   cyclic.self = cyclic;
//   let accessed = false;
//   const accessor = {
//     get records() {
//       accessed = true;
//       return [];
//     },
//   };
//   const hiddenAccessor = Object.defineProperty({}, "records", {
//     get() {
//       accessed = true;
//       return [];
//     },
//   });
//   const inherited = Object.create({ records: [] }) as unknown;
//   for (const normalizedResult of [cyclic, accessor, hiddenAccessor, inherited])
//     expect(
//       projectAnalysisView(
//         {
//           evidenceId: `ev_${"a".repeat(64)}`,
//           operation: "inspect_web_network_capture",
//           normalizedResult,
//           limitations: [],
//         },
//         { kind: "api-surface", offset: 0, limit: 1 },
//       ),
//     ).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisInputError" },
//     });
//   expect(accessed).toBe(false);
// });
//
// it("treats HAR missing-response sentinels as unknown", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 1);
//   capture.records[0]!.reported = {
//     request: { method: "GET", url: "https://api.example.test/a" },
//     response: { status: 0, content: { mimeType: " ; charset=utf-8" } },
//   };
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups[0]).toMatchObject({
//     statuses: [],
//     content_types: [],
//   });
//   expect(result.value.unknowns).not.toEqual([]);
// });
//
// it("refuses a path whose templated representation exceeds projection capacity", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 1);
//   capture.records[0]!.reported = {
//     request: {
//       method: "GET",
//       url: `https://api.example.test${"/1".repeat(800_000)}`,
//     },
//   };
//   expect(project(capture)).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisResourceConstraintError" },
//   });
// });
//
// it("scans highly segmented literal paths and keeps recorded dot segments", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 3);
//   const urls = [
//     `https://api.example.test${"/a".repeat(90_000)}`,
//     "https://api.example.test/a/%2e%2e/admin",
//     "https://api.example.test/admin",
//   ];
//   capture.records.forEach((record, index) => {
//     record.reported = { request: { method: "GET", url: urls[index] ?? null } };
//   });
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups.map((group) => group.path_template)).toEqual(
//     expect.arrayContaining(["/a/%2e%2e/admin", "/admin"]),
//   );
//   expect(result.value.groups).toHaveLength(3);
// });
//
// it("excludes slashless URL spellings instead of reading their paths", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 4);
//   const urls = [
//     "https:user:pass@example.test/path",
//     "https:123/456",
//     "https:///user:pass@example.test/path",
//     "https://\\user:pass@example.test/path",
//   ];
//   capture.records.forEach((record, index) => {
//     record.reported = { request: { method: "GET", url: urls[index] ?? null } };
//   });
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups).toEqual([]);
//   expect(result.value.excluded_records).toEqual([
//     { ordinal: 0, reason: "url-unparseable" },
//     { ordinal: 1, reason: "url-unparseable" },
//     { ordinal: 2, reason: "url-unparseable" },
//     { ordinal: 3, reason: "url-unparseable" },
//   ]);
//   expect(JSON.stringify(result.value)).not.toContain("pass");
// });
//
// it("excludes control-only authorities instead of publishing their userinfo", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 3);
//   const urls = [
//     "https://\t/user:pass@example.test/path",
//     "https://\n/user:pass@example.test/path",
//     "https://\r/user:pass@example.test/path",
//   ];
//   capture.records.forEach((record, index) => {
//     record.reported = { request: { method: "GET", url: urls[index] ?? null } };
//   });
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
export const _l = 142;
