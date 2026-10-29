export const __stub = 1;
// import { boundedViewMessages } from "./analysisViewCoverage.js";
// import { expect, it } from "vitest";
//
// import { functionDossierSchema } from "../hopperValues.js";
// import { ghidraFunctionDossier } from "../ghidraValues.fixture.js";
// import { JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE } from "../../contracts/javascript/javascriptRuntimeReconciliationExample.js";
// import { ARTIFACT_COMPARISON_EXAMPLE } from "../../contracts/artifactComparisonExample.js";
// import {
//   analysisViewBindJavaScriptGraphs,
//   analysisViewJavaScriptAnalysis,
//   analysisViewJavaScriptAnalysisWithSource,
//   analysisViewLayoutEvidence,
//   analysisViewLayoutFixture,
// } from "../../../tests/fixtures/analysisView.js";
// import {
//   createJavaScriptApplicationGraph,
//   createJavaScriptApplicationNode,
//   createImmutableJavaScriptApplicationGraphSteps,
// } from "../javascript/javascriptApplicationGraph.js";
// import {
//   createJavaScriptSemanticGraph,
//   createImmutableJavaScriptSemanticGraphSteps,
// } from "../javascript/javascriptSemanticGraph.js";
// import {
//   completeWithinViewCoverage,
//   pageViewCoverage,
// } from "./analysisViewCoverage.js";
// import { sourceMapReference } from "../javascript/javascriptApplicationGraph.fixture.js";
// import { createArtifactInspection } from "../artifactInspection.js";
// import { javascriptModulePath } from "./javascriptApplicationView.js";
// import {
//   inspectAnalysisViewInputSchema,
//   projectAnalysisView,
//   type AnalysisViewParent,
// } from "./analysisView.js";
//
// const layoutParent = (): AnalysisViewParent => {
//   const evidence = analysisViewLayoutEvidence();
//   return {
//     evidenceId: evidence.evidence_id,
//     operation: evidence.operation,
//     normalizedResult: evidence.normalized_result,
//     limitations: evidence.limitations,
//   };
// };
//
// const javascriptParent = (
//   analysis = analysisViewJavaScriptAnalysis(),
// ): AnalysisViewParent => ({
//   evidenceId: JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE.evidence_id,
//   operation: "analyze_javascript_application",
//   normalizedResult: analysis,
//   limitations: JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE.limitations,
// });
//
// const nativeParent = (
//   result: unknown = ghidraFunctionDossier(),
// ): AnalysisViewParent => ({
//   evidenceId: "ev_" + "b".repeat(64),
//   operation: "analyze_function",
//   normalizedResult: result,
//   limitations: ["Retained provider limitation"],
//   artifact: { path: "/fixtures/example.exe", sha256: "a".repeat(64) },
// });
//
// it("projects native procedure and bounded assembly and high-pcode with exact parent identity", () => {
//   const parent = nativeParent();
//   const procedure = projectAnalysisView(parent, {
//     kind: "native",
//     facet: "procedure",
//     offset: 0,
//     limit: 64,
//   });
//   if (!procedure.ok) throw procedure.error;
//   expect(procedure.value).toMatchObject({
//     kind: "native",
//     parent_operation: "analyze_function",
//     artifact: parent.artifact,
//     item: { address: "0x401000" },
//   });
//   expect(procedure.value.view_digest).not.toBe(parent.evidenceId.slice(3));
//   const assembly = projectAnalysisView(parent, {
//     kind: "native",
//     facet: "assembly",
//     offset: 0,
//     limit: 1,
//   });
//   if (!assembly.ok) throw assembly.error;
//   expect(assembly.value).toMatchObject({
//     coverage: { examined: 1, total: 2, next_offset: 1 },
//     item: ["0x401000: CALL 0x401020"],
//   });
//   const flow = projectAnalysisView(parent, {
//     kind: "native",
//     facet: "value_flow_operations",
//     offset: 0,
//     limit: 1,
//   });
//   if (!flow.ok) throw flow.error;
//   expect(flow.value).toMatchObject({ item: [{ opcode: "COPY" }] });
// });
//
// it("rejects invalid native parents, unsupported source operations and singleton offsets", () => {
//   const view = {
//     kind: "native",
//     facet: "assembly",
//     offset: 0,
//     limit: 4,
//   } as const;
//   expect(projectAnalysisView(nativeParent({}), view)).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
//   expect(
//     projectAnalysisView({ ...nativeParent(), artifact: null }, view),
//   ).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
//   expect(projectAnalysisView(layoutParent(), view)).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
//   expect(projectAnalysisView(javascriptParent(), view)).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
//   expect(
//     projectAnalysisView(nativeParent(), {
//       kind: "native",
//       facet: "procedure",
//       offset: 1,
//       limit: 2,
//     }),
//   ).toMatchObject({ ok: false, error: { _tag: "AnalysisInputError" } });
// });
//
// it("preserves native API limitations and unavailable residual unknowns", () => {
//   const original = functionDossierSchema.parse(ghidraFunctionDossier());
//   const view = {
//     kind: "native",
//     facet: "procedure",
//     offset: 0,
//     limit: 64,
//   } as const;
//   const unavailable = projectAnalysisView(
//     nativeParent({
//       ...original,
//       native_api: {
//         available: false,
//         reason: "No decompiler",
//         residual_unknowns: ["Calling convention unresolved"],
//       },
//     }),
//     view,
//   );
//   if (!unavailable.ok) throw unavailable.error;
//   expect(unavailable.value.unknowns).toContain("Calling convention unresolved");
//   const available = projectAnalysisView(nativeParent(), view);
//   if (!available.ok) throw available.error;
//   if (!original.native_api?.available) throw new Error("expected API fixture");
//   expect(available.value.limitations).toEqual(
//     expect.arrayContaining(original.native_api.limitations),
//   );
// });
//
// it("rejects artifact summary views when inspection substep coverage count disagrees", () => {
//   const source = ARTIFACT_COMPARISON_EXAMPLE.left;
//   const inspection = createArtifactInspection(source);
//   const parent: AnalysisViewParent = {
//     evidenceId: `ev_${"a".repeat(64)}`,
//     operation: "inspect_artifact",
//     normalizedResult: {
//       ...inspection,
//       coverage: {
//         ...inspection.coverage,
//         substeps_completed: inspection.substeps.length + 1,
//       },
//     },
//     subject: source.subject,
//     limitations: [],
//   };
//   expect(projectAnalysisView(parent, { kind: "summary" })).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
// });
//
// it("pages every retained dossier collection and the native API record", () => {
//   const original = functionDossierSchema.parse(ghidraFunctionDossier());
//   const page = (
//     facet:
//       | "basic_blocks"
//       | "comments"
//       | "unresolved_calls"
//       | "referenced_strings"
//       | "referenced_names"
//       | "swift_string_literals",
//     result: unknown = original,
//   ) => {
//     const view = projectAnalysisView(nativeParent(result), {
//       kind: "native",
//       facet,
//       offset: 0,
//       limit: 64,
//     });
//     if (!view.ok) throw view.error;
//     return view.value;
//   };
//   expect(page("basic_blocks")).toMatchObject({
//     item: original.basic_blocks,
//     coverage: { total: original.basic_blocks.length, exhausted: true },
//   });
//   expect(page("referenced_strings")).toMatchObject({
//     item: original.referenced_strings,
//   });
//   expect(
//     page("comments", {
//       ...original,
//       comments: [{ address: "0x401000", kind: "comment", text: "entry" }],
//     }),
//   ).toMatchObject({ item: [{ text: "entry" }] });
//   expect(page("referenced_names")).toMatchObject({ coverage: { total: 0 } });
//   const literal = {
//     source_address: "0x401004",
//     value: "SleepDisabled",
//     representation: "small",
//     address: null,
//     registers: ["x0", "x1"],
//     words: ["0x7369447065656c53", "0xed000064656c6261"],
//   };
//   expect(
//     page("swift_string_literals", {
//       ...original,
//       swift_string_literals: [literal],
//     }),
//   ).toMatchObject({ item: [literal], coverage: { total: 1 } });
//   expect(page("swift_string_literals")).toMatchObject({
//     item: { available: false, reason: "not recorded" },
//   });
//   const { unresolved_calls: _omitted, ...withoutUnresolved } = original;
//   expect(
//     page("unresolved_calls", {
//       ...withoutUnresolved,
//       native_value_flow: {
//         available: false,
//         reason: "No high p-code",
//         limitations: [],
//       },
//     }),
//   ).toMatchObject({ item: { available: false, reason: "not recorded" } });
//   const api = projectAnalysisView(nativeParent(), {
//     kind: "native",
//     facet: "native_api",
//     offset: 0,
//     limit: 64,
//   });
//   if (!api.ok) throw api.error;
//   expect(api.value).toMatchObject({
//     item: original.native_api,
//     coverage: { status: "complete-within-view" },
//   });
// });
//
// it("reports the malformed native dossier field", () => {
//   const result = projectAnalysisView(
//     nativeParent({
//       ...functionDossierSchema.parse(ghidraFunctionDossier()),
//       pseudocode: 12,
//     }),
//     {
//       kind: "native",
//       facet: "pseudocode",
//       offset: 0,
//       limit: 64,
//     },
//   );
//   expect(result).toMatchObject({
//     ok: false,
//     error: {
//       issues: expect.arrayContaining([
//         expect.objectContaining({
//           path: ["source", "normalized_result", "pseudocode"],
//         }),
//       ]),
//     },
//   });
// });
//
// it("native pseudocode pages do not split surrogate pairs", () => {
//   const original = functionDossierSchema.parse(ghidraFunctionDossier());
//   const parent = nativeParent({ ...original, pseudocode: "ab😀cd" });
//   expect(
//     projectAnalysisView(parent, {
//       kind: "native",
//       facet: "pseudocode",
//       offset: 3,
//       limit: 2,
//     }),
//   ).toMatchObject({ ok: false, error: { _tag: "AnalysisInputError" } });
//   const safe = projectAnalysisView(parent, {
//     kind: "native",
//     facet: "pseudocode",
//     offset: 2,
//     limit: 3,
//   });
//   if (!safe.ok) throw safe.error;
//   expect(safe.value).toMatchObject({
//     item: { text: "😀c", unit: "utf16-code-units" },
//     coverage: { examined: 3, next_offset: 5 },
//   });
// });
//
// it.each([
//   { kind: "page", collection: "sections", offset: 0, limit: 500 },
//   { kind: "native", facet: "assembly", offset: 0, limit: 500 },
// ])(
//   "accepts caller-selected page sizes and rejects malformed bounds: $kind",
//   (view) => {
//     const input = {
//       source: {
//         kind: "retained-evidence",
//         evidence_id: `ev_${"a".repeat(64)}`,
//       },
//       view,
//     };
//     expect(inspectAnalysisViewInputSchema.safeParse(input).success).toBe(true);
//     for (const limit of [0, -1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1])
//       expect(
//         inspectAnalysisViewInputSchema.safeParse({
//           ...input,
export const _l = 331;
