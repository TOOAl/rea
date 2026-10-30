export const __stub = 1;
//           evidence,
//         },
//         {
//           id: "nested-view",
//           kind: "view" as const,
//           name: "Nested container",
//           location: null,
//           attributes: {},
//           evidence,
//         },
//       ],
//       edges: [
//         ...graph.edges,
//         {
//           id: "controller-view",
//           from: "controller",
//           to: "view",
//           relation: "contains" as const,
//           resolution: "observed" as const,
//           evidence,
//           limitations: [],
//         },
//         {
//           id: "view-nested-view",
//           from: "view",
//           to: "nested-view",
//           relation: "contains" as const,
//           resolution: "observed" as const,
//           evidence,
//           limitations: [],
//         },
//       ],
//     };
//     const result = await new EnhancedTools(testAnalysis({}, deepGraph)).execute(
//       "trace_native_ui_action",
//       { action: "buildTapped:", max_depth: 3 },
//     );
//
//     if (!result.ok) throw result.error;
//     expect(
//       nativeInvestigationTraceSchema
//         .parse(result.value)
//         .nodes.map(({ id }) => id),
//     ).toContain("native:function:0x2000");
//   });
//
//   it("returns a typed input error for malformed direct metadata requests", async () => {
//     const result = await new EnhancedTools(testAnalysis()).execute(
//       "inspect_native_dispatch_metadata",
//       { max_records: 0 },
//     );
//
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisInputError" },
//     });
//   });
// });
//
// describe("native dispatch inventory", () => {
//   it.each([
//     { label: "plain value", entry: { address: "0x1000", value: methodName } },
//     { label: "value with symbol facts", entry: methodInventoryEntry },
//     {
//       label: "legacy name with symbol facts",
//       entry: { address: "0x1000", name: methodName, symbol: methodSymbol },
//     },
//   ])(
//     "binds $label inventory to the target without overstating dispatch coverage",
//     async ({ entry }) => {
//       const result = await new EnhancedTools(
//         testAnalysis({
//           list_names: () => execution("list_names", [entry]),
//         }),
//       ).execute("inspect_native_dispatch_metadata", { max_records: 10 });
//
//       expect(result).toMatchObject({
//         ok: true,
//         value: {
//           target_sha256: target,
//           provider,
//           result: {
//             objc_dispatch_implementations: [
//               {
//                 class_name: "BuildViewController",
//                 selector: "buildTapped:",
//                 implementation_address: "0x1000",
//                 decode: { status: "partial", reason: "symbol_name_only" },
//               },
//             ],
//             coverage: expect.arrayContaining([
//               expect.objectContaining({
//                 facet: "objc_dispatch_implementations",
//                 status: "partial",
//               }),
//               expect.objectContaining({
//                 facet: "swift_dispatch_tables",
//                 status: "unsupported",
//               }),
//               expect.objectContaining({
//                 facet: "relative_pointers",
//                 status: "unsupported",
//               }),
//             ]),
//           },
//         },
//       });
//     },
//   );
//
//   it.each([
//     {
//       label: "malformed symbol flag",
//       entry: {
//         ...methodInventoryEntry,
//         symbol: { ...methodSymbol, primary: "true" },
//       },
//     },
//     {
//       label: "unknown symbol source",
//       entry: {
//         ...methodInventoryEntry,
//         symbol: { ...methodSymbol, source: "unknown" },
//       },
//     },
//     {
//       label: "incomplete symbol",
//       entry: { ...methodInventoryEntry, symbol: { primary: true } },
//     },
//     {
//       label: "malformed legacy symbol",
//       entry: { address: "0x1000", name: methodName, symbol: null },
//     },
//     {
//       label: "malformed address",
//       entry: { ...methodInventoryEntry, address: 4096 },
//     },
//     {
//       label: "malformed value with a legacy name",
//       entry: { ...methodInventoryEntry, value: 42, name: methodName },
//     },
//     {
//       label: "undeclared field",
//       entry: { address: "0x1000", value: methodName, unexpected: true },
//     },
//   ])(
//     "rejects $label inventory in both dispatch consumers",
//     async ({ entry }) => {
//       const tools = new EnhancedTools(
//         testAnalysis({
//           list_names: () => execution("list_names", [entry]),
//         }),
//       );
//       for (const [operation, parameters] of [
//         ["inspect_native_dispatch_metadata", { max_records: 10 }],
//         ["trace_native_ui_action", { action: "buildTapped:" }],
//       ] as const) {
//         expect(await tools.execute(operation, parameters)).toMatchObject({
//           ok: false,
//           error: {
//             _tag: "AnalysisOutputError",
//             operation: "list_names",
//             reason: "provider returned an invalid inventory",
//           },
//         });
//       }
//     },
//   );
// });
//
// describe("native UI query outcomes", () => {
//   it("resolves a control object ID through its authored action edge", async () => {
//     const tools = new EnhancedTools(testAnalysis());
//     const result = await tools.execute("trace_native_ui_action", {
//       action: "button",
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value).toMatchObject({ start: "action" });
//   });
//
//   it("rejects UI and native observations with different target identities", async () => {
//     const tools = new EnhancedTools(
//       testAnalysis({
//         list_names: () => execution("list_names", [], "c".repeat(64)),
//       }),
//     );
//     const result = await tools.execute("trace_native_ui_action", {
//       action: "buildTapped:",
//     });
//     expect(result).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisOutputError",
//         operation: "decode_interface_builder",
//       },
//     });
//   });
//
//   it("returns candidates and a reason for an ambiguous selector", async () => {
//     const duplicateGraph = {
//       ...graph,
//       nodes: [
//         ...graph.nodes,
export const _l = 203;
