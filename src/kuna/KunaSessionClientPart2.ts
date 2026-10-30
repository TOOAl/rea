export const __stub = 1;
//         await this.#startProject(installation.value);
//       const answer = await this.#answer(
//         operation,
//         parameters,
//         installation.value,
//         options,
//       );
//       if (!answer.ok) return answer;
//       if (cancelled(options.signal))
//         return err(new AnalysisCancelledError(operation));
//       return ok(
//         this.#execution(
//           kunaLimitations(operation),
//           installation.value,
//           answer.value,
//         ),
//       );
//     } catch (cause: unknown) {
//       if (cancelled(options.signal))
//         return err(new AnalysisCancelledError(operation, { cause }));
//       return err(failure(operation, cause));
//     }
//   }
//
//   /**
//    * Release everything this session owns. A failed close keeps reporting its
//    * failure, and each later call retries the cleanup that remains.
//    */
//   async close(): Promise<Result<null, AnalysisError>> {
//     if (this.#closed) return ok(null);
//     if (!this.#closing) {
//       this.#closing = true;
//       this.#session.abort();
//     }
//     // Cancellation starts process shutdown; its completion proves whether it
//     // is safe to remove private copies and exposes any retained cleanup owner.
//     // An admitted request may create a shared reader after shutdown begins.
//     while (this.#active.size > 0) await Promise.allSettled(this.#active);
//     this.#references.clear();
//     this.#strings.clear();
//     this.#dropSingleFunctionTexts();
//     await this.#project;
//     await this.#inventory;
//     const failures: ProviderCleanupError[] = [];
//     // Kuna runs in its own process group; an export no other session wants
//     // must stop before this session reports itself closed.
//     if (this.#key !== undefined) {
//       const settled = await this.#cache.settled(this.#key);
//       if (!settled.ok) failures.push(settled.error);
//     }
//     const commands = await this.#commands.close();
//     if (!commands.ok) failures.push(commands.error);
//     if (failures.length > 0)
//       return err(
//         new ProviderCleanupError(
//           KUNA_PROVIDER_ID,
//           failures.flatMap((failed) => failed.cleanupResources),
//           {
//             reason: failures
//               .map((failed) =>
//                 String(failed.diagnostics?.["reason"] ?? failed.message),
//               )
//               .join("; "),
//           },
//         ),
//       );
//     this.#releasePin?.();
//     this.#releasePin = undefined;
//     this.#closed = true;
//     return ok(null);
//   }
//
//   #execution(
//     operationLimitations: readonly string[],
//     installation: KunaInstallation,
//     answer: Answer,
//   ): AnalysisExecution {
//     const source = answer.source;
//     const files =
//       source?.kind !== "project-export"
//         ? []
//         : (answer.files ?? []).map((file) => ({
//             facet: file.facet,
//             file: file.path,
//             file_sha256:
//               Object.values(source.project.manifest.files).find(
//                 ({ path }) => path === file.path,
//               )?.sha256 ?? null,
//             byte_offset: file.byteOffset,
//             byte_length: file.byteLength,
//           }));
//     // Preserve the direct text source shape; combined answers retain every
//     // component once, including its producing file digest and byte range.
//     const recordedFiles =
//       files.length === 1 ? files[0] : files.length === 0 ? {} : { files };
//     return createAnalysisExecution(
//       answer.result,
//       {
//         id: KUNA_PROVIDER_ID,
//         name: "Kuna",
//         version: installation.version,
//       },
//       {
//         // Kuna's identity is in the analysis profile; the raw result records
//         // only where file-backed text came from.
//         ...(source === null &&
//         answer.referenceSource === undefined &&
//         answer.stringSource === undefined
//           ? {}
//           : {
//               rawResult: {
//                 ...(source === null
//                   ? {}
//                   : {
//                       source:
//                         source.kind === "single-function"
//                           ? { kind: "single-function" }
//                           : {
//                               kind: "project-export",
//                               key: source.project.key,
//                               directory: source.project.directory,
//                               ...recordedFiles,
//                             },
//                       project_export: this.#exportState(),
//                     }),
//                 ...(answer.referenceSource === undefined
//                   ? {}
//                   : { references: answer.referenceSource }),
//                 ...(answer.stringSource === undefined
//                   ? {}
//                   : { strings: answer.stringSource }),
//               },
//             }),
//         limitations: [...operationLimitations, ...answer.limitations],
//         ...(answer.relationshipCoverage === undefined
//           ? {}
//           : { relationshipCoverage: answer.relationshipCoverage }),
//         locations: [
//           { kind: "artifact-path", path: this.#target.path },
//           ...answer.locations,
//         ],
//         ...(this.#profile === undefined
//           ? {}
//           : { analysisProfile: this.#profile }),
//       },
//     );
//   }
//
//   /** Where the background export stands, for callers deciding whether to wait. */
//   #exportState(): JsonValue {
//     if (this.#reader !== undefined)
//       return { state: "ready", key: this.#reader.project.key };
//     if (this.#project === undefined) return { state: "not-started" };
//     if (this.#exportFailure !== undefined)
//       return { state: "failed", reason: this.#exportFailure };
//     return {
//       state: "building",
//       phase: this.#status?.phase ?? null,
//       inventory_functions: this.#status?.inventory?.length ?? null,
//     };
//   }
//
//   async #answer(
//     operation: KunaOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Answer, AnalysisError>> {
//     if (operation === "list_documents")
//       return ok({
//         result: [this.#target.path],
//         source: null,
//         locations: [],
//         limitations: [],
//       });
//     if (
//       operation === "xrefs" ||
//       operation === "procedure_callers" ||
//       operation === "procedure_callees"
//     )
//       return this.#referenceAnswer(
//         operation,
//         parameters,
//         installation,
//         options,
//       );
//     if (operation === "list_strings" || operation === "search_strings")
//       return this.#stringAnswer(operation, parameters, installation, options);
//     if (operation === "list_procedures" || operation === "search_procedures")
//       return this.#procedureList(operation, parameters, installation, options);
//     const inventory = await this.#ensureInventory(installation, options);
//     if (!inventory.ok) return inventory;
//     if (operation === "address_name")
//       return this.#addressName(
//         parameters,
//         inventory.value,
//         installation,
//         options,
//       );
//     const entry = this.#resolve(
//       operation,
//       parameters.procedure,
//       inventory.value,
//     );
//     if (!entry.ok) {
//       const selectedAddress =
//         operation === "procedure_address"
//           ? normalizeKunaAddress(parameters.procedure)
//           : undefined;
//       if (selectedAddress === undefined) return entry;
//       const graph = await this.#references.functionAt(
//         installation,
//         selectedAddress,
//         operation,
//         options.signal,
//       );
//       if (!graph.ok) return graph;
//       if (graph.value === undefined) return entry;
//       return ok({
//         result: graph.value.address,
//         source: null,
//         locations: [{ kind: "address", address: selectedAddress }],
//         limitations: [],
//         referenceSource: graph.value.source,
//       });
//     }
//     const locations = [
//       { kind: "address", address: entry.value.address } as const,
//     ];
//     switch (operation) {
//       case "procedure_address":
//         return ok({
//           result: entry.value.address,
//           source: null,
//           locations,
//           limitations: [],
//         });
//       case "procedure_pseudo_code": {
//         const pseudocode = await this.#pseudocode(
//           operation,
//           entry.value,
//           installation,
//           options,
//         );
//         if (!pseudocode.ok) return pseudocode;
//         return ok({ ...pseudocode.value, locations });
//       }
//       case "procedure_assembly": {
//         const assembly = await this.#assemblyText(
//           operation,
//           entry.value,
//           installation,
//           options,
//         );
//         if (!assembly.ok) return assembly;
//         return ok({ ...assembly.value, locations });
//       }
//       case "analyze_function":
//         return this.#withProject(operation, installation, options, (reader) =>
//           this.#dossier(
//             operation,
//             entry.value,
//             reader,
//             installation,
//             options.signal,
//           ),
//         );
//     }
//   }
//
//   async #stringAnswer(
//     operation: "list_strings" | "search_strings",
//     parameters: Readonly<Record<string, JsonValue>>,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Answer, AnalysisError>> {
//     const answer = await this.#own(
//       this.#strings.execute(
//         operation,
//         parameters,
//         installation,
//         AbortSignal.any([
//           this.#session.signal,
//           ...(options.signal === undefined ? [] : [options.signal]),
//         ]),
//       ),
//     );
//     return answer.ok
//       ? ok({
//           result: answer.value.result,
//           source: null,
//           stringSource: answer.value.source,
//           locations: [],
//           limitations: [],
//         })
//       : answer;
//   }
//
//   async #procedureList(
//     operation: "list_procedures" | "search_procedures",
//     parameters: Readonly<Record<string, JsonValue>>,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Answer, AnalysisError>> {
//     const query =
//       operation === "search_procedures"
//         ? analysisSearchQuerySchema.safeParse(parameters)
//         : undefined;
//     if (query !== undefined && !query.success)
//       return err(
//         analysisInputErrorFromIssues(operation, query.error.issues, parameters),
//       );
//     const inventory = await this.#ensureInventory(installation, options);
//     if (!inventory.ok) return inventory;
//     let selected = inventory.value;
//     if (query?.success === true) {
//       if (query.data.mode === "regex") {
//         const matches = await this.#queryWork.match({
//           operation,
//           pattern: query.data.pattern,
//           caseSensitive: query.data.case_sensitive,
//           values: () => inventory.value.map(({ name }) => name),
//           signal: options.signal,
//         });
//         if (!matches.ok) return matches;
//         selected = matches.value.map((index) => inventory.value[index]!);
//       } else {
//         const matches = analysisSearchPredicate(query.data);
//         selected = inventory.value.filter(({ name }) => matches(name));
//       }
//     }
//     return ok({
//       result: selected.map(({ address, name }) => ({ address, value: name })),
//       source: null,
//       locations: [],
//       limitations: [],
//     });
//   }
//
//   async #referenceAnswer(
//     operation: "xrefs" | "procedure_callers" | "procedure_callees",
//     parameters: Readonly<Record<string, JsonValue>>,
//     installation: KunaInstallation,
//     options: ExecutionOptions,
//   ): Promise<Result<Answer, AnalysisError>> {
//     const field = operation === "xrefs" ? "address" : "procedure";
//     const selected = await this.#referenceAddress(
//       operation,
//       parameters[field],
//       field,
//       installation,
//       options,
//     );
//     if (!selected.ok) return selected;
//     const address = selected.value;
//     const locations = [{ kind: "address" as const, address }];
//     if (operation === "xrefs") {
//       const references = await this.#references.incoming(
//         installation,
//         address,
//         options.signal,
//       );
//       if (!references.ok) return references;
//       return ok({
//         result: [...references.value.addresses],
//         source: null,
//         locations,
//         limitations: [],
//         referenceSource: {
//           kind: "kuna-xrefs",
//           direction: "to",
//           target: address,
//           sha256: references.value.sha256,
export const _l = 373;
