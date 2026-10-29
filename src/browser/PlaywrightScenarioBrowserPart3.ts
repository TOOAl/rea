export const __stub = 1;
//     return this.page.isClosed();
//   }
//
//   apply(
//     environment: BrowserScenario["environment"],
//     signal: AbortSignal | undefined,
//   ): Promise<void> {
//     const application =
//       this.#application ?? this.#applyEnvironment(environment, signal);
//     this.#application = application;
//     return application;
//   }
//
//   async #applyEnvironment(
//     environment: BrowserScenario["environment"],
//     signal: AbortSignal | undefined,
//   ): Promise<void> {
//     await this.page.emulateMedia({
//       colorScheme: environment.color_scheme,
//       reducedMotion: environment.reduced_motion,
//     });
//     this.#mediaOverride = true;
//     throwIfScenarioCancelled(signal);
//
//     // setViewportSize also resizes the external browser window. CDP metrics
//     // provide the scenario viewport without changing that caller-owned window.
//     await this.session.send("Emulation.setDeviceMetricsOverride", {
//       width: environment.viewport.width,
//       height: environment.viewport.height,
//       deviceScaleFactor: environment.viewport.device_scale_factor,
//       mobile: false,
//       dontSetVisibleSize: true,
//     });
//     this.#deviceMetricsOverride = true;
//     throwIfScenarioCancelled(signal);
//
//     await this.session.send("Emulation.setLocaleOverride", {
//       locale: environment.locale,
//     });
//     this.#localeOverride = true;
//     throwIfScenarioCancelled(signal);
//
//     await this.session.send("Emulation.setTimezoneOverride", {
//       timezoneId: environment.timezone,
//     });
//     this.#timezoneOverride = true;
//     throwIfScenarioCancelled(signal);
//   }
//
//   async close(): Promise<void> {
//     if (this.#detached) return;
//     // The execution boundary can report cancellation before a pending CDP
//     // command settles. Wait for that producer so every successful mutation is
//     // recorded before deciding which state this owner must restore.
//     try {
//       await this.#application;
//     } catch {
//       // The operation path reports application failures. Cleanup still owns
//       // and restores every mutation that completed before the failure.
//     }
//     const failures: unknown[] = [];
//     if (this.#timezoneOverride) {
//       try {
//         await this.session.send("Emulation.setTimezoneOverride", {
//           timezoneId: "",
//         });
//         this.#timezoneOverride = false;
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (this.#localeOverride) {
//       try {
//         await this.session.send("Emulation.setLocaleOverride", { locale: "" });
//         this.#localeOverride = false;
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (this.#deviceMetricsOverride) {
//       try {
//         await this.session.send("Emulation.clearDeviceMetricsOverride");
//         this.#deviceMetricsOverride = false;
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (this.#mediaOverride) {
//       try {
//         await this.page.emulateMedia({
//           colorScheme: null,
//           reducedMotion: null,
//         });
//         this.#mediaOverride = false;
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (failures.length === 1) throw failures[0];
//     if (failures.length > 1)
//       throw new AggregateError(
//         failures,
//         "Attached browser environment restoration failed",
//       );
//     await this.session.detach();
//     this.#detached = true;
//   }
// }
//
// /** Preserve an operation failure while reporting any incomplete cleanup. */
// export const failBrowserScenarioOperation = async (
//   cleanup: () => Promise<void>,
//   primaryFailure: unknown,
//   fallbackCleanupResources: readonly string[] = ["browser_transport"],
// ): Promise<never> => {
//   try {
//     await cleanup();
//   } catch (cleanupFailure: unknown) {
//     const cleanupDetails =
//       cleanupFailure instanceof AnalysisError &&
//       cleanupFailure.cleanup !== undefined
//         ? cleanupFailure.cleanup
//         : {
//             reason:
//               cleanupFailure instanceof Error
//                 ? cleanupFailure.message
//                 : String(cleanupFailure),
//             resources:
//               cleanupFailure instanceof AnalysisError
//                 ? cleanupFailure.cleanupResources
//                 : fallbackCleanupResources,
//           };
//     throw new BrowserObservationError(OPERATION, "cleanup_failed", {
//       cause: new AggregateError(
//         [primaryFailure, cleanupFailure],
//         "Browser scenario operation and cleanup both failed",
//         { cause: primaryFailure },
//       ),
//       cleanup: cleanupDetails,
//     });
//   }
//   throw primaryFailure;
// };
//
// type ScenarioBrowserLauncher = Pick<
//   typeof chromium,
//   "launchPersistentContext"
// > & {
//   readonly connectOverCDP: (
//     endpoint: string,
//   ) => Promise<Pick<Browser, "contexts" | "close" | "isConnected" | "version">>;
// };
//
// type AttachedBrowserRequest = Extract<
//   BrowserScenario["browser"],
//   { readonly mode: "connect" }
// >;
//
// const openAttachedScenarioBrowser = async (
//   browserRequest: AttachedBrowserRequest,
//   environment: BrowserScenario["environment"],
//   launcher: ScenarioBrowserLauncher,
//   signal: AbortSignal | undefined,
//   retainCleanup: ((close: () => Promise<unknown>) => void) | undefined,
// ): Promise<OpenedScenarioBrowser> => {
//   const lease = await acquireAttachedScenario(browserRequest, signal);
//   let cleanupOwner: PlaywrightScenarioBrowserCleanupOwner | undefined;
//   let environmentOwner: AttachedScenarioEnvironmentOwner | undefined;
//   try {
//     const priorOwner = lease.admission.cleanupOwner;
//     if (priorOwner !== undefined) await priorOwner.close();
//     throwIfScenarioCancelled(signal);
//
//     const browser = await launcher.connectOverCDP(browserRequest.cdp_endpoint);
//     const cleanup: PlaywrightScenarioBrowserCleanupOwner =
//       new PlaywrightScenarioBrowserCleanupOwner({
//         closeBrowser: async () => {
//           let environmentFailure: unknown;
export const _l = 178;
