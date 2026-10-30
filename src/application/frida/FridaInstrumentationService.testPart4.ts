export const __stub = 1;
//           ),
//         };
//       },
//     }),
//   );
//
//   const result = await service.instrument({
//     mode: "spawn",
//     deviceId: "local",
//     program: "/tmp/fixture",
//     source: { sourceKind: "inline", source: "send('ready');" },
//     durationMs: 1,
//   });
//
//   expect(result.ok).toBe(false);
//   if (!result.ok) expect(result.error.cleanupIncomplete).toBe(false);
// });
//
// it("cleans up a session and returns typed cancellation after a pending start", async () => {
//   let finishStart: (() => void) | undefined;
//   let markStartCalled: (() => void) | undefined;
//   const startGate = new Promise<void>((resolve) => {
//     finishStart = resolve;
//   });
//   const startCalled = new Promise<void>((resolve) => {
//     markStartCalled = resolve;
//   });
//   const closed: string[] = [];
//   const provider: FridaInstrumentationPort = {
//     async listDevices() {
//       return { ok: true, value: { devices: [], cleanupError: null } };
//     },
//     async listProcesses() {
//       return {
//         ok: true,
//         value: { deviceId: "local", processes: [], cleanupError: null },
//       };
//     },
//     async startSession() {
//       markStartCalled?.();
//       await startGate;
//       return {
//         ok: true,
//         value: {
//           sessionId: "00000000-0000-4000-8000-000000000001",
//           deviceId: "local",
//           target: "fixture",
//           pid: 10,
//           mode: "attach",
//           state: "running",
//         },
//       };
//     },
//     async loadScript() {
//       return {
//         ok: false,
//         error: new AnalysisInputError("load_frida_script"),
//       };
//     },
//     async resumeSession() {
//       return { ok: true, value: null };
//     },
//     async unloadScript() {
//       return { ok: true, value: null };
//     },
//     status() {
//       return undefined;
//     },
//     async closeSession(sessionId) {
//       closed.push(sessionId);
//       return { ok: true, value: { targetResumeObserved: false } };
//     },
//     async closeAll() {},
//   };
//   const service = new FridaInstrumentationService(provider);
//   const controller = new AbortController();
//   const pending = service.startSession(
//     { mode: "attach", deviceId: "local", pid: 10 },
//     controller.signal,
//   );
//   await startCalled;
//   controller.abort(new Error("caller cancelled"));
//   finishStart?.();
//
//   const result = await pending;
//   expect(result.ok).toBe(false);
//   if (!result.ok) expect(result.error._tag).toBe("AnalysisCancelledError");
//   expect(closed).toEqual(["00000000-0000-4000-8000-000000000001"]);
// });
//
// it("retains a cancelled provider load's source and messages in one-shot Evidence", async () => {
//   const controller = new AbortController();
//   const script = {
//     ...createScriptObservation(),
//     messages: [{ type: "send", payload: "cancelled-load" }],
//   };
//   const service = new FridaInstrumentationService(
//     createProvider({
//       async loadScript() {
//         controller.abort(new Error("cancel during native load"));
//         return {
//           ok: false,
//           error: new FridaScriptLoadCancelledError(script, {
//             cause: controller.signal.reason,
//           }),
//         };
//       },
//     }),
//   );
//   const result = await service.instrument(
//     {
//       mode: "spawn",
//       program: "/fixture",
//       source: { sourceKind: "inline", source: "send('cancelled-load')" },
//       durationMs: 0,
//     },
//     controller.signal,
//   );
//   if (result.ok) throw new Error("Cancelled instrumentation succeeded");
//   expect(result.error.partialObservation).toMatchObject({
//     normalized_result: {
//       source_kind: "inline",
//       source_sha256: script.sourceSha256,
//       messages: script.messages,
//       instrumentation_cleanup: "released",
//     },
//   });
// });
//
// it("preserves a provider-committed load when cancellation arrives during result delivery", async () => {
//   const controller = new AbortController();
//   let unloads = 0;
//   const script = createScriptObservation();
//   const service = new FridaInstrumentationService(
//     createProvider({
//       loadScript() {
//         const completed = Promise.resolve({ ok: true as const, value: script });
//         void completed.then(() =>
//           controller.abort(new Error("late cancellation")),
//         );
//         return completed;
//       },
//       async unloadScript() {
//         unloads += 1;
//         return { ok: true, value: null };
//       },
//     }),
//   );
//   const loaded = await service.loadScript(
//     createSession().sessionId,
//     { sourceKind: "inline", source: "send('ready')" },
//     controller.signal,
//   );
//   expect(controller.signal.aborted).toBe(true);
//   if (!loaded.ok) throw loaded.error;
//   expect(loaded.value.normalized_result).toMatchObject({
//     script_id: script.scriptId,
//   });
//   expect(unloads).toBe(0);
// });
export const _l = 160;
