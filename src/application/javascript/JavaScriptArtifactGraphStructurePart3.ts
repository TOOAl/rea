export const __stub = 1;
//           evidence: artifactObservationEvidence({
//             sha256: file.container_sha256,
//             path: file.path,
//             operation: "inventory-asar-unavailable-entry",
//             coverage: partialApplicationCoverage([], null),
//             limitations,
//           }),
//         },
//       ],
//     });
//     const parent =
//       context.containerNodes.get(file.container_sha256) ?? context.root;
//     context.accumulator.addEdge({
//       source_node_id: parent.node_id,
//       target_node_id: entry.node_id,
//       relation: "contains",
//       properties: {
//         path: file.path,
//         content_available: false,
//         hash_status: file.hash_status,
//       },
//       evidence: artifactObservationEvidence({
//         sha256: file.container_sha256,
//         path: file.path,
//         operation: "inventory-asar-unavailable-entry",
//         coverage: partialApplicationCoverage([], null),
//         limitations,
//       }),
//     });
//     if (file.kind === "native-addon" || file.artifact_kind === "native-addon") {
//       const addon = context.accumulator.addNode({
//         kind: "native-addon",
//         identity: {
//           strategy: "canonical-path",
//           stability: "artifact-version",
//           artifact_sha256: file.container_sha256,
//           path: file.path,
//         },
//         observations: [
//           {
//             label: file.path,
//             properties: {
//               availability: "unavailable",
//               ...(file.hash_status === undefined
//                 ? {}
//                 : { hash_status: file.hash_status }),
//               ...(file.artifact_kind === undefined
//                 ? {}
//                 : { artifact_kind: file.artifact_kind }),
//               bytes: file.bytes,
//               inventory_artifact_id: file.inventory_artifact_id,
//               ...(file.inventory_occurrence_id === undefined
//                 ? {}
//                 : { inventory_occurrence_id: file.inventory_occurrence_id }),
//             },
//             evidence: artifactObservationEvidence({
//               sha256: file.container_sha256,
//               path: file.path,
//               operation: "classify-unavailable-native-addon",
//               coverage: partialApplicationCoverage([], null),
//               limitations,
//             }),
//           },
//         ],
//       });
//       context.accumulator.addEdge({
//         source_node_id: entry.node_id,
//         target_node_id: addon.node_id,
//         relation: "contains",
//         properties: {
//           classification: "native-addon",
//           content_available: false,
//         },
//         evidence: artifactObservationEvidence({
//           sha256: file.container_sha256,
//           path: file.path,
//           operation: "classify-unavailable-native-addon",
//           coverage: partialApplicationCoverage([], null),
//           limitations,
//         }),
//       });
//     }
//   }
// };
//
// const isAsarContainer = (
//   context: JavaScriptArtifactGraphContext,
//   containerSha256: string,
// ): boolean =>
//   context.snapshot.manifest.root_format === "asar" ||
//   containerSha256 !== context.snapshot.manifest.root_sha256;
//
// const sourceFileRange = (
//   file: JavaScriptArtifactFile,
// ): JavaScriptSourceRange => {
//   if (!file.text.included)
//     throw new TypeError("Retained static facts require their source text");
//   let line = 1;
//   let lastLineStart = 0;
//   for (const match of file.text.value.matchAll(/\r\n|[\n\r\u2028\u2029]/gu)) {
//     line += 1;
//     lastLineStart = match.index + match[0].length;
//   }
//   return {
//     start: { line: 1, column: 0 },
//     end: { line, column: file.text.value.length - lastLineStart },
//   };
// };
//
// /** Project package metadata and its declared Electron roles. */
// export const addJavaScriptPackageNodes = (
//   context: JavaScriptArtifactGraphContext,
// ): ApplicationNode[] => {
//   const roots: ApplicationNode[] = [];
//   const rootPath = applicationManifestPath(context);
//   for (const packageValue of context.analysis.packages) {
//     const file = context.filesByPath.get(packageValue.path);
//     if (file === undefined) continue;
//     const node = context.accumulator.addNode({
//       kind: "package",
//       identity: artifactLocalIdentity(file.sha256, "package-json", file.path),
//       observations: [
//         {
//           label: packageValue.name ?? file.path,
//           properties: {
//             path: file.path,
//             name: packageValue.name,
//             version: packageValue.version,
//             main: packageValue.main,
//             renderer: packageValue.renderer,
//             parse_status: packageValue.status,
//           },
//           evidence: artifactObservationEvidence({
//             sha256: file.sha256,
//             path: file.path,
//             operation: "parse-package-json",
//             coverage: completeApplicationCoverage(),
//             limitations:
//               packageValue.limitation === null ? [] : [packageValue.limitation],
//           }),
//         },
//       ],
//     });
//     if (file.path === rootPath) {
//       roots.push(node);
//       context.accumulator.addEdge({
//         source_node_id: node.node_id,
//         target_node_id: context.root.node_id,
//         relation: "contains",
//         properties: { basis: "package-metadata-within-artifact" },
//         evidence: staticInferenceEvidence({
//           sha256: file.sha256,
//           path: file.path,
//           operation: "associate-package-artifact",
//           coverage: completeApplicationCoverage(),
//         }),
//       });
//     } else
//       addArtifactContainsEdge(context, {
//         source: context.root,
//         target: node,
//         file,
//         operation: "inventory-package",
//       });
//     if (dependencyManifest(file.path)) continue;
//     addPackageRole(context, {
//       packageNode: node,
//       packageFile: file,
//       kind: "electron-main",
//       declaredPath: packageValue.main,
export const _l = 170;
