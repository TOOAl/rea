export const __stub = 1;
//     },
//     emulateMedia: async (options) => {
//       if (options?.colorScheme === null) cleanupOrder.push("media");
//     },
//     detach: async () => {
//       cleanupOrder.push("session");
//     },
//     closeBrowser: async () => {
//       cleanupOrder.push("browser");
//     },
//   });
//   const opened = await fixture.open();
//   await opened.cleanup.close();
//
//   expect(fixture.environmentSession.send).toHaveBeenCalledWith(
//     "Emulation.setLocaleOverride",
//     { locale: "en-US" },
//   );
//   expect(fixture.environmentSession.send).toHaveBeenCalledWith(
//     "Emulation.setLocaleOverride",
//     { locale: "" },
//   );
//   expect(fixture.environmentSession.send).toHaveBeenCalledWith(
//     "Emulation.setTimezoneOverride",
//     { timezoneId: "" },
//   );
//   expect(fixture.environmentSession.send).toHaveBeenCalledWith(
//     "Emulation.clearDeviceMetricsOverride",
//   );
//   expect(fixture.page.emulateMedia).toHaveBeenLastCalledWith({
//     colorScheme: null,
//     reducedMotion: null,
//   });
//   expect(fixture.environmentSession.detach).toHaveBeenCalledOnce();
//   expect(fixture.browser.close).toHaveBeenCalledOnce();
//   expect(cleanupOrder).toEqual([
//     "timezone",
//     "locale",
//     "device-metrics",
//     "media",
//     "session",
//     "browser",
//   ]);
// });
//
// it("retains attached environment ownership until a failed reset can be retried", async () => {
//   let localeResetAttempts = 0;
//   const fixture = attachedBrowserFixture({
//     send: async (method, parameters) => {
//       if (
//         method === "Emulation.setLocaleOverride" &&
//         (parameters as { locale?: string }).locale === ""
//       ) {
//         localeResetAttempts += 1;
//         if (localeResetAttempts === 1) throw new Error("reset interrupted");
//       }
//     },
//   });
//   const opened = await fixture.open();
//
//   await expect(opened.cleanup.close()).rejects.toMatchObject({
//     reason: "cleanup_failed",
//     cleanup: { reason: "reset interrupted" },
//   });
//   expect(fixture.browser.close).not.toHaveBeenCalled();
//   expect(fixture.environmentSession.detach).not.toHaveBeenCalled();
//
//   await opened.cleanup.close();
//   expect(localeResetAttempts).toBe(2);
//   expect(fixture.environmentSession.detach).toHaveBeenCalledOnce();
//   expect(fixture.browser.close).toHaveBeenCalledOnce();
// });
//
// it("does not clear an attached environment override it failed to acquire", async () => {
//   const fixture = attachedBrowserFixture({
//     send: async (method, parameters) => {
//       if (
//         method === "Emulation.setLocaleOverride" &&
//         (parameters as { locale?: string }).locale === "en-US"
//       )
//         throw new Error("caller already owns locale");
//     },
//   });
//
//   await expect(fixture.open()).rejects.toThrow("caller already owns locale");
//   expect(fixture.environmentSession.send).not.toHaveBeenCalledWith(
//     "Emulation.setLocaleOverride",
//     { locale: "" },
//   );
//   expect(fixture.environmentSession.send).toHaveBeenCalledWith(
//     "Emulation.clearDeviceMetricsOverride",
//   );
//   expect(fixture.environmentSession.detach).toHaveBeenCalledOnce();
//   expect(fixture.browser.close).toHaveBeenCalledOnce();
// });
//
// it("waits for a cancelled environment mutation before restoring it", async () => {
//   const localeStarted = deferred<void>();
//   const localeResult = deferred<void>();
//   const fixture = attachedBrowserFixture({
//     send: async (method, parameters) => {
//       if (
//         method === "Emulation.setLocaleOverride" &&
//         (parameters as { locale?: string }).locale === "en-US"
//       ) {
//         localeStarted.resolve(undefined);
//         await localeResult.promise;
//       }
//     },
//   });
//   const controller = new AbortController();
//   const opening = fixture.open(controller.signal);
//   await localeStarted.promise;
//   const cancelled = expect(opening).rejects.toMatchObject({
//     _tag: "AnalysisCancelledError",
//   });
//   controller.abort();
//   await new Promise((resolve) => setImmediate(resolve));
//   expect(fixture.environmentSession.send).not.toHaveBeenCalledWith(
//     "Emulation.setLocaleOverride",
//     { locale: "" },
//   );
//
//   localeResult.resolve(undefined);
//   await cancelled;
//   expect(fixture.environmentSession.send).toHaveBeenCalledWith(
//     "Emulation.setLocaleOverride",
//     { locale: "" },
//   );
//   expect(fixture.environmentSession.detach).toHaveBeenCalledOnce();
//   expect(fixture.browser.close).toHaveBeenCalledOnce();
// });
//
// it("releases cleanup ownership when the attached target is destroyed", async () => {
//   let targetClosed = false;
//   const fixture = attachedBrowserFixture({
//     send: async (method, parameters) => {
//       if (
//         targetClosed &&
//         method === "Emulation.setTimezoneOverride" &&
//         (parameters as { timezoneId?: string }).timezoneId === ""
//       )
//         throw new Error("Target closed");
//     },
//     isTargetClosed: () => targetClosed,
//   });
//   const opened = await fixture.open();
//   targetClosed = true;
//
//   await opened.cleanup.close();
//   expect(fixture.browser.close).toHaveBeenCalledOnce();
// });
//
// it("releases cleanup ownership when the attached browser disconnects", async () => {
//   let connected = true;
//   const fixture = attachedBrowserFixture({
//     send: async (method, parameters) => {
//       if (
//         !connected &&
//         method === "Emulation.setTimezoneOverride" &&
//         (parameters as { timezoneId?: string }).timezoneId === ""
//       )
//         throw new Error("Browser disconnected");
//     },
//     isBrowserConnected: () => connected,
//   });
//   const opened = await fixture.open();
//   connected = false;
//
//   await opened.cleanup.close();
export const _l = 170;
