export const __stub = 1;
//       ? err(new AnalysisCancelledError(operation))
//       : result;
//   }
//
//   async #execute(
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options?: ExecutionOptions,
//     readyOnly = false,
//   ) {
//     if (this.#closed || this.#closing)
//       return err(
//         new AnalysisProtocolError(
//           "IDA session is closing or closed; reopen the target.",
//         ),
//       );
//     if (wasCancelled(options))
//       return err(new AnalysisCancelledError(operation));
//     if (operation !== "health" && !isIdaOperation(operation))
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "ida",
//           operation,
//           "This integration admits read-only analysis operations only.",
//         ),
//       );
//     if (
//       operation !== "health" &&
//       !idaProfileAdmits(operation, this.config.mode)
//     )
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "ida",
//           operation,
//           "This operation is available for the modern headless profile only.",
//         ),
//       );
//     if (
//       operation === "procedure_callers" &&
//       idaProtocol(this.config) !== "legacy"
//     )
//       return err(
//         new AnalysisCapabilityUnavailableError(
//           "ida",
//           operation,
//           "This upstream profile does not prove direct callers.",
//         ),
//       );
//     if (operation !== "health") {
//       const parsed = parseIdaInput(operation, parameters);
//       if (!parsed.ok) return parsed;
//       parameters = parsed.value;
//     }
//     const document = parameters.document;
//     if (
//       document !== undefined &&
//       (typeof document !== "string" ||
//         (!sameIdaHostPath(document, this.target.path) &&
//           (this.target.sourcePath === undefined ||
//             !sameIdaHostPath(document, this.target.sourcePath))))
//     )
//       return err(
//         new AnalysisInputError(operation, undefined, [
//           {
//             path: ["document"],
//             reason: "invalid_value",
//             expected: this.target.path,
//             message:
//               "IDA document must be the REA-bound target; omit document or use its admitted path.",
//           },
//         ]),
//       );
//     const failureContext: IdaOperationFailureContext = {
//       runner: undefined,
//       metadataBefore: undefined,
//       metadataAfter: undefined,
//       postOperationIdentityCheck: "not_attempted",
//       parameters,
//     };
//     try {
//       if (!readyOnly) await this.#start();
//       const before = await this.#observe(options);
//       failureContext.metadataBefore = before;
//       if (wasCancelled(options)) throw new AnalysisCancelledError(operation);
//       if (operation === "health") return this.#health(before);
//       if (!isIdaOperation(operation))
//         throw new AnalysisProtocolError(
//           "IDA operation changed after validation.",
//         );
//       const runner = this.#runner(options);
//       failureContext.runner = runner;
//       const result = await runner.run(operation, parameters);
//       if (wasCancelled(options)) throw new AnalysisCancelledError(operation);
//       failureContext.postOperationIdentityCheck = "started";
//       const after = await this.#observe(
//         options,
//         (observed) => (failureContext.metadataAfter = observed),
//       );
//       failureContext.postOperationIdentityCheck = "verified";
//       if (wasCancelled(options)) throw new AnalysisCancelledError(operation);
//       return ok(
//         createAnalysisExecution(result, IDA_PROVIDER_IDENTITY, {
//           rawResult: {
//             upstream: this.connection.serverInfo(),
//             metadata_before: before,
//             metadata_after: after,
//             observations: jsonValueSchema.parse(runner.raw),
//           },
//           limitations: [...IDA_LIMITATIONS, ...runner.limitations],
//           ...(runner.relationshipCoverage === undefined
//             ? {}
//             : { relationshipCoverage: runner.relationshipCoverage }),
//           ...(runner.referencesTruncated !== undefined
//             ? { referencesTruncated: runner.referencesTruncated }
//             : {}),
//           locations: [
//             { kind: "artifact-path", path: this.target.path },
//             ...runner.locations,
//           ],
//           ...(this.profile === undefined
//             ? {}
//             : { analysisProfile: this.profile }),
//         }),
//       );
//     } catch (cause: unknown) {
//       return this.#failure(operation, cause, options, failureContext);
//     }
//   }
//
//   #runner(options: ExecutionOptions | undefined): IdaOperationRunner {
//     return new IdaOperationRunner(
//       this.connection,
//       idaProtocol(this.config),
//       this.#database,
//       {
//         signal: options?.signal,
//         selectorOrigin: options?.selectorOrigin,
//         x86Only: isX86OnlyTarget(this.target),
//         callGraphAvailable: this.#callGraphAdvertised,
//         surveyAvailable: this.#surveyAdvertised,
//         admittedDocument: this.target.path,
//       },
//     );
//   }
//
//   #health(metadata: JsonValue) {
//     return ok(
//       createAnalysisExecution(
//         {
//           ready: true,
//           mode: this.config.mode,
//           database: this.#database ?? null,
//           upstream: this.connection.serverInfo(),
//           metadata,
//           lifecycle: this.#lifecycle,
//         },
//         IDA_PROVIDER_IDENTITY,
//         {
//           limitations: IDA_LIMITATIONS,
//           ...(this.profile === undefined
//             ? {}
//             : { analysisProfile: this.profile }),
//         },
//       ),
//     );
//   }
//
//   #failure(
//     operation: string,
//     cause: unknown,
//     options: ExecutionOptions | undefined,
//     context: IdaOperationFailureContext,
//   ) {
//     let failure: AnalysisError;
//     if (wasCancelled(options))
//       failure = new AnalysisCancelledError(operation, {
//         cause,
//         ...(cause instanceof AnalysisError
//           ? {
//               capturedOutput: cause.capturedOutput,
//               diagnostics: cause.diagnostics,
//               partialObservation: cause.partialObservation,
//               cleanup:
//                 cause.cleanup ??
//                 (cause.cleanupIncomplete
//                   ? {
//                       reason: cause.message,
//                       resources: cause.cleanupResources,
//                     }
//                   : undefined),
//             }
//           : {}),
//       });
//     else if (
//       cause instanceof ProviderAdapterError &&
//       cause.operation === "transport"
//     )
//       failure = new ProviderAdapterError("ida", operation, {
//         cause,
//         capturedOutput: cause.capturedOutput,
//         partialObservation: cause.partialObservation,
//         cleanup: cause.cleanup,
//         diagnostics: {
//           ...cause.diagnostics,
//           recovery:
//             "Check the configured upstream MCP registration and selected target; see docs/ida-provider.md.",
//         },
//       });
//     else if (
//       cause instanceof AnalysisError &&
//       (cause.partialObservation !== undefined ||
//         cause.cleanupIncomplete ||
//         cause.capturedOutput !== undefined)
//     )
export const _l = 214;
