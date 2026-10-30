export const __stub = 1;
//     const querySet = new Set(queries);
//     if (this.protocol === "native" && querySet.size > 0) {
//       const rows = modernLookupBatchSchema.parse(
//         await this.call("lookup_funcs", { queries: [...querySet] }),
//       );
//       const byQuery = new Map(rows.map((row) => [row.query, row]));
//       if (
//         rows.length !== querySet.size ||
//         byQuery.size !== rows.length ||
//         rows.some((row) => !querySet.has(row.query))
//       )
//         throw new AnalysisProtocolError(
//           "Native IDA returned an inconsistent callee lookup batch.",
//         );
//       for (const query of querySet) {
//         const resolved = identity(
//           this.lookupFunction(query, byQuery.get(query)),
//         );
//         result.set(resolved.address, resolved);
//       }
//     } else {
//       for (const query of querySet) {
//         const resolved = identity(await this.resolve(query));
//         result.set(resolved.address, resolved);
//       }
//     }
//     return {
//       items: [...result.values()],
//       coverage,
//       availability: { available: true },
//     };
//   }
//
//   async run(
//     operation: IdaOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//   ): Promise<JsonValue> {
//     const query =
//       operation === "search_procedures" || operation === "search_strings"
//         ? analysisSearchQuerySchema.parse(parameters)
//         : undefined;
//     const matches =
//       query === undefined ? undefined : analysisSearchPredicate(query);
//     if (operation === "list_procedures" || operation === "search_procedures") {
//       const items = (await this.functions()).map((fn) => ({
//         address: fn.address,
//         value: fn.name,
//       }));
//       return matches === undefined
//         ? items
//         : items.filter(({ value }) => matches(value));
//     }
//     if (operation === "list_strings" || operation === "search_strings") {
//       const nativePattern =
//         this.protocol === "native" && query?.mode === "literal"
//           ? nativeLiteralSearchPattern(query.pattern, query.case_sensitive)
//           : undefined;
//       const items = await this.strings(nativePattern);
//       return matches !== undefined
//         ? items.filter(({ value }) => matches(value))
//         : parameters.address === undefined
//           ? items
//           : items.filter(
//               ({ address }) =>
//                 address === idaAddressSchema.parse(parameters.address),
//             );
//     }
//     if (operation === "list_documents") {
//       if (this.options.admittedDocument === undefined)
//         throw new AnalysisProtocolError("The admitted IDA program is unknown.");
//       return [this.options.admittedDocument];
//     }
//     if (operation === "resolve_containing_procedure") {
//       const queried = idaAddressSchema.parse(parameters.address);
//       this.locations.push({ kind: "address", address: queried });
//       return this.containingProcedure(queried);
//     }
//     if (operation === "xrefs") {
//       const inspectedAddress = idaAddressSchema.parse(parameters.address);
//       this.locations.push({ kind: "address", address: inspectedAddress });
//       return (await this.xrefs(inspectedAddress)).map(({ address }) => address);
//     }
//     const fn = await this.resolve(
//       z.string().min(1).parse(parameters.procedure),
//       this.options.selectorOrigin === "provider" ? undefined : operation,
//     );
//     this.locations.push({ kind: "address", address: fn.address });
//     switch (operation) {
//       case "procedure_address":
//         return fn.address;
//       case "procedure_pseudo_code":
//         return this.pseudocode(fn);
//       case "procedure_assembly":
//         return lines(await this.assembly(fn)).join("\n");
//       case "procedure_callers":
//       case "procedure_callees": {
//         if (operation === "procedure_callers" && this.protocol !== "legacy")
//           throw new AnalysisProtocolError(
//             "This IDA MCP profile cannot distinguish direct callers from other code references.",
//           );
//         const relationships = await this.relationships(
//           fn,
//           operation === "procedure_callers" ? "callers" : "callees",
//         );
//         this.relationshipCoverage = relationships.coverage;
//         return relationships.items.map(({ address }) => address);
//       }
//       case "read_function_instructions":
//         return functionInstructionWindowSchema.parse({
//           procedure: identity(fn),
//           instructions: lines(await this.assembly(fn)),
//           limitations: IDA_LIMITATIONS,
//         });
//       case "analyze_function":
//         return this.dossier(fn);
//     }
//   }
//
//   private async dossier(fn: IdaFunction): Promise<JsonValue> {
//     const asm = await this.assembly(fn);
//     const pseudocode = await this.pseudocode(fn);
//     const callers = await this.relationships(fn, "callers");
//     const callees = await this.relationships(fn, "callees");
//     this.relationshipCoverage = combineFunctionRelationshipCoverage(
//       callers.coverage,
//       callees.coverage,
//     );
//     const signature =
//       asm.return_type == null || asm.arguments == null
//         ? null
//         : `${asm.return_type} ${fn.name}(${asm.arguments.map((arg) => `${arg.type} ${arg.name}`).join(", ")})`;
//     return functionDossierSchema.parse({
//       procedure: { ...identity(fn), signature, locals: [] },
//       pseudocode: pseudocode ?? "",
//       assembly: lines(asm),
//       comments: [],
//       callers: callers.items,
//       callees: callees.items,
//       incoming_references: [],
//       outgoing_references: [],
//       referenced_strings: [],
//       referenced_names: [],
//       basic_blocks: [],
//       native_api: null,
//       native_value_flow: null,
//       facet_availability: {
//         pseudocode:
//           pseudocode === null
//             ? { available: false, reason: "IDA did not supply pseudocode." }
//             : { available: true },
//         assembly: { available: true },
//         comments: {
//           available: false,
//           reason: "IDA adapter does not expose typed comments.",
//         },
//         callers: callers.availability,
//         callees: callees.availability,
//         references: {
//           available: false,
//           reason: "IDA adapter does not expose typed reference edges.",
//         },
//         strings_names: {
//           available: false,
//           reason:
//             "IDA adapter does not expose function-referenced strings and names.",
//         },
//         cfg: {
//           available: false,
//           reason: "IDA adapter does not expose basic blocks.",
//         },
//       },
//       limitations: [
//         ...IDA_LIMITATIONS,
//         ...this.limitations,
//         "Stack frame records are not evidence of source locals. Rendered comments do not identify regular versus inline origin.",
//         ...(pseudocode === null ? ["Pseudocode is unavailable."] : []),
//       ],
//     });
//   }
// }
export const _l = 180;
