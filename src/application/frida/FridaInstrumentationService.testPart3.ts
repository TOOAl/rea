export const __stub = 1;
//
// it("retains an observed spawn resume after the target detaches before cancellation", async () => {
//   const controller = new AbortController();
//   const service = new FridaInstrumentationService(
//     createProvider({
//       async loadScript() {
//         controller.abort(new Error("cancelled after target exit"));
//         return { ok: true, value: createScriptObservation() };
//       },
//       status() {
//         return {
//           ...createSession(),
//           state: "detached",
//           targetResumeObserved: true,
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
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
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
//         target_state_before_cleanup: "detached",
//         target_resume_observed: true,
//       },
//     });
// });
//
// it.each([
//   { cleanupState: "running" as const, resumeObserved: true },
//   { cleanupState: "paused" as const, resumeObserved: false },
// ])(
//   "uses a spawned target state transition after failed cleanup ($cleanupState)",
//   async ({ cleanupState, resumeObserved }) => {
//     const controller = new AbortController();
//     let statusCalls = 0;
//     const service = new FridaInstrumentationService(
//       createProvider({
//         async loadScript() {
//           controller.abort(new Error("cancelled while loading"));
//           return { ok: true, value: createScriptObservation() };
//         },
//         status() {
//           statusCalls += 1;
//           return {
//             ...createSession(),
//             state: statusCalls === 1 ? "paused" : cleanupState,
//             targetResumeObserved: false,
//             scripts: [],
//             messages: [],
//             messagesTruncated: false,
//           };
//         },
//         async closeSession() {
//           return {
//             ok: false,
//             error: new AnalysisCapabilityUnavailableError(
//               "frida",
//               "close_frida_session",
//               "session cleanup failed",
//             ),
//           };
//         },
//       }),
//     );
//
//     const result = await service.instrument(
//       {
//         mode: "spawn",
//         deviceId: "local",
//         program: "/tmp/fixture",
//         source: { sourceKind: "inline", source: "send('ready');" },
//         durationMs: 0,
//       },
//       controller.signal,
//     );
//
//     expect(result.ok).toBe(false);
//     if (!result.ok)
//       expect(result.error.partialObservation).toMatchObject({
//         normalized_result: {
//           instrumentation_cleanup: "incomplete_or_unknown",
//           target_state_before_cleanup: "paused",
//           target_resume_observed: resumeObserved,
//         },
//       });
//   },
// );
//
// it("records target selection in Evidence without remote authentication values", async () => {
//   const token = "synthetic-frida-token";
//   const certificate = "synthetic-frida-certificate";
//   const service = new FridaInstrumentationService(createProvider());
//
//   const result = await service.instrument({
//     mode: "spawn",
//     remote: {
//       address: "127.0.0.1:27042",
//       token,
//       certificate,
//       origin: "rea-test",
//       keepaliveInterval: 1_000,
//     },
//     program: "/tmp/fixture",
//     argv: ["--marker", "selected-argument"],
//     source: { sourceKind: "inline", source: "send('ready');" },
//     durationMs: 1,
//   });
//
//   expect(result.ok).toBe(true);
//   if (!result.ok) return;
//   expect(result.value.evidence.parameters).toMatchObject({
//     session_id: createSession().sessionId,
//     remote: {
//       address: "127.0.0.1:27042",
//       origin: "rea-test",
//       keepalive_interval: 1_000,
//     },
//     mode: "spawn",
//     program: "/tmp/fixture",
//     argv: ["--marker", "selected-argument"],
//   });
//   const parameters = JSON.stringify(result.value.evidence.parameters);
//   expect(parameters).not.toContain(token);
//   expect(parameters).not.toContain(certificate);
// });
//
// it("reports completed cleanup when closing the parent session releases a failed script", async () => {
//   const service = new FridaInstrumentationService(
//     createProvider({
//       async loadScript() {
//         return {
//           ok: false,
//           error: new AnalysisCapabilityUnavailableError(
//             "frida",
//             "load_frida_script",
//             "script load failed",
//             {
//               cleanup: {
//                 reason: "script unload failed",
//                 resources: ["script-1"],
//               },
//             },
export const _l = 161;
