export const __stub = 1;
//
// // Bound retained projections and outstanding CDP reads independently of page size.
// // Eight leaves room for the session's other cancellation listeners.
// const DOM_METADATA_BATCH_SIZE = 8;
//
// interface PendingDomMetadata {
//   readonly options: DomMetadataOptions;
//   // Undefined means no query is needed; null means the candidate has no valid ID.
//   readonly svgQuery: DomSvgNodeQuery | null | undefined;
// }
//
// /** Project one snapshot, requesting bounded batches of SVG identity facts. */
// export function* captureDom(
//   result: unknown,
//   allowedOrigins: ReadonlySet<string>,
//   input: InspectWebPageInput,
//   completeness?: CdpCaptureCompleteness,
// ): Generator<
//   readonly DomSvgNodeQuery[],
//   DomCapture,
//   readonly (boolean | undefined)[]
// > {
//   const root = requiredRecord(result);
//   const strings = Array.isArray(root.strings)
//     ? root.strings.map(cdpStringValue)
//     : [];
//   const nodes: WebPageInspection["dom"]["nodes"] = [];
//   const urls: WebPageInspection["metadata"]["dom_urls"] = [];
//   const agentHints: WebPageInspection["metadata"]["agent_hints"] = [];
//   let excludedUrls = 0;
//   let total = 0;
//   let unresolvedSvgNodes = 0;
//   if (!Array.isArray(root.strings))
//     excludeDocumentEvidence(completeness, "invalid_protocol_value", null);
//   for (const document of snapshotDocuments(root.documents, (count) =>
//     excludeDocumentEvidence(completeness, "invalid_protocol_value", count),
//   )) {
//     const documentUrl = cdpSnapshotString(strings, document.documentURL);
//     if (documentUrl === undefined) {
//       excludeDocumentEvidence(completeness, "invalid_protocol_value");
//       continue;
//     }
//     if (allowedSanitizedUrl(documentUrl, allowedOrigins) === undefined) {
//       excludeDocumentEvidence(completeness, exclusionReasonForUrl(documentUrl));
//       continue;
//     }
//     const baseUrlValue =
//       document.baseURL === undefined
//         ? documentUrl
//         : cdpSnapshotValueString(strings, document.baseURL);
//     if (baseUrlValue === undefined) {
//       excludeDocumentEvidence(completeness, "invalid_protocol_value");
//       continue;
//     }
//     const baseUrl = baseUrlValue || documentUrl;
//     const documentNodes = snapshotDocumentNodes(document.nodes);
//     if (documentNodes === undefined) {
//       excludeDocumentEvidence(completeness, "invalid_protocol_value");
//       continue;
//     }
//     const {
//       nodeTypes: rawNodeTypes,
//       nodeNames: rawNodeNames,
//       nodeValues: rawNodeValues,
//       parents: rawParents,
//       attributes: rawAttributes,
//       backendNodeIds,
//     } = documentNodes;
//     if (documentNodes.excessAttributes > 0)
//       excludeDocumentEvidence(
//         completeness,
//         "invalid_protocol_value",
//         documentNodes.excessAttributes,
//       );
//     const baseIndex = total;
//     total += rawNodeTypes.length;
//     const ancestry = createDocumentSvgAncestry({
//       nodeTypes: rawNodeTypes,
//       nodeNames: rawNodeNames,
//       parents: rawParents,
//       strings,
//       attributes: rawAttributes,
//     });
//     const pendingMetadata: PendingDomMetadata[] = [];
//     for (let index = 0; index < rawNodeTypes.length; index += 1) {
//       const nodeType = rawNodeTypes[index];
//       const nodeNameIndex = rawNodeNames[index];
//       const nodeValueIndex = rawNodeValues[index];
//       const parent = rawParents[index];
//       const attributeIndexes = numberArray(rawAttributes[index]);
//       const nodeName = cdpSnapshotString(strings, nodeNameIndex);
//       const nodeValue = cdpSnapshotValueString(strings, nodeValueIndex);
//       if (
//         nodeType === undefined ||
//         nodeName === undefined ||
//         nodeValue === undefined ||
//         parent === undefined ||
//         parent < -1 ||
//         parent === index ||
//         parent >= rawNodeTypes.length ||
//         attributeIndexes === undefined ||
//         !cdpSnapshotAttributesResolve(strings, attributeIndexes)
//       ) {
//         excludeDocumentEvidence(completeness, "invalid_protocol_value");
//         continue;
//       }
//       const attributes = attributeIndexes as readonly number[];
//       const nodeIndex = baseIndex + index;
//       const attributeNames = uniqueAttributeNames(attributes, strings);
//       const svgLink = domSvgLink(ancestry, index);
//       if (svgLink.xmlDocument === undefined)
//         completeness?.exclude("metadata", "invalid_protocol_value");
//       let svgQuery: DomSvgNodeQuery | null | undefined;
//       if (
//         svgLink.xmlDocument === false &&
//         nodeType === 1 &&
//         attributeNames.includes("xlink:href") &&
//         !attributeNames.includes("href")
//       ) {
//         const backendNodeId = numberValue(backendNodeIds[index]);
//         svgQuery =
//           backendNodeId !== undefined &&
//           Number.isSafeInteger(backendNodeId) &&
//           backendNodeId > 0
//             ? { backendNodeId, nodeName }
//             : null;
//       }
//       nodes.push({
//         index: nodeIndex,
//         parent_index: parent < 0 ? -1 : baseIndex + parent,
//         node_type: nodeType,
//         node_name: nodeName,
//         node_value_length: nodeValue.length,
//         attribute_names: attributeNames,
//       });
//       pendingMetadata.push({
//         svgQuery,
//         options: {
//           strings,
//           attributes,
//           // The BASE element itself resolves against the document fallback URL.
//           baseUrl: nodeName.toLowerCase() === "base" ? documentUrl : baseUrl,
//           documentUrl,
//           nodeIndex,
//           nodeName,
//           allowedOrigins,
//           ...svgLink,
//         },
//       });
//       if (
//         pendingMetadata.length === DOM_METADATA_BATCH_SIZE ||
//         index === rawNodeTypes.length - 1
//       ) {
//         const metadata = yield* captureDomMetadata(
//           pendingMetadata,
//           completeness,
//         );
//         urls.push(...metadata.urls);
//         agentHints.push(...metadata.agentHints);
//         excludedUrls += metadata.excludedUrls;
//         unresolvedSvgNodes += metadata.unresolvedSvgNodes;
//         pendingMetadata.length = 0;
//       }
//     }
//     if (pendingMetadata.length > 0) {
//       const metadata = yield* captureDomMetadata(pendingMetadata, completeness);
//       urls.push(...metadata.urls);
//       agentHints.push(...metadata.agentHints);
//       excludedUrls += metadata.excludedUrls;
//       unresolvedSvgNodes += metadata.unresolvedSvgNodes;
//       pendingMetadata.length = 0;
//     }
//   }
//   return {
//     total,
//     nodes,
//     urls,
//     agentHints,
//     excludedUrls,
//     unresolvedSvgNodes,
//   };
// }
//
// /** Skipped document facts also make their derived URL and hint inventory incomplete. */
// const excludeDocumentEvidence = (
//   completeness: CdpCaptureCompleteness | undefined,
//   reason: BrowserExclusionReason,
//   count: number | null = 1,
// ): void => {
//   completeness?.exclude("dom", reason, count);
//   completeness?.exclude("metadata", reason, count);
// };
//
// /**
//  * Read DOMSnapshot documents. A snapshot always describes at least one
//  * document, so a missing or empty list is invalid rather than an empty DOM.
export const _l = 196;
