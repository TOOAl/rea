export const __stub = 1;
//       {
//         execute: async () =>
//           err(new AnalysisCancelledError("analyze_function")),
//       },
//       { procedure: "0x1000" },
//     );
//     expect(cancelled.ok).toBe(false);
//     const mismatch = await traceNativeValues(
//       {
//         execute: async (operation, parameters, options) => {
//           const value = await analysis.execute(operation, parameters, options);
//           return value.ok && parameters.procedure === "0x2000"
//             ? ok({
//                 ...value.value,
//                 subject: { ...subject, sha256: "b".repeat(64) },
//               })
//             : value;
//         },
//       },
//       { procedure: "0x1000" },
//     );
//     expect(mismatch).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisOutputError" },
//     });
//   });
// });
//
// describe("native value trace selector origin", () => {
//   it("marks only the initial procedure as caller-supplied", async () => {
//     const analyzed: { procedure: unknown; origin: unknown }[] = [];
//
//     const result = await traceNativeValues(
//       {
//         execute: async (operation, parameters, options) => {
//           if (operation === "analyze_function")
//             analyzed.push({
//               procedure: parameters.procedure,
//               origin: options?.selectorOrigin,
//             });
//           return analysis.execute(operation, parameters, options);
//         },
//       },
//       { procedure: "0x1000" },
//     );
//
//     expect(result.ok, "the trace completes").toBe(true);
//     expect(
//       analyzed,
//       "the caller's procedure is unmarked and the discovered callee is provider-derived",
//     ).toEqual([
//       { procedure: "0x1000", origin: undefined },
//       { procedure: "0x2000", origin: "provider" },
//     ]);
//   });
// });
//
// describe("native value node byte budgets", () => {
//   it("stops admitting parameters after an operation exceeds the byte budget", async () => {
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const value = nativeFlowDossier(base, {
//       address: "0x1000",
//       name: "caller",
//       operations: [node("use", "0x1000", "a".repeat(9 * 1024 * 1024))],
//       parameters: [{ ordinal: 0, name: "value", data_type: "/int" }],
//     });
//     const result = await traceNativeValues(
//       {
//         execute: async () =>
//           ok(createAnalysisExecution(value, provider, { subject })),
//       },
//       { procedure: "0x1000" },
//     );
//     if (!result.ok) throw result.error;
//     expect(nativeValueTraceSchema.parse(result.value)).toMatchObject({
//       truncated: true,
//       total_nodes: 0,
//       total_edges: 0,
//       nodes: [],
//       edges: [],
//     });
//   });
//
//   it.each([
//     { label: "plain text", name: "a".repeat(9 * 1024 * 1024) },
//     { label: "JSON escapes", name: "\0".repeat(2 * 1024 * 1024) },
//   ])("rejects an oversized parameter encoded with $label", async ({ name }) => {
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const value = nativeFlowDossier(base, {
//       address: "0x1000",
//       name: "caller",
//       operations: [
//         node("parameter:0", "0x1000", "COPY"),
//         node("use", "0x1000", "MULTIEQUAL"),
//       ],
//       parameters: [{ ordinal: 0, name, data_type: "/int" }],
//     });
//     const parsed = functionDossierSchema.parse(value);
//     if (!parsed.native_value_flow?.available)
//       throw new Error("Invalid fixture");
//     parsed.native_value_flow.parameter_uses = [
//       { ordinal: 0, use: "use", input_index: 0 },
//     ];
//     const result = await traceNativeValues(
//       {
//         execute: async () =>
//           ok(createAnalysisExecution(parsed, provider, { subject })),
//       },
//       { procedure: "0x1000" },
//     );
//     if (!result.ok) throw result.error;
//     const trace = nativeValueTraceSchema.parse(result.value);
//     expect(trace).toMatchObject({
//       truncated: true,
//       total_nodes: 2,
//       total_edges: 0,
//       nodes: [
//         expect.objectContaining({ kind: "operation" }),
//         expect.objectContaining({ kind: "operation" }),
//       ],
//     });
//   });
//
//   it("shares the byte budget across operation and parameter nodes", async () => {
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const value = nativeFlowDossier(base, {
//       address: "0x1000",
//       name: "caller",
//       operations: [node("use", "0x1000", "MULTIEQUAL")],
//       parameters: [0, 1].map((ordinal) => ({
//         ordinal,
//         name: "a".repeat(5 * 1024 * 1024),
//         data_type: "/int",
//       })),
//     });
//     const parsed = functionDossierSchema.parse(value);
//     if (!parsed.native_value_flow?.available)
//       throw new Error("Invalid fixture");
//     parsed.native_value_flow.parameter_uses = [0, 1].map((ordinal) => ({
//       ordinal,
//       use: "use",
//       input_index: ordinal,
//     }));
//     const result = await traceNativeValues(
//       {
//         execute: async () =>
//           ok(createAnalysisExecution(parsed, provider, { subject })),
//       },
//       { procedure: "0x1000" },
//     );
//     if (!result.ok) throw result.error;
//     const trace = nativeValueTraceSchema.parse(result.value);
//     expect(trace).toMatchObject({
//       truncated: true,
//       total_nodes: 2,
//       total_edges: 1,
//     });
//     expect(trace.nodes.map(({ id }) => id)).toEqual([
//       "0x1000/use",
//       "0x1000/parameter:0",
//     ]);
//     expect(trace.edges[0]?.source).toBe("0x1000/parameter:0");
//     const retainedBytes = trace.nodes.reduce(
//       (total, value) => total + Buffer.byteLength(JSON.stringify(value)),
//       0,
//     );
//     expect(retainedBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
//   });
// });
//
// describe("native value byte-bound call bindings", () => {
//   it("omits argument bindings to rejected callee parameter nodes", async () => {
//     const base = functionDossierSchema.parse(ghidraFunctionDossier());
//     const caller = nativeFlowDossier(base, {
//       address: "0x1000",
//       name: "caller",
//       operations: [node("call", "0x1000", "CALL")],
//       parameters: [],
//     });
//     const callee = nativeFlowDossier(base, {
//       address: "0x2000",
//       name: "callee",
//       operations: [node("return", "0x2000", "RETURN")],
//       parameters: [
//         { ordinal: 0, name: "a".repeat(9 * 1024 * 1024), data_type: "/int" },
//       ],
//     });
//     const result = await traceNativeValues(
//       callBindingAnalysis({
//         callerAddress: "0x1000",
//         calleeAddress: "0x2000",
//         caller,
//         callee,
//       }),
//       { procedure: "0x1000" },
//     );
//     if (!result.ok) throw result.error;
//     const trace = nativeValueTraceSchema.parse(result.value);
//     expect(trace.truncated).toBe(true);
//     expect(trace.nodes.map(({ kind }) => kind)).toEqual([
//       "operation",
//       "operation",
//     ]);
//     expect(trace.edges.map(({ kind }) => kind)).toEqual([
//       "call",
//       "return-binding",
//     ]);
//     expect(trace.unknowns).toContainEqual(
//       expect.objectContaining({
//         reason: "Parameter bindings for 0x2000 are unavailable or omitted",
//       }),
//     );
//   });
// });
export const _l = 214;
