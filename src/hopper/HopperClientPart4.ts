export const __stub = 1;
//     options: {
//       readonly signal?: AbortSignal;
//       readonly timeoutMs?: number;
//       readonly progress?: ProgressReporter;
//     },
//   ): Promise<Result<JsonValue, HopperError>> {
//     const id = this.#nextId++;
//     if (
//       this.#resources.launch?.providerLifetime === "launcher-process" &&
//       this.#launcherExitCode !== undefined
//     ) {
//       return this.#unavailableRequest(
//         new HopperProcessError(this.#launcherExitCode, {
//           diagnostic: this.#launcherFailureDiagnostic,
//           operation: method,
//           requestId: id,
//           providerState: "exited",
//           stage: hopperOperationStage(method),
//           launcherFailure: this.#launcherOutcome(
//             (await this.#resources.processSupervisor?.waitForOutputClose(0)) ??
//               false,
//           ),
//         }),
//       );
//     }
//     const socket = this.#socket;
//     const token = this.#token;
//     if (socket === undefined || socket.destroyed || token === undefined) {
//       return this.#unavailableRequest(
//         new HopperProcessError(null, {
//           operation: method,
//           requestId: id,
//           providerState: "unreachable",
//           stage: hopperOperationStage(method),
//         }),
//       );
//     }
//     if (options.signal?.aborted === true)
//       return err(new HopperCancelledError());
//     const startedAt = performance.now();
//     const result = await this.#requests.run(id, method, params, {
//       ...(options.signal === undefined ? {} : { signal: options.signal }),
//       ...(options.timeoutMs === undefined
//         ? {}
//         : { timeoutMs: options.timeoutMs }),
//       ...(options.progress !== undefined ? { progress: options.progress } : {}),
//     });
//     this.#retainRequestHealth(result, id, method);
//     this.#logger[result.ok ? "debug" : "warn"](
//       {
//         method,
//         durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
//         status: result.ok ? "ok" : "error",
//         ...(result.ok ? {} : { errorTag: result.error._tag }),
//       },
//       "Hopper bridge request completed",
//     );
//     return result;
//   }
//
//   #attachSocket(socket: Socket): void {
//     socket.setEncoding("utf8");
//     socket.on("data", this.#onSocketData);
//     socket.on("error", this.#onSocketError);
//     socket.on("close", this.#onSocketClose);
//   }
//
//   #acceptBridgeMessage(message: HopperBridgeMessage): boolean {
//     if (!("event" in message))
//       return this.#requests.accept(message.id, responseResult(message));
//     if (!this.#requests.acceptEvent(message)) return false;
//     this.#emitBridgeDiagnostic(message);
//     return true;
//   }
//
//   #emitBridgeDiagnostic(message: HopperBridgeEvent): void {
//     if (message.event.type !== "diagnostic") return;
//     try {
//       this.#options.onDiagnostic?.({
//         type: "bridge-diagnostic",
//         request_id: message.id,
//         code: message.event.error.code,
//         category: message.event.error.type,
//         message: message.event.error.message,
//       });
//     } catch (cause: unknown) {
//       // best-effort cleanup: diagnostic consumers must not break the client.
//       void cause;
//       this.#logger.warn(
//         { requestId: message.id },
//         "Hopper bridge diagnostic consumer rejected an event",
//       );
//     }
//   }
//
//   #detachSocket(socket: Socket): void {
//     socket.off("data", this.#onSocketData);
//     socket.off("error", this.#onSocketError);
//     socket.off("close", this.#onSocketClose);
//   }
//
//   #releaseTransport(): void {
//     const socket = this.#socket;
//     this.#socket = undefined;
//     this.#failAll(new HopperProcessError(null));
//     if (socket !== undefined) this.#detachSocket(socket);
//     socket?.destroy();
//     this.#responses.reset();
//   }
//
//   #attachLauncher(launch: BridgeLaunch): void {
//     this.#resources.processSupervisor = new ProviderProcessSupervisor(launch, {
//       maxDiagnosticBytes: HOPPER_PROCESS_DIAGNOSTIC_BYTES,
//       onDiagnostic: (event) => this.#onLauncherDiagnostic(launch, event),
//     });
//   }
//
//   #onLauncherDiagnostic(
//     launch: BridgeLaunch,
//     event: ProviderProcessDiagnostic,
//   ): void {
//     if (event.type === "output" && event.stream === "stderr") {
//       this.#options.onDiagnostic?.({
//         type: "launcher-stderr",
//         bytes: event.bytes,
//       });
//       return;
//     }
//     if (event.type === "error") {
//       this.#logger.warn(
//         { message: event.message },
//         "Hopper launcher process emitted an error",
//       );
//       return;
//     }
//     if (event.type !== "exit") return;
//     this.#launcherExitCode = event.code;
//     this.#launcherFailureDiagnostic = hopperLauncherFailureDiagnostic(event);
//     this.#options.onDiagnostic?.({
//       type: "launcher-exit",
//       code: event.code,
//     });
//     if (launch.providerLifetime === "launcher-process" && !this.#closing) {
//       this.#rememberExit(event.code);
//       this.#failAll(
//         new HopperProcessError(event.code, {
//           diagnostic: this.#launcherFailureDiagnostic,
//           providerState: "exited",
//           launcherFailure: this.#launcherOutcome(false),
//         }),
//       );
//     }
//   }
//
//   #abortProtocol(message: string, cause?: Error): void {
//     this.#failAll(new HopperProtocolError(message, { cause }));
//     this.#socket?.destroy();
//   }
//
//   #failAll(error: HopperError): void {
//     this.#requests.failAll(error);
//   }
//
//   #unavailableRequest(
//     error: HopperProcessError,
//   ): Result<JsonValue, HopperProcessError> {
//     this.#rememberProcessFailure(
//       error,
//       error.requestId === undefined || error.operation === undefined
//         ? []
//         : [{ requestId: error.requestId, operation: error.operation }],
//     );
//     return err(error);
//   }
//
//   #retainRequestHealth(
//     result: Result<JsonValue, HopperError>,
//     requestId: number,
//     operation: string,
//   ): void {
//     if (this.#closing) return;
//     if (result.ok) return;
//     if (!(result.error instanceof HopperProcessError)) return;
//     this.#rememberProcessFailure(result.error, [
//       {
//         requestId: result.error.requestId ?? requestId,
//         operation: result.error.operation ?? operation,
//       },
//     ]);
//   }
//
//   #rememberExit(code: number | null): void {
//     if (this.#closing) return;
//     const previous = this.#operationFailure;
//     this.#operationFailure = {
//       state: "exited",
//       exitCode: code ?? previous?.exitCode ?? null,
//       startupFailure:
//         hopperStartupFailure(code) !== undefined ||
//         previous?.startupFailure === true,
//       requests: previous?.requests ?? [],
//     };
//   }
//
//   #rememberProcessFailure(
//     error: HopperProcessError,
//     requests: readonly FailedProviderRequest[],
//   ): void {
//     if (this.#closing) return;
//     const previous = this.#operationFailure;
//     const state = processFailureState(error);
//     const startupFailure =
//       error.stage === "launch" ||
//       error.failureCode !== undefined ||
//       previous?.startupFailure === true;
//     const merged = mergeFailedRequests(previous?.requests ?? [], requests);
//     if (
//       previous !== undefined &&
//       PROCESS_FAILURE_RANK[previous.state] > PROCESS_FAILURE_RANK[state]
//     ) {
//       this.#operationFailure = {
//         ...previous,
//         startupFailure,
//         requests: merged,
//       };
//       return;
//     }
//     this.#operationFailure = {
//       state,
//       exitCode:
//         state === "exited"
//           ? (error.exitCode ?? previous?.exitCode ?? null)
//           : null,
//       startupFailure,
//       requests: merged,
//     };
//   }
// }
//
// interface FailedProviderRequest {
//   readonly requestId: number;
//   readonly operation: string;
// }
//
// interface OperationFailureRecord {
//   readonly state: "exited" | "unreachable" | "unknown" | "not_started";
//   readonly exitCode: number | null;
//   readonly startupFailure: boolean;
//   readonly requests: readonly FailedProviderRequest[];
// }
//
// const PROCESS_FAILURE_RANK = {
//   not_started: 0,
//   unknown: 0,
//   unreachable: 1,
//   exited: 2,
// } as const;
//
// const processFailureState = (
//   error: HopperProcessError,
// ): OperationFailureRecord["state"] =>
//   error.providerState === "exited" || error.exitCode !== null
//     ? "exited"
//     : error.providerState;
//
// const mergeFailedRequests = (
//   current: readonly FailedProviderRequest[],
//   added: readonly FailedProviderRequest[],
// ): readonly FailedProviderRequest[] => {
//   const byId = new Map<number, FailedProviderRequest>();
//   for (const request of [...current, ...added])
//     byId.set(request.requestId, request);
//   return [...byId.values()].sort(
//     (left, right) => left.requestId - right.requestId,
//   );
// };
//
// const isAborted = (signal?: AbortSignal): boolean => signal?.aborted === true;
export const _l = 278;
