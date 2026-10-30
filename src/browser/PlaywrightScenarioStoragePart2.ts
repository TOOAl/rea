export const __stub = 1;
//           if (!detached) {
//             await session.detach();
//             detached = true;
//           }
//         };
//         retainCleanup?.(lateCleanup);
//         void withPlaywrightExecutionBoundary(
//           lateCleanup,
//           STORAGE_CLEANUP_TIMEOUT_MS,
//         ).catch(() => undefined);
//       }
//       throw cause;
//     }
//     const owner = new PlaywrightScenarioStorage(cdp, signal);
//     owner.addSeeds(scenario.storage.local_storage, "local", secrets);
//     owner.addSeeds(scenario.storage.session_storage, "session", secrets);
//     return owner;
//   }
//
//   async initialize(page: Page, context: BrowserContext): Promise<void> {
//     const initialization = this.initializeRoot(page, context);
//     this.#rootInitialization = initialization;
//     await withPlaywrightExecutionBoundary(
//       () => initialization,
//       undefined,
//       this.signal,
//     );
//   }
//
//   private async initializeRoot(
//     page: Page,
//     context: BrowserContext,
//   ): Promise<void> {
//     const rootInfo = targetInfoResponse.parse(
//       await this.cdp.send("Target.getTargetInfo"),
//     );
//     if (this.#closed) return;
//     const root = this.createTarget(
//       undefined,
//       rootInfo.targetInfo.targetId,
//       (method, params) =>
//         this.cdp.send(method as Parameters<CDPSession["send"]>[0], params),
//     );
//     this.#targets.set("", root);
//     this.listen(page, context);
//     const ready = this.initializeTarget(root);
//     root.ready = ready;
//     await ready;
//   }
//
//   private addSeeds(
//     blocks: BrowserScenario["storage"]["local_storage"],
//     kind: "local" | "session",
//     secrets: BrowserScenarioSecrets,
//   ): void {
//     for (const { origin, entries } of blocks) {
//       const seed = this.#seeds.get(origin) ?? { local: [], session: [] };
//       seed[kind].push(
//         ...entries.map(({ name, value }): [string, string] => [
//           name,
//           secrets.value(value),
//         ]),
//       );
//       this.#seeds.set(origin, seed);
//     }
//   }
//
//   private listen(page: Page, context: BrowserContext): void {
//     const browser = context.browser();
//     const detached = (): void => this.targetDetached("");
//     page.on("close", detached);
//     context.on("close", detached);
//     browser?.on("disconnected", detached);
//     this.#removeListeners = () => {
//       page.off("close", detached);
//       context.off("close", detached);
//       browser?.off("disconnected", detached);
//     };
//     for (const method of [
//       "Runtime.executionContextCreated",
//       "Runtime.executionContextDestroyed",
//       "Runtime.executionContextsCleared",
//       "Debugger.scriptParsed",
//       "Debugger.paused",
//       "Target.attachedToTarget",
//       "Target.detachedFromTarget",
//       "Target.receivedMessageFromTarget",
//     ] as const) {
//       const listener = (params: unknown): void =>
//         this.event("", method, params);
//       this.#listeners.push({ method, listener });
//       this.cdp.on(method, listener);
//     }
//   }
//
//   private createTarget(
//     parentId: string | undefined,
//     topLevelTargetId: string,
//     send: StorageTarget["send"],
//   ): StorageTarget {
//     return {
//       parentId,
//       topLevelTargetId,
//       send,
//       contexts: new Map(),
//       scripts: new Map(),
//       ready: Promise.resolve(),
//       waitingForDebugger: false,
//     };
//   }
//
//   private async initializeTarget(target: StorageTarget): Promise<void> {
//     if (this.#closed) return;
//     await target.send("Page.enable");
//     if (this.#closed) return;
//     await target.send("Runtime.enable");
//     if (this.#closed) return;
//     await target.send("Debugger.enable");
//     if (this.#closed) return;
//     breakpointResponse.parse(
//       await target.send("Debugger.setBreakpointByUrl", {
//         url: this.#sourceUrl,
//         lineNumber: 1,
//       }),
//     );
//     if (this.#closed) return;
//     scriptIdentifierResponse.parse(
//       await target.send("Page.addScriptToEvaluateOnNewDocument", {
//         worldName: this.#sourceUrl,
//         source: `(() => {\n  void 0;\n})()\n//# sourceURL=${this.#sourceUrl}`,
//       }),
//     );
//     if (this.#closed) return;
//     await target.send("Target.setAutoAttach", {
//       autoAttach: true,
//       waitForDebuggerOnStart: true,
//       flatten: false,
//     });
//   }
//
//   private sendObserved(
//     target: StorageTarget,
//     method: string,
//     params?: Record<string, unknown>,
//   ): Promise<unknown> {
//     return withPlaywrightExecutionBoundary(
//       () => target.send(method, params),
//       undefined,
//       this.signal,
//     );
//   }
//
//   private event(
//     sessionId: string,
//     method: StorageEventMethod,
//     params: unknown,
//   ): void {
//     if (this.#closed) return;
//     const target = this.#targets.get(sessionId);
//     if (target === undefined) return;
//     try {
//       if (method === "Runtime.executionContextCreated") {
//         const { context } = executionContextEvent.parse(params);
//         if (context.name === this.#sourceUrl)
//           target.contexts.set(context.id, context);
//       } else if (method === "Runtime.executionContextDestroyed") {
//         const { executionContextId } = z
//           .object({ executionContextId: z.number() })
//           .parse(params);
//         target.contexts.delete(executionContextId);
//       } else if (method === "Runtime.executionContextsCleared") {
//         target.contexts.clear();
//         target.scripts.clear();
export const _l = 173;
