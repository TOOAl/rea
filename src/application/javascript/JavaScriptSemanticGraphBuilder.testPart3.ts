export const __stub = 1;
//           relation: "defines",
//           resolution: "resolved",
//         }),
//       ]),
//     );
//   },
// );
// it("keeps exact empty environment keys distinct from dynamic keys", () => {
//   const graph = graphFor(`
//       const empty = process.env[''];
//       const named = process.env.HOME;
//       const dynamic = process.env[name];
//     `);
//   const sources = graph.nodes
//     .filter(({ kind }) => kind === "config-source")
//     .map(({ label, properties }) => ({ label, key: properties.key }));
//   expect(sources).toEqual(
//     expect.arrayContaining([
//       { label: '""', key: "" },
//       { label: "HOME", key: "HOME" },
//       { label: "environment", key: null },
//     ]),
//   );
//   expect(sources).toHaveLength(3);
// });
//
// it("labels exact empty method names without inventing computed names", () => {
//   const graph = graphFor(`
//       const target = {
//         ['']() { return 42; },
//         ['""']() { return 2; },
//         [key]() { return 1; },
//       };
//     `);
//   const functions = graph.nodes
//     .filter(({ kind }) => kind === "function")
//     .map(({ label, properties }) => ({ label, name: properties.name }));
//   // Both exact names display as `""`; only `properties.name` tells them apart.
//   expect(functions).toEqual(
//     expect.arrayContaining([
//       { label: '""', name: "" },
//       { label: '""', name: '""' },
//     ]),
//   );
//   expect(
//     functions.filter(({ label }) => label?.startsWith("[computed@")),
//   ).toHaveLength(1);
// });
//
// it.each([
//   "Promise.resolve(1)",
//   "(Promise.resolve(1) as Promise<number>)",
//   "(Promise.resolve(1) satisfies Promise<number>)",
//   "Promise.resolve(1)!",
//   "((Promise.resolve(1) as Promise<number>)!)",
//   "(new Promise(resolve => resolve(1)) as Promise<number>)",
//   "(Promise.all([Promise.resolve(1)]) as Promise<number[]>)",
//   "(Promise.resolve(1).then(value => value) as Promise<number>)",
// ])("projects a traversable returned-task link for %s", (expression) => {
//   const graph = graphFor(`const run = () => ${expression};`);
//   const promise = graph.nodes.find(
//     ({ kind, properties }) =>
//       kind === "promise" && properties.ownership === "returned",
//   );
//   const relation = graph.relations.find(
//     ({ relation: kind }) => kind === "returns-task",
//   );
//   expect(promise).toBeDefined();
//   expect(relation).toMatchObject({
//     target_node_id: promise?.node_id,
//     resolution: "resolved",
//   });
//   const returnNode = graph.nodes.find(
//     ({ node_id }) => node_id === relation?.source_node_id,
//   );
//   expect(returnNode?.kind).toBe("return-site");
//   if (returnNode === undefined)
//     throw new Error("Expected the linked return site");
//   const query = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: returnNode.node_id },
//     direction: "forward-influence",
//     allowed_relations: ["returns-task"],
//   });
//   expect(query.relations).toContainEqual(relation);
//   expect(query.nodes.map(({ node_id }) => node_id)).toContain(promise?.node_id);
// });
//
// it("bounds semantic node projection and reports the ceiling in coverage", () => {
//   // A bundled vendor library can emit tens of thousands of semantic nodes on its
//   // own (measured: 135,286 from one minified editor bundle). Without a ceiling the
//   // projection exhausts the heap and the result cannot be serialized. The bound
//   // must be reported through coverage rather than dropping data silently.
//   const statements = Array.from(
//     { length: 4_000 },
//     (_, index) =>
//       `const value${index} = { a: ${index}, b: [${index}, ${index + 1}] };`,
//   ).join("\n");
//   const graph = graphFor(statements);
//
//   expect(graph.nodes.length).toBeLessThanOrEqual(SEMANTIC_GRAPH_NODE_CEILING);
//   expect(graph.coverage.truncated).toBe(true);
//   expect(graph.coverage.status).toBe("partial");
//   expect(graph.coverage.omitted_nodes).toBeNull();
//   expect(graph.coverage.omitted_relations).toBeNull();
//   expect(
//     graph.coverage.families.every(
//       ({ omitted_relations }) => omitted_relations === null,
//     ),
//   ).toBe(true);
//   expect(
//     graph.coverage.limits.some(
//       ({ name }) => name === "semantic_graph_node_ceiling",
//     ),
//   ).toBe(true);
// });
//
// it("leaves a small application complete and untruncated", () => {
//   const graph = graphFor("const answer = 40 + 2;");
//   expect(graph.coverage.truncated).toBe(false);
//   expect(graph.coverage.omitted_nodes).toBe(0);
//   expect(graph.coverage.omitted_relations).toBe(0);
//   expect(graph.coverage.limits).toEqual([]);
// });
//
// it("does not mark a file truncated when it exactly fills its budget", () => {
//   // Each unbound reference projects one expression, plus the module root.
//   const graph = graphFor(
//     "external;\n".repeat(SEMANTIC_GRAPH_FILE_NODE_CEILING - 1),
//   );
//   expect(graph.nodes).toHaveLength(SEMANTIC_GRAPH_FILE_NODE_CEILING);
//   expect(graph.coverage).toMatchObject({
//     truncated: false,
//     omitted_nodes: 0,
//     omitted_relations: 0,
//     limits: [],
//   });
// });
//
// it("only records node loss when the budget rejects a new identity", () => {
//   // The truncation signal must record blocked node creation, not a zero
//   // remaining budget: a file using exactly its share drops nothing.
//   const state = createSemanticGraphProjectionState();
//   state.fileNodeBudget = 2;
//   state.fileNodesDropped = false;
//   const first = addSemanticGraphNode(state, semanticNodeFor("first"));
//   const second = addSemanticGraphNode(state, semanticNodeFor("second"));
//   expect(first).not.toBeNull();
//   expect(second).not.toBeNull();
//   expect(state.fileNodeBudget).toBe(0);
//   expect(state.fileNodesDropped).toBe(false);
//
//   expect(addSemanticGraphNode(state, semanticNodeFor("first"))).toBe(first);
//   expect(state.fileNodesDropped).toBe(false);
//
//   const blocked = addSemanticGraphNode(state, semanticNodeFor("third"));
//   expect(blocked).toBeNull();
//   expect(state.fileNodesDropped).toBe(true);
// });
//
// it("keeps full static property identities distinct through backward provenance", () => {
//   const graph = graphFor(`
//     const root = { a: { id: 'left' }, b: { id: 'right' }, 'a.id': 'dotted', '': { 'a/b~c': 'escaped' } };
//     const left = root.a.id;
//     const right = root['b']['id'];
//     const missing = root.id;
//     const dotted = root['a.id'];
//     const escaped = root['']['a/b~c'];
//   `);
//   const slots = graph.nodes.filter(({ kind }) => kind === "property-slot");
//   for (const [pointer, literal] of [
//     ["/a/id", "left"],
//     ["/b/id", "right"],
//     ["/a.id", "dotted"],
//     ["//a~1b~0c", "escaped"],
//     ["/id", null],
//   ]) {
//     const slot = slots.find(
//       ({ properties }) => properties.property_pointer === pointer,
//     );
//     if (slot === undefined) throw new Error(`Missing slot ${pointer}`);
//     expect(slot.properties.presence).toBe(
//       literal === null ? "absent" : "present",
//     );
//     const trace = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: slot.node_id },
//       direction: "backward-provenance",
//       allowed_relations: ["defines"],
//     });
//     expect(
//       trace.nodes
//         .filter(({ kind }) => kind === "literal")
//         .map(({ properties }) => properties.value),
//     ).toEqual(literal === null ? [] : [literal]);
//     const reads = graph.relations.filter(
//       ({ source_node_id, relation }) =>
//         source_node_id === slot.node_id && relation === "reads-property",
//     );
//     expect(reads).toHaveLength(1);
//     expect(reads[0]?.resolution).toBe(
//       literal === null ? "candidate" : "resolved",
//     );
//   }
// });
//
// it("targets nested writes and destructuring without inventing leaf-level root slots", () => {
//   const graph = graphFor(`
//     const root = { left: { id: 'before' }, right: { id: 'untouched' } };
//     root.left.id = produce();
//     const { right: { id: selected } } = root;
//     const [first, missing] = [1, , 3];
//   `);
//   const rootSlots = graph.nodes.filter(
//     ({ kind, properties }) =>
//       kind === "property-slot" && properties.name === "id",
//   );
//   expect(
//     rootSlots.map(({ properties }) => properties.property_pointer).sort(),
//   ).toEqual(["/left/id", "/right/id"]);
//   const left = rootSlots.find(
//     ({ properties }) => properties.property_pointer === "/left/id",
//   );
//   const right = rootSlots.find(
//     ({ properties }) => properties.property_pointer === "/right/id",
//   );
//   expect(left?.properties.presence).toBe("unknown-coverage");
//   const write = graph.nodes.find(
//     ({ kind, properties }) =>
//       kind === "expression" && properties.operation_kind === "write",
//   );
//   expect(graph.relations).toContainEqual(
//     expect.objectContaining({
//       source_node_id: write?.node_id,
//       target_node_id: left?.node_id,
//       relation: "writes-property",
//       resolution: "resolved",
//     }),
//   );
//   const selected = graph.nodes.find(
//     ({ kind, label }) => kind === "binding" && label === "selected",
//   );
//   expect(graph.relations).toContainEqual(
//     expect.objectContaining({
//       source_node_id: right?.node_id,
//       target_node_id: selected?.node_id,
//       relation: "destructures",
//       resolution: "resolved",
//     }),
//   );
// });
//
// it("keeps dynamic intermediate receivers unresolved instead of selecting a static leaf", () => {
//   const graph = graphFor(`
//     const root = { id: 'root', a: { id: 'nested' } };
//     const selected = root[key].id;
//   `);
//   expect(
//     graph.relations.filter(({ relation }) => relation === "reads-property"),
//   ).toEqual([]);
//   expect(graph.unknowns).toContainEqual(
//     expect.objectContaining({
//       family: "object-flow",
//       relation_kinds: ["reads-property"],
//     }),
//   );
//   const selected = graph.nodes.find(
export const _l = 265;
