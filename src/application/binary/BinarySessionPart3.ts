export const __stub = 1;
//           )
//         : await this.#retireClient(
//             previous.client,
//             previous.route.identity.id,
//             {
//               ...(options.progress === undefined
//                 ? {}
//                 : { progress: options.progress }),
//               ...(options.retainProviderDocuments === true
//                 ? { retainDocument: true }
//                 : {}),
//             },
//           );
//     if (clearRecords) this.clearSessionRecords();
//     this.#clearRuntimeAvailability();
//     const fileResources = await this.closeWriteResources();
//     if (!closed.ok && !fileResources.ok)
//       return err(
//         analysisErrorWithCleanupFailure(
//           closed.error,
//           fileResources.error,
//           "close_binary",
//         ),
//       );
//     return closed.ok ? fileResources : closed;
//   }
//
//   async #retireClient(
//     client: AnalysisClient,
//     providerId: string,
//     options: Pick<ExecutionOptions, "progress"> & {
//       readonly retainDocument?: boolean;
//     } = {},
//   ): Promise<Result<null, AnalysisError>> {
//     this.#pendingCleanup = {
//       client,
//       providerId,
//       retainDocument: options.retainDocument === true,
//     };
//     return this.#retryPendingCleanup(options.progress);
//   }
//
//   async #retryPendingCleanup(
//     progress?: ExecutionOptions["progress"],
//     retainDocument?: boolean,
//   ): Promise<Result<null, AnalysisError>> {
//     let pending = this.#pendingCleanup;
//     if (pending === undefined) return ok(null);
//     if (retainDocument !== undefined) {
//       pending = { ...pending, retainDocument };
//       this.#pendingCleanup = pending;
//     }
//     const closed = await closeAnalysisClient(
//       pending.client,
//       pending.providerId,
//       {
//         ...(progress === undefined ? {} : { progress }),
//         ...(pending.retainDocument ? { retainDocument: true } : {}),
//       },
//     );
//     if (closed.ok) this.#pendingCleanup = undefined;
//     return closed;
//   }
//
//   async #failedOpen(
//     client: AnalysisClient,
//     providerId: string,
//     previous: SessionBinding | undefined,
//     primary: AnalysisError,
//   ): Promise<AnalysisError> {
//     const closed = await this.#retireClient(client, providerId);
//     if (!closed.ok)
//       return analysisErrorWithCleanupFailure(
//         primary,
//         closed.error,
//         "open_binary",
//       );
//     return this.#restoreAfterFailedOpen(previous, primary);
//   }
//
//   async #restoreAfterFailedOpen(
//     previous: SessionBinding | undefined,
//     primary: AnalysisError,
//   ): Promise<AnalysisError> {
//     const restored = await this.#restore(previous);
//     return restored.ok
//       ? primary
//       : analysisErrorWithCleanupFailure(primary, restored.error, "open_binary");
//   }
//
//   /** Describe the active binary session. */
//   status(): JsonValue {
//     return binarySessionStatus({
//       target: this.#active?.target,
//       route: this.#currentRoute(),
//       router: this.#providerRouter,
//       runtimeUnavailability: this.#runtimeUnavailability,
//       runId: this.#active?.runId,
//       runtimeLineageSnapshots:
//         this.#active?.client.runtimeLineageSnapshots?.() ?? [],
//       requestActivitySnapshots:
//         this.#active?.client.requestActivitySnapshots?.() ?? [],
//       providerOperationHealth:
//         this.#active?.client.operationHealthSnapshot?.() ?? null,
//     });
//   }
//
//   /** Return the immutable artifact identity captured before its provider started. */
//   activeTarget(): BinaryTarget | undefined {
//     return this.#active === undefined
//       ? undefined
//       : structuredClone(this.#active.target);
//   }
//
//   protected activeAnalysisBinding() {
//     return this.#active;
//   }
//
//   /**
//    * Invoke a provider operation against the active target.
//    * Calls may overlap, but a pending target transition prevents new calls from
//    * entering until the transition has settled.
//    */
//   execute(
//     name: Parameters<AnalysisOperationPort["execute"]>[0],
//     arguments_: Readonly<Record<string, JsonValue>>,
//     options?: Pick<ExecutionOptions, "signal" | "selectorOrigin">,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const generation = this.#transitionGeneration;
//     const call = this.#execute(name, arguments_, options, this.#transition);
//     this.#calls.set(call, generation);
//     return call.finally(() => this.#calls.delete(call));
//   }
//
//   /** Run a prompt lookup only against an already connected provider child. */
//   executeIfProviderReady(
//     name: Parameters<AnalysisOperationPort["execute"]>[0],
//     arguments_: Readonly<Record<string, JsonValue>>,
//     options?: Pick<ExecutionOptions, "signal" | "selectorOrigin">,
//   ): Promise<Result<AnalysisExecution, AnalysisError> | undefined> {
//     const active = this.#active;
//     if (
//       this.#transitionPending > 0 ||
//       active === undefined ||
//       active.client.executeIfReady === undefined
//     )
//       return Promise.resolve(undefined);
//
//     const controller = new AbortController();
//     this.#promptCompletionControllers.add(controller);
//     const signal =
//       options?.signal === undefined
//         ? controller.signal
//         : AbortSignal.any([controller.signal, options.signal]);
//     const generation = this.#transitionGeneration;
//     const call = active.client.executeIfReady(name, arguments_, {
//       ...options,
//       signal,
//     });
//     this.#calls.set(call, generation);
//     return call.finally(() => {
//       this.#calls.delete(call);
//       this.#promptCompletionControllers.delete(controller);
//     });
//   }
//
//   /** Admit one composed request until its result and session bookkeeping settle. */
//   withAdmittedAnalysis<Value>(
//     operationName: string,
//     signal: AbortSignal | undefined,
//     operation: (analysis: AnalysisOperationPort) => Promise<Value>,
//   ): Promise<Result<Value, AnalysisError>> {
//     const generation = this.#transitionGeneration;
//     const transition = this.#transition;
//     const call = (async (): Promise<Result<Value, AnalysisError>> => {
//       const admission = await this.#waitForTransition(
//         operationName,
//         signal,
//         transition,
//       );
//       if (!admission.ok) return admission;
//       return ok(
//         await operation({
//           execute: (name, arguments_, options) =>
//             this.#execute(name, arguments_, options, Promise.resolve()),
//         }),
//       );
//     })();
//     // Register synchronously before a lifecycle transition can snapshot calls.
//     this.#calls.set(call, generation);
//     return call.finally(() => this.#calls.delete(call));
//   }
//
//   async #execute(
//     name: Parameters<AnalysisOperationPort["execute"]>[0],
//     arguments_: Readonly<Record<string, JsonValue>>,
//     options: Pick<ExecutionOptions, "signal" | "selectorOrigin"> | undefined,
//     transition: Promise<void>,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const transitioned = await this.#waitForTransition(
//       name,
//       options?.signal,
//       transition,
//     );
//     if (!transitioned.ok) return transitioned;
//     const prepared = prepareSessionExecution({
//       active: this.#active,
//       operation: name,
//       parameters: arguments_,
//       nativeSourceAdmitted: this.#active?.nativeSourceAdmitted === true,
//       unboundOperationError: (operation, route) =>
//         this.#providerRouter.unboundOperationError(operation, route),
//       lookupSnapshot: (target, profile, operation, parameters) =>
//         operation === "decode_interface_builder" ||
//         operation === "inspect_asset_catalog" ||
//         operation === "inspect_keyed_archive" ||
//         operation === "trace_dylib_resolution"
//           ? undefined
//           : this.lookupSnapshot(target, profile, operation, parameters),
//     });
//     if (!prepared.ok) return prepared;
//     const { active, capability, profile, cacheable, cached } = prepared.value;
//     if (cached !== undefined) return ok(cached);
//     // A failed reply cannot prove that a dispatched metadata write rolled back.
//     // Stop replay before dispatch, including reads overlapping the write.
//     if (capability.effects.mutatesArtifact) this.invalidateSnapshot();
//     const call = active.client.execute(name, arguments_, options);
//     const result = await call;
//     const profiled = bindExecutionTarget(
//       commitExecutionProfile(name, result, profile),
//       name,
//       active.target,
//     );
//     const execution =
//       profiled.ok &&
//       (name === "procedure_callers" || name === "procedure_callees") &&
//       profiled.value.relationshipCoverage === undefined
//         ? ok({
//             ...profiled.value,
//             relationshipCoverage: {
//               status: "unknown" as const,
//               reason:
//                 "Provider did not report relationship coverage for this observation.",
//             },
//           })
//         : profiled;
//     // A successful Ghidra operation proves this client's native source snapshot
//     // was admitted; a composite health response and parsed path do not.
//     if (
//       execution.ok &&
//       capability.provider.id === "ghidra" &&
//       this.#active === active
//     )
export const _l = 253;
