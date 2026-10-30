export const __stub = 1;
//     controller.signal,
//   );
//
//   expect(result.ok).toBe(false);
//   if (!result.ok) expect(result.error._tag).toBe("AnalysisCancelledError");
// });
//
// it("does not resume a spawned target when cancellation arrives during script loading", async () => {
//   const controller = new AbortController();
//   let resumes = 0;
//   let closes = 0;
//   const service = new FridaInstrumentationService(
//     createProvider({
//       async loadScript() {
//         controller.abort(new Error("cancelled while loading"));
//         return { ok: true, value: createScriptObservation() };
//       },
//       async resumeSession() {
//         resumes += 1;
//         return { ok: true, value: null };
//       },
//       async closeSession() {
//         closes += 1;
//         return { ok: true, value: { targetResumeObserved: true } };
//       },
//     }),
//   );
//
//   const result = await service.instrument(
//     {
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//       source: { sourceKind: "inline", source: "send('ready');" },
//       durationMs: 1,
//     },
//     controller.signal,
//   );
//
//   expect(result.ok).toBe(false);
//   if (!result.ok) {
//     expect(result.error._tag).toBe("AnalysisCancelledError");
//     expect(result.error.partialObservation).toMatchObject({
//       normalized_result: {
//         cleanup_error: null,
//         target_state_before_cleanup: "paused",
//         target_resume_observed: true,
//         instrumentation_cleanup: "released",
//         target_liveness_after_cleanup: "unknown",
//       },
//       parameters: {
//         mode: "spawn",
//         program: "/tmp/fixture",
//       },
//     });
//   }
//   expect(resumes).toBe(0);
//   expect(closes).toBe(1);
// });
//
// it("reports the spawned session when cancellation arrives during resume", async () => {
//   const controller = new AbortController();
//   let closes = 0;
//   const service = new FridaInstrumentationService(
//     createProvider({
//       async resumeSession() {
//         controller.abort(new Error("cancelled while resuming"));
//         return { ok: true, value: null };
//       },
//       status() {
//         return {
//           ...createSession(),
//           state: "running",
//           targetResumeObserved: true,
//           scripts: [],
//           messages: [],
//           messagesTruncated: false,
//         };
//       },
//       async closeSession() {
//         closes += 1;
//         return { ok: true, value: { targetResumeObserved: false } };
//       },
//     }),
//   );
//
//   const result = await service.instrument(
//     {
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//       argv: ["--owned-fixture"],
//       source: { sourceKind: "inline", source: "send('ready');" },
//       durationMs: 60_000,
//     },
//     controller.signal,
//   );
//
//   expect(result.ok).toBe(false);
//   if (!result.ok) {
//     expect(result.error._tag).toBe("AnalysisCancelledError");
//     expect(result.error.partialObservation).toMatchObject({
//       normalized_result: {
//         target_state_before_cleanup: "running",
//         target_resume_observed: true,
//         instrumentation_cleanup: "released",
//         target_liveness_after_cleanup: "unknown",
//       },
//       parameters: {
//         argv: ["--owned-fixture"],
//       },
//     });
//   }
//   expect(closes).toBe(1);
// });
//
// it("does not infer a Frida resume for a running attached target on cancellation", async () => {
//   const controller = new AbortController();
//   const service = new FridaInstrumentationService(
//     createProvider({
//       async loadScript() {
//         controller.abort(new Error("cancelled while loading"));
//         return { ok: true, value: createScriptObservation() };
//       },
//       status() {
//         return {
//           ...createSession(),
//           mode: "attach",
//           state: "running",
//           targetResumeObserved: false,
//           scripts: [],
//           messages: [],
//           messagesTruncated: false,
//         };
//       },
//       async closeSession() {
//         return { ok: true, value: { targetResumeObserved: false } };
//       },
//     }),
//   );
//
//   const result = await service.instrument(
//     {
//       mode: "attach",
//       deviceId: "local",
//       pid: 512,
//       source: { sourceKind: "inline", source: "send('ready');" },
//       durationMs: 0,
//     },
//     controller.signal,
//   );
//
//   expect(result.ok).toBe(false);
//   if (!result.ok)
//     expect(result.error.partialObservation).toMatchObject({
//       normalized_result: {
//         target_state_before_cleanup: "running",
//         target_resume_observed: false,
//       },
//     });
// });
export const _l = 161;
