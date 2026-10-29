export const __stub = 1;
//         closed.ok ? this.start(signal) : closed,
//       );
//     }
//     if (this.#startPromise !== undefined) return this.#startPromise;
//
//     const controller = new AbortController();
//     const onAbort = (): void => controller.abort(signal?.reason);
//     if (signal?.aborted === true) onAbort();
//     else signal?.addEventListener("abort", onAbort, { once: true });
//     const started = this.#start(controller.signal);
//     this.#startupController = controller;
//     this.#startPromise = started;
//     const release = (): void => {
//       signal?.removeEventListener("abort", onAbort);
//     };
//     const reset = (): void => {
//       if (this.#startPromise === started) {
//         this.#startPromise = undefined;
//         if (this.#startupController === controller) {
//           this.#startupController = undefined;
//         }
//       }
//     };
//     void started.then(
//       (result) => {
//         release();
//         if (!result.ok) {
//           this.#rememberStartupFailure(result.error);
//           reset();
//         } else this.#ready = true;
//       },
//       (cause: unknown) => {
//         this.#logger.debug(
//           { error: cause instanceof Error ? cause.message : String(cause) },
//           "Hopper startup promise rejected during bookkeeping",
//         );
//         release();
//         reset();
//       },
//     );
//     return started;
//   }
//
//   async #start(
//     signal?: AbortSignal,
//   ): Promise<Result<HopperServerInfo, AnalysisError>> {
//     if (isAborted(signal)) return err(new HopperCancelledError());
//     if (
//       this.#socket !== undefined ||
//       this.#resources.launch !== undefined ||
//       this.#resources.runtimeRoot !== undefined ||
//       this.#startupFailureResult?.cleanupIncomplete === true
//     ) {
//       return err(
//         this.#startupFailureResult ??
//           new HopperProtocolError("Hopper client is already started"),
//       );
//     }
//     this.#operationFailure = undefined;
//     this.#startupFailureResult = undefined;
//     this.#resources.shutdownConfirmed = false;
//     const deadline = new ProviderStartupDeadline(
//       this.#options.startupTimeoutMs,
//       signal,
//     );
//     try {
//       return await this.#startWithin(deadline);
//     } finally {
//       deadline.dispose();
//     }
//   }
//
//   async #startWithin(
//     deadline: ProviderStartupDeadline,
//   ): Promise<Result<HopperServerInfo, AnalysisError>> {
//     try {
//       this.#resources.runtimeRoot = await PrivateRuntimeRoot.create({
//         parent: SESSION_ROOT,
//         prefix: "rea-",
//       });
//     } catch (cause: unknown) {
//       return err(new HopperStartError({ cause }));
//     }
//     if (deadline.signal.aborted) {
//       return this.#startupFailure(await this.#startupInterruption(deadline));
//     }
//     const socketPath = join(this.#resources.runtimeRoot.path, "bridge.sock");
//     this.#token = randomBytes(32).toString("hex");
//     this.#lineage.reset();
//     this.#launcherExitCode = undefined;
//     this.#launcherFailureDiagnostic = undefined;
//     const runId = this.#options.runId ?? randomUUID();
//     this.#runId = runId;
//     const launched: Result<
//       BridgeLaunch,
//       HopperStartError | HopperCancelledError | HopperProcessError
//     > = await this.#options.launcher
//       .launch(
//         {
//           directory: this.#resources.runtimeRoot.path,
//           socketPath,
//           token: this.#token,
//           runId,
//         },
//         { signal: deadline.signal },
//       )
//       .catch((cause: unknown) => err(new HopperStartError({ cause })));
//     if (!launched.ok) {
//       return this.#startupFailure(
//         deadline.signal.aborted
//           ? await this.#startupInterruption(deadline)
//           : launched.error,
//       );
//     }
//     this.#resources.launch = launched.value;
//     this.#attachLauncher(launched.value);
//     const ownership = launched.value.ownership;
//     if (ownership !== undefined) {
//       try {
//         await writeFileAtomic(
//           join(this.#resources.runtimeRoot.path, "ownership.json"),
//           `${JSON.stringify({
//             run_id: runId,
//             pid: ownership.leaderPid,
//             process_group_id: ownership.processGroupId,
//             parent_pid: process.pid,
//             launcher: launched.value.launcherCommand ?? null,
//             created_at: new Date().toISOString(),
//           })}\n`,
//           { encoding: "utf8", mode: 0o600 },
//         );
//       } catch (cause: unknown) {
//         return this.#startupFailure(new HopperStartError({ cause }));
//       }
//     }
//     const connected = await this.#connect(socketPath, deadline);
//     if (!connected.ok) {
//       return this.#startupFailure(connected.error);
//     }
//     const remainingMs = deadline.remainingMs();
//     if (remainingMs <= 0) {
//       return this.#startupFailure(await this.#startupInterruption(deadline));
//     }
//     const health = await this.#request(
//       "health",
//       {},
//       {
//         timeoutMs: remainingMs,
//         signal: deadline.signal,
//       },
//     );
//     if (!health.ok) {
//       return this.#startupFailure(
//         deadline.signal.aborted || health.error instanceof HopperTimeoutError
//           ? await this.#startupInterruption(deadline)
//           : health.error,
//       );
//     }
//     const parsed = parseHopperServerInfo(health.value, runId);
//     if (!parsed.ok) return this.#startupFailure(parsed.error);
//     if (this.#resources.launch?.providerLifetime === "external-application") {
//       let identity;
//       try {
//         identity = await observeProcessStartIdentity(parsed.value.processId);
//       } catch (cause: unknown) {
//         identity = {
//           state: "unavailable" as const,
//           reason:
//             cause instanceof Error
//               ? cause.message
//               : "process identity observation failed",
//         };
//       }
//       this.#resources.externalApplication = {
//         pid: parsed.value.processId,
//         identity: identity ?? {
//           state: "unavailable",
//           reason: "process identity was not returned while Hopper was running",
//         },
//       };
//     }
//     await this.#lineage.observe(this.#resources.launch);
//     return parsed;
//   }
//
//   async #startupFailure(
//     primary: AnalysisError,
//   ): Promise<Result<never, AnalysisError>> {
//     this.#rememberStartupFailure(primary);
//     // Failed readiness never authorized this connection to mutate a document.
//     this.#releaseTransport();
//     const closed = await this.#cleanup();
//     const failure = closed.ok
//       ? primary
//       : analysisErrorWithCleanupFailure(primary, closed.error, "open_binary");
//     this.#startupFailureResult = failure;
//     return err(failure);
//   }
//
//   #rememberStartupFailure(failure: AnalysisError): void {
//     if (failure instanceof HopperProcessError)
//       this.#rememberProcessFailure(failure, []);
//     else if (this.#operationFailure === undefined)
//       this.#operationFailure = {
//         state:
//           failure instanceof HopperTimeoutError ? "not_started" : "unknown",
//         exitCode: null,
//         startupFailure: true,
//         requests: [],
//       };
//   }
//
//   /** Invoke one declared operation, returning timeout and cancellation as values. */
//   async callTool(
//     name: string,
//     arguments_: Readonly<Record<string, JsonValue>> = {},
//     options: {
//       readonly signal?: AbortSignal;
//       /** Deadline after startup, including waiting for Hopper's serial bridge. */
//       readonly timeoutMs?: number;
//       readonly progress?: ProgressReporter;
//     } = {},
//   ): Promise<Result<JsonValue, AnalysisError>> {
//     const started = await this.start(options.signal);
//     if (!started.ok) return started;
//     return this.#normalizeToolResult(
//       name,
//       await this.#request(name, arguments_, options),
//     );
//   }
//
//   /** Dispatch against the connected bridge without invoking startup or retry. */
//   callToolIfReady(
//     name: string,
//     arguments_: Readonly<Record<string, JsonValue>> = {},
//     options: { readonly signal?: AbortSignal } = {},
//   ): Promise<Result<JsonValue, AnalysisError> | undefined> {
//     if (!this.isReady()) return Promise.resolve(undefined);
//     return this.#request(name, arguments_, options).then((result) =>
//       this.#normalizeToolResult(name, result),
//     );
//   }
//
//   #normalizeToolResult(
//     name: string,
//     result: Result<JsonValue, AnalysisError>,
//   ): Result<JsonValue, AnalysisError> {
//     return !result.ok &&
//       result.error instanceof HopperRemoteError &&
//       result.error.diagnosticType === "capability_unavailable"
//       ? err(
//           new AnalysisCapabilityUnavailableError(
//             "hopper",
//             name,
//             result.error.safeMessage,
//           ),
//         )
//       : result;
//   }
//
//   /** Stop the bridge and report whether every owned resource was verified clean. */
//   close(
//     options: HopperClientCloseOptions = {},
//   ): Promise<Result<null, AnalysisError>> {
//     const starting = this.#startPromise;
//     const controller = this.#startupController;
//     controller?.abort();
//     this.#closePromise ??= Promise.resolve().then(() =>
//       this.#close(starting, controller, options),
//     );
//     return this.#closePromise;
//   }
//
//   async #close(
//     starting: Promise<Result<HopperServerInfo, AnalysisError>> | undefined,
//     controller: AbortController | undefined,
//     options: HopperClientCloseOptions,
//   ): Promise<Result<null, AnalysisError>> {
//     try {
//       // best-effort cleanup: a rejected startup must not mask close/cleanup;
//       // #cleanup reports the authoritative close result.
export const _l = 281;
