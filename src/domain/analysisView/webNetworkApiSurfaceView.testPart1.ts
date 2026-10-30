export const __stub = 1;
// import { expect, it } from "vitest";
// import {
//   analysisViewCaptureFixture,
//   analysisViewCaptureEvidence,
// } from "../../../tests/fixtures/analysisView.js";
// import { projectAnalysisView } from "./analysisView.js";
//
// const project = (
//   capture = analysisViewCaptureFixture(),
//   offset = 0,
//   limit = 50,
//   parameters: unknown = { sensitive_value_count: 0 },
//   includeQueryParameterNames?: boolean,
// ) => {
//   const parent = analysisViewCaptureEvidence(capture);
//   return projectAnalysisView(
//     {
//       evidenceId: parent.evidence_id,
//       operation: parent.operation,
//       normalizedResult: parent.normalized_result,
//       limitations: [],
//       parameters,
//     },
//     {
//       kind: "api-surface",
//       offset,
//       limit,
//       ...(includeQueryParameterNames === undefined
//         ? {}
//         : {
//             include_query_parameter_names: includeQueryParameterNames,
//           }),
//     },
//   );
// };
//
// it("selects query names without values, retains source ordinals and leaves default groups unchanged", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = capture.records.slice(0, 3);
//   capture.total_records = 3;
//   const urls = [
//     "https://api.test/products?category=books&page=1&category=repeat#fragment-only",
//     "https://api.test/products?category=games&sort=price",
//     "https://api.test/health",
//   ];
//   for (const [index, record] of capture.records.entries())
//     record.reported = {
//       request: { method: "GET", url: urls[index]! },
//       response: { status: 200, content: { mimeType: "application/json" } },
//     };
//   const selected = project(capture, 0, 50, { sensitive_value_count: 0 }, true);
//   const omitted = project(capture);
//   const disabled = project(capture, 0, 50, { sensitive_value_count: 0 }, false);
//   if (
//     !selected.ok ||
//     selected.value.kind !== "api-surface" ||
//     !omitted.ok ||
//     omitted.value.kind !== "api-surface" ||
//     !disabled.ok ||
//     disabled.value.kind !== "api-surface"
//   )
//     throw new Error("Expected surfaces");
//   expect(disabled.value.groups).toEqual(omitted.value.groups);
//   expect(selected.value.groups).toEqual([
//     { ...omitted.value.groups[0], query_parameter_names: [] },
//     {
//       ...omitted.value.groups[1],
//       query_parameter_names: [
//         { name: "category", record_ordinals: [0, 1] },
//         { name: "page", record_ordinals: [0] },
//         { name: "sort", record_ordinals: [1] },
//       ],
//     },
//   ]);
//   for (const literal of ["books", "games", "repeat", "price", "fragment-only"])
//     expect(JSON.stringify(selected.value)).not.toContain(literal);
//   expect(selected.value.parent_evidence_id).toBe(
//     omitted.value.parent_evidence_id,
//   );
// });
//
// it("preserves decoded empty and Unicode query names, plus distinctions and caller ordinal order", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.records = [capture.records[3]!, capture.records[1]!];
//   const urls = [
//     "https://api.test/a/%2e%2e/products?b=1&a+b=2&a%2Bb=3&=4&%E9%9B%AA=5&b=6&&%FF=7&__proto__=8#ignored=9",
//     "https://api.test/a/%2e%2e/products?b=10",
//   ];
//   capture.records.forEach((record, index) => {
//     record.reported = { request: { method: "GET", url: urls[index]! } };
//   });
//   const result = project(capture, 0, 1, { sensitive_value_count: 0 }, true);
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(result.value.groups[0]).toMatchObject({
//     path_template: "/a/%2e%2e/products",
//     record_ordinals: [3, 1],
//     query_parameter_names: [
//       { name: "", record_ordinals: [3] },
//       { name: "__proto__", record_ordinals: [3] },
//       { name: "a b", record_ordinals: [3] },
//       { name: "a+b", record_ordinals: [3] },
//       { name: "b", record_ordinals: [3, 1] },
//       { name: "雪", record_ordinals: [3] },
//       { name: "�", record_ordinals: [3] },
//     ],
//   });
//   expect(result.value.records.total).toBe(15);
//   expect(result.value.limitations.join(" ")).toContain("ordinal subset");
// });
//
// it("preserves sensitive-parent refusal when query names are selected", () => {
//   expect(
//     project(
//       analysisViewCaptureFixture(),
//       0,
//       50,
//       { sensitive_value_count: 1 },
//       true,
//     ),
//   ).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "AnalysisUnsupportedTargetError",
//       reason: "sensitive_values_unretained",
//     },
//   });
// });
// it("groups only exact formats, preserves literal routes, excludes URLs and produces deterministic digests", () => {
//   const result = project();
//   if (!result.ok || result.value.kind !== "api-surface")
//     throw new Error("Expected surface");
//   expect(project()).toEqual(result);
//   const surface = result.value;
//   expect(surface.groups.map((group) => group.path_template)).toEqual([
//     "/api/CreateDocument",
//     "/api/ListDocuments",
//     "/api/Report2",
//     "/api/Report3",
//     "/api/v1/users",
//     "/api/v2/users",
//     "/dates/2023-02-29",
export const _l = 142;
