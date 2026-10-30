export const __stub = 1;
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//   });
//   const session = await PlaywrightScenarioSession.open(attached, {}, {});
//   mocks.policySend.mockRejectedValueOnce(policyFailure);
//
//   await expect(session.close(true)).rejects.toMatchObject({
//     errors: [policyFailure, storageFailure],
//   });
//   expect(cleanup.close).not.toHaveBeenCalled();
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(storage?.close).toHaveBeenCalledWith(true);
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Page.stopLoading",
//     ),
//   ).toHaveLength(2);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("transfers a late stop request after storage has already released", async () => {
//   const { cleanup, storage } = fixture();
//   const cancellation = new AbortController();
//   storage?.close.mockResolvedValue({ loadingStopped: false });
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//   });
//   const session = await PlaywrightScenarioSession.open(
//     attached,
//     {},
//     {
//       signal: cancellation.signal,
//     },
//   );
//   const restorationFailure = new Error("registration restoration failed");
//   let failRestoration = true;
//   mocks.policySend.mockImplementation(async (method: string) => {
//     if (method === "Runtime.evaluate" && failRestoration) {
//       failRestoration = false;
//       throw restorationFailure;
//     }
//     return policyResponse(method);
//   });
//
//   await expect(session.close(false)).rejects.toBe(restorationFailure);
//   expect(cleanup.close).not.toHaveBeenCalled();
//   cancellation.abort();
//   await expect(session.close()).resolves.toBe("disconnected-external");
//   expect(storage?.close.mock.calls).toEqual([[false], [true]]);
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Page.stopLoading",
//     ),
//   ).toHaveLength(1);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("retains transferred navigation stopping after setup cleanup fails", async () => {
//   const { cleanup, storage } = fixture();
//   const cancellation = new AbortController();
//   const setupFailure = new Error("storage initialization failed");
//   storage?.initialize.mockImplementationOnce(async () => {
//     cancellation.abort();
//     throw setupFailure;
//   });
//   storage?.close.mockRejectedValueOnce(new Error("storage stop unconfirmed"));
//   const policyFailure = new Error("policy stop unconfirmed");
//   let failPolicyStop = true;
//   mocks.policySend.mockImplementation(async (method: string) => {
//     if (method === "Page.stopLoading" && failPolicyStop) {
//       failPolicyStop = false;
//       throw policyFailure;
//     }
//     return policyResponse(method);
//   });
//   let retainedCleanup: (() => Promise<unknown>) | undefined;
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
//     PlaywrightScenarioSession.open(
//       attached,
//       {},
//       {
//         signal: cancellation.signal,
//         retainCleanup: (close) => {
//           retainedCleanup = close;
//         },
//       },
//     ),
//   ).rejects.toBeInstanceOf(AggregateError);
//   expect(cleanup.close).not.toHaveBeenCalled();
//   if (retainedCleanup === undefined)
//     throw new Error("failed cleanup was not retained");
//   await expect(retainedCleanup()).resolves.toBeUndefined();
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Page.stopLoading",
//     ),
//   ).toHaveLength(2);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("allows the bounded policy cleanup chain to cross one second", async () => {
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
//   let releaseStop: () => void = () => undefined;
//   let stopStarted: () => void = () => undefined;
//   const stopped = new Promise<void>((resolve) => {
//     releaseStop = resolve;
//   });
//   const started = new Promise<void>((resolve) => {
//     stopStarted = resolve;
//   });
//   mocks.policySend.mockImplementation(async (method: string) => {
//     if (method === "Page.stopLoading") {
//       stopStarted();
//       await stopped;
//     }
//     return policyResponse(method);
//   });
//
//   vi.useFakeTimers();
//   try {
//     let settled = false;
//     const closing = session.close(true).then(
//       () => {
//         settled = true;
//         return { ok: true as const };
//       },
//       (cause: unknown) => {
//         settled = true;
//         return { ok: false as const, cause };
//       },
//     );
//     await started;
//     await vi.advanceTimersByTimeAsync(1_100);
//     expect(settled).toBe(false);
//     releaseStop();
//     await expect(closing).resolves.toEqual({ ok: true });
//   } finally {
//     vi.useRealTimers();
//   }
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("does not await policy initialization after its child target detaches", async () => {
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
//   let childStarted: () => void = () => undefined;
//   let releaseChild: () => void = () => undefined;
//   const started = new Promise<void>((resolve) => {
//     childStarted = resolve;
//   });
//   const held = new Promise<void>((resolve) => {
//     releaseChild = resolve;
//   });
//   mocks.policySend.mockImplementation(
//     async (method: string, _params: unknown, target: string) => {
//       if (method === "Page.enable" && target === "child-session") {
//         childStarted();
//         await held;
//       }
//       return policyResponse(method);
//     },
//   );
//   mocks.policyEvent?.({
//     method: "Target.attachedToTarget",
//     params: {
//       sessionId: "child-session",
//       targetInfo: { type: "iframe" },
//     },
//     sessionId: "policy-session",
//   });
//   await started;
//   const closing = session.close();
//   mocks.policyEvent?.({
//     method: "Target.detachedFromTarget",
//     params: { sessionId: "child-session" },
//   });
//   try {
//     await expect(closing).resolves.toBe("disconnected-external");
//   } finally {
//     releaseChild();
//   }
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("skips policy restoration for a child without a committed document", async () => {
//   const { cleanup, page } = fixture();
//   mocks.storage = undefined;
//   const pendingChild = {
//     url: () => "",
//     isDetached: () => false,
//     evaluate: vi.fn(() => new Promise(() => undefined)),
//   };
export const _l = 236;
