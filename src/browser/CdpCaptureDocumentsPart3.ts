export const __stub = 1;
//  */
// export const snapshotDocuments = (
//   value: unknown,
//   onInvalid: (count: number | null) => void,
// ): readonly UnknownRecord[] => {
//   if (!Array.isArray(value) || value.length === 0) {
//     onInvalid(null);
//     return [];
//   }
//   return value.flatMap((item) => {
//     const document = recordValue(item);
//     if (document === undefined) onInvalid(1);
//     return document === undefined ? [] : [document];
//   });
// };
//
// /** One snapshot document's parallel node arrays, validated for every consumer. */
// export interface SnapshotDocumentNodes {
//   readonly nodeTypes: readonly (number | undefined)[];
//   readonly nodeNames: readonly (number | undefined)[];
//   readonly nodeValues: readonly (number | undefined)[];
//   readonly parents: readonly (number | undefined)[];
//   readonly attributes: readonly unknown[];
//   readonly backendNodeIds: readonly unknown[];
//   /** Attribute rows beyond the node count describe no node. */
//   readonly excessAttributes: number;
// }
//
// /** Missing or misaligned node arrays make the document's nodes unknown. */
// export const snapshotDocumentNodes = (
//   value: unknown,
// ): SnapshotDocumentNodes | undefined => {
//   const nodes = recordValue(value);
//   if (nodes === undefined) return undefined;
//   const nodeTypes = numberArray(nodes.nodeType);
//   const nodeNames = numberArray(nodes.nodeName);
//   const nodeValues = numberArray(nodes.nodeValue);
//   const parents = numberArray(nodes.parentIndex);
//   const attributes = Array.isArray(nodes.attributes)
//     ? nodes.attributes
//     : undefined;
//   if (
//     nodeTypes === undefined ||
//     nodeNames === undefined ||
//     nodeValues === undefined ||
//     parents === undefined ||
//     attributes === undefined ||
//     nodeNames.length !== nodeTypes.length ||
//     nodeValues.length !== nodeTypes.length ||
//     parents.length !== nodeTypes.length
//   )
//     return undefined;
//   return {
//     nodeTypes,
//     nodeNames,
//     nodeValues,
//     parents,
//     attributes,
//     backendNodeIds: Array.isArray(nodes.backendNodeId)
//       ? nodes.backendNodeId
//       : [],
//     excessAttributes: Math.max(0, attributes.length - nodeTypes.length),
//   };
// };
//
// function* captureDomMetadata(
//   pending: readonly PendingDomMetadata[],
//   completeness: CdpCaptureCompleteness | undefined,
// ): Generator<
//   readonly DomSvgNodeQuery[],
//   DomMetadataCapture,
//   readonly (boolean | undefined)[]
// > {
//   const queries = pending.flatMap(({ svgQuery }) =>
//     svgQuery == null ? [] : [svgQuery],
//   );
//   const kinds = queries.length > 0 ? yield queries : [];
//   const urls: DomMetadataCapture["urls"] = [];
//   const agentHints: DomMetadataCapture["agentHints"] = [];
//   let queryIndex = 0;
//   let unresolvedSvgNodes = 0;
//   let excludedUrls = 0;
//   for (const { options, svgQuery } of pending) {
//     let svgElement = options.svgElement;
//     if (svgQuery !== undefined) {
//       const kind = svgQuery === null ? undefined : kinds[queryIndex++];
//       svgElement = kind === true;
//       if (kind === undefined) {
//         unresolvedSvgNodes += 1;
//         completeness?.exclude("metadata", "provider_unavailable");
//       }
//     }
//     const metadata = domMetadata({ ...options, svgElement });
//     for (const url of metadata.urls) {
//       urls.push(url);
//       if (url.destination_scope !== "approved") {
//         excludedUrls += 1;
//         completeness?.exclude(
//           "metadata",
//           url.destination_scope === "outside_policy"
//             ? "disallowed_origin"
//             : "unsupported_url",
//         );
//       }
//     }
//     agentHints.push(...metadata.agentHints);
//   }
//   return { urls, agentHints, unresolvedSvgNodes, excludedUrls };
// }
//
// export const captureAccessibility = (
//   results: readonly unknown[],
//   options: {
//     readonly includeText: boolean;
//     readonly unavailable?: boolean;
//   },
// ): {
//   readonly total: number;
//   readonly nodes: WebPageInspection["accessibility"]["nodes"];
//   readonly textCapture: WebPageInspection["accessibility"]["text_capture"];
//   readonly treeIncomplete: boolean;
// } => {
//   const all = results.flatMap((result) =>
//     recordsValue(requiredRecord(result).nodes),
//   );
//   const nodeIds = new Set(
//     all.flatMap((node) => {
//       const nodeId = cdpStringValue(node.nodeId);
//       return nodeId === undefined ? [] : [nodeId];
//     }),
//   );
//   let excludedFields = 0;
//   const nodes = all.map((node) => {
//     const captureText = (value: unknown): string | null => {
//       const raw = cdpStringValue(recordValue(value)?.value);
//       if (raw === undefined) return null;
//       if (!options.includeText) {
//         excludedFields += 1;
//         return null;
//       }
//       return raw;
//     };
//     return {
//       node_id: cdpStringValue(node.nodeId) ?? "",
//       parent_id: cdpStringValue(node.parentId) ?? null,
//       role: axText(node.role),
//       name: captureText(node.name),
//       description: captureText(node.description),
//       ignored: node.ignored === true,
//       states: accessibilityStates(node.properties),
//     };
//   });
//   return {
//     total: all.length,
//     nodes,
//     treeIncomplete: all.some(
//       (node) =>
//         Array.isArray(node.childIds) &&
//         node.childIds.some((childId) => {
//           const id = cdpStringValue(childId);
//           return id !== undefined && !nodeIds.has(id);
//         }),
//     ),
//     textCapture: {
//       status: options.unavailable
//         ? "unavailable"
//         : !options.includeText
//           ? "not_approved"
//           : "included",
//       retained_bytes: nodes.reduce(
//         (total, node) =>
//           total +
//           Buffer.byteLength(node.name ?? "") +
//           Buffer.byteLength(node.description ?? ""),
//         0,
//       ),
//       excluded_fields: excludedFields,
//     },
//   };
// };
//
// const ACCESSIBILITY_STATE_NAMES = new Set([
//   "atomic",
//   "autocomplete",
//   "busy",
//   "checked",
//   "disabled",
//   "editable",
//   "expanded",
//   "focusable",
//   "focused",
//   "hasPopup",
//   "hidden",
//   "invalid",
//   "level",
//   "live",
export const _l = 196;
