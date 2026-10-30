export const __stub = 1;
//     const callerAddress = "0x1000";
//     const calleeAddress = "0x2000";
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const caller = nativeFlowDossier(base, {
//       address: callerAddress,
//       name: "caller",
//       operations: [node("call", callerAddress, "CALL")],
//       parameters: [],
//     });
//     const callee = nativeFlowDossier(base, {
//       address: calleeAddress,
//       name: "callee",
//       operations: [],
//       parameters: [],
//     });
//     const caveat = "Only statically resolved call sites are included.";
//     const result = await traceNativeValues(
//       callBindingAnalysis({
//         callerAddress,
//         calleeAddress,
//         caller,
//         callee,
//         targetLimitations: [caveat],
//       }),
//       { procedure: callerAddress, max_functions: 2 },
//     );
//
//     if (!result.ok) throw result.error;
//     expect(nativeValueTraceSchema.parse(result.value).limitations).toContain(
//       `Fixture (fixture 1) resolve_native_call_targets: ${caveat}`,
//     );
//   });
//
//   it("preserves binding order and edge-budget behavior for repeated callees", async () => {
//     const callCount = 128;
//     const callerAddress = "0x1000";
//     const calleeAddress = "0x2000";
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const caller = nativeFlowDossier(base, {
//       address: callerAddress,
//       name: "caller",
//       operations: Array.from({ length: callCount }, (_, index) => ({
//         ...node(
//           `call-${index}`,
//           `0x${(0x1000 + index * 4).toString(16)}`,
//           "CALL",
//         ),
//         sequence: index,
//         inputs: [scalar, scalar],
//       })),
//       parameters: [],
//     });
//     const callee = nativeFlowDossier(base, {
//       address: calleeAddress,
//       name: "callee",
//       operations: [node("return", calleeAddress, "RETURN")],
//       parameters: [{ ordinal: 0, name: "value", data_type: "/int" }],
//     });
//     const fanoutAnalysis = callBindingAnalysis({
//       callerAddress,
//       calleeAddress,
//       caller,
//       callee,
//     });
//     const expectedEdges = [
//       ...Array.from({ length: callCount }, (_, index) => ({
//         source: `${callerAddress}/call-${index}`,
//         target: calleeAddress,
//         input_index: null,
//         kind: "call",
//       })),
//       ...Array.from({ length: callCount }, (_, index) => [
//         {
//           source: `${callerAddress}/call-${index}`,
//           target: `${calleeAddress}/parameter:0`,
//           input_index: 1,
//           kind: "argument-binding",
//         },
//         {
//           source: `${calleeAddress}/return`,
//           target: `${callerAddress}/call-${index}`,
//           input_index: 1,
//           kind: "return-binding",
//         },
//       ]).flat(),
//     ];
//     const request = {
//       procedure: callerAddress,
//       max_functions: 2,
//       max_call_sites: callCount,
//       max_nodes: callCount + 2,
//       max_edges: callCount * 3,
//       limit: callCount + 2,
//     };
//
//     const complete = await traceNativeValues(fanoutAnalysis, request);
//     if (!complete.ok) throw complete.error;
//     const completeResult = nativeValueTraceSchema.parse(complete.value);
//     const edgeShape = (edges: typeof completeResult.edges) =>
//       edges.map(({ source, target, input_index, kind }) => ({
//         source,
//         target,
//         input_index,
//         kind,
//       }));
//     expect(completeResult).toMatchObject({
//       total_nodes: callCount + 2,
//       total_edges: callCount * 3,
//       truncated: false,
//       unknowns: [],
//     });
//     expect(edgeShape(completeResult.edges)).toEqual(expectedEdges);
//
//     const capped = await traceNativeValues(fanoutAnalysis, {
//       ...request,
//       max_edges: callCount * 3 - 1,
//     });
//     if (!capped.ok) throw capped.error;
//     const cappedResult = nativeValueTraceSchema.parse(capped.value);
//     expect(cappedResult).toMatchObject({
//       total_nodes: callCount + 2,
//       total_edges: callCount * 3 - 1,
//       truncated: true,
//     });
//     expect(edgeShape(cappedResult.edges)).toEqual(
//       expectedEdges.slice(0, callCount * 3 - 1),
//     );
//
//     const nodeCapped = await traceNativeValues(fanoutAnalysis, {
//       ...request,
//       max_nodes: callCount + 1,
//     });
//     if (!nodeCapped.ok) throw nodeCapped.error;
//     const nodeCappedResult = nativeValueTraceSchema.parse(nodeCapped.value);
//     expect(nodeCappedResult).toMatchObject({
//       total_nodes: callCount + 1,
//       total_edges: callCount * 2,
//       truncated: true,
//       unknowns: Array.from({ length: callCount }, () => ({
//         procedure: callerAddress,
//         address: null,
//         reason: `Parameter bindings for ${calleeAddress} are unavailable or omitted`,
//       })),
//     });
//     expect(edgeShape(nodeCappedResult.edges)).toEqual(
//       expectedEdges.filter(({ kind }) => kind !== "argument-binding"),
//     );
//   });
// });
//
// describe("bounded native value dependency composition", () => {
//   it("reports work truncation and stable pagination without traversing ambiguous calls", async () => {
//     const bounded = await traceNativeValues(analysis, {
//       procedure: "0x1000",
//       max_functions: 1,
//     });
//     expect(bounded.ok).toBe(true);
//     if (bounded.ok)
//       expect(bounded.value).toMatchObject({
//         truncated: true,
//         decompilations: 1,
//       });
//     const page = await traceNativeValues(analysis, {
//       procedure: "0x1000",
//       limit: 1,
//     });
//     expect(page.ok).toBe(true);
//     if (page.ok)
//       expect(page.value).toMatchObject({ total_nodes: 3, next_offset: 1 });
//     const ambiguous = await traceNativeValues(
//       {
//         execute: async (operation, parameters, options) => {
//           if (operation !== "resolve_native_call_targets")
//             return analysis.execute(operation, parameters, options);
//           return ok(
//             createAnalysisExecution(
//               {
//                 call_site: "0x1000",
//                 procedure: "0x1000",
//                 status: "ambiguous",
//                 mechanism: "computed",
//                 targets: [
//                   {
//                     address: "0x2000",
//                     procedure: "0x2000",
//                     status: "candidate",
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
//         },
//       },
//       { procedure: "0x1000" },
//     );
//     expect(ambiguous.ok).toBe(true);
//     if (ambiguous.ok)
//       expect(ambiguous.value).toMatchObject({
//         decompilations: 1,
//         edges: [expect.objectContaining({ status: "candidate" })],
//       });
//   });
//   it("propagates cancellation and rejects cross-target dependencies", async () => {
//     const controller = new AbortController();
//     controller.abort();
//     expect(
//       await traceNativeValues(
//         analysis,
//         { procedure: "0x1000" },
//         controller.signal,
//       ),
//     ).toMatchObject({ ok: false, error: { _tag: "AnalysisCancelledError" } });
//     const cancelled = await traceNativeValues(
export const _l = 218;
