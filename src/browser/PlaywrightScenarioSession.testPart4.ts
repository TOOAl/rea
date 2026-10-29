export const __stub = 1;
//     },
//     environment: { service_workers: "allow" },
//   });
//   const session = await PlaywrightScenarioSession.open(attached, {}, {});
//
//   expect(mocks.openBrowser).toHaveBeenCalledWith(
//     attached,
//     {},
//     expect.any(Object),
//   );
//   expect(page.evaluate).not.toHaveBeenCalled();
//   expect(page.addInitScript).not.toHaveBeenCalled();
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("blocks new attached service-worker registration without removing existing registrations", async () => {
//   const { cleanup, page } = fixture();
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//   });
//   const session = await PlaywrightScenarioSession.open(attached, {}, {});
//
//   expect(page.evaluate).toHaveBeenCalledTimes(3);
//   const injection = mocks.policySend.mock.calls.find(
//     ([method]) => method === "Page.addScriptToEvaluateOnNewDocument",
//   )?.[1];
//   expect(injection.source).toContain(
//     "service workers are blocked by scenario policy",
//   );
//   expect(injection.source).not.toContain("getRegistrations");
//   expect(injection.source).not.toContain("unregister");
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(mocks.policySend).toHaveBeenCalledWith(
//     "Page.removeScriptToEvaluateOnNewDocument",
//     { identifier: "owned-policy-script" },
//     "policy-session",
//   );
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("retains the attached connection when registration restoration fails", async () => {
//   const { cleanup } = fixture();
//   mocks.storage = undefined;
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//     storage: {},
//   });
//   const session = await PlaywrightScenarioSession.open(attached, {}, {});
//   const failure = new Error("registration restoration failed");
//   let failRestoration = true;
//   mocks.policySend.mockImplementation(async (method: string) => {
//     if (method === "Runtime.evaluate" && failRestoration) {
//       failRestoration = false;
//       throw failure;
//     }
//     return policyResponse(method);
//   });
//   await expect(session.close(true)).rejects.toBe(failure);
//   expect(cleanup.close).not.toHaveBeenCalled();
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Page.stopLoading",
//     ),
//   ).toHaveLength(1);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
//   await expect(session.close()).resolves.toBe("disconnected-external");
// });
//
// it("cancels a stalled policy preflight without allowing late setup", async () => {
//   const { cleanup, page } = fixture();
//   let release: () => void = () => undefined;
//   let entered: () => void = () => undefined;
//   const started = new Promise<void>((resolve) => {
//     entered = resolve;
//   });
//   page.evaluate.mockImplementationOnce(async () => {
//     entered();
//     await new Promise<void>((resolve) => {
//       release = resolve;
//     });
//     return false;
//   });
//   const cancellation = new AbortController();
//   const opening = PlaywrightScenarioSession.open(
//     browserScenarioSchema.parse({
//       ...scenario,
//       browser: {
//         mode: "connect",
//         cdp_endpoint: "http://127.0.0.1:9222",
//         target_id: "target",
//       },
//       environment: { service_workers: "block" },
//     }),
//     {},
//     { signal: cancellation.signal },
//   );
//   const outcome = expect(opening).rejects.toMatchObject({
//     _tag: "AnalysisCancelledError",
//   });
//   await started;
//   cancellation.abort();
//   await outcome;
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
//   expect(cleanup.close.mock.calls[0]).toHaveLength(1);
//   release();
//   await new Promise<void>((resolve) => setImmediate(resolve));
//   expect(mocks.policySend).not.toHaveBeenCalled();
// });
//
// it("waits for a pending registration installation before cancelled cleanup", async () => {
//   const { cleanup, page } = fixture();
//   let releaseInstallation: () => void = () => undefined;
//   let installationStarted: () => void = () => undefined;
//   const installed = new Promise<void>((resolve) => {
//     releaseInstallation = resolve;
//   });
//   const started = new Promise<void>((resolve) => {
//     installationStarted = resolve;
//   });
//   mocks.policySend.mockImplementation(async (method: string) => {
//     if (method === "Page.addScriptToEvaluateOnNewDocument") {
//       installationStarted();
//       await installed;
//       return { identifier: "owned-policy-script" };
//     }
//     return policyResponse(method);
//   });
//   const cancellation = new AbortController();
//   const opening = PlaywrightScenarioSession.open(
//     browserScenarioSchema.parse({
//       ...scenario,
//       browser: {
//         mode: "connect",
//         cdp_endpoint: "http://127.0.0.1:9222",
//         target_id: "target",
//       },
//       environment: { service_workers: "block" },
//     }),
//     {},
//     { signal: cancellation.signal },
//   );
//   const outcome = expect(opening).rejects.toMatchObject({
//     _tag: "AnalysisCancelledError",
//   });
//   await started;
//   cancellation.abort();
//   await new Promise<void>((resolve) => setImmediate(resolve));
//   expect(cleanup.close).not.toHaveBeenCalled();
//   expect(page.evaluate).toHaveBeenCalledTimes(1);
//   releaseInstallation();
//   await outcome;
//   const restoration = mocks.policySend.mock.calls.find(
//     ([method]) => method === "Runtime.evaluate",
//   )?.[1];
//   expect(restoration).toMatchObject({
//     expression: expect.stringContaining("policy_owned"),
//   });
//   expect(mocks.policySend).toHaveBeenCalledWith(
//     "Page.stopLoading",
//     {},
//     "policy-session",
//   );
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("rejects attached block when caller-owned registrations already exist", async () => {
//   const { cleanup, page } = fixture();
//   page.evaluate.mockResolvedValueOnce("service_worker_blocked");
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//   });
//
//   await expect(
//     PlaywrightScenarioSession.open(attached, {}, {}),
//   ).rejects.toMatchObject({
//     _tag: "BrowserObservationError",
//     reason: "service_worker_blocked",
//   });
//   expect(page.addInitScript).not.toHaveBeenCalled();
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("preserves both cleanup failures and retries retained owners", async () => {
//   const { cleanup, storage } = fixture();
//   const detachFailure = new Error("CDP detach rejected");
//   const transportFailure = new Error("Playwright transport close failed");
//   storage.close
//     .mockRejectedValueOnce(detachFailure)
//     .mockResolvedValueOnce(undefined);
//   cleanup.close
//     .mockRejectedValueOnce(transportFailure)
//     .mockImplementationOnce(async (finishEvents?: () => Promise<void>) => {
//       await finishEvents?.();
//     });
//   const session = await PlaywrightScenarioSession.open(scenario, {}, {});
//
//   let failure: unknown;
//   try {
//     await session.close();
//   } catch (cause: unknown) {
//     failure = cause;
//   }
//   expect(failure).toBeInstanceOf(AggregateError);
//   expect((failure as AggregateError).errors).toEqual([
//     detachFailure,
//     transportFailure,
//   ]);
//   expect(storage.close).toHaveBeenCalledTimes(1);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
//
//   await expect(session.close()).resolves.toBe("terminated-owned-process");
//   expect(storage.close).toHaveBeenCalledTimes(2);
//   expect(cleanup.close).toHaveBeenCalledTimes(2);
// });
export const _l = 234;
