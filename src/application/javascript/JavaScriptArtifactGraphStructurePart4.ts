export const __stub = 1;
//     });
//     addPackageRole(context, {
//       packageNode: node,
//       packageFile: file,
//       kind: "electron-renderer",
//       declaredPath: packageValue.renderer,
//     });
//   }
//   return roots;
// };
//
// /** Dependency-only artifacts retain their inventory root. */
// const applicationManifestPath = (
//   context: JavaScriptArtifactGraphContext,
// ): string | undefined =>
//   context.analysis.packages
//     .map(({ path }) => path)
//     .filter(
//       (path) => context.filesByPath.has(path) && !dependencyManifest(path),
//     )
//     .sort(
//       (left, right) =>
//         left.split("/").length - right.split("/").length ||
//         compareUnicodeCodePoints(left, right),
//     )[0];
//
// const dependencyManifest = (path: string): boolean =>
//   path.split("/").slice(0, -1).includes("node_modules");
//
// const createFileTarget = (
//   context: JavaScriptArtifactGraphContext,
//   file: JavaScriptArtifactFile,
//   javascript: JavaScriptModuleArtifactAnalysis["files"][number]["javascript"],
//   json: JavaScriptModuleArtifactAnalysis["json_modules"][number] | undefined,
// ): ApplicationNode => {
//   const kind = artifactFileNodeKind(file.kind);
//   return context.accumulator.addNode({
//     kind,
//     identity: {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: file.sha256,
//     },
//     observations: [
//       {
//         label: file.path,
//         properties: {
//           path: file.path,
//           bytes: file.bytes,
//           inventory_artifact_id: file.inventory_artifact_id,
//           unpacked: file.unpacked,
//           file_kind: file.kind,
//           text_status: file.text.included ? "included" : file.text.reason,
//           parse_status: javascript?.parse_status ?? null,
//           json_parse_status: json?.status ?? null,
//           json_top_level_keys: json?.top_level_keys ?? [],
//           omitted_json_top_level_keys: json?.omitted_top_level_keys ?? 0,
//           vendor_markers: javascript?.vendors ?? [],
//         },
//         evidence: artifactObservationEvidence({
//           sha256: file.sha256,
//           path: file.path,
//           operation: "inventory-relevant-file",
//           coverage: completeApplicationCoverage(),
//         }),
//       },
//     ],
//   });
// };
//
// const indexFirstByPath = <Value extends { readonly path: string }>(
//   values: readonly Value[],
// ): ReadonlyMap<string, Value> => {
//   const index = new Map<string, Value>();
//   for (const value of values) {
//     if (!index.has(value.path)) index.set(value.path, value);
//   }
//   return index;
// };
//
// const createAsarEntry = (
//   context: JavaScriptArtifactGraphContext,
//   file: JavaScriptArtifactFile,
// ): ApplicationNode | undefined => {
//   if (!isAsarContainer(context, file.container_sha256)) return undefined;
//   return context.accumulator.addNode({
//     kind: "asar-entry",
//     identity: {
//       strategy: "canonical-path",
//       stability: "artifact-version",
//       artifact_sha256: file.container_sha256,
//       path: file.path,
//     },
//     observations: [
//       {
//         label: file.path,
//         properties: {
//           entry_sha256: file.sha256,
//           bytes: file.bytes,
//           unpacked: file.unpacked,
//           inventory_artifact_id: file.inventory_artifact_id,
//         },
//         evidence: artifactObservationEvidence({
//           sha256: file.container_sha256,
//           path: file.path,
//           operation: "inventory-asar-entry",
//           coverage: completeApplicationCoverage(),
//         }),
//       },
//     ],
//   });
// };
//
// const addPackageRole = (
//   context: JavaScriptArtifactGraphContext,
//   input: PackageRoleInput,
// ): void => {
//   if (input.declaredPath === null) return;
//   const resolution = resolveArtifactPathByContext({
//     declaredPath: input.declaredPath,
//     sourcePath: input.packageFile.path,
//     context: "package-entrypoint",
//     files: context.filesByPath,
//     directoryPaths: context.directoryPaths,
//     unanalyzedFiles: context.unanalyzedFiles,
//   });
//   const role = createElectronRoleNode(context, {
//     kind: input.kind,
//     anchor: input.packageFile,
//     resolution,
//     mechanism:
//       input.kind === "electron-main"
//         ? "package.json:main"
//         : "package.json:renderer",
//   });
//   context.accumulator.addEdge({
//     source_node_id: input.packageNode.node_id,
//     target_node_id: role.node_id,
//     relation: "loads",
//     properties: {
//       declared_path: input.declaredPath,
//       resolution_context: resolution.resolution_context,
//       resolved_path: resolution.resolved_path,
//       resolution_status: resolution.resolution_status,
//       ...artifactPathResolutionProperties(resolution),
//       limitations: resolution.limitations,
//     },
//     evidence: staticInferenceEvidence({
//       sha256: input.packageFile.sha256,
//       path: input.packageFile.path,
//       operation: "discover-package-entrypoint",
//       coverage: completeApplicationCoverage(),
//       limitations: resolution.limitations,
//     }),
//   });
//   linkElectronRoleToAsset(context, {
//     role,
//     anchor: input.packageFile,
//     resolution,
//   });
// };
//
// const containerProperties = (container: JavaScriptArtifactContainer) => ({
//   path: container.path,
//   format: "asar",
//   bytes: container.bytes,
//   inventory_artifact_id: container.inventory_artifact_id,
// });
// import { javaScriptAnalysisCoverageLimits } from "../../domain/javascript/javascriptAnalysisResourceControls.js";
export const _l = 169;
