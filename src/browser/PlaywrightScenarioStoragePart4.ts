export const __stub = 1;
//           this.#replies.delete(id);
//         }
//       },
//     );
//     target.waitingForDebugger = true;
//     this.#targets.set(sessionId, target);
//     target.ready = (async () => {
//       try {
//         if (
//           !this.#closed &&
//           (targetInfo.type === "iframe" || targetInfo.type === "page")
//         )
//           await this.initializeTarget(target);
//       } catch (cause: unknown) {
//         if (
//           this.signal?.aborted !== true &&
//           !this.#closed &&
//           this.#targets.get(sessionId) === target
//         )
//           this.fail(cause);
//       }
//       if (this.#targets.get(sessionId) !== target) return;
//       try {
//         await withPlaywrightExecutionBoundary(
//           () => target.send("Runtime.runIfWaitingForDebugger"),
//           STORAGE_CLEANUP_TIMEOUT_MS,
//         );
//         target.waitingForDebugger = false;
//       } catch (cause: unknown) {
//         if (
//           this.signal?.aborted !== true &&
//           !this.#closed &&
//           this.#targets.get(sessionId) === target
//         )
//           this.fail(cause);
//       }
//     })();
//   }
//
//   private targetDetached(sessionId: string): void {
//     for (const [id, target] of this.#targets)
//       if (target.parentId === sessionId) this.targetDetached(id);
//     this.#targets.delete(sessionId);
//     for (const [id, reply] of this.#replies)
//       if (reply.sessionId === sessionId) {
//         this.#replies.delete(id);
//         reply.reject(
//           new BrowserObservationError(
//             "capture_browser_scenario",
//             "disconnected",
//           ),
//         );
//       }
//     this.#generation += 1;
//   }
//
//   async settle(): Promise<void> {
//     for (;;) {
//       const generation = this.#generation;
//       const work = this.#work;
//       const targets = [...this.#targets.entries()];
//       await withPlaywrightExecutionBoundary(
//         () => Promise.all(targets.map(([, target]) => target.ready)),
//         undefined,
//         this.signal,
//       );
//       await withPlaywrightExecutionBoundary(() => work, undefined, this.signal);
//       await Promise.resolve();
//       if (this.#failure !== undefined) throw this.#failure;
//       if (
//         generation === this.#generation &&
//         work === this.#work &&
//         targets.every(([id, target]) => this.#targets.get(id) === target)
//       )
//         return;
//     }
//   }
//
//   close(stopLoading = false): Promise<PlaywrightScenarioStorageCleanup> {
//     if (this.#cleanupCompleted)
//       return Promise.resolve({ loadingStopped: this.#loadingStopped });
//     if (this.#closePromise !== undefined) return this.#closePromise;
//     const closing = this.closeResources(stopLoading).catch((cause: unknown) => {
//       throw new BrowserObservationError(
//         "capture_browser_scenario",
//         "cleanup_failed",
//         {
//           cause,
//           cleanup: {
//             reason: cause instanceof Error ? cause.message : String(cause),
//             resources: ["browser_transport", "browser_storage_bootstrap"],
//           },
//         },
//       );
//     });
//     this.#closePromise = closing;
//     void closing.catch(() => {
//       if (this.#closePromise === closing) this.#closePromise = undefined;
//     });
//     return closing;
//   }
//
//   private async closeResources(
//     stopLoading: boolean,
//   ): Promise<PlaywrightScenarioStorageCleanup> {
//     this.#closed = true;
//     let stopLoadingFailure: { readonly cause: unknown } | undefined;
//     if (stopLoading && !this.#loadingStopped) {
//       try {
//         const root = this.#targets.get("");
//         if (root !== undefined) {
//           await withPlaywrightExecutionBoundary(
//             () => root.send("Page.stopLoading"),
//             STORAGE_CLEANUP_TIMEOUT_MS,
//           );
//           this.#loadingStopped = true;
//         }
//       } catch (cause: unknown) {
//         stopLoadingFailure = { cause };
//       }
//     }
//
//     const work = this.#work;
//     const rootInitialization = this.#rootInitialization;
//     const targets = [...this.#targets.values()];
//     try {
//       await withPlaywrightExecutionBoundary(
//         () =>
//           Promise.all([
//             work.catch(() => undefined),
//             ...(rootInitialization === undefined
//               ? []
//               : [rootInitialization.catch(() => undefined)]),
//             ...targets.map((target) => target.ready.catch(() => undefined)),
//           ]),
//         STORAGE_CLEANUP_TIMEOUT_MS,
//       );
//     } catch {
//       // Detaching the owning CDP session below is the terminal release for
//       // scripts, breakpoints, debugger state, and attached child sessions.
//     }
//
//     let detach = this.#detachPromise;
//     if (detach === undefined) {
//       detach = Promise.resolve().then(() => this.cdp.detach());
//       this.#detachPromise = detach;
//       void detach.catch(() => {
//         if (this.#detachPromise === detach) this.#detachPromise = undefined;
//       });
//     }
//     await withPlaywrightExecutionBoundary(
//       () => detach,
//       STORAGE_CLEANUP_TIMEOUT_MS,
//     );
//
//     for (const { method, listener } of this.#listeners)
//       this.cdp.off(method, listener);
//     this.#removeListeners();
//     for (const reply of this.#replies.values())
//       reply.reject(
//         new BrowserObservationError("capture_browser_scenario", "disconnected"),
//       );
//     this.#targets.clear();
//     this.#replies.clear();
//     this.#cleanupCompleted = true;
//     if (stopLoadingFailure !== undefined) throw stopLoadingFailure.cause;
//     return { loadingStopped: this.#loadingStopped };
//   }
// }
export const _l = 169;
