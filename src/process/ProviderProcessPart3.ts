export const __stub = 1;
//       stderr: this.#stderr.snapshot(this.#stderrObservedBytes),
//       exitCode: this.#exitObservation?.code,
//       signal: this.#exitObservation?.signal,
//       ...(this.launch.process.memoryLimitReached === true
//         ? { memoryLimitReached: true }
//         : {}),
//       ...(outputIncomplete ? { outputIncomplete: true } : {}),
//     };
//   }
//
//   /** Begin a new observation on a retained process without retaining earlier output. */
//   resetOutput(): void {
//     this.#stdout.reset();
//     this.#stderr.reset();
//     this.#stdoutObservedBytes = 0;
//     this.#stderrObservedBytes = 0;
//     this.#diagnosticTruncated = false;
//   }
//
//   /** Wait for process exit up to a caller-owned bounded interval. */
//   async waitForExit(timeoutMs: number): Promise<boolean> {
//     return waitForProcessEvent(
//       this.#exitObservation !== undefined,
//       this.#exit.promise,
//       timeoutMs,
//     );
//   }
//
//   /** Wait until output streams close; WindowsOwnedProcess closes only after its whole Job Object settles. */
//   async waitForOutputClose(timeoutMs: number): Promise<boolean> {
//     return waitForProcessEvent(
//       this.#outputClosed,
//       this.#outputClose.promise,
//       timeoutMs,
//     );
//   }
//
//   /** Bound additional retained bytes while still draining all later output. */
//   limitAdditionalOutputBytes(maxBytes: number): void {
//     if (!Number.isSafeInteger(maxBytes) || maxBytes < 0)
//       throw new RangeError(
//         "Additional output limit must be a non-negative safe integer.",
//       );
//     const retained = this.#stdout.bytes + this.#stderr.bytes;
//     const requestedLimit = Math.min(
//       Number.MAX_SAFE_INTEGER,
//       retained + maxBytes,
//     );
//     this.#maxDiagnosticBytes =
//       this.#maxDiagnosticBytes === undefined
//         ? requestedLimit
//         : Math.min(this.#maxDiagnosticBytes, requestedLimit);
//   }
//
//   /** Unreference inherited output pipes without closing streams shared with descendants. */
//   unrefOutputStreams(): void {
//     for (const stream of [
//       this.launch.process.stdout,
//       this.launch.process.stderr,
//     ]) {
//       const unref = (stream as (Readable & { unref?: () => void }) | null)
//         ?.unref;
//       unref?.call(stream);
//     }
//   }
//
//   /** Share each stop attempt; incomplete cleanup retains ownership and permits retry. */
//   stop(
//     options: ProviderProcessStopOptions = {},
//   ): Promise<ProviderProcessStopResult> {
//     this.#stopPromise ??= this.#stop(options).then((result) => {
//       if (result.status === "incomplete") this.#stopPromise = undefined;
//       return result;
//     });
//     return this.#stopPromise;
//   }
//
//   /** Detach capture and process listeners after an adapter releases ownership. */
//   dispose(): void {
//     if (this.#disposed) return;
//     this.#disposed = true;
//     this.launch.process.stdout?.off("data", this.#onStdout);
//     this.launch.process.stdout?.off("error", this.#onStdoutError);
//     this.launch.process.stderr?.off("data", this.#onStderr);
//     this.launch.process.stderr?.off("error", this.#onStderrError);
//     this.launch.process.off("exit", this.#onExit);
//     this.launch.process.off("close", this.#onClose);
//     this.launch.process.off("error", this.#onError);
//   }
//
//   /** Release event-loop references so incomplete cleanup does not prevent host exit. */
//   unref(): void {
//     const process = this.launch.process;
//     process.unref?.();
//     (process.stdin as { unref?: () => void } | null | undefined)?.unref?.();
//     (process.stdout as { unref?: () => void } | null | undefined)?.unref?.();
//     (process.stderr as { unref?: () => void } | null | undefined)?.unref?.();
//   }
//
//   /** Restore event-loop references when retrying supervised process cleanup. */
//   ref(): void {
//     const process = this.launch.process;
//     process.ref?.();
//     (process.stdin as { ref?: () => void } | null | undefined)?.ref?.();
//     (process.stdout as { ref?: () => void } | null | undefined)?.ref?.();
//     (process.stderr as { ref?: () => void } | null | undefined)?.ref?.();
//   }
//
//   async #stop(
//     options: ProviderProcessStopOptions,
//   ): Promise<ProviderProcessStopResult> {
//     this.ref();
//     let completed = false;
//     try {
//       const result = await this.#stopWithin(options);
//       completed = result.status !== "incomplete";
//       if (!completed) this.unref();
//       return result;
//     } finally {
//       if (completed) this.dispose();
//     }
//   }
//
//   async #stopWithin(
//     options: ProviderProcessStopOptions,
//   ): Promise<ProviderProcessStopResult> {
//     try {
//       if (!this.launch.ownsProcessLifetime) return { status: "not-owned" };
//       if (this.launch.cleanup !== undefined) {
//         const cleanup = await this.#ownedCleanup(options.cleanupResult);
//         if (!cleanup.cleaned)
//           return {
//             status: "incomplete",
//             reason: cleanup.reason,
//             cleanupResult: cleanup,
//           };
//         const graceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
//         if (await this.waitForExit(graceMs))
//           return { status: "verified-cleanup" };
//         const retried = await this.launch.cleanup();
//         if (!retried.cleaned)
//           return {
//             status: "incomplete",
//             reason: retried.reason,
//             cleanupResult: retried,
//           };
//         if (await this.waitForExit(graceMs))
//           return { status: "verified-cleanup" };
//         return {
//           status: "incomplete",
//           reason: "verified process-group cleanup did not stop the launcher",
//         };
//       }
//
//       if (this.#exitObservation !== undefined)
//         return { status: "already-exited" };
//
//       this.#signal("SIGTERM");
//       if (
//         await this.waitForExit(
//           options.terminationGraceMs ?? DEFAULT_TERMINATION_GRACE_MS,
//         )
//       )
//         return { status: "terminated" };
//       this.#signal("SIGKILL");
//       if (await this.waitForExit(options.killGraceMs ?? DEFAULT_KILL_GRACE_MS))
//         return { status: "killed" };
//       return {
//         status: "incomplete",
//         reason: "owned provider process did not exit after SIGKILL",
//       };
//     } catch (cause: unknown) {
//       return {
//         status: "incomplete",
//         reason:
export const _l = 175;
