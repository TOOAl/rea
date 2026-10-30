export const __stub = 1;
// import { primitiveByteExpansionSource } from "../../../tests/fixtures/javascriptPrimitiveExpansion.js";
// import { graphForJavaScript as graphFor } from "../../../tests/fixtures/javascriptSemanticGraph.js";
// import * as t from "@babel/types";
// import { expect, it } from "vitest";
//
// import {
//   SEMANTIC_GRAPH_FILE_NODE_CEILING,
//   SEMANTIC_GRAPH_NODE_CEILING,
//   createJavaScriptSemanticGraphProjection,
//   projectJavaScriptSemanticFileSteps,
// } from "./JavaScriptSemanticGraphBuilder.js";
// import {
//   addSemanticGraphNode,
//   constructSemanticGraphNode,
//   createSemanticGraphProjectionState,
// } from "./JavaScriptSemanticGraphConstruction.js";
// import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
// import { queryJavaScriptSemanticGraph } from "../../domain/javascript/javascriptSemanticQuery.js";
// import {
//   analyzeJavaScriptSemantics,
//   analyzeParsedJavaScriptSemantics,
// } from "../../domain/javascript/javascriptSemanticAnalysis.js";
// import { parseJavaScriptSource } from "../../domain/javascript/javascriptSourceParser.js";
// import { semanticCoverageResourceLimits } from "../../domain/javascript/javascriptSemanticCoverage.js";
//
// const SHA256 = "a".repeat(64);
//
// it.each([
//   ["plain export", "const answer = 42; export { answer };", 0],
//   ["aliased export", "const answer = 42; export { answer as result };", 0],
//   ["declaration only", "const answer = 42;", 0],
//   ["genuine assignment", "let answer = 0; answer = 1;", 1],
// ])(
//   "projects writes only for actual writes: %s",
//   (_name, source, writeCount) => {
//     const graph = graphFor(source);
//     const binding = graph.nodes.find(
//       ({ kind, label }) => kind === "binding" && label === "answer",
//     );
//     if (binding === undefined) throw new Error("Expected answer binding");
//     const writes = graph.relations.filter(
//       ({ relation, target_node_id }) =>
//         relation === "writes" && target_node_id === binding.node_id,
//     );
//     expect(writes).toHaveLength(writeCount);
//     const exportReference = graph.nodes.find(
//       ({ identity }) => identity.role_key === "reference:0:export:answer",
//     );
//     if (source.includes("export {")) expect(exportReference).toBeDefined();
//
//     const trace = queryJavaScriptSemanticGraph(graph, {
//       seed: { kind: "semantic-node", node_id: binding.node_id },
//       direction: "backward-provenance",
//       allowed_relations: ["writes"],
//     });
//     expect(trace.status).toBe("found");
//     expect(trace.summary).toMatchObject({
//       total_seed_matches: 1,
//       traversed_relations: writeCount,
//     });
//     expect(trace.relations).toHaveLength(writeCount);
//   },
// );
//
// it("projects closure and direct interprocedural flow without execution", () => {
//   const graph = graphFor(`
//       const outer = 2;
//       function add(value) { return value + outer; }
//       const input = 40;
//       const answer = add(input);
//     `);
//
//   const relations = new Set(graph.relations.map(({ relation }) => relation));
//   for (const expected of [
//     "argument-to-parameter",
//     "calls",
//     "captures",
//     "defines",
//     "reads",
//     "returns-to-call",
//   ] as const)
//     expect(relations.has(expected)).toBe(true);
//   expect(graph.limitations).toContain(
//     "The semantic graph contains static syntax observations and conservative relationship candidates; it does not claim runtime execution.",
//   );
//   const parameter = graph.nodes.find(
//     ({ kind, label }) => kind === "parameter" && label === "value",
//   );
//   if (parameter === undefined) throw new Error("Expected parameter node");
//   const provenance = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: parameter.node_id },
//     direction: "backward-provenance",
//     include_ambiguous_dynamic_edges: true,
//   });
//   expect(provenance.relations.map(({ relation }) => relation)).toEqual(
//     expect.arrayContaining([
//       "aliases",
//       "argument-to-parameter",
//       "defines",
//       "reads",
//     ]),
//   );
// });
//
// it.each([
//   ["direct assignment", "source.count = 2;"],
//   ["destructuring assignment", "[source.count] = [2];"],
//   ["for-of head", "for (source.count of [4]) {}"],
//   ["for-in head", "for (source.count in { key: true }) {}"],
//   ["delete", "delete source.count;"],
// ])("projects a %s member target as a property write", (_name, statement) => {
//   const graph = graphFor(`const source = { count: 1 }; ${statement}`);
//   const operations = graph.nodes.filter(
//     ({ properties }) => properties.operation_kind !== undefined,
//   );
//   expect(operations.map(({ label }) => label)).toEqual(["write:/count"]);
//   const write = operations[0];
//   if (write === undefined) throw new Error("Expected write operation node");
//   expect(graph.relations).toContainEqual(
//     expect.objectContaining({
//       source_node_id: write.node_id,
//       relation: "writes-property",
//     }),
//   );
//   expect(graph.relations).not.toContainEqual(
//     expect.objectContaining({
//       source_node_id: write.node_id,
//       relation: "reads-property",
//     }),
//   );
// });
//
// it("continues to project an ordinary member access as a property read", () => {
//   const graph = graphFor(`
//     const source = { count: 1 };
//     const value = source.count;
//   `);
//   expect(graph.relations).toContainEqual(
//     expect.objectContaining({ relation: "reads-property" }),
//   );
// });
//
// it("keeps dynamic calls explicit and returns complete deterministic results", () => {
//   const graph = graphFor(`
//       const handlers = { ready() { return 1; } };
//       const key = process.argv[2];
//       handlers[key]();
//     `);
//   expect(graph.unknowns.some(({ reason }) => reason === "dynamic-call")).toBe(
//     true,
//   );
//   const seedNodeId = graph.relations.find(
//     ({ relation }) => relation === "defines",
//   )?.source_node_id;
//   if (seedNodeId === undefined) throw new Error("Expected a definition seed");
//
//   const first = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: seedNodeId },
//     direction: "forward-influence",
//     include_ambiguous_dynamic_edges: true,
//   });
//   const repeated = queryJavaScriptSemanticGraph(graph, {
//     seed: { kind: "semantic-node", node_id: seedNodeId },
//     direction: "forward-influence",
//     include_ambiguous_dynamic_edges: true,
//   });
//   expect(repeated).toEqual(first);
// });
//
// it("preserves primitive candidate budget unknowns in semantic graph coverage", () => {
//   const term = '(true ? "a" : "b")';
//   const source = `const answer = ${Array.from({ length: 20 }, () => term).join(" + ")};`;
//   const ir = analyzeJavaScriptSemantics(source);
//   const graph = graphFor(source, ir);
//
//   expect(ir.coverage).toMatchObject({
//     status: "partial",
//     resourceLimits: ["primitive-candidates"],
//   });
//   expect(graph.unknowns).toContainEqual(
//     expect.objectContaining({
//       family: "data-flow",
//       reason: "resource-limit",
//       detail: expect.stringMatching(/primitive candidate budget exceeded/i),
//     }),
//   );
// });
//
// it("preserves derived string-byte limit reasons in semantic graph unknowns", () => {
//   const source = primitiveByteExpansionSource();
//   const ir = analyzeJavaScriptSemantics(source);
//   const graph = graphFor(source, ir);
//
//   expect(semanticCoverageResourceLimits(ir.coverage)).toContain(
//     "primitive-bytes",
//   );
//   expect(graph.unknowns).toContainEqual(
//     expect.objectContaining({
//       reason: "resource-limit",
//       detail: expect.stringMatching(/primitive string-byte budget exceeded/i),
//     }),
//   );
// });
//
// it("retains resource-limit reasons at nested object property slots", () => {
//   const term = '(true ? "a" : "b")';
//   const source = `const answer = { nested: { value: ${Array.from({ length: 20 }, () => term).join(" + ")} } };`;
//   const ir = analyzeJavaScriptSemantics(source);
//   const graph = graphFor(source, ir);
//
//   expect(semanticCoverageResourceLimits(ir.coverage)).toEqual([
//     "primitive-candidates",
//   ]);
//   expect(graph.unknowns).toContainEqual(
//     expect.objectContaining({
//       family: "data-flow",
//       relation_kinds: ["defines"],
//       reason: "resource-limit",
//       detail: expect.stringMatching(
//         /Unknown value at property:\/nested\/value/u,
//       ),
//     }),
//   );
// });
//
// it("preserves deep expression resource reasons through graph projection", () => {
//   const source = "const answer = true;";
//   const parsed = parseJavaScriptSource(source);
//   const declaration = parsed?.program.body[0];
//   const declarator = t.isVariableDeclaration(declaration)
//     ? declaration.declarations[0]
//     : undefined;
//   if (parsed === null || !t.isVariableDeclarator(declarator))
//     throw new Error("Expected parsed binding initializer");
//   let expression: t.Expression = t.booleanLiteral(true);
//   for (let index = 0; index < 5_000; index += 1)
//     expression = t.unaryExpression("!", expression, true);
//   declarator.init = expression;
//   const ir = analyzeParsedJavaScriptSemantics(parsed);
//   const graph = graphFor(source, ir);
//
//   expect(semanticCoverageResourceLimits(ir.coverage)).toEqual([
//     "expression-depth",
//   ]);
//   expect(graph.unknowns).toContainEqual(
//     expect.objectContaining({
//       reason: "resource-limit",
//       detail: expect.stringMatching(/expression depth budget exceeded/i),
//     }),
//   );
// });
//
// it("keeps ambiguous interprocedural flow out of the default traversal", () => {
//   const graph = graphFor(`
//       function left(value) { return value; }
//       function right(value) { return value; }
//       const input = 1;
//       const selected = Math.random() ? left : right;
//       selected(input);
//     `);
//   const input = graph.nodes.find(
//     ({ kind, label }) => kind === "binding" && label === "input",
//   );
//   if (input === undefined) throw new Error("Expected input binding");
//   const query = {
export const _l = 265;
