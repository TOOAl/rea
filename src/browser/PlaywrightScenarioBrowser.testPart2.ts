export const __stub = 1;
//     version: () => "fixture",
//   };
//   const controller = new AbortController();
//   const launcher = {
//     connectOverCDP: () => {
//       connectionStarted.resolve(undefined);
//       return connection.promise;
//     },
//     launchPersistentContext: async () => {
//       throw new Error("Unexpected launch");
//     },
//   };
//   const scenario = browserScenarioSchema.parse({
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "page-1",
//     },
//     start_url: { url: "https://example.test" },
//     actions: [{ step_id: "wait", action: "wait_for_timeout", duration_ms: 1 }],
//   });
//   const opening = openPlaywrightScenarioBrowser(
//     scenario,
//     {},
//     {
//       launcher,
//       signal: controller.signal,
//     },
//   );
//   await connectionStarted.promise;
//   controller.abort();
//   connection.resolve(connectedBrowser);
//
//   await expect(opening).rejects.toMatchObject({
//     _tag: "BrowserObservationError",
//     reason: "cancelled",
//   });
//   expect(connectedBrowser.contexts).not.toHaveBeenCalled();
//   expect(connectedBrowser.close).toHaveBeenCalledOnce();
// });
//
// it("closes an attached connection when cancellation starts target discovery", async () => {
//   const controller = new AbortController();
//   const connectedBrowser = {
//     close: vi.fn(async () => undefined),
//     contexts: vi.fn(() => {
//       controller.abort();
//       return [];
//     }),
//     isConnected: vi.fn(() => true),
//     version: () => "fixture",
//   };
//   const launcher = {
//     connectOverCDP: async () => connectedBrowser,
//     launchPersistentContext: async () => {
//       throw new Error("Unexpected launch");
//     },
//   };
//   const scenario = browserScenarioSchema.parse({
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "page-1",
//     },
//     start_url: { url: "https://example.test" },
//     actions: [{ step_id: "wait", action: "wait_for_timeout", duration_ms: 1 }],
//   });
//
//   await expect(
//     openPlaywrightScenarioBrowser(
//       scenario,
//       {},
//       {
//         launcher,
//         signal: controller.signal,
//       },
//     ),
//   ).rejects.toMatchObject({
//     _tag: "AnalysisCancelledError",
//   });
//   expect(connectedBrowser.contexts).toHaveBeenCalledOnce();
//   expect(connectedBrowser.close).toHaveBeenCalledOnce();
// });
//
// const attachedBrowserFixture = (
//   callbacks: {
//     readonly send?: (method: string, parameters?: unknown) => Promise<unknown>;
//     readonly emulateMedia?: (
//       options: Parameters<Page["emulateMedia"]>[0],
//     ) => Promise<void>;
//     readonly detach?: () => Promise<void>;
//     readonly closeBrowser?: () => Promise<void>;
//     readonly isTargetClosed?: () => boolean;
//     readonly isBrowserConnected?: () => boolean;
//   } = {},
// ) => {
//   const discoverySession = {
//     send: vi.fn(async () => ({ targetInfo: { targetId: "page-1" } })),
//     detach: vi.fn(async () => undefined),
//   } as unknown as CDPSession;
//   const environmentSession = {
//     send: vi.fn(callbacks.send ?? (async () => undefined)),
//     detach: vi.fn(callbacks.detach ?? (async () => undefined)),
//   } as unknown as CDPSession;
//   const page = {
//     emulateMedia: vi.fn(callbacks.emulateMedia ?? (async () => undefined)),
//     isClosed: vi.fn(callbacks.isTargetClosed ?? (() => false)),
//   } as unknown as Page;
//   const context = {
//     pages: () => [page],
//     newCDPSession: vi
//       .fn()
//       .mockResolvedValueOnce(discoverySession)
//       .mockResolvedValueOnce(environmentSession),
//   } as unknown as BrowserContext;
//   const browser = {
//     close: vi.fn(callbacks.closeBrowser ?? (async () => undefined)),
//     contexts: () => [context],
//     isConnected: vi.fn(callbacks.isBrowserConnected ?? (() => true)),
//     version: () => "fixture",
//   } as unknown as Pick<
//     Browser,
//     "contexts" | "close" | "isConnected" | "version"
//   >;
//   const scenario = browserScenarioSchema.parse({
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "page-1",
//     },
//     start_url: { url: "https://example.test" },
//     actions: [{ step_id: "wait", action: "wait_for_timeout", duration_ms: 1 }],
//   });
//   return {
//     browser,
//     environmentSession,
//     page,
//     open: (signal?: AbortSignal) =>
//       openPlaywrightScenarioBrowser(
//         scenario,
//         {},
//         {
//           launcher: {
//             connectOverCDP: async () => browser,
//             launchPersistentContext: async () => {
//               throw new Error("Unexpected launch");
//             },
//           },
//           signal,
//         },
//       ),
//   };
// };
//
// it("restores its environment overrides before releasing an attached browser", async () => {
//   const cleanupOrder: string[] = [];
//   const fixture = attachedBrowserFixture({
//     send: async (method, parameters) => {
//       if (
//         method === "Emulation.setTimezoneOverride" &&
//         (parameters as { timezoneId?: string }).timezoneId === ""
//       )
//         cleanupOrder.push("timezone");
//       if (
//         method === "Emulation.setLocaleOverride" &&
//         (parameters as { locale?: string }).locale === ""
//       )
//         cleanupOrder.push("locale");
//       if (method === "Emulation.clearDeviceMetricsOverride")
//         cleanupOrder.push("device-metrics");
export const _l = 170;
