export const __stub = 1;
//       environment: input.environment,
//       analyzeHeadlessPath: prerequisites.value.analyzeHeadlessPath,
//       javaHome: prerequisites.value.javaHome,
//       ...(installation.javaVmName === undefined
//         ? {}
//         : { javaVmName: installation.javaVmName }),
//       bridgeScriptPath: fileURLToPath(
//         new URL(
//           `../../bridge/ghidra/${GHIDRA_BRIDGE_SOURCES.bridge}`,
//           import.meta.url,
//         ),
//       ),
//       ...(pspExtension?.success === true
//         ? { pspExtension: pspExtension.data }
//         : {}),
//       ...(softFloat ? { mipsSoftFloat: true as const } : {}),
//       ...(target.format === "dos-mz" ? { dosMz: true } : {}),
//       ...(target.format === "dos-com" ? { dosCom: true } : {}),
//       ...(rawLanguage === undefined || target.format !== "raw-binary"
//         ? {}
//         : {
//             rawBinary: {
//               languageId: rawLanguage.languageId,
//               compilerSpecId: rawLanguage.compilerSpecId,
//               baseAddr: target.entryPoint,
//             },
//           }),
//       ...(importLanguage === undefined
//         ? {}
//         : { languageOverride: importLanguage }),
//       ...(config.ghidraDisabledAnalyzers === undefined
//         ? {}
//         : { disabledAnalyzers: config.ghidraDisabledAnalyzers }),
//       ...(seeds === undefined ? {} : { analysisSeeds: seeds }),
//       platform: installation.platform,
//       ...(extensions.length === 0 ? {} : { analysisExtensions: extensions }),
//     }),
//     targetPath:
//       installation.platform === "win32"
//         ? (target.sourcePath ?? target.path)
//         : target.path,
//     targetSha256: target.sha256,
//     transport:
//       installation.platform === "win32"
//         ? "authenticated-loopback-tcp"
//         : "unix-socket",
//     providerVersion: prerequisites.value.providerVersion,
//     profileDigest: committedProfile.digest,
//     ...(["dos-mz", "dos-com"].includes(target.format)
//       ? {
//           expectedLanguageId: "x86:LE:16:Real Mode",
//           expectedCompilerSpecId: "default",
//         }
//       : rawLanguage === undefined
//         ? importLanguage === undefined
//           ? {}
//           : {
//               expectedLanguageId: importLanguage.languageId,
//               ...(importLanguage.compilerSpecId === undefined
//                 ? {}
//                 : { expectedCompilerSpecId: importLanguage.compilerSpecId }),
//             }
//         : {
//             expectedLanguageId: rawLanguage.languageId,
//             expectedCompilerSpecId: rawLanguage.compilerSpecId,
//           }),
//     ...(psp
//       ? {
//           expectedLanguageId: "Allegrex:LE:32:default",
//           expectedCompilerSpecId: "default",
//         }
//       : {}),
//     ...(context === undefined ? {} : { runId: context.runId }),
//     logger: logger.child({ layer: "ghidra-bridge" }),
//   });
//   // Startup failures retain installation guidance; only a previously running
//   // provider can be described as lost and reopened.
//   let providerStarted = false;
//   const lostProviderHealth = (): ProviderOperationHealth | undefined =>
//     providerStarted ? client.operationHealthSnapshot?.() : undefined;
//   const checkSessionObservations = async (
//     operation: AnalysisOperation,
//     info: GhidraSessionInfo,
//   ): Promise<AnalysisError | undefined> => {
//     if (target.format === "pe") {
//       pdbLimitations.splice(
//         0,
//         pdbLimitations.length,
//         ...ghidraPePdbLimitations(target, info.pdb),
//       );
//     }
//     const softFloatReason = ghidraMipsSoftFloatFailure(
//       softFloat,
//       info.mips_soft_float_storage,
//     );
//     extensionFailure =
//       ghidraExtensionFailure(
//         extensions,
//         info.analysis_extensions ?? [],
//         operation,
//       ) ??
//       ghidraSeedFailure(seeds, info.analysis_seeds, operation) ??
//       (softFloatReason === undefined
//         ? undefined
//         : new ProviderAdapterError("ghidra", operation, {
//             diagnostics: { reason: softFloatReason },
//           }));
//     if (extensionFailure === undefined && info.analysis_seeds !== undefined)
//       seedLimitations.splice(
//         0,
//         seedLimitations.length,
//         ...ghidraSeedLimitations(seeds, info.analysis_seeds),
//       );
//     if (extensionFailure === undefined)
//       softFloatLimitations.splice(
//         0,
//         softFloatLimitations.length,
//         ...ghidraMipsSoftFloatLimitations(
//           softFloat,
//           info.mips_soft_float_storage,
//         ),
//       );
//     if (extensionFailure === undefined) return undefined;
//     const closed = await client.close();
//     return closed.ok
//       ? extensionFailure
//       : analysisErrorWithCleanupFailure(
//           extensionFailure,
//           closed.error,
//           operation,
//         );
//   };
//   const releaseLimitation = unverifiedGhidraBuildLimitation(
//     prerequisites.value.providerVersion,
//   );
//   const sessionLimitations = (): readonly string[] => [
//     ...providerLimitations,
//     ...targetLimitations,
//     ...(psp ? GHIDRA_PSP_LIMITATIONS : []),
//     ...softFloatLimitations,
//     ...ghidraExtensionLimitations(extensions),
//     ...seedLimitations,
//     ...pdbLimitations,
//     ...(releaseLimitation === undefined ? [] : [releaseLimitation]),
//   ];
//   const nativeAotOwner =
//     target.format === "pe"
//       ? createNativeAotSnapshotOwner({
//           client,
//           target,
//           startupTimeoutMs: config.ghidraStartupTimeoutMs,
//         })
//       : undefined;
//   const projectExecution = (
//     operation: AnalysisOperation,
//     normalized: JsonValue,
//     rawResult: JsonValue,
//     observationLimitations: readonly string[] = [],
//     locations: readonly EvidenceLocation[] = [],
//     relationshipCoverage?: RelationshipCoverage,
//   ) => {
//     return createAnalysisExecution(normalized, committedProfile.provider, {
//       rawResult,
//       locations,
//       analysisProfile: committedProfile,
//       ...(relationshipCoverage === undefined ? {} : { relationshipCoverage }),
//       limitations: [
//         ...limitationsFor(operation),
//         ...observationLimitations,
//         ...sessionLimitations(),
//       ],
//     });
//   };
//   const inventoryExecution = (
//     operation: "list_documents" | "list_procedures",
//     called: Result<JsonValue, GhidraSessionError>,
//   ) => {
//     if (!called.ok)
//       return err(
//         projectSessionError(
//           operation,
//           called.error,
//           config.ghidraStartupTimeoutMs,
//           lostProviderHealth(),
//         ),
//       );
//     const parsed = parseGhidraInventoryResult(operation, called.value);
//     if (!parsed.ok) return parsed;
//     return ok(projectExecution(operation, parsed.value, called.value));
//   };
//   return {
//     execute: async (operation, parameters, options) => {
//       if (extensionFailure !== undefined) return err(extensionFailure);
//       if (
//         operation !== "health" &&
//         !isGhidraInventoryOperation(operation) &&
//         !isGhidraFunctionOperation(operation)
//       )
//         return err(
//           new AnalysisCapabilityUnavailableError(
//             GHIDRA_PROVIDER_IDENTITY.id,
//             operation,
//             "The Ghidra adapter does not declare this operation.",
//           ),
//         );
//       if (operation === "health") {
//         const started = await client.start(options?.signal, options?.progress);
//         if (started.ok) providerStarted = true;
//         if (!started.ok)
//           return err(
//             projectSessionError(
//               operation,
//               started.error,
//               config.ghidraStartupTimeoutMs,
//               lostProviderHealth(),
//             ),
//           );
//         const failed = await checkSessionObservations(operation, started.value);
//         if (failed !== undefined) return err(failed);
//         return ok(
//           createAnalysisExecution(started.value, committedProfile.provider, {
//             analysisProfile: committedProfile,
//             limitations: [...healthLimitations, ...sessionLimitations()],
//           }),
//         );
//       }
//       const input = isGhidraFunctionOperation(operation)
//         ? parseGhidraFunctionInput(operation, parameters)
//         : parseGhidraInventoryInput(operation, parameters);
//       if (!input.ok) return input;
//       if (
//         target.format === "pe" ||
//         extensions.length > 0 ||
//         seeds !== undefined ||
//         softFloat
//       ) {
//         const started = await client.start(options?.signal, options?.progress);
//         if (started.ok) providerStarted = true;
//         if (!started.ok)
//           return err(
//             projectSessionError(
//               operation,
//               started.error,
//               config.ghidraStartupTimeoutMs,
//               lostProviderHealth(),
//             ),
//           );
//         const failed = await checkSessionObservations(operation, started.value);
//         if (failed !== undefined) return err(failed);
//       }
//       const called = await client.callTool(operation, input.value, {
//         ...(options?.signal === undefined ? {} : { signal: options.signal }),
//         ...(options?.progress === undefined
//           ? {}
//           : { progress: options.progress }),
//       });
//       if (called.ok) providerStarted = true;
//       if (operation === "list_documents" || operation === "list_procedures")
//         return inventoryExecution(operation, called);
//       if (!called.ok)
//         return err(
//           projectSessionError(
//             operation,
//             called.error,
//             config.ghidraStartupTimeoutMs,
//             lostProviderHealth(),
//           ),
//         );
//       let normalized: JsonValue;
//       let observationLimitations: readonly string[] = [];
//       let observationLocations: readonly EvidenceLocation[] = [];
//       let relationshipCoverage: RelationshipCoverage | undefined;
//       if (isGhidraFunctionOperation(operation)) {
//         const result = parseGhidraFunctionResult(operation, called.value);
//         if (!result.ok) return result;
//         normalized = result.value.value;
//         observationLimitations = result.value.limitations;
//         observationLocations = result.value.locations ?? [];
//         relationshipCoverage = result.value.relationshipCoverage;
//       } else {
//         const result = parseGhidraInventoryResult(operation, called.value);
//         if (!result.ok) return result;
//         normalized = result.value;
//       }
//       if (
//         operation === "inspect_native_data_type" &&
//         normalized !== null &&
//         typeof normalized === "object" &&
//         !Array.isArray(normalized) &&
//         normalized.metadata_recovery === undefined
export const _l = 290;
