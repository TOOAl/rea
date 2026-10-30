export const __stub = 1;
//         await this.call("disasm", {
//           addr: fn.address,
//           offset,
//           max_instructions: 100,
//         }),
//       );
//       if (page.asm === null || page.error !== undefined)
//         throw new AnalysisProtocolError(
//           `IDA disassembly failed: ${page.error ?? "missing assembly"}`,
//         );
//       this.verifyAssembly(fn, page.asm);
//       if (result === undefined) result = page.asm;
//       else result.lines.push(...page.asm.lines);
//       offset = nextOffset(page.cursor, offset);
//     }
//     if (result === undefined)
//       throw new AnalysisProtocolError("IDA omitted assembly.");
//     return result;
//   }
//
//   private verifyAssembly(fn: IdaFunction, asm: IdaDisassembly): void {
//     if (asm.start_ea !== fn.address || asm.name !== fn.name)
//       throw new AnalysisProtocolError(
//         "IDA disassembly identifies a different function than the resolved entry.",
//       );
//   }
//
//   async pseudocode(fn: IdaFunction): Promise<string | null> {
//     if (this.protocol === "legacy")
//       return z
//         .string()
//         .nullable()
//         .parse(await this.call("decompile_function", { address: fn.address }));
//     if (this.protocol === "native") {
//       const page = nativeDecompileSchema.parse(
//         await this.call("decompile", { addr: fn.address }),
//       );
//       if (page.addr !== fn.address)
//         throw new AnalysisProtocolError(
//           "Native IDA pseudocode identifies a different function than the resolved entry.",
//         );
//       if (!page.ok || page.error !== undefined || page.pseudocode === undefined)
//         throw new AnalysisProtocolError(
//           `Native IDA decompilation failed: ${page.error ?? "missing pseudocode"}`,
//         );
//       this.limitations.push(
//         "Native pseudocode is rendered GUI text; the upstream viewer traversal is bounded and does not establish complete source recovery.",
//       );
//       return page.pseudocode;
//     }
//     const result: string[] = [];
//     let offset: number | null = 0;
//     while (offset !== null) {
//       const page = modernDecompileSchema.parse(
//         await this.call("decompile", {
//           addr: fn.address,
//           offset,
//           max_lines: 100,
//         }),
//       );
//       if (page.code === null || page.error !== undefined)
//         throw new AnalysisProtocolError(
//           `IDA decompilation failed: ${page.error ?? "missing code"}`,
//         );
//       result.push(page.code);
//       offset = nextOffset(page.cursor, offset);
//     }
//     return result.join("\n");
//   }
//
//   async xrefs(
//     address: string,
//   ): Promise<
//     { address: string; type: string; function: IdaFunction | null }[]
//   > {
//     if (this.protocol === "legacy")
//       return legacyXrefsSchema.parse(
//         await this.call("get_xrefs_to", { address }),
//       );
//     const page = (
//       this.protocol === "native" ? nativeXrefsSchema : modernXrefsSchema
//     ).parse(await this.call("xrefs_to", { addrs: [address], limit: 1000 }))[0];
//     if (page?.xrefs == null || page.error !== undefined)
//       throw new AnalysisProtocolError(
//         `IDA xrefs failed: ${page?.error ?? "missing references"}`,
//       );
//     if (page.more !== undefined) this.referencesTruncated = page.more;
//     if (page.more === true)
//       this.limitations.push(
//         "Upstream xrefs_to capped results at 1000 references; additional references remain unknown.",
//       );
//     return page.xrefs.map((xref) => ({
//       address: xref.addr,
//       type: xref.type,
//       function: xref.fn,
//     }));
//   }
//
//   async relationships(
//     fn: IdaFunction,
//     direction: "callers" | "callees",
//   ): Promise<IdaRelationships> {
//     const queries: string[] = [];
//     const result = new Map<string, ReturnType<typeof identity>>();
//     let coverage: RelationshipCoverage = {
//       status: "unknown",
//       reason: "The legacy relationship response does not report coverage.",
//     };
//     if (this.readsCallGraph(direction)) {
//       coverage = await this.addCallGraphCallees(fn, result);
//       return {
//         items: [...result.values()],
//         coverage,
//         availability:
//           coverage.status === "unknown"
//             ? { available: false, reason: coverage.reason }
//             : { available: true },
//       };
//     }
//     if (this.protocol === "legacy") {
//       const value = await this.call(
//         direction === "callers" ? "get_callers" : "get_callees",
//         { function_address: fn.address },
//       );
//       const items =
//         direction === "callers"
//           ? z.array(idaFunctionSchema).parse(value)
//           : legacyCalleesSchema.parse(value);
//       for (const item of items) {
//         if ("type" in item && item.type === "external")
//           result.set(item.address, identity({ ...item, size: "unknown" }));
//         else queries.push(item.name);
//       }
//     } else if (direction === "callers") {
//       this.limitations.push(
//         "Upstream xrefs classify references as code or data, without proving call edges. Direct callers are unavailable in this profile.",
//       );
//       return {
//         items: [],
//         availability: {
//           available: false,
//           reason:
//             "Upstream xrefs do not establish direct caller relationships.",
//         },
//         coverage: {
//           status: "unknown",
//           reason:
//             "Upstream xrefs do not establish direct caller relationships.",
//         },
//       };
//     } else {
//       const page = (
//         this.protocol === "native" ? nativeCalleesSchema : modernCalleesSchema
//       ).parse(
//         await this.call("callees", { addrs: [fn.address], limit: 500 }),
//       )[0];
//       if (page?.callees == null || page.error !== undefined)
//         throw new AnalysisProtocolError(
//           `IDA callees failed: ${page?.error ?? "missing callees"}`,
//         );
//       if (page.more === true)
//         this.limitations.push(
//           "Upstream callees capped results at 500; additional callees remain unknown.",
//         );
//       coverage =
//         page.more === true
//           ? {
//               status: "partial",
//               limitations: [
//                 "Upstream callees capped results at 500; additional callees remain unknown.",
//               ],
//             }
//           : { status: "complete" };
//       for (const item of page.callees) {
//         if ("type" in item && item.type === "external")
//           result.set(
//             item.addr,
//             identity({ address: item.addr, name: item.name, size: "unknown" }),
//           );
//         else queries.push(item.addr);
//       }
//     }
export const _l = 182;
