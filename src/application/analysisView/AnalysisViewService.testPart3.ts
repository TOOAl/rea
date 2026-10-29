export const __stub = 1;
//   }
//   expect(
//     inspectAnalysisView({
//       source: { kind: "inline", evidence: analysisViewLayoutEvidence() },
//       view: { kind: "api-surface" },
//     }),
//   ).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisUnsupportedTargetError" },
//   });
// });
//
// it("rejects a null projected digest under a present parent subject", () => {
//   const capture = analysisViewCaptureFixture();
//   capture.artifact.sha256 = null;
//   const parent = createEvidence(
//     { path: capture.artifact.path, sha256: "a".repeat(64), format: "file" },
//     { id: "fixture", name: "fixture", version: "1" },
//     {
//       operation: "inspect_web_network_capture",
//       parameters: { sensitive_value_count: 0 },
//       result: capture,
//       confidence: "observed",
//     },
//   );
//   expect(
//     inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: { kind: "api-surface" },
//     }),
//   ).toMatchObject({ ok: false, error: { _tag: "EvidenceIntegrityError" } });
// });
//
// it("refuses an object-dense borrowed capture before making a full schema clone", () => {
//   const capture = analysisViewObjectDenseCapture();
//   expect(Buffer.byteLength(JSON.stringify(capture))).toBeLessThan(
//     WEB_NETWORK_CAPTURE_LIMITS.inputBytes,
//   );
//   const parent = analysisViewCaptureEvidence(capture);
//   const ledger = new EvidenceLedger();
//   const recorded = ledger.record(parent);
//   if (!recorded.ok) throw recorded.error;
//   const borrowed = ledger.forAnalysis(parent.evidence_id)!;
//   expect(Object.isFrozen(borrowed.normalized_result)).toBe(true);
//   const result = inspectAnalysisView(
//     {
//       source: { kind: "retained-evidence", evidence_id: parent.evidence_id },
//       view: { kind: "api-surface", limit: 1 },
//     },
//     (id) => ledger.forAnalysis(id),
//   );
//   expect(result).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "AnalysisResourceConstraintError",
//       resource: "memory",
//     },
//   });
//   expect(ledger.forAnalysis(parent.evidence_id)).toBe(borrowed);
// });
//
// it.each(["summary", "capture", "api-surface"] as const)(
//   "rejects inline accessors before parsing a %s view",
//   (kind) => {
//     let accessed = false;
//     const evidence = {
//       get normalized_result() {
//         accessed = true;
//         throw new Error("Evidence must be admitted before parsing");
//       },
//     };
//     const input = {
//       source: { kind: "inline", evidence },
//       view: { kind },
//     };
//     const parsed = inspectAnalysisViewInputSchema.parse(input);
//     if (parsed.source.kind !== "inline")
//       throw new Error("Expected inline input");
//     expect(parsed.source.evidence).toBe(evidence);
//     expect(inspectAnalysisView(input)).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisInputError",
//         issues: [{ path: ["source", "evidence", "normalized_result"] }],
//       },
//     });
//     expect(accessed).toBe(false);
//     expect(
//       inspectAnalysisView({
//         source: { kind: "inline", evidence: analysisViewCaptureEvidence() },
//         view: { kind },
//       }).ok,
//     ).toBe(true);
//   },
// );
//
// it.each(["summary", "capture", "api-surface"] as const)(
//   "rejects nested, hidden and inherited inline accessors for %s",
//   (kind) => {
//     const parent = analysisViewCaptureEvidence();
//     let accessed = false;
//     const getter = () => {
//       accessed = true;
//       throw new Error("Inline accessors must remain inert");
//     };
//     const nested = {
//       get value() {
//         return getter();
//       },
//     };
//     const hidden = Object.defineProperty({}, "value", { get: getter });
//     const array = Object.defineProperty([null], 0, { get: getter });
//     const inherited: unknown = Object.create({
//       get value() {
//         return getter();
//       },
//     });
//     const cyclic: Record<string, unknown> = {};
//     cyclic["self"] = cyclic;
//     const cases: { data: unknown; path: (string | number)[] }[] = [
//       { data: nested, path: ["value"] },
//       { data: hidden, path: ["value"] },
//       { data: array, path: [0] },
//       { data: inherited, path: [] },
//       { data: cyclic, path: ["self"] },
//     ];
//     for (const { data, path } of cases) {
//       // A complete envelope reaches payload parsing and Evidence authentication.
//       const input = {
//         source: {
//           kind: "inline" as const,
//           evidence: { ...parent, raw_result: data },
//         },
//         view: { kind },
//       };
//       for (const result of [
//         inspectAnalysisView(input),
//         inspectAnalysisViewValidated(
//           inspectAnalysisViewInputSchema.parse(input),
//         ),
//       ])
//         expect(result).toMatchObject({
//           ok: false,
//           error: {
//             _tag: "AnalysisInputError",
//             issues: [{ path: ["source", "evidence", "raw_result", ...path] }],
//           },
//         });
//     }
//     expect(accessed).toBe(false);
//   },
// );
//
// it.each([
//   ["own map", "map", false],
//   ["own iterator", Symbol.iterator, false],
//   ["own constructor", "constructor", false],
//   ["inherited map", "map", true],
//   ["inherited iterator", Symbol.iterator, true],
// ] as const)(
//   "rejects array %s accessors without invoking them",
//   (_name, key, inherited) => {
//     const parent = analysisViewCaptureEvidence();
//     let accessed = false;
//     const array: unknown[] = [];
//     const owner: object = inherited ? Object.create(Array.prototype) : array;
//     Object.defineProperty(owner, key, {
//       get() {
//         accessed = true;
//         throw new Error("Array behavior must remain inert");
//       },
//     });
//     if (inherited) Object.setPrototypeOf(array, owner);
//     for (const kind of ["summary", "capture", "api-surface"] as const) {
//       const result = inspectAnalysisView({
//         source: { kind: "inline", evidence: { ...parent, raw_result: array } },
//         view: { kind },
//       });
//       expect(result).toMatchObject({
//         ok: false,
//         error: { _tag: "AnalysisInputError" },
//       });
//     }
//     expect(accessed).toBe(false);
//   },
// );
//
export const _l = 187;
