export const __stub = 1;
// import { absenceClaimable, canonicalJson } from "../comparisonSemantics.js";
// import { digestCanonicalValue } from "../canonicalDigest.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import type { Evidence } from "../evidence.js";
// import type {
//   ApplicationEdge,
//   ApplicationNode,
// } from "./javascriptApplicationGraphSchemas.js";
// import type { JavaScriptApplicationGraph } from "./javascriptApplicationGraph.js";
// import type { ApplicationVersionComparisonItem } from "./javascriptApplicationVersionComparisonSchemas.js";
// import type {
//   ApplicationVersionMatchingProjection,
//   ApplicationVersionNodePair,
// } from "./javascriptApplicationVersionKeys.js";
//
// /** All classified entities and their complete ambiguity candidate sets. */
// export interface ApplicationVersionItemProjection {
//   readonly items: ApplicationVersionComparisonItem[];
// }
//
// interface ItemContext {
//   readonly leftGraph: JavaScriptApplicationGraph;
//   readonly rightGraph: JavaScriptApplicationGraph;
//   readonly leftEvidenceId: string;
//   readonly rightEvidenceId: string;
//   readonly leftNativeEvidenceByDigest: ReadonlyMap<string, readonly string[]>;
//   readonly rightNativeEvidenceByDigest: ReadonlyMap<string, readonly string[]>;
//   readonly pairByLeft: ReadonlyMap<string, string>;
//   readonly pairByRight: ReadonlyMap<string, string>;
//   readonly leftRelationships: RelationshipIndex;
//   readonly rightRelationships: RelationshipIndex;
// }
//
// type ItemContextInput = Omit<
//   ItemContext,
//   | "leftNativeEvidenceByDigest"
//   | "rightNativeEvidenceByDigest"
//   | "pairByLeft"
//   | "pairByRight"
//   | "leftRelationships"
//   | "rightRelationships"
// > & {
//   readonly leftNativeEvidence: readonly Evidence[];
//   readonly rightNativeEvidence: readonly Evidence[];
// };
//
// interface IndexedRelationship {
//   readonly direction: "in" | "out";
//   readonly relation: ApplicationEdge["relation"];
//   readonly neighborId: string;
// }
//
// interface RelationshipIndex {
//   readonly nodeById: ReadonlyMap<string, ApplicationNode>;
//   readonly adjacency: ReadonlyMap<string, readonly IndexedRelationship[]>;
// }
//
// type OneSidedNode =
//   | {
//       readonly left: ApplicationNode;
//       readonly right?: never;
//       readonly candidateRightNodeIds: readonly string[];
//       readonly candidateLeftNodeIds?: never;
//     }
//   | {
//       readonly left?: never;
//       readonly right: ApplicationNode;
//       readonly candidateRightNodeIds?: never;
//       readonly candidateLeftNodeIds: readonly string[];
//     };
//
// type ComparisonItemSemantic<
//   Item extends ApplicationVersionComparisonItem =
//     ApplicationVersionComparisonItem,
// > = Item extends ApplicationVersionComparisonItem
//   ? Omit<Item, "item_id">
//   : never;
//
// /** Classify matched, unmatched, and ambiguous nodes without inventing absence. */
// export const classifyJavaScriptApplicationVersions = (
//   matching: ApplicationVersionMatchingProjection,
//   context: ItemContextInput,
// ): ApplicationVersionItemProjection => {
//   const pairByLeft = new Map(
//     matching.pairs.map(({ left, right }) => [
//       left.node_id,
//       `pair:${left.node_id}:${right.node_id}`,
//     ]),
//   );
//   const pairByRight = new Map(
//     matching.pairs.map(({ left, right }) => [
//       right.node_id,
//       `pair:${left.node_id}:${right.node_id}`,
//     ]),
//   );
//   const fullContext: ItemContext = {
//     leftGraph: context.leftGraph,
//     rightGraph: context.rightGraph,
//     leftEvidenceId: context.leftEvidenceId,
//     rightEvidenceId: context.rightEvidenceId,
//     leftNativeEvidenceByDigest: indexNativeEvidence(context.leftNativeEvidence),
//     rightNativeEvidenceByDigest: indexNativeEvidence(
//       context.rightNativeEvidence,
//     ),
//     pairByLeft,
//     pairByRight,
//     leftRelationships: indexRelationships(context.leftGraph),
//     rightRelationships: indexRelationships(context.rightGraph),
//   };
//   const leftItems = matching.unmatchedLeft.map((node) => {
//     const candidates = matching.candidatesForLeft.get(node.node_id) ?? [];
//     return unmatchedItem(
//       {
//         left: node,
//         candidateRightNodeIds: candidates,
//       },
//       fullContext,
//     );
//   });
//   const rightItems = matching.unmatchedRight.map((node) => {
//     const candidates = matching.candidatesForRight.get(node.node_id) ?? [];
//     return unmatchedItem(
//       {
//         right: node,
//         candidateLeftNodeIds: candidates,
//       },
//       fullContext,
//     );
//   });
//   return {
export const _l = 130;
