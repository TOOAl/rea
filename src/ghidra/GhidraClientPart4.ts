export const __stub = 1;
//     if (parsed.ok) return parsed;
//     return err(
//       this.#failure(
//         "protocol",
//         "Ghidra bridge handshake is invalid",
//         parsed.error,
//       ),
//     );
//   }
//
//   async #close(
//     starting: Promise<GhidraStartResult> | undefined,
//     controller: AbortController | undefined,
//     forceStop: boolean,
//   ): Promise<void> {
//     try {
//       // best-effort cleanup: a rejected startup must not mask close/cleanup.
//       await starting?.catch(() => undefined);
//       await this.#cleanup(forceStop);
//     } finally {
//       if (this.#startPromise === starting) this.#startPromise = undefined;
//       if (this.#startupController === controller)
//         this.#startupController = undefined;
//       this.#closePromise = undefined;
//     }
//   }
//
//   async #cleanup(forceStop = false): Promise<void> {
//     this.#closing = true;
//     let forcedStopFailure: GhidraSessionError | undefined;
//     try {
//       this.#requestQueue.failQueued(
//         this.#failure("process", "Ghidra session closed"),
//       );
//       const socket = this.#socket;
//       if (!forceStop && socket !== undefined && !socket.destroyed) {
//         const shutdown = await this.#wire
//           .request("shutdown", {}, { timeoutMs: SHUTDOWN_TIMEOUT_MS })
//           .catch((cause: unknown) =>
//             err(
//               this.#failure("process", "Ghidra shutdown request failed", cause),
//             ),
//           );
//         if (!shutdown.ok || !isGhidraShutdownAcknowledgement(shutdown.value))
//           this.#logger.warn(
//             {
//               status: shutdown.ok ? "invalid-acknowledgement" : "failed",
//               ...(shutdown.ok
//                 ? {}
//                 : {
//                     kind: shutdown.error.kind,
//                     message: shutdown.error.message,
//                     diagnostics: shutdown.error.diagnostics,
//                   }),
//             },
//             "Ghidra bridge shutdown was not confirmed",
//           );
//       }
//       this.#failAll(this.#failure("process", "Ghidra session closed"));
//       this.#detachSocket?.();
//       this.#detachSocket = undefined;
//       socket?.destroy();
//       this.#socket = undefined;
//       if (this.#process !== undefined) {
//         await this.#process.waitForExit(500);
//         this.#processSnapshot = this.#process.snapshot();
//         const stopped = await this.#process.stop();
//         this.#processSnapshot = this.#process.snapshot();
//         if (stopped.status === "incomplete") {
//           this.#options.onDiagnostic?.({
//             type: "cleanup-incomplete",
//             reason: stopped.reason,
//           });
//           this.#logger.warn(
//             { reason: stopped.reason },
//             "Ghidra process cleanup failed closed",
//           );
//           // Keep the supervisor and private files available for a later close.
//           // A still-live JVM can recreate files if its runtime is removed here.
//           throw this.#failure(
//             "process",
//             `Ghidra process cleanup was incomplete: ${stopped.reason}`,
//           );
//         }
//       }
//       this.#lastDiagnostics = this.#diagnostics();
//       this.#process = undefined;
//       this.#launch = undefined;
//       for (const owner of this.#snapshotOwners) {
//         await owner.close();
//         this.#snapshotOwners.delete(owner);
//       }
//       try {
//         await this.#removeRuntimeRoots();
//       } catch (cause: unknown) {
//         if (forceStop)
//           forcedStopFailure ??= this.#failure(
//             "process",
//             "Ghidra runtime cleanup after cancellation failed",
//             cause,
//           );
//         else throw cause;
//       }
//       this.#snapshotPath = undefined;
//       this.#endpointPath = undefined;
//       this.#token = undefined;
//       this.#runId = undefined;
//       this.#responseBuffer.reset();
//       if (forcedStopFailure !== undefined) throw forcedStopFailure;
//     } finally {
//       this.#closing = false;
//     }
//   }
//
//   /**
//    * Remove the runtime and socket roots, keeping each one that could not be
//    * removed so a later close retries it rather than reporting success.
//    */
//   async #removeRuntimeRoots(): Promise<void> {
//     const roots = [
//       {
//         root: this.#runtimeRoot,
//         release: () => (this.#runtimeRoot = undefined),
//       },
//       { root: this.#socketRoot, release: () => (this.#socketRoot = undefined) },
//     ];
//     const leftovers: { readonly path: string; readonly reason: string }[] = [];
//     let firstCause: unknown;
//     for (const { root, release } of roots) {
//       if (root === undefined) continue;
//       try {
//         await root.close();
//         release();
//       } catch (cause: unknown) {
//         firstCause ??= cause;
//         leftovers.push({
//           path: root.path,
//           reason: cause instanceof Error ? cause.message : String(cause),
//         });
//       }
//     }
//     if (leftovers.length > 0)
//       throw new ProviderCleanupError(
//         "ghidra",
//         leftovers.map(({ path }) => path),
//         {
//           reason:
//             "Ghidra's private runtime directory could not be removed; it is retained for a later close.",
//           leftover_paths: leftovers.map(({ path }) => path),
//           failures: leftovers.map(({ path, reason }) => `${path}: ${reason}`),
//         },
//         { cause: firstCause },
//       );
//   }
//
//   #redactAuthentication(value: string, incomplete = false): string {
//     for (const token of this.#authenticationTokens) {
//       const bytes = Buffer.byteLength(value);
//       value = redactCapturedTransportCredential(
//         { text: value, bytes, observedBytes: bytes + (incomplete ? 1 : 0) },
//         token,
//         "[REDACTED]",
//       );
//     }
//     return value;
//   }
//
//   #onProcessDiagnostic(event: ProviderProcessDiagnostic): void {
//     if (event.type === "output") {
//       this.#options.onDiagnostic?.({
//         type: "launcher-output",
//         stream: event.stream,
//         bytes: event.bytes,
//         totalBytes: event.totalBytes,
//       });
//       return;
//     }
//     if (event.type === "error") {
//       this.#logger.warn(
//         { message: event.message },
//         "Ghidra process emitted an error",
//       );
//       return;
//     }
//     this.#processSnapshot = event.snapshot;
//     this.#options.onDiagnostic?.({
//       type: "launcher-exit",
//       code: event.code,
//       signal: event.signal,
//     });
//     if (!this.#closing)
//       this.#failAll(this.#failure("process", "Ghidra process exited"));
//   }
//
//   #abortProtocol(message: string, cause?: Error): void {
//     this.#failAll(this.#failure("protocol", message, cause));
//     this.#socket?.destroy();
//   }
//
//   #failAll(error: GhidraSessionError): void {
//     this.#pending.failAll(() => err(error));
//   }
//
//   async #startupInterrupted(
//     deadline: ProviderStartupDeadline,
//   ): Promise<GhidraStartResult> {
//     const failure = this.#interruptionFailure(deadline);
//     return this.#startupFailure(failure);
//   }
//
//   #interruptionFailure(
//     deadline: ProviderStartupDeadline,
//     cause?: unknown,
//   ): GhidraSessionError {
//     return deadline.interruption === "cancelled"
//       ? this.#failure("cancelled", "Ghidra startup was cancelled", cause)
//       : this.#failure("timeout", "Ghidra startup deadline elapsed", cause, {
//           timeoutMs: deadline.timeoutMs,
//         });
//   }
//
//   #diagnostics(): Readonly<Record<string, JsonValue>> {
//     const snapshot = this.#process?.snapshot() ?? this.#processSnapshot;
//     return createGhidraDiagnostics({
//       targetPath: this.#options.targetPath,
//       targetSha256: this.#options.targetSha256,
//       ...(this.#targetAdmission === undefined
//         ? {}
//         : { targetAdmission: this.#targetAdmission }),
//       transport: this.#options.transport,
//       providerVersion: this.#options.providerVersion,
//       profileDigest: this.#options.profileDigest,
//       ...(this.#runId === undefined ? {} : { runId: this.#runId }),
//       ...(this.#runtimeRoot === undefined
//         ? {}
//         : { runtimeRoot: this.#runtimeRoot.path }),
//       ...(this.#socketRoot === undefined
//         ? {}
//         : { socketRoot: this.#socketRoot.path }),
//       ...(this.#endpointPath === undefined
//         ? {}
//         : { endpointPath: this.#endpointPath }),
//       ...(this.#launch === undefined ? {} : { launch: this.#launch }),
//       ...(snapshot === undefined ? {} : { snapshot }),
//       ...(this.#token === undefined ? {} : { token: this.#token }),
//       previous: this.#lastDiagnostics,
//     });
//   }
// }
export const _l = 249;
