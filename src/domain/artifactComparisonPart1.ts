export const __stub = 1;
// import { compareUnicodeCodePoints } from "./unicodeCodePointOrder.js";
// import { z } from "zod";
//
// import type {
//   ArtifactInventoryResult,
//   ArtifactNode,
//   ArtifactOccurrence,
// } from "./artifactGraph.js";
// import { evidenceSchema } from "./evidence.js";
// import {
//   hasCompleteInventoryCoverage,
//   parseArtifactInventoryEvidence,
//   type InventorySet,
// } from "./artifactInventoryEvidence.js";
// import { prefixedDigestSchema } from "./../domain/digests.js";
// import { canonicalJson } from "./comparisonSemantics.js";
//
// const evidenceIdSchema = prefixedDigestSchema("ev");
// const comparisonStatusSchema = z.enum([
//   "unchanged",
//   "added",
//   "removed",
//   "changed",
//   "truncated",
//   "unknown",
//   "contradiction",
// ]);
// const changeKindSchema = z.enum([
//   "added",
//   "removed",
//   "changed",
//   "unknown",
//   "contradiction",
// ]);
// const comparisonDimensionSchema = z.enum([
//   "content",
//   "kind",
//   "format",
//   "size",
//   "executable",
//   "relations",
//   "metadata",
//   "availability",
//   "integrity",
// ]);
// /** Strict Evidence-backed input for deterministic artifact comparison. */
// export const artifactComparisonInputSchema = z.strictObject({
//   left: evidenceSchema,
//   right: evidenceSchema,
// });
//
// /** One path-classified artifact change with citations to both observations. */
// const artifactChangeSchema = z.object({
//   classification: changeKindSchema,
//   logical_path: z.string().min(1),
//   dimensions: z.array(comparisonDimensionSchema).min(1),
//   left_occurrence_id: z
//     .string()
//     .regex(/^occ_[a-f0-9]{64}$/u)
//     .nullable(),
//   right_occurrence_id: z
//     .string()
//     .regex(/^occ_[a-f0-9]{64}$/u)
//     .nullable(),
//   left_artifact_id: z
//     .string()
//     .regex(/^art_[a-f0-9]{64}$/u)
//     .nullable(),
//   right_artifact_id: z
//     .string()
//     .regex(/^art_[a-f0-9]{64}$/u)
//     .nullable(),
//   evidence_links: z.array(evidenceIdSchema).min(2),
// });
//
// /** Deterministic artifact comparison with every change returned inline. */
// export const artifactComparisonResultSchema = z.object({
//   status: comparisonStatusSchema,
//   left_manifest_id: prefixedDigestSchema("agm"),
//   right_manifest_id: prefixedDigestSchema("agm"),
//   summary: z.object({
//     unchanged: z.number().int().min(0),
//     added: z.number().int().min(0),
//     removed: z.number().int().min(0),
//     changed: z.number().int().min(0),
//     unknown: z.number().int().min(0),
//     contradiction: z.number().int().min(0).default(0),
//   }),
//   changes: z.array(artifactChangeSchema),
//   limitations: z.array(z.string()),
// });
//
// export type ArtifactComparisonResult = z.infer<
//   typeof artifactComparisonResultSchema
// >;
// type ArtifactChange = z.infer<typeof artifactChangeSchema>;
//
// /** Compare complete inventory evidence without treating missing evidence as equality. */
// export const compareArtifacts = (
//   leftEvidence: unknown,
//   rightEvidence: unknown,
// ): ArtifactComparisonResult => {
//   const left = parseArtifactInventoryEvidence(leftEvidence);
//   const right = parseArtifactInventoryEvidence(rightEvidence);
//   const leftComplete = left.inventory.complete;
//   const rightComplete = right.inventory.complete;
//   const sameScope =
//     left.inventory.coverage.scope === right.inventory.coverage.scope;
//   const rootCoverageComplete =
//     sameScope &&
//     left.inventory.complete &&
//     right.inventory.complete &&
//     left.inventory.coverage.status === "complete" &&
//     right.inventory.coverage.status === "complete";
//   const entryCoverageComplete =
//     rootCoverageComplete &&
//     left.inventory.coverage.scope === "container-entries";
//   const leftCovered =
//     sameScope &&
//     hasCompleteInventoryCoverage(left.inventory, left.inventory.coverage.scope);
//   const rightCovered =
//     sameScope &&
//     hasCompleteInventoryCoverage(
//       right.inventory,
//       right.inventory.coverage.scope,
//     );
//   const fullyCovered =
//     leftCovered &&
//     rightCovered &&
//     (entryCoverageComplete ||
//       (rootCoverageComplete &&
//         left.inventory.manifest.occurrence_count === 1 &&
//         right.inventory.manifest.occurrence_count === 1));
//   const leftOccurrencesByPath = occurrencesByPath(left.inventory.occurrences);
//   const rightOccurrencesByPath = occurrencesByPath(right.inventory.occurrences);
//   const comparison = compareOccurrences(
//     left.inventory,
//     right.inventory,
//     leftOccurrencesByPath,
//     rightOccurrencesByPath,
//     [
//       ...left.evidence.map(({ evidence_id: id }) => id),
export const _l = 142;
