export const __stub = 1;
//     cleanup,
//     execution_failure: "final filesystem snapshot failed",
//   });
//   expect(projectAnalysisError(error)).toMatchObject({
//     code: "process_capture_failed",
//     details: {
//       cleanup_report: cleanup,
//       execution_failure: "final filesystem snapshot failed",
//       partial_observation: {
//         capture: { frames: [{ data: "observed before finalization" }] },
//       },
//     },
//   });
//   expect(
//     analysisErrorProjectionSchema.safeParse(projectAnalysisError(error))
//       .success,
//   ).toBe(true);
// });
//
// it("preserves cancellation while projecting observations and successful cleanup", () => {
//   const capture = parseProcessCapture({
//     ...accountFullyObservedProcessCapture({
//       ...emptyProcessCapture(),
//       frames: [{ sequence: 0, at_ms: 0, data: "observed before cancellation" }],
//     }),
//     event_journal: [],
//   });
//   const cleanup = {
//     owned_process_group: { state: "cleaned" as const, reason: null },
//     terminal_renderer: { state: "cleaned" as const, reason: null },
//     temporary_root: { state: "cleaned" as const, reason: null },
//   };
//   let error: ProcessCaptureError | undefined;
//   try {
//     resolveProcessResult(capture, processCaptureCancelled(), cleanup);
//   } catch (cause: unknown) {
//     if (!(cause instanceof ProcessCaptureError)) throw cause;
//     error = cause;
//   }
//   if (error === undefined) throw new Error("expected cancellation");
//
//   expect(projectAnalysisError(error)).toMatchObject({
//     code: "cancelled",
//     message: "Process capture was cancelled. Start it again when ready.",
//     details: {
//       operation: "process_capture",
//       cleanup: "complete",
//       cleanup_report: cleanup,
//       partial_observation: {
//         capture: { frames: [{ data: "observed before cancellation" }] },
//       },
//     },
//   });
// });
//
// it("fails closed on Windows before resolving or launching scenario paths", async () => {
//   const scenario = processScenarioSchema.parse({
//     executable: "Z:/missing/should-never-be-resolved.exe",
//     working_directory: "Z:/missing/working-directory",
//   });
//   const result = await captureProcessScenario(scenario, undefined, "win32");
//   if (result.ok) throw new Error("expected Windows ownership refusal");
//   if (!(result.error instanceof AnalysisCapabilityUnavailableError))
//     throw new Error("expected a capability-unavailable outcome");
//   expect(result.error).toMatchObject({
//     operation: "capture_process_scenario",
//     reason: expect.stringContaining("Windows PTY process capture"),
//   });
//   expect(projectAnalysisError(result.error)).toMatchObject({
//     code: "capability_unavailable",
//     category: "unsupported_provider",
//     message: expect.stringContaining("does not yet verify descendant cleanup"),
//     details: {
//       operation: "capture_process_scenario",
//       reason: result.error.reason,
//     },
//   });
// });
//
// it("retains the root start identity once at launch and signals only with it", async () => {
//   const observe = vi.fn(async () => ({
//     state: "readable" as const,
//     identity: "id-launch",
//   }));
//   const signal = vi.fn(async () => "signaled" as const);
//   const signalRoot = retainRootSignaller(4242, 500, "captured-run", {
//     observe,
//     signal,
//   });
//
//   expect(
//     observe,
//     "the identity is read at launch, before any signal",
//   ).toHaveBeenCalledTimes(1);
//   expect(
//     await signalRoot("SIGTERM"),
//     "a matching identity is signalled",
//   ).toEqual({
//     delivery: "signaled",
//   });
//   await signalRoot("SIGKILL");
//
//   expect(
//     observe,
//     "later signals never re-read the identity",
//   ).toHaveBeenCalledTimes(1);
//   expect(
//     signal.mock.calls,
//     "both signals carry the pid and the identity retained at launch",
//   ).toEqual([
//     [4242, "id-launch", "SIGTERM"],
//     [4242, "id-launch", "SIGKILL"],
//   ]);
// });
//
// it.each([
//   ["a vanished root", async () => undefined, { delivery: "gone" }],
//   [
//     "an unreadable identity",
//     async () => ({ state: "unavailable" as const, reason: "unsupported" }),
//     { delivery: "unverified", reason: "unsupported" },
//   ],
//   [
//     "a failed identity read",
//     async () => {
//       throw new Error("ps failed");
//     },
//     { delivery: "unverified", reason: "ps failed" },
//   ],
// ])(
//   "never signals without a retained identity: %s",
//   async (_label, read, delivery) => {
//     const signal = vi.fn(async () => "signaled" as const);
//     const signalRoot = retainRootSignaller(4242, 500, "captured-run", {
//       observe: read,
//       signal,
//     });
//
//     expect(
//       await signalRoot("SIGTERM"),
//       "the delivery result is recorded",
//     ).toEqual(delivery);
//     expect(signal, "no identity means no signal at all").not.toHaveBeenCalled();
//   },
// );
//
// it("does not read an identity when there is no finalization interval", async () => {
//   const observe = vi.fn(async () => undefined);
//   const signalRoot = retainRootSignaller(4242, 0, "captured-run", {
//     observe,
//     signal: vi.fn(async () => "signaled" as const),
//   });
//
//   expect(
//     observe,
//     "the zero-interval path never inspects the root",
//   ).not.toHaveBeenCalled();
//   expect(
//     await signalRoot("SIGKILL"),
//     "an unretained identity stays unverified",
//   ).toEqual({
//     delivery: "unverified",
//     reason: "root identity was not retained",
//   });
// });
//
// it.each(["signaled", "gone", "identity-changed", "unverified"] as const)(
//   "reports the identity-checked delivery result %s unchanged",
//   async (delivery) => {
//     const signalRoot = retainRootSignaller(4242, 500, "captured-run", {
//       observe: async () => ({ state: "readable", identity: "id-launch" }),
//       signal: async () => delivery,
//     });
//
//     expect(
//       await signalRoot("SIGKILL"),
//       "the signaller result is not coerced",
//     ).toEqual(
//       delivery === "unverified"
//         ? {
//             delivery,
//             reason:
//               "start identity could not be verified or the signal call failed",
//           }
//         : { delivery },
//     );
//   },
// );
//
// it("seeds a finalization observation only for a scenario with an interval", () => {
//   const seed = {
//     frames: [],
//     interactions: [],
//     samples: [],
//     eventJournal: [],
//     before: {
//       files: [],
//       truncated: false,
//       completeRoots: [],
//       coverage: emptyFilesystemCoverage,
//     },
//   };
//
//   expect(
//     Object.keys(createProcessCaptureObservationBuffer(seed)),
//     "a default scenario keeps the base observation keys",
//   ).not.toContain("finalization");
//   expect(
//     Object.keys(
//       createProcessCaptureObservationBuffer({
//         ...seed,
//         finalizationEnabled: true,
//       }),
//     ),
//     "a scenario with an interval carries the finalization observation",
//   ).toContain("finalization");
// });
//
// it("keeps a non-empty reason when the identity inspection fails without a message", async () => {
//   const signalRoot = retainRootSignaller(4242, 500, "captured-run", {
//     observe: async () => {
//       throw new Error();
//     },
//     signal: vi.fn(async () => "signaled" as const),
//   });
//
//   const result = await signalRoot("SIGTERM");
//
//   expect(result.delivery, "the attempt is unverified").toBe("unverified");
//   expect(
//     result.reason?.length,
//     "the reason is never empty, which the capture schema would reject",
//   ).toBeGreaterThan(0);
// });
//
// it("keeps a non-empty reason when the identity diagnostic is empty", async () => {
//   const signalRoot = retainRootSignaller(4242, 500, "captured-run", {
//     observe: async () => ({ state: "unavailable" as const, reason: "" }),
//     signal: vi.fn(async () => "signaled" as const),
//   });
//
//   const result = await signalRoot("SIGTERM");
//
//   expect(
//     result.reason?.length,
//     "an empty diagnostic is replaced by a named fallback",
//   ).toBeGreaterThan(0);
// });
export const _l = 248;
