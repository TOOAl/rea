export const __stub = 1;
//     throw new Error("Expected surface");
//   expect(result.value.groups).toEqual([]);
//   expect(result.value.excluded_records).toEqual([
//     { ordinal: 0, reason: "url-unparseable" },
//     { ordinal: 1, reason: "url-unparseable" },
//     { ordinal: 2, reason: "url-unparseable" },
//   ]);
//   expect(JSON.stringify(result.value)).not.toContain("pass");
// });
//
// it("keeps distinct content types without repeating a retained essence", () => {
//   const capture = analysisViewCaptureFixture();
//   const record = capture.records[0]!;
//   const types = ["text/plain", "application/json", "text/plain"];
//   capture.records = types.map((mimeType, ordinal) => ({
//     ...record,
//     ordinal,
//     reported: {
//       request: { method: "GET", url: "https://api.example.test/a" },
//       response: { status: 200, content: { mimeType } },
//     },
//   }));
//   capture.total_records = capture.records.length;
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups[0]?.content_types).toEqual([
//     "application/json",
//     "text/plain",
//   ]);
// });
//
// it("charges repeated observed values once when merging", () => {
//   const capture = analysisViewCaptureFixture();
//   const record = capture.records[0]!;
//   const path = "/1".repeat(800);
//   capture.records = Array.from({ length: 1_000 }, (_, ordinal) => ({
//     ...record,
//     ordinal,
//     reported: {
//       request: { method: "GET", url: `https://api.example.test${path}` },
//     },
//   }));
//   capture.total_records = capture.records.length;
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups).toHaveLength(1);
//   expect(result.value.groups[0]?.templated_segments).toHaveLength(800);
// });
//
// it("keeps a recorded literal placeholder apart from a templated segment", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 2);
//   const urls = [
//     "https://api.example.test/users/{numeric}",
//     "https://api.example.test/users/123",
//   ];
//   capture.records.forEach((record, index) => {
//     record.reported = { request: { method: "GET", url: urls[index] ?? null } };
//   });
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups).toHaveLength(2);
//   expect(
//     result.value.groups.map((group) => group.templated_segments.length).sort(),
//   ).toEqual([0, 1]);
// });
//
// it("treats malformed media types as unknown and keeps source limitations", () => {
//   const capture = analysisViewCaptureFixture();
//   const caveat =
//     "HAR text is producer-decoded Unicode. Original body bytes remain unknown.";
//   const captureCaveat = "Producer omitted exchanges before capture startup.";
//   capture.limitations = [captureCaveat, caveat];
//   const malformed = [
//     "text /plain",
//     "unknown",
//     "\u00a0text/plain\u00a0",
//     "\u000btext/plain\u000b",
//     "\u000ctext/plain\u000c",
//     "text/K",
//   ];
//   capture.records = malformed.map((_, ordinal) => ({
//     ...capture.records[0]!,
//     ordinal,
//   }));
//   capture.total_records = capture.records.length;
//   capture.records.forEach((record, index) => {
//     record.limitations = [caveat];
//     record.reported = {
//       request: { method: "GET", url: "https://api.example.test/a" },
//       response: {
//         status: 200,
//         content: { mimeType: malformed[index]! },
//       },
//     };
//   });
//   const result = project(capture);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups[0]).toMatchObject({
//     content_types: [],
//     flags: [],
//   });
//   expect(result.value.unknowns).not.toEqual([]);
//   expect(result.value.limitations).toContain(caveat);
//   expect(result.value.limitations).toContain(captureCaveat);
//   expect(result.value.limitations.filter((item) => item === caveat)).toEqual([
//     caveat,
//   ]);
// });
//
// it("compares media types case-insensitively and counts templated groups across pages", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 3);
//   const reported = [
//     ["https://api.example.test/a", "Application/JSON"],
//     ["https://api.example.test/a", " \tapplication/json\t ; charset=utf-8"],
//     ["https://api.example.test/users/7", "application/json"],
//   ];
//   capture.records.forEach((record, index) => {
//     const [url, mimeType] = reported[index] ?? [];
//     record.reported = {
//       request: { method: "GET", url: url ?? null },
//       response: { status: 200, content: { mimeType: mimeType ?? null } },
//     };
//   });
//   const result = project(capture, 0, 1);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups[0]).toMatchObject({
//     path_template: "/a",
//     content_types: ["application/json"],
//     flags: [],
//   });
//   expect(result.value.templated_groups).toBe(1);
// });
export const _l = 139;
