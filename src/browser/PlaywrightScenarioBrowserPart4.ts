export const __stub = 1;
//           const ownedEnvironment = environmentOwner;
//           if (ownedEnvironment !== undefined) {
//             try {
//               await ownedEnvironment.close();
//               environmentOwner = undefined;
//             } catch (cause: unknown) {
//               environmentFailure = cause;
//               const browserConnected = browser.isConnected();
//               if (ownedEnvironment.targetClosed || !browserConnected) {
//                 // A destroyed target has no remaining emulation state. A lost
//                 // transport cannot be retained or retried; release its local
//                 // owner so later discovery can establish current target state.
//                 environmentOwner = undefined;
//                 if (!browserConnected) return;
//               } else if (!ownedEnvironment.restored) {
//                 // Keep the live transport and target session for a cleanup
//                 // retry while any target override remains.
//                 throw cause;
//               }
//             }
//           }
//           try {
//             await browser.close();
//             // Once target state is restored, disconnecting the transport is a
//             // definitive fallback for an explicit session detach failure.
//             environmentOwner = undefined;
//           } catch (browserFailure: unknown) {
//             if (environmentFailure !== undefined)
//               throw new AggregateError(
//                 [environmentFailure, browserFailure],
//                 "Attached browser environment cleanup failed",
//               );
//             throw browserFailure;
//           }
//         },
//         onSettled: (browserClosed) => {
//           if (browserClosed && lease.admission.cleanupOwner === cleanup)
//             lease.admission.cleanupOwner = undefined;
//           lease.release();
//         },
//         removeProfile: undefined,
//       });
//     cleanupOwner = cleanup;
//     lease.admission.cleanupOwner = cleanup;
//     throwIfScenarioCancelled(signal);
//     const target = await withPlaywrightExecutionBoundary(
//       () => findConnectedPage(browser, browserRequest.target_id, signal),
//       undefined,
//       signal,
//     );
//     throwIfScenarioCancelled(signal);
//     const configuredEnvironment = await withPlaywrightExecutionBoundary(
//       () =>
//         AttachedScenarioEnvironmentOwner.create(target.context, target.page),
//       undefined,
//       signal,
//     );
//     environmentOwner = configuredEnvironment;
//     await withPlaywrightExecutionBoundary(
//       () => configuredEnvironment.apply(environment, signal),
//       undefined,
//       signal,
//     );
//     return {
//       ...target,
//       browser,
//       profilePath: undefined,
//       cleanup,
//     };
//   } catch (cause: unknown) {
//     if (cleanupOwner === undefined) {
//       lease.release();
//       throw cause;
//     }
//     const cleanup = cleanupOwner;
//     const close = () => cleanup.close();
//     try {
//       return await failBrowserScenarioOperation(close, cause);
//     } catch (failure: unknown) {
//       if (failure !== cause) retainCleanup?.(close);
//       throw failure;
//     }
//   }
// };
//
// /** Launch or attach using the caller-selected environment and browser engine. */
// export const openPlaywrightScenarioBrowser = async (
//   scenario: BrowserScenario,
//   environment: Readonly<Record<string, string | undefined>>,
//   options: {
//     readonly launcher?: ScenarioBrowserLauncher;
//     readonly signal?: AbortSignal | undefined;
//     readonly retainCleanup?: (close: () => Promise<unknown>) => void;
//   } = {},
// ): Promise<OpenedScenarioBrowser> => {
//   // Load Playwright only when a scenario opens; MCP startup stays off its module graph.
//   const launcher =
//     options.launcher ?? (await import("playwright-core")).chromium;
//   if (scenario.browser.mode === "connect")
//     return openAttachedScenarioBrowser(
//       scenario.browser,
//       scenario.environment,
//       launcher,
//       options.signal,
//       options.retainCleanup,
//     );
//
//   const profilePath = await mkdtemp(join(tmpdir(), "rea-browser-scenario-"));
//   let context: BrowserContext;
//   try {
//     await chmod(profilePath, 0o700);
//     context = await launcher.launchPersistentContext(profilePath, {
//       executablePath: resolve(scenario.browser.executable_path),
//       headless: scenario.browser.headless,
//       acceptDownloads: false,
//       viewport: {
//         width: scenario.environment.viewport.width,
//         height: scenario.environment.viewport.height,
//       },
//       deviceScaleFactor: scenario.environment.viewport.device_scale_factor,
//       locale: scenario.environment.locale,
//       timezoneId: scenario.environment.timezone,
//       colorScheme: scenario.environment.color_scheme,
//       reducedMotion: scenario.environment.reduced_motion,
//       serviceWorkers: scenario.environment.service_workers,
//       env: allowedBrowserEnvironment(environment),
//       handleSIGHUP: false,
//       handleSIGINT: false,
//       handleSIGTERM: false,
//       timeout: 0,
//       // Termux's Chromium cannot create its renderer process through Android's
//       // executable boundary. Single-process mode keeps the browser and page in
//       // the Termux-launched process so scenario navigation remains available.
//       args:
//         process.platform === "android"
//           ? ["--no-sandbox", "--single-process"]
//           : [],
//     });
//   } catch (cause: unknown) {
//     const cleanup = () =>
//       rm(profilePath, { recursive: true, force: true, maxRetries: 3 });
//     try {
//       return await failBrowserScenarioOperation(cleanup, cause, [
//         "browser_profile",
//       ]);
//     } catch (failure: unknown) {
//       if (failure !== cause) options.retainCleanup?.(cleanup);
//       throw failure;
//     }
//   }
//   const cleanup = new PlaywrightScenarioBrowserCleanupOwner({
//     closeBrowser: () => context.close(),
//     removeProfile: () =>
//       rm(profilePath, { recursive: true, force: true, maxRetries: 3 }),
//   });
//   try {
//     const browser = context.browser();
//     if (browser === null)
//       throw new BrowserObservationError(OPERATION, "protocol_error");
//     const page = context.pages()[0] ?? (await context.newPage());
//     return {
//       context,
//       page,
//       browser,
//       profilePath,
//       cleanup,
//     };
//   } catch (cause: unknown) {
//     const close = () => cleanup.close();
//     try {
//       return await failBrowserScenarioOperation(close, cause);
//     } catch (failure: unknown) {
//       if (failure !== cause) options.retainCleanup?.(close);
//       throw failure;
//     }
//   }
// };
export const _l = 177;
