export const __stub = 1;
//   expect(summary.value.normalized_result).toMatchObject({
//     kind: "summary",
//     parent_evidence_id: parent.evidence_id,
//     parent_operation: "analyze_javascript_application",
//   });
//   expect(summary.value.normalized_result).not.toHaveProperty(
//     "summary.semantic_graph",
//   );
//   const item = inspectAnalysisView(
//     {
//       source: {
//         kind: "retained-evidence",
//         evidence_id: parent.evidence_id,
//       },
//       view: {
//         kind: "item",
//         collection: "modules",
//         selector: { path: "renderer.js" },
//       },
//     },
//     lookup,
//   );
//   if (!item.ok) throw item.error;
//   expect(JSON.stringify(item.value.normalized_result)).toContain(
//     "export const secret = 1;",
//   );
// });
//
// it("rejects stale retained IDs and unsupported parent operations", () => {
//   const missing = inspectAnalysisView(
//     {
//       source: {
//         kind: "retained-evidence",
//         evidence_id: JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE.evidence_id,
//       },
//       view: { kind: "summary" },
//     },
//     () => undefined,
//   );
//   expect(missing).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "EvidenceIntegrityError",
//       evidenceId: JAVASCRIPT_APPLICATION_EVIDENCE_EXAMPLE.evidence_id,
//     },
//   });
//   const unsupported = createEvidence(
//     undefined,
//     { id: "fixture", name: "Fixture", version: "1" },
//     {
//       operation: "inspect_recorded_crash",
//       parameters: {},
//       result: { path: "/artifacts/crash.core" },
//     },
//   );
//   const rejected = inspectAnalysisView({
//     source: { kind: "inline", evidence: unsupported },
//     view: { kind: "summary" },
//   });
//   expect(rejected).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisUnsupportedTargetError" },
//   });
//   expect(
//     inspectAnalysisView({
//       source: { kind: "inline", evidence: analysisViewLayoutEvidence() },
//       view: { kind: "summary", approval: true },
//     }),
//   ).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
// });
//
// it("preserves an absent parent subject instead of guessing its format", () => {
//   const analysis = analysisViewJavaScriptAnalysisWithSource();
//   const original = analysisViewJavaScriptEvidence(analysis);
//   const parent = createEvidence(undefined, original.provider, {
//     operation: original.operation,
//     parameters: {},
//     result: original.normalized_result,
//     limitations: original.limitations,
//   });
//   const result = inspectAnalysisView(
//     {
//       source: { kind: "retained-evidence", evidence_id: parent.evidence_id },
//       view: { kind: "summary" },
//     },
//     () => parent,
//   );
//   if (!result.ok) throw result.error;
//   expect(result.value.subject).toBeNull();
//   expect(result.value.locations).toEqual([
//     { kind: "artifact-path", path: analysis.input_path },
//   ]);
// });
//
// it("rejects contradictory subject and analysis artifact digests", () => {
//   const analysis = analysisViewJavaScriptAnalysisWithSource();
//   const original = analysisViewJavaScriptEvidence(analysis);
//   const parent = createEvidence(
//     {
//       path: analysis.input_path,
//       format: analysis.format,
//       sha256: "d".repeat(64),
//     },
//     original.provider,
//     {
//       operation: original.operation,
//       parameters: {},
//       result: original.normalized_result,
//     },
//   );
//   const result = inspectAnalysisView(
//     {
//       source: { kind: "retained-evidence", evidence_id: parent.evidence_id },
//       view: { kind: "summary" },
//     },
//     () => parent,
//   );
//   expect(result).toMatchObject({
//     ok: false,
//     error: { _tag: "EvidenceIntegrityError" },
//   });
// });
//
// describe("summarizeRetainedAnalysis", () => {
//   const parent = analysisViewJavaScriptEvidence(
//     analysisViewJavaScriptAnalysisWithSource(),
//   );
//
//   it("retains the complete Evidence before projecting its summary", () => {
//     const retained = new Map<string, Evidence>();
//     const summary = summarizeRetainedAnalysis(parent, {
//       recordEvidence: (evidence) => {
//         retained.set(evidence.evidence_id, evidence);
//         return ok("added");
//       },
//       evidenceById: (evidenceId) => retained.get(evidenceId),
//     });
//     if (!summary.ok) throw summary.error;
//     expect(retained.get(parent.evidence_id)).toBe(parent);
//     expect(summary.value.evidence_links).toEqual([parent.evidence_id]);
//     expect(summary.value.normalized_result).toMatchObject({
//       kind: "summary",
//       parent_evidence_id: parent.evidence_id,
//       parent_operation: "analyze_javascript_application",
//     });
//   });
//
//   it("refuses a summary whose complete Evidence cannot be retained", () => {
//     const unavailable = summarizeRetainedAnalysis(parent, {
//       recordEvidence: undefined,
//       evidenceById: undefined,
//     });
//     expect(unavailable.ok).toBe(false);
//     if (unavailable.ok) return;
//     expect(unavailable.error._tag).toBe("AnalysisCapabilityUnavailableError");
//     expect(unavailable.error.userMessage).toContain("detail complete");
//
//     const conflict = new EvidenceIntegrityError("ledger conflict");
//     expect(
//       summarizeRetainedAnalysis(parent, {
//         recordEvidence: () => err(conflict),
//         evidenceById: () => parent,
//       }),
//     ).toEqual(err(conflict));
//   });
// });
//
// it("seals inferred and literal HAR pages, including a null artifact digest", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.artifact.sha256 = null;
//   const parent = analysisViewCaptureEvidence(capture);
//   // Any templated group in the full grouping makes every page inferred.
//   for (const [offset, confidence] of [
//     [0, "inferred"],
//     [11, "inferred"],
//   ] as const) {
//     const result = inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: { kind: "api-surface", offset, limit: 1 },
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value.confidence).toBe(confidence);
//     expect(result.value.subject).toBeNull();
//     expect(parseEvidence(result.value)).toEqual(result.value);
export const _l = 187;
