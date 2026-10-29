export const __stub = 1;
//       ...semantic.coverage,
//       status: "partial",
//       truncated: true,
//       omitted_nodes: null,
//       omitted_relations: null,
//       limits: [
//         { name: "semantic_graph_node_ceiling", value: 100000, unit: "items" },
//       ],
//     },
//     limitations: ["Some semantic nodes could not be retained."],
//   });
//   const result = projectAnalysisView(
//     javascriptParent({ ...analysis, semantic_graph: semanticGraph }),
//     { kind: "summary" },
//   );
//   if (!result.ok) throw result.error;
//   expect(result.value).toMatchObject({
//     summary: { coverage: { semantic: { status: "partial", truncated: true } } },
//     limitations: ["Some semantic nodes could not be retained."],
//     unknowns: expect.arrayContaining([
//       "semantic_graph.coverage.status is partial",
//     ]),
//   });
// });
//
// it.each([63, 64, 65, 10_000])(
//   "bounds and deduplicates %i messages in JavaScript and layout views",
//   (count) => {
//     const messages = Array.from(
//       { length: count },
//       (_, index) => `Module ${String(index).padStart(5, "0")} was not parsed.`,
//     );
//     const analysis = analysisViewJavaScriptAnalysis();
//     const { graph_id: _graphId, ...semantic } = analysis.semantic_graph;
//     const parent = javascriptParent({
//       ...analysis,
//       limitations: messages,
//       semantic_graph: createJavaScriptSemanticGraph({
//         ...semantic,
//         limitations: messages.slice(0, 1),
//       }),
//     });
//     const duplicatedParent = { ...parent, limitations: messages };
//     const notice = (
//       omitted: number,
//       field: "limitations" | "unknowns",
//       evidenceId: string,
//     ) =>
//       `${String(omitted)} additional ${field} omitted from this view; consult source parent Evidence ${evidenceId} for the complete list (the caller-supplied record, or its retaining session).`;
//     for (const view of [
//       { kind: "summary" },
//       { kind: "page", collection: "modules", offset: 0, limit: 1 },
//     ] as const) {
//       const result = projectAnalysisView(duplicatedParent, view);
//       if (!result.ok) throw result.error;
//       if (count <= 65) {
//         expect(result.value.limitations).toEqual(messages);
//         expect(result.value.unknowns).toEqual(
//           [...messages, "semantic_graph.coverage.status is unknown"].sort(),
//         );
//       } else {
//         const limitations = result.value.limitations;
//         const unknowns = result.value.unknowns;
//         expect(limitations.length).toBeGreaterThan(65);
//         expect(limitations.at(-1)).toBe(
//           notice(
//             count - limitations.length + 1,
//             "limitations",
//             parent.evidenceId,
//           ),
//         );
//         expect(unknowns.length).toBeGreaterThan(65);
//         expect(unknowns.at(-1)).toBe(
//           notice(
//             count + 1 - unknowns.length + 1,
//             "unknowns",
//             parent.evidenceId,
//           ),
//         );
//       }
//     }
//     const layout = layoutParent();
//     const layoutWithMessages = {
//       ...layout,
//       limitations: messages,
//       normalizedResult: {
//         ...analysisViewLayoutFixture(),
//         limitations: messages,
//       },
//     };
//     for (const view of [
//       { kind: "summary" },
//       { kind: "page", collection: "sections", offset: 0, limit: 1 },
//     ] as const) {
//       const result = projectAnalysisView(layoutWithMessages, view);
//       if (!result.ok) throw result.error;
//       if (count <= 65) expect(result.value.limitations).toEqual(messages);
//       else {
//         expect(result.value.limitations.length).toBeGreaterThan(65);
//         expect(result.value.limitations.at(-1)).toBe(
//           notice(
//             count - result.value.limitations.length + 1,
//             "limitations",
//             layout.evidenceId,
//           ),
//         );
//       }
//     }
//   },
// );
//
// it.each(["partial", "unknown"] as const)(
//   "preserves %s parent graph completeness when a module page is exhausted",
//   (status) => {
//     const analysis = analysisViewJavaScriptAnalysis();
//     const first = analysis.graph.nodes[0];
//     if (first === undefined) throw new Error("missing module");
//     const unknown = createJavaScriptApplicationNode({
//       kind: "unknown",
//       identity: {
//         strategy: "observation-fingerprint",
//         stability: "observation-only",
//         observation_sha256: "8".repeat(64),
//         scope: "unclassified module",
//       },
//       observations: first.observations.map((observation) => ({
//         label: "unclassified module",
//         properties: {},
//         evidence: observation.evidence,
//       })),
//     });
//     const messages = [
//       ...Array.from(
//         { length: 65 },
//         (_, index) =>
//           `Module ${String(index).padStart(5, "0")} was not parsed.`,
//       ),
//       "z".repeat(300_000),
//     ];
//     const { graph_id: _applicationId, ...application } = analysis.graph;
//     const graph = createJavaScriptApplicationGraph({
//       ...application,
//       nodes: [...application.nodes, unknown],
//       limitations: messages.slice(0, 1),
//       coverage: { ...application.coverage, status, omitted_count: null },
//     });
//     const bound = analysisViewBindJavaScriptGraphs(analysis, graph);
//     const { graph_id: _semanticId, ...semantic } = bound.semantic_graph;
//     const parent = javascriptParent({
//       ...bound,
//       limitations: messages,
//       semantic_graph: createJavaScriptSemanticGraph({
//         ...semantic,
//         limitations: messages.slice(0, 1),
//       }),
//     });
//     for (const view of [
//       { kind: "page", collection: "modules", offset: 0, limit: 10 },
//       {
//         kind: "javascript",
//         collection: "modules",
//         projection: "references",
//         where: {},
//         offset: 0,
//         limit: 10,
//       },
//       {
//         kind: "javascript",
//         collection: "modules",
//         projection: "references",
//         where: { path: "not-retained.js" },
//         offset: 0,
//         limit: 10,
//       },
//       {
//         kind: "item",
//         collection: "modules",
//         selector: { path: "renderer.js" },
//       },
//     ] as const) {
//       const result = projectAnalysisView(parent, view);
//       if (!result.ok) throw result.error;
//       expect(result.value.coverage.exhausted).toBe(true);
//       if (result.value.kind === "javascript")
//         expect(result.value.source_coverage).toMatchObject({
//           application: { status, omitted_count: null },
//           semantic: { status: "unknown" },
//           application_unknown_count: 1,
//         });
//       expect(result.value.unknowns).toEqual([
//         "1 application graph unknowns remain in the parent Evidence.",
//         ...messages.slice(0, 65),
//         `graph.coverage.status is ${status}`,
//         "semantic_graph.coverage.status is unknown",
//         `1 additional unknowns omitted from this view; consult source parent Evidence ${parent.evidenceId} for the complete list (the caller-supplied record, or its retaining session).`,
//       ]);
//     }
//   },
// );
//
// it("does not match unavailable layout names using a display placeholder", () => {
//   const layout = analysisViewLayoutFixture();
//   const section = layout.sections[2];
//   if (section === undefined) throw new Error("missing section");
//   const result = projectAnalysisView(
//     {
//       ...layoutParent(),
//       normalizedResult: {
//         ...layout,
//         sections: [
//           ...layout.sections.slice(0, 2),
//           {
//             ...section,
//             name: {
//               ...section.name,
//               display: "<unavailable>",
//               unknown_reason: "Name bytes unavailable",
//               bytes_base64: null,
//               location: null,
//             },
//           },
//         ],
//       },
//     },
//     {
//       kind: "item",
//       collection: "sections",
//       selector: { name: "<unavailable>" },
//     },
//   );
//   expect(result.ok).toBe(false);
// });
//
// it("rejects unsupported parent operations and incompatible collections", () => {
//   expect(
//     projectAnalysisView(layoutParent(), {
//       kind: "managed",
//       collection: "attributes",
//       offset: 0,
//       limit: 1,
//     }),
//   ).toMatchObject({ ok: false, error: { _tag: "AnalysisInputError" } });
//   const unsupported = projectAnalysisView(
//     {
//       evidenceId: `ev_${"d".repeat(64)}`,
//       operation: "inspect_recorded_crash",
//       normalizedResult: { path: "/artifacts/crash.core" },
//       limitations: [],
//     },
//     { kind: "summary" },
//   );
//   expect(unsupported).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisUnsupportedTargetError" },
//   });
//   const modulesOnLayout = projectAnalysisView(layoutParent(), {
//     kind: "page",
//     collection: "modules",
//     offset: 0,
//     limit: 1,
//   });
//   expect(modulesOnLayout).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
//   const sectionsOnJs = projectAnalysisView(javascriptParent(), {
//     kind: "item",
//     collection: "sections",
//     selector: { name: ".text" },
//   });
//   expect(sectionsOnJs).toMatchObject({
//     ok: false,
//     error: { _tag: "AnalysisInputError" },
//   });
// });
//
// it("keeps the complete unique set when it fits the byte budget", () => {
//   const messages = ["a".repeat(2_400), "b".repeat(2_400)];
//   expect(
//     boundedViewMessages(messages, `ev_${"a".repeat(64)}`, "limitations"),
//   ).toEqual(messages);
// });
//
// it("does not impose a message-count cutoff below the byte budget", () => {
//   const messages = Array.from(
//     { length: 100 },
//     (_, index) => `message ${String(index).padStart(2, "0")}`,
//   );
//   expect(
//     boundedViewMessages(messages, `ev_${"a".repeat(64)}`, "limitations"),
//   ).toEqual(messages.toSorted());
// });
//
// it("bounds repeated view messages even when fewer than 64 source strings are huge", () => {
//   const oversized = ["\u0000".repeat(300_000), "\\".repeat(300_000)];
//   const projected = boundedViewMessages(
//     oversized,
//     `ev_${"a".repeat(64)}`,
//     "limitations",
//   );
//   expect(projected).toHaveLength(1);
//   expect(projected[0]).toContain("2 additional limitations omitted");
//   expect(Buffer.byteLength(JSON.stringify(projected))).toBeLessThan(256 * 1024);
// });
//
// it("preserves selected native facet unavailability instead of an exhausted empty page", () => {
//   const parent = nativeParent({
//     ...functionDossierSchema.parse(ghidraFunctionDossier()),
//     facet_availability: {
//       comments: { available: false, reason: "Typed comments unavailable" },
//       references: { available: false, reason: "Typed references unavailable" },
//     },
//   });
//   for (const [facet, reason] of [
//     ["comments", "Typed comments unavailable"],
//     ["incoming_references", "Typed references unavailable"],
//   ] as const) {
//     const result = projectAnalysisView(parent, {
//       kind: "native",
//       facet,
//       offset: 0,
//       limit: 8,
//     });
//     if (!result.ok) throw result.error;
//     expect(result.value).toMatchObject({
//       item: { available: false, reason },
//       unknowns: expect.arrayContaining([reason]),
//     });
//   }
// });
export const _l = 330;
