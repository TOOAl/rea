export const __stub = 1;
//     return file === undefined
//       ? null
//       : {
//           path: `${sourcePath}#module:${specifier}`,
//           file,
//           node: module,
//           limitations: [],
//         };
//   }
//   // Worker scripts are URLs relative to the script, not module specifiers.
//   const resolution = isWorker
//     ? resolveArtifactPathByContext({
//         declaredPath: specifier,
//         sourcePath,
//         context: "url-reference",
//         files: context.filesByPath,
//         directoryPaths: context.directoryPaths,
//         unanalyzedFiles: context.unanalyzedFiles,
//       })
//     : resolveArtifactPathByContext({
//         declaredPath: specifier,
//         sourcePath,
//         context: "module-specifier",
//         files: context.filesByPath,
//         directoryPaths: context.directoryPaths,
//         unanalyzedFiles: context.unanalyzedFiles,
//         ...("require" === reference.kind ||
//         "static-import" === reference.kind ||
//         "dynamic-import" === reference.kind
//           ? {
//               moduleKind: moduleResolutionModeForJavaScriptReference(
//                 sourcePath,
//                 reference.kind,
//               ),
//             }
//           : {}),
//       });
//   const path = resolution.resolved_path;
//   if (path === null) {
//     const source = context.filesByPath.get(sourcePath);
//     return source === undefined
//       ? null
//       : {
//           path: null,
//           file: null,
//           node: isWorker
//             ? null
//             : unresolvedReferenceNode(
//                 context,
//                 source,
//                 reference,
//                 coverage,
//                 resolution,
//               ),
//           limitations: resolution.limitations,
//           resolutionStatus: resolution.resolution_status,
//           resolution,
//         };
//   }
//   const file = context.filesByPath.get(path);
//   const node = context.fileNodes.get(path);
//   return file === undefined || node === undefined
//     ? null
//     : {
//         path,
//         file,
//         node,
//         limitations: resolution.limitations,
//         resolutionStatus: resolution.resolution_status,
//         resolution,
//       };
// };
//
// const resolveBundlerChunkReference = (
//   context: JavaScriptArtifactGraphContext,
//   sourcePath: string,
//   reference: StaticReference,
// ): ResolvedReference | null => {
//   const key = reference.specifier?.startsWith("chunk:")
//     ? reference.specifier.slice("chunk:".length)
//     : null;
//   if (key === null) return null;
//   const file = context.filesByPath.get(sourcePath);
//   if (file === undefined) return null;
//   const registrations = context.analysis.files
//     .find(({ file: analyzedFile }) => analyzedFile.path === sourcePath)
//     ?.javascript?.bundler_registrations.filter(({ runtime, modules }) =>
//       reference.module_runtime === undefined
//         ? reference.module_key === null
//         : runtime === reference.module_runtime &&
//           modules.some(
//             ({ module_key: moduleKey }) => moduleKey === reference.module_key,
//           ),
//     );
//   if (registrations === undefined) return null;
//   const candidates = registrations.flatMap(({ runtime }) => {
//     const node = context.chunkNodes.get(
//       chunkLookupKey(sourcePath, runtime, key),
//     );
//     return node === undefined ? [] : [node];
//   });
//   const unique = [
//     ...new Map(candidates.map((node) => [node.node_id, node])).values(),
//   ];
//   if (unique.length !== 1) return null;
//   const node = unique[0];
//   return node === undefined
//     ? null
//     : { path: `${sourcePath}#chunk:${key}`, file, node, limitations: [] };
// };
//
// const unresolvedReferenceNode = (
//   context: JavaScriptArtifactGraphContext,
//   file: JavaScriptArtifactFile,
//   reference: StaticReference,
//   coverage: JavaScriptArtifactGraphCoverage,
//   resolution?: ArtifactPathResolution,
// ): ApplicationNode =>
//   context.accumulator.addNode({
//     kind: "javascript-module",
//     identity: artifactLocalIdentity(
//       file.sha256,
//       "unresolved-reference",
//       `${reference.kind}:${reference.specifier ?? reference.expression}`,
//     ),
//     observations: [
//       {
//         label: reference.specifier,
//         properties: {
//           reference_kind: reference.kind,
//           specifier: reference.specifier,
//           expression: reference.expression,
//           resolution: "unresolved",
//           ...(resolution === undefined
//             ? {}
//             : { resolution_status: resolution.resolution_status }),
//           ...artifactPathResolutionProperties(resolution),
//         },
//         evidence: staticInferenceEvidence({
//           sha256: file.sha256,
//           path: file.path,
//           range: reference.location,
//           operation: "resolve-static-reference",
//           coverage,
//           confidence: "low",
//           limitations: [
//             "The static reference could not be resolved within the inventoried artifact.",
//             ...(resolution?.limitations ?? []),
//           ],
//         }),
//       },
//     ],
//   });
export const _l = 153;
