export const __stub = 1;
//       await starting?.catch(() => undefined);
//       await confirmExternalApplicationExit(this.#resources, this.#socket, () =>
//         this.#releaseTransport(),
//       );
//       await this.#reconnectForCleanup();
//       const closed = await this.#cleanup(options);
//       if (closed.ok) this.#startupFailureResult = undefined;
//       return closed;
//     } finally {
//       if (this.#startPromise === starting) this.#startPromise = undefined;
//       if (this.#startupController === controller) {
//         this.#startupController = undefined;
//       }
//       this.#closePromise = undefined;
//     }
//   }
//
//   /** Reauthenticate this run after late readiness or a lost transport. */
//   async #reconnectForCleanup(): Promise<void> {
//     if (this.#socket?.destroyed === true) this.#releaseTransport();
//     const root = this.#resources.runtimeRoot;
//     const runId = this.#runId;
//     if (
//       this.#socket !== undefined ||
//       root === undefined ||
//       runId === undefined ||
//       this.#token === undefined ||
//       this.#resources.shutdownConfirmed ||
//       this.#resources.launch?.providerLifetime !== "external-application"
//     )
//       return;
//     const controller = new AbortController();
//     const timer = setTimeout(
//       () => controller.abort(),
//       HOPPER_SHUTDOWN_TIMEOUT_MS,
//     );
//     this.#closing = true;
//     try {
//       const socketPath = join(root.path, "bridge.sock");
//       let connected = await connectHopperSocketOnce(
//         socketPath,
//         controller.signal,
//       );
//       while (!connected.ok) {
//         const cause = connected.error.cause;
//         if (
//           !(
//             cause instanceof Error &&
//             "code" in cause &&
//             (cause.code === "ENOENT" || cause.code === "ECONNREFUSED")
//           )
//         )
//           return;
//         if ((await waitForAbortableDelay(50, controller.signal)) === "aborted")
//           return;
//         connected = await connectHopperSocketOnce(
//           socketPath,
//           controller.signal,
//         );
//       }
//       const socket = connected.value;
//       this.#socket = socket;
//       this.#attachSocket(socket);
//       const health = await this.#request(
//         "health",
//         {},
//         {
//           signal: controller.signal,
//           timeoutMs: HOPPER_SHUTDOWN_TIMEOUT_MS,
//         },
//       );
//       if (health.ok && parseHopperServerInfo(health.value, runId).ok) return;
//       this.#releaseTransport();
//     } finally {
//       this.#closing = false;
//       clearTimeout(timer);
//     }
//   }
//
//   async #cleanup(
//     options: HopperClientCloseOptions = {},
//   ): Promise<Result<null, AnalysisError>> {
//     this.#closing = true;
//     this.#ready = false;
//     try {
//       const closed = await cleanupHopperSession({
//         socket: this.#socket,
//         resources: this.#resources,
//         activeRequest: this.#requests.activity(),
//         progress: options.progress,
//         logger: this.#logger,
//         onDiagnostic: this.#options.onDiagnostic,
//         request: (method) =>
//           this.#request(method, {}, { timeoutMs: HOPPER_SHUTDOWN_TIMEOUT_MS }),
//         retainDocument: options.retainDocument === true,
//         releaseTransport: () => this.#releaseTransport(),
//       });
//       const launcherClosed = await this.#options.launcher
//         .cleanup?.()
//         .catch((cause: unknown) =>
//           err(
//             new ProviderCleanupError(
//               "hopper",
//               ["hopper-launcher"],
//               {
//                 reason: cause instanceof Error ? cause.message : String(cause),
//               },
//               { cause },
//             ),
//           ),
//         );
//       if (launcherClosed === undefined || launcherClosed.ok) return closed;
//       return closed.ok
//         ? launcherClosed
//         : err(
//             analysisErrorWithCleanupFailure(closed.error, launcherClosed.error),
//           );
//     } finally {
//       if (this.#socket?.destroyed === true) this.#socket = undefined;
//
//       // Retained external launches may publish their authenticated socket later.
//       if (this.#resources.runtimeRoot === undefined) {
//         this.#token = undefined;
//         this.#runId = undefined;
//       }
//       if (this.#socket === undefined) this.#responses.reset();
//       if (this.#resources.processSupervisor === undefined) {
//         this.#launcherExitCode = undefined;
//         this.#launcherFailureDiagnostic = undefined;
//       }
//       this.#closing = false;
//     }
//   }
//
//   async #connect(
//     socketPath: string,
//     deadline: ProviderStartupDeadline,
//   ): Promise<Result<undefined, HopperError>> {
//     while (deadline.remainingMs() > 0) {
//       if (deadline.signal.aborted)
//         return err(await this.#startupInterruption(deadline));
//       if (this.#closing) return err(new HopperProcessError(null));
//       if (
//         this.#launcherExitCode !== undefined &&
//         this.#resources.launch !== undefined &&
//         (this.#resources.launch.providerLifetime === "launcher-process" ||
//           this.#launcherExitCode !== 0)
//       ) {
//         const failure = await this.#launcherStartupFailure(
//           this.#resources.launch.providerLifetime === "launcher-process",
//           this.#launcherExitCode,
//           deadline,
//         );
//         return deadline.interruption === "cancelled"
//           ? err(await this.#startupInterruption(deadline))
//           : err(failure);
//       }
//       try {
//         await access(socketPath);
//       } catch (cause: unknown) {
//         // best-effort cleanup: socket polling; absence means keep waiting.
//         void cause;
//         if ((await deadline.wait(50)) === "aborted")
//           return err(await this.#startupInterruption(deadline));
//         continue;
//       }
//       const attempt = await connectHopperSocketOnce(
//         socketPath,
//         deadline.signal,
//       );
//       if (attempt.ok) {
//         this.#socket = attempt.value;
//         this.#attachSocket(attempt.value);
//         return ok(undefined);
//       }
//       if ((await deadline.wait(50)) === "aborted")
//         return err(await this.#startupInterruption(deadline));
//     }
//     return err(await this.#startupInterruption(deadline));
//   }
//
//   async #startupInterruption(
//     deadline: ProviderStartupDeadline,
//   ): Promise<HopperCancelledError | HopperTimeoutError> {
//     if (deadline.interruption === "cancelled")
//       return new HopperCancelledError();
//     return new HopperTimeoutError(
//       deadline.timeoutMs,
//       undefined,
//       undefined,
//       "not_started",
//       "launch",
//       this.#launcherOutcome(
//         (await this.#resources.processSupervisor?.waitForOutputClose(0)) ??
//           false,
//       ),
//     );
//   }
//
//   #launcherOutcome(outputClosed: boolean): HopperLauncherOutcome | undefined {
//     const snapshot = this.#resources.processSupervisor?.snapshot();
//     const token = this.#token;
//     if (snapshot === undefined) return undefined;
//     return {
//       exit_code: snapshot.exitCode ?? null,
//       signal: snapshot.signal ?? null,
//       stdout: {
//         text: redactCapturedTransportCredential(
//           snapshot.stdout,
//           token,
//           "[redacted transport credential]",
//         ),
//         bytes: snapshot.stdout.observedBytes,
//         retained_bytes: snapshot.stdout.bytes,
//       },
//       stderr: {
//         text: redactCapturedTransportCredential(
//           snapshot.stderr,
//           token,
//           "[redacted transport credential]",
//         ),
//         bytes: snapshot.stderr.observedBytes,
//         retained_bytes: snapshot.stderr.bytes,
//       },
//       output_closed: outputClosed,
//       diagnostic_truncated: snapshot.diagnosticTruncated === true,
//     };
//   }
//
//   async #launcherStartupFailure(
//     ownsProviderLifetime: boolean,
//     exitCode: number | null,
//     deadline: ProviderStartupDeadline,
//   ): Promise<HopperError> {
//     const process = this.#resources.processSupervisor;
//     // Descendants may inherit the helper's pipes. Bound drainage independently
//     // from readiness, and report whether producer output actually closed.
//     const outputClosed =
//       (await process?.waitForOutputClose(
//         Math.min(1_000, deadline.remainingMs()),
//       )) ?? false;
//     const launcherFailure = this.#launcherOutcome(outputClosed);
//     if (ownsProviderLifetime)
//       return new HopperProcessError(exitCode, {
//         diagnostic: this.#launcherFailureDiagnostic,
//         providerState: "exited",
//         stage: "launch",
//         launcherFailure,
//       });
//     if (
//       this.#resources.launch?.authorizationDenialBeforeHandoff === true &&
//       nativeHopperLaunchWasDenied(launcherFailure)
//     ) {
//       this.#resources.shutdownConfirmed = true;
//       return new HopperStartError({
//         userMessage:
//           "macOS denied permission to send Apple Events to Hopper. Allow the application that starts REA under System Settings > Privacy & Security > Automation, then retry opening the target.",
//         launcherFailure,
//       });
//     }
//     if (hopperLauncherReportedApplicationNotFound(launcherFailure)) {
//       // Only the verified native helper's Spotlight exit precedes any target
//       // handoff. Wrappers can forward the same message after opening a document.
//       if (this.#resources.launch?.nativeHelperVerified === true)
//         this.#resources.shutdownConfirmed = true;
//       return new HopperStartError({
//         userMessage:
//           "Hopper's launcher could not find Hopper because it relies on Spotlight. Enable Spotlight indexing for the volume that contains Hopper (for example: sudo mdutil -i on /System/Volumes/Data), wait for indexing to finish, then retry opening the target.",
//         launcherFailure,
//       });
//     }
//     return new HopperStartError({
//       userMessage:
//         "Hopper's launcher helper failed before bridge readiness. Review details.launcher and complete Hopper setup before retrying.",
//       ...(launcherFailure === undefined ? {} : { launcherFailure }),
//     });
//   }
//
//   async #request(
//     method: string,
//     params: JsonValue,
export const _l = 281;
