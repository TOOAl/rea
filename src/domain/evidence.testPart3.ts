export const __stub = 1;
//     },
//   );
//
//   it("creates deterministic provider-neutral Evidence", () => {
//     const observation = {
//       operation: "procedure_info",
//       parameters: { document: null, procedure: "0x1000" },
//       result: { name: "main" },
//       rawResult: { token: "<redacted:token>" },
//     } as const;
//     const evidence = createEvidence(TARGET, PROVIDER, observation);
//     expect(evidenceSchema.parse(evidence)).toEqual(evidence);
//     expect(parseEvidence(evidence)).toEqual(evidence);
//     expect(evidence).toMatchObject({
//       provider: PROVIDER,
//       subject: { digest: { sha256: "a".repeat(64) } },
//       confidence: "observed",
//       authority: "shipped-artifact",
//       raw_result: { token: "<redacted:token>" },
//       normalized_result: { name: "main" },
//     });
//     expect(evidence.evidence_id).toMatch(/^ev_[a-f0-9]{64}$/u);
//     expect(createEvidence(TARGET, PROVIDER, observation)).toEqual(evidence);
//   });
//
//   it("records absent profiles as null and binds reported profiles into identity", () => {
//     const unprofiled = createEvidence(TARGET, PROVIDER, {
//       operation: "procedure_info",
//       parameters: { procedure: "main" },
//       result: { name: "main" },
//     });
//     expect(unprofiled.analysis_profile).toBeNull();
//     expect(parseEvidence(unprofiled)).toEqual(unprofiled);
//
//     const profiled = createEvidence(TARGET, PROVIDER, {
//       operation: "procedure_info",
//       parameters: { procedure: "main" },
//       result: { name: "main" },
//       analysisProfile: PROFILE,
//     });
//     expect(profiled).toMatchObject({ analysis_profile: PROFILE });
//     expect(profiled.evidence_id).not.toBe(unprofiled.evidence_id);
//     expect(() =>
//       createEvidence(
//         TARGET,
//         { ...PROVIDER, id: "other" },
//         {
//           operation: "procedure_info",
//           parameters: {},
//           result: null,
//           analysisProfile: PROFILE,
//         },
//       ),
//     ).toThrow(/profile provider/u);
//   });
//
//   it("excludes local paths but includes redacted raw results in identity", () => {
//     const observation = {
//       operation: "health",
//       parameters: {},
//       result: true,
//       rawResult: { pid: 100 },
//     } as const;
//     const first = createEvidence(TARGET, PROVIDER, observation);
//     const moved = createEvidence(
//       { ...TARGET, path: "/other/renamed-fixture" },
//       PROVIDER,
//       observation,
//     );
//     expect(moved.evidence_id).toBe(first.evidence_id);
//     expect(
//       createEvidence(TARGET, PROVIDER, {
//         ...observation,
//         rawResult: { pid: 200 },
//       }).evidence_id,
//     ).not.toBe(first.evidence_id);
//   });
//
//   it("rejects semantic tampering", () => {
//     const evidence = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters: {},
//       result: true,
//     });
//     expect(() =>
//       parseEvidence({ ...evidence, normalized_result: false }),
//     ).toThrow("semantic identifier");
//   });
// });
//
// it("rejects a subject local path containing NUL while admitting an empty path", () => {
//   const evidence = createEvidence(TARGET, PROVIDER, {
//     operation: "health",
//     parameters: {},
//     result: true,
//   });
//   expect(evidence.subject).not.toBeNull();
//   const withPath = (path: string) => ({
//     ...evidence,
//     subject: { ...evidence.subject, local_path: path },
//   });
//   expect(evidenceSchema.safeParse(withPath("/tmp/fixture")).success).toBe(true);
//   expect(evidenceSchema.safeParse(withPath("")).success).toBe(true);
//   expect(evidenceSchema.safeParse(withPath("a\u0000b")).success).toBe(false);
// });
//
// it("binds an explicit unknown-subject reason into the semantic Evidence identity", () => {
//   const reason = "Caller excluded the observed digest.";
//   const observation = { operation: "health", parameters: {}, result: true };
//   const explicit = createEvidence(undefined, PROVIDER, {
//     ...observation,
//     subjectUnavailableReason: reason,
//   });
//   const defaulted = createEvidence(undefined, PROVIDER, observation);
//   expect(explicit.subject).toBeNull();
//   expect(explicit.limitations).toEqual([reason]);
//   expect(defaulted.limitations).toEqual([
//     "Artifact identity is unavailable for this observation.",
//   ]);
//   expect(explicit.evidence_id).not.toBe(defaulted.evidence_id);
//   expect(parseEvidence(explicit)).toEqual(explicit);
// });
//
// it("derives byte-stable bundle manifests independent of record order", () => {
//   const artifactEvidence = createEvidence(TARGET, PROVIDER, {
//     operation: "health",
//     parameters: {},
//     result: true,
//   });
//   const captureEvidence = createEvidence(
//     undefined,
//     { id: "process", name: "Process capture", version: "1" },
//     {
//       predicateType: "rea.process-capture",
//       operation: "capture_process_scenario",
//       parameters: {},
//       result: { exit: 0 },
//       authority: "controlled-replay",
//       environment: {
//         id: "linux-x64",
//         platform: "linux",
//         architecture: "x64",
//         isolation: "process",
//       },
//     },
//   );
//   const forward = createEvidenceBundle([artifactEvidence, captureEvidence]);
//   const reverse = createEvidenceBundle([captureEvidence, artifactEvidence]);
//   expect(JSON.stringify(reverse)).toBe(JSON.stringify(forward));
//   expect(forward).toMatchObject({
//     artifacts: [{ digest: { sha256: TARGET.sha256 }, format: "mach-o" }],
export const _l = 151;
