export const __stub = 1;
//     seed: { kind: "semantic-node" as const, node_id: input.node_id },
//     direction: "forward-influence" as const,
//     allowed_relations: [
//       "reads" as const,
//       "aliases" as const,
//       "argument-to-parameter" as const,
//     ],
//   };
//   const strict = queryJavaScriptSemanticGraph(graph, query);
//   expect(
//     strict.relations.some(
//       ({ relation }) => relation === "argument-to-parameter",
//     ),
//   ).toBe(false);
//   expect(strict.status).toBe("ambiguous");
//   const admitted = queryJavaScriptSemanticGraph(graph, {
//     ...query,
//     include_ambiguous_dynamic_edges: true,
//   });
//   expect(
//     admitted.relations.filter(
//       ({ relation }) => relation === "argument-to-parameter",
//     ),
//   ).toHaveLength(2);
//   expect(admitted.status).toBe("ambiguous");
// });
//
// it("connects caller results, direct returns, parameters, and captures", () => {
//   const graph = graphFor(`
//       const outer = 2;
//       function identity(value) { return value; }
//       function readOuter() { return outer; }
//       const input = 40;
//       const output = identity(input);
//     `);
//   const binding = (label: string) =>
//     graph.nodes.find(
//       ({ kind, label: nodeLabel }) =>
//         ["binding", "parameter"].includes(kind) && nodeLabel === label,
//     );
//   const output = binding("output");
//   const input = binding("input");
//   const outer = binding("outer");
//   const readOuter = graph.nodes.find(
//     ({ kind, label }) => kind === "function" && label === "readOuter",
//   );
//   if (
//     output === undefined ||
//     input === undefined ||
//     outer === undefined ||
//     readOuter === undefined
//   )
//     throw new Error("Expected semantic flow nodes");
//   const provenance = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: output.node_id },
//     direction: "backward-provenance",
//   });
//   expect(provenance.nodes.map(({ node_id }) => node_id)).toContain(
//     input.node_id,
//   );
//   const influence = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: outer.node_id },
//     direction: "forward-influence",
//     allowed_relations: ["captures"],
//   });
//   expect(influence.nodes.map(({ node_id }) => node_id)).toContain(
//     readOuter.node_id,
//   );
//   const capture = graph.relations.find(
//     ({ relation }) => relation === "captures",
//   );
//   expect(capture?.evidence.location).toMatchObject({
//     available: true,
//     value: { kind: "source-range", source: "app.js" },
//   });
//   expect(capture?.evidence.location).not.toEqual(readOuter.evidence.location);
// });
//
// it("reports complete graph coverage for deeply nested static values", () => {
//   const nesting = 40;
//   const nestedValue =
//     Array.from({ length: nesting }, () => "{ next: ").join("") +
//     '"value"' +
//     " }".repeat(nesting);
//   const graph = graphFor(`const nested = ${nestedValue};`);
//   expect(graph.coverage).toMatchObject({
//     truncated: false,
//     omitted_nodes: 0,
//     omitted_relations: 0,
//     limits: [],
//   });
// });
//
// it("projects bounded Promise ownership and unresolved sources", () => {
//   const graph = graphFor(`
//       async function run(value) {
//         const owned = new Promise((resolve) => resolve(value));
//         await Promise.resolve(owned);
//         Promise.resolve(value).then(work).finally(cleanup);
//         value.then(work);
//         return Promise.all([owned, Promise.resolve(value)]);
//       }
//     `);
//
//   const relations = new Set(graph.relations.map(({ relation }) => relation));
//   for (const expected of [
//     "aggregates",
//     "awaits",
//     "chains",
//     "creates-promise",
//     "detaches-task",
//     "owns",
//     "returns-task",
//   ] as const)
//     expect(relations.has(expected)).toBe(true);
//   expect(graph.nodes.filter(({ kind }) => kind === "promise")).not.toHaveLength(
//     0,
//   );
//   expect(
//     graph.nodes.find(
//       ({ kind, properties }) =>
//         kind === "promise" &&
//         properties.method === "all" &&
//         properties.ownership === "returned",
//     ),
//   ).toBeDefined();
//   expect(
//     graph.unknowns.some(
//       ({ family, reason }) =>
//         family === "promise-ownership" && reason === "ambiguous-target",
//     ),
//   ).toBe(true);
//   expect(
//     graph.coverage.families.find(
//       ({ family }) => family === "promise-ownership",
//     ),
//   ).toMatchObject({ status: "partial" });
// });
//
// it("keeps duplicate function fingerprints ambiguous", () => {
//   const graph = graphFor(`
//       function first(value) { return value + 1; }
//       function second(input) { return input + 1; }
//     `);
//
//   expect(graph.fingerprints).toHaveLength(2);
//   const digest = graph.fingerprints[0]?.fingerprint_sha256;
//   expect(digest).toBeDefined();
//   expect(graph.fingerprints[1]?.fingerprint_sha256).toBe(digest);
//   if (digest === undefined) throw new Error("Expected fingerprint");
//   const query = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "function", fingerprint_sha256: digest },
//     direction: "forward-influence",
//   });
//   expect(query.status).toBe("ambiguous");
//   expect(query.summary.total_seed_matches).toBe(2);
// });
//
// it("selects analyzer-produced boundaries by their method field", () => {
//   const graph = graphFor("const port = Number(process.env.PORT);");
//   const boundary = graph.nodes.find(({ kind }) => kind === "boundary");
//   if (boundary === undefined) throw new Error("Expected a boundary node");
//
//   expect(boundary.properties).toMatchObject({
//     boundary_kind: "coerce",
//     field: "Number",
//     method: "Number",
//   });
//   expect(
//     queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "boundary-field", field: "Number" },
//       direction: "forward-influence",
//     }),
//   ).toMatchObject({
//     seed_node_ids: [boundary.node_id],
//     summary: { total_seed_matches: 1 },
//   });
//   expect(
//     queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "boundary-field", field: "missing-field" },
//       direction: "forward-influence",
//     }).summary.total_seed_matches,
//   ).toBe(0);
// });
//
// const semanticNodeFor = (roleKey: string) => {
//   const file: JavaScriptArtifactFile = {
//     path: "budget.js",
//     container_sha256: SHA256,
//     sha256: SHA256,
//     bytes: 0,
//     inventory_artifact_id: `art_${SHA256}`,
//     kind: "javascript",
//     unpacked: false,
//     text: { included: true, value: "" },
//   };
//   const state = createSemanticGraphProjectionState();
//   return constructSemanticGraphNode(
//     file,
//     {
//       kind: "expression",
//       roleKey,
//       location: null,
//       label: roleKey,
//       functionNodeId: null,
//     },
//     state,
//   );
// };
//
// it.each([
//   "const value = consume(Promise.resolve(1));",
//   "async function run() { await consume(Promise.resolve(1)); }",
//   "function run() { return consume(Promise.resolve(1)); }",
//   "const value = Promise.all([{ promise: Promise.resolve(1) }]);",
// ])(
//   "does not claim direct Promise ownership through an enclosing expression: %s",
//   (source) => {
//     const graph = graphFor(source);
//     const promise = graph.nodes.find(
//       ({ kind, properties }) =>
//         kind === "promise" && properties.method === "resolve",
//     );
//     expect(promise?.properties.ownership).toBe("unknown");
//     expect(
//       graph.relations.filter(
//         ({ target_node_id, relation }) =>
//           target_node_id === promise?.node_id &&
//           ["owns", "awaits", "returns-task", "aggregates"].includes(relation),
//       ),
//     ).toEqual([]);
//   },
// );
//
// it.each([
//   "const routes = {'': 'HOME'}; const root = routes[''];",
//   "const routes = {'': 'HOME'}; const {'': root} = routes;",
// ])(
//   "preserves empty property identities with valid display labels: %s",
//   (source) => {
//     const graph = graphFor(source);
//     expect(graph.nodes).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           kind: "property-slot",
//           label: '""',
//           properties: expect.objectContaining({ name: "" }),
//         }),
//       ]),
//     );
//     const root = graph.nodes.find(
//       ({ kind, label }) => kind === "binding" && label === "root",
//     );
//     const literal = graph.nodes.find(
//       ({ kind, identity, properties }) =>
//         kind === "literal" &&
//         properties.value === "HOME" &&
//         identity.role_key.includes(":binding:root:"),
//     );
//     expect(literal).toBeDefined();
//     expect(graph.relations).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           source_node_id: literal?.node_id,
//           target_node_id: root?.node_id,
export const _l = 265;
