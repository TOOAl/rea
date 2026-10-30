export const __stub = 1;
//           : err(identity.error);
//       }),
//     );
//   }
//
//   async #batchPseudocode(
//     ready: readonly BatchReadyItem[],
//     signal?: AbortSignal,
//   ): Promise<Result<BatchDecompileItem, AnalysisCancelledError>[]> {
//     return Promise.all(
//       ready.map(async ({ address, procedure, providerProcedure }) => {
//         const result = await this.#call(
//           "procedure_pseudo_code",
//           { procedure: providerProcedure },
//           signal,
//           procedure.status === "resolved" ? "provider" : undefined,
//         );
//         if (!result.ok && isAnalysisCancellation(result.error))
//           return err(result.error);
//         const item: BatchDecompileItem = !result.ok
//           ? {
//               address,
//               procedure,
//               status: "error",
//               error: projectAnalysisError(result.error),
//             }
//           : typeof result.value !== "string" || result.value.length === 0
//             ? {
//                 address,
//                 procedure,
//                 status: "error",
//                 error: projectAnalysisError(
//                   new AnalysisOutputError(
//                     "procedure_pseudo_code",
//                     "provider returned empty pseudocode",
//                   ),
//                 ),
//               }
//             : {
//                 address,
//                 procedure,
//                 status: "ok",
//                 pseudocode: result.value,
//               };
//         return ok(item);
//       }),
//     );
//   }
//
//   async #batchProcedureIdentity(
//     address: string,
//     signal?: AbortSignal,
//   ): Promise<Result<BatchProcedureIdentity, AnalysisCancelledError>> {
//     const observed = await this.#call("address_name", { address }, signal);
//     if (!observed.ok && isAnalysisCancellation(observed.error))
//       return err(observed.error);
//     const named =
//       observed.ok &&
//       (typeof observed.value === "string" || observed.value === null);
//     return ok({
//       status: "resolved" as const,
//       address,
//       name: named ? observed.value : null,
//       ...(named
//         ? {}
//         : {
//             name_error: projectAnalysisError(
//               observed.ok
//                 ? new AnalysisOutputError(
//                     "address_name",
//                     "provider returned an invalid entry label",
//                   )
//                 : observed.error,
//             ),
//           }),
//     });
//   }
//
//   async #callGraph(
//     input: {
//       readonly address: string;
//       readonly direction: "forward" | "backward";
//     },
//     signal?: AbortSignal,
//   ): EnhancedResult {
//     const relation = input.direction === "forward" ? "callees" : "callers";
//     const tool =
//       input.direction === "forward" ? "procedure_callees" : "procedure_callers";
//     const limitations = new Set<string>();
//     const resolved = await this.#observe(
//       "procedure_address",
//       { procedure: input.address },
//       signal,
//     );
//     if (!resolved.ok) return resolved;
//     for (const limitation of resolved.value.limitations)
//       limitations.add(limitation);
//     const startAddress = resolved.value.result;
//     if (typeof startAddress !== "string" || startAddress.length === 0)
//       return err(
//         new AnalysisOutputError(
//           "procedure_address",
//           "provider returned no canonical procedure address",
//         ),
//       );
//     const discovered = new Set([startAddress]);
//     const queue: Array<{ address: string; depth: number }> = [
//       { address: startAddress, depth: 0 },
//     ];
//     let queueIndex = 0;
//     const graph: Record<string, JsonValue[]> = {};
//
//     while (queueIndex < queue.length) {
//       const current = queue[queueIndex++];
//       if (current === undefined) continue;
//       const level = String(current.depth);
//       graph[level] ??= [];
//
//       const result = await this.#observe(
//         tool,
//         { procedure: current.address },
//         signal,
//         "provider",
//       );
//       if (!result.ok) {
//         if (isAnalysisCancellation(result.error)) return result;
//         graph[level].push({
//           address: current.address,
//           status: "error",
//           error: projectAnalysisError(result.error),
//         });
//         continue;
//       }
//       const related = parseRelatedAddresses(result.value.result, relation);
//       if (!related.ok) {
//         graph[level].push({
//           address: current.address,
//           status: "error",
//           error: projectAnalysisError(related.error),
//         });
//         continue;
//       }
//       for (const limitation of result.value.limitations)
//         limitations.add(limitation);
//       const reportedCoverage = result.value.relationshipCoverage;
//       const coverage = reportedCoverage ?? {
//         status: "unknown" as const,
//         reason: "Provider did not report relationship coverage.",
//       };
//       const relationshipLimitations =
//         reportedCoverage === undefined
//           ? [
//               ...result.value.limitations,
//               "Provider did not report relationship coverage.",
//             ]
//           : [
//               ...(reportedCoverage.status === "partial"
//                 ? reportedCoverage.limitations
//                 : reportedCoverage.status === "unknown"
//                   ? [reportedCoverage.reason]
//                   : []),
//               ...("diagnostics" in reportedCoverage
//                 ? reportedCoverage.diagnostics
//                 : []),
//             ];
//       const nodeLimitations = [...new Set(relationshipLimitations)].sort(
//         compareUnicodeCodePoints,
//       );
//       graph[level].push({
//         address: current.address,
//         status: "ok",
//         calls: [...related.value],
//         relationship_coverage: coverage,
//         ...(nodeLimitations.length === 0
//           ? {}
//           : { limitations: nodeLimitations }),
//       });
//       for (const address of related.value) {
//         if (!discovered.has(address)) {
//           discovered.add(address);
//           queue.push({ address, depth: current.depth + 1 });
//         }
//       }
export const _l = 183;
