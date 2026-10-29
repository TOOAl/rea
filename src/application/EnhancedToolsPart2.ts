export const __stub = 1;
//           call.input.max_records,
//           signal,
//         );
//       case "get_objc_classes":
//         return this.#objcClasses(call.input.pattern, signal);
//       case "get_objc_protocols":
//         return this.#objcProtocols(signal);
//       case "batch_decompile":
//         return this.#batchDecompile(call.input.addresses, signal);
//       case "get_call_graph":
//         return this.#callGraph(call.input, signal);
//       case "analyze_swift_types":
//         return this.#analyzeSwiftTypes(call.input, signal);
//       case "find_xrefs_to_name":
//         return this.#findXrefs(call.input.name, signal);
//       case "binary_overview":
//         return this.#binaryOverview(signal);
//       case "analyze_function":
//         return this.#analyzeFunction(call.input, signal);
//       case "inspect_native_api":
//         return this.#inspectNativeApi(call.input, signal);
//       case "trace_feature":
//         return traceLiteralFeature(
//           (name, arguments_, operationSignal) =>
//             this.#call(name, arguments_, operationSignal),
//           (name, arguments_, operationSignal) =>
//             this.#observe(name, arguments_, operationSignal),
//           call.input,
//           signal,
//         );
//       case "trace_call_path":
//         return traceCallPath(
//           (name, arguments_, operationSignal, selectorOrigin) =>
//             this.#call(name, arguments_, operationSignal, selectorOrigin),
//           (name, arguments_, operationSignal, selectorOrigin) =>
//             this.#observe(name, arguments_, operationSignal, selectorOrigin),
//           call.input,
//           signal,
//         );
//       case "trace_native_values":
//         return traceNativeValues(this.analysis, call.input, signal);
//       case "trace_native_ui_action": {
//         return traceNativeUiAction(this.analysis, call.input, signal);
//       }
//     }
//   }
//
//   #executeTracing(
//     name: "trace_feature" | "trace_call_path",
//     input: unknown,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     if (name === "trace_call_path") {
//       const parsed = enhancedInputSchemas.trace_call_path.safeParse(input);
//       if (!parsed.success) return invalidEnhancedInput(name, parsed.error);
//       return this.executeValidated({ name, input: parsed.data }, signal);
//     }
//     const parsed = enhancedInputSchemas.trace_feature.safeParse(input);
//     if (!parsed.success) return invalidEnhancedInput(name, parsed.error);
//     return this.executeValidated({ name, input: parsed.data }, signal);
//   }
//
//   #executeFunctionAnalysis(
//     name: "analyze_function" | "inspect_native_api",
//     input: unknown,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     if (name === "analyze_function") {
//       const parsed = enhancedInputSchemas.analyze_function.safeParse(input);
//       if (!parsed.success) return invalidEnhancedInput(name, parsed.error);
//       return this.executeValidated({ name, input: parsed.data }, signal);
//     }
//     const parsed = enhancedInputSchemas.inspect_native_api.safeParse(input);
//     if (!parsed.success) return invalidEnhancedInput(name, parsed.error);
//     return this.executeValidated({ name, input: parsed.data }, signal);
//   }
//
//   async #analyzeFunction(
//     input: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     const result = await this.#call("analyze_function", input, signal);
//     return result.ok ? parseFunctionDossier(result.value) : result;
//   }
//
//   async #inspectNativeApi(
//     input: z.output<typeof enhancedInputSchemas.inspect_native_api>,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     const analysisInput = enhancedInputSchemas.analyze_function.parse({
//       procedure: input.procedure,
//     });
//     const result = await this.#call("analyze_function", analysisInput, signal);
//     if (!result.ok) return result;
//     const parsed = parseFunctionDossier(result.value);
//     if (!parsed.ok) return parsed;
//     const dossier = functionDossierSchema.parse(parsed.value);
//     return ok(jsonValueSchema.parse(projectNativeApiInspection(dossier)));
//   }
//
//   async #objcClasses(pattern: string, signal?: AbortSignal): EnhancedResult {
//     const names = await this.#allAddressed("list_names", signal);
//     return names.ok ? ok(discoverObjcClasses(names.value, pattern)) : names;
//   }
//
//   #inspectNativeDispatchMetadata(
//     maxRecords: number,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     return inspectNativeDispatch(this.analysis, maxRecords, signal);
//   }
//
//   async #objcProtocols(signal?: AbortSignal): EnhancedResult {
//     const names = await this.#allAddressed("list_names", signal);
//     return names.ok ? ok(discoverObjcProtocols(names.value)) : names;
//   }
//
//   async #batchDecompile(
//     addresses: readonly string[],
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     const resolutions = await Promise.all(
//       addresses.map(async (address) => {
//         const result = await resolveProcedureAddress(
//           this.#call.bind(this),
//           address,
//           signal,
//         );
//         return { address, result };
//       }),
//     );
//     const resolutionCancellation = firstAnalysisCancellation(
//       resolutions.map(({ result }) => result),
//     );
//     if (resolutionCancellation !== undefined)
//       return err(resolutionCancellation);
//
//     const identities = await this.#batchIdentities(resolutions, signal);
//     const ready: BatchReadyItem[] = [];
//     for (const identity of identities) {
//       if (!identity.ok) return err(identity.error);
//       ready.push(identity.value);
//     }
//     const decompilations = await this.#batchPseudocode(ready, signal);
//     const items: BatchDecompileItem[] = [];
//     for (const decompilation of decompilations) {
//       if (!decompilation.ok) return err(decompilation.error);
//       items.push(decompilation.value);
//     }
//     const succeeded = items.filter(({ status }) => status === "ok").length;
//     return ok({
//       items,
//       total: items.length,
//       succeeded,
//       failed: items.length - succeeded,
//     });
//   }
//
//   async #batchIdentities(
//     resolutions: readonly BatchResolution[],
//     signal?: AbortSignal,
//   ): Promise<Result<BatchReadyItem, AnalysisCancelledError>[]> {
//     return Promise.all(
//       resolutions.map(async ({ address, result }) => {
//         if (!result.ok)
//           return ok({
//             address,
//             providerProcedure: address,
//             procedure: {
//               status: "unknown" as const,
//               error: projectAnalysisError(result.error),
//             },
//           });
//         const identity = await this.#batchProcedureIdentity(
//           result.value,
//           signal,
//         );
//         return identity.ok
//           ? ok({
//               address,
//               providerProcedure: result.value,
//               procedure: identity.value,
//             })
export const _l = 183;
