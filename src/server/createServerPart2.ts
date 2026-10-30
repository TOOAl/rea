export const __stub = 1;
//         options.javascriptRuntimeObservation !== undefined,
//     },
//   });
//   const policy = (): AvailabilityPolicy => {
//     const value = basePolicy();
//     const fridaFailure =
//       options.optionalProviderLoadFailures?.fridaInstrumentation ??
//       fridaInstrumentation.availabilityFailure?.();
//     return fridaFailure === undefined
//       ? value
//       : {
//           ...value,
//           optionalProviderLoadFailures: {
//             ...value.optionalProviderLoadFailures,
//             fridaInstrumentation: fridaFailure,
//           },
//         };
//   };
//   return {
//     policy,
//   };
// };
//
// const createMcpServer = (
//   session: BinarySessionPort | undefined,
//   delivery: ToolResultDelivery,
//   compactPresentation: CompactInputSchemaPresentation | undefined,
//   omitOutputSchemas: boolean,
// ): EvidenceMcpServer =>
//   new EvidenceMcpServer(
//     {
//       name: PRODUCT_IDENTITY.mcpServerKey,
//       version: PRODUCT_IDENTITY.packageVersion,
//     },
//     {
//       capabilities: {},
//       instructions: `${
//         session === undefined
//           ? ACTIVE_TARGET_INSTRUCTIONS
//           : TARGET_FREE_INSTRUCTIONS
//       } ${UNTRUSTED_CONTENT_INSTRUCTIONS}`,
//     },
//     session === undefined
//       ? undefined
//       : (evidence) => session.recordEvidence(evidence),
//     delivery,
//     compactPresentation,
//     omitOutputSchemas,
//   );
//
// /**
//  * Construct one MCP server without acquiring subprocess resources.
//  * Supplying a session adds target lifecycle tools; omitting it retains the
//  * fixed-target seam used by focused tests and embedders.
//  */
// export const createServer = (
//   source: ServerAnalysisSource,
//   options: CreateServerOptions = {},
// ): EvidenceMcpServer => {
//   const session = source.kind === "session" ? source.session : undefined;
//   const analysis = source.kind === "session" ? source.session : source.analysis;
//   const environment = snapshotEnvironment(options.environment ?? process.env);
//   const omitOutputSchemas = outputSchemasOmitted(environment);
//   const providerEnvironment = captureProviderEnvironment(
//     options.providerEnvironment,
//     environment,
//   );
//   const delivery = selectToolResultDelivery(environment, options.delivery);
//   const evmInterface =
//     options.evmInterface ?? evmInterfaceModule.create(environment);
//   const sqliteDatabase =
//     options.sqliteDatabase ?? createSqliteDatabaseService(environment);
//   const binaryLayout =
//     options.binaryLayout ?? createBinaryLayoutService(environment);
//   const recordedCrash =
//     options.recordedCrash ?? createRecordedCrashService(environment);
//   const webSourceLocation =
//     options.webSourceLocation ?? createWebSourceLocationService(environment);
//   const webModuleTrace =
//     options.webModuleTrace ?? createWebModuleTraceService(environment);
//   const goBinary = options.goBinary ?? createGoBinaryService();
//   const peResources = createPeResourcesService();
//   const webNetworkCapture =
//     options.webNetworkCapture ?? createWebNetworkCaptureService(environment);
//   const javascriptRecovery =
//     options.javascriptRecovery ?? createJavaScriptRecoveryProvider(environment);
//   const artifactResources = new ArtifactResourceScope();
//   const reverseEngineering =
//     createReverseEngineeringService(providerEnvironment);
//   const firmwareAnalysis = new FirmwareAnalysisService(
//     options.firmwareAnalysis ?? createFirmwareAnalysisProvider(environment),
//   );
//   const selectedOptions = {
//     ...options,
//     environment,
//     delivery,
//     evmInterface,
//     sqliteDatabase,
//     binaryLayout,
//     recordedCrash,
//     webSourceLocation,
//     webModuleTrace,
//     javascriptRecovery,
//   };
//   const startedAt = new Date().toISOString();
//   const logger = options.logger ?? silentLogger;
//   const server = createMcpServer(
//     session,
//     delivery,
//     selectCompactInputSchemaPresentation(environment),
//     omitOutputSchemas,
//   );
//   const gdbSessions = new GdbSessionManager({
//     environment: providerEnvironment,
//   });
//   const rizinDebugSessions = new RizinDebugSessionManager(providerEnvironment);
//   const android =
//     options.androidAnalysis ?? createAndroidAnalysisProvider(environment);
//   const pcap = options.pcapAnalysis ?? createPcapAnalysisProvider(environment);
//   const flutter =
//     options.flutterAnalysis ?? createFlutterBuildAnalysisProvider();
//   const fridaInstrumentation =
//     options.fridaInstrumentation ?? new FridaInstrumentationManager();
//   const wasmArtifact = wasmArtifactModule.create(
//     environment,
//     options.wasmArtifact,
//   );
//   const packetCapture =
//     options.packetCapture ?? createPacketCaptureService(environment);
//   const signalRecording =
//     options.signalRecording ?? createSignalRecordingService(environment);
//   const apktool =
//     options.apktoolAnalysis ??
//     createApktoolResourceAnalysisProvider(environment);
//   const jeb = options.jebAnalysis ?? createJebAnalysisProvider(environment);
//   const adbDevice =
//     options.adbDeviceAnalysis ?? createAdbDeviceAnalysisProvider(environment);
//   let providerClose: Promise<void> | undefined;
//   const closeProviders = (): Promise<void> => {
//     providerClose ??= Promise.allSettled([
//       android.close(),
//       fridaInstrumentation.closeAll(),
//       wasmArtifact.close(),
//       packetCapture.close(),
//       signalRecording.close(),
//       apktool.close(),
//       jeb.close(),
//       adbDevice.close(),
//       flutter.close(),
//       pcap.close(),
//       evmInterface.close(),
//       sqliteDatabase.close(),
//       binaryLayout.close(),
//       recordedCrash.close(),
//       webSourceLocation.close(),
//       webModuleTrace.close(),
//       goBinary.close(),
//       peResources.close(),
//       webNetworkCapture.close(),
//       javascriptRecovery.close?.() ?? Promise.resolve(),
//       artifactResources.close(),
//       reverseEngineering.close(),
//       firmwareAnalysis.close(),
//       gdbSessions.closeAll(),
//       rizinDebugSessions.closeAll(),
//     ])
//       .then((results) => {
//         const failures = results.flatMap((result) =>
//           result.status === "rejected" ? [result.reason] : [],
//         );
//         if (failures.length > 0)
//           throw new AggregateError(failures, "REA provider cleanup failed");
//       })
//       .catch((cause: unknown) => {
//         providerClose = undefined;
//         throw cause;
//       });
//     return providerClose;
//   };
//   const availability = installSessionToolAvailability(
//     session,
//     options,
//     environment,
//     fridaInstrumentation,
//   );
//   const toolLogger = logger.child({ layer: "server" });
//   const {
//     evidenceById,
//     activeTarget,
//     recordEvidence,
//     recordEvidenceWithUnknown,
//   } = createSessionRecorders(server, session);
//   const analysisAdmission = withAdmittedAnalysis(source);
//   const toolContext: ServerToolContext = {
//     server,
//     session,
//     options: selectedOptions,
//     environment,
//     logger: toolLogger,
//     evidenceById,
//     activeTarget,
//     recordEvidence,
//     recordEvidenceWithUnknown,
//     withAdmittedAnalysis: analysisAdmission,
//     artifactResources,
//     goBinary,
//     peResources,
//     webNetworkCapture,
//   };
//   registerBinaryAnalysisTools(toolContext);
//   registerReverseEngineeringTools(
//     server,
//     reverseEngineering,
//     toolLogger,
//     delivery,
//     session === undefined
//       ? undefined
//       : (evidence) => session.recordEvidence(evidence),
//     analysisAdmission,
//     session === undefined
//       ? undefined
//       : () => session.invalidateSnapshotForExternalMutation(),
//     session === undefined
//       ? undefined
//       : (path, signal, operation, rebindFailure) =>
//           session.withAdmittedExternalMutation(
//             path,
//             signal,
//             operation,
export const _l = 229;
