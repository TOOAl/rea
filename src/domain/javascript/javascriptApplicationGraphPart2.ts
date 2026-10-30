export const __stub = 1;
//
// const sourceMapObservationMatchesIdentity = (
//   identity: Extract<
//     ApplicationNodeIdentity,
//     { readonly strategy: "source-map-original" }
//   >,
//   observation: ApplicationNode["observations"][number],
// ): boolean => {
//   const { evidence, source_map_reference: reference } = observation;
//   const sourceDigests = [
//     observation.properties.content_sha256,
//     // Older graph producers used `source_sha256` for the same source-map fact.
//     observation.properties.source_sha256,
//   ];
//   const hasKnownSourceDigest = identity.source_sha256 !== null;
//   const sourceDigestMatches =
//     sourceDigests.every(
//       (digest) =>
//         digest === undefined ||
//         digest === null ||
//         digest === identity.source_sha256,
//     ) &&
//     (!hasKnownSourceDigest || sourceDigests.includes(identity.source_sha256));
//   const contentAvailabilityMatches =
//     (observation.properties.content_available !== true ||
//       hasKnownSourceDigest) &&
//     (observation.properties.content_available !== false ||
//       !hasKnownSourceDigest);
//   return (
//     sourceDigestMatches &&
//     contentAvailabilityMatches &&
//     reference !== null &&
//     evidence.state === "observed" &&
//     evidence.artifact.available &&
//     evidence.artifact.sha256 === identity.source_map_sha256 &&
//     reference.source_name === identity.original_source &&
//     reference.source_root === identity.source_root &&
//     evidence.location.available &&
//     evidence.location.value.kind === "artifact-path" &&
//     reference.map_path === evidence.location.value.path
//   );
// };
//
// const observationMatchesIdentity = (
//   node: ApplicationNode,
//   observation: ApplicationNode["observations"][number],
// ): boolean => {
//   const { identity } = node;
//   const { evidence } = observation;
//   if (identity.strategy === "content-digest")
//     return (
//       evidence.state === "observed" &&
//       evidence.artifact.available &&
//       evidence.artifact.sha256 === identity.sha256
//     );
//   if (identity.strategy === "source-map-original")
//     return sourceMapObservationMatchesIdentity(identity, observation);
//   if (identity.strategy === "canonical-path")
//     return (
//       evidence.artifact.available &&
//       evidence.artifact.sha256 === identity.artifact_sha256 &&
//       evidence.location.available &&
//       evidence.location.value.kind === "artifact-path" &&
//       evidence.location.value.path === identity.path
//     );
//   if (identity.strategy === "artifact-local-key")
//     return (
//       evidence.artifact.available &&
//       evidence.artifact.sha256 === identity.artifact_sha256
//     );
//   if (identity.strategy === "runtime-instance") {
//     if (
//       !["passive-cdp-runtime", "controlled-replay"].includes(
//         evidence.authority,
//       ) ||
//       !evidence.location.available ||
//       evidence.location.value.kind !== "runtime"
//     )
//       return false;
//     const location = evidence.location.value;
//     return (
//       location.capture_sha256 === identity.capture_sha256 &&
//       [location.target_key, location.frame_key, location.script_key].includes(
//         identity.runtime_key,
//       )
//     );
//   }
//   if (identity.strategy === "structural-fingerprint")
//     return evidence.state === "inferred";
//   return evidence.state === "observed";
// };
//
// const checkNode = (
//   node: ApplicationNode,
//   index: number,
//   context: GraphIssueContext,
// ): void => {
//   if (node.node_id !== nodeId(node))
//     context.addIssue({
//       code: "custom",
//       message: "Node identifier does not match its kind and identity",
//       path: ["nodes", index, "node_id"],
//     });
//   if (
//     node.identity.strategy === "structural-fingerprint" &&
//     canonicalJson(node.identity.basis, "JavaScript Application Graph") !==
//       canonicalJson(
//         uniqueSorted(node.identity.basis),
//         "JavaScript Application Graph",
//       )
//   )
//     context.addIssue({
//       code: "custom",
//       message: "Structural fingerprint basis must be sorted and unique",
//       path: ["nodes", index, "identity", "basis"],
//     });
//
//   sortedUniqueIssue(
//     node.observations.map(({ observation_id: id }) => id),
//     ["nodes", index, "observations"],
//     "Node observations",
//     context,
//   );
//   for (const [observationIndex, observation] of node.observations.entries()) {
//     const { observation_id: identifier, ...semantic } = observation;
//     if (identifier !== observationId(node.node_id, semantic))
//       context.addIssue({
//         code: "custom",
//         message: "Observation identifier does not match its semantic content",
//         path: [
//           "nodes",
//           index,
//           "observations",
//           observationIndex,
//           "observation_id",
//         ],
//       });
//     if (
//       node.identity.strategy === "source-map-original" &&
//       !observationMatchesIdentity(node, observation)
//     )
//       context.addIssue({
//         code: "custom",
//         message:
//           "Source-map observation must retain its exact declaration and map location",
//         path: [
//           "nodes",
//           index,
//           "observations",
//           observationIndex,
//           "source_map_reference",
//         ],
//       });
//     checkEvidenceNormalization(
//       observation.evidence,
//       ["nodes", index, "observations", observationIndex, "evidence"],
//       context,
//     );
//   }
//   if (
//     !node.observations.some((observation) =>
//       observationMatchesIdentity(node, observation),
//     )
//   )
//     context.addIssue({
export const _l = 165;
