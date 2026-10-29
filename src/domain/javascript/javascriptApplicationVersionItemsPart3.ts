export const __stub = 1;
// const matchedMatch = (
//   pair: ApplicationVersionNodePair,
// ): Extract<
//   ApplicationVersionComparisonItem["match"],
//   { readonly status: "matched" }
// > => {
//   const candidates: {
//     readonly candidate_left_node_ids: [];
//     readonly candidate_right_node_ids: [];
//   } = {
//     candidate_left_node_ids: [],
//     candidate_right_node_ids: [],
//   };
//   switch (pair.basis) {
//     case "exact-node-identity":
//     case "exact-content-digest":
//     case "exact-module-source-digest":
//       return {
//         status: "matched",
//         basis: pair.basis,
//         confidence: "exact",
//         ...candidates,
//       };
//     case "source-map-identity":
//       return {
//         status: "matched",
//         basis: pair.basis,
//         confidence: "high",
//         ...candidates,
//       };
//     case "structural-fingerprint":
//     case "semantic-key":
//       return {
//         status: "matched",
//         basis: pair.basis,
//         confidence: "medium",
//         ...candidates,
//       };
//   }
// };
//
// const unmatchedMatch = (): Extract<
//   ApplicationVersionComparisonItem["match"],
//   { readonly status: "unmatched" }
// > => ({
//   status: "unmatched",
//   basis: "none",
//   confidence: "unknown",
//   candidate_left_node_ids: [],
//   candidate_right_node_ids: [],
// });
//
// const AMBIGUOUS_MATCH_LIMITATION =
//   "Multiple nodes share the same permitted match key; no cross-version pair was selected.";
// const INCOMPLETE_GRAPH_LIMITATION =
//   "The opposite graph is incomplete, so an unmatched node cannot be classified as added or removed.";
//
// const changedDimensions = (
//   pair: ApplicationVersionNodePair,
//   context: ItemContext,
// ): ApplicationVersionComparisonItem["dimensions"] => {
//   const dimensions: ApplicationVersionComparisonItem["dimensions"] = [];
//   const leftContent = contentIdentity(pair.left);
//   const rightContent = contentIdentity(pair.right);
//   if (
//     leftContent !== null &&
//     rightContent !== null &&
//     leftContent !== rightContent
//   )
//     dimensions.push("content");
//   if (
//     canonicalJson(locations(pair.left)) !== canonicalJson(locations(pair.right))
//   )
//     dimensions.push("location");
//   if (
//     canonicalJson(properties(pair.left)) !==
//     canonicalJson(properties(pair.right))
//   )
//     dimensions.push("properties");
//   if (
//     relationshipSignature(pair.left, "left", context) !==
//     relationshipSignature(pair.right, "right", context)
//   )
//     dimensions.push("relationships");
//   return dimensions;
// };
//
// const contentIdentity = (node: ApplicationNode): string | null => {
//   if (node.identity.strategy === "content-digest")
//     return `content:${node.identity.sha256}`;
//   if (node.kind === "javascript-module")
//     return stringProperty(node, "source_sha256");
//   if (
//     node.kind === "source-module" &&
//     node.identity.strategy === "source-map-original"
//   )
//     return node.identity.source_sha256;
//   return null;
// };
//
// const locations = (node: ApplicationNode) =>
//   node.observations
//     .map(({ evidence }) =>
//       evidence.location.available ? evidence.location.value : evidence.location,
//     )
//     .sort((left, right) =>
//       compareUnicodeCodePoints(canonicalJson(left), canonicalJson(right)),
//     );
//
// const properties = (node: ApplicationNode) =>
//   node.observations
//     .map(({ label, properties: values, source_map_reference }) => ({
//       label,
//       properties: values,
//       source_map_reference,
//     }))
//     .sort((left, right) =>
//       compareUnicodeCodePoints(canonicalJson(left), canonicalJson(right)),
//     );
//
// const indexRelationships = (
//   graph: JavaScriptApplicationGraph,
// ): RelationshipIndex => {
//   const adjacency = new Map<string, IndexedRelationship[]>();
//   const add = (nodeId: string, relationship: IndexedRelationship): void => {
//     const existing = adjacency.get(nodeId);
//     if (existing === undefined) adjacency.set(nodeId, [relationship]);
//     else existing.push(relationship);
//   };
//   for (const edge of graph.edges) {
export const _l = 130;
