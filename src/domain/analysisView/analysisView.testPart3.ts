export const __stub = 1;
//   const observed = original?.observations[0];
//   if (!original || !observed) throw new Error("missing module observation");
//   const inferred = {
//     ...observed.evidence,
//     authority: "static-relationship-inference" as const,
//     state: "inferred" as const,
//     confidence: "low" as const,
//     limitations: ["Static candidate; runtime loading is unknown."],
//   };
//   const node = createJavaScriptApplicationNode({
//     kind: original.kind,
//     identity: original.identity,
//     observations: [
//       {
//         label: observed.label,
//         properties: observed.properties,
//         evidence: observed.evidence,
//       },
//       { label: "candidate one", properties: {}, evidence: inferred },
//       { label: "candidate two", properties: {}, evidence: inferred },
//     ],
//   });
//   const { graph_id: _graphId, ...application } = analysis.graph;
//   const graph = createJavaScriptApplicationGraph({
//     ...application,
//     nodes: [node],
//     root_node_ids: [node.node_id],
//   });
//   const result = projectAnalysisView(
//     javascriptParent(analysisViewBindJavaScriptGraphs(analysis, graph)),
//     {
//       kind: "javascript",
//       collection: "modules",
//       projection: "references",
//       where: {},
//       offset: 0,
//       limit: 1,
//     },
//   );
//   if (!result.ok) throw result.error;
//   if (result.value.kind !== "javascript")
//     throw new Error("expected references");
//   expect(result.value.rows[0]?.basis).toHaveLength(2);
//   expect(result.value.rows[0]?.basis).toEqual(
//     expect.arrayContaining([
//       { authority: "artifact-bytes", state: "observed", confidence: "exact" },
//       {
//         authority: "static-relationship-inference",
//         state: "inferred",
//         confidence: "low",
//       },
//     ]),
//   );
// });
//
// it("rejects ambiguous JavaScript module paths with candidate node ids", () => {
//   const analysis = analysisViewJavaScriptAnalysis();
//   const first = analysis.graph.nodes[0];
//   if (first === undefined) throw new Error("missing module");
//   const duplicate = createJavaScriptApplicationNode({
//     kind: first.kind,
//     identity: {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: "c".repeat(64),
//     },
//     observations: first.observations.map((observation) => ({
//       label: observation.label,
//       properties: observation.properties,
//       evidence: {
//         ...observation.evidence,
//         artifact: {
//           ...observation.evidence.artifact,
//           sha256: "c".repeat(64),
//           artifact_id: `art_${"c".repeat(64)}`,
//         },
//       },
//     })),
//   });
//   const graph = createJavaScriptApplicationGraph({
//     schema: "JavaScriptApplicationGraph",
//     root_node_ids: [first.node_id, duplicate.node_id],
//     nodes: [first, duplicate],
//     edges: [],
//     coverage: analysis.graph.coverage,
//     limitations: analysis.graph.limitations,
//   });
//   const parent = javascriptParent(
//     analysisViewBindJavaScriptGraphs(analysis, graph),
//   );
//   const result = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "modules",
//     selector: { path: "renderer.js" },
//   });
//   expect(result.ok).toBe(false);
//   if (result.ok) throw new Error("expected ambiguous path");
//   expect(result.error).toMatchObject({
//     _tag: "AnalysisInputError",
//     issues: [
//       {
//         path: ["view", "selector", "path"],
//         expected: expect.arrayContaining([
//           { node_id: first.node_id },
//           { node_id: duplicate.node_id },
//         ]),
//       },
//     ],
//   });
//   const view = {
//     kind: "javascript",
//     collection: "modules",
//     projection: "references",
//     where: { path: "renderer.js" },
//     offset: 0,
//     limit: 1,
//   } as const;
//   const ids: string[] = [];
//   for (const offset of [0, 1, 2, Number.MAX_SAFE_INTEGER]) {
//     const page = projectAnalysisView(parent, { ...view, offset });
//     if (!page.ok) throw page.error;
//     if (page.value.kind !== "javascript")
//       throw new Error("expected references");
//     ids.push(...page.value.rows.map(({ node_id }) => node_id));
//     expect(page.value.coverage).toMatchObject({
//       total: 2,
//       next_offset: offset === 0 ? 1 : null,
//       exhausted: offset !== 0,
//     });
//   }
//   expect(ids).toEqual(graph.nodes.map(({ node_id }) => node_id));
// });
//
// it("pages actual modules, including unknown and empty paths, without unrelated roles", () => {
//   const analysis = analysisViewJavaScriptAnalysis();
//   const original = analysis.graph.nodes[0];
//   if (original === undefined) throw new Error("missing module");
//   const nodes = [
//     original,
//     ...(
//       [
//         "asar-entry",
//         "electron-renderer",
//         "javascript-module",
//         "source-module",
//       ] as const
//     ).map((kind) =>
//       createJavaScriptApplicationNode({
//         kind,
//         identity:
//           kind === "source-module"
//             ? {
//                 strategy: "source-map-original",
//                 source_root: null,
//                 stability: "source-map-exact",
//                 original_source: "",
//                 source_map_sha256: "c".repeat(64),
//                 source_sha256: null,
//               }
//             : kind === "javascript-module"
//               ? {
//                   strategy: "artifact-local-key",
//                   stability: "artifact-version",
//                   artifact_sha256: "c".repeat(64),
//                   namespace: kind,
//                   key: "module",
//                 }
//               : original.identity,
//         observations: original.observations.map((observation) => ({
//           ...(kind === "source-module"
//             ? {
//                 source_map_reference: sourceMapReference(
//                   "",
//                   null,
//                   "renderer.js",
//                 ),
//               }
//             : {}),
//           label: observation.label,
//           properties: {},
//           evidence:
//             kind === "javascript-module" || kind === "source-module"
//               ? {
//                   ...observation.evidence,
//                   artifact: {
//                     ...observation.evidence.artifact,
//                     sha256: "c".repeat(64),
//                     artifact_id: `art_${"c".repeat(64)}`,
//                   },
//                   ...(kind === "javascript-module"
//                     ? {
//                         state: "unknown",
//                         confidence: "unknown",
//                         limitations: ["Source location unavailable"],
//                         location: {
//                           available: false,
//                           reason: "unknown",
//                           detail: "Source location unavailable",
//                         },
//                       }
//                     : {}),
//                 }
//               : observation.evidence,
//         })),
//       }),
//     ),
//   ];
//   const graph = createJavaScriptApplicationGraph({
//     schema: "JavaScriptApplicationGraph",
//     root_node_ids: nodes.map((node) => node.node_id),
//     nodes,
//     edges: [],
//     coverage: analysis.graph.coverage,
//     limitations: [],
//   });
//   const parent = javascriptParent(
//     analysisViewBindJavaScriptGraphs(analysis, graph),
//   );
//   const page = projectAnalysisView(parent, {
//     kind: "page",
//     collection: "modules",
//     offset: 0,
//     limit: 1000,
//   });
//   if (!page.ok) throw page.error;
//   expect(page.value).toMatchObject({
//     coverage: { total: 3, examined: 3, exhausted: true },
//   });
//   if (page.value.kind !== "page") throw new Error("expected page");
//   expect(page.value.items).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({ kind: "javascript-module", path: null }),
//       expect.objectContaining({ kind: "source-module", path: "" }),
//     ]),
//   );
//   const emptyPath = projectAnalysisView(parent, {
//     kind: "item",
//     collection: "modules",
//     selector: { path: "" },
//   });
//   for (const [path, kind] of [
//     [null, "javascript-module"],
//     ["", "source-module"],
//   ] as const) {
//     const references = projectAnalysisView(parent, {
//       kind: "javascript",
//       collection: "modules",
//       projection: "references",
//       where: { path },
//       offset: 0,
//       limit: 1,
//     });
//     if (!references.ok) throw references.error;
//     expect(references.value).toMatchObject({
//       rows: [{ path, kind }],
//       coverage: { total: 1, exhausted: true },
//     });
//   }
//   expect(emptyPath.ok).toBe(true);
//   const role = nodes.find((node) => node.kind === "electron-renderer");
//   if (role === undefined) throw new Error("missing role");
//   expect(
//     projectAnalysisView(parent, {
//       kind: "item",
//       collection: "modules",
//       selector: { node_id: role.node_id },
//     }).ok,
//   ).toBe(false);
// });
//
// const complete = <Value>(steps: Generator<void, Value>): Value => {
//   let step = steps.next();
//   while (!step.done) step = steps.next();
//   return step.value;
// };
//
// it("reuses authenticated graphs while rejecting malformed metadata and imported companions", () => {
//   const analysis = analysisViewJavaScriptAnalysis();
//   const { graph_id: _applicationId, ...application } = analysis.graph;
//   const graph = complete(
//     createImmutableJavaScriptApplicationGraphSteps(application),
//   );
//   const { graph_id: _semanticId, ...semantic } = analysis.semantic_graph;
//   const semanticGraph = complete(
//     createImmutableJavaScriptSemanticGraphSteps({
//       ...semantic,
//       application_graph_id: graph.graph_id,
//     }),
//   );
//   const owned = { ...analysis, graph, semantic_graph: semanticGraph };
//   expect(
//     projectAnalysisView(javascriptParent(owned), { kind: "summary" }).ok,
//   ).toBe(true);
//   for (const malformed of [
//     { ...owned, root_artifact_sha256: "d".repeat(64) },
//     {
//       ...owned,
//       statistics: { ...owned.statistics, parsed_javascript_files: -1 },
//     },
//     {
//       ...owned,
//       semantic_graph: Object.freeze({
//         ...semanticGraph,
//         application_graph_id: "jag_" + "d".repeat(64),
//       }),
//     },
//   ]) {
//     const result = projectAnalysisView(
//       { ...javascriptParent(owned), normalizedResult: malformed },
//       { kind: "summary" },
//     );
//     expect(result).toMatchObject({
//       ok: false,
//       error: {
//         _tag: "AnalysisInputError",
//         issues: expect.arrayContaining([
//           expect.objectContaining({
//             path: expect.arrayContaining(["source", "normalized_result"]),
//           }),
//         ]),
//       },
//     });
//   }
// });
//
// it("retains semantic coverage and limitations in a summary", () => {
//   const analysis = analysisViewJavaScriptAnalysis();
//   const { graph_id: _graphId, ...semantic } = analysis.semantic_graph;
//   const semanticGraph = createJavaScriptSemanticGraph({
//     ...semantic,
//     coverage: {
export const _l = 331;
