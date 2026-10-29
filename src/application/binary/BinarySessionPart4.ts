export const __stub = 1;
//       this.#active.nativeSourceAdmitted = true;
//     this.#observeRuntimeAvailability(name, execution);
//     if (
//       execution.ok &&
//       cacheable &&
//       profile !== undefined &&
//       name !== "decode_interface_builder" &&
//       name !== "inspect_asset_catalog" &&
//       name !== "inspect_keyed_archive" &&
//       name !== "trace_dylib_resolution"
//     ) {
//       const evidence = createEvidence(
//         execution.value.subject ?? active.target,
//         execution.value.provider,
//         {
//           operation: name,
//           parameters: arguments_,
//           result: execution.value.result,
//           analysisProfile: profile,
//           rawResult: execution.value.rawResult,
//           limitations: execution.value.limitations,
//           ...(execution.value.relationshipCoverage === undefined
//             ? {}
//             : {
//                 relationshipCoverage: execution.value.relationshipCoverage,
//               }),
//           locations: execution.value.locations,
//         },
//       );
//       const recorded = this.recordEvidence(evidence);
//       if (!recorded.ok) return recorded;
//       this.recordSnapshot({
//         target: active.target,
//         profile,
//         operation: name,
//         parameters: arguments_,
//         execution: execution.value,
//       });
//     }
//     return execution;
//   }
//
//   #observeRuntimeAvailability(
//     operation: AnalysisOperation,
//     result: Result<AnalysisExecution, AnalysisError>,
//   ): void {
//     if (result.ok) {
//       if (this.#markRuntimeAvailable(operation))
//         this.#emitAvailabilityChanged();
//       return;
//     }
//     if (result.error._tag === "AnalysisCapabilityUnavailableError") {
//       if (this.#markRuntimeUnavailable(operation, result.error.message))
//         this.#emitAvailabilityChanged();
//       return;
//     }
//     if (
//       [
//         "ProviderAdapterError",
//         "HopperProcessError",
//         "HopperStartError",
//       ].includes(result.error._tag)
//     ) {
//       const capabilities = this.#active?.route.capabilities;
//       const providerId = capabilities?.get(operation)?.provider.id;
//       let changed = false;
//       for (const descriptor of capabilities?.values() ?? [])
//         if (providerId !== undefined && descriptor.provider.id === providerId)
//           changed =
//             this.#markRuntimeUnavailable(
//               descriptor.operation,
//               `${result.error._tag}: ${result.error.message}`,
//             ) || changed;
//       if (changed) this.#emitAvailabilityChanged();
//     }
//   }
//
//   #markRuntimeAvailable(operation: string): boolean {
//     return this.#runtimeUnavailability.delete(operation);
//   }
//
//   #markRuntimeUnavailable(operation: string, reason: string): boolean {
//     const current = this.#runtimeUnavailability.get(operation);
//     if (current?.reason === reason) return false;
//     this.#runtimeUnavailability.set(operation, { reason });
//     return true;
//   }
//
//   #clearRuntimeAvailability(): void {
//     if (this.#runtimeUnavailability.size === 0) return;
//     this.#runtimeUnavailability.clear();
//     this.#emitAvailabilityChanged();
//   }
//
//   #emitAvailabilityChanged(): void {
//     for (const listener of this.#availabilityListeners) {
//       try {
//         const notification = listener();
//         if (notification !== undefined) {
//           // best-effort cleanup: async observer notifications must not reject
//           // unhandled; state transitions and other listeners continue.
//           void notification.catch(() => undefined);
//         }
//       } catch (cause: unknown) {
//         // External observers are best-effort notifications. Contain only the
//         // callback failure so state transitions and other listeners continue.
//         void cause;
//       }
//     }
//   }
//
//   #currentRoute(): SessionProviderRoute {
//     return this.#active?.route ?? this.#providerRouter.initialRoute();
//   }
//
//   #serialize<T>(
//     operation: (admittedThrough: number) => Promise<T>,
//   ): Promise<T> {
//     for (const controller of this.#promptCompletionControllers)
//       controller.abort();
//     this.#transitionPending += 1;
//     // Later calls wait for this transition and must not be included in its drain.
//     const admittedThrough = this.#transitionGeneration++;
//     const result = this.#transition.then(
//       () => operation(admittedThrough),
//       () => operation(admittedThrough),
//     );
//     this.#transition = result.then(
//       () => undefined,
//       () => undefined,
//     );
//     void result.then(
//       () => {
//         this.#transitionPending -= 1;
//       },
//       () => {
//         this.#transitionPending -= 1;
//       },
//     );
//     return result;
//   }
//
//   async #drainCalls(admittedThrough: number): Promise<void> {
//     await Promise.allSettled(
//       [...this.#calls]
//         .filter(([, generation]) => generation <= admittedThrough)
//         .map(([call]) => call),
//     );
//   }
//
//   /**
//    * Probe whether a retained provider client is still live.
//    *
//    * On production routes the client is a CompositeProvider whose `health`
//    * answers unconditionally ok without touching a child, so `health` alone
//    * cannot see a dead child. `operationHealthSnapshot` reaches the
//    * instantiated children instead. Only the known-live states allow the
//    * fast path: `exited`/`unreachable` are dead, `unknown` is never
//    * evidence of health (it is what a recorded but uncharacterized failure
//    * reports), and `not_started` is a startup that never completed — in the
//    * Hopper timeout case the client holds retained resources that block the
//    * next `start()` until `close()` retries cleanup, so treating it as live
//    * would skip the retire path and hand the wedged client to subsequent
//    * analysis. The gate fails closed: without a snapshot signal, fall back
//    * to the `health` admission probe.
//    */
//   async #retainedClientLive(
//     client: AnalysisClient,
//     options: Pick<BinarySessionOpenOptions, "signal">,
//   ): Promise<boolean> {
//     const snapshot = client.operationHealthSnapshot?.();
//     if (snapshot !== undefined)
//       return snapshot.state === "idle" || snapshot.state === "busy";
//     try {
//       return (await client.execute("health", {}, options)).ok;
//     } catch {
//       return false;
//     }
//   }
//
//   async #restore(
//     previous: SessionBinding | undefined,
//   ): Promise<Result<null, AnalysisError>> {
//     if (previous === undefined) return ok(null);
//     const runId = randomUUID();
//     const client = previous.route.createClient(previous.target, { runId });
//     const started = await client.execute("health", {});
//     if (started.ok) {
//       this.#active = {
//         target: previous.target,
//         client,
//         profile: previous.profile,
//         route: previous.route,
//         runId,
//         nativeSourceAdmitted: false,
//       };
//       this.#clearRuntimeAvailability();
//       return ok(null);
//     }
//     const closed = await this.#retireClient(client, previous.route.identity.id);
//     return closed.ok
//       ? ok(null)
//       : err(
//           analysisErrorWithCleanupFailure(
//             started.error,
//             closed.error,
//             "open_binary",
//           ),
//         );
//   }
//
//   async #waitForTransition(
//     operation: string,
//     signal: AbortSignal | undefined,
//     transition: Promise<void>,
//   ): Promise<Result<undefined, AnalysisCancelledError>> {
//     if (signal?.aborted === true)
//       return err(new AnalysisCancelledError(operation));
//     if (signal === undefined) {
//       await transition;
//       return ok(undefined);
//     }
//     return new Promise((resolve) => {
//       const onAbort = (): void => {
//         resolve(err(new AnalysisCancelledError(operation)));
//       };
//       signal.addEventListener("abort", onAbort, { once: true });
//       transition.then(
//         () => {
//           signal.removeEventListener("abort", onAbort);
//           resolve(
//             signal.aborted
//               ? err(new AnalysisCancelledError(operation))
//               : ok(undefined),
//           );
//         },
//         () => {
//           signal.removeEventListener("abort", onAbort);
//           resolve(
//             signal.aborted
//               ? err(new AnalysisCancelledError(operation))
//               : ok(undefined),
//           );
//         },
//       );
//     });
//   }
// }
//
// const isAborted = (signal: AbortSignal | undefined): boolean =>
//   signal?.aborted === true;
export const _l = 251;
