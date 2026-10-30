export const __stub = 1;
//   expect(
//     impossibleEvidence.error.issues.map(({ message }) => message),
//   ).toContain("Evidence context is incompatible with its fact location");
// });
//
// it("shares provenance contexts while preserving fact-specific locations and unknown IDs", () => {
//   const graph = semanticFixtureGraph(true);
//   const first = graph.unknowns[0];
//   if (first === undefined) throw new Error("Expected an unknown frontier");
//   const evidenceContexts = registryForGraph(graph);
//   const { unknown_id: _unknownId, ...unknown } = first;
//   const second = createJavaScriptSemanticGraphUnknown(
//     {
//       ...unknown,
//       evidence: {
//         ...resolveJavaScriptSemanticEvidence(graph, first.evidence),
//         location: {
//           available: false,
//           reason: "unresolved",
//           detail: "Another source location remains unresolved.",
//         },
//       },
//     },
//     evidenceContexts,
//   );
//   expect(second.evidence.context_id).toBe(first.evidence.context_id);
//   expect(second.evidence.location).not.toEqual(first.evidence.location);
//   expect(second.unknown_id).not.toBe(first.unknown_id);
//   expect(evidenceContexts.contexts).toEqual(graph.evidence_contexts);
// });
//
// const complete = <Value>(steps: Iterator<void, Value>): Value => {
//   for (;;) {
//     const next = steps.next();
//     if (next.done) return next.value;
//   }
// };
//
// it("captures nested input before yielding and preserves the synchronous graph commitment", () => {
//   const input = semanticFixtureInput(true);
//   const node = input.nodes[0];
//   if (node === undefined) throw new Error("Expected fixture node");
//   const nested = { text: 'Unicode: \u{1f600} \ud800 " \\ ', rows: [1, 2, 3] };
//   node.properties = { nested, padding: "x".repeat(64_000) };
//   input.nodes.reverse();
//   input.relations.reverse();
//   input.coverage.families.reverse();
//   const expected = createJavaScriptSemanticGraph(input);
//   const steps = createImmutableJavaScriptSemanticGraphSteps(input);
//   expect(steps.next().done).toBe(false);
//   nested.text = "Changed while the owned graph is being hashed.";
//   nested.rows.push(4);
//   input.relations.length = 0;
//   input.coverage.families.length = 0;
//   const graph = complete(steps);
//   expect(graph).toEqual(expected);
//   expect(
//     parseJavaScriptSemanticGraph(
//       JSON.parse(serializeJavaScriptSemanticGraph(graph)),
//     ),
//   ).toEqual(expected);
//   expect(isValidatedImmutableJavaScriptSemanticGraph(graph)).toBe(true);
//   expect(isValidatedImmutableJavaScriptSemanticGraph(expected)).toBe(false);
//   expect(Object.isFrozen(nested)).toBe(false);
// });
//
// const invalidGraphCases: {
//   readonly label: string;
//   readonly change: (input: JavaScriptSemanticGraphInput) => void;
//   readonly message: string;
// }[] = [
//   {
//     label: "node identity and ownership",
//     change: (input) => {
//       input.nodes = input.nodes.map((node, index) =>
//         index === 0
//           ? {
//               ...node,
//               node_id: `jsrg_node_${"f".repeat(64)}`,
//               function_node_id: `jsrg_node_${"e".repeat(64)}`,
//             }
//           : node,
//       );
//     },
//     message: "Node identifier is stale",
//   },
//   {
//     label: "relation endpoints and authority",
//     change: (input) => {
//       input.relations = input.relations.map((relation) => ({
//         ...relation,
//         source_node_id: `jsrg_node_${"f".repeat(64)}`,
//         target_node_id: `jsrg_node_${"f".repeat(64)}`,
//         resolution: "candidate",
//       }));
//     },
//     message: "Relation endpoints must name semantic nodes",
//   },
//   {
//     label: "unknown identity and candidates",
//     change: (input) => {
//       input.unknowns = input.unknowns.map((unknown) => ({
//         ...unknown,
//         candidate_node_ids: [`jsrg_node_${"f".repeat(64)}`],
//       }));
//     },
//     message: "Unknown frontier candidate node is absent",
//   },
//   {
//     label: "fingerprint identity and components",
//     change: (input) => {
//       input.fingerprints = input.fingerprints.map((fingerprint) => ({
//         ...fingerprint,
//         function_node_id: `jsrg_node_${"f".repeat(64)}`,
//         fingerprint_sha256: "f".repeat(64),
//         components: { ...fingerprint.components, parameter_arity: 42 },
//       }));
//     },
//     message: "Fingerprint component commitment is stale",
//   },
//   {
//     label: "coverage completeness and references",
//     change: (input) => {
//       input.coverage.status = "complete";
//       input.coverage.families = input.coverage.families.map((family) => ({
//         ...family,
//         retained_relations: family.retained_relations + 1,
//         unknown_ids: [`jsrg_unknown_${"f".repeat(64)}`],
//       }));
//     },
//     message: "Family retained relation count does not match graph content",
//   },
// ];
//
// it.each(invalidGraphCases)(
//   "retains full validation diagnostics for $label in owned steps",
//   ({ change, message }) => {
//     const input = semanticFixtureInput(true);
//     change(input);
//     const issues = (action: () => unknown) => {
//       try {
//         action();
//       } catch (error: unknown) {
//         if (error instanceof z.ZodError) return error.issues;
//         throw error;
//       }
//       throw new Error("Expected invalid graph to fail validation");
//     };
//     const expected = issues(() => createJavaScriptSemanticGraph(input));
//     expect(expected.map(({ message }) => message)).toContain(message);
//     const steps = createImmutableJavaScriptSemanticGraphSteps(input);
//     expect(steps.next().done).toBe(false);
//     expect(issues(() => complete(steps))).toEqual(expected);
//   },
// );
//
// it("interns each distinct evidence context once under its content digest", () => {
//   const registry = new JavaScriptSemanticEvidenceContextRegistry();
//   const elsewhere: ApplicationGraphEvidence = {
//     ...semanticGraphTestEvidence(),
//     location: {
//       available: true,
//       value: {
//         kind: "source-range",
//         source: "other.js",
//         start: { line: 7, column: 2 },
//         end: { line: 7, column: 9 },
//       },
//     },
//   };
//   const first = registry.intern(semanticGraphTestEvidence());
//   const repeated = registry.intern(elsewhere);
//   const reordered = registry.intern({
//     ...semanticGraphTestEvidence("inferred"),
//     limitations: [
//       "Static reachability does not prove runtime execution.",
//       "Static reachability does not prove runtime execution.",
//     ],
//   });
//   const inferred = registry.intern(semanticGraphTestEvidence("inferred"));
//   const { location: _location, ...context } = semanticGraphTestEvidence();
//
//   expect(repeated.context_id).toBe(first.context_id);
//   expect(repeated.location).toEqual(elsewhere.location);
//   expect(reordered.context_id).toBe(inferred.context_id);
//   expect(inferred.context_id).not.toBe(first.context_id);
//   expect(first.context_id).toBe(
//     `jsrg_evidence_${digestCanonicalValue(context, "test")}`,
//   );
//   expect(registry.contexts.map(({ context_id }) => context_id)).toEqual(
//     [first.context_id, inferred.context_id].toSorted(),
//   );
//   expect(registry.resolve(repeated)).toEqual(elsewhere);
// });
export const _l = 194;
