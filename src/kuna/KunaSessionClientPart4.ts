export const __stub = 1;
//               source: { kind: "project-export", project: reader.project },
//             })
//           : text;
//       },
//     );
//   }
//
//   async #dossier(
//     operation: string,
//     entry: KunaInventoryFunction,
//     reader: KunaProjectReader,
//     installation: KunaInstallation,
//     signal: AbortSignal | undefined,
//   ): Promise<Result<Answer, AnalysisError>> {
//     const assembly = await reader.assembly(entry.address, operation, signal);
//     if (!assembly.ok) return assembly;
//     const pseudocode = await reader.pseudocode(entry.address, operation);
//     if (!pseudocode.ok) return pseudocode;
//     const text =
//       typeof pseudocode.value.result === "string"
//         ? pseudocode.value.result
//         : null;
//     const unavailable = (reason: string) =>
//       ({ available: false, reason }) as const;
//     const relationships = await this.#references.relationships(
//       installation,
//       entry.address,
//       operation,
//       signal,
//     );
//     if (
//       !relationships.ok &&
//       (relationships.error.cleanupIncomplete || signal?.aborted === true)
//     )
//       return relationships;
//     const callAvailability = relationships.ok
//       ? { available: true as const }
//       : unavailable(
//           relationships.error.userMessage ?? relationships.error.message,
//         );
//     const dossier = functionDossierSchema.parse({
//       procedure: {
//         address: entry.address,
//         name: entry.name,
//         classification: null,
//         body: unavailable(
//           "Kuna reports an inventory extent that is an upper bound, not observed body ranges.",
//         ),
//         signature: null,
//         locals: [],
//       },
//       pseudocode: text ?? "",
//       assembly:
//         typeof assembly.value.result === "string"
//           ? assembly.value.result.split("\n")
//           : [],
//       comments: [],
//       callers: relationships.ok ? relationships.value.callers : [],
//       callees: relationships.ok ? relationships.value.callees : [],
//       incoming_references: [],
//       outgoing_references: [],
//       referenced_strings: [],
//       referenced_names: [],
//       basic_blocks: [],
//       native_api: null,
//       native_value_flow: null,
//       facet_availability: {
//         pseudocode:
//           text === null
//             ? unavailable(
//                 pseudocode.value.limitations.at(-1) ??
//                   "Kuna did not supply pseudocode.",
//               )
//             : { available: true },
//         assembly: { available: true },
//         comments: unavailable("Kuna exports no analyst comments."),
//         callers: callAvailability,
//         callees: callAvailability,
//         references: unavailable(
//           "This provider does not report typed references.",
//         ),
//         strings_names: unavailable(
//           "This provider does not report function-referenced strings and names.",
//         ),
//         cfg: unavailable("Kuna exports no basic blocks."),
//       },
//       limitations: [
//         ...kunaLimitations("analyze_function"),
//         ...pseudocode.value.limitations,
//         KUNA_RELATIONSHIP_LIMITATION,
//         ...(relationships.ok
//           ? []
//           : [relationships.error.userMessage ?? relationships.error.message]),
//       ],
//     });
//     return ok({
//       result: dossier,
//       source: { kind: "project-export", project: reader.project },
//       files: [
//         ...(pseudocode.value.files ?? []),
//         ...(assembly.value.files ?? []),
//       ],
//       locations: [{ kind: "address", address: entry.address }],
//       limitations: [
//         ...pseudocode.value.limitations,
//         KUNA_RELATIONSHIP_LIMITATION,
//         ...(relationships.ok
//           ? []
//           : [relationships.error.userMessage ?? relationships.error.message]),
//       ],
//       referenceSource: relationships.ok
//         ? relationships.value.source
//         : {
//             available: false,
//             reason:
//               relationships.error.userMessage ?? relationships.error.message,
//           },
//       relationshipCoverage: relationships.ok
//         ? combineFunctionRelationshipCoverage(
//             relationships.value.callersCoverage,
//             relationships.value.calleesCoverage,
//           )
//         : {
//             status: "unknown",
//             reason:
//               relationships.error.userMessage ?? relationships.error.message,
//             limited_directions: ["callers", "callees"],
//           },
//     });
//   }
//
//   /** Address and name lookups over one inventory, built once. */
//   #index(inventory: readonly KunaInventoryFunction[]): InventoryIndex {
//     if (this.#inventoryIndex?.inventory === inventory)
//       return this.#inventoryIndex;
//     const byAddress = new Map<string, KunaInventoryFunction>();
//     const byName = new Map<string, KunaInventoryFunction[]>();
//     for (const entry of inventory) {
//       byAddress.set(entry.address, entry);
//       for (const name of new Set([entry.name, ...entry.aliases])) {
//         const named = byName.get(name);
//         if (named === undefined) byName.set(name, [entry]);
//         else named.push(entry);
//       }
//     }
//     this.#inventoryIndex = { inventory, byAddress, byName };
//     return this.#inventoryIndex;
//   }
//
//   async #ensureInstallation(): Promise<
//     Result<KunaInstallation, AnalysisError>
//   > {
//     this.#installation ??= inspectKunaInstallation(this.#environment).then(
//       (inspected): Result<KunaInstallation, AnalysisError> => {
//         if (!inspected.ok)
//           return err(kunaUnavailable("health", inspected.error.reason));
//         const committed = this.#profile?.parameters["kuna_sha256"];
//         if (committed !== undefined && committed !== inspected.value.sha256)
//           return err(
//             new ProviderAdapterError(KUNA_PROVIDER_ID, "health", {
//               userMessage:
//                 "The Kuna executable changed after this target was opened; reopen the target to analyze it with the current executable.",
//               diagnostics: {
//                 committed_sha256: committed,
//                 observed_sha256: inspected.value.sha256,
//               },
//             }),
//           );
//         return ok(inspected.value);
//       },
//     );
//     return this.#installation;
//   }
//
//   /** Reuse a verified export, or start building one in the background. */
//   #startProject(installation: KunaInstallation): Promise<void> {
//     if (this.#project !== undefined) return Promise.resolve();
//     // Concurrent first requests share one lookup, which verifies every
//     // export file's digest on a fresh server.
//     this.#starting ??= this.#lookupOrBuild(installation).finally(() => {
//       this.#starting = undefined;
//     });
//     return this.#starting;
//   }
//
//   async #lookupOrBuild(installation: KunaInstallation): Promise<void> {
//     const key = kunaProjectKey({
//       targetSha256: this.#target.sha256,
//       kunaSha256: installation.sha256,
//       kunaVersion: installation.version,
//       jobs: installation.configuration.jobs,
//     });
//     this.#key = key;
//     const cached = await this.#cache.lookup(key, this.#session.signal);
//     if (cached !== undefined) {
//       this.#adopt(cached);
//       this.#project = Promise.resolve(ok(cached));
//       return;
//     }
//     let listed!: (
//       inventory: readonly KunaInventoryFunction[] | undefined,
//     ) => void;
//     this.#exportInventory = new Promise((resolve) => {
//       listed = resolve;
//     });
//     this.#project = this.#cache
//       .build({
//         installation,
//         targetPath: this.#target.path,
//         targetSha256: this.#target.sha256,
//         signal: this.#session.signal,
//         onStatus: (status) => {
//           this.#status = status;
//           if (status.inventory !== null) listed(status.inventory);
//         },
//       })
//       .then((result) => {
//         listed(result.ok ? result.value.inventory : undefined);
//         if (result.ok && !this.#closing) this.#adopt(result.value);
//         else if (!result.ok && !this.#closing)
//           this.#exportFailure =
//             result.error.userMessage ?? result.error.message;
//         return result;
//       });
//   }
//
//   /** Retry the complete read when its immutable project disappears, never just one facet. */
//   async #withProject<T>(
//     operation: string,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//     read: (reader: KunaProjectReader) => Promise<Result<T, AnalysisError>>,
//   ): Promise<Result<T, AnalysisError>> {
//     for (let attempt = 0; ; attempt += 1) {
//       const reader = await this.#awaitProject(operation, options);
//       if (!reader.ok) return reader;
//       try {
//         return await read(reader.value);
//       } catch (cause: unknown) {
//         if (!isMissing(cause) || attempt !== 0) throw cause;
//         this.#invalidateProject(reader.value);
//         await this.#startProject(installation);
//       }
//     }
//   }
//
//   #invalidateProject(reader: KunaProjectReader): void {
//     // Another request may already have replaced this reader and its build.
//     if (this.#reader !== reader) return;
//     this.#releasePin?.();
//     this.#releasePin = undefined;
//     this.#reader = undefined;
//     this.#project = undefined;
//     this.#status = undefined;
//     this.#exportFailure = undefined;
//   }
//
//   #adopt(project: KunaProject): void {
//     this.#reader = this.#readerFor(project);
//     this.#dropSingleFunctionTexts();
//     this.#releasePin ??= this.#cache.pin(project.key);
//   }
//
//   #readerFor(project: KunaProject): KunaProjectReader {
//     return this.#reader?.project === project
//       ? this.#reader
//       : new KunaProjectReader(project, {
//           signal: this.#session.signal,
//           own: (work) => this.#own(work),
//         });
//   }
//
//   /** The export's failure once it has settled; undefined while it builds or after success. */
//   async #settledExportFailure(): Promise<string | undefined> {
//     const settled = await Promise.race([
//       this.#project,
//       Promise.resolve(undefined),
//     ]);
//     if (settled === undefined || settled.ok) return undefined;
//     return settled.error.userMessage ?? settled.error.message;
//   }
//
//   /** Wait for the export, reporting progress, without cancelling it for other callers. */
//   async #awaitProject(
//     operation: string,
//     options: ExecutionOptions,
//   ): Promise<Result<KunaProjectReader, AnalysisError>> {
//     if (this.#reader !== undefined) return ok(this.#reader);
//     const project = this.#project;
//     if (project === undefined)
//       return err(
//         new ProviderAdapterError(KUNA_PROVIDER_ID, operation, {
//           userMessage: "The Kuna project export was never started.",
//         }),
//       );
//     const started = Date.now();
//     const progress = options.progress;
//     // Report waiting only; Kuna exposes no measure of completed export work.
//     const timer = setInterval(() => {
//       void progress
//         ?.report({
//           phase: "kuna_export",
//           completed: 0,
//           total: null,
//           message: `Waiting for Kuna's project export (${this.#status?.phase ?? "starting"}, ${String(Math.floor((Date.now() - started) / 1000))}s elapsed); it serves this request and every later one`,
//         })
//         .catch(() => undefined);
//     }, WAIT_PROGRESS_INTERVAL_MS);
//     try {
//       const built = await waitFor(project, options.signal, operation);
//       if (!built.ok) return err(exportUnavailable(operation, built.error));
//       return ok(this.#readerFor(built.value));
//     } finally {
//       clearInterval(timer);
//     }
//   }
//
//   /** The published or building export's inventory, otherwise one `kuna functions` run. */
//   async #ensureInventory(
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<readonly KunaInventoryFunction[], AnalysisError>> {
//     if (this.#reader !== undefined) return ok(this.#reader.project.inventory);
//     const exported = this.#status?.inventory;
//     if (exported !== undefined && exported !== null) return ok(exported);
//     if (this.#inventory === undefined) {
//       // The session owns the shared run; each caller only stops waiting.
//       const run = this.#listInventory(installation);
//       this.#inventory = run;
//       void run.then((listed) => {
//         // A failed listing is retried by the next request.
//         if (!listed.ok && this.#inventory === run) this.#inventory = undefined;
//       });
//     }
//     return waitFor(this.#inventory, options.signal, "list_procedures");
//   }
//
//   /**
//    * The export lists every callable entry before it decompiles, so listings
//    * wait for that inventory. Only an export that ends without one, or none at
//    * all, leads to a separate `kuna functions` run.
//    */
//   async #listInventory(
//     installation: KunaInstallation,
//   ): Promise<Result<readonly KunaInventoryFunction[], AnalysisError>> {
//     // A concurrent text request may still be choosing between the cache and a
//     // build; its outcome decides whether an inventory already exists.
//     await this.#starting?.catch(() => undefined);
//     if (this.#reader !== undefined) return ok(this.#reader.project.inventory);
//     const exported = await this.#exportInventory;
//     if (exported !== undefined) return ok(exported);
//     const run = await this.#commands.run({
//       installation,
//       arguments: (input) => ["functions", input, "--json"],
//       operation: "list_procedures",
//       timeoutMs: installation.configuration.functionTimeoutMs,
//       outputBytes: KUNA_INVENTORY_OUTPUT_BYTES,
//       signal: this.#session.signal,
//     });
//     if (!run.ok) return run;
//     const inventory = parseKunaInventory(run.value.stdout.text);
//     return inventory.ok
//       ? ok(inventory.value)
//       : err(
//           new ProviderAdapterError(KUNA_PROVIDER_ID, "list_procedures", {
//             userMessage: `Kuna's function inventory is not usable: ${inventory.error}`,
//           }),
//         );
//   }
// }
export const _l = 370;
