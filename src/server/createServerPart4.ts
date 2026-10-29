export const __stub = 1;
//     options.rustBinary ?? createRustBinaryService(),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerWasmTools(
//     server,
//     wasmArtifact,
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//     evidenceById,
//   );
//   registerEvmTools(
//     server,
//     evmInterface,
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//     evidenceById,
//   );
//   registerSqliteTools(
//     server,
//     options.sqliteDatabase ?? createSqliteDatabaseService(environment),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerRecordedCrashTools(
//     server,
//     options.recordedCrash ?? createRecordedCrashService(environment),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerFirmwareTools(
//     server,
//     firmwareAnalysis,
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerWebModuleTool(
//     server,
//     options.webModuleTrace ?? createWebModuleTraceService(environment),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerWebSourceLocationTool(
//     server,
//     options.webSourceLocation ?? createWebSourceLocationService(environment),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerWebRuntimeTools(
//     server,
//     options.webRuntime ?? createWebRuntimeService(),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerWebNetworkCaptureTool(
//     server,
//     webNetworkCapture,
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//     evidenceById,
//   );
//   registerJavaScriptRecoveryTool(
//     server,
//     new JavaScriptRecoveryService(
//       options.javascriptRecovery ??
//         createJavaScriptRecoveryProvider(environment),
//     ),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
// };
//
// const createSessionRecorders = (
//   server: EvidenceMcpServer,
//   session: BinarySessionPort | undefined,
// ) => ({
//   evidenceById:
//     session === undefined
//       ? undefined
//       : (evidenceId: string) =>
//           session.evidenceForAnalysis?.(evidenceId) ??
//           session.evidenceById(evidenceId),
//   activeTarget:
//     session === undefined ? undefined : () => session.activeTarget(),
//   recordEvidence:
//     session === undefined
//       ? undefined
//       : (evidence: Parameters<typeof session.recordEvidence>[0]) =>
//           session.recordEvidence(evidence),
//   recordEvidenceWithUnknown:
//     session === undefined
//       ? undefined
//       : (
//           evidence: Parameters<typeof session.recordEvidenceWithUnknown>[0],
//           input: Parameters<typeof session.recordEvidenceWithUnknown>[1],
//         ) => session.recordEvidenceWithUnknown(evidence, input),
// });
//
// interface ServerToolContext extends ReturnType<typeof createSessionRecorders> {
//   readonly goBinary: GoBinaryService;
//   readonly peResources: PeResourcesService;
//   readonly webNetworkCapture: WebNetworkCaptureService;
//   readonly artifactResources: ArtifactResourceScope;
//   readonly server: EvidenceMcpServer;
//   readonly session: BinarySessionPort | undefined;
//   readonly options: CreateServerOptions;
//   readonly environment: Readonly<NodeJS.ProcessEnv>;
//   readonly logger: Logger;
//   readonly withAdmittedAnalysis: WithAdmittedAnalysis;
// }
//
// const registerBinaryAnalysisTools = ({
//   server,
//   session,
//   logger,
//   activeTarget,
//   recordEvidence,
//   recordEvidenceWithUnknown,
//   evidenceById,
//   withAdmittedAnalysis,
// }: ServerToolContext): void => {
//   const recordUnknown =
//     session === undefined
//       ? undefined
//       : (input: Parameters<typeof session.recordUnknown>[0]) =>
//           session.recordUnknown(input);
//   const analysisOptions = {
//     logger,
//     activeTarget,
//     recordEvidence,
//     recordUnknown,
//     withAdmittedAnalysis,
//   };
//   registerOfficialTools(server, analysisOptions);
//   registerEnhancedTools(server, {
//     ...analysisOptions,
//     analysisProfile:
//       session === undefined ? undefined : () => session.analysisProfile(),
//     allowsSnapshotReplay:
//       session === undefined
//         ? undefined
//         : (operation) => session.allowsSnapshotReplay(operation),
//     recordWorkflowSnapshot:
//       session === undefined
//         ? undefined
//         : (input) => session.recordWorkflowSnapshot(input),
//   });
//   const evidenceOptions = {
//     logger,
//     activeTarget,
//     recordEvidence,
//     withAdmittedAnalysis,
//   };
//   registerNativeTools(server, { ...evidenceOptions, evidenceById });
//   registerArtifactTools(server, { ...evidenceOptions, evidenceById });
//   registerManagedTools(server, { ...evidenceOptions, evidenceById });
//   if (session !== undefined)
//     registerManagedWorkflowTools(server, {
//       logger,
//       recordEvidence,
//       recordEvidenceWithUnknown,
//       session,
//       withAdmittedAnalysis,
//     });
// };
//
// const registerObservationTools = ({
//   evidenceById,
//   server,
//   options,
//   logger,
//   recordEvidence,
//   recordEvidenceWithUnknown,
//   withAdmittedAnalysis,
//   artifactResources,
// }: ServerToolContext): void => {
//   const common = { logger, recordEvidence, withAdmittedAnalysis };
//   registerWebScriptTool(server, { ...common, artifactResources });
//   registerBrowserTools(server, {
//     ...common,
//     browser: options.browserObservation,
//     loadFailure: options.optionalProviderLoadFailures?.browserObservation,
//   });
//   registerBrowserScenarioTool(server, {
//     ...common,
//     provider: options.browserScenarioCapture,
//     loadFailure: options.optionalProviderLoadFailures?.browserScenarioCapture,
//   });
//   registerElectronTools(server, {
//     ...common,
//     artifactResources,
//     evidenceById,
//     electron: options.electronObservation,
//     electronActive: options.electronActiveObservation,
//     electronFuses: options.electronFuses ?? createElectronFuseService(),
//     observationLoadFailure:
//       options.optionalProviderLoadFailures?.electronObservation,
//     activeLoadFailure:
//       options.optionalProviderLoadFailures?.electronActiveObservation,
//   });
//   registerJavaScriptRuntimeObservationTools(server, {
//     ...common,
//     runtime: options.javascriptRuntimeObservation,
//     loadFailure:
//       options.optionalProviderLoadFailures?.javascriptRuntimeObservation,
//   });
//   registerApplicationTools(server, {
//     evidenceById,
//     logger,
//     recordEvidence,
//     recordEvidenceWithUnknown,
//     withAdmittedAnalysis,
//   });
// };
export const _l = 225;
