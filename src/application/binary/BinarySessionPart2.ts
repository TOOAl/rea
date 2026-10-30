export const __stub = 1;
//       admitted: BinarySessionOpenOptions,
//     ) => Promise<Result<ResolvedSessionOpen, AnalysisError>>,
//     options: BinarySessionOpenOptions,
//   ): Promise<Result<BinaryTarget, AnalysisError>> {
//     return this.#serialize(async (admittedThrough) => {
//       const admitted = await this.#withLoadedSnapshot(options);
//       if (!admitted.ok) return admitted;
//       return this.#openWithinTransition(
//         admittedThrough,
//         () => resolve(admitted.value),
//         admitted.value,
//       );
//     });
//   }
//
//   /** Read the staged snapshot only after earlier lifecycle transitions have settled. */
//   async #withLoadedSnapshot(
//     options: BinarySessionOpenOptions,
//   ): Promise<Result<BinarySessionOpenOptions, AnalysisError>> {
//     if (options.loadSnapshot === undefined) return ok(options);
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     const loaded = await options.loadSnapshot();
//     if (!loaded.ok) return loaded;
//     const { loadSnapshot: _loaded, ...rest } = options;
//     return ok({ ...rest, snapshot: loaded.value });
//   }
//
//   async #openWithinTransition(
//     admittedThrough: number,
//     resolve: () => Promise<Result<ResolvedSessionOpen, AnalysisError>>,
//     options: Pick<BinarySessionOpenOptions, "signal" | "snapshot">,
//   ): Promise<Result<BinaryTarget, AnalysisError>> {
//     if (this.#externalMutationCleanupFailure?.cleanupIncomplete === true)
//       return err(this.#externalMutationCleanupFailure);
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     const resolved = await resolve();
//     if (!resolved.ok) return resolved;
//     const { target, route, sameTarget } = resolved.value;
//     const { profile } = route;
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     const activeProfile = this.#active?.profile;
//     const sameProfile =
//       activeProfile === null || activeProfile === undefined
//         ? profile === null
//         : profile !== null && analysisProfilesEqual(activeProfile, profile);
//     await this.#drainCalls(admittedThrough);
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     const pendingClosed = await this.#retryPendingCleanup();
//     if (!pendingClosed.ok) return pendingClosed;
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     const retained = sameTarget && sameProfile ? this.#active : undefined;
//     if (retained !== undefined) {
//       const fastPath = await this.#tryRetainedFastPath(
//         retained,
//         target,
//         options,
//       );
//       if (fastPath !== undefined) return fastPath;
//     }
//     const previous = this.#active;
//     this.#active = undefined;
//     if (previous !== undefined) {
//       const closed = await this.#retireClient(
//         previous.client,
//         previous.route.identity.id,
//       );
//       if (!closed.ok) {
//         // A failed open retires the provider cache, not the investigation.
//         // Preserve Evidence and Unknown history for export and recovery.
//         this.clearSnapshot();
//         this.#clearRuntimeAvailability();
//         return closed;
//       }
//     }
//     if (isAborted(options.signal))
//       return err(
//         await this.#restoreAfterFailedOpen(
//           previous,
//           new AnalysisCancelledError("open_binary"),
//         ),
//       );
//     const runId = randomUUID();
//     const client = route.createClient(target, { runId });
//     const started = await client.execute("health", {}, options);
//     if (!started.ok) {
//       return err(
//         await this.#failedOpen(
//           client,
//           route.identity.id,
//           previous,
//           started.error,
//         ),
//       );
//     }
//     if (isAborted(options.signal)) {
//       return err(
//         await this.#failedOpen(
//           client,
//           route.identity.id,
//           previous,
//           new AnalysisCancelledError("open_binary"),
//         ),
//       );
//     }
//     this.#active = {
//       target,
//       client,
//       profile,
//       route,
//       runId,
//       nativeSourceAdmitted: false,
//     };
//     this.#clearRuntimeAvailability();
//     this.resetSnapshotInvalidation();
//     if (options.snapshot === undefined) {
//       if (profile === null) this.clearSnapshot();
//       else this.selectSnapshot(target, profile);
//     }
//     if (options.snapshot !== undefined) {
//       const imported = this.importAnalysisSnapshot(options.snapshot);
//       if (!imported.ok) {
//         this.#active = undefined;
//         return err(
//           await this.#failedOpen(
//             client,
//             route.identity.id,
//             previous,
//             imported.error,
//           ),
//         );
//       }
//     }
//     return ok(target);
//   }
//
//   /** Serialize an external mutation and retire the potentially stale analysis. */
//   withAdmittedExternalMutation<Value>(
//     _path: string | undefined,
//     signal: AbortSignal | undefined,
//     operation: () => Promise<Result<Value, AnalysisError>>,
//     retirementFailure: (
//       value: Result<Value, AnalysisError>,
//       error: AnalysisError,
//     ) => AnalysisError,
//     operationName = "execute_rizin_command",
//     cleanupRecovery?: (
//       failure: AnalysisError | undefined,
//     ) => Promise<Result<null, AnalysisError>>,
//   ): Promise<Result<Result<Value, AnalysisError>, AnalysisError>> {
//     return this.#serialize(async (admittedThrough) => {
//       if (isAborted(signal))
//         return err(new AnalysisCancelledError(operationName));
//       await this.#drainCalls(admittedThrough);
//       if (isAborted(signal))
//         return err(new AnalysisCancelledError(operationName));
//
//       if (this.#externalMutationCleanupFailure?.cleanupIncomplete === true) {
//         if (cleanupRecovery === undefined)
//           return err(this.#externalMutationCleanupFailure);
//         const recovered = await cleanupRecovery(
//           this.#externalMutationCleanupFailure,
//         );
//         if (!recovered.ok) return recovered;
//         if (this.#externalMutationCleanupFailure.cleanupIncomplete)
//           return err(this.#externalMutationCleanupFailure);
//         this.#externalMutationCleanupFailure = undefined;
//       }
//
//       const pendingCleanup = await this.#retryPendingCleanup();
//       if (!pendingCleanup.ok) return pendingCleanup;
//
//       const activeAtDispatch = this.#active;
//       if (activeAtDispatch?.route.binding?.identity.id === "ghidra")
//         return err(
//           new AnalysisOutputError(
//             operationName,
//             "Close the active Ghidra session explicitly before an external mutation; rebinding would discard its ephemeral analysis edits.",
//           ),
//         );
//       // A protocol reply does not prove that background writers have stopped.
//       // Retire the old analysis and require an explicit fresh open rather than
//       // silently binding a snapshot while an unrestricted command can still write.
//       const retireTarget = activeAtDispatch !== undefined;
//       this.invalidateSnapshot();
//       const value = await operation();
//       this.#externalMutationCleanupFailure =
//         !value.ok && value.error.cleanupIncomplete ? value.error : undefined;
//       if (!retireTarget) return ok(value);
//
//       const retired = await this.#closeActive({}, false);
//       if (!retired.ok) return err(retirementFailure(value, retired.error));
//       return ok(value);
//     });
//   }
//
//   /** Close the active target, if any. */
//   close(
//     options: Pick<ExecutionOptions, "progress"> & {
//       readonly retainProviderDocuments?: boolean;
//     } = {},
//   ): Promise<Result<null, AnalysisError>> {
//     return this.#serialize(async (admittedThrough) => {
//       await this.#drainCalls(admittedThrough);
//       return this.#closeActive(options);
//     });
//   }
//
//   /** Drain earlier requests, save an immutable snapshot, and close under one lifecycle lock. */
//   closeWithSnapshot(
//     path: string,
//     overwrite: boolean,
//     options: Pick<ExecutionOptions, "progress"> = {},
//   ): Promise<Result<SavedAnalysisSnapshot, AnalysisError>> {
//     return this.#serialize(async (admittedThrough) => {
//       await this.#drainCalls(admittedThrough);
//       const snapshot = this.exportAnalysisSnapshot();
//       if (!snapshot.ok) return snapshot;
//       const written = await this.writeAnalysisSnapshot(
//         snapshot.value,
//         path,
//         overwrite,
//       );
//       if (!written.ok) return written;
//       const closed = await this.#closeActive(options);
//       return closed.ok
//         ? ok({
//             ...written.value,
//             primitive_entries: snapshot.value.entries.length,
//             workflow_entries: snapshot.value.workflow_entries.length,
//             evidence_records: snapshot.value.evidence_bundle.records.length,
//           })
//         : closed;
//     });
//   }
//
//   async #closeActive(
//     options: Pick<ExecutionOptions, "progress"> & {
//       readonly retainProviderDocuments?: boolean;
//     },
//     clearRecords = true,
//   ): Promise<Result<null, AnalysisError>> {
//     const previous = this.#active;
//     this.#active = undefined;
//     const closed =
//       previous === undefined
//         ? await this.#retryPendingCleanup(
//             options.progress,
//             options.retainProviderDocuments,
export const _l = 253;
