export const __stub = 1;
//  * Entries are content-addressed and immutable. A build runs in private
//  * staging and is published by one directory rename, so a reader sees a
//  * complete entry or none, and concurrent publishers of one key keep the first.
//  * File digests are recorded once at publish and checked on every first read.
//  * Recency is the entry directory's mtime; publishing evicts the least recently
//  * used entries above the size cap, never an entry pinned by this process.
//  */
// export class KunaProjectCache {
//   readonly #root: string;
//   readonly #maxBytes: number;
//   readonly #launcher: KunaProcessLauncher | undefined;
//   /** Builds new requests may join, at most one per key. */
//   readonly #inflight = new Map<string, InflightBuild>();
//   /** Every build not yet settled, including abandoned ones a retry replaced. */
//   readonly #unfinished = new Set<InflightBuild>();
//   readonly #verified = new Map<string, KunaProject>();
//   readonly #pins = new Map<string, number>();
//   /** One eviction decision at a time; exports themselves remain concurrent. */
//   #eviction: Promise<void> = Promise.resolve();
//   #capacity: "within_limit" | "pinned" | "building" = "within_limit";
//   #maintenance: Promise<void> | undefined;
//   #maintenanceRequested = false;
//   /** Builds whose process tree could not be proven stopped; their staging stays. */
//   readonly #retainedProcesses: RetainedProcess[] = [];
//   /** Only resources whose process cleanup is proven may be retried as files. */
//   readonly #retainedFiles = new Map<
//     string,
//     { readonly key: string | null; readonly error: ProviderCleanupError }
//   >();
//
//   constructor(
//     root: string,
//     options: {
//       readonly maxBytes: number;
//       readonly launcher?: KunaProcessLauncher;
//     },
//   ) {
//     this.#root = root;
//     this.#maxBytes = options.maxBytes;
//     this.#launcher = options.launcher;
//   }
//
//   /** Keep an entry from eviction while this process serves it. */
//   pin(key: string): () => void {
//     this.#pins.set(key, (this.#pins.get(key) ?? 0) + 1);
//     let released = false;
//     return () => {
//       if (released) return;
//       released = true;
//       const count = (this.#pins.get(key) ?? 1) - 1;
//       if (count === 0) {
//         this.#pins.delete(key);
//         if (this.#capacity !== "within_limit") this.#scheduleEviction();
//       } else this.#pins.set(key, count);
//     };
//   }
//
//   /**
//    * Return the verified published entry for a key, or undefined when none is
//    * usable. A corrupt or tampered entry is removed and reported as absent.
//    */
//   async lookup(
//     key: string,
//     signal?: AbortSignal,
//   ): Promise<KunaProject | undefined> {
//     const verified = this.#verified.get(key);
//     if (verified !== undefined) {
//       // Another process may have evicted it since this one verified it.
//       if (await this.#touch(key)) return verified;
//       this.#verified.delete(key);
//       return undefined;
//     }
//     const entry = join(this.#root, "projects", key);
//     let text: string;
//     try {
//       text = await this.#readBounded(join(entry, "manifest.json"));
//     } catch (cause: unknown) {
//       if (isMissing(cause)) return undefined;
//       if (!(cause instanceof RangeError)) throw cause;
//       await this.#discard(key);
//       return undefined;
//     }
//     const manifest = parseManifest(text);
//     if (manifest?.key !== key) {
//       await this.#discard(key);
//       return undefined;
//     }
//     const directory = join(entry, "project");
//     for (const file of Object.values(manifest.files)) {
//       let observed: { readonly sha256: string; readonly bytes: number };
//       try {
//         observed = await hashStableFile(join(directory, file.path), signal);
//       } catch (cause: unknown) {
//         signal?.throwIfAborted();
//         if (!isDamaged(cause)) throw cause;
//         await this.#discard(key);
//         return undefined;
//       }
//       if (observed.sha256 !== file.sha256 || observed.bytes !== file.bytes) {
//         await this.#discard(key);
//         return undefined;
//       }
//     }
//     const parsed = await readKunaExport(
//       directory,
//       manifest.files,
//       manifest.summary,
//       signal,
//     );
//     if (!parsed.ok) {
//       await this.#discard(key);
//       return undefined;
//     }
//     const project = { key, directory, manifest, ...parsed.value };
//     if (!(await this.#touch(key))) return undefined;
//     this.#verified.set(key, project);
//     return project;
//   }
//
//   /**
//    * Return the entry for a request, building and publishing it when absent.
//    * Concurrent requests for one key share one Kuna run; the run is cancelled
//    * only when every waiting request has been cancelled.
//    */
//   async build(
//     request: KunaProjectRequest,
//   ): Promise<Result<KunaProject, AnalysisError>> {
//     if (request.signal?.aborted === true)
//       return err(new AnalysisCancelledError(KUNA_EXPORT_OPERATION));
//     const key = kunaProjectKey({
//       targetSha256: request.targetSha256,
//       kunaSha256: request.installation.sha256,
//       kunaVersion: request.installation.version,
//       jobs: request.installation.configuration.jobs,
//     });
//     const running = this.#inflight.get(key);
//     // A build whose waiters all left is winding down; a new request starts afresh.
//     if (running !== undefined && !running.controller.signal.aborted)
//       return this.#await(running, request);
//     const controller = new AbortController();
//     const listeners = new Set<(status: KunaExportStatus) => void>();
//     // #produce reports its first status only after an await, once `created` exists.
//     const promise = this.#produce(key, request, controller.signal, (status) => {
//       created.status = status;
//       for (const listener of listeners) listener(status);
//     });
//     const created: InflightBuild = {
//       key,
//       promise,
//       controller,
//       listeners,
//       status: undefined,
//       waiters: 0,
//     };
//     this.#inflight.set(key, created);
//     this.#unfinished.add(created);
//     void promise.then(() => {
//       this.#unfinished.delete(created);
//       if (this.#inflight.get(key) === created) this.#inflight.delete(key);
//       if (this.#unfinished.size === 0 && this.#capacity === "building")
//         this.#scheduleEviction();
//     });
//     return this.#await(created, request);
//   }
//
//   /**
//    * Wait until a build that every waiter abandoned has stopped its Kuna
//    * process and removed its staging. A build another request still waits for
//    * keeps running and is not awaited.
//    */
//   async settled(key: string): Promise<Result<null, ProviderCleanupError>> {
//     await Promise.allSettled(
//       [...this.#unfinished]
//         .filter((entry) => entry.key === key && entry.controller.signal.aborted)
//         .map((entry) => entry.promise),
//     );
//     await this.#retryProcesses((retained) => retained.key === key);
//     await this.#retryFiles(key);
//     return cleanupResult(
//       [...this.#retainedProcesses, ...this.#retainedFiles.values()]
//         .filter((retained) => retained.key === key)
//         .map(({ error }) => error),
//     );
//   }
//
//   /** Wait for builds, retry safe file removal, and report unresolved cleanup. */
//   async close(): Promise<Result<null, ProviderCleanupError>> {
//     await Promise.allSettled(
//       [...this.#unfinished].map((entry) => entry.promise),
//     );
//     while (this.#maintenance !== undefined) await this.#maintenance;
//     await this.#retryProcesses(() => true);
//     await this.#retryFiles();
//     return cleanupResult([
//       ...this.#retainedProcesses.map(({ error }) => error),
//       ...[...this.#retainedFiles.values()].map(({ error }) => error),
//     ]);
export const _l = 197;
