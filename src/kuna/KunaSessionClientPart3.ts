export const __stub = 1;
//           bytes: references.value.bytes,
//           examined_rows: references.value.rows,
//           excluded_alias_rows: references.value.excludedAliasRows,
//         },
//       });
//     }
//     const relationships = await this.#references.relationships(
//       installation,
//       address,
//       operation,
//       options.signal,
//     );
//     if (!relationships.ok) return relationships;
//     const entries =
//       operation === "procedure_callers"
//         ? relationships.value.callers
//         : relationships.value.callees;
//     return ok({
//       result: entries.map(({ address }) => address),
//       source: null,
//       locations,
//       referenceSource: relationships.value.source,
//       limitations: [],
//       relationshipCoverage:
//         operation === "procedure_callers"
//           ? relationships.value.callersCoverage
//           : relationships.value.calleesCoverage,
//     });
//   }
//
//   /** Exact addresses are validated by the producing graph, which also owns
//    * synthetic import nodes absent from the quick function inventory. */
//   async #referenceAddress(
//     operation: string,
//     raw: unknown,
//     field: "address" | "procedure",
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<string, AnalysisError>> {
//     if (typeof raw !== "string" || raw.length === 0)
//       return err(
//         new AnalysisInputError(
//           operation,
//           { userMessage: `Kuna requires ${field}; it has no cursor.` },
//           [{ path: [field], reason: "missing_argument" }],
//         ),
//       );
//     const address = normalizeKunaAddress(raw);
//     if (address !== undefined) return ok(address);
//     if (/^0x[0-9a-f]+$/iu.test(raw))
//       return err(
//         new AnalysisInputError(
//           operation,
//           { userMessage: "The address exceeds Kuna's u64 address space." },
//           [{ path: [field], reason: "invalid_value" }],
//         ),
//       );
//     const inventory = await this.#ensureInventory(installation, options);
//     if (!inventory.ok) return inventory;
//     const entry = this.#resolve(operation, raw, inventory.value, field);
//     return entry.ok ? ok(entry.value.address) : entry;
//   }
//
//   /** Resolve an exact inventory name, alias or entry address. */
//   #resolve(
//     operation: string,
//     raw: unknown,
//     inventory: readonly KunaInventoryFunction[],
//     field: "procedure" | "address" = "procedure",
//   ): Result<KunaInventoryFunction, AnalysisError> {
//     const parsed = procedureSelectorSchema.safeParse(raw);
//     if (!parsed.success)
//       return err(
//         new AnalysisInputError(
//           operation,
//           { userMessage: `${field} is required.` },
//           [{ path: [field], reason: "missing_argument" }],
//         ),
//       );
//     const selector = parsed.data;
//     const address = normalizeKunaAddress(selector);
//     if (address !== undefined) {
//       const entry = this.#index(inventory).byAddress.get(address);
//       return entry === undefined
//         ? err(
//             new AnalysisInputError(operation, {
//               userMessage: `${address} is not a procedure entry Kuna found; list_procedures shows the entries it found.`,
//             }),
//           )
//         : ok(entry);
//     }
//     const matches = this.#index(inventory).byName.get(selector) ?? [];
//     if (matches.length === 1 && matches[0] !== undefined) return ok(matches[0]);
//     return err(
//       new AnalysisInputError(operation, {
//         userMessage:
//           matches.length === 0
//             ? `Kuna found no procedure named ${selector}; search_procedures finds similar names.`
//             : `${selector} names ${String(matches.length)} Kuna entries (${matches.map(({ address }) => address).join(", ")}); select one by address.`,
//       }),
//     );
//   }
//
//   async #addressName(
//     parameters: Readonly<Record<string, JsonValue>>,
//     inventory: readonly KunaInventoryFunction[],
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Answer, AnalysisError>> {
//     const raw = parameters.address;
//     const address = normalizeKunaAddress(raw);
//     if (address === undefined)
//       return err(
//         new AnalysisInputError(
//           "address_name",
//           {
//             userMessage:
//               "Kuna has no cursor; pass an explicit 0x-prefixed address.",
//           },
//           [{ path: ["address"], reason: "invalid_format" }],
//         ),
//       );
//     const locations = [{ kind: "address", address } as const];
//     const entry = this.#index(inventory).byAddress.get(address);
//     if (entry !== undefined)
//       return ok({
//         result: entry.name,
//         source: null,
//         locations,
//         limitations: [],
//       });
//     await this.#startProject(installation);
//     return this.#withProject(
//       "address_name",
//       installation,
//       options,
//       async (reader) => {
//         const name = await reader.dataName(
//           address,
//           "address_name",
//           options.signal,
//         );
//         if (!name.ok) return name;
//         return ok({
//           result: name.value,
//           source: { kind: "project-export", project: reader.project },
//           locations,
//           limitations: [
//             "Kuna names function entries and the data its export references; null means Kuna assigned no name at this address, not that no symbol exists.",
//           ],
//         });
//       },
//     );
//   }
//
//   async #pseudocode(
//     operation: string,
//     entry: KunaInventoryFunction,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Omit<Answer, "locations">, AnalysisError>> {
//     for (let recovered = false; ;) {
//       const reader = this.#reader;
//       if (reader !== undefined) {
//         try {
//           const text = await reader.pseudocode(entry.address, operation);
//           if (!text.ok) return text;
//           return ok({
//             ...text.value,
//             source: { kind: "project-export", project: reader.project },
//           });
//         } catch (cause: unknown) {
//           if (!isMissing(cause) || recovered) throw cause;
//           recovered = true;
//           this.#invalidateProject(reader);
//           await this.#startProject(installation);
//           continue;
//         }
//       }
//       const outcome = await this.#joinSingleFunction(
//         operation,
//         entry.address,
//         installation,
//         options.signal,
//       );
//       if (outcome === EXPORT_READY) continue;
//       if (!outcome.ok) return outcome;
//       const exportFailure = await this.#settledExportFailure();
//       return ok({
//         result: outcome.value,
//         source: { kind: "single-function" },
//         limitations: [
//           KUNA_SINGLE_FUNCTION_LIMITATION,
//           ...(exportFailure === undefined
//             ? []
//             : [
//                 `The project export failed, so later requests also use single-function runs: ${exportFailure}`,
//               ]),
//         ],
//       });
//     }
//   }
//
//   /**
//    * Wait for this address's shared single-function run, starting it when none
//    * is in flight. A caller's cancellation stops only its own wait while others
//    * still wait; the last waiter stops the run and receives how it ended,
//    * including cleanup it could not prove. A completed text answers repeats
//    * until the export can.
//    */
//   #joinSingleFunction(
//     operation: string,
//     address: string,
//     installation: KunaInstallation,
//     signal: AbortSignal | undefined,
//   ): Promise<SingleFunctionOutcome> {
//     if (cancelled(signal))
//       return Promise.resolve(err(new AnalysisCancelledError(operation)));
//     const kept = this.#singleFunctionTexts.get(address);
//     if (kept !== undefined) {
//       this.#singleFunctionTexts.delete(address);
//       this.#singleFunctionTexts.set(address, kept);
//       return Promise.resolve(ok(kept.text));
//     }
//     let run = this.#singleFunctionRuns.get(address);
//     if (run === undefined) {
//       const controller = new AbortController();
//       const created: SingleFunctionRun = {
//         controller,
//         waiters: 0,
//         outcome: this.#own(
//           this.#singleFunction(
//             operation,
//             address,
//             installation,
//             AbortSignal.any([this.#session.signal, controller.signal]),
//           ).catch((cause: unknown) => err(failure(operation, cause))),
//         ),
//       };
//       this.#singleFunctionRuns.set(address, created);
//       void created.outcome.then((outcome) => {
//         // A run whose waiters all left was already replaced or removed.
//         if (this.#singleFunctionRuns.get(address) !== created) return;
//         this.#singleFunctionRuns.delete(address);
//         if (outcome !== EXPORT_READY && outcome.ok)
//           this.#keepSingleFunctionText(address, outcome.value);
//       });
//       run = created;
//     }
//     const shared = run;
//     shared.waiters += 1;
//     return new Promise((resolve) => {
//       let waiting = true;
//       const leave = () => {
//         waiting = false;
//         shared.waiters -= 1;
//       };
//       const onAbort = () => {
//         if (!waiting) return;
//         leave();
//         if (shared.waiters > 0) {
//           resolve(err(new AnalysisCancelledError(operation)));
//           return;
//         }
//         // A run whose waiters all left winds down; a new request starts afresh.
//         if (this.#singleFunctionRuns.get(address) === shared)
//           this.#singleFunctionRuns.delete(address);
//         shared.controller.abort();
//       };
//       signal?.addEventListener("abort", onAbort, { once: true });
//       void shared.outcome.then((outcome) => {
//         signal?.removeEventListener("abort", onAbort);
//         if (waiting) leave();
//         resolve(outcome);
//       });
//     });
//   }
//
//   /** Keep a completed text within budget, dropping the least recently used. */
//   #keepSingleFunctionText(address: string, text: string): void {
//     // The export's text supersedes it; a closing session keeps nothing.
//     if (this.#reader !== undefined || this.#closing) return;
//     const bytes = Buffer.byteLength(text) + SINGLE_FUNCTION_TEXT_ENTRY_BYTES;
//     if (bytes > SINGLE_FUNCTION_TEXT_CACHE_BYTES) return;
//     this.#singleFunctionTexts.set(address, { text, bytes });
//     this.#singleFunctionTextBytes += bytes;
//     while (this.#singleFunctionTextBytes > SINGLE_FUNCTION_TEXT_CACHE_BYTES) {
//       const oldest = this.#singleFunctionTexts.entries().next().value;
//       if (oldest === undefined) break;
//       this.#singleFunctionTexts.delete(oldest[0]);
//       this.#singleFunctionTextBytes -= oldest[1].bytes;
//     }
//   }
//
//   #dropSingleFunctionTexts(): void {
//     this.#singleFunctionTexts.clear();
//     this.#singleFunctionTextBytes = 0;
//   }
//
//   /** One `kuna decompile --addr` run, admitted by the provider's run slots. */
//   async #singleFunction(
//     operation: string,
//     address: string,
//     installation: KunaInstallation,
//     signal: AbortSignal,
//   ): Promise<SingleFunctionOutcome> {
//     const prepared = await this.#commands.prepare();
//     if (!prepared.ok) return prepared;
//     const admitted = await this.#admitSingleFunction(signal);
//     if (admitted === EXPORT_READY) return admitted;
//     if (admitted === undefined)
//       return err(new AnalysisCancelledError(operation));
//     const run = await this.#commands.run({
//       installation,
//       arguments: (input) => ["decompile", input, address, "--addr"],
//       operation,
//       timeoutMs: installation.configuration.functionTimeoutMs,
//       outputBytes: KUNA_FUNCTION_TEXT_BYTES,
//       signal,
//       releaseRun: admitted,
//     });
//     return run.ok ? ok(run.value.stdout.text.replace(/\n+$/u, "")) : run;
//   }
//
//   /**
//    * A run slot, or EXPORT_READY when the export this session builds finishes
//    * first; the export then answers without another Kuna process.
//    */
//   async #admitSingleFunction(
//     signal: AbortSignal,
//   ): Promise<KunaRunRelease | undefined | typeof EXPORT_READY> {
//     const yielded = new AbortController();
//     const slot = this.#runSlots.acquire(
//       AbortSignal.any([signal, yielded.signal]),
//     );
//     const project = this.#project;
//     const exported =
//       project === undefined
//         ? undefined
//         : project.then((built) =>
//             built.ok && this.#reader !== undefined
//               ? EXPORT_READY
//               : new Promise<never>(() => undefined),
//           );
//     const admitted = await (exported === undefined
//       ? slot
//       : Promise.race([slot, exported]));
//     if (admitted !== EXPORT_READY) return admitted;
//     yielded.abort();
//     // A slot granted in the same turn is returned rather than leaked.
//     void slot.then((release) => release?.());
//     return EXPORT_READY;
//   }
//
//   async #assemblyText(
//     operation: string,
//     entry: KunaInventoryFunction,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Omit<Answer, "locations">, AnalysisError>> {
//     return this.#withProject(
//       operation,
//       installation,
//       options,
//       async (reader) => {
//         const text = await reader.assembly(
//           entry.address,
//           operation,
//           options.signal,
//         );
//         return text.ok
//           ? ok({
//               ...text.value,
export const _l = 373;
