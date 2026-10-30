export const __stub = 1;
//       await this.call("get_function_by_name", { name: found.name }),
//     );
//     if (entry.name !== found.name)
//       throw new AnalysisProtocolError(
//         "IDA function identity changed during lookup.",
//       );
//     return entry;
//   }
//
//   /** Parse one lookup row: a function, an expected "missing" answer, or a producer failure. */
//   private lookupOutcome(
//     query: string,
//     item: z.infer<typeof modernLookupBatchSchema>[number] | undefined,
//   ): { readonly fn: IdaFunction } | { readonly missing: string } {
//     if (item?.query !== query)
//       throw new AnalysisProtocolError(
//         `IDA function lookup answered for a different query than ${JSON.stringify(query)}.`,
//       );
//     if (
//       item.fn === null &&
//       item.error !== null &&
//       MISSING_PROCEDURE_ANSWERS.has(item.error)
//     )
//       return { missing: item.error };
//     if (item.fn === null || item.error !== null)
//       throw new AnalysisProtocolError(
//         `IDA function lookup failed for ${query}: ${item.error ?? "missing function"}`,
//       );
//     return { fn: item.fn };
//   }
//
//   private lookupFunction(
//     query: string,
//     item: z.infer<typeof modernLookupBatchSchema>[number] | undefined,
//     requestedBy?: string,
//   ): IdaFunction {
//     const outcome = this.lookupOutcome(query, item);
//     if ("fn" in outcome) return outcome.fn;
//     if (requestedBy === undefined)
//       throw new AnalysisProtocolError(
//         `IDA function lookup failed for ${query}: ${outcome.missing}`,
//       );
//     throw new AnalysisInputError(
//       requestedBy,
//       {
//         cause: new AnalysisProtocolError(
//           `IDA function lookup failed for ${query}: ${outcome.missing}`,
//         ),
//       },
//       [
//         {
//           path: [],
//           reason: "invalid_value",
//           message: `IDA could not resolve procedure ${JSON.stringify(query)}: ${outcome.missing}.`,
//         },
//       ],
//     );
//   }
//
//   /** The containing function of an address, or why none contains it. */
//   private async containingProcedure(address: string): Promise<JsonValue> {
//     const item = modernLookupSchema.parse(
//       await this.call("lookup_funcs", { queries: [address] }),
//     )[0];
//     const outcome = this.lookupOutcome(address, item);
//     if ("fn" in outcome)
//       return {
//         query_address: address,
//         found: true,
//         procedure: identity(outcome.fn),
//       };
//     return {
//       query_address: address,
//       found: false,
//       procedure: null,
//       reason: (await this.addressInSegment(address))
//         ? "not_in_procedure"
//         : "outside_segments",
//     };
//   }
//
//   /** Segment membership from the database-scoped minimal survey; a missing fact is a failure. */
//   private async addressInSegment(address: string): Promise<boolean> {
//     if (this.options.surveyAvailable === false)
//       throw new AnalysisProtocolError(
//         "The upstream server does not advertise survey_binary, so segment membership cannot be established.",
//       );
//     const { segments } = surveySegmentsSchema.parse(
//       await this.call("survey_binary", { detail_level: "minimal" }),
//     );
//     const value = BigInt(address);
//     return segments.some(({ start, end }) => start <= value && value < end);
//   }
//
//   /** True only for modern callee reads on targets not proven x86-only; x86 reads never reach the graph code. */
//   private readsCallGraph(direction: "callers" | "callees"): boolean {
//     return (
//       this.protocol === "modern" &&
//       direction === "callees" &&
//       this.options.x86Only === false
//     );
//   }
//
//   /** Add processor-neutral function callees on targets where upstream `callees` is unsound. */
//   private async addCallGraphCallees(
//     fn: IdaFunction,
//     result: Map<string, ReturnType<typeof identity>>,
//   ): Promise<RelationshipCoverage> {
//     const graph =
//       this.options.callGraphAvailable === false
//         ? unavailableCallGraph("the upstream server does not advertise it")
//         : await readCallGraphCallees(
//             (tool, args) => this.call(tool, args),
//             fn.address,
//           );
//     this.limitations.push(...graph.limitations);
//     for (const callee of graph.callees)
//       if (!result.has(callee.address))
//         result.set(callee.address, identity({ ...callee, size: "unknown" }));
//     return graph.coverage;
//   }
//
//   async strings(
//     nativePattern?: string,
//   ): Promise<{ address: string; value: string }[]> {
//     if (this.protocol === "native")
//       this.limitations.push(IDA_NATIVE_STRING_LIMITATION);
//     const result: { address: string; value: string }[] = [];
//     let offset: number | null = 0;
//     while (offset !== null) {
//       const current: number = offset;
//       if (this.protocol === "legacy") {
//         const page = legacyPageSchema.parse(
//           await this.call("list_strings", { offset, count: 0 }),
//         );
//         for (const item of page.data) {
//           const s = legacyStringSchema.parse(item);
//           result.push({ address: s.address, value: s.string });
//         }
//         offset = page.next_offset;
//       } else {
//         const page = (
//           this.protocol === "native" ? nativeStringsSchema : modernStringsSchema
//         ).parse(
//           await this.call("find_regex", {
//             pattern:
//               this.protocol === "native"
//                 ? (nativePattern ?? "[\\s\\S]*")
//                 : "(?s).*",
//             offset,
//             limit: 100,
//           }),
//         );
//         result.push(
//           ...page.matches.map((s) => ({ address: s.addr, value: s.string })),
//         );
//         offset = nextOffset(page.cursor, current);
//       }
//       if (offset !== null && offset <= current)
//         throw new AnalysisProtocolError(
//           "IDA MCP string pagination did not advance.",
//         );
//     }
//     return result;
//   }
//
//   async assembly(fn: IdaFunction): Promise<IdaDisassembly> {
//     if (this.protocol === "legacy") {
//       const result = disassemblySchema.parse(
//         await this.call("disassemble_function", { start_address: fn.address }),
//       );
//       this.verifyAssembly(fn, result);
//       return result;
//     }
//     let result: IdaDisassembly | undefined;
//     let offset: number | null = 0;
//     while (offset !== null) {
//       const page = (
//         this.protocol === "native"
//           ? nativeDisassemblySchema
//           : modernDisassemblySchema
//       ).parse(
export const _l = 182;
