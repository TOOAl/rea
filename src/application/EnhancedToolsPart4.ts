export const __stub = 1;
//     }
//     return ok({
//       graph,
//       limitations: [...limitations].sort(compareUnicodeCodePoints),
//     });
//   }
//
//   async #analyzeSwiftTypes(
//     input: z.output<typeof enhancedInputSchemas.analyze_swift_types>,
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     const procedures = await this.#allAddressed("list_procedures", signal);
//     if (!procedures.ok) return procedures;
//     const symbols = await this.#allAddressed("list_names", signal);
//     if (
//       !symbols.ok &&
//       !(symbols.error instanceof AnalysisCapabilityUnavailableError)
//     )
//       return symbols;
//     const result = categorizeSwiftTypes(
//       procedures.value,
//       input,
//       symbols.ok ? symbols.value : [],
//     );
//     return ok(
//       symbols.ok
//         ? result
//         : {
//             ...result,
//             symbol_inventory_error: projectAnalysisError(symbols.error),
//             limitations: [
//               ...result.limitations,
//               "The provider's symbol inventory is unavailable; demangled procedures could not be joined to their Swift aliases.",
//             ],
//           },
//     );
//   }
//
//   async #findXrefs(name: string, signal?: AbortSignal): EnhancedResult {
//     const names = await this.#allAddressed("list_names", signal);
//     if (!names.ok) return names;
//     const resolved = names.value.find((entry) => entry.name === name);
//     if (resolved === undefined)
//       return ok({ status: "unresolved", name, reason: "name_not_found" });
//
//     const xrefs = await this.#call(
//       "xrefs",
//       { address: resolved.address },
//       signal,
//     );
//     if (!xrefs.ok) return xrefs;
//     if (
//       !Array.isArray(xrefs.value) ||
//       xrefs.value.some((xref) => typeof xref !== "string")
//     )
//       return err(
//         new AnalysisOutputError(
//           "xrefs",
//           "provider returned an invalid address list",
//         ),
//       );
//     return ok({
//       status: "resolved",
//       name,
//       address: resolved.address,
//       xrefs: xrefs.value,
//     });
//   }
//
//   async #binaryOverview(signal?: AbortSignal): EnhancedResult {
//     const document = await resolveAnalysisDocument(
//       this.analysis,
//       undefined,
//       signal,
//     );
//     if (!document.ok) return document;
//     const [segmentsResult, proceduresResult, stringsResult] = await Promise.all(
//       [
//         this.#call("list_segments", {}, signal),
//         this.#call("list_procedures", {}, signal),
//         this.#call("list_strings", {}, signal),
//       ],
//     );
//     if (
//       !segmentsResult.ok &&
//       !(segmentsResult.error instanceof AnalysisCapabilityUnavailableError)
//     )
//       return segmentsResult;
//     if (!proceduresResult.ok) return proceduresResult;
//     if (!stringsResult.ok) return stringsResult;
//
//     const segments = segmentsResult.ok
//       ? parseSegments(segmentsResult.value)
//       : undefined;
//     if (segments !== undefined && !segments.ok) return segments;
//     const procedureCount = parseListCount(proceduresResult.value, "procedures");
//     if (!procedureCount.ok) return procedureCount;
//     const stringCount = parseListCount(stringsResult.value, "strings");
//     if (!stringCount.ok) return stringCount;
//
//     const observedSegments = segments?.ok ? segments.value : undefined;
//     const imageBase =
//       observedSegments === undefined
//         ? undefined
//         : parseSegmentImageBase(observedSegments);
//
//     return ok({
//       document: document.value,
//       ...(imageBase === undefined ? {} : { image_base: imageBase }),
//       ...(observedSegments === undefined
//         ? {}
//         : {
//             segments: observedSegments.map(
//               ({ name, start, end, image_base, address_space }) => ({
//                 name,
//                 start,
//                 end,
//                 length: addressDistance(start, end),
//                 ...(image_base === undefined ? {} : { image_base }),
//                 ...(address_space === undefined ? {} : { address_space }),
//               }),
//             ),
//             segment_count: observedSegments.length,
//           }),
//       procedure_count: procedureCount.value,
//       string_count: stringCount.value,
//     });
//   }
//
//   async #allAddressed(
//     tool: "list_names" | "list_procedures",
//     signal?: AbortSignal,
//   ) {
//     const result = await this.#call(tool, {}, signal);
//     if (!result.ok) return result;
//     const parsed = z
//       .array(z.object({ address: z.string(), value: z.string() }))
//       .safeParse(result.value);
//     return parsed.success
//       ? ok(parsed.data.map(({ address, value: name }) => ({ address, name })))
//       : err(
//           new AnalysisOutputError(
//             tool,
//             "provider returned an invalid inventory",
//           ),
//         );
//   }
//
//   async #call(
//     name: AnalysisOperation,
//     arguments_: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//     selectorOrigin?: ExecutionOptions["selectorOrigin"],
//   ): Promise<Result<JsonValue, AnalysisError>> {
//     const execution = await this.#observe(
//       name,
//       arguments_,
//       signal,
//       selectorOrigin,
//     );
//     return execution.ok ? ok(execution.value.result) : execution;
//   }
//
//   async #observe(
//     name: AnalysisOperation,
//     arguments_: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//     selectorOrigin?: ExecutionOptions["selectorOrigin"],
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     if (isAborted(signal)) return err(new AnalysisCancelledError(name));
//     const execution = await this.analysis.execute(name, arguments_, {
//       ...(signal === undefined ? {} : { signal }),
//       ...(selectorOrigin === undefined ? {} : { selectorOrigin }),
//     });
//     if (!execution.ok) return execution;
//     if (isAborted(signal)) return err(new AnalysisCancelledError(name));
//     return execution;
//   }
// }
//
// const isAborted = (signal: AbortSignal | undefined): boolean =>
//   signal?.aborted === true;
export const _l = 182;
