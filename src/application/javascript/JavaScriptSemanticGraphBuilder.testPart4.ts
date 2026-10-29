export const __stub = 1;
//     ({ kind, label }) => kind === "binding" && label === "selected",
//   );
//   if (selected === undefined) throw new Error("Missing selected binding");
//   const trace = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: selected.node_id },
//     direction: "backward-provenance",
//     allowed_relations: ["defines"],
//   });
//   expect(trace.nodes.filter(({ kind }) => kind === "literal")).toEqual([]);
// });
//
// it.each([
//   {
//     initializer: "{}",
//     path: "missing.id",
//     pointer: "/missing/id",
//     resolved: false,
//   },
//   {
//     initializer: "{ a: null }",
//     path: "a.id",
//     pointer: "/a/id",
//     resolved: false,
//   },
//   { initializer: "{ a: 1 }", path: "a.id", pointer: "/a/id", resolved: false },
//   { initializer: "{ a: {} }", path: "a.id", pointer: "/a/id", resolved: true },
//   { initializer: "{ a: [] }", path: "a[0]", pointer: "/a/0", resolved: true },
// ])(
//   "admits a write only through a retained container receiver: $initializer.$path",
//   ({ initializer, path, pointer, resolved }) => {
//     const graph = graphFor(
//       `const root = ${initializer}; root.${path} = produce();`,
//     );
//     const write = graph.nodes.find(
//       ({ kind, properties }) =>
//         kind === "expression" && properties.operation_kind === "write",
//     );
//     const slot = graph.nodes.find(
//       ({ kind, properties }) =>
//         kind === "property-slot" && properties.property_pointer === pointer,
//     );
//     if (write === undefined || slot === undefined)
//       throw new Error("Expected write and target slot");
//     expect(graph.relations).toContainEqual(
//       expect.objectContaining({
//         source_node_id: write.node_id,
//         target_node_id: slot.node_id,
//         relation: "writes-property",
//         resolution: resolved ? "resolved" : "candidate",
//       }),
//     );
//     const trace = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: write.node_id },
//       direction: "forward-influence",
//       allowed_relations: ["writes-property"],
//     });
//     expect(trace.nodes.some(({ node_id }) => node_id === slot.node_id)).toBe(
//       resolved,
//     );
//     if (!resolved)
//       expect(graph.unknowns).toContainEqual(
//         expect.objectContaining({
//           node_id: slot.node_id,
//           relation_kinds: ["writes-property"],
//           detail: expect.stringContaining(
//             "receiver is unresolved or not a retained container",
//           ),
//         }),
//       );
//   },
// );
//
// it.each(["", "root.length = 0;", "root.length = query(); root[0] = 9;"])(
//   "retains array length presence without inventing an exact length after %s",
//   (mutation) => {
//     const graph = graphFor(
//       `const root = [, 1]; ${mutation} const length = root.length;`,
//     );
//     const slot = graph.nodes.find(
//       ({ kind, properties }) =>
//         kind === "property-slot" && properties.property_pointer === "/length",
//     );
//     expect(slot?.properties).toMatchObject({
//       name: "length",
//       presence: "present",
//       value_status: "unknown",
//     });
//     const trace = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "property", name: "length" },
//       direction: "forward-influence",
//       allowed_relations: ["reads-property"],
//     });
//     expect(trace.seed_node_ids).toEqual([slot?.node_id]);
//     expect(trace.relations).toContainEqual(
//       expect.objectContaining({
//         source_node_id: slot?.node_id,
//         relation: "reads-property",
//         resolution: "resolved",
//       }),
//     );
//     expect(
//       graph.relations.some(
//         ({ target_node_id, relation }) =>
//           target_node_id === slot?.node_id && relation === "defines",
//       ),
//     ).toBe(false);
//   },
// );
//
// it.each([
//   ["object spread", 'const root = { known: "value", ...dynamic };'],
//   ["array spread", 'const root = ["value", ...dynamic];'],
// ])(
//   "keeps omitted initializer coverage on the owning binding: %s",
//   (_label, source) => {
//     const graph = graphFor(source);
//     const root = graph.nodes.find(
//       ({ kind, label }) => kind === "binding" && label === "root",
//     );
//     if (root === undefined) throw new Error("Expected root binding");
//     const result = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: root.node_id },
//       direction: "forward-influence",
//     });
//
//     expect(result.coverage.status).toBe("partial");
//     expect(result.unknowns).toContainEqual(
//       expect.objectContaining({
//         node_id: root.node_id,
//         family: "object-flow",
//         reason: "ambiguous-target",
//         detail: expect.stringContaining("Initializer container has unknown"),
//       }),
//     );
//   },
// );
//
// it.each([
//   ["bare if", 'if (flag) alias = { mode: "other" }; alias.mode = "updated";'],
//   [
//     "logical expression",
//     'flag && (alias = { mode: "other" }); alias.mode = "updated";',
//   ],
//   [
//     "logical assignment",
//     'flag ||= (alias = { mode: "other" }); alias.mode = "updated";',
//   ],
//   ["or assignment", 'alias ||= { mode: "other" }; alias.mode = "updated";'],
//   [
//     "nullish assignment",
//     'alias ??= { mode: "other" }; alias.mode = "updated";',
//   ],
//   [
//     "conditional mutation",
//     'alias = { mode: "other" }; if (flag) alias.mode = "updated";',
//   ],
//   [
//     "short-circuit mutation",
//     'alias = { mode: "other" }; flag && (alias.mode = "updated");',
//   ],
// ])(
//   "preserves possible alias mutation uncertainty in queries: %s",
//   (_label, body) => {
//     const graph = graphFor(`
//     const shared = { mode: "initial" };
//     let alias = shared;
//     ${body}
//   `);
//     const sharedMode = graph.nodes.find(
//       ({ kind, identity, properties }) =>
//         kind === "property-slot" &&
//         properties.property_pointer === "/mode" &&
//         identity.role_key.includes("binding:shared"),
//     );
//     if (sharedMode === undefined) throw new Error("Expected shared mode slot");
//     const result = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: sharedMode.node_id },
//       direction: "backward-provenance",
//     });
//
//     expect(sharedMode.properties.presence).toBe("unknown-coverage");
//     expect(result.nodes).toContainEqual(
//       expect.objectContaining({ node_id: sharedMode.node_id }),
//     );
//     expect(result.coverage.status).toBe("partial");
//   },
// );
//
// it.each(["{}", "unknownRoot", "{ a: null }"])(
//   "preserves the requested deep leaf name after a blocked prefix: %s",
//   (initializer) => {
//     const graph = graphFor(
//       `const root = ${initializer}; const selected = root.a.b.c;`,
//     );
//     const slot = graph.nodes.find(
//       ({ kind, properties }) =>
//         kind === "property-slot" && properties.property_pointer === "/a/b/c",
//     );
//     expect(slot).toMatchObject({
//       label: "c",
//       properties: {
//         name: "c",
//         property_path: ["a", "b", "c"],
//         presence: "unknown-coverage",
//         value_status: "unknown",
//       },
//     });
//     const trace = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "property", name: "c" },
//       direction: "backward-provenance",
//       allowed_relations: ["defines"],
//     });
//     expect(trace.seed_node_ids).toEqual([slot?.node_id]);
//     expect(trace.nodes.filter(({ kind }) => kind === "literal")).toEqual([]);
//   },
// );
//
// it("projects and adopts more than the default per-file capacity when explicitly offered", () => {
//   const text = "external;\n".repeat(20_001);
//   const file: JavaScriptArtifactFile = {
//     path: "large.js",
//     container_sha256: SHA256,
//     sha256: SHA256,
//     bytes: Buffer.byteLength(text),
//     inventory_artifact_id: `art_${SHA256}`,
//     kind: "javascript",
//     unpacked: false,
//     text: { included: true, value: text },
//   };
//   const steps = projectJavaScriptSemanticFileSteps(
//     file,
//     analyzeJavaScriptSemantics(text),
//     20_002,
//   );
//   let result = steps.next();
//   while (!result.done) result = steps.next();
//   expect(result.value.nodes).toHaveLength(20_002);
//   expect(result.value.truncated).toBe(false);
//   const projection = createJavaScriptSemanticGraphProjection({
//     totalNodes: 20_010,
//     fileNodes: 20_002,
//   });
//   projection.adoptFileProjection(result.value);
//   expect(projection.remainingFileNodeBudget()).toBe(8);
//   const graph = projection.finish(SHA256, {
//     graph_id: `jag_${"b".repeat(64)}`,
//     nodes: [],
//   });
//   expect(graph.coverage).toMatchObject({
//     truncated: false,
//     omitted_nodes: 0,
//     omitted_relations: 0,
//   });
//   const bounded = createJavaScriptSemanticGraphProjection({
//     totalNodes: 20_001,
//     fileNodes: 20_002,
//   });
//   expect(() => bounded.adoptFileProjection(result.value)).toThrow(
//     "exceed the offered tree capacity",
//   );
// });
export const _l = 261;
