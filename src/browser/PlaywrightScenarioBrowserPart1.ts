export const __stub = 1;
// import { chmod, mkdtemp, rm } from "node:fs/promises";
// import { tmpdir } from "node:os";
// import { join, resolve } from "node:path";
//
// import type {
//   Browser,
//   BrowserContext,
//   CDPSession,
//   Page,
//   chromium,
// } from "playwright-core";
//
// import type { BrowserScenario } from "../domain/browserScenario.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { isLiteralLoopbackHostname } from "../domain/browserObservation.js";
// import { BrowserObservationError } from "../domain/browserObservationError.js";
// import { withPlaywrightExecutionBoundary } from "./PlaywrightExecutionBoundary.js";
//
// const OPERATION = "capture_browser_scenario" as const;
// // Closing a real Chrome persistent context can take several seconds even when
// // it succeeds. The shorter operation deadline must not misreport cleanup.
// const CLEANUP_CONFIRMATION_TIMEOUT_MS = 30_000;
//
// const throwIfScenarioCancelled = (signal: AbortSignal | undefined): void => {
//   if (signal?.aborted === true)
//     throw new BrowserObservationError(OPERATION, "cancelled");
// };
//
// export interface OpenedScenarioBrowser {
//   readonly context: BrowserContext;
//   readonly page: Page;
//   readonly browser: Pick<Browser, "contexts" | "close" | "version">;
//   readonly profilePath: string | undefined;
//   readonly cleanup: PlaywrightScenarioBrowserCleanupOwner;
// }
//
// /** Provider actions retained until the owned browser and profile are released. */
// interface PlaywrightScenarioCleanupResources {
//   readonly closeBrowser: () => Promise<void>;
//   readonly removeProfile: (() => Promise<void>) | undefined;
//   readonly onSettled?: (browserClosed: boolean) => void;
// }
//
// /** Owns one browser connection and optional private profile through cleanup retries. */
// export class PlaywrightScenarioBrowserCleanupOwner {
//   #browserClosed = false;
//   #profileRemoved: boolean;
//   #closePromise: Promise<void> | undefined;
//   #eventFinalizationPromise: Promise<void> | undefined;
//
//   /** Keep the narrow provider actions needed to release one opened browser. */
//   constructor(private readonly resources: PlaywrightScenarioCleanupResources) {
//     this.#profileRemoved = resources.removeProfile === undefined;
//   }
//
//   get browserClosed(): boolean {
//     return this.#browserClosed;
//   }
//
//   close(finishEvents?: () => Promise<void>): Promise<void> {
//     const cleanup = this.#closePromise ?? this.#closeResources(finishEvents);
//     if (this.#closePromise === undefined) {
//       this.#closePromise = cleanup;
//       void cleanup.then(
//         () => this.resources.onSettled?.(this.#browserClosed),
//         () => {
//           if (this.#closePromise === cleanup) this.#closePromise = undefined;
//           this.resources.onSettled?.(this.#browserClosed);
//         },
//       );
//     }
//     return this.#awaitCleanup(cleanup);
//   }
//
//   async #awaitCleanup(cleanup: Promise<void>): Promise<void> {
//     try {
//       await withPlaywrightExecutionBoundary(
//         () => cleanup,
//         CLEANUP_CONFIRMATION_TIMEOUT_MS,
//       );
//     } catch (cause: unknown) {
//       throw new BrowserObservationError(OPERATION, "cleanup_failed", {
//         cause,
//         cleanup: {
//           reason: cause instanceof Error ? cause.message : String(cause),
//           resources: [
//             "browser_transport",
//             ...(this.resources.removeProfile === undefined
//               ? []
//               : ["browser_profile"]),
//           ],
//         },
//       });
//     }
//   }
//
//   async #closeResources(finishEvents?: () => Promise<void>): Promise<void> {
//     const failures: unknown[] = [];
//     const eventFinalization = (this.#eventFinalizationPromise ??=
//       Promise.resolve().then(async () => {
//         await finishEvents?.();
//       }));
//     try {
//       await eventFinalization;
//     } catch (cause: unknown) {
//       // A failed finalization stays failed: the memoized attempt rejects on
//       // every retry so cleanup can never report success for unfinalized
//       // events.
//       failures.push(cause);
//     }
//     if (!this.#browserClosed) {
//       try {
//         await this.resources.closeBrowser();
//         this.#browserClosed = true;
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (
//       this.#browserClosed &&
//       !this.#profileRemoved &&
//       this.resources.removeProfile !== undefined
//     ) {
//       try {
//         await this.resources.removeProfile();
//         this.#profileRemoved = true;
//       } catch (cause: unknown) {
//         failures.push(cause);
//       }
//     }
//     if (failures.length === 1) throw failures[0];
//     if (failures.length > 1)
//       throw new AggregateError(failures, "Browser session cleanup failed");
//   }
// }
//
// interface AttachedScenarioWaiter {
//   readonly signal: AbortSignal | undefined;
//   readonly resolve: (release: () => void) => void;
//   readonly reject: (error: BrowserObservationError) => void;
//   onAbort: (() => void) | undefined;
// }
//
// interface AttachedScenarioAdmission {
//   active: boolean;
//   readonly waiters: AttachedScenarioWaiter[];
//   cleanupOwner: PlaywrightScenarioBrowserCleanupOwner | undefined;
// }
//
// interface AttachedScenarioLease {
//   readonly admission: AttachedScenarioAdmission;
//   readonly release: () => void;
// }
//
// const attachedScenarioAdmissions = new Map<string, AttachedScenarioAdmission>();
//
// const releaseAttachedScenario = (
//   key: string,
//   admission: AttachedScenarioAdmission,
// ): void => {
//   const waiter = admission.waiters.shift();
//   if (waiter === undefined) {
//     admission.active = false;
//     if (
//       admission.cleanupOwner === undefined &&
//       attachedScenarioAdmissions.get(key) === admission
//     )
//       attachedScenarioAdmissions.delete(key);
//     return;
//   }
//
//   if (waiter.onAbort !== undefined)
//     waiter.signal?.removeEventListener("abort", waiter.onAbort);
//   if (waiter.signal?.aborted === true) {
//     waiter.reject(new BrowserObservationError(OPERATION, "cancelled"));
//     releaseAttachedScenario(key, admission);
//     return;
//   }
export const _l = 178;
