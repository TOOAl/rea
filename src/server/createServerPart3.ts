export const __stub = 1;
//             rebindFailure,
//           ),
//   );
//   registerFridaTools(
//     server,
//     fridaInstrumentation,
//     toolLogger,
//     delivery,
//     session === undefined
//       ? undefined
//       : (evidence) => session.recordEvidence(evidence),
//   );
//   registerCutterTools(
//     server,
//     new CutterBridgeService(new CutterBridgeClient(providerEnvironment)),
//     toolLogger,
//     delivery,
//     session === undefined
//       ? undefined
//       : (evidence) => session.recordEvidence(evidence),
//     session,
//   );
//   registerGdbTools(
//     server,
//     gdbSessions,
//     toolLogger,
//     delivery,
//     session === undefined
//       ? undefined
//       : (evidence) => session.recordEvidence(evidence),
//     session,
//   );
//   registerRizinDebugTools(
//     server,
//     rizinDebugSessions,
//     toolLogger,
//     delivery,
//     session === undefined
//       ? undefined
//       : (evidence) => session.recordEvidence(evidence),
//     session,
//   );
//   const previousOnclose = server.server.onclose;
//   server.server.onclose = () => {
//     previousOnclose?.();
//     void closeProviders().catch((cause: unknown) => {
//       logger.error(
//         { error: cause instanceof Error ? cause.message : String(cause) },
//         "Provider cleanup failed during server shutdown",
//       );
//     });
//   };
//   const closeServer = server.close.bind(server);
//   server.close = async () => {
//     const results = await Promise.allSettled([closeServer(), closeProviders()]);
//     for (const result of results)
//       if (result.status === "rejected") throw result.reason;
//   };
//   registerCaptureTools(
//     server,
//     packetCapture,
//     toolLogger,
//     recordEvidence,
//     analysisAdmission,
//   );
//   registerSignalTools(
//     server,
//     signalRecording,
//     toolLogger,
//     recordEvidence,
//     analysisAdmission,
//   );
//   registerConfiguredAnalysisTools(
//     toolContext,
//     android,
//     wasmArtifact,
//     evmInterface,
//     jeb,
//     firmwareAnalysis,
//   );
//   registerAdbTools(
//     server,
//     new AdbDeviceAnalysisService(adbDevice),
//     toolLogger,
//     recordEvidence,
//     analysisAdmission,
//   );
//   registerPcapTools(
//     server,
//     new PcapAnalysisService(pcap),
//     toolLogger,
//     recordEvidence,
//     analysisAdmission,
//     evidenceById,
//   );
//   registerFlutterTools(
//     server,
//     new FlutterBuildAnalysisService(flutter),
//     toolLogger,
//     recordEvidence,
//     analysisAdmission,
//     evidenceById,
//   );
//   registerApktoolTools(
//     server,
//     new ApktoolResourceAnalysisService(apktool),
//     toolLogger,
//     recordEvidence,
//     analysisAdmission,
//   );
//   registerObservationTools(toolContext);
//   registerGuidedPrompts(server, analysis, session);
//   if (session !== undefined) {
//     registerSessionTools(server, session, toolLogger, {
//       ...selectedOptions,
//       artifactResources,
//       ...(availability === undefined
//         ? {}
//         : { availabilityPolicy: availability.policy }),
//       androidAnalysisAvailability: (signal) =>
//         android.inspectAvailability(signal),
//       adbAnalysisAvailability: (signal) =>
//         adbDevice.inspectAvailability(signal),
//       apktoolAnalysisAvailability: (signal) =>
//         apktool.inspectAvailability(signal),
//       jebAnalysisAvailability: (signal) => jeb.inspectAvailability(signal),
//       startedAt,
//     });
//   }
//   return server;
// };
//
// const selectToolResultDelivery = (
//   environment: Readonly<NodeJS.ProcessEnv>,
//   selected: ToolResultDelivery | undefined,
// ): ToolResultDelivery => {
//   if (selected !== undefined) return selected;
//   const configured = parseMcpResponseBudget(
//     environment.REA_MCP_MAX_RESPONSE_BYTES,
//   );
//   if (!configured.ok) throw configured.error;
//   return createToolResultDelivery(configured.value);
// };
//
// const outputSchemasOmitted = (
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): boolean => {
//   const configured = parseMcpOutputSchemaProfile(
//     environment.REA_MCP_OUTPUT_SCHEMA_PROFILE,
//   );
//   if (!configured.ok) throw configured.error;
//   return configured.value === "off";
// };
//
// const selectCompactInputSchemaPresentation = (
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): CompactInputSchemaPresentation | undefined => {
//   const configured = parseMcpInputSchemaProfile(
//     environment.REA_MCP_INPUT_SCHEMA_PROFILE,
//   );
//   if (!configured.ok) throw configured.error;
//   return compactPresentationForMcpInputSchemaProfile(configured.value);
// };
//
// const registerConfiguredAnalysisTools = (
//   {
//     server,
//     options,
//     environment,
//     logger: toolLogger,
//     evidenceById,
//     recordEvidence,
//     withAdmittedAnalysis,
//     goBinary,
//     peResources,
//     webNetworkCapture,
//   }: ServerToolContext,
//   android: AndroidAnalysisPort,
//   wasmArtifact: Pick<WasmArtifactService, "inspect" | "close">,
//   evmInterface: EvmInterfaceService,
//   jeb: JebAnalysisPort,
//   firmwareAnalysis: FirmwareAnalysisService,
// ): void => {
//   registerAndroidTools(
//     server,
//     new AndroidAnalysisService(android),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//     evidenceById,
//   );
//   registerJebTools(
//     server,
//     new JebAnalysisService(jeb),
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerBinaryDiagnosticsTools(
//     server,
//     options.binaryLayout ?? createBinaryLayoutService(environment),
//     toolLogger,
//     recordEvidence,
//     evidenceById,
//     withAdmittedAnalysis,
//   );
//   registerAnalysisViewTool(
//     server,
//     toolLogger,
//     evidenceById,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerPeResourcesTool(
//     server,
//     peResources,
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerGoTools(
//     server,
//     goBinary,
//     toolLogger,
//     recordEvidence,
//     withAdmittedAnalysis,
//   );
//   registerRustTools(
//     server,
export const _l = 229;
