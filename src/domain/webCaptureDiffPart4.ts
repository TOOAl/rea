export const __stub = 1;
//   discovery.status === "available" &&
//   !incompleteSections(discovery.completeness).has("webmcp_tools");
//
// const sectionsComplete = (
//   inspection: WebPageInspection,
//   sections: readonly string[],
// ): boolean => {
//   const incomplete = incompleteSections(inspection.completeness);
//   return sections.every((section) => !incomplete.has(section));
// };
//
// const incompleteSections = (completeness: {
//   readonly policy_filtered_sections: readonly string[];
//   readonly attach_limited_sections: readonly string[];
//   readonly truncated_sections: readonly string[];
//   readonly unavailable_sections: readonly string[];
// }): ReadonlySet<string> =>
//   new Set([
//     ...completeness.policy_filtered_sections,
//     ...completeness.attach_limited_sections,
//     ...completeness.truncated_sections,
//     ...completeness.unavailable_sections,
//   ]);
//
// /** Whole-collection digest differences cannot prove a change across omissions. */
// const compareAggregate = (
//   identity: string,
//   before: unknown,
//   after: unknown,
//   complete: boolean,
//   reason: string,
// ): Dimension =>
//   compareDimension(
//     complete ? singleton(identity, digestCanonicalValue(before)) : new Map(),
//     complete ? singleton(identity, digestCanonicalValue(after)) : new Map(),
//     complete,
//     reason,
//   );
//
// const domDimension = (
//   before: WebPageInspection,
//   after: WebPageInspection,
// ): Dimension => {
//   const beforeFrames = fingerprintWebCaptureFrames(before.frames);
//   const afterFrames = fingerprintWebCaptureFrames(after.frames);
//   const nodesComplete = [before, after].every(
//     (inspection) =>
//       sectionsComplete(inspection, ["dom"]) &&
//       inspection.dom.total_nodes === inspection.dom.nodes.length,
//   );
//   const framesComplete =
//     beforeFrames !== null &&
//     afterFrames !== null &&
//     [before, after].every((inspection) =>
//       sectionsComplete(inspection, ["frames"]),
//     );
//   const changes: Change[] = [];
//   if (
//     nodesComplete &&
//     digestCanonicalValue(before.dom.nodes) !==
//       digestCanonicalValue(after.dom.nodes)
//   )
//     changes.push({ identity: "document", change: "modified" });
//   if (framesComplete && beforeFrames !== afterFrames)
//     changes.push({ identity: "frames", change: "modified" });
//   if (changes.length > 0)
//     return {
//       status: "changed",
//       total_changes: changes.length,
//       changes,
//       reason: null,
//     };
//   return nodesComplete && framesComplete
//     ? { status: "unchanged", total_changes: 0, changes: [], reason: null }
//     : {
//         status: "unknown",
//         total_changes: 0,
//         changes: [],
//         reason:
//           "DOM or frame capture was incomplete, or frame ancestry was unresolved in at least one observation.",
//       };
// };
//
// const scriptProjection = (
//   script: WebPageInspection["scripts"]["items"][number],
// ) => ({
//   script_key: script.script_key,
//   url: script.url,
//   cdp_hash: script.cdp_hash,
//   length: script.length,
//   is_module: script.is_module,
//   language: script.language,
//   source_map_url: script.source_map_url,
// });
//
// const metadataProjection = (inspection: WebPageInspection) => ({
//   responses: inspection.metadata.responses
//     .map(({ request_id: _requestId, ...response }) => response)
//     .map((value) => digestCanonicalValue(value))
//     .sort(),
//   dom_urls: inspection.metadata.dom_urls
//     .map((value) => digestCanonicalValue(value))
//     .sort(),
//   agent_hints: inspection.metadata.agent_hints
//     .map((value) => digestCanonicalValue(value))
//     .sort(),
//   excluded_dom_urls: inspection.metadata.excluded_dom_urls,
//   headers_allowlisted: inspection.metadata.headers_allowlisted,
// });
//
// const singleton = (key: string, value: string): ReadonlyMap<string, string> =>
//   new Map([[key, value]]);
//
// const accessibilityComparable = (
//   inspection: WebPageInspection,
// ): {
//   readonly text: boolean;
//   readonly nodes: boolean;
//   readonly complete: boolean;
// } => {
//   const text =
//     inspection.accessibility.text_capture.status === "included" &&
//     inspection.accessibility.text_capture.excluded_fields === 0;
//   const nodes =
//     inspection.accessibility.total_nodes ===
//     inspection.accessibility.nodes.length;
//   const complete =
//     text && nodes && sectionsComplete(inspection, ["accessibility"]);
//   return { text, nodes, complete };
// };
//
// const accessibilityProjection = (
//   accessibility: WebPageInspection["accessibility"],
//   includeText: boolean,
//   includeNodes: boolean,
// ): unknown => {
//   if (!includeNodes) return { total_nodes: accessibility.total_nodes };
//   const nodeIndexes = new Map(
//     accessibility.nodes.map((node, index) => [node.node_id, index]),
//   );
//   return {
//     total_nodes: accessibility.total_nodes,
//     nodes: accessibility.nodes.map((node) => ({
//       parent_index:
//         node.parent_id === null
//           ? null
//           : (nodeIndexes.get(node.parent_id) ?? -1),
//       role: node.role,
//       ignored: node.ignored,
//       states: node.states,
//       ...(includeText
//         ? { name: node.name, description: node.description }
//         : {}),
//     })),
//   };
// };
//
// const storageKeysComparable = (inspection: WebPageInspection): boolean =>
//   sectionsComplete(inspection, ["storage_keys"]);
//
// const storageComparable = (
//   before: WebPageInspection,
//   after: WebPageInspection,
//   keysComplete: boolean,
//   usageComplete: boolean,
// ): boolean =>
//   keysComplete &&
//   usageComplete &&
//   before.storage.fingerprints_complete &&
//   after.storage.fingerprints_complete;
//
// const storageMap = (
//   storage: WebPageInspection["storage"],
//   includeKeys: boolean,
//   includeUsage: boolean,
//   fingerprintIdentities: ReadonlySet<string>,
// ): ReadonlyMap<string, string> => {
//   const map = new Map<string, string>([
//     [
//       "storage:summary",
//       digestCanonicalValue({
//         origin: storage.origin,
//         values_redacted: storage.values_redacted,
//         ...(includeUsage
//           ? {
//               usage_bytes: storage.usage_bytes,
//               quota_bytes: storage.quota_bytes,
//             }
//           : {}),
//       }),
//     ],
//   ]);
//   const add = (kind: string, keys: readonly string[]) => {
//     for (const key of keys) {
//       map.set(`storage:${kind}:${key}`, digestCanonicalValue(key));
//     }
//   };
//   if (includeKeys) {
//     add("local_storage", storage.local_storage_keys);
//     add("session_storage", storage.session_storage_keys);
//     add("indexed_db", storage.indexed_db_names);
//     add("cache", storage.cache_names);
//   }
//   for (const fingerprint of storage.content_fingerprints) {
//     const identity = `${fingerprint.scope}:${fingerprint.identity_sha256}`;
//     if (!fingerprintIdentities.has(identity)) continue;
//     map.set(
//       `storage:content:${identity}`,
//       digestCanonicalValue(fingerprint.value_sha256),
//     );
//   }
//   return map;
// };
//
// const storageFingerprintIdentities = (
//   before: WebPageInspection["storage"],
//   after: WebPageInspection["storage"],
// ): ReadonlySet<string> => {
//   const beforeComplete = completeStorageFingerprints(before);
//   const afterComplete = completeStorageFingerprints(after);
//   if (before.fingerprints_complete && after.fingerprints_complete)
//     return new Set([...beforeComplete.keys(), ...afterComplete.keys()]);
//   return new Set(
//     [...beforeComplete.keys()].filter((identity) =>
//       afterComplete.has(identity),
//     ),
//   );
// };
//
// const completeStorageFingerprints = (
//   storage: WebPageInspection["storage"],
// ): ReadonlyMap<string, string | null> =>
//   new Map(
//     storage.content_fingerprints
//       .filter(({ complete }) => complete)
//       .map(({ scope, identity_sha256, value_sha256 }) => [
//         `${scope}:${identity_sha256}`,
//         value_sha256,
//       ]),
//   );
export const _l = 240;
