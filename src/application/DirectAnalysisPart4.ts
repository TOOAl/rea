export const __stub = 1;
//         ? {}
//         : { relationshipCoverage: result.value.relationshipCoverage }),
//       locations: result.value.locations,
//       evidenceLinks:
//         tool === "inspect_artifact"
//           ? artifactInspectionResultSchema.parse(result.value.result)
//               .evidence_links
//           : [],
//     },
//   );
//   return { output: evidence, evidence };
// };
//
// const withProcessCancellation = async <Value>(
//   suppliedSignal: AbortSignal | undefined,
//   operation: (signal: AbortSignal) => Promise<Value>,
// ): Promise<Value> => {
//   if (suppliedSignal !== undefined) return operation(suppliedSignal);
//   const controller = new AbortController();
//   const cancel = (): void => controller.abort();
//   // Package runners can forward a terminal interrupt after REA already received
//   // it directly. Keep both guards installed until provider cleanup has settled.
//   process.on("SIGINT", cancel);
//   process.on("SIGTERM", cancel);
//   try {
//     return await operation(controller.signal);
//   } finally {
//     process.off("SIGINT", cancel);
//     process.off("SIGTERM", cancel);
//   }
// };
//
// const prepareSnapshot = async (options: {
//   readonly path: string;
//   readonly formatHint?: ExecutableFormatHint;
//   readonly architecture?: BinaryArchitecture;
//   readonly entryPoint?: string;
//   readonly snapshotPath: string | undefined;
//   readonly signal: AbortSignal;
// }): Promise<
//   Result<
//     { readonly snapshot?: AnalysisSnapshot; readonly target?: BinaryTarget },
//     AnalysisError
//   >
// > => {
//   const { path, snapshotPath } = options;
//   if (snapshotPath === undefined || !(await fileExists(snapshotPath)))
//     return ok({});
//   const loaded = await readAnalysisSnapshot(snapshotPath, options.signal);
//   if (!loaded.ok) return loaded;
//   const target = await parseBinaryTarget(path, {
//     signal: options.signal,
//     ...(options.formatHint === undefined
//       ? {}
//       : { formatHint: options.formatHint }),
//     ...(options.architecture === undefined
//       ? {}
//       : { architecture: options.architecture }),
//     ...(options.entryPoint === undefined
//       ? {}
//       : { entryPoint: options.entryPoint }),
//   });
//   if (!target.ok) return target;
//   if (!snapshotMatchesTarget(loaded.value.target, target.value))
//     return err(
//       new EvidenceIntegrityError(
//         "Analysis snapshot target does not match the requested binary",
//       ),
//     );
//   return ok({ snapshot: loaded.value, target: target.value });
// };
//
// const allowsSnapshotReplay = (
//   route: SessionProviderRoute,
//   tool:
//     | NativeToolName
//     | ArtifactAnalysisOperation
//     | ManagedToolName
//     | DirectAnalysisTool,
// ): boolean => {
//   if (tool === "trace_native_ui_action") return false;
//   const descriptor = route.capabilities?.get(tool);
//   return descriptor === undefined
//     ? ![...(route.capabilities?.values() ?? [])].some(
//         ({ cachePolicy }) => cachePolicy === "live",
//       )
//     : descriptor.cachePolicy !== "live";
// };
//
// const analysisProfileForRoute = (
//   route: SessionProviderRoute,
//   tool:
//     | NativeToolName
//     | ArtifactAnalysisOperation
//     | ManagedToolName
//     | DirectAnalysisTool,
// ): AnalysisProfileCommitment | undefined => {
//   const profile = route.profile;
//   if (profile === null || profile === undefined) return undefined;
//   if (isWorkflowEvidenceTool(tool))
//     return workflowAnalysisProfile(profile, tool);
//   const provider = providerIdentityForRoute(route, tool);
//   return provider.id === profile.provider.id ? profile : undefined;
// };
//
// /** Mirror BinarySession.providerIdentity for a route not opened yet. */
// const providerIdentityForRoute = (
//   route: SessionProviderRoute,
//   operation: string,
// ): ProviderIdentity =>
//   route.capabilities?.get(operation)?.provider ?? route.identity;
//
// const analysisProfileForEvidence = (
//   session: BinarySession,
//   tool:
//     | NativeToolName
//     | ArtifactAnalysisOperation
//     | ManagedToolName
//     | DirectAnalysisTool,
// ): AnalysisProfileCommitment | undefined => {
//   if (!isWorkflowEvidenceTool(tool)) return session.analysisProfile(tool);
//   return session.analysisProfile();
// };
//
// const isWorkflowEvidenceTool = (
//   tool:
//     | NativeToolName
//     | ArtifactAnalysisOperation
//     | ManagedToolName
//     | DirectAnalysisTool,
// ): boolean =>
//   tool === "binary_overview" ||
//   tool === "inspect_native_api" ||
//   tool === "inspect_native_dispatch_metadata" ||
//   tool === "trace_feature" ||
//   tool === "trace_native_values" ||
//   tool === "trace_native_ui_action";
//
// const fileExists = async (path: string): Promise<boolean> => {
//   try {
//     await access(path);
//     return true;
//   } catch (cause: unknown) {
//     if (
//       typeof cause === "object" &&
//       cause !== null &&
//       "code" in cause &&
//       cause.code === "ENOENT"
//     )
//       return false;
//     throw cause;
//   }
// };
//
// const cliError = (error: AnalysisError): JsonValue => ({
//   error: "Analysis failed",
//   ...projectAnalysisError(error),
// });
export const _l = 158;
