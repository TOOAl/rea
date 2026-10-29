export const __stub = 1;
//   }
//
//   /** Retry stopping retained process trees; retire the staging of each one proven stopped. */
//   async #retryProcesses(
//     selected: (retained: RetainedProcess) => boolean,
//   ): Promise<void> {
//     for (const retained of this.#retainedProcesses.filter(selected)) {
//       const stopped = await retained.owner?.stop();
//       if (stopped === undefined || stopped.status === "incomplete") continue;
//       this.#retainedProcesses.splice(
//         this.#retainedProcesses.indexOf(retained),
//         1,
//       );
//       await this.#retireStaging(retained.staging, retained.key);
//     }
//   }
//
//   /** Retry only stopped file resources belonging to the closing task, or all. */
//   async #retryFiles(key?: string): Promise<void> {
//     for (const [path, retained] of [...this.#retainedFiles])
//       if (key === undefined || retained.key === key)
//         await this.#removeRetired(path).catch(() => undefined);
//   }
//
//   /**
//    * Move proven-stopped staging into trash and remove it. A failed removal
//    * stays owned as a file cleanup that close retries.
//    */
//   async #retireStaging(
//     staging: string,
//     key: string,
//   ): Promise<ProviderCleanupError | undefined> {
//     let cleanupPath = staging;
//     try {
//       const retired = join(this.#root, "trash", `build-${randomUUID()}`);
//       await rename(staging, retired);
//       cleanupPath = retired;
//       await this.#removeRetired(retired, key);
//       return undefined;
//     } catch (cause: unknown) {
//       if (cause instanceof ProviderCleanupError) return cause;
//       return this.#retainFileCleanup(cleanupPath, cause, key);
//     }
//   }
//
//   #await(
//     entry: InflightBuild,
//     request: KunaProjectRequest,
//   ): Promise<Result<KunaProject, AnalysisError>> {
//     entry.waiters += 1;
//     const onStatus = request.onStatus;
//     // Each waiter owns its registration, even when callers reuse a callback.
//     const listener =
//       onStatus === undefined
//         ? undefined
//         : (status: KunaExportStatus) => onStatus(status);
//     if (listener !== undefined) entry.listeners.add(listener);
//     return new Promise((resolve) => {
//       let settled = false;
//       const leave = () => {
//         if (listener !== undefined) entry.listeners.delete(listener);
//         entry.waiters -= 1;
//       };
//       const onAbort = () => {
//         if (settled) return;
//         settled = true;
//         leave();
//         if (entry.waiters === 0) entry.controller.abort();
//         resolve(err(new AnalysisCancelledError(KUNA_EXPORT_OPERATION)));
//       };
//       request.signal?.addEventListener("abort", onAbort, { once: true });
//       void entry.promise.then((result) => {
//         request.signal?.removeEventListener("abort", onAbort);
//         if (settled) return;
//         settled = true;
//         leave();
//         resolve(result);
//       });
//       // Replay only once cancellation is registered, so a listener may abort.
//       if (listener !== undefined && entry.status !== undefined)
//         listener(entry.status);
//     });
//   }
//
//   async #produce(
//     key: string,
//     request: KunaProjectRequest,
//     signal: AbortSignal,
//     onStatus: (status: KunaExportStatus) => void,
//   ): Promise<Result<KunaProject, AnalysisError>> {
//     let staging: string;
//     try {
//       const existing = await this.lookup(key, signal);
//       if (existing !== undefined) return ok(existing);
//       await Promise.all(
//         ["projects", "staging", "trash", "home"].map((name) =>
//           mkdir(join(this.#root, name), { recursive: true, mode: 0o700 }),
//         ),
//       );
//       await this.#sweep(signal);
//       staging = await mkdtemp(join(this.#root, "staging", "build-"));
//     } catch (cause: unknown) {
//       return err(kunaExportFailure(cause, signal));
//     }
//     const built = await this.#exportAndPublish(
//       key,
//       staging,
//       request,
//       signal,
//       onStatus,
//     ).catch((cause: unknown): StagedResult => ({
//       result: err(kunaExportFailure(cause, signal)),
//       retainStaging: false,
//     }));
//     if (built.retainStaging) return built.result;
//     // Only a proven-stopped build may enter trash. A failed write, crash or
//     // lost cleanup identity therefore never makes live staging reclaimable.
//     const retired = await this.#retireStaging(staging, key);
//     if (retired !== undefined) return err(retired);
//     if (built.result.ok)
//       // The entry is published either way; a failed eviction retries on the next publish.
//       await this.#evict(key).catch(() => undefined);
//     return built.result;
//   }
//
//   async #exportAndPublish(
//     key: string,
//     staging: string,
//     request: KunaProjectRequest,
//     signal: AbortSignal,
//     onStatus: (status: KunaExportStatus) => void,
//   ): Promise<StagedResult> {
//     const outcome = await exportKunaProject({
//       installation: request.installation,
//       targetPath: request.targetPath,
//       targetSha256: request.targetSha256,
//       workspace: staging,
//       output: join(staging, "entry", "project"),
//       signal,
//       onStatus,
//       launcher: this.#launcher,
//     });
//     if (outcome.kind === "retained") {
//       this.#retainedProcesses.push({
//         key,
//         error: outcome.error,
//         owner: outcome.owner,
//         staging,
//       });
//       return { result: err(outcome.error), retainStaging: true };
//     }
//     return {
//       result: outcome.result.ok
//         ? await this.#publish(
//             key,
//             staging,
//             request,
//             outcome.result.value,
//             signal,
//           )
//         : outcome.result,
//       retainStaging: false,
//     };
//   }
//
//   /** Record the manifest and publish the staged export under its key. */
//   async #publish(
//     key: string,
//     staging: string,
//     request: KunaProjectRequest,
//     exported: KunaExport,
//     signal: AbortSignal,
//   ): Promise<Result<KunaProject, AnalysisError>> {
//     const manifest: KunaProjectManifest = {
//       layout: CACHE_LAYOUT,
//       key,
//       inputs: {
//         target_sha256: request.targetSha256,
//         kuna_sha256: request.installation.sha256,
//         kuna_version: request.installation.version,
//         jobs: request.installation.configuration.jobs,
//       },
//       files: exported.files,
//       summary: exported.summary,
//       created_at: new Date().toISOString(),
//     };
//     const total = manifestBytes(manifest);
//     if (total > this.#maxBytes)
//       return err(
//         new AnalysisResourceConstraintError(
//           KUNA_EXPORT_OPERATION,
//           "capacity",
//           `This export occupies ${String(total)} bytes, more than the whole Kuna cache may hold.`,
//           { cache_max_bytes: this.#maxBytes, export_bytes: total },
//           {
//             remediationAction:
//               "Raise REA_KUNA_CACHE_MAX_BYTES above the export size, or analyze this target with another provider.",
export const _l = 197;
