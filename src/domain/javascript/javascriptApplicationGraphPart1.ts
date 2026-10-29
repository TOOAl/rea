export const __stub = 1;
// import { z } from "zod";
// import {
//   arrayContainerSchema,
//   parseElementSteps,
// } from "../zodCollectionSteps.js";
// import { canonicalJsonDigestSteps } from "../canonicalJsonDigestSteps.js";
// import { canonicalJson } from "../comparisonSemantics.js";
// import { digestCanonicalValue } from "../canonicalDigest.js";
// import { uniqueSorted } from "../canonicalOrdering.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import {
//   freezeJsonSnapshot,
//   freezeOwnedJsonSnapshotSteps,
// } from "../immutableJson.js";
//
// import type {
//   ApplicationGraphEvidence,
//   ApplicationNodeIdentity,
// } from "./javascriptApplicationEvidenceSchemas.js";
// import {
//   applicationEdgeInputSchema,
//   applicationEdgeSchema,
//   applicationNodeInputSchema,
//   applicationNodeObservationSchema,
//   applicationNodeSchema,
//   javascriptApplicationGraphInputSchema,
//   javascriptApplicationGraphRecordSchema,
//   type ApplicationEdge,
//   type ApplicationNode,
//   type JavaScriptApplicationGraphInput,
// } from "./javascriptApplicationGraphSchemas.js";
//
// const OBSERVATION_IDENTIFIER_STRATEGY = {
//   strategy: "semantic-content-sha256" as const,
//   stability: "observation-exact" as const,
// };
// const EDGE_IDENTIFIER_STRATEGY = {
//   strategy: "semantic-content-sha256" as const,
//   stability: "relationship-exact" as const,
// };
//
// const limitKey = (
//   limit: ApplicationGraphEvidence["coverage"]["limits"][number],
// ) => canonicalJson(limit, "JavaScript Application Graph");
//
// const normalizeLimits = (
//   limits: ApplicationGraphEvidence["coverage"]["limits"],
// ): ApplicationGraphEvidence["coverage"]["limits"] =>
//   [...new Map(limits.map((limit) => [limitKey(limit), limit])).values()].sort(
//     (left, right) => compareUnicodeCodePoints(limitKey(left), limitKey(right)),
//   );
//
// const normalizeEvidence = (
//   evidence: ApplicationGraphEvidence,
// ): ApplicationGraphEvidence => ({
//   ...evidence,
//   coverage: {
//     ...evidence.coverage,
//     limits: normalizeLimits(evidence.coverage.limits),
//   },
//   limitations: uniqueSorted(evidence.limitations),
//   evidence_ids: uniqueSorted(evidence.evidence_ids),
// });
//
// const normalizeIdentity = (
//   identity: ApplicationNodeIdentity,
// ): ApplicationNodeIdentity =>
//   identity.strategy === "structural-fingerprint"
//     ? { ...identity, basis: uniqueSorted(identity.basis) }
//     : identity;
//
// const nodeSemantic = (node: Pick<ApplicationNode, "kind" | "identity">) => ({
//   kind: node.kind,
//   identity: node.identity,
// });
//
// const nodeId = (node: Pick<ApplicationNode, "kind" | "identity">): string =>
//   `jag_node_${digestCanonicalValue(nodeSemantic(node), "JavaScript Application Graph")}`;
//
// const observationSemantic = (
//   nodeIdentifier: string,
//   observation: Omit<
//     z.infer<typeof applicationNodeObservationSchema>,
//     "observation_id"
//   >,
// ) => ({ node_id: nodeIdentifier, ...observation });
//
// const observationId = (
//   nodeIdentifier: string,
//   observation: Omit<
//     z.infer<typeof applicationNodeObservationSchema>,
//     "observation_id"
//   >,
// ): string =>
//   `jag_observation_${digestCanonicalValue(
//     observationSemantic(nodeIdentifier, observation),
//   )}`;
//
// type EdgeSemantic = Omit<ApplicationEdge, "edge_id">;
//
// const edgeId = (edge: EdgeSemantic): string =>
//   `jag_edge_${digestCanonicalValue(edge, "JavaScript Application Graph")}`;
//
// /** The issue sink shared by schema refinement and stepwise checking. */
// type GraphIssueContext = Pick<z.RefinementCtx, "addIssue">;
//
// const sortedUniqueIssue = (
//   values: readonly string[],
//   path: PropertyKey[],
//   label: string,
//   context: GraphIssueContext,
// ): void => {
//   for (let index = 1; index < values.length; index += 1) {
//     if (
//       compareUnicodeCodePoints(values[index - 1] ?? "", values[index] ?? "") < 0
//     )
//       continue;
//     context.addIssue({
//       code: "custom",
//       message: `${label} must be sorted and unique by Unicode code point`,
//       path: [...path, index],
//     });
//     return;
//   }
// };
//
// const checkEvidenceNormalization = (
//   evidence: ApplicationGraphEvidence,
//   path: PropertyKey[],
//   context: GraphIssueContext,
// ): void => {
//   sortedUniqueIssue(
//     evidence.limitations,
//     [...path, "limitations"],
//     "Evidence limitations",
//     context,
//   );
//   sortedUniqueIssue(
//     evidence.evidence_ids,
//     [...path, "evidence_ids"],
//     "Evidence identifiers",
//     context,
//   );
//   sortedUniqueIssue(
//     evidence.coverage.limits.map(limitKey),
//     [...path, "coverage", "limits"],
//     "Evidence limits",
//     context,
//   );
//
//   const runtimeLocation =
//     evidence.location.available && evidence.location.value.kind === "runtime";
//   const staticAuthority = [
//     "artifact-bytes",
//     "ast-static-analysis",
//     "static-relationship-inference",
//     "native-analysis-provider",
//   ].includes(evidence.authority);
//   if (runtimeLocation && staticAuthority)
//     context.addIssue({
//       code: "custom",
//       message: "Static and native authorities cannot claim a runtime location",
//       path: [...path, "location"],
//     });
// };
export const _l = 165;
