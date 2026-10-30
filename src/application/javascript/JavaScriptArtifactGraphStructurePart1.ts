export const __stub = 1;
// import type { ArtifactInventorySnapshot } from "../../domain/artifactInventorySnapshot.js";
// import type { ApplicationNode } from "../../domain/javascript/javascriptApplicationGraphSchemas.js";
// import { htmlInlineScriptLimitation } from "./JavaScriptArtifactAnalysis.js";
// import {
//   completeApplicationCoverage,
//   partialApplicationCoverage,
// } from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
// import type { JavaScriptModuleArtifactAnalysis } from "./JavaScriptArtifactAnalysisTypes.js";
// import { jsonValueSchema } from "../../domain/jsonValue.js";
// import { freezeJsonSnapshot } from "../../domain/immutableJson.js";
// import type { JavaScriptSourceRange } from "../../domain/javascript/javascriptStaticAnalysisTypes.js";
// import type {
//   JavaScriptArtifactContainer,
//   JavaScriptArtifactFile,
// } from "../../domain/javascript/javascriptArtifactFiles.js";
// import type { JavaScriptArtifactGraphAccumulator } from "./JavaScriptArtifactGraphAccumulator.js";
// import {
//   addArtifactContainsEdge,
//   addUnavailableStaticParseScope,
//   artifactFileNodeKind,
//   artifactLocalIdentity,
//   javascriptAnalysisCoverage,
//   createElectronRoleNode,
//   HTML_INLINE_SCRIPT_LOCATION_COVERAGE_LIMIT,
//   omittedHtmlInlineScriptLocations,
//   linkElectronRoleToAsset,
//   type JavaScriptArtifactGraphContext,
// } from "./JavaScriptArtifactGraphContext.js";
// import {
//   artifactObservationEvidence,
//   astObservationEvidence,
//   staticInferenceEvidence,
// } from "./JavaScriptArtifactGraphEvidence.js";
// import {
//   artifactPathResolutionProperties,
//   resolveArtifactPathByContext,
// } from "./JavaScriptArtifactPathResolution.js";
// import { compareUnicodeCodePoints } from "../../domain/unicodeCodePointOrder.js";
//
// interface PackageRoleInput {
//   readonly packageNode: ApplicationNode;
//   readonly packageFile: JavaScriptArtifactFile;
//   readonly kind: "electron-main" | "electron-renderer";
//   readonly declaredPath: string | null;
// }
//
// /** Create the exact root artifact node from the inventory manifest. */
// export const createJavaScriptArtifactRootNode = (
//   accumulator: JavaScriptArtifactGraphAccumulator,
//   snapshot: ArtifactInventorySnapshot,
// ): ApplicationNode => {
//   const root = snapshot.nodes.find(
//     ({ artifact_id: id }) => id === snapshot.manifest.root_artifact_id,
//   );
//   if (root === undefined)
//     throw new TypeError("Artifact inventory root is missing");
//   return accumulator.addNode({
//     kind: "artifact",
//     identity: {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: root.sha256,
//     },
//     observations: [
//       {
//         label: "artifact root",
//         properties: {
//           format: snapshot.manifest.root_format,
//           bytes: root.size,
//           inventory_manifest_id: snapshot.manifest.manifest_id,
//           inventory_graph_sha256: snapshot.manifest.graph_sha256,
//           inventory_artifact_id: root.artifact_id,
//         },
//         evidence: artifactObservationEvidence({
//           sha256: root.sha256,
//           path: "artifact-root",
//           operation: "inventory-root",
//           coverage: completeApplicationCoverage(),
//           limitations: [
//             "artifact-root is a path-independent alias; the application result retains the canonical local input path.",
//           ],
//         }),
//       },
//     ],
//   });
// };
//
// /** Project nested ASAR containers inventoried inside a directory. */
// export const addJavaScriptArtifactContainers = (
//   context: JavaScriptArtifactGraphContext,
// ): void => {
//   for (const container of context.fileSet.containers) {
//     const node = context.accumulator.addNode({
//       kind: "artifact",
//       identity: {
//         strategy: "content-digest",
//         stability: "global-exact",
//         sha256: container.sha256,
//       },
//       observations: [
//         {
//           label: container.path,
//           properties: containerProperties(container),
//           evidence: artifactObservationEvidence({
//             sha256: container.sha256,
//             path: container.path,
//             operation: "inventory-nested-asar",
//             coverage: completeApplicationCoverage(),
//           }),
//         },
//       ],
//     });
//     context.containerNodes.set(container.sha256, node);
//     context.accumulator.addEdge({
//       source_node_id: context.root.node_id,
//       target_node_id: node.node_id,
//       relation: "contains",
//       properties: { path: container.path, format: "asar" },
//       evidence: artifactObservationEvidence({
//         sha256: context.snapshot.manifest.root_sha256,
//         path: container.path,
//         operation: "inventory-nested-asar",
//         coverage: completeApplicationCoverage(),
//       }),
//     });
//   }
// };
//
// /** Project relevant files, ASAR entries, and explicit unavailable parse scopes. */
// export const addJavaScriptArtifactFiles = (
//   context: JavaScriptArtifactGraphContext,
// ): void => {
//   const packagesByPath = indexFirstByPath(context.analysis.packages);
//   const jsonModulesByPath = indexFirstByPath(context.analysis.json_modules);
//   const sourceMapsByPath = indexFirstByPath(context.analysis.source_maps);
//   const inlineScriptsByPath = indexFirstByPath(
//     context.analysis.html_inline_scripts,
//   );
//   for (const analyzed of context.analysis.files) {
//     const { file } = analyzed;
//     const jsonValue = jsonModulesByPath.get(file.path);
//     const target = createFileTarget(
//       context,
//       file,
//       analyzed.javascript,
//       jsonValue,
//     );
//     if (
//       analyzed.application_projection_failure !== undefined &&
//       analyzed.javascript !== null
//     )
//       context.accumulator.addNode({
//         kind: target.kind,
//         identity: target.identity,
//         observations: [
//           {
//             label: file.path,
//             properties: {
//               static_analysis: freezeJsonSnapshot(
//                 jsonValueSchema.parse(analyzed.javascript),
//               ),
//               semantic_module_analysis:
//                 analyzed.semantic === null
//                   ? null
//                   : freezeJsonSnapshot(
//                       jsonValueSchema.parse(analyzed.semantic.ir),
//                     ),
//               application_projection_failure:
//                 analyzed.application_projection_failure.error,
//             },
export const _l = 170;
