export const __stub = 1;
//     source: FridaScriptSource,
//     signal?: AbortSignal,
//   ): Promise<Result<FridaScriptObservation, AnalysisError>> {
//     if (signal?.aborted)
//       return err(cancelledOperation("load_frida_script", signal));
//     const managed = this.#sessions.get(sessionId);
//     if (managed === undefined || managed.state === "detached")
//       return err(unknownFridaSession("load_frida_script", sessionId));
//
//     let scriptSource: string;
//     try {
//       scriptSource =
//         source.sourceKind === "inline"
//           ? source.source
//           : await readFile(source.path, "utf8");
//     } catch (cause: unknown) {
//       const sourcePath = source.sourceKind === "file" ? source.path : undefined;
//       return err(
//         cause instanceof Error &&
//           "code" in cause &&
//           (cause.code === "EACCES" || cause.code === "EPERM")
//           ? new AnalysisAccessDeniedError(
//               "load_frida_script",
//               sourcePath ?? "<inline>",
//               cause.code,
//               { cause },
//             )
//           : new AnalysisInputError("load_frida_script", { cause }, [
//               {
//                 path: ["path"],
//                 reason: "invalid_value",
//                 message: `Cannot read Frida script file ${sourcePath ?? "<inline>"}.`,
//               },
//             ]),
//       );
//     }
//
//     if (signal?.aborted)
//       return err(cancelledOperation("load_frida_script", signal));
//     const sourceSha256 = createHash("sha256")
//       .update(scriptSource)
//       .digest("hex");
//     const scriptId = randomUUID();
//     const scriptName = `rea-${scriptId}`;
//     managed.messagesByScript.set(scriptId, new MessageFifo());
//     let nativeScript: Script | undefined;
//     const onMessage = (message: FridaMessage, data: Buffer | null): void => {
//       this.#recordMessage(managed, scriptId, message, data);
//     };
//     try {
//       nativeScript = await managed.session.createScript(scriptSource, {
//         name: scriptName,
//       });
//       const entry: ManagedScript = {
//         id: scriptId,
//         name: scriptName,
//         script: nativeScript,
//         onMessage,
//         state: "active",
//       };
//       managed.scripts.set(scriptId, entry);
//       nativeScript.message.connect(onMessage);
//       if (!signal?.aborted) await nativeScript.load();
//       const observation: FridaScriptObservation = {
//         scriptId,
//         sourceKind: source.sourceKind,
//         sourcePath: source.sourceKind === "file" ? source.path : null,
//         sourceSha256,
//         messages: managed.messagesByScript.get(scriptId)?.toArray() ?? [],
//         messagesTruncated: managed.truncatedScripts.has(scriptId),
//       };
//       if (signal?.aborted) {
//         const cleanupReason = await this.#releaseScript(managed, entry);
//         return err(
//           new FridaScriptLoadCancelledError(observation, {
//             cause: signal.reason,
//             ...(cleanupReason === undefined
//               ? {}
//               : {
//                   cleanup: {
//                     reason: cleanupReason,
//                     resources: [sessionId, scriptId],
//                   },
//                 }),
//           }),
//         );
//       }
//       return ok(observation);
//     } catch (cause: unknown) {
//       const entry = managed.scripts.get(scriptId);
//       const cleanupReason =
//         entry === undefined
//           ? undefined
//           : await this.#releaseScript(managed, entry);
//       managed.messagesByScript.delete(scriptId);
//       return err(
//         providerError(
//           "load_frida_script",
//           cause,
//           managed.remote,
//           cleanupReason,
//         ),
//       );
//     }
//   }
//
//   resumeSession(
//     sessionId: string,
//     signal?: AbortSignal,
//   ): Promise<Result<null, AnalysisError>> {
//     return this.#withOperation(
//       "resume_frida_session",
//       () =>
//         this.#withSessionLock(sessionId, () =>
//           signal?.aborted
//             ? Promise.resolve(
//                 err(cancelledOperation("resume_frida_session", signal)),
//               )
//             : this.#resumeSession(sessionId),
//         ),
//       signal,
//     );
//   }
//
//   async #resumeSession(
//     sessionId: string,
//   ): Promise<Result<null, AnalysisError>> {
//     const managed = this.#sessions.get(sessionId);
//     if (managed === undefined || managed.state === "detached")
//       return err(unknownFridaSession("resume_frida_session", sessionId));
//     if (managed.mode !== "spawn" || managed.state !== "paused")
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "frida",
//           "resume_frida_session",
//           "Only a paused process spawned by this session can be resumed.",
//         ),
//       );
//     const pendingScripts = [...managed.scripts.values()].filter(
//       (entry) => entry.state === "cleanup-pending" && !entry.script.isDestroyed,
//     );
//     if (pendingScripts.length > 0) {
//       const reason =
//         "Frida script cleanup is incomplete; unload the retained scripts or close the session before resuming.";
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "frida",
//           "resume_frida_session",
//           reason,
//           {
//             cleanup: {
//               reason,
//               resources: pendingScripts.map((entry) => entry.id),
//             },
//           },
//         ),
//       );
//     }
//     try {
//       await managed.device.resume(managed.pid);
//       managed.state = "running";
//       managed.targetResumeObserved = true;
//       managed.resumeAfterDetachPending = false;
//       return ok(null);
//     } catch (cause: unknown) {
//       return err(providerError("resume_frida_session", cause, managed.remote));
//     }
//   }
//
//   unloadScript(
//     sessionId: string,
//     scriptId: string,
//     signal?: AbortSignal,
//   ): Promise<Result<null, AnalysisError>> {
//     return this.#withOperation(
//       "unload_frida_script",
//       () =>
//         this.#withSessionLock(sessionId, () =>
//           signal?.aborted
//             ? Promise.resolve(
//                 err(cancelledOperation("unload_frida_script", signal)),
//               )
//             : this.#unloadScript(sessionId, scriptId),
//         ),
//       signal,
//     );
//   }
//
//   async #unloadScript(
//     sessionId: string,
//     scriptId: string,
//   ): Promise<Result<null, AnalysisError>> {
//     const managed = this.#sessions.get(sessionId);
//     const entry = managed?.scripts.get(scriptId);
//     if (managed === undefined)
//       return err(unknownFridaSession("unload_frida_script", sessionId));
//     if (entry === undefined)
//       return err(unknownFridaScript("unload_frida_script", scriptId));
//     const cleanupReason = await this.#releaseScript(managed, entry);
//     return cleanupReason === undefined
//       ? ok(null)
//       : err(
//           providerError(
//             "unload_frida_script",
//             new Error(cleanupReason),
//             managed.remote,
//             cleanupReason,
//           ),
//         );
//   }
//
//   async #releaseScript(
//     managed: ManagedSession,
//     entry: ManagedScript,
//     parentSessionReleased = false,
//   ): Promise<string | undefined> {
//     if (parentSessionReleased || entry.script.isDestroyed)
//       entry.state = "released";
//     if (entry.state !== "released") {
//       entry.state = "cleanup-pending";
//       try {
//         await entry.script.unload();
//         entry.state = "released";
//       } catch (cause: unknown) {
//         if (entry.script.isDestroyed) entry.state = "released";
//         else return sanitizeError(cause, managed.remote);
//       }
//     }
//     try {
//       entry.script.message.disconnect(entry.onMessage);
//     } catch (cause: unknown) {
//       return sanitizeError(cause, managed.remote);
//     }
//     managed.scripts.delete(entry.id);
//     managed.messagesByScript.delete(entry.id);
//     managed.truncatedScripts.delete(entry.id);
//     return undefined;
//   }
//
//   status(sessionId: string): FridaSessionStatus | undefined {
//     const managed = this.#sessions.get(sessionId);
//     if (managed === undefined) return undefined;
//     return {
//       ...sessionObservation(managed),
//       targetResumeObserved: managed.targetResumeObserved,
//       scripts: [...managed.scripts.values()].map(({ id, name }) => ({
//         scriptId: id,
//         name,
//       })),
//       messages: managed.messages
//         .toArray()
//         .map(({ observation }) => observation),
//       messagesTruncated: managed.messagesTruncated,
//     };
//   }
//
//   closeSession(
//     sessionId: string,
//   ): Promise<
//     Result<{ readonly targetResumeObserved: boolean }, AnalysisError>
//   > {
//     const pending = this.#sessionClosures.get(sessionId);
//     if (pending !== undefined) return pending;
//     const closing = this.#withSessionLock(sessionId, () =>
//       this.#closeSession(sessionId),
//     );
//     this.#sessionClosures.set(sessionId, closing);
//     const clear = () => {
//       if (this.#sessionClosures.get(sessionId) === closing)
//         this.#sessionClosures.delete(sessionId);
//     };
//     void closing.then(clear, clear);
//     return closing;
//   }
//
//   async #closeSession(
//     sessionId: string,
//   ): Promise<
//     Result<{ readonly targetResumeObserved: boolean }, AnalysisError>
//   > {
//     const managed = this.#sessions.get(sessionId);
//     if (managed === undefined)
//       return err(unknownFridaSession("close_frida_session", sessionId));
//     const scriptFailures = new Map<string, string>();
//     const cleanupFailures: string[] = [];
//     let parentSessionReleased =
//       managed.state === "detached" || managed.session.isDetached();
//     const shouldResumePausedSpawn =
//       managed.mode === "spawn" &&
//       ((!parentSessionReleased && managed.state === "paused") ||
//         managed.resumeAfterDetachPending);
//     let targetResumeObserved = managed.targetResumeObserved;
//     for (const entry of [...managed.scripts.values()]) {
//       const failure = await this.#releaseScript(
//         managed,
//         entry,
//         parentSessionReleased,
//       );
//       if (failure !== undefined) scriptFailures.set(entry.id, failure);
//     }
//     try {
//       if (!managed.session.isDetached()) await managed.session.detach();
//       managed.state = "detached";
//       parentSessionReleased = true;
//     } catch (cause: unknown) {
//       cleanupFailures.push(
//         `Unable to detach Frida session: ${sanitizeError(cause, managed.remote)}`,
//       );
//       parentSessionReleased =
//         managed.state === "detached" || managed.session.isDetached();
//     }
//     if (parentSessionReleased) {
//       for (const entry of [...managed.scripts.values()]) {
//         const failure = await this.#releaseScript(managed, entry, true);
//         if (failure === undefined) scriptFailures.delete(entry.id);
//         else scriptFailures.set(entry.id, failure);
//       }
//     }
//     if (shouldResumePausedSpawn && managed.scripts.size === 0) {
//       try {
//         await managed.device.resume(managed.pid);
//         managed.state = "running";
//         managed.targetResumeObserved = true;
//         managed.resumeAfterDetachPending = false;
//         targetResumeObserved = true;
//       } catch (cause: unknown) {
//         managed.resumeAfterDetachPending = true;
//         cleanupFailures.push(
//           `Unable to resume spawned target: ${sanitizeError(cause, managed.remote)}`,
//         );
//       }
//     }
//     const failures = [...scriptFailures.values(), ...cleanupFailures];
//     if (
//       managed.remote !== undefined &&
//       (managed.remoteReferenceHeld || managed.remoteRemovalPending) &&
//       parentSessionReleased &&
//       managed.scripts.size === 0 &&
//       !managed.resumeAfterDetachPending
//     ) {
//       const failure = await this.#releaseManagedRemote(managed);
//       if (failure !== undefined) failures.push(failure);
//     }
//     if (failures.length > 0)
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "frida",
//           "close_frida_session",
//           failures[0] ?? "Frida session cleanup failed",
//           {
//             cleanup: {
//               reason: failures.join("; "),
//               resources: [sessionId],
//             },
//           },
//         ),
//       );
//     this.#sessions.delete(sessionId);
//     return ok({ targetResumeObserved });
//   }
//
//   closeAll(): Promise<void> {
//     this.#closing = true;
//     this.#closeAllPromise ??= this.#closeAll().catch((cause: unknown) => {
//       this.#closeAllPromise = undefined;
//       throw cause;
//     });
//     return this.#closeAllPromise;
//   }
//
//   async #closeAll(): Promise<void> {
//     await Promise.allSettled(this.#operations);
//     const startupFailures = (
//       await Promise.all(
//         [...this.#pendingStartups].map((pending) =>
//           this.#cleanupStartup(pending),
//         ),
export const _l = 377;
