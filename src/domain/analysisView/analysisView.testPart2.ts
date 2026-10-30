export const __stub = 1;
//           view: { ...input.view, limit },
//         }).success,
//       ).toBe(false);
//   },
// );
//
// it("projects layout summary, facet, item, and stable pages", () => {
//   const parent = layoutParent();
//   const layout = analysisViewLayoutFixture();
//   const summary = projectAnalysisView(parent, { kind: "summary" });
//   if (!summary.ok) throw summary.error;
//   expect(summary.value).toMatchObject({
//     kind: "summary",
//     parent_operation: "inspect_binary_layout",
//     summary: {
//       format: "elf",
//       counts: { sections: 3, symbols: 3, segments: 0, relocations: 0 },
//     },
//     coverage: completeWithinViewCoverage(6, 6),
//   });
//   const mitigations = projectAnalysisView(parent, {
//     kind: "facet",
//     facet: "mitigations",
//   });
//   if (!mitigations.ok) throw mitigations.error;
//   if (mitigations.value.kind !== "facet")
//     throw new Error("expected facet view");
//   expect(mitigations.value.facet).toEqual(layout.mitigations);
//   const data = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "sections",
//     selector: { name: ".data" },
//   });
//   if (!data.ok) throw data.error;
//   if (data.value.kind !== "item") throw new Error("expected item view");
//   expect(data.value.item).toMatchObject({
//     index: 2,
//     name: { display: ".data" },
//   });
//   const indexed = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "sections",
//     selector: { index: 0 },
//   });
//   if (!indexed.ok) throw indexed.error;
//   expect(indexed.value.view_digest).not.toBe(data.value.view_digest);
//   expect(indexed.value.view_digest).not.toBe(parent.evidenceId.slice(3));
//   const page = projectAnalysisView(parent, {
//     kind: "page",
//     collection: "sections",
//     offset: 0,
//     limit: 2,
//   });
//   if (!page.ok) throw page.error;
//   expect(page.value).toMatchObject({
//     kind: "page",
//     coverage: {
//       status: "page",
//       examined: 2,
//       total: 3,
//       next_offset: 2,
//       exhausted: false,
//     },
//   });
//   if (page.value.kind !== "page") throw new Error("expected page view");
//   expect(page.value.items).toHaveLength(2);
//   const exhausted = projectAnalysisView(parent, {
//     kind: "page",
//     collection: "symbols",
//     offset: 3,
//     limit: 8,
//   });
//   if (!exhausted.ok) throw exhausted.error;
//   expect(exhausted.value).toMatchObject({
//     items: [],
//     coverage: pageViewCoverage(3, 0, 3),
//   });
// });
//
// it("rejects ambiguous layout names with candidate indexes", () => {
//   const parent = layoutParent();
//   const result = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "sections",
//     selector: { name: ".text" },
//   });
//   expect(result).toMatchObject({
//     ok: false,
//     error: {
//       _tag: "AnalysisInputError",
//       issues: [
//         {
//           path: ["view", "selector", "name"],
//           expected: [{ index: 0 }, { index: 1 }],
//         },
//       ],
//     },
//   });
// });
//
// it("projects JavaScript summary and preserves selected module observations", () => {
//   const analysis = analysisViewJavaScriptAnalysisWithSource();
//   const parent = javascriptParent(analysis);
//   const summary = projectAnalysisView(parent, { kind: "summary" });
//   if (!summary.ok) throw summary.error;
//   if (summary.value.kind !== "summary") throw new Error("expected summary");
//   expect(summary.value.summary).toMatchObject({
//     format: "directory",
//     limitation_count: 0,
//   });
//   expect(JSON.stringify(summary.value)).not.toMatch(/"graph"/);
//   expect(summary.value.summary).not.toHaveProperty("semantic_graph");
//   const item = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "modules",
//     selector: { path: "renderer.js" },
//   });
//   if (!item.ok) throw item.error;
//   const moduleNode = analysis.graph.nodes[0];
//   if (moduleNode === undefined) throw new Error("missing module");
//   expect(javascriptModulePath(moduleNode)).toBe("renderer.js");
//   if (item.value.kind !== "item") throw new Error("expected item view");
//   expect(item.value.item).toMatchObject({
//     path: "renderer.js",
//     kind: "javascript-asset",
//   });
//   expect(JSON.stringify(item.value.item)).toContain("export const secret = 1;");
//   expect(JSON.stringify(item.value.item)).toContain("should not leak");
//   const page = projectAnalysisView(parent, {
//     kind: "page",
//     collection: "modules",
//     offset: 0,
//     limit: 8,
//   });
//   if (!page.ok) throw page.error;
//   if (page.value.kind !== "page") throw new Error("expected page view");
//   expect(page.value.items).toEqual([
//     {
//       node_id: analysis.graph.nodes[0]?.node_id,
//       kind: "javascript-asset",
//       path: "renderer.js",
//     },
//   ]);
//   expect(page.value.coverage).toMatchObject({
//     status: "page",
//     examined: 1,
//     total: 1,
//     next_offset: null,
//     exhausted: true,
//   });
// });
//
// it("projects typed module facts without source bodies and keeps source coverage independent of paging", () => {
//   const analysis = analysisViewJavaScriptAnalysisWithSource();
//   const parent = javascriptParent(analysis);
//   const input = inspectAnalysisViewInputSchema.parse({
//     source: { kind: "retained-evidence", evidence_id: parent.evidenceId },
//     view: {
//       kind: "javascript",
//       collection: "modules",
//       projection: "references",
//       where: { path: "renderer.js" },
//       limit: 1,
//     },
//   });
//   const projected = projectAnalysisView(parent, input.view);
//   if (!projected.ok) throw projected.error;
//   if (projected.value.kind !== "javascript")
//     throw new Error("expected JavaScript view");
//   const node = analysis.graph.nodes[0];
//   if (!node) throw new Error("missing module");
//   expect(projected.value.rows).toEqual([
//     {
//       node_id: node.node_id,
//       kind: node.kind,
//       path: "renderer.js",
//       identity: node.identity,
//       retained_source_range_count: 0,
//       basis: [
//         { authority: "artifact-bytes", state: "observed", confidence: "exact" },
//       ],
//     },
//   ]);
//   expect(projected.value.coverage).toMatchObject({ total: 1, exhausted: true });
//   expect(projected.value.source_coverage).toMatchObject({
//     application: analysis.graph.coverage,
//     semantic: { status: analysis.semantic_graph.coverage.status },
//   });
//   expect(JSON.stringify(projected.value.rows)).not.toMatch(
//     /secret|should not leak|observations/,
//   );
//   const row = projected.value.rows[0];
//   if (!row) throw new Error("missing reference");
//   const retainedIdentity = structuredClone(node.identity);
//   if (row.identity.strategy !== "content-digest")
//     throw new Error("expected digest identity");
//   row.identity.sha256 = "e".repeat(64);
//   expect(node.identity).toEqual(retainedIdentity);
//   const empty = projectAnalysisView(parent, {
//     ...input.view,
//     kind: "javascript",
//     collection: "modules",
//     projection: "references",
//     where: { kind: "javascript-module" },
//     offset: 0,
//     limit: 1,
//   });
//   if (!empty.ok) throw empty.error;
//   expect(empty.value).toMatchObject({
//     rows: [],
//     coverage: { total: 0, exhausted: true },
//   });
// });
//
// it("counts retained range observations including repeats and skips unavailable locations", () => {
//   const analysis = analysisViewJavaScriptAnalysis();
//   const original = analysis.graph.nodes[0];
//   const observed = original?.observations[0];
//   if (!original || !observed) throw new Error("missing module observation");
//   const range = {
//     kind: "source-range",
//     source: "renderer.js",
//     start: { line: 1, column: 0 },
//     end: { line: 1, column: 8 },
//   };
//   const node = createJavaScriptApplicationNode({
//     kind: original.kind,
//     identity: original.identity,
//     observations: [
//       ...["first retained observation", "second retained observation"].map(
//         (label) => ({
//           label,
//           properties: {},
//           evidence: {
//             ...observed.evidence,
//             location: { available: true, value: range },
//           },
//         }),
//       ),
//       {
//         label: "unavailable location",
//         properties: {},
//         evidence: {
//           ...observed.evidence,
//           authority: "unknown",
//           state: "unavailable",
//           confidence: "unknown",
//           location: {
//             available: false,
//             reason: "not-observed",
//             detail: "Location was not recorded.",
//           },
//           limitations: ["Location was not recorded."],
//         },
//       },
//     ],
//   });
//   const { graph_id: _graphId, ...application } = analysis.graph;
//   const graph = createJavaScriptApplicationGraph({
//     ...application,
//     nodes: [node],
//     root_node_ids: [node.node_id],
//   });
//   const parent = javascriptParent(
//     analysisViewBindJavaScriptGraphs(analysis, graph),
//   );
//   const references = projectAnalysisView(parent, {
//     kind: "javascript",
//     collection: "modules",
//     projection: "references",
//     where: {},
//     offset: 0,
//     limit: 1,
//   });
//   const item = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "modules",
//     selector: { node_id: node.node_id },
//   });
//   if (!references.ok) throw references.error;
//   if (!item.ok) throw item.error;
//   expect(references.value).toMatchObject({
//     rows: [{ node_id: node.node_id, retained_source_range_count: 2 }],
//   });
//   expect(item.value).toMatchObject({ item: { source_ranges: [range, range] } });
// });
//
// it("validates typed module selectors without coercing null or empty paths", () => {
//   const source = {
//     kind: "retained-evidence",
//     evidence_id: javascriptParent().evidenceId,
//   };
//   const view = {
//     kind: "javascript",
//     collection: "modules",
//     projection: "references",
//   };
//   for (const path of [null, "", "renderer.js"])
//     expect(
//       inspectAnalysisViewInputSchema.safeParse({
//         source,
//         view: { ...view, where: { path } },
//       }).success,
//     ).toBe(true);
//   for (const where of [
//     { path: 1 },
//     { kind: "electron-main" },
//     { glob: "*.js" },
//   ])
//     expect(
//       inspectAnalysisViewInputSchema.safeParse({
//         source,
//         view: { ...view, where },
//       }).success,
//     ).toBe(false);
//   expect(
//     projectAnalysisView(layoutParent(), {
//       ...view,
//       kind: "javascript",
//       collection: "modules",
//       projection: "references",
//       where: {},
//       offset: 0,
//       limit: 1,
//     }).ok,
//   ).toBe(false);
// });
//
// it("keeps mixed observation support distinct instead of promoting a module to observed", () => {
//   const analysis = analysisViewJavaScriptAnalysis();
//   const original = analysis.graph.nodes[0];
export const _l = 331;
