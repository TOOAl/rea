export const __stub = 1;
//         {
//           ...graph.nodes[1],
//           id: "second-action",
//         },
//       ],
//     };
//     const tools = new EnhancedTools(
//       testAnalysis({
//         decode_interface_builder: () =>
//           execution("decode_interface_builder", {
//             target_sha256: target,
//             documents: [],
//             graph: duplicateGraph,
//             limitations: [],
//           }),
//       }),
//     );
//     const result = await tools.execute("trace_native_ui_action", {
//       action: "buildTapped:",
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value).toMatchObject({
//       reason: "action_selector_matches_multiple_ui_connections",
//       nodes: [{ id: "action" }, { id: "second-action" }],
//     });
//   });
//
//   it("retains decoder truncation coverage when the action is absent", async () => {
//     const boundedGraph = {
//       ...graph,
//       coverage: [
//         {
//           facet: "objects:Main.nib",
//           status: "partial" as const,
//           reason: "object_limit_reached",
//           examined: 2,
//           omitted: 1,
//         },
//       ],
//       truncated: true,
//     };
//     const result = await new EnhancedTools(
//       testAnalysis({}, boundedGraph),
//     ).execute("trace_native_ui_action", { action: "missing-selector" });
//
//     expect(result).toMatchObject({ ok: true, value: { truncated: true } });
//     if (!result.ok) return;
//     expect(result.value).toHaveProperty("coverage");
//     expect(result.value).toMatchObject({
//       coverage: expect.arrayContaining([
//         expect.objectContaining({
//           facet: "objects:Main.nib",
//           status: "partial",
//           reason: "object_limit_reached",
//         }),
//       ]),
//     });
//   });
//
//   it("returns native seed resolution failures instead of reporting not found", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({
//         procedure_address: () =>
//           err(
//             new AnalysisOutputError(
//               "procedure_address",
//               "invalid address response",
//             ),
//           ),
//       }),
//     ).execute("trace_native_ui_action", { action: "missing-selector" });
//
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisOutputError", operation: "procedure_address" },
//     });
//   });
//
//   it("returns cancellation instead of a successful trace during callee expansion", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({
//         procedure_callees: () =>
//           err(new AnalysisCancelledError("procedure_callees")),
//       }),
//     ).execute("trace_native_ui_action", { action: "buildTapped:" });
//
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisCancelledError", operation: "procedure_callees" },
//     });
//   });
//
//   it("reports only callees left unprocessed by the edge limit", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({
//         procedure_callees: (parameters) =>
//           execution(
//             "procedure_callees",
//             parameters.procedure === "0x1000"
//               ? ["0x2000", "0x2001", "0x2002"]
//               : [],
//           ),
//       }),
//     ).execute("trace_native_ui_action", {
//       action: "buildTapped:",
//       max_depth: 4,
//       max_edges: 5,
//     });
//
//     expect(result).toMatchObject({ ok: true });
//     if (!result.ok) return;
//     expect(result.value).toMatchObject({
//       coverage: expect.arrayContaining([
//         expect.objectContaining({
//           facet: "static_native_calls",
//           status: "partial",
//           omitted: 1,
//         }),
//       ]),
//     });
//   });
// });
//
// describe("native UI trace boundaries", () => {
//   it("retains unresolved dispatch evidence during callee expansion", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({ list_names: () => execution("list_names", []) }),
//     ).execute("trace_native_ui_action", { action: "buildTapped:" });
//
//     expect(result).toMatchObject({ ok: true });
//     if (!result.ok) return;
//     expect(result.value).toMatchObject({
//       unresolved: [
//         expect.objectContaining({
//           relation: "objc_dispatch",
//           resolution: "unresolved",
//         }),
//       ],
//     });
//   });
//
//   it("returns cancellation when archive decoding is cancelled", async () => {
//     const result = await new EnhancedTools(
//       testAnalysis({
//         decode_interface_builder: () =>
//           err(new AnalysisCancelledError("decode_interface_builder")),
//       }),
//     ).execute("trace_native_ui_action", { action: "buildTapped:" });
//
//     expect(result).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisCancelledError",
//         operation: "decode_interface_builder",
//       },
//     });
//   });
//
//   it("matches handlers after the dispatch inventory's former default limit", async () => {
//     const names = Array.from({ length: 5_000 }, (_, index) => ({
//       address: `0x${(index + 1).toString(16)}`,
//       name: `unrelated_symbol_${index}`,
//     }));
//     names.push({
//       address: "0x2000",
//       name: "-[BuildViewController buildTapped:]",
//     });
//     const result = await new EnhancedTools(
//       testAnalysis({ list_names: () => execution("list_names", names) }),
//     ).execute("trace_native_ui_action", { action: "buildTapped:" });
//
//     expect(result).toMatchObject({ ok: true });
//     if (!result.ok) return;
//     expect(result.value).toMatchObject({
//       nodes: expect.arrayContaining([
//         expect.objectContaining({ id: "native:function:0x2000" }),
//       ]),
//     });
//   });
//
//   it("counts edges removed with nodes in bounded graph coverage", async () => {
//     const result = await new EnhancedTools(testAnalysis()).execute(
//       "trace_native_ui_action",
//       { action: "missing-selector", max_nodes: 1 },
//     );
//
//     expect(result).toMatchObject({ ok: true });
//     if (!result.ok) return;
//     expect(result.value).toMatchObject({
//       coverage: expect.arrayContaining([
//         expect.objectContaining({
//           facet: "interface_builder_graph",
//           status: "partial",
//           omitted: 8,
//         }),
//       ]),
//     });
//   });
// });
export const _l = 199;
