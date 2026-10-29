export const __stub = 1;
//
//   #stopAfterActiveCancellation(): Promise<void> {
//     return this.#requestClose(true).catch((cause: unknown) => {
//       this.#logger.error(
//         { error: cause instanceof Error ? cause.message : String(cause) },
//         "Ghidra cleanup after active request cancellation failed",
//       );
//       throw cause;
//     });
//   }
//
//   /** Observed failures that prevent a retained session from being reused. */
//   operationHealthSnapshot(): ProviderOperationHealth | undefined {
//     const exit = this.#process?.observedExit();
//     const state =
//       exit !== undefined
//         ? "exited"
//         : this.#socket?.destroyed === true
//           ? "unreachable"
//           : this.#startPromise === undefined &&
//               (this.#process !== undefined ||
//                 this.#socket !== undefined ||
//                 this.#runtimeRoot !== undefined ||
//                 this.#socketRoot !== undefined ||
//                 this.#snapshotOwners.size > 0)
//             ? "unknown"
//             : undefined;
//     if (state === undefined) return undefined;
//     return {
//       state,
//       stage: null,
//       retryAction: providerRetryAction(state),
//       exitCode: exit?.code ?? null,
//       requests: [],
//     };
//   }
//
//   /** Latest bounded local diagnostics, with bearer material redacted. */
//   diagnostics(): Readonly<Record<string, JsonValue>> {
//     return structuredClone(this.#diagnostics());
//   }
//
//   /** Latest token-verified launcher lineage for the active run. */
//   runtimeLineage() {
//     return this.#lineage.snapshot();
//   }
//
//   async #start(signal: AbortSignal): Promise<GhidraStartResult> {
//     if (signal.aborted)
//       return err(this.#failure("cancelled", "Ghidra startup was cancelled"));
//     if (this.#socket !== undefined || this.#runtimeRoot !== undefined)
//       return err(this.#failure("protocol", "Ghidra client is already started"));
//     this.#processSnapshot = undefined;
//     const deadline = new ProviderStartupDeadline(
//       this.#options.startupTimeoutMs,
//       signal,
//     );
//     try {
//       return await this.#startWithin(deadline);
//     } catch (cause: unknown) {
//       if (cause instanceof GhidraSessionError) return err(cause);
//       throw cause;
//     } finally {
//       deadline.dispose();
//     }
//   }
//
//   async #startWithin(
//     deadline: ProviderStartupDeadline,
//   ): Promise<GhidraStartResult> {
//     try {
//       this.#runtimeRoot = await PrivateRuntimeRoot.create({
//         parent: SESSION_ROOT,
//         prefix: "rea-ghidra-",
//         platform: this.#options.platform,
//       });
//     } catch (cause: unknown) {
//       return err(
//         this.#failure("start", "Ghidra runtime root creation failed", cause),
//       );
//     }
//     if (deadline.signal.aborted) return this.#startupInterrupted(deadline);
//     let endpoint: GhidraEndpoint;
//     try {
//       const allocated = await createGhidraEndpoint(
//         this.#runtimeRoot.path,
//         this.#options.transport,
//         this.#options.platform,
//       );
//       endpoint = allocated.endpoint;
//       this.#socketRoot = allocated.socketRoot;
//       this.#endpointPath = endpoint.path;
//     } catch (cause: unknown) {
//       const failure = this.#failure(
//         "start",
//         "Ghidra private endpoint allocation failed",
//         cause,
//       );
//       return this.#startupFailure(failure);
//     }
//     try {
//       const snapshot = await createGhidraTargetSnapshot(
//         this.#options.targetPath,
//         this.#runtimeRoot.path,
//         this.#options.targetSha256,
//         { signal: deadline.signal, platform: this.#options.platform },
//       );
//       this.#snapshotPath = snapshot.path;
//       this.#targetAdmission = snapshot.admission;
//     } catch (cause: unknown) {
//       if (deadline.signal.aborted) return this.#startupInterrupted(deadline);
//       const failure = this.#failure(
//         "start",
//         "Ghidra target snapshot failed admission",
//         cause,
//       );
//       return this.#startupFailure(failure);
//     }
//     if (deadline.signal.aborted) return this.#startupInterrupted(deadline);
//     this.#token = randomBytes(32).toString("hex");
//     this.#authenticationTokens.add(this.#token);
//     this.#lineage.reset();
//     this.#runId = this.#options.runId ?? randomUUID();
//     const launched = await this.#options.launcher
//       .launch(
//         {
//           runtimeRoot: this.#runtimeRoot.path,
//           transport: endpoint.transport,
//           endpointPath: endpoint.path,
//           token: this.#token,
//           runId: this.#runId,
//           targetPath: this.#snapshotPath,
//           targetSha256: this.#options.targetSha256,
//           providerVersion: this.#options.providerVersion,
//           profileDigest: this.#options.profileDigest,
//         },
//         { signal: deadline.signal },
//       )
//       .catch((cause: unknown) =>
//         err(this.#failure("start", "Ghidra launcher failed", cause)),
//       );
//     if (!launched.ok) {
//       const partialLaunch =
//         launched.error instanceof GhidraLaunchError
//           ? launched.error.partialLaunch
//           : undefined;
//       if (partialLaunch !== undefined) {
//         this.#launch = partialLaunch;
//         this.#process = new ProviderProcessSupervisor(partialLaunch, {
//           maxDiagnosticBytes: GHIDRA_PROCESS_DIAGNOSTIC_BYTES,
//           onDiagnostic: (event) => this.#onProcessDiagnostic(event),
//         });
//       }
//       const failure = deadline.signal.aborted
//         ? this.#interruptionFailure(deadline, launched.error)
//         : launched.error instanceof GhidraSessionError
//           ? launched.error
//           : this.#failure("start", launched.error.message, launched.error);
//       return this.#startupFailure(failure);
//     }
//     this.#launch = launched.value;
//     this.#process = new ProviderProcessSupervisor(launched.value, {
//       maxDiagnosticBytes: GHIDRA_PROCESS_DIAGNOSTIC_BYTES,
//       onDiagnostic: (event) => this.#onProcessDiagnostic(event),
//     });
//     const completed = await this.#connectAndHandshake(endpoint, deadline);
//     if (!completed.ok) return this.#startupFailure(completed.error);
//     await this.#lineage.observe(this.#launch);
//     this.#requestQueue.reopen();
//     return completed;
//   }
//
//   async #connectAndHandshake(
//     endpoint: GhidraEndpoint,
//     deadline: ProviderStartupDeadline,
//   ): Promise<GhidraStartResult> {
//     // Retry only a dropped loopback transport, never identity or protocol failures.
//     for (let attempt = 0; ; attempt += 1) {
//       const connected = await this.#connect(endpoint, deadline);
//       if (!connected.ok) return connected;
//       const completed = await completeGhidraStartupHandshake({
//         deadline,
//         request: (method, params, requestOptions) =>
//           this.#wire.request(method, params, requestOptions),
//         parseSessionInfo: (value) => this.#parseSessionInfo(value),
//         failure: this.#failure,
//         startupTimeoutMs: this.#options.startupTimeoutMs,
//       });
//       if (
//         completed.ok ||
//         completed.error.kind !== "process" ||
//         endpoint.transport !== "authenticated-loopback-tcp" ||
//         attempt >= 2 ||
//         deadline.signal.aborted ||
//         this.#closing ||
//         this.#process?.observedExit() !== undefined
//       )
//         return completed;
//       this.#detachSocket?.();
//       this.#detachSocket = undefined;
//       this.#socket?.destroy();
//       this.#socket = undefined;
//       this.#responseBuffer.reset();
//     }
//   }
//
//   async #connect(
//     endpoint: GhidraEndpoint,
//     deadline: ProviderStartupDeadline,
//   ): Promise<Result<undefined, GhidraSessionError>> {
//     const connected = await connectGhidraSocket({
//       endpoint,
//       deadline,
//       failure: this.#failure,
//       isClosed: () => this.#closing,
//       processExited: () => this.#process?.observedExit() !== undefined,
//       startupTimeoutMs: this.#options.startupTimeoutMs,
//       handlers: {
//         data: this.#onSocketData,
//         error: this.#onSocketError,
//         close: this.#onSocketClose,
//       },
//     });
//     if (!connected.ok) return connected;
//     this.#socket = connected.value.socket;
//     this.#detachSocket = connected.value.detach;
//     return ok(undefined);
//   }
//
//   #parseSessionInfo(value: JsonValue) {
//     const runId = this.#runId;
//     if (runId === undefined)
//       return err(this.#failure("protocol", "Ghidra run identity is missing"));
//     const parsed = parseGhidraSessionInfo(value, {
//       runId,
//       expectedReadOnly:
//         this.#options.transport === "authenticated-loopback-tcp",
//       providerVersion: this.#options.providerVersion,
//       profileDigest: this.#options.profileDigest,
//       targetSha256: this.#options.targetSha256,
//       ...(this.#targetAdmission === undefined
//         ? {}
//         : { targetAdmission: this.#targetAdmission }),
//       ...(this.#options.expectedLanguageId === undefined
//         ? {}
//         : { expectedLanguageId: this.#options.expectedLanguageId }),
//       ...(this.#options.expectedCompilerSpecId === undefined
//         ? {}
//         : { expectedCompilerSpecId: this.#options.expectedCompilerSpecId }),
//     });
export const _l = 250;
