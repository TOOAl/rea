export const __stub = 1;
//   const originalUnknown = unknownGraphInput.unknowns[0];
//   if (originalUnknown === undefined)
//     throw new Error("Expected unknown frontier");
//   const { unknown_id: _unknownId, ...unknownInput } = originalUnknown;
//   const validatedUnknownGraph =
//     createJavaScriptSemanticGraph(unknownGraphInput);
//   const evidenceContexts = registryForGraph(validatedUnknownGraph);
//   unknownGraphInput.unknowns = [
//     createJavaScriptSemanticGraphUnknown(
//       {
//         ...unknownInput,
//         candidate_node_ids: [`jsrg_node_${"f".repeat(64)}`],
//         evidence: resolveJavaScriptSemanticEvidence(
//           validatedUnknownGraph,
//           originalUnknown.evidence,
//         ),
//       },
//       evidenceContexts,
//     ),
//   ];
//   unknownGraphInput.evidence_contexts = evidenceContexts.contexts;
//   expect(() => createJavaScriptSemanticGraph(unknownGraphInput)).toThrow(
//     /candidate node is absent/u,
//   );
// });
//
// it("rejects complete family coverage with an unlisted retained frontier", () => {
//   const input = semanticFixtureInput(true);
//   input.coverage = {
//     ...input.coverage,
//     status: "complete",
//     truncated: false,
//     omitted_nodes: 0,
//     omitted_relations: 0,
//     families: input.coverage.families.map((family) =>
//       family.family === "call-flow"
//         ? {
//             ...family,
//             status: "complete",
//             omitted_relations: 0,
//             unknown_ids: [],
//           }
//         : family,
//     ),
//   };
//   input.limitations = [];
//   expect(() => createJavaScriptSemanticGraph(input)).toThrow(
//     /Complete family coverage cannot omit or retain unknown facts/u,
//   );
//
//   const valid = createJavaScriptSemanticGraph(semanticFixtureInput(true));
//   const coverage = {
//     ...valid.coverage,
//     status: "complete" as const,
//     truncated: false,
//     omitted_nodes: 0,
//     omitted_relations: 0,
//     families: valid.coverage.families.map((family) =>
//       family.family === "call-flow"
//         ? {
//             ...family,
//             status: "complete" as const,
//             omitted_relations: 0,
//             unknown_ids: [],
//           }
//         : family,
//     ),
//   };
//   const { graph_id: _previousId, ...semantic } = valid;
//   const changed = { ...semantic, coverage, limitations: [] };
//   const invalid = {
//     ...changed,
//     graph_id: `jsrg_${digestCanonicalValue(
//       changed,
//       "JavaScript semantic graph",
//     )}`,
//   };
//   const parsed = javaScriptSemanticGraphSchema.safeParse(invalid);
//   expect(parsed.success).toBe(false);
//   if (parsed.success) throw new Error("Expected inconsistent graph rejection");
//   expect(parsed.error.issues.map(({ message }) => message)).toContain(
//     "Complete family coverage cannot omit or retain unknown facts",
//   );
//   expect(
//     javaScriptSemanticGraphSchema.safeParse(JSON.parse(JSON.stringify(invalid)))
//       .success,
//   ).toBe(false);
// });
//
// it("validates evidence context ownership and references", () => {
//   const graph = semanticFixtureGraph();
//   const alteredContext = {
//     ...graph,
//     evidence_contexts: graph.evidence_contexts.map((context, index) =>
//       index === 0
//         ? { ...context, context_id: `jsrg_evidence_${"f".repeat(64)}` }
//         : context,
//     ),
//   };
//   const alteredIssues = javaScriptSemanticGraphSchema.safeParse(alteredContext);
//   expect(alteredIssues.success).toBe(false);
//   if (alteredIssues.success) throw new Error("Expected invalid context digest");
//   expect(alteredIssues.error.issues.map(({ message }) => message)).toContain(
//     "Evidence context identifier is stale",
//   );
//   expect(alteredIssues.error.issues.map(({ message }) => message)).toContain(
//     "Evidence reference names an absent context",
//   );
//
//   const changedPayload = javaScriptSemanticGraphSchema.safeParse({
//     ...graph,
//     evidence_contexts: graph.evidence_contexts.map((context, index) =>
//       index === 0 ? { ...context, authority: "user-assertion" } : context,
//     ),
//   });
//   expect(changedPayload.success).toBe(false);
//   if (changedPayload.success)
//     throw new Error("Expected changed context payload rejection");
//   expect(changedPayload.error.issues.map(({ message }) => message)).toContain(
//     "Evidence context identifier is stale",
//   );
//
//   const withUnknown = semanticFixtureGraph(true);
//   const extraContext = withUnknown.evidence_contexts.find(
//     ({ context_id }) =>
//       !graph.evidence_contexts.some(
//         (existing) => existing.context_id === context_id,
//       ),
//   );
//   if (extraContext === undefined)
//     throw new Error("Expected the unknown fact to own a distinct context");
//   const orphanIssues = javaScriptSemanticGraphSchema.safeParse({
//     ...graph,
//     evidence_contexts: [...graph.evidence_contexts, extraContext].toSorted(
//       (left, right) => left.context_id.localeCompare(right.context_id),
//     ),
//   });
//   expect(orphanIssues.success).toBe(false);
//   if (orphanIssues.success)
//     throw new Error("Expected orphan context rejection");
//   expect(orphanIssues.error.issues.map(({ message }) => message)).toContain(
//     "Evidence context is not referenced by a graph fact",
//   );
//
//   for (const fact of [
//     "nodes",
//     "relations",
//     "unknowns",
//     "fingerprints",
//   ] as const) {
//     const facts = withUnknown[fact];
//     const first = facts[0];
//     if (first === undefined) throw new Error(`Expected a ${fact} fact`);
//     const dangling = javaScriptSemanticGraphSchema.safeParse({
//       ...withUnknown,
//       [fact]: [
//         {
//           ...first,
//           evidence: {
//             ...first.evidence,
//             context_id: `jsrg_evidence_${"e".repeat(64)}`,
//           },
//         },
//         ...facts.slice(1),
//       ],
//     });
//     expect(dangling.success, fact).toBe(false);
//     if (dangling.success)
//       throw new Error(`Expected dangling ${fact} reference`);
//     expect(
//       dangling.error.issues.map(({ message }) => message),
//       fact,
//     ).toContain("Evidence reference names an absent context");
//   }
//
//   const observedNode = graph.nodes[0];
//   if (observedNode === undefined) throw new Error("Expected observed node");
//   const impossibleEvidence = javaScriptSemanticGraphSchema.safeParse({
//     ...graph,
//     nodes: [
//       {
//         ...observedNode,
//         evidence: {
//           ...observedNode.evidence,
//           location: {
//             available: false,
//             reason: "not-observed",
//             detail: "Location removed from an observed fact.",
//           },
//         },
//       },
//       ...graph.nodes.slice(1),
//     ],
//   });
//   expect(impossibleEvidence.success).toBe(false);
//   if (impossibleEvidence.success)
//     throw new Error("Expected incompatible evidence context and location");
export const _l = 197;
