export const __stub = 1;
//     );
//   return applicationNodeSchema.parse({
//     node_id: identifier,
//     kind: parsed.kind,
//     identity,
//     observations,
//   });
// };
//
// /** Build one normalized directed relationship and derive its semantic ID. */
// export const createJavaScriptApplicationEdge = (
//   input: unknown,
// ): ApplicationEdge => {
//   const parsed = applicationEdgeInputSchema.parse(input);
//   freezeJsonSnapshot(parsed.properties);
//   const semantic = {
//     ...parsed,
//     evidence: normalizeEvidence(parsed.evidence),
//     identifier_strategy: EDGE_IDENTIFIER_STRATEGY,
//   };
//   return applicationEdgeSchema.parse({
//     ...semantic,
//     edge_id: edgeId(semantic),
//   });
// };
//
// /** Normalize a complete graph and derive its top-level semantic ID. */
// export const createJavaScriptApplicationGraph = (
//   input: unknown,
// ): JavaScriptApplicationGraph => {
//   const semantic = normalizeGraphInput(
//     javascriptApplicationGraphInputSchema.parse(input),
//   );
//   const content = javascriptApplicationGraphContentSchema.parse(semantic);
//   return {
//     ...content,
//     graph_id: `jag_${digestCanonicalValue(content, "JavaScript Application Graph")}`,
//   };
// };
//
// const normalizeGraphInput = (
//   parsed: JavaScriptApplicationGraphInput,
// ): JavaScriptApplicationGraphInput => ({
//   ...parsed,
//   root_node_ids: uniqueSorted(parsed.root_node_ids),
//   nodes: [...parsed.nodes].sort((left, right) =>
//     compareUnicodeCodePoints(left.node_id, right.node_id),
//   ),
//   edges: [...parsed.edges].sort((left, right) =>
//     compareUnicodeCodePoints(left.edge_id, right.edge_id),
//   ),
//   coverage: {
//     ...parsed.coverage,
//     limits: normalizeLimits(parsed.coverage.limits),
//   },
//   limitations: uniqueSorted(parsed.limitations),
// });
//
// const validatedImmutableApplicationGraphs = new WeakSet<object>();
//
// /** Clone and validate synchronously, then return steps to seal the owned graph. */
// export const createImmutableJavaScriptApplicationGraphSteps = (
//   input: unknown,
// ): Generator<void, JavaScriptApplicationGraph> =>
//   sealValidatedApplicationGraphSteps(createJavaScriptApplicationGraph(input));
//
// const applicationGraphShape = javascriptApplicationGraphInputSchema.shape;
// const applicationGraphContainerSchema =
//   javascriptApplicationGraphInputSchema.extend({
//     nodes: arrayContainerSchema(applicationGraphShape.nodes),
//     edges: arrayContainerSchema(applicationGraphShape.edges),
//   });
//
// /**
//  * Seal a graph whose input the caller transfers: the caller neither retains nor
//  * mutates any part of it afterwards. Only the graph's own fields are validated
//  * synchronously; nodes and edges are validated, checked, hashed and frozen in
//  * steps, because doing so at once held the event loop for large applications.
//  */
// export const sealTransferredJavaScriptApplicationGraphSteps = (
//   input: unknown,
// ): Generator<void, JavaScriptApplicationGraph> =>
//   parseAndSealApplicationGraphSteps(
//     applicationGraphContainerSchema.parse(input),
//   );
//
// function* parseAndSealApplicationGraphSteps(
//   container: z.output<typeof applicationGraphContainerSchema>,
// ): Generator<void, JavaScriptApplicationGraph> {
//   const issues: z.core.$ZodIssue[] = [];
//   const parsed: JavaScriptApplicationGraphInput = {
//     ...container,
//     nodes: yield* parseElementSteps(
//       applicationGraphShape.nodes.element,
//       container.nodes,
//       ["nodes"],
//       issues,
//     ),
//     edges: yield* parseElementSteps(
//       applicationGraphShape.edges.element,
//       container.edges,
//       ["edges"],
//       issues,
//     ),
//   };
//   if (issues.length > 0) throw new z.ZodError(issues);
//   const content = normalizeGraphInput(parsed);
//   let invalid = false;
//   yield* checkGraphContentSteps(content, {
//     addIssue: () => {
//       invalid = true;
//     },
//   });
//   // An invalid owned graph is a construction defect; report it with the exact
//   // issues the content schema produces.
//   if (invalid) {
//     javascriptApplicationGraphContentSchema.parse(content);
//     throw new TypeError("Application graph checks disagree with its schema");
//   }
//   return yield* sealValidatedApplicationGraphSteps({
//     ...content,
//     graph_id: `jag_${yield* canonicalJsonDigestSteps(content)}`,
//   });
// }
//
// function* sealValidatedApplicationGraphSteps(
//   graph: JavaScriptApplicationGraph,
// ): Generator<void, JavaScriptApplicationGraph> {
//   yield* freezeOwnedJsonSnapshotSteps(graph);
//   validatedImmutableApplicationGraphs.add(graph);
//   return graph;
// }
//
// /** Recognize the exact completely sealed graph produced by the owned factory. */
// export const isValidatedImmutableJavaScriptApplicationGraph = (
//   value: unknown,
// ): value is JavaScriptApplicationGraph =>
//   typeof value === "object" &&
//   value !== null &&
//   validatedImmutableApplicationGraphs.has(value);
//
// /** Parse a stored graph and reject stale IDs. */
// export const parseJavaScriptApplicationGraph = (
//   input: unknown,
// ): JavaScriptApplicationGraph => javascriptApplicationGraphSchema.parse(input);
//
// /** Compute the byte-stable SHA-256 commitment of a verified graph. */
// export const computeJavaScriptApplicationGraphSha256 = (
//   input: unknown,
// ): string =>
//   digestCanonicalValue(
//     parseJavaScriptApplicationGraph(input),
//     "JavaScript Application Graph",
//   );
//
// /** Serialize a verified graph as RFC 8785 canonical JSON. */
// export const serializeJavaScriptApplicationGraph = (input: unknown): string =>
//   canonicalJson(
//     parseJavaScriptApplicationGraph(input),
//     "JavaScript Application Graph",
//   );
export const _l = 161;
