export const __stub = 1;
//   dependencies: Pick<DirectAnalysisDependencies, "createManagedBinarySession">,
//   path: string,
//   tool: ManagedToolName,
//   signal?: AbortSignal,
//   parameters: Readonly<Record<string, JsonValue>> = {},
// ): Promise<Result<AnalysisExecution, AnalysisError>> =>
//   withProcessCancellation(signal, async (operationSignal) => {
//     const session = await dependencies.createManagedBinarySession();
//     return withSessionCleanup(
//       session,
//       async () => {
//         const opened = await session.open(path, { signal: operationSignal });
//         if (!opened.ok) return opened;
//         return await session.execute(tool, parameters, {
//           signal: operationSignal,
//         });
//       },
//       managedAnalysisCleanupFailure,
//     );
//   });
//
// const runManagedProviderAnalysis = async (
//   dependencies: DirectAnalysisDependencies,
//   path: string,
//   tool: ManagedToolName,
//   arguments_: Readonly<Record<string, JsonValue>>,
//   signal?: AbortSignal,
// ): Promise<JsonValue> => {
//   const execution = await runManagedProviderExecution(
//     dependencies,
//     path,
//     tool,
//     signal,
//     arguments_,
//   );
//   if (!execution.ok) return cliError(execution.error);
//   const value = execution.value;
//   return createEvidence(value.subject ?? undefined, value.provider, {
//     operation: tool,
//     parameters: arguments_,
//     result: value.result,
//     rawResult: value.rawResult,
//     limitations: value.limitations,
//     ...(value.relationshipCoverage === undefined
//       ? {}
//       : { relationshipCoverage: value.relationshipCoverage }),
//     locations: value.locations,
//   });
// };
//
// const runAnalysis = async (
//   dependencies: DirectAnalysisDependencies,
//   path: string,
//   tool:
//     | NativeToolName
//     | ArtifactAnalysisOperation
//     | ManagedToolName
//     | DirectAnalysisTool,
//   arguments_: Readonly<Record<string, JsonValue>>,
//   options: {
//     readonly logger: Logger;
//     readonly snapshotPath: string | undefined;
//     readonly signal: AbortSignal;
//     readonly createSession?: () => BinarySession | Promise<BinarySession>;
//     readonly providerId?: AnalysisProviderSelector;
//     readonly formatHint?: ExecutableFormatHint;
//     readonly architecture?: BinaryArchitecture;
//     readonly entryPoint?: string;
//   },
// ): Promise<JsonValue> => {
//   const { logger, signal, snapshotPath } = options;
//   let session: BinarySession;
//   if (options.createSession !== undefined) {
//     session = await options.createSession();
//   } else {
//     const config = dependencies.readConfiguration();
//     if (!config.ok) return cliError(config.error);
//     session = await dependencies.createBinarySession(config.value, logger);
//   }
//   return withSessionCleanup(
//     session,
//     async () => {
//       const prepared = await prepareSnapshot({
//         path,
//         snapshotPath,
//         signal,
//         ...(options.formatHint === undefined
//           ? {}
//           : { formatHint: options.formatHint }),
//         ...(options.architecture === undefined
//           ? {}
//           : { architecture: options.architecture }),
//         ...(options.entryPoint === undefined
//           ? {}
//           : { entryPoint: options.entryPoint }),
//       });
//       if (!prepared.ok) return cliError(prepared.error);
//       const { snapshot } = prepared.value;
//       let resolvedTarget: ResolvedSessionOpen | undefined;
//       if (snapshot !== undefined && prepared.value.target !== undefined) {
//         const preview = await session.previewTarget(prepared.value.target, {
//           signal,
//           snapshot,
//           ...(options.formatHint === undefined
//             ? {}
//             : { formatHint: options.formatHint }),
//           ...(options.architecture === undefined
//             ? {}
//             : { architecture: options.architecture }),
//           ...(options.entryPoint === undefined
//             ? {}
//             : { entryPoint: options.entryPoint }),
//           ...(options.providerId === undefined
//             ? {}
//             : { providerId: options.providerId }),
//         });
//         if (!preview.ok) return cliError(preview.error);
//         resolvedTarget = preview.value;
//         const route = preview.value.route;
//         const bindingProfile = route.profile ?? undefined;
//         const evidenceProfile = analysisProfileForRoute(route, tool);
//         // A parsed Windows path does not prove Ghidra's native snapshot owner
//         // admitted the selected source; CLI replay must wait for that client.
//         if (
//           bindingProfile !== undefined &&
//           evidenceProfile !== undefined &&
//           !requiresNativeSourceAdmissionBeforeReplay(
//             route.binding?.identity.id,
//           ) &&
//           allowsSnapshotReplay(route, tool)
//         ) {
//           const cached = snapshotEvidenceForQuery(snapshot, {
//             target: preview.value.target,
//             bindingProfile,
//             operation: tool,
//             parameters: arguments_,
//             provider: isWorkflowEvidenceTool(tool)
//               ? REA_WORKFLOW_PROVIDER
//               : providerIdentityForRoute(route, tool),
//             evidenceProfile,
//           });
//           if (cached !== undefined) return cached;
//         }
//       }
//       const openOptions = {
//         signal,
//         ...(options.formatHint === undefined
//           ? {}
//           : { formatHint: options.formatHint }),
//         ...(options.architecture === undefined
//           ? {}
//           : { architecture: options.architecture }),
//         ...(options.entryPoint === undefined
//           ? {}
//           : { entryPoint: options.entryPoint }),
//         ...(snapshot === undefined ? {} : { snapshot }),
//         ...(options.providerId === undefined
//           ? {}
//           : { providerId: options.providerId }),
//       };
//       const opened =
export const _l = 161;
