export const __stub = 1;
//   readonly entriesCovered: boolean;
//   readonly evidenceLinks: readonly string[];
// }
//
// const buildArtifactChangeBase = (input: ClassifyPathInput) => ({
//   logical_path: input.path,
//   left_occurrence_id: input.leftOccurrence?.occurrence_id ?? null,
//   right_occurrence_id: input.rightOccurrence?.occurrence_id ?? null,
//   left_artifact_id: input.leftOccurrence?.artifact_id ?? null,
//   right_artifact_id: input.rightOccurrence?.artifact_id ?? null,
//   evidence_links: [...input.evidenceLinks],
// });
//
// const classifyPresence = (input: ClassifyPathInput): ArtifactChange | null => {
//   const covered = input.path === "." ? input.rootCovered : input.entriesCovered;
//   if (input.leftOccurrence === undefined)
//     return {
//       ...buildArtifactChangeBase(input),
//       classification: covered ? "added" : "unknown",
//       dimensions: [covered ? "content" : "availability"],
//     };
//   if (input.rightOccurrence === undefined)
//     return {
//       ...buildArtifactChangeBase(input),
//       classification: covered ? "removed" : "unknown",
//       dimensions: [covered ? "content" : "availability"],
//     };
//   return null;
// };
//
// const classifyIntegrity = (
//   input: ClassifyPathInput,
//   base: ReturnType<typeof buildArtifactChangeBase>,
// ): ArtifactChange | null => {
//   if (
//     input.leftOccurrence?.hash_status === "mismatched" ||
//     input.rightOccurrence?.hash_status === "mismatched"
//   )
//     return {
//       ...base,
//       classification: "contradiction",
//       dimensions: ["integrity"],
//     };
//   return null;
// };
//
// const classifyAvailability = (
//   input: ClassifyPathInput,
//   base: ReturnType<typeof buildArtifactChangeBase>,
// ): ArtifactChange | null => {
//   if (
//     input.leftOccurrence?.hash_status !== "verified" ||
//     input.rightOccurrence?.hash_status !== "verified" ||
//     input.leftNode === undefined ||
//     input.rightNode === undefined
//   )
//     return { ...base, classification: "unknown", dimensions: ["availability"] };
//   return null;
// };
//
// const classifyPath = (input: ClassifyPathInput): ArtifactChange | null => {
//   const presence = classifyPresence(input);
//   if (presence !== null) return presence;
//   const base = buildArtifactChangeBase(input);
//   const integrity = classifyIntegrity(input, base);
//   if (integrity !== null) return integrity;
//   const availability = classifyAvailability(input, base);
//   if (availability !== null) return availability;
//   const dimensions = changedDimensions(input);
//   return dimensions.length === 0
//     ? null
//     : { ...base, classification: "changed", dimensions };
// };
//
// const changedDimensions = (input: {
//   readonly leftNode: ArtifactNode | undefined;
//   readonly rightNode: ArtifactNode | undefined;
//   readonly leftOccurrence: ArtifactOccurrence | undefined;
//   readonly rightOccurrence: ArtifactOccurrence | undefined;
//   readonly leftRelations: readonly RelationProjection[];
//   readonly rightRelations: readonly RelationProjection[];
// }): z.infer<typeof comparisonDimensionSchema>[] => {
//   const left = input.leftNode;
//   const right = input.rightNode;
//   if (left === undefined || right === undefined) return ["availability"];
//   const checks: readonly [
//     z.infer<typeof comparisonDimensionSchema>,
//     boolean,
//   ][] = [
//     ["content", left.sha256 !== right.sha256],
//     [
//       "kind",
//       input.leftOccurrence?.artifact_kind !==
//         input.rightOccurrence?.artifact_kind,
//     ],
//     [
//       "format",
//       left.format !== right.format ||
//         input.leftOccurrence?.artifact_format !==
//           input.rightOccurrence?.artifact_format,
//     ],
//     ["size", left.size !== right.size],
//     [
//       "executable",
//       input.leftOccurrence?.executable !== input.rightOccurrence?.executable,
//     ],
//     [
//       "relations",
//       JSON.stringify(input.leftRelations) !==
//         JSON.stringify(input.rightRelations),
//     ],
//     ["metadata", metadataChanged(input, left, right)],
//   ];
//   return checks
//     .filter(([, changed]) => changed)
//     .map(([dimension]) => dimension);
// };
//
// const metadataChanged = (
//   input: {
//     readonly leftOccurrence: ArtifactOccurrence | undefined;
//     readonly rightOccurrence: ArtifactOccurrence | undefined;
//   },
//   left: ArtifactNode,
//   right: ArtifactNode,
// ): boolean =>
//   left.media_type !== right.media_type ||
//   left.architecture !== right.architecture ||
//   left.content_state !== right.content_state ||
//   input.leftOccurrence?.entry_kind !== input.rightOccurrence?.entry_kind ||
//   input.leftOccurrence?.encrypted !== input.rightOccurrence?.encrypted ||
//   JSON.stringify(left.limitations) !== JSON.stringify(right.limitations) ||
//   JSON.stringify(input.leftOccurrence?.limitations) !==
//     JSON.stringify(input.rightOccurrence?.limitations);
//
// const nodeFor = (
//   occurrence: ArtifactOccurrence | undefined,
//   nodes: ReadonlyMap<string, ArtifactNode>,
// ): ArtifactNode | undefined =>
//   occurrence?.artifact_id === null || occurrence?.artifact_id === undefined
//     ? undefined
//     : nodes.get(occurrence.artifact_id);
export const _l = 142;
