export const __stub = 1;
// import {
//   analysisViewCaptureFixture,
//   analysisViewCaptureEvidence,
//   analysisViewObjectDenseCapture,
// } from "../../../tests/fixtures/analysisView.js";
// import { describe, expect, it } from "vitest";
//
// import { JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE } from "../../contracts/javascript/javascriptRuntimeReconciliationExample.js";
// import { createEvidence, parseEvidence } from "../../domain/evidence.js";
// import { inspectAnalysisViewInputSchema } from "../../domain/analysisView/analysisView.js";
// import { functionDossierSchema } from "../../domain/hopperValues.js";
// import { ghidraFunctionDossier } from "../../domain/ghidraValues.fixture.js";
// import {
//   analysisViewJavaScriptAnalysisWithSource,
//   analysisViewJavaScriptEvidence,
//   analysisViewLayoutEvidence,
// } from "../../../tests/fixtures/analysisView.js";
// import {
//   inspectAnalysisView,
//   inspectAnalysisViewValidated,
//   summarizeRetainedAnalysis,
// } from "./AnalysisViewService.js";
// import type { Evidence } from "../../domain/evidence.js";
// import { EvidenceIntegrityError } from "../../domain/evidenceErrors.js";
// import { err, ok } from "../../domain/result.js";
// import { EvidenceLedger } from "../investigation/EvidenceLedger.js";
// import { WEB_NETWORK_CAPTURE_LIMITS } from "../../domain/webNetworkCapture.js";
//
// it.each(["/fixtures/unknown.exe", ""])(
//   "preserves recorded empty native identity fields: path=%j",
//   (path) => {
//     const original = functionDossierSchema.parse(ghidraFunctionDossier());
//     const parent = createEvidence(
//       { path, format: "pe", sha256: "c".repeat(64) },
//       { id: "ghidra", name: "Ghidra", version: "12.1.4" },
//       {
//         operation: "analyze_function",
//         parameters: {},
//         result: {
//           ...original,
//           procedure: {
//             ...original.procedure,
//             address: "",
//             body: { available: false, reason: "Not recorded" },
//           },
//         },
//       },
//     );
//     const result = inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: {
//         kind: "native",
//         facet: "procedure",
//         offset: 0,
//         limit: 64,
//       },
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value.normalized_result).toMatchObject({
//       procedure_address: "",
//       artifact: { path },
//       item: { address: "" },
//     });
//     expect(result.value.locations).toEqual(
//       path.length > 0 ? [{ kind: "artifact-path", path }] : [],
//     );
//   },
// );
//
// it("reports inline Evidence identity failures at the complete source path", () => {
//   const parent = analysisViewLayoutEvidence();
//   const input = {
//     source: {
//       kind: "inline",
//       evidence: { ...parent, evidence_id: `ev_${"0".repeat(64)}` },
//     },
//     view: { kind: "summary" },
//   } as const;
//
//   for (const result of [
//     inspectAnalysisView(input),
//     inspectAnalysisViewValidated(input),
//   ])
//     expect(result).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisInputError",
//         issues: [
//           {
//             path: ["source", "evidence", "evidence_id"],
//             reason: "invalid_value",
//             message: "Evidence semantic identifier does not match its record",
//           },
//         ],
//       },
//     });
// });
//
// it("projects a small native view from an authenticated >10 MiB retained dossier", () => {
//   const original = functionDossierSchema.parse(ghidraFunctionDossier());
//   const parent = createEvidence(
//     { path: "/fixtures/large.exe", format: "pe", sha256: "c".repeat(64) },
//     { id: "ghidra", name: "Ghidra", version: "12.1.4" },
//     {
//       operation: "analyze_function",
//       parameters: { address: "0x401000" },
//       result: { ...original, pseudocode: "X".repeat(11 * 1024 * 1024) },
//       limitations: ["Synthetic fixture"],
//     },
//   );
//   const input = {
//     source: {
//       kind: "retained-evidence" as const,
//       evidence_id: parent.evidence_id,
//     },
//     view: {
//       kind: "native" as const,
//       facet: "pseudocode" as const,
//       offset: 0,
//       limit: 128,
//     },
//   };
//   const view = inspectAnalysisView(input, (id) =>
//     id === parent.evidence_id ? parent : undefined,
//   );
//   if (!view.ok) throw view.error;
//   expect(view.value.evidence_links).toEqual([parent.evidence_id]);
//   expect(view.value.normalized_result).toMatchObject({
//     kind: "native",
//     parent_operation: "analyze_function",
//     parent_evidence_id: parent.evidence_id,
//     procedure_address: "0x401000",
//     artifact: { path: "/fixtures/large.exe", sha256: "c".repeat(64) },
//     coverage: { total: 11 * 1024 * 1024, examined: 128, next_offset: 128 },
//   });
//   expect(view.value.locations).toEqual([
//     { kind: "artifact-path", path: "/fixtures/large.exe" },
//     { kind: "address", address: "0x401000" },
//   ]);
//   expect(JSON.stringify(view.value).length).toBeLessThan(12000);
//   expect(JSON.stringify(parent).length).toBeGreaterThan(10 * 1024 * 1024);
//   expect(inspectAnalysisView(input, () => undefined)).toMatchObject({
//     ok: false,
//     error: { _tag: "EvidenceIntegrityError" },
//   });
// });
//
// it("projects inline layout Evidence and retains a derived view record", () => {
//   const parent = analysisViewLayoutEvidence();
//   const result = inspectAnalysisView({
//     source: { kind: "inline", evidence: parent },
//     view: {
//       kind: "item",
//       collection: "sections",
//       selector: { index: 2 },
//     },
//   });
//   if (!result.ok) throw result.error;
//   const evidence = parseEvidence(result.value);
//   expect(evidence.operation).toBe("inspect_analysis_view");
//   expect(evidence.predicate_type).toBe("rea.analysis-view");
//   expect(evidence.confidence).toBe("derived");
//   expect(evidence.evidence_links).toEqual([parent.evidence_id]);
//   expect(evidence.normalized_result).toMatchObject({
//     kind: "item",
//     parent_evidence_id: parent.evidence_id,
//     item: { name: { display: ".data" } },
//   });
// });
//
// it("resolves same-session retained JavaScript Evidence without re-running analysis", () => {
//   const parent = analysisViewJavaScriptEvidence(
//     analysisViewJavaScriptAnalysisWithSource(),
//   );
//   const lookup = (evidenceId: string) =>
//     evidenceId === parent.evidence_id ? parent : undefined;
//   const summary = inspectAnalysisView(
//     {
//       source: {
//         kind: "retained-evidence",
//         evidence_id: parent.evidence_id,
//       },
//       view: { kind: "summary" },
//     },
//     lookup,
//   );
//   if (!summary.ok) throw summary.error;
export const _l = 187;
