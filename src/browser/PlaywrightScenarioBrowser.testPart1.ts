export const __stub = 1;
// import { afterEach, expect, it, vi } from "vitest";
// import type {
//   Browser,
//   BrowserContext,
//   CDPSession,
//   Page,
// } from "playwright-core";
//
// import { browserScenarioSchema } from "../domain/browserScenario.js";
// import {
//   attachedScenarioLeaseKey,
//   openPlaywrightScenarioBrowser,
//   PlaywrightScenarioBrowserCleanupOwner,
// } from "./PlaywrightScenarioBrowser.js";
//
// const hostPlatform = process.platform;
//
// afterEach(() => {
//   vi.unstubAllEnvs();
//   Object.defineProperty(process, "platform", { value: hostPlatform });
// });
//
// it("locks one attached browser for spellings that discover the same endpoint", () => {
//   expect(attachedScenarioLeaseKey("http://127.0.0.1:9222", "page-1")).toBe(
//     attachedScenarioLeaseKey("http://127.0.0.1:9222/", "page-1"),
//   );
//   expect(attachedScenarioLeaseKey("http://127.0.0.1:9222", "page-1")).not.toBe(
//     attachedScenarioLeaseKey("http://127.0.0.1:9222", "page-2"),
//   );
// });
//
// it("locks one attached browser across loopback spellings of one endpoint", () => {
//   expect(attachedScenarioLeaseKey("http://127.0.0.1:9222", "page-1")).toBe(
//     attachedScenarioLeaseKey("http://[::1]:9222", "page-1"),
//   );
//   expect(attachedScenarioLeaseKey("http://[::1]:9222", "page-1")).not.toBe(
//     attachedScenarioLeaseKey("http://[::1]:9222", "page-2"),
//   );
//   expect(attachedScenarioLeaseKey("http://127.0.0.1:9222", "page-1")).not.toBe(
//     attachedScenarioLeaseKey("http://127.0.0.1:9223", "page-1"),
//   );
// });
//
// const deferred = <Value>() => {
//   let resolve: (value: Value | PromiseLike<Value>) => void = () => undefined;
//   const promise = new Promise<Value>((resolvePromise) => {
//     resolve = resolvePromise;
//   });
//   return { promise, resolve };
// };
//
// it("passes the selected environment to the actual browser launch boundary", async () => {
//   vi.stubEnv("LANG", "ambient-language");
//   const selected = {
//     LANG: "selected-language",
//     PATH: "/selected/bin",
//     REA_PRIVATE_VALUE: "not-a-launch-setting",
//   };
//   let launchedEnvironment: unknown;
//   const scenario = browserScenarioSchema.parse({
//     browser: { mode: "launch", executable_path: process.execPath },
//     start_url: { url: "https://example.test" },
//     actions: [
//       { step_id: "settle", action: "wait_for_timeout", duration_ms: 1 },
//     ],
//   });
//   await expect(
//     openPlaywrightScenarioBrowser(scenario, selected, {
//       launcher: {
//         connectOverCDP: async () => {
//           throw new Error("Unexpected connection");
//         },
//         launchPersistentContext: async (_profile, options) => {
//           launchedEnvironment = options?.env;
//           throw new Error("launch boundary reached");
//         },
//       },
//     }),
//   ).rejects.toThrow("launch boundary reached");
//   expect(launchedEnvironment).toEqual({
//     LANG: "selected-language",
//     PATH: "/selected/bin",
//   });
// });
//
// it("keeps Termux execution support when launching Chromium on Android", async () => {
//   Object.defineProperty(process, "platform", { value: "android" });
//   vi.stubEnv("PREFIX", "/data/data/com.termux/files/usr");
//   const selected = { LANG: "selected-language", PREFIX: process.env.PREFIX };
//   let launchOptions: Parameters<
//     typeof import("playwright-core").chromium.launchPersistentContext
//   >[1];
//   const scenario = browserScenarioSchema.parse({
//     browser: { mode: "launch", executable_path: process.execPath },
//     start_url: { url: "https://example.test" },
//     actions: [
//       { step_id: "settle", action: "wait_for_timeout", duration_ms: 1 },
//     ],
//   });
//
//   await expect(
//     openPlaywrightScenarioBrowser(scenario, selected, {
//       launcher: {
//         connectOverCDP: async () => {
//           throw new Error("Unexpected connection");
//         },
//         launchPersistentContext: async (_profile, options) => {
//           launchOptions = options;
//           throw new Error("launch boundary reached");
//         },
//       },
//     }),
//   ).rejects.toThrow("launch boundary reached");
//
//   expect(launchOptions?.args).toEqual(["--no-sandbox", "--single-process"]);
//   expect(launchOptions?.env).toEqual({
//     LANG: "selected-language",
//     LD_PRELOAD: "/data/data/com.termux/files/usr/lib/libtermux-exec.so",
//     TERMUX_EXEC__PROC_SELF_EXE: process.execPath,
//   });
// });
//
// it("keeps attached-target ownership after the cleanup response timeout", async () => {
//   vi.useFakeTimers();
//   try {
//     const closeStarted = deferred<void>();
//     const closeResult = deferred<void>();
//     const settled: boolean[] = [];
//     const cleanup = new PlaywrightScenarioBrowserCleanupOwner({
//       closeBrowser: () => {
//         closeStarted.resolve(undefined);
//         return closeResult.promise;
//       },
//       removeProfile: undefined,
//       onSettled: (browserClosed) => settled.push(browserClosed),
//     });
//     const timedOutClose = cleanup.close();
//     const timeoutExpectation = expect(timedOutClose).rejects.toMatchObject({
//       reason: "cleanup_failed",
//       cleanup: { reason: expect.stringContaining("timed out") },
//     });
//     await closeStarted.promise;
//     let responseSettled = false;
//     void timedOutClose
//       .finally(() => {
//         responseSettled = true;
//       })
//       .catch(() => {});
//     await vi.advanceTimersByTimeAsync(29_999);
//     expect(responseSettled).toBe(false);
//     await vi.advanceTimersByTimeAsync(1);
//     await timeoutExpectation;
//     expect(settled).toEqual([]);
//
//     closeResult.resolve(undefined);
//     await cleanup.close();
//     expect(settled).toEqual([true]);
//   } finally {
//     vi.useRealTimers();
//   }
// });
//
// it("does not configure a late attached connection after cancellation", async () => {
//   const connection =
//     deferred<Pick<Browser, "contexts" | "close" | "isConnected" | "version">>();
//   const connectionStarted = deferred<void>();
//   const connectedBrowser = {
//     close: vi.fn(async () => undefined),
//     contexts: vi.fn(() => []),
//     isConnected: vi.fn(() => true),
export const _l = 170;
