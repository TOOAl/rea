export const __stub = 1;
// it("rejects callable array overrides and subclass species before parsing", () => {
//   const parent = analysisViewCaptureEvidence();
//   let invoked = false;
//   const callback = () => {
//     invoked = true;
//     throw new Error("Array callbacks must remain inert");
//   };
//   class CustomArray extends Array<unknown> {
//     static override get [Symbol.species](): ArrayConstructor {
//       return callback();
//     }
//   }
//   for (const array of [
//     Object.defineProperty([], "map", { value: callback }),
//     Object.defineProperty([], Symbol.iterator, { value: callback }),
//     new CustomArray(),
//   ])
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
//   expect(invoked).toBe(false);
// });
//
// it.each(["summary", "capture", "api-surface"] as const)(
//   "preserves ordinary inline Evidence for %s",
//   (kind) => {
//     const parent = analysisViewCaptureEvidence();
//     const before = JSON.stringify(parent);
//     const result = inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: { kind },
//     });
//     if (!result.ok) throw result.error;
//     expect(parseEvidence(result.value)).toEqual(result.value);
//     expect(result.value.evidence_links).toEqual([parent.evidence_id]);
//     expect(result.value.normalized_result).toMatchObject({
//       kind,
//       parent_evidence_id: parent.evidence_id,
//     });
//     expect(JSON.stringify(parent)).toBe(before);
//     expect(Object.isFrozen(parent)).toBe(false);
//   },
// );
//
// it("rejects executable constructor values before schema plain-object checks", () => {
//   const parent = analysisViewCaptureEvidence();
//   let invoked = false;
//   const constructor = () => undefined;
//   Object.defineProperty(constructor, "prototype", {
//     get() {
//       invoked = true;
//       throw new Error("Constructor metadata must remain inert");
//     },
//   });
//   for (const kind of ["summary", "capture", "api-surface"] as const) {
//     expect(
//       inspectAnalysisView({
//         source: {
//           kind: "inline",
//           evidence: { ...parent, raw_result: { constructor } },
//         },
//         view: { kind },
//       }),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisInputError" } });
//   }
//   expect(invoked).toBe(false);
// });
//
// it("rejects inline proxy values before reflection or parsing can run traps", () => {
//   const parent = analysisViewCaptureEvidence();
//   let invoked = false;
//   const trap = () => {
//     invoked = true;
//     throw new Error("Proxy behavior must remain inert");
//   };
//   const revoked = Proxy.revocable([], {});
//   revoked.revoke();
//   for (const value of [
//     new Proxy({}, { getPrototypeOf: trap, ownKeys: trap, get: trap }),
//     new Proxy(() => undefined, { get: trap }),
//     revoked.proxy,
//   ])
//     for (const kind of ["summary", "capture", "api-surface"] as const) {
//       const result = inspectAnalysisView({
//         source: { kind: "inline", evidence: { ...parent, raw_result: value } },
//         view: { kind },
//       });
//       expect(result).toMatchObject({
//         ok: false,
//         error: { _tag: "AnalysisInputError" },
//       });
//     }
//   expect(invoked).toBe(false);
// });
//
// it("keeps ignored array metadata inert through parsing and projection", () => {
//   const capture = analysisViewCaptureFixture();
//   const parent = createEvidence(
//     {
//       path: capture.artifact.path,
//       sha256: capture.artifact.sha256!,
//       format: "file",
//     },
//     { id: "fixture", name: "fixture", version: "1" },
//     {
//       operation: "inspect_web_network_capture",
//       parameters: { sensitive_value_count: 0 },
//       result: capture,
//       rawResult: [],
//     },
//   );
//   if (!Array.isArray(parent.raw_result)) throw new Error("Expected raw array");
//   const array = parent.raw_result;
//   let invoked = false;
//   const getter = () => {
//     invoked = true;
//     throw new Error("Ignored array metadata must remain inert");
//   };
//   for (let index = 0; index < 10_000; index += 1)
//     Object.defineProperty(array, `metadata-${index}`, { get: getter });
//   Object.defineProperty(array, Symbol("metadata"), { get: getter });
//   for (const kind of ["summary", "capture", "api-surface"] as const) {
//     const result = inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: { kind },
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value.evidence_links).toEqual([parent.evidence_id]);
//   }
//   expect(invoked).toBe(false);
//   expect(parseEvidence(parent).raw_result).toEqual([]);
// });
//
// it("keeps inline-envelope admission live alongside capture validation and grouping", () => {
//   // Each clone alone fits; both graphs coexist while the view is projected.
//   const capture = analysisViewObjectDenseCapture(40_000);
//   const parent = analysisViewCaptureEvidence(capture);
//   for (const kind of ["summary", "capture"] as const) {
//     const projected = inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: { kind },
//     });
//     if (!projected.ok) throw projected.error;
//     expect(projected.value.evidence_links).toEqual([parent.evidence_id]);
//   }
//   const retained = inspectAnalysisView(
//     {
//       source: { kind: "retained-evidence", evidence_id: parent.evidence_id },
//       view: { kind: "api-surface" },
//     },
//     () => parent,
//   );
//   if (!retained.ok) throw retained.error;
//   expect(
//     inspectAnalysisView({
//       source: { kind: "inline", evidence: parent },
//       view: { kind: "api-surface" },
//     }),
//   ).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisResourceConstraintError", resource: "memory" },
//   });
// });
//
// it("admits raw_result and parameters before authenticating a portable capture", () => {
//   const dense = analysisViewObjectDenseCapture();
//   const parent = analysisViewCaptureEvidence();
//   for (const field of ["raw_result", "parameters"] as const) {
//     const result = inspectAnalysisView({
//       source: { kind: "inline", evidence: { ...parent, [field]: dense } },
//       view: { kind: "api-surface" },
//     });
//     // Refuse expansion before hashing can report the deliberately stale ID.
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisResourceConstraintError", resource: "memory" },
//     });
//   }
// });
export const _l = 186;
