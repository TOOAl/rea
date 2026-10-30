export const __stub = 1;
//     providers: [{ id: "fixture" }, { id: "process" }],
//     environments: [{ id: "linux-x64" }],
//     scenarios: [{ evidence_id: captureEvidence.evidence_id }],
//     captures: [{ evidence_id: captureEvidence.evidence_id }],
//   });
// });
//
// describe("DOS analysis evidence identity", () => {
//   it("retains DOS MZ identity independently of PE identity", () => {
//     const target = {
//       path: TARGET.path,
//       sha256: TARGET.sha256,
//       kind: "executable" as const,
//       format: "dos-mz" as const,
//       architecture: "x86" as const,
//       availableArchitectures: ["x86" as const],
//     };
//     const observation = { operation: "health", parameters: {}, result: true };
//     const evidence = createEvidence(target, PROVIDER, observation);
//     expect(parseEvidence(evidence).subject).toMatchObject({
//       format: "dos-mz",
//       architecture: "x86",
//     });
//     expect(evidence.evidence_id).not.toBe(
//       createEvidence({ ...target, format: "pe" }, PROVIDER, observation)
//         .evidence_id,
//     );
//   });
// });
//
// describe("evidence JSON admission before authentication", () => {
//   it.each(["parameters", "raw_result", "normalized_result"] as const)(
//     "keeps rejected accessors and proxies inert in %s",
//     (field) => {
//       const evidence = createEvidence(TARGET, PROVIDER, {
//         operation: "health",
//         parameters: {},
//         result: true,
//       });
//       for (const kind of ["accessor", "proxy"] as const) {
//         let reads = 0;
//         const value =
//           kind === "accessor"
//             ? {
//                 get attack() {
//                   reads += 1;
//                   return "observed";
//                 },
//               }
//             : new Proxy(
//                 { attack: "observed" },
//                 {
//                   ownKeys(target) {
//                     reads += 1;
//                     return Reflect.ownKeys(target);
//                   },
//                   get(target, key, receiver) {
//                     reads += 1;
//                     return Reflect.get(target, key, receiver);
//                   },
//                 },
//               );
//         let failure: unknown;
//         try {
//           parseEvidence({ ...evidence, [field]: value });
//         } catch (cause: unknown) {
//           failure = cause;
//         }
//         expect(reads, `${kind} reached Evidence authentication`).toBe(0);
//         expect(failure).toMatchObject({
//           name: "ZodError",
//           issues: [
//             {
//               code: "custom",
//               path: [field],
//               message: expect.stringContaining(
//                 kind === "accessor" ? "accessors" : "proxies",
//               ),
//             },
//           ],
//         });
//       }
//     },
//   );
// });
//
// describe("evidence parameter depth bound", () => {
//   it("rejects evidence whose parameters nest past the JSON depth limit", () => {
//     const evidence = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters: {},
//       result: true,
//     });
//     let value: unknown = 1;
//     for (let index = 0; index <= MAX_JSON_DEPTH; index += 1)
//       value = { nested: value };
//     const result = evidenceSchema.safeParse({
//       ...evidence,
//       parameters: { attack: value },
//     });
//     expect(result.success).toBe(false);
//     if (result.success) return;
//     expect(
//       result.error.issues.some((issue) =>
//         issue.message.includes("maximum nesting depth"),
//       ),
//     ).toBe(true);
//   });
//
//   it("stops semantic authentication when normalized JSON exceeds its depth bound", () => {
//     const evidence = createEvidence(TARGET, PROVIDER, {
//       operation: "health",
//       parameters: {},
//       result: true,
//     });
//     let value: unknown = 1;
//     for (let index = 0; index < 10_000; index += 1) value = { nested: value };
//
//     expect(() =>
//       parseEvidence({ ...evidence, normalized_result: value }),
//     ).toThrow(/maximum nesting depth/u);
//   });
// });
//
// it("preserves prototype-named raw and normalized results with aligned identity", () => {
//   const result = { ["__proto__"]: { preserved: 7 }, constructor: "ordinary" };
//   const evidence = createEvidence(TARGET, PROVIDER, {
//     operation: "health",
//     parameters: {},
//     result,
//     rawResult: result,
//   });
//   const parsed = parseEvidence(evidence);
//   expect(parsed.normalized_result).toEqual(result);
//   expect(parsed.raw_result).toEqual(result);
//   expect(Object.getPrototypeOf(parsed.normalized_result)).toBe(
//     Object.prototype,
//   );
//   expect(Reflect.get(Object.prototype, "preserved")).toBeUndefined();
//   const stripped = createEvidence(TARGET, PROVIDER, {
//     operation: "health",
//     parameters: {},
//     result: { constructor: "ordinary" },
//     rawResult: { constructor: "ordinary" },
//   });
//   expect(stripped.evidence_id).not.toBe(evidence.evidence_id);
// });
export const _l = 147;
