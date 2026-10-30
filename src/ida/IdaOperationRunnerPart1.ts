export const __stub = 1;
// import { z } from "zod";
// import {
//   nativeDecompileSchema,
//   nativeDisassemblySchema,
//   nativeCalleesSchema,
//   nativeXrefsSchema,
//   nativeLiteralSearchPattern,
//   nativeStringsSchema,
// } from "./IdaNativeProtocol.js";
// import {
//   analysisSearchPredicate,
//   analysisSearchQuerySchema,
// } from "../domain/analysisSearch.js";
// import {
//   AnalysisInputError,
//   AnalysisCancelledError,
//   AnalysisProtocolError,
// } from "../domain/analysisErrorCore.js";
// import {
//   functionDossierSchema,
//   functionInstructionWindowSchema,
// } from "../domain/hopperValues.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import type { RelationshipCoverage } from "../domain/relationshipCoverage.js";
// import { combineFunctionRelationshipCoverage } from "../domain/functionCallCoverage.js";
// import { readCallGraphCallees, unavailableCallGraph } from "./IdaCallGraph.js";
// import type { IdaMcpConnection } from "./IdaMcpConnection.js";
// import type { IdaOperation } from "./IdaProviderCapabilities.js";
// import {
//   IDA_LIMITATIONS,
//   IDA_NATIVE_STRING_LIMITATION,
// } from "./IdaProviderCapabilities.js";
// import type { EvidenceLocation } from "../domain/evidence.js";
// import {
//   disassemblySchema,
//   idaAddressSchema,
//   idaFunctionSchema,
//   legacyCalleesSchema,
//   legacyPageSchema,
//   legacyStringSchema,
//   legacyXrefsSchema,
//   modernCalleesSchema,
//   modernDecompileSchema,
//   modernDisassemblySchema,
//   modernLookupSchema,
//   modernLookupBatchSchema,
//   modernPageSchema,
//   modernStringsSchema,
//   modernXrefsSchema,
//   nextOffset,
//   surveySegmentsSchema,
//   type IdaDisassembly,
//   type IdaFunction,
// } from "./IdaProtocolValues.js";
//
// /** One operation's raw source observations, retained alongside normalized results. */
// export interface IdaRawObservation {
//   readonly tool: string;
//   readonly arguments: Readonly<Record<string, JsonValue>>;
//   readonly result: JsonValue;
// }
//
// const unknownBody = {
//   available: false,
//   reason: "IDA MCP does not report complete function body ranges.",
// } as const;
// const identity = (fn: IdaFunction) => ({
//   address: fn.address,
//   name: fn.name,
//   classification: null,
//   body: unknownBody,
// });
// interface IdaRelationships {
//   readonly items: ReturnType<typeof identity>[];
//   readonly coverage: RelationshipCoverage;
//   readonly availability:
//     | { readonly available: true }
//     | { readonly available: false; readonly reason: string };
// }
//
// /** The only lookup answers upstream reports for a name or address that is not a function. */
// const MISSING_PROCEDURE_ANSWERS: ReadonlySet<string> = new Set([
//   "Not found",
//   "Not a function",
// ]);
// const lines = (asm: IdaDisassembly) =>
//   asm.lines.map(({ address, instruction }) => `${address}: ${instruction}`);
//
// /** Translate explicit analyst questions into a closed set of read-only upstream requests. */
// export class IdaOperationRunner {
//   readonly raw: IdaRawObservation[] = [];
//   readonly locations: EvidenceLocation[] = [];
//   readonly limitations: string[] = [];
//   relationshipCoverage: RelationshipCoverage | undefined;
//   /** The upstream cap flag of the last `xrefs_to` read, when the producer reported one. */
//   referencesTruncated: boolean | undefined;
//   constructor(
//     private readonly connection: IdaMcpConnection,
//     private readonly protocol: "legacy" | "modern" | "native",
//     private readonly database?: string,
//     private readonly options: {
//       readonly signal?: AbortSignal | undefined;
//       readonly selectorOrigin?: "provider" | undefined;
//       /** False when the loaded processor may not be x86, so `callees` cannot be trusted alone. */
//       readonly x86Only?: boolean;
//       /** False when the upstream server does not advertise `callgraph`. */
//       readonly callGraphAvailable?: boolean;
//       /** False when the upstream server does not advertise `survey_binary`. */
//       readonly surveyAvailable?: boolean;
//       /** The program identity REA admitted, reported by `list_documents`. */
//       readonly admittedDocument?: string;
//     } = {},
//   ) {}
//
//   async call(
//     tool: string,
//     args: Readonly<Record<string, JsonValue>>,
//   ): Promise<JsonValue> {
//     if (this.options.signal?.aborted) throw new AnalysisCancelledError(tool);
//     const scoped =
//       this.database === undefined ? args : { ...args, database: this.database };
//     const result = await this.connection.call(tool, scoped);
//     this.raw.push({ tool, arguments: scoped, result });
//     if (this.options.signal?.aborted) throw new AnalysisCancelledError(tool);
//     return result;
//   }
//
//   async functions(): Promise<IdaFunction[]> {
//     const result: IdaFunction[] = [];
//     let offset: number | null = 0;
//     while (offset !== null) {
//       const current: number = offset;
//       const value: z.infer<typeof legacyPageSchema> | undefined =
//         this.protocol === "legacy"
//           ? legacyPageSchema.parse(
//               await this.call("list_functions", { offset, count: 100 }),
//             )
//           : modernPageSchema.parse(
//               await this.call("list_funcs", {
//                 queries: { offset, count: 100 },
//               }),
//             )[0];
//       if (value === undefined)
//         throw new AnalysisProtocolError("IDA MCP omitted its function page.");
//       result.push(...value.data.map((fn) => idaFunctionSchema.parse(fn)));
//       offset = value.next_offset;
//       if (offset !== null && offset <= current)
//         throw new AnalysisProtocolError(
//           "IDA MCP function pagination did not advance.",
//         );
//     }
//     return result;
//   }
//
//   /**
//    * Resolves a procedure. When `requestedBy` names the caller's operation, an
//    * upstream "not found" or "not a function" answer is reported as invalid
//    * input; every other failed lookup stays a producer fault. `run()` passes
//    * `requestedBy` only for caller-supplied selectors. Provider-derived
//    * selectors, such as the addresses composed workflows revisit, and the
//    * callee resolution inside `relationships()` pass none, because those
//    * addresses were reported by IDA itself.
//    */
//   async resolve(query: string, requestedBy?: string): Promise<IdaFunction> {
//     if (this.protocol !== "legacy") {
//       const item = modernLookupSchema.parse(
//         await this.call("lookup_funcs", { queries: [query] }),
//       )[0];
//       return this.lookupFunction(query, item, requestedBy);
//     }
//     const address = idaAddressSchema.safeParse(
//       /^0x/iu.test(query) ? query : undefined,
//     );
//     const found = idaFunctionSchema.parse(
//       await this.call(
//         address.success ? "get_function_by_address" : "get_function_by_name",
//         address.success ? { address: address.data } : { name: query },
//       ),
//     );
//     // Legacy producers may echo an interior query or call site in address.
//     // Resolve the reported symbol again to obtain its actual entry, never infer from size.
//     const entry = idaFunctionSchema.parse(
export const _l = 182;
