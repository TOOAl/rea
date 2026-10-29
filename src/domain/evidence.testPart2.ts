export const __stub = 1;
//       result,
//     });
//   expect(observe).toThrow("maximum nesting depth");
//   freezeJsonSnapshot(result);
//   expect(observe).toThrow("maximum nesting depth");
// });
//
// it("preserves prototype-named own members when reusing an owned result", () => {
//   const result = { ["__proto__"]: { preserved: 7 }, constructor: "ordinary" };
//   const observation = { operation: "inspect", parameters: {}, result };
//   const ordinary = createEvidence(TARGET, PROVIDER, observation);
//   const owned = createEvidence(TARGET, PROVIDER, {
//     ...observation,
//     result: freezeJsonSnapshot(result),
//   });
//   expect(owned.normalized_result).toBe(result);
//   expect(owned).toEqual(ordinary);
//   expect(parseEvidence(JSON.parse(JSON.stringify(owned)))).toEqual(owned);
//   expect(Object.getPrototypeOf(owned.normalized_result)).toBe(Object.prototype);
//   expect(Reflect.get(Object.prototype, "preserved")).toBeUndefined();
// });
//
// it("preserves producer envelope admission and profile validation", () => {
//   const unprofiled = createEvidence(TARGET, PROVIDER, {
//     operation: "inspect",
//     parameters: {},
//     result: { observed: [1, 2, 3] },
//   });
//   const profiled = createEvidence(TARGET, PROVIDER, {
//     operation: "inspect",
//     parameters: {},
//     result: { observed: [1, 2, 3] },
//     analysisProfile: PROFILE,
//   });
//   const { analysis_profile: _missingProfile, ...missingProfile } = unprofiled;
//   expect(evidenceSchema.safeParse(missingProfile).success).toBe(false);
//   expect(
//     evidenceSchema.safeParse({
//       ...unprofiled,
//       analysis_profile: undefined,
//     }).success,
//   ).toBe(false);
//   const candidates: unknown[] = [
//     missingProfile,
//     unprofiled,
//     profiled,
//     { ...unprofiled, analysis_profile: undefined },
//     { ...unprofiled, analysis_profile: null },
//     {
//       ...profiled,
//       analysis_profile: { ...PROFILE, provider: { ...PROVIDER, id: "other" } },
//     },
//     { ...unprofiled, unexpected: true },
//   ];
//   for (const candidate of candidates) {
//     const canonical = evidenceSchema.safeParse(candidate);
//     if (canonical.success)
//       expect(parseEvidence(candidate)).toEqual(canonical.data);
//     else expect(() => parseEvidence(candidate)).toThrow();
//   }
// });
//
// it("snapshots caller-owned payloads before deriving their identity", () => {
//   const result = { nested: { values: ["observed"] } };
//   const rawResult = { entries: [{ value: "raw" }] };
//   const parameters = { selected: ["target"] };
//   const evidence = createEvidence(TARGET, PROVIDER, {
//     operation: "inspect",
//     parameters,
//     result,
//     rawResult,
//   });
//   result.nested.values.push("later");
//   const rawEntry = rawResult.entries[0];
//   if (rawEntry !== undefined) rawEntry.value = "changed";
//   parameters.selected.push("other");
//   expect(evidence.normalized_result).toEqual({
//     nested: { values: ["observed"] },
//   });
//   expect(evidence.raw_result).toEqual({ entries: [{ value: "raw" }] });
//   expect(evidence.parameters).toEqual({ selected: ["target"] });
//   expect(parseEvidence(evidence)).toEqual(evidence);
//   expect(() =>
//     parseEvidence({ ...evidence, normalized_result: result }),
//   ).toThrow(/semantic identifier/u);
// });
//
// describe("analysis evidence identity", () => {
//   it("preserves prototype-named parameter keys and their semantic identity", () => {
//     const evidence = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters: Object.fromEntries([["__proto__", false]]),
//       result: true,
//     });
//     expect(evidence.parameters).toEqual({ ["__proto__"]: false });
//     expect(Object.hasOwn(evidence.parameters, "__proto__")).toBe(true);
//     expect(parseEvidence(evidence)).toEqual(evidence);
//     const stripped = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters: {},
//       result: true,
//     });
//     expect(stripped.evidence_id).not.toBe(evidence.evidence_id);
//     expect(() =>
//       parseEvidence({
//         ...evidence,
//         parameters: { ["__proto__"]: true },
//       }),
//     ).toThrow(/semantic identifier/u);
//   });
//
//   it.prop([
//     fc.dictionary(
//       fc.string({ minLength: 1, maxLength: 12 }),
//       fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
//     ),
//   ])("canonicalizes parameter key order", (parameters) => {
//     const reversed = Object.fromEntries(Object.entries(parameters).reverse());
//     const first = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters,
//       result: true,
//     });
//     const second = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters: reversed,
//       result: true,
//     });
//     expect(second.evidence_id).toBe(first.evidence_id);
//   });
//
//   it.prop([fc.string({ minLength: 1 }), fc.string({ minLength: 1 })])(
//     "keeps identity path-independent and provider-sensitive",
//     (firstPath, secondPath) => {
//       const first = createEvidence(
//         { ...TARGET, path: `/first/${firstPath}/artifact` },
//         PROVIDER,
//         { operation: "health", parameters: {}, result: true },
//       );
//       const moved = createEvidence(
//         { ...TARGET, path: `/second/${secondPath}/artifact` },
//         PROVIDER,
//         { operation: "health", parameters: {}, result: true },
//       );
//       const changedProvider = createEvidence(
//         { ...TARGET, path: `/second/${secondPath}/artifact` },
//         { ...PROVIDER, id: `${PROVIDER.id}-other` },
//         { operation: "health", parameters: {}, result: true },
//       );
//       expect(moved.evidence_id).toBe(first.evidence_id);
//       expect(changedProvider.evidence_id).not.toBe(first.evidence_id);
export const _l = 151;
