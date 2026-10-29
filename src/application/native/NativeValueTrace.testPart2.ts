export const __stub = 1;
//         { procedure: address, max_nodes },
//       );
//
//       if (!result.ok) throw result.error;
//       const parsedResult = nativeValueTraceSchema.parse(result.value);
//       expect(parsedResult).toMatchObject({
//         total_nodes: max_nodes,
//         total_edges: max_nodes === 3 ? 0 : 1,
//         edges:
//           max_nodes === 3
//             ? []
//             : [
//                 {
//                   source: `${address}/parameter:0#2`,
//                   target: `${address}/use`,
//                   kind: "parameter-use",
//                 },
//               ],
//       });
//       expect(
//         parsedResult.nodes
//           .filter(({ kind }) => kind === "operation")
//           .map(({ id }) => id),
//       ).toEqual([
//         `${address}/parameter:0`,
//         `${address}/parameter:0#1`,
//         `${address}/use`,
//       ]);
//       expect(new Set(parsedResult.nodes.map(({ id }) => id)).size).toBe(
//         max_nodes,
//       );
//     },
//   );
// });
//
// const nativeFlowDossier = (
//   base: ReturnType<typeof functionDossierSchema.parse>,
//   facts: {
//     address: string;
//     name: string;
//     operations: ReturnType<typeof node>[];
//     parameters: { ordinal: number; name: string; data_type: string }[];
//   },
// ) => {
//   const { address, name, operations, parameters } = facts;
//   return jsonValueSchema.parse({
//     ...base,
//     procedure: {
//       address,
//       name,
//       classification: null,
//       body: {
//         available: false,
//         reason: "The provider did not report complete function body ranges.",
//       },
//       signature: null,
//       locals: [],
//     },
//     native_value_flow: {
//       available: true,
//       provenance: "ghidra-high-pcode",
//       operations,
//       def_use: [],
//       effects: [],
//       parameters,
//       parameter_uses: [],
//       truncated: false,
//       omitted_operations_lower_bound: 0,
//       known_omitted_inputs: 0,
//       known_omitted_edges: 0,
//       limitations: [],
//     },
//   });
// };
//
// const callBindingAnalysis = (input: {
//   readonly callerAddress: string;
//   readonly calleeAddress: string;
//   readonly caller: ReturnType<typeof jsonValueSchema.parse>;
//   readonly callee: ReturnType<typeof jsonValueSchema.parse>;
//   readonly targetLimitations?: readonly string[];
// }): AnalysisOperationPort => ({
//   execute: async (operation, parameters) => {
//     if (operation === "resolve_native_call_targets")
//       return ok(
//         createAnalysisExecution(
//           {
//             call_site: String(parameters.address),
//             procedure: input.calleeAddress,
//             status: "direct",
//             mechanism: "direct",
//             targets: [
//               {
//                 address: input.calleeAddress,
//                 procedure: input.calleeAddress,
//                 status: "direct",
//                 basis: "provider-reference",
//                 references: [],
//               },
//             ],
//             limitations: [...(input.targetLimitations ?? [])],
//           },
//           provider,
//           { subject },
//         ),
//       );
//     if (operation !== "analyze_function")
//       throw new Error(`Unexpected native trace operation: ${operation}`);
//     if (
//       parameters.procedure !== input.callerAddress &&
//       parameters.procedure !== input.calleeAddress
//     )
//       throw new Error(`Unexpected procedure: ${String(parameters.procedure)}`);
//     return ok(
//       createAnalysisExecution(
//         parameters.procedure === input.callerAddress
//           ? input.caller
//           : input.callee,
//         provider,
//         { subject },
//       ),
//     );
//   },
// });
//
// describe("native value failed-callee traversal", () => {
//   it("attempts a repeated failed selector once and still analyzes a later callee", async () => {
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const caller = nativeFlowDossier(base, {
//       address: "0x1000",
//       name: "caller",
//       operations: [
//         node("bad-1", "0x1100", "CALL"),
//         node("bad-2", "0x1104", "CALL"),
//         node("good", "0x1108", "CALL"),
//       ],
//       parameters: [],
//     });
//     const good = nativeFlowDossier(base, {
//       address: "0x3000",
//       name: "good",
//       operations: [],
//       parameters: [],
//     });
//     const attempts: string[] = [];
//     const port: AnalysisOperationPort = {
//       execute: async (operation, parameters) => {
//         if (operation === "resolve_native_call_targets") {
//           const destination =
//             parameters.address === "0x1108" ? "0x3000" : "0x2000";
//           return ok(
//             createAnalysisExecution(
//               {
//                 call_site: String(parameters.address),
//                 procedure: "0x1000",
//                 status: "direct",
//                 mechanism: "direct",
//                 targets: [
//                   {
//                     address: destination,
//                     procedure: destination,
//                     status: "direct",
//                     basis: "provider-reference",
//                     references: [],
//                   },
//                 ],
//                 limitations: [],
//               },
//               provider,
//               { subject },
//             ),
//           );
//         }
//         expect(operation).toBe("analyze_function");
//         const selector = String(parameters.procedure);
//         attempts.push(selector);
//         if (selector === "0x2000")
//           return err(
//             new AnalysisOutputError("analyze_function", "Callee unavailable"),
//           );
//         return ok(
//           createAnalysisExecution(
//             selector === "0x1000" ? caller : good,
//             provider,
//             { subject },
//           ),
//         );
//       },
//     };
//     // A new invocation retries the failed selector: failures are not cached
//     // across traces, and successful procedure identity remains separate.
//     for (let run = 0; run < 2; run++) {
//       attempts.length = 0;
//       const result = await traceNativeValues(port, {
//         procedure: "0x1000",
//         max_functions: 3,
//       });
//       if (!result.ok) throw result.error;
//       const trace = nativeValueTraceSchema.parse(result.value);
//       expect(attempts).toEqual(["0x1000", "0x2000", "0x3000"]);
//       expect(trace.decompilations).toBe(3);
//       expect(trace.procedures.map(({ address }) => address)).toEqual([
//         "0x1000",
//         "0x3000",
//       ]);
//       expect(trace.unknowns).toContainEqual({
//         procedure: "0x2000",
//         address: null,
//         reason: expect.stringContaining("Callee unavailable"),
//       });
//       expect(trace.edges.filter(({ kind }) => kind === "call")).toHaveLength(3);
//       expect(trace.truncated).toBe(false);
//     }
//   });
// });
//
// describe("native value call-binding fan-out", () => {
//   it("retains limitations embedded in resolved call-target results", async () => {
export const _l = 218;
