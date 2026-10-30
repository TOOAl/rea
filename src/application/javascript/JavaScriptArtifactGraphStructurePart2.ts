export const __stub = 1;
//             evidence: astObservationEvidence({
//               sha256: file.sha256,
//               path: file.path,
//               operation: "retain-unexpanded-static-findings",
//               range: sourceFileRange(file),
//               coverage: javascriptAnalysisCoverage(analyzed.javascript),
//               limitations: [analyzed.application_projection_failure.reason],
//             }),
//           },
//         ],
//       });
//     context.fileNodes.set(file.path, target);
//     if (file.kind === "javascript") context.assetNodes.set(file.path, target);
//     const entry = createAsarEntry(context, file);
//     const parent =
//       context.containerNodes.get(file.container_sha256) ?? context.root;
//     if (entry === undefined)
//       addArtifactContainsEdge(context, {
//         source: parent,
//         target,
//         file,
//         operation: "inventory-file",
//       });
//     else {
//       addArtifactContainsEdge(context, {
//         source: parent,
//         target: entry,
//         file,
//         operation: "inventory-entry",
//       });
//       context.accumulator.addEdge({
//         source_node_id: entry.node_id,
//         target_node_id: target.node_id,
//         relation: "maps_to",
//         properties: { sha256: file.sha256 },
//         evidence: artifactObservationEvidence({
//           sha256: file.container_sha256,
//           path: file.path,
//           operation: "map-entry-content",
//           coverage: completeApplicationCoverage(),
//         }),
//       });
//     }
//     if (!file.text.included && file.text.reason === "outside-analysis-scope")
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "select-javascript-sources",
//         limitation:
//           "Source is outside the caller-selected source_paths; it was inventoried but not analyzed.",
//       });
//     else if (analyzed.analysis_failure !== undefined)
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "analyze-javascript-source",
//         limitation: analyzed.analysis_failure.reason,
//         failure: analyzed.analysis_failure.error,
//         limits: javaScriptAnalysisCoverageLimits(
//           analyzed.analysis_failure.limits,
//         ),
//       });
//     else if (
//       file.kind === "javascript" &&
//       (analyzed.javascript === null ||
//         analyzed.javascript.parse_status === "failed")
//     )
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "parse-javascript",
//         limitation: file.text.included
//           ? "JavaScript syntax could not be parsed."
//           : `JavaScript text was unavailable: ${file.text.reason}.`,
//       });
//     if (analyzed.application_projection_failure !== undefined)
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "project-javascript-application",
//         limitation: analyzed.application_projection_failure.reason,
//         failure: analyzed.application_projection_failure.error,
//         limits: javaScriptAnalysisCoverageLimits(
//           analyzed.application_projection_failure.limits,
//         ),
//       });
//     const packageValue = packagesByPath.get(file.path);
//     if (packageValue !== undefined && packageValue.status !== "included")
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "parse-package-json",
//         limitation: packageValue.limitation,
//       });
//     if (jsonValue !== undefined && jsonValue.status !== "included")
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "parse-json-module",
//         limitation: jsonValue.limitation,
//       });
//     const sourceMap = sourceMapsByPath.get(file.path);
//     if (sourceMap !== undefined && sourceMap.status === "invalid")
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "parse-local-source-map",
//         limitation: sourceMap.limitation,
//       });
//     const inlineScripts = inlineScriptsByPath.get(file.path);
//     if (inlineScripts !== undefined)
//       addUnavailableStaticParseScope(context, {
//         file,
//         asset: target,
//         operation: "parse-html-inline-scripts",
//         limitation: htmlInlineScriptLimitation(inlineScripts),
//         limits:
//           inlineScripts.script_count > inlineScripts.scripts.length
//             ? [HTML_INLINE_SCRIPT_LOCATION_COVERAGE_LIMIT]
//             : [],
//         omittedCount: omittedHtmlInlineScriptLocations([inlineScripts]),
//         details: {
//           inline_script_count: inlineScripts.script_count,
//           inline_scripts: inlineScripts.scripts.map(
//             ({ script_type, location }) => ({
//               script_type,
//               location: {
//                 start: { ...location.start },
//                 end: { ...location.end },
//               },
//             }),
//           ),
//         },
//       });
//   }
//   addUnavailableAsarEntries(context);
// };
//
// const addUnavailableAsarEntries = (
//   context: JavaScriptArtifactGraphContext,
// ): void => {
//   for (const file of context.fileSet.unavailable_relevant_files) {
//     if (!isAsarContainer(context, file.container_sha256)) continue;
//     const limitations = [
//       ...(file.limitations ?? []),
//       `The inventoried ${file.kind ?? "relevant"} entry has unavailable bytes; no content artifact identity can be established.`,
//     ];
//     const entry = context.accumulator.addNode({
//       kind: "asar-entry",
//       identity: {
//         strategy: "canonical-path",
//         stability: "artifact-version",
//         artifact_sha256: file.container_sha256,
//         path: file.path,
//       },
//       observations: [
//         {
//           label: file.path,
//           properties: {
//             entry_sha256: file.sha256,
//             bytes: file.bytes,
//             inventory_artifact_id: file.inventory_artifact_id,
//             ...(file.inventory_occurrence_id === undefined
//               ? {}
//               : { inventory_occurrence_id: file.inventory_occurrence_id }),
//             hash_status: file.hash_status,
//             artifact_kind: file.artifact_kind,
//             ...(file.kind === undefined ? {} : { kind: file.kind }),
//             content_available: false,
//           },
export const _l = 170;
