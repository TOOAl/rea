export const __stub = 1;
//   const session = await PlaywrightScenarioSession.open(
//     browserScenarioSchema.parse({
//       ...scenario,
//       browser: {
//         mode: "connect",
//         cdp_endpoint: "http://127.0.0.1:9222",
//         target_id: "target",
//       },
//       environment: { service_workers: "block" },
//       storage: {},
//     }),
//     {},
//     {},
//   );
//   page.frames = () => [page, pendingChild as unknown as typeof page];
//
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(pendingChild.evaluate).not.toHaveBeenCalled();
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("rejects an init script accepted by CDP when the live realm is unprotected", async () => {
//   const { page, cleanup } = fixture();
//   page.evaluate
//     .mockResolvedValueOnce(null)
//     .mockResolvedValueOnce("policy_unprotected");
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//   });
//   await expect(
//     PlaywrightScenarioSession.open(attached, {}, {}),
//   ).rejects.toMatchObject({
//     reason: "target_not_allowed",
//   });
//   expect(
//     mocks.policySend.mock.calls.some(
//       ([method]) => method === "Page.addScriptToEvaluateOnNewDocument",
//     ),
//   ).toBe(true);
//   expect(
//     mocks.policySend.mock.calls.some(
//       ([method]) => method === "Page.removeScriptToEvaluateOnNewDocument",
//     ),
//   ).toBe(true);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("restores an owned policy script after later setup fails", async () => {
//   const { cleanup } = fixture();
//   const setupFailure = new Error("auto-attach rejected");
//   mocks.policySend.mockImplementation(async (method: string) => {
//     if (method === "Target.setAutoAttach") throw setupFailure;
//     return policyResponse(method);
//   });
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
//   await expect(PlaywrightScenarioSession.open(attached, {}, {})).rejects.toBe(
//     setupFailure,
//   );
//   expect(mocks.policySend).toHaveBeenCalledWith(
//     "Page.removeScriptToEvaluateOnNewDocument",
//     { identifier: "owned-policy-script" },
//     "policy-session",
//   );
//   expect(
//     mocks.policySend.mock.calls.some(
//       ([method]) => method === "Runtime.evaluate",
//     ),
//   ).toBe(true);
//   expect(mocks.policyTransportClose).toHaveBeenCalledTimes(1);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("retains an owned script identifier after rejected removal", async () => {
//   const { cleanup } = fixture();
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
//   const failure = new Error("removeScript rejected");
//   mocks.policySend.mockRejectedValueOnce(failure);
//   await expect(session.close()).rejects.toBe(failure);
//   expect(cleanup.close).not.toHaveBeenCalled();
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   const removals = mocks.policySend.mock.calls.filter(
//     ([method]) => method === "Page.removeScriptToEvaluateOnNewDocument",
//   );
//   expect(removals).toHaveLength(2);
//   expect(
//     removals.every(([, params]) => params.identifier === "owned-policy-script"),
//   ).toBe(true);
// });
//
// it("retries transport close without detaching an already released policy session", async () => {
//   fixture();
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
//   const failure = new Error("transport close rejected");
//   mocks.policyTransportClose.mockRejectedValueOnce(failure);
//   await expect(session.close()).rejects.toBe(failure);
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Target.detachFromTarget",
//     ),
//   ).toHaveLength(1);
//   expect(mocks.policyTransportClose).toHaveBeenCalledTimes(2);
// });
//
// it.each(["closed page", "detached target"])(
//   "releases its policy transport after a %s",
//   async (terminal) => {
//     const { page } = fixture();
//     mocks.storage = undefined;
//     const attached = browserScenarioSchema.parse({
//       ...scenario,
//       browser: {
//         mode: "connect",
//         cdp_endpoint: "http://127.0.0.1:9222",
//         target_id: "target",
//       },
//       environment: { service_workers: "block" },
//       storage: {},
//     });
//     const session = await PlaywrightScenarioSession.open(attached, {}, {});
//     if (terminal === "closed page") page.isClosed = () => true;
//     else
//       mocks.policyEvent?.({
//         method: "Target.detachedFromTarget",
//         params: { sessionId: "policy-session" },
//       });
//     await expect(session.close(true)).resolves.toBe("disconnected-external");
//     expect(
//       mocks.policySend.mock.calls.some(
//         ([method]) => method === "Target.detachFromTarget",
//       ),
//     ).toBe(false);
//     expect(mocks.policyTransportClose).toHaveBeenCalledTimes(1);
//     if (terminal === "detached target") {
//       expect(page.evaluate).toHaveBeenCalledWith("globalThis.stop()");
//       expect(page.evaluate).toHaveBeenCalledWith(
//         expect.stringContaining("policy_owned"),
//       );
//     }
//   },
// );
//
// it("retains a detached policy connection until the main realm is restored", async () => {
//   const { cleanup, page } = fixture();
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
//   mocks.policyEvent?.({
//     method: "Target.detachedFromTarget",
//     params: { sessionId: "policy-session" },
//   });
//   page.evaluate
//     .mockResolvedValueOnce(undefined)
//     .mockResolvedValueOnce("policy_owned")
//     .mockResolvedValueOnce(null);
//
//   await expect(session.close(true)).rejects.toThrow(
//     "service-worker policy restoration could not be confirmed",
//   );
//   expect(cleanup.close).not.toHaveBeenCalled();
//   expect(mocks.policyTransportClose).not.toHaveBeenCalled();
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(page.evaluate).toHaveBeenCalledWith("globalThis.stop()");
//   expect(
//     page.evaluate.mock.calls.filter(
//       ([script]) => script === "globalThis.stop()",
//     ),
//   ).toHaveLength(1);
//   expect(mocks.policyTransportClose).toHaveBeenCalledTimes(1);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("uses browser disconnect as terminal storage release after detach failure", async () => {
//   const { cleanup, storage } = fixture();
//   const detachFailure = new Error("CDP detach rejected");
//   storage.close.mockRejectedValueOnce(detachFailure);
//   const session = await PlaywrightScenarioSession.open(scenario, {}, {});
//
//   await expect(session.close()).resolves.toBe("terminated-owned-process");
//   expect(storage.close).toHaveBeenCalledTimes(1);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
//   expect(mocks.finishEvents).toHaveBeenCalledTimes(1);
//   await expect(session.close()).resolves.toBe("terminated-owned-process");
//   expect(storage.close).toHaveBeenCalledTimes(1);
// });
//
// it("leaves attached service-worker state alone when the policy allows it", async () => {
//   const { cleanup, page } = fixture();
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
export const _l = 236;
