export const __stub = 1;
//   expect(fixture.browser.close).not.toHaveBeenCalled();
// });
//
// it("cancels same-target queued connection before acquiring a browser", async () => {
//   const makeScenario = (targetId: string) =>
//     browserScenarioSchema.parse({
//       browser: {
//         mode: "connect",
//         cdp_endpoint: "http://127.0.0.1:9222",
//         target_id: targetId,
//       },
//       start_url: { url: "https://example.test" },
//       actions: [
//         {
//           step_id: "wait",
//           action: "wait_for_timeout",
//           duration_ms: 1,
//         },
//       ],
//     });
//   let rejectFirst: ((cause: Error) => void) | undefined;
//   const firstConnection = new Promise<never>((_resolve, reject) => {
//     rejectFirst = reject;
//   });
//   let resolveFirstStarted: (() => void) | undefined;
//   const firstStarted = new Promise<void>((resolve) => {
//     resolveFirstStarted = resolve;
//   });
//   const endpoints: string[] = [];
//   const connectOverCDP = vi.fn((endpoint: string) => {
//     endpoints.push(endpoint);
//     if (endpoints.length === 1) {
//       resolveFirstStarted?.();
//       return firstConnection;
//     }
//     return Promise.reject(new Error("connection failed"));
//   });
//   const launchPersistentContext = vi.fn(async () => {
//     throw new Error("launch boundary reached");
//   });
//   const launcher = { connectOverCDP, launchPersistentContext };
//   const environment = {};
//   const first = openPlaywrightScenarioBrowser(
//     makeScenario("page-1"),
//     environment,
//     { launcher },
//   );
//   await firstStarted;
//   expect(connectOverCDP).toHaveBeenCalledTimes(1);
//
//   const controller = new AbortController();
//   const removeAbort = vi.spyOn(controller.signal, "removeEventListener");
//   const queued = openPlaywrightScenarioBrowser(
//     makeScenario("page-1"),
//     environment,
//     { launcher, signal: controller.signal },
//   );
//   controller.abort();
//   await expect(queued).rejects.toMatchObject({
//     _tag: "BrowserObservationError",
//     reason: "cancelled",
//   });
//   expect(connectOverCDP).toHaveBeenCalledTimes(1);
//   expect(removeAbort).toHaveBeenCalledWith("abort", expect.any(Function));
//
//   await expect(
//     openPlaywrightScenarioBrowser(makeScenario("page-2"), environment, {
//       launcher,
//     }),
//   ).rejects.toThrow("connection failed");
//   expect(connectOverCDP).toHaveBeenCalledTimes(2);
//
//   const launch = browserScenarioSchema.parse({
//     browser: { mode: "launch", executable_path: process.execPath },
//     start_url: { url: "https://example.test" },
//     actions: [{ step_id: "wait", action: "wait_for_timeout", duration_ms: 1 }],
//   });
//   await expect(
//     openPlaywrightScenarioBrowser(launch, environment, { launcher }),
//   ).rejects.toThrow("launch boundary reached");
//   expect(launchPersistentContext).toHaveBeenCalledTimes(1);
//
//   if (rejectFirst === undefined)
//     throw new Error("first connection did not begin");
//   rejectFirst(new Error("first connection failed"));
//   await expect(first).rejects.toThrow("first connection failed");
//   await expect(
//     openPlaywrightScenarioBrowser(makeScenario("page-1"), environment, {
//       launcher,
//     }),
//   ).rejects.toThrow("connection failed");
//   expect(connectOverCDP).toHaveBeenCalledTimes(3);
// });
//
// it("serializes concurrent attach across loopback spellings of one browser", async () => {
//   const makeScenario = (endpoint: string) =>
//     browserScenarioSchema.parse({
//       browser: { mode: "connect", cdp_endpoint: endpoint, target_id: "page-1" },
//       start_url: { url: "https://example.test" },
//       actions: [
//         {
//           step_id: "wait",
//           action: "wait_for_timeout",
//           duration_ms: 1,
//         },
//       ],
//     });
//   const firstConnection =
//     deferred<Pick<Browser, "contexts" | "close" | "isConnected" | "version">>();
//   let rejectFirstConnection: ((cause: Error) => void) | undefined;
//   const failingConnection = new Promise<never>((_resolve, reject) => {
//     rejectFirstConnection = reject;
//   });
//   const firstStarted = deferred<void>();
//   const endpoints: string[] = [];
//   const connectOverCDP = vi.fn((endpoint: string) => {
//     endpoints.push(endpoint);
//     if (endpoints.length === 1) {
//       firstStarted.resolve(undefined);
//       return firstConnection.promise;
//     }
//     return failingConnection;
//   });
//   const launcher = {
//     connectOverCDP,
//     launchPersistentContext: async () => {
//       throw new Error("Unexpected launch");
//     },
//   };
//
//   const first = openPlaywrightScenarioBrowser(
//     makeScenario("http://127.0.0.1:9222"),
//     {},
//     { launcher },
//   );
//   await firstStarted.promise;
//
//   const second = openPlaywrightScenarioBrowser(
//     makeScenario("http://[::1]:9222"),
//     {},
//     { launcher },
//   );
//   const race = await Promise.race([
//     second.then(
//       () => "settled" as const,
//       () => "settled" as const,
//     ),
//     new Promise((resolve) => setTimeout(() => resolve("queued"), 100)),
//   ]);
//   // The loopback spelling is the same browser, so the second attach must wait
//   // for the lease instead of dialing in parallel and being rejected.
//   expect(race).toBe("queued");
//   expect(connectOverCDP).toHaveBeenCalledTimes(1);
//
//   firstConnection.resolve({
//     close: vi.fn(async () => undefined),
//     contexts: vi.fn(() => []),
//     isConnected: vi.fn(() => true),
//     version: () => "fixture",
//   });
//   await expect(first).rejects.toThrow();
//   if (rejectFirstConnection === undefined)
//     throw new Error("second connection did not begin");
//   rejectFirstConnection(new Error("second connection failed"));
//   await expect(second).rejects.toThrow("second connection failed");
//   expect(endpoints).toEqual(["http://127.0.0.1:9222", "http://[::1]:9222"]);
// });
export const _l = 167;
