export const __stub = 1;
//               reason: "browser close failed",
//               resources: ["browser_transport"],
//             }
//           : {
//               reason: "capture cleanup is uncertain",
//               resources: ["capture_handle"],
//             },
//       );
//       expect(session.closeCalls).toBe(1);
//     },
//   );
// });
//
// describe("PlaywrightBrowserScenarioProvider cancellation and timeout", () => {
//   it.each([
//     {
//       name: "cancellation",
//       error: new AnalysisCancelledError("capture_browser_scenario"),
//       code: "cancelled",
//       category: "cancelled",
//       details: { operation: "capture_browser_scenario", cleanup: "complete" },
//     },
//     {
//       name: "timeout",
//       error: new AnalysisTimeoutError("capture_browser_scenario", 250),
//       code: "provider_timeout",
//       category: "timeout",
//       details: { operation: "capture_browser_scenario", timeout_ms: 250 },
//     },
//   ])(
//     "preserves $name category and details when cleanup succeeds",
//     async ({ error, code, category, details }) => {
//       const session = new FakeSession("launch", {
//         capture: { call: 1, error },
//       });
//       const provider = new PlaywrightBrowserScenarioProvider(() =>
//         Promise.resolve(session),
//       );
//       const result = await provider.captureScenario(scenario());
//
//       expect(result.ok).toBe(false);
//       if (result.ok) return;
//       const projection = projectAnalysisError(result.error);
//       expect(projection).toMatchObject({
//         code,
//         category,
//         details: {
//           ...details,
//           partial_observation: {
//             kind: "browser-scenario-observation",
//             capture: { browser: { cleanup: "terminated-owned-process" } },
//           },
//         },
//       });
//       expect(session.closeCalls).toBe(1);
//     },
//   );
// });
//
// describe("PlaywrightBrowserScenarioProvider request cancellation", () => {
//   it("does not open a session for an already-cancelled request", async () => {
//     let opens = 0;
//     const provider = new PlaywrightBrowserScenarioProvider(() => {
//       opens += 1;
//       return Promise.resolve(new FakeSession("launch"));
//     });
//     const controller = new AbortController();
//     controller.abort();
//     const result = await provider.captureScenario(scenario(), {
//       signal: controller.signal,
//     });
//     expect(result.ok).toBe(false);
//     expect(opens).toBe(0);
//   });
//
//   it("cancels an active action and still closes the session", async () => {
//     const controller = new AbortController();
//     const session = new FakeSession("launch");
//     session.onPerform = () => controller.abort();
//     const provider = new PlaywrightBrowserScenarioProvider(() =>
//       Promise.resolve(session),
//     );
//     const result = await provider.captureScenario(scenario(), {
//       signal: controller.signal,
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value.steps[1]?.status).toBe("cancelled");
//     expect(session.closeCalls).toBe(1);
//   });
// });
//
// it("shares concurrent close and retries browser cleanup after failure", async () => {
//   const browserClose = vi
//     .fn<() => Promise<void>>()
//     .mockRejectedValueOnce(new Error("browser close failed"))
//     .mockResolvedValue(undefined);
//   const removeProfile = vi
//     .fn<() => Promise<void>>()
//     .mockResolvedValue(undefined);
//   const finishEvents = vi
//     .fn<() => Promise<void>>()
//     .mockResolvedValue(undefined);
//   const cleanupSettlements: boolean[] = [];
//   const cleanup = new PlaywrightScenarioBrowserCleanupOwner({
//     closeBrowser: browserClose,
//     removeProfile,
//     onSettled: (browserClosed) => cleanupSettlements.push(browserClosed),
//   });
//
//   const first = cleanup.close(finishEvents);
//   const concurrent = cleanup.close(finishEvents);
//   await expect(first).rejects.toMatchObject({ reason: "cleanup_failed" });
//   await expect(concurrent).rejects.toMatchObject({ reason: "cleanup_failed" });
//   expect(browserClose).toHaveBeenCalledTimes(1);
//   expect(removeProfile).not.toHaveBeenCalled();
//   expect(finishEvents).toHaveBeenCalledTimes(1);
//   expect(cleanupSettlements).toEqual([false]);
//
//   await expect(cleanup.close(finishEvents)).resolves.toBeUndefined();
//   await expect(cleanup.close(finishEvents)).resolves.toBeUndefined();
//   expect(browserClose).toHaveBeenCalledTimes(2);
//   expect(removeProfile).toHaveBeenCalledTimes(1);
//   expect(finishEvents).toHaveBeenCalledTimes(1);
//   expect(cleanupSettlements).toEqual([false, true]);
// });
//
// it("keeps failed event finalization failed across cleanup retries", async () => {
//   const finishEvents = vi
//     .fn<() => Promise<void>>()
//     .mockRejectedValue(new Error("event finalization failed"));
//   const closeBrowser = vi
//     .fn<() => Promise<void>>()
//     .mockResolvedValue(undefined);
//   const cleanup = new PlaywrightScenarioBrowserCleanupOwner({
//     closeBrowser,
//     removeProfile: undefined,
//   });
//
//   await expect(cleanup.close(finishEvents)).rejects.toMatchObject({
//     reason: "cleanup_failed",
//   });
//   await expect(cleanup.close(finishEvents)).rejects.toMatchObject({
//     reason: "cleanup_failed",
//   });
//   expect(finishEvents).toHaveBeenCalledTimes(1);
//   expect(closeBrowser).toHaveBeenCalledTimes(1);
// });
//
// it.each(["launch", "connect"] as const)(
//   "reports locale coverage in %s success and retained operation/cleanup failures",
//   async (mode) => {
//     const input = scenario({ mode });
//     input.environment.locale = "fr-FR";
//     for (const failures of [
//       {},
//       {
//         capture: {
//           call: 1,
//           error: new AnalysisCancelledError("capture_browser_scenario"),
//         },
//       },
//       { close: new Error("fixture cleanup interrupted") },
//     ]) {
//       const session = new FakeSession(mode, failures);
//       const provider = new PlaywrightBrowserScenarioProvider(
//         async () => session,
//       );
//       const result = await provider.captureScenario(input);
//       expect(result.ok).toBe(!("capture" in failures || "close" in failures));
//       const expected = {
//         limitations:
//           mode === "connect"
//             ? expect.arrayContaining([
//                 "Attached locale fr-FR applies to Intl formatting only; navigator.language(s) and Accept-Language remain caller-controlled. Use launch mode for matching page and request languages.",
//               ])
//             : expect.not.arrayContaining([
//                 expect.stringContaining("Attached locale"),
//               ]),
//       };
//       if (result.ok) expect(result.value).toMatchObject(expected);
//       else
//         expect(projectAnalysisError(result.error)).toMatchObject({
//           details: {
//             partial_observation: {
//               kind: "browser-scenario-observation",
//               capture: expected,
//             },
//           },
//         });
//       expect(session.closeCalls).toBe(1);
//     }
//   },
// );
export const _l = 193;
