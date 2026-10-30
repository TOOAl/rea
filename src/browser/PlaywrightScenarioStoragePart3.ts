export const __stub = 1;
//       } else if (method === "Debugger.scriptParsed") {
//         const script = scriptParsedEvent.parse(params);
//         if (script.url === this.#sourceUrl)
//           target.scripts.set(script.scriptId, script.executionContextId);
//       } else if (method === "Debugger.paused") {
//         const pause = pausedEvent.parse(params);
//         const frame = pause.callFrames[0];
//         // CDP resume is target-wide, so identify our private seed frame before
//         // doing any work that will resume the paused target.
//         if (frame === undefined || !target.scripts.has(frame.location.scriptId))
//           return;
//         this.#generation += 1;
//         this.#work = this.#work
//           .then(() => this.seed(target, pause))
//           .catch((cause: unknown) => {
//             if (sessionId === "" || this.#targets.get(sessionId) === target)
//               this.fail(cause);
//           });
//       } else if (method === "Target.attachedToTarget") {
//         this.#generation += 1;
//         this.attach(sessionId, attachedTargetEvent.parse(params));
//       } else if (method === "Target.detachedFromTarget") {
//         this.#generation += 1;
//         this.targetDetached(targetSessionEvent.parse(params).sessionId);
//       } else if (method === "Target.receivedMessageFromTarget") {
//         this.nestedMessage(nestedMessageEvent.parse(params));
//       }
//     } catch (cause: unknown) {
//       this.fail(cause);
//     }
//   }
//
//   private nestedMessage(event: z.infer<typeof nestedMessageEvent>): void {
//     const reply = nestedProtocolMessage.parse(JSON.parse(event.message));
//     if (reply.id !== undefined) {
//       const waiter = this.#replies.get(reply.id);
//       if (waiter?.sessionId !== event.sessionId) return;
//       this.#replies.delete(reply.id);
//       if (reply.error !== undefined)
//         waiter.reject(new Error(reply.error.message));
//       else waiter.resolve(reply.result);
//       return;
//     }
//     if (reply.method !== undefined && STORAGE_EVENT_METHODS.has(reply.method))
//       this.event(
//         event.sessionId,
//         reply.method as StorageEventMethod,
//         reply.params,
//       );
//   }
//
//   private fail(cause: unknown): void {
//     this.#generation += 1;
//     this.#failure ??= new BrowserObservationError(
//       "capture_browser_scenario",
//       "protocol_error",
//       { cause },
//     );
//   }
//
//   private async seedPausedFrame(
//     target: StorageTarget,
//     frame: z.infer<typeof pausedEvent>["callFrames"][number],
//   ): Promise<void> {
//     const contextId = target.scripts.get(frame.location.scriptId);
//     const context =
//       contextId === undefined ? undefined : target.contexts.get(contextId);
//     const seed =
//       context === undefined ? undefined : this.#seeds.get(context.origin);
//     if (
//       this.#closed ||
//       seed === undefined ||
//       context?.auxData?.frameId === undefined
//     )
//       return;
//
//     const storageKey = storageKeyResponse.parse(
//       await this.sendObserved(target, "Storage.getStorageKey", {
//         frameId: context.auxData.frameId,
//       }),
//     ).storageKey;
//     const sessionKey = JSON.stringify([target.topLevelTargetId, storageKey]);
//     const local =
//       this.#initializedLocal.has(storageKey) || seed.local.length === 0
//         ? []
//         : seed.local;
//     const session =
//       this.#initializedSession.has(sessionKey) || seed.session.length === 0
//         ? []
//         : seed.session;
//     if (local.length === 0 && session.length === 0) return;
//
//     const payload = JSON.stringify({ local, session }).replaceAll(
//       "<",
//       "\\u003c",
//     );
//     const response = evaluationResponse.parse(
//       await this.sendObserved(target, "Debugger.evaluateOnCallFrame", {
//         callFrameId: frame.callFrameId,
//         expression: `(() => { const seed = ${payload}; for (const [name, value] of seed.local) localStorage.setItem(name, value); for (const [name, value] of seed.session) sessionStorage.setItem(name, value); })()`,
//         returnByValue: true,
//       }),
//     );
//     if (response.exceptionDetails !== undefined)
//       throw new BrowserObservationError(
//         "capture_browser_scenario",
//         "protocol_error",
//         { detail: "The browser denied initial storage initialization." },
//       );
//     if (local.length > 0) this.#initializedLocal.add(storageKey);
//     if (session.length > 0) this.#initializedSession.add(sessionKey);
//   }
//
//   private async seed(
//     target: StorageTarget,
//     pause: z.infer<typeof pausedEvent>,
//   ): Promise<void> {
//     const frame = pause.callFrames[0];
//     if (frame === undefined) return;
//
//     let primaryFailure: unknown;
//     let hasPrimaryFailure = false;
//     try {
//       await this.seedPausedFrame(target, frame);
//     } catch (cause: unknown) {
//       primaryFailure = cause;
//       hasPrimaryFailure = true;
//     }
//     let resumeFailure: unknown;
//     try {
//       await withPlaywrightExecutionBoundary(
//         () => target.send("Debugger.resume"),
//         STORAGE_CLEANUP_TIMEOUT_MS,
//       );
//     } catch (cause: unknown) {
//       resumeFailure = cause;
//     }
//     if (hasPrimaryFailure && resumeFailure !== undefined)
//       throw new AggregateError(
//         [primaryFailure, resumeFailure],
//         "Storage initialization and debugger resume both failed",
//         { cause: primaryFailure },
//       );
//     if (this.signal?.aborted === true && resumeFailure === undefined) return;
//     if (hasPrimaryFailure) throw primaryFailure;
//     if (resumeFailure !== undefined) throw resumeFailure;
//   }
//
//   private attach(
//     parentId: string,
//     event: z.infer<typeof attachedTargetEvent>,
//   ): void {
//     const parent = this.#targets.get(parentId);
//     if (parent === undefined) return;
//     const { sessionId, targetInfo } = event;
//     const target = this.createTarget(
//       parentId,
//       event.targetInfo.type === "iframe"
//         ? parent.topLevelTargetId
//         : event.targetInfo.targetId,
//       async (method, params = {}) => {
//         const id = ++this.#sequence;
//         const reply = new Promise<unknown>((resolve, reject) =>
//           this.#replies.set(id, { sessionId, resolve, reject }),
//         );
//         try {
//           const sent = parent.send("Target.sendMessageToTarget", {
//             sessionId,
//             message: JSON.stringify({ id, method, params }),
//           });
//           const [, result] = await Promise.all([sent, reply]);
//           return result;
//         } finally {
export const _l = 173;
