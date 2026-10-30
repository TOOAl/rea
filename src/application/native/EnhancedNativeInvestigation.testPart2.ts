export const __stub = 1;
//         ]);
//       case "procedure_callees":
//         return execution(
//           operation,
//           parameters.procedure === "0x1000" ? ["0x2000"] : [],
//         );
//       default:
//         throw new Error(`Unexpected provider operation: ${operation}`);
//     }
//   },
// });
//
// describe("native UI action trace", () => {
//   it("retains Hopper targetless call evidence alongside fallback callee routes", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({
//         procedure_address: () => execution("procedure_address", "0x1000"),
//         procedure_references: (parameters) =>
//           ok(
//             createAnalysisExecution(
//               {
//                 reference_kinds_available: false,
//                 references: [],
//                 unresolved_calls:
//                   parameters.procedure === "0x1000"
//                     ? [{ address: "0x1008", reason: "No static target" }]
//                     : [],
//               },
//               { id: "hopper", name: "Hopper", version: "fixture" },
//             ),
//           ),
//       }),
//     ).execute("trace_native_ui_action", { action: "0x1000" });
//     if (!result.ok) throw result.error;
//     const trace = nativeInvestigationTraceSchema.parse(result.value);
//     expect(trace.edges).toContainEqual(
//       expect.objectContaining({
//         relation: "provider_call",
//         to: "native:function:0x2000",
//       }),
//     );
//     expect(trace.unresolved).toContainEqual(
//       expect.objectContaining({
//         from: "native:function:0x1000",
//         to: null,
//         reason: "No static target",
//         evidence: [
//           expect.objectContaining({
//             description: "Hopper reported an unresolved call: No static target",
//             location: { address: "0x1008", file_offset: null },
//             artifact_sha256: target,
//           }),
//         ],
//       }),
//     );
//   });
//   it("carries source-owned reference limitations into trace output without changing coverage", async () => {
//     const limitation = "SEH handler targets may be outside the function body.";
//     const run = async (limitations: readonly string[]) => {
//       const result = await new EnhancedTools(
//         testAnalysis({
//           procedure_address: () => execution("procedure_address", "0x1000"),
//           procedure_references: () =>
//             ok(
//               createAnalysisExecution(
//                 {
//                   reference_kinds_available: false,
//                   references: [],
//                   unresolved_calls: [],
//                 },
//                 { id: "ghidra", name: "Ghidra", version: "fixture" },
//                 { limitations },
//               ),
//             ),
//           procedure_callees: (parameters) =>
//             execution(
//               "procedure_callees",
//               parameters.procedure === "0x1000" ? ["0x2000"] : [],
//             ),
//         }),
//       ).execute("trace_native_ui_action", { action: "0x1000" });
//       if (!result.ok) throw result.error;
//       return nativeInvestigationTraceSchema.parse(result.value);
//     };
//
//     const withSourceLimitation = await run([limitation]);
//     const withoutSourceLimitation = await run([]);
//
//     expect(withSourceLimitation.limitations).toContain(
//       `Ghidra (ghidra fixture) procedure_references: ${limitation}`,
//     );
//     expect(
//       withSourceLimitation.limitations.filter((entry) =>
//         entry.endsWith(`procedure_references: ${limitation}`),
//       ),
//     ).toHaveLength(1);
//     expect(withSourceLimitation.coverage).toEqual(
//       withoutSourceLimitation.coverage,
//     );
//     expect(withSourceLimitation.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "static_native_calls",
//         status: "partial",
//       }),
//     );
//   });
//   it("accepts an explicit native seed without an authored UI connection", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({
//         procedure_address: () => execution("procedure_address", "0x1000"),
//       }),
//     ).execute("trace_native_ui_action", { action: "0x1000" });
//     expect(result).toMatchObject({
//       ok: true,
//       value: {
//         start: "native:function:0x1000",
//         nodes: expect.arrayContaining([
//           expect.objectContaining({ id: "native:function:0x2000" }),
//         ]),
//       },
//     });
//   });
//   it("builds the evidence path from provider names with declared symbol facts", async () => {
//     const tools = new EnhancedTools(
//       testAnalysis({
//         list_names: () => execution("list_names", [methodInventoryEntry]),
//       }),
//     );
//     const result = await tools.execute("trace_native_ui_action", {
//       action: "buildTapped:",
//     });
//     if (!result.ok) throw result.error;
//     const trace = nativeInvestigationTraceSchema.parse(result.value);
//     expect(trace.start).toBe("action");
//     expect(trace.nodes.map(({ id }) => id)).toContain("native:function:0x1000");
//     expect(trace.nodes.map(({ id }) => id)).toContain("native:function:0x2000");
//     expect(trace.edges).toContainEqual(
//       expect.objectContaining({
//         relation: "objc_dispatch",
//         resolution: "inferred",
//       }),
//     );
//     expect(trace.edges).toContainEqual(
//       expect.objectContaining({
//         relation: "provider_call",
//         to: "native:function:0x2000",
//       }),
//     );
//     expect(trace.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "cross_function_value_flow",
//         status: "unsupported",
//       }),
//     );
//   });
// });
//
// describe("native UI action selector origin", () => {
//   it("marks provider-reported function addresses as derived and the action seed as caller-supplied", async () => {
//     const inner = testAnalysis({
//       procedure_address: () => execution("procedure_address", "0x1000"),
//     });
//     const recorded: { operation: string; origin: unknown }[] = [];
//
//     const result = await new EnhancedTools({
//       execute: async (operation, parameters, options) => {
//         recorded.push({ operation, origin: options?.selectorOrigin });
//         return inner.execute(operation, parameters);
//       },
//     }).execute("trace_native_ui_action", { action: "0x1000" });
//
//     expect(result.ok, "the trace completes").toBe(true);
//     expect(
//       recorded
//         .filter(({ operation }) => operation === "procedure_address")
//         .map(({ origin }) => origin),
//       "the caller's action seed carries no provider origin",
//     ).toEqual([undefined]);
//     const probes = recorded.filter(
//       ({ operation }) =>
//         operation === "procedure_references" ||
//         operation === "procedure_callees",
//     );
//     expect(probes.length, "relationships were probed").toBeGreaterThan(0);
//     expect(
//       probes.every(({ origin }) => origin === "provider"),
//       "every relationship probe uses a provider-reported address",
//     ).toBe(true);
//   });
// });
//
// describe("bounded native UI tracing", () => {
//   it("continues handler traversal from its own depth when another UI branch is deeper", async () => {
//     const deepGraph = {
//       ...graph,
//       nodes: [
//         ...graph.nodes,
//         {
//           id: "view",
//           kind: "view" as const,
//           name: "Container",
//           location: null,
//           attributes: {},
export const _l = 203;
