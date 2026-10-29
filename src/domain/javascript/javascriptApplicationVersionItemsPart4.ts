export const __stub = 1;
//     add(edge.source_node_id, {
//       direction: "out",
//       relation: edge.relation,
//       neighborId: edge.target_node_id,
//     });
//     if (edge.target_node_id !== edge.source_node_id)
//       add(edge.target_node_id, {
//         direction: "in",
//         relation: edge.relation,
//         neighborId: edge.source_node_id,
//       });
//   }
//   return {
//     nodeById: new Map(graph.nodes.map((value) => [value.node_id, value])),
//     adjacency,
//   };
// };
//
// const relationshipSignature = (
//   node: ApplicationNode,
//   side: "left" | "right",
//   context: ItemContext,
// ): string => {
//   const { nodeById, adjacency } =
//     side === "left" ? context.leftRelationships : context.rightRelationships;
//   const paired = side === "left" ? context.pairByLeft : context.pairByRight;
//   const signatures = (adjacency.get(node.node_id) ?? []).map((relationship) =>
//     edgeSignature({ ...relationship, paired, nodeById }),
//   );
//   return canonicalJson(signatures.sort(compareUnicodeCodePoints));
// };
//
// interface EdgeSignatureContext {
//   readonly direction: "in" | "out";
//   readonly relation: ApplicationEdge["relation"];
//   readonly neighborId: string;
//   readonly paired: ReadonlyMap<string, string>;
//   readonly nodeById: ReadonlyMap<string, ApplicationNode>;
// }
//
// const edgeSignature = (context: EdgeSignatureContext): string => {
//   const mapped = context.paired.get(context.neighborId);
//   const neighbor = context.nodeById.get(context.neighborId);
//   return `${context.direction}\0${context.relation}\0${mapped ?? `unmatched:${neighbor?.kind ?? "unknown"}`}`;
// };
//
// const itemEvidenceLinks = (
//   left: ApplicationNode | undefined,
//   right: ApplicationNode | undefined,
//   context: ItemContext,
// ): string[] =>
//   [
//     ...new Set([
//       context.leftEvidenceId,
//       context.rightEvidenceId,
//       ...nativeLinks(left, context.leftNativeEvidenceByDigest),
//       ...nativeLinks(right, context.rightNativeEvidenceByDigest),
//     ]),
//   ].sort(compareUnicodeCodePoints);
//
// const nativeLinks = (
//   node: ApplicationNode | undefined,
//   evidenceByDigest: ReadonlyMap<string, readonly string[]>,
// ): readonly string[] => {
//   const identity = node === undefined ? null : contentIdentity(node);
//   if (identity === null) return [];
//   const digest = identity.replace(/^content:/u, "");
//   return evidenceByDigest.get(digest) ?? [];
// };
//
// const indexNativeEvidence = (
//   evidence: readonly Evidence[],
// ): ReadonlyMap<string, readonly string[]> => {
//   const evidenceByDigest = new Map<string, string[]>();
//   for (const { evidence_id: id, subject } of evidence) {
//     const digest = subject?.digest.sha256;
//     if (digest === undefined) continue;
//     const ids = evidenceByDigest.get(digest);
//     if (ids === undefined) evidenceByDigest.set(digest, [id]);
//     else ids.push(id);
//   }
//   return evidenceByDigest;
// };
//
// const pairLimitations = (
//   pair: ApplicationVersionNodePair,
//   status: ApplicationVersionComparisonItem["status"],
// ): string[] => [
//   ...(pair.basis === "structural-fingerprint"
//     ? [
//         "Structural fingerprint equality is rename-resistant inference; it is not byte identity or proof of semantic equivalence.",
//       ]
//     : []),
//   ...(pair.basis === "source-map-identity"
//     ? [
//         "Source-map original names identify a candidate source lineage; changed or unavailable source content remains explicit.",
//       ]
//     : []),
//   ...(pair.basis === "semantic-key"
//     ? [
//         "Semantic-key pairing is a deterministic inference and is never promoted to exact identity.",
//       ]
//     : []),
//   ...(status === "unknown"
//     ? ["Incomplete graph coverage prevents a complete node-level conclusion."]
//     : []),
// ];
//
// const itemWithId = <Semantic extends ComparisonItemSemantic>(
//   semantic: Semantic,
// ): Semantic & { readonly item_id: string } => ({
//   ...semantic,
//   item_id: `javc_item_${digestCanonicalValue(semantic, "Application version item")}`,
// });
//
// const stringProperty = (node: ApplicationNode, key: string): string | null => {
//   const values = [
//     ...new Set(
//       node.observations
//         .map(({ properties: values }) => values[key])
//         .filter((value): value is string => typeof value === "string"),
//     ),
//   ];
//   return values.length === 1 ? (values[0] ?? null) : null;
// };
//
// const graphsComplete = (context: ItemContext): boolean =>
//   absenceClaimable(context.leftGraph.coverage) &&
//   absenceClaimable(context.rightGraph.coverage);
export const _l = 129;
