export const __stub = 1;
//   waiter.resolve(createAttachedScenarioRelease(key, admission));
// };
//
// const createAttachedScenarioRelease = (
//   key: string,
//   admission: AttachedScenarioAdmission,
// ): (() => void) => {
//   let released = false;
//   return () => {
//     if (released) return;
//     released = true;
//     releaseAttachedScenario(key, admission);
//   };
// };
//
// /** One browser admission. The key is the discovery URL this endpoint already parses. */
// export const attachedScenarioLeaseKey = (
//   endpoint: string,
//   targetId: string,
// ): string => {
//   const discovery = new URL("/json/version", endpoint);
//   // One CDP browser serves every loopback stack on one port, so spellings that
//   // reach it through 127.0.0.1 or ::1 must share a single admission.
//   if (isLiteralLoopbackHostname(discovery.hostname))
//     discovery.hostname = "127.0.0.1";
//   return JSON.stringify([discovery.href, targetId]);
// };
//
// const acquireAttachedScenario = (
//   scenario: Extract<BrowserScenario["browser"], { readonly mode: "connect" }>,
//   signal: AbortSignal | undefined,
// ): Promise<AttachedScenarioLease> => {
//   if (signal?.aborted === true)
//     return Promise.reject(new BrowserObservationError(OPERATION, "cancelled"));
//
//   const key = attachedScenarioLeaseKey(
//     scenario.cdp_endpoint,
//     scenario.target_id,
//   );
//   const admission =
//     attachedScenarioAdmissions.get(key) ??
//     ({
//       active: false,
//       waiters: [],
//       cleanupOwner: undefined,
//     } satisfies AttachedScenarioAdmission);
//   attachedScenarioAdmissions.set(key, admission);
//
//   return new Promise((resolve, reject) => {
//     const grant = (release: () => void): void =>
//       resolve({ admission, release });
//     if (!admission.active) {
//       admission.active = true;
//       grant(createAttachedScenarioRelease(key, admission));
//       return;
//     }
//
//     const waiter: AttachedScenarioWaiter = {
//       signal,
//       resolve: (release) => grant(release),
//       reject,
//       onAbort: undefined,
//     };
//     admission.waiters.push(waiter);
//     if (signal !== undefined) {
//       const onAbort = (): void => {
//         const index = admission.waiters.indexOf(waiter);
//         if (index < 0) return;
//         admission.waiters.splice(index, 1);
//         signal.removeEventListener("abort", onAbort);
//         reject(new BrowserObservationError(OPERATION, "cancelled"));
//         if (!admission.active && admission.waiters.length === 0)
//           releaseAttachedScenario(key, admission);
//       };
//       waiter.onAbort = onAbort;
//       signal.addEventListener("abort", onAbort, { once: true });
//       if (signal.aborted) {
//         onAbort();
//         return;
//       }
//     }
//   });
// };
//
// const allowedBrowserEnvironment = (
//   environment: Readonly<Record<string, string | undefined>>,
// ): Record<string, string | undefined> => {
//   const allowed = [
//     "DBUS_SESSION_BUS_ADDRESS",
//     "DISPLAY",
//     "HOME",
//     "LANG",
//     "LD_LIBRARY_PATH",
//     "PATH",
//     "SystemRoot",
//     "TEMP",
//     "TMP",
//     "TMPDIR",
//     "WAYLAND_DISPLAY",
//     "XAUTHORITY",
//     "XDG_RUNTIME_DIR",
//   ];
//   const selected = Object.fromEntries(
//     allowed
//       .map((name) => [name, environment[name]] as const)
//       .filter(
//         (entry): entry is readonly [string, string] => entry[1] !== undefined,
//       ),
//   );
//   if (process.platform !== "android") return selected;
//
//   // Android rejects execve() for binaries below Termux's application data
//   // directory. Termux supplies an exec interceptor that rewrites those calls
//   // through the system linker and removes itself for the launched program.
//   // Playwright must retain it for its Chromium child process.
//   const prefix = environment.PREFIX;
//   if (prefix === undefined) return selected;
//   return {
//     ...selected,
//     LD_PRELOAD: `${prefix}/lib/libtermux-exec.so`,
//     TERMUX_EXEC__PROC_SELF_EXE: process.execPath,
//   };
// };
// const findConnectedPage = async (
//   browser: Pick<Browser, "contexts">,
//   targetId: string,
//   signal: AbortSignal | undefined,
// ): Promise<{ readonly context: BrowserContext; readonly page: Page }> => {
//   for (const context of browser.contexts())
//     for (const page of context.pages()) {
//       const session = await context.newCDPSession(page);
//       try {
//         throwIfScenarioCancelled(signal);
//         const { targetInfo } = await session.send("Target.getTargetInfo");
//         throwIfScenarioCancelled(signal);
//         if (targetInfo.targetId !== targetId) continue;
//         return { context, page };
//       } finally {
//         await session.detach();
//       }
//     }
//   throw new BrowserObservationError(OPERATION, "target_not_found");
// };
//
// /** Owns the target state changed while one scenario uses an attached page. */
// class AttachedScenarioEnvironmentOwner {
//   #mediaOverride = false;
//   #deviceMetricsOverride = false;
//   #localeOverride = false;
//   #timezoneOverride = false;
//   #detached = false;
//   #application: Promise<void> | undefined;
//
//   private constructor(
//     private readonly page: Page,
//     private readonly session: CDPSession,
//   ) {}
//
//   static async create(
//     context: BrowserContext,
//     page: Page,
//   ): Promise<AttachedScenarioEnvironmentOwner> {
//     return new AttachedScenarioEnvironmentOwner(
//       page,
//       await context.newCDPSession(page),
//     );
//   }
//
//   get restored(): boolean {
//     return (
//       !this.#mediaOverride &&
//       !this.#deviceMetricsOverride &&
//       !this.#localeOverride &&
//       !this.#timezoneOverride
//     );
//   }
//
//   get targetClosed(): boolean {
export const _l = 178;
