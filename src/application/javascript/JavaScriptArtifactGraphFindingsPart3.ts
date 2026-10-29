export const __stub = 1;
//
// const addDiscoveredRole = (
//   context: JavaScriptArtifactGraphContext,
//   input: FindingInput<StaticRolePath>,
// ): void => {
//   const resolution = resolveArtifactPathByContext({
//     declaredPath: input.value.path,
//     sourcePath: input.file.path,
//     context: input.value.resolution_context,
//     files: context.filesByPath,
//     directoryPaths: context.directoryPaths,
//     unanalyzedFiles: context.unanalyzedFiles,
//     ...(input.value.role === "preload" ||
//     (input.value.role === "renderer" &&
//       input.value.resolution_context === "filesystem-expression")
//       ? { runtimePathKind: "exact-file" as const }
//       : input.value.role === "renderer" &&
//           input.value.resolution_context === "module-specifier"
//         ? { runtimePathKind: "url-resource" as const }
//         : {}),
//   });
//   const role = createElectronRoleNode(context, {
//     kind:
//       input.value.role === "preload" ? "electron-preload" : "electron-renderer",
//     anchor: input.file,
//     resolution,
//     mechanism: input.value.mechanism,
//     range: input.value.location,
//     coverage: input.coverage,
//   });
//   const source =
//     sourceNodeFor(
//       context,
//       input.file.path,
//       input.value.module_key,
//       input.value.module_runtime,
//     ) ?? input.asset;
//   addStaticInferenceEdge(context, {
//     source,
//     target: role,
//     file: input.file,
//     range: input.value.location,
//     coverage: input.coverage,
//     relation: "loads",
//     properties: { mechanism: input.value.mechanism },
//   });
//   linkElectronRoleToAsset(context, {
//     role,
//     anchor: input.file,
//     resolution,
//     range: input.value.location,
//     coverage: input.coverage,
//   });
// };
//
// const addSourceMapEdge = (
//   context: JavaScriptArtifactGraphContext,
//   input: FindingInput<StaticSourceMap>,
// ): void => {
//   const declaredUrlSha256 = createHash("sha256")
//     .update(input.value.declared_url)
//     .digest("hex");
//   const resolution = resolveArtifactPathByContext({
//     declaredPath: input.value.declared_url,
//     sourcePath: input.file.path,
//     context: "url-reference",
//     files: context.filesByPath,
//     directoryPaths: context.directoryPaths,
//     unanalyzedFiles: context.unanalyzedFiles,
//   });
//   const resolvedPath = resolution.resolved_path;
//   const resolvedFile =
//     resolvedPath === null ? undefined : context.filesByPath.get(resolvedPath);
//   const resolvedNode =
//     resolvedPath === null ? undefined : context.fileNodes.get(resolvedPath);
//   const isAvailable =
//     resolvedFile?.kind === "source-map" && resolvedNode !== undefined;
//   const limitations =
//     isAvailable || resolution.limitations.length > 0
//       ? resolution.limitations
//       : [
//           "The declared reference does not identify an available source-map projection.",
//         ];
//   const target = context.accumulator.addNode({
//     kind: "source-map",
//     identity:
//       isAvailable && resolvedNode !== undefined
//         ? resolvedNode.identity
//         : artifactLocalIdentity(
//             input.file.sha256,
//             "unresolved-source-map",
//             declaredUrlSha256,
//           ),
//     observations: [
//       {
//         label: "source map reference",
//         properties: {
//           declared_url: input.value.declared_url,
//           declared_url_sha256: declaredUrlSha256,
//           resolved_path: resolvedPath,
//           resolution_status: resolution.resolution_status,
//           ...artifactPathResolutionProperties(resolution),
//           available: isAvailable,
//         },
//         evidence: staticInferenceEvidence({
//           sha256: input.file.sha256,
//           path: input.file.path,
//           range: input.value.location,
//           operation: "discover-source-map",
//           coverage: input.coverage,
//           confidence: "medium",
//           limitations,
//         }),
//       },
//     ],
//   });
//   addStaticInferenceEdge(context, {
//     source: input.asset,
//     target,
//     file: input.file,
//     range: input.value.location,
//     coverage: input.coverage,
//     relation: "maps_to",
//     limitations,
//     properties: {
//       declared_url_sha256: declaredUrlSha256,
//       resolved_path: resolvedPath,
//       resolution_status: resolution.resolution_status,
//       ...artifactPathResolutionProperties(resolution),
//     },
//   });
// };
//
// const resolveReference = (
//   context: JavaScriptArtifactGraphContext,
//   sourcePath: string,
//   reference: StaticReference,
//   coverage: JavaScriptArtifactGraphCoverage,
// ): ResolvedReference | null => {
//   const specifier = reference.specifier;
//   if (specifier === null) return null;
//   const isWorker =
//     reference.kind === "worker" || reference.kind === "service-worker";
//   const chunk = isWorker
//     ? null
//     : resolveBundlerChunkReference(context, sourcePath, reference);
//   if (chunk !== null) return chunk;
//   const module =
//     isWorker || reference.module_runtime === undefined
//       ? undefined
//       : context.moduleNodes.get(
//           moduleLookupKey(sourcePath, reference.module_runtime, specifier),
//         );
//   if (module !== undefined) {
//     const file = context.filesByPath.get(sourcePath);
export const _l = 155;
