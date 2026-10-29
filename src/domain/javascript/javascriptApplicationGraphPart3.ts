export const __stub = 1;
//       code: "custom",
//       message: "Node identity is not supported by a compatible observation",
//       path: ["nodes", index, "identity"],
//     });
// };
//
// type GraphRecord = z.infer<typeof javascriptApplicationGraphRecordSchema>;
//
// const checkGraphContent = (
//   graph: JavaScriptApplicationGraphInput,
//   context: GraphIssueContext,
// ): void => {
//   const steps = checkGraphContentSteps(graph, context);
//   while (steps.next().done !== true);
// };
//
// function* checkGraphContentSteps(
//   graph: JavaScriptApplicationGraphInput,
//   context: GraphIssueContext,
// ): Generator<void, void> {
//   sortedUniqueIssue(
//     graph.root_node_ids,
//     ["root_node_ids"],
//     "Root nodes",
//     context,
//   );
//   sortedUniqueIssue(
//     graph.nodes.map(({ node_id: id }) => id),
//     ["nodes"],
//     "Nodes",
//     context,
//   );
//   sortedUniqueIssue(
//     graph.edges.map(({ edge_id: id }) => id),
//     ["edges"],
//     "Edges",
//     context,
//   );
//   sortedUniqueIssue(
//     graph.limitations,
//     ["limitations"],
//     "Graph limitations",
//     context,
//   );
//   sortedUniqueIssue(
//     graph.coverage.limits.map(limitKey),
//     ["coverage", "limits"],
//     "Graph limits",
//     context,
//   );
//   if (graph.coverage.status !== "complete" && graph.limitations.length === 0)
//     context.addIssue({
//       code: "custom",
//       message: "Non-complete graph coverage requires an explicit limitation",
//       path: ["limitations"],
//     });
//
//   const nodesById = new Map(graph.nodes.map((node) => [node.node_id, node]));
//   for (const root of graph.root_node_ids)
//     if (!nodesById.has(root))
//       context.addIssue({
//         code: "custom",
//         message: "Root identifier must name a graph node",
//         path: ["root_node_ids"],
//       });
//   for (const [index, node] of graph.nodes.entries()) {
//     if (index % 64 === 0) yield;
//     checkNode(node, index, context);
//   }
//   for (const [index, edge] of graph.edges.entries()) {
//     if (index % 64 === 0) yield;
//     const { edge_id: identifier, ...semantic } = edge;
//     if (identifier !== edgeId(semantic))
//       context.addIssue({
//         code: "custom",
//         message: "Edge identifier does not match its semantic content",
//         path: ["edges", index, "edge_id"],
//       });
//     if (
//       !nodesById.has(edge.source_node_id) ||
//       !nodesById.has(edge.target_node_id)
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Edge endpoints must name graph nodes",
//         path: ["edges", index],
//       });
//     if (edge.source_node_id === edge.target_node_id)
//       context.addIssue({
//         code: "custom",
//         message: "Application graph edges cannot be self-referential",
//         path: ["edges", index],
//       });
//     if (
//       edge.relation === "changed_from" &&
//       nodesById.get(edge.source_node_id)?.kind !==
//         nodesById.get(edge.target_node_id)?.kind
//     )
//       context.addIssue({
//         code: "custom",
//         message: "changed_from endpoints must have the same node kind",
//         path: ["edges", index, "relation"],
//       });
//     checkEvidenceNormalization(
//       edge.evidence,
//       ["edges", index, "evidence"],
//       context,
//     );
//   }
// }
//
// const checkGraphInvariants = (
//   graph: GraphRecord,
//   context: GraphIssueContext,
// ): void => {
//   checkGraphContent(graph, context);
//   const { graph_id: identifier, ...semantic } = graph;
//   if (
//     identifier !==
//     `jag_${digestCanonicalValue(semantic, "JavaScript Application Graph")}`
//   )
//     context.addIssue({
//       code: "custom",
//       message: "Graph identifier does not match its semantic content",
//       path: ["graph_id"],
//     });
// };
//
// /** Strict JavaScript Application Graph with verified commitments. */
// export const javascriptApplicationGraphSchema =
//   javascriptApplicationGraphRecordSchema.superRefine(checkGraphInvariants);
//
// const javascriptApplicationGraphContentSchema =
//   javascriptApplicationGraphInputSchema.superRefine(checkGraphContent);
//
// /** Fully validated JavaScript Application Graph. */
// export type JavaScriptApplicationGraph = z.infer<
//   typeof javascriptApplicationGraphSchema
// >;
//
// /** Build one normalized application entity and derive all semantic IDs. */
// export const createJavaScriptApplicationNode = (
//   input: unknown,
// ): ApplicationNode => {
//   const parsed = applicationNodeInputSchema.parse(input);
//   // These properties are newly parsed and exclusively owned. Authenticate
//   // them before the observation/node schemas and final graph validate again.
//   for (const observation of parsed.observations)
//     freezeJsonSnapshot(observation.properties);
//   const identity = normalizeIdentity(parsed.identity);
//   const identifier = nodeId({ kind: parsed.kind, identity });
//   const observations = parsed.observations
//     .map((observation) => {
//       const semantic = {
//         ...observation,
//         evidence: normalizeEvidence(observation.evidence),
//         identifier_strategy: OBSERVATION_IDENTIFIER_STRATEGY,
//       };
//       return applicationNodeObservationSchema.parse({
//         ...semantic,
//         observation_id: observationId(identifier, semantic),
//       });
//     })
//     .sort((left, right) =>
//       compareUnicodeCodePoints(left.observation_id, right.observation_id),
export const _l = 165;
