export const __stub = 1;
//     items: [
//       ...matching.pairs.map((pair) => matchedItem(pair, fullContext)),
//       ...leftItems,
//       ...rightItems,
//     ].sort((left, right) =>
//       compareUnicodeCodePoints(left.item_id, right.item_id),
//     ),
//   };
// };
//
// const matchedItem = (
//   pair: ApplicationVersionNodePair,
//   context: ItemContext,
// ): ApplicationVersionComparisonItem => {
//   const dimensions = changedDimensions(pair, context);
//   const complete = graphsComplete(context);
//   const observedChange = dimensions.some((dimension) =>
//     ["content", "location", "properties"].includes(dimension),
//   );
//   const status: ApplicationVersionComparisonItem["status"] =
//     observedChange || (complete && dimensions.length > 0)
//       ? "changed"
//       : complete
//         ? "unchanged"
//         : "unknown";
//   const finalDimensions =
//     status === "unknown" && !dimensions.includes("coverage")
//       ? [...dimensions, "coverage" as const]
//       : dimensions;
//   const semantic: ComparisonItemSemantic = {
//     status,
//     node_kind: pair.left.kind,
//     left_node_id: pair.left.node_id,
//     right_node_id: pair.right.node_id,
//     match: matchedMatch(pair),
//     dimensions: finalDimensions,
//     evidence_links: itemEvidenceLinks(pair.left, pair.right, context),
//     limitations: pairLimitations(pair, status),
//   };
//   return itemWithId(semantic);
// };
//
// const unmatchedItem = (
//   member: OneSidedNode,
//   context: ItemContext,
// ): ApplicationVersionComparisonItem =>
//   member.left === undefined
//     ? rightOnlyItem(member.right, member.candidateLeftNodeIds, context)
//     : leftOnlyItem(member.left, member.candidateRightNodeIds, context);
//
// const leftOnlyItem = (
//   node: ApplicationNode,
//   candidateNodeIds: readonly string[],
//   context: ItemContext,
// ): ApplicationVersionComparisonItem => {
//   const [firstCandidate, ...remainingCandidates] = candidateNodeIds;
//   const common = {
//     node_kind: node.kind,
//     evidence_links: itemEvidenceLinks(node, undefined, context),
//   };
//   if (firstCandidate !== undefined)
//     return itemWithId({
//       ...common,
//       status: "unknown",
//       left_node_id: node.node_id,
//       right_node_id: null,
//       match: {
//         status: "ambiguous",
//         basis: "none",
//         confidence: "unknown",
//         candidate_left_node_ids: [],
//         candidate_right_node_ids: [firstCandidate, ...remainingCandidates],
//       },
//       dimensions: ["availability"],
//       limitations: [AMBIGUOUS_MATCH_LIMITATION],
//     });
//   const absenceObserved = absenceClaimable(context.rightGraph.coverage);
//   return itemWithId({
//     ...common,
//     status: absenceObserved ? "removed" : "unknown",
//     left_node_id: node.node_id,
//     right_node_id: null,
//     match: unmatchedMatch(),
//     dimensions: absenceObserved
//       ? ["availability"]
//       : ["availability", "coverage"],
//     limitations: absenceObserved ? [] : [INCOMPLETE_GRAPH_LIMITATION],
//   });
// };
//
// const rightOnlyItem = (
//   node: ApplicationNode,
//   candidateNodeIds: readonly string[],
//   context: ItemContext,
// ): ApplicationVersionComparisonItem => {
//   const [firstCandidate, ...remainingCandidates] = candidateNodeIds;
//   const common = {
//     node_kind: node.kind,
//     evidence_links: itemEvidenceLinks(undefined, node, context),
//   };
//   if (firstCandidate !== undefined)
//     return itemWithId({
//       ...common,
//       status: "unknown",
//       left_node_id: null,
//       right_node_id: node.node_id,
//       match: {
//         status: "ambiguous",
//         basis: "none",
//         confidence: "unknown",
//         candidate_left_node_ids: [firstCandidate, ...remainingCandidates],
//         candidate_right_node_ids: [],
//       },
//       dimensions: ["availability"],
//       limitations: [AMBIGUOUS_MATCH_LIMITATION],
//     });
//   const absenceObserved = absenceClaimable(context.leftGraph.coverage);
//   return itemWithId({
//     ...common,
//     status: absenceObserved ? "added" : "unknown",
//     left_node_id: null,
//     right_node_id: node.node_id,
//     match: unmatchedMatch(),
//     dimensions: absenceObserved
//       ? ["availability"]
//       : ["availability", "coverage"],
//     limitations: absenceObserved ? [] : [INCOMPLETE_GRAPH_LIMITATION],
//   });
// };
//
export const _l = 130;
