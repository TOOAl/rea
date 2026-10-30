export const __stub = 1;
//       ) {
//         // The bridge owns address-space resolution. Enrich its parsed identity;
//         // request parameters retain the caller's spelling.
//         const address = normalized.address;
//         if (typeof address === "string") {
//           if (target.format === "pe" && nativeAotOwner !== undefined) {
//             const started = await client.start(
//               options?.signal,
//               options?.progress,
//             );
//             if (!started.ok)
//               return err(
//                 projectSessionError(
//                   operation,
//                   started.error,
//                   config.ghidraStartupTimeoutMs,
//                   lostProviderHealth(),
//                 ),
//               );
//             const derived = await nativeAotOwner.derive(
//               started.value.target.image_base,
//               operation,
//               options?.signal,
//               normalized,
//             );
//             if (!derived.ok) return derived;
//           }
//           const metadata = nativeAotOwner?.readTypeDetail(address);
//           if (metadata !== undefined)
//             normalized = jsonValueSchema.parse({
//               ...normalized,
//               metadata_recovery: metadata,
//             });
//         }
//       }
//       if (operation === "inspect_native_load_image") {
//         let derived: NativeAotPeResult | undefined;
//         if (target.format === "pe") {
//           const observations =
//             nativeLoadImageObservationSchema.parse(normalized);
//           if (nativeAotOwner === undefined)
//             return err(
//               new ProviderAdapterError("ghidra", operation, {
//                 diagnostics: {
//                   reason:
//                     "The admitted PE session has no read-only NativeAOT snapshot owner.",
//                 },
//               }),
//             );
//           const result = await nativeAotOwner.derive(
//             observations.image_base,
//             operation,
//             options?.signal,
//             normalized,
//           );
//           if (!result.ok) return result;
//           derived = result.value;
//         }
//         const attested = await attestGhidraNativeLoadImage({
//           target,
//           operation,
//           measured: normalized,
//           client,
//           mapSessionError: (failure) =>
//             projectSessionError(
//               operation,
//               failure,
//               config.ghidraStartupTimeoutMs,
//               lostProviderHealth(),
//             ),
//           nativeAotResult: derived,
//           signal: options?.signal,
//         });
//         if (!attested.ok) return attested;
//         normalized = attested.value;
//       }
//       return ok(
//         projectExecution(
//           operation,
//           normalized,
//           called.value,
//           observationLimitations,
//           observationLocations,
//           relationshipCoverage,
//         ),
//       );
//     },
//     executeIfReady: async (operation, parameters, options) => {
//       if (operation !== "list_documents" && operation !== "list_procedures")
//         return undefined;
//       if (extensionFailure !== undefined) return err(extensionFailure);
//       const input = parseGhidraInventoryInput(operation, parameters);
//       if (!input.ok) return input;
//       if (client.callToolIfReady === undefined) return undefined;
//       const called = await client.callToolIfReady(
//         operation,
//         input.value,
//         options?.signal === undefined ? {} : { signal: options.signal },
//       );
//       if (called === undefined) return undefined;
//       return inventoryExecution(operation, called);
//     },
//     operationHealthSnapshot: () => client.operationHealthSnapshot?.(),
//     runtimeLineageSnapshots: () => {
//       const observation = client.runtimeLineage?.() ?? null;
//       return observation === null
//         ? []
//         : [{ provider: committedProfile.provider, observation }];
//     },
//     close: async () => {
//       nativeAotOwner?.close();
//       return client.close();
//     },
//   };
// };
//
// interface GhidraClientCoordinates {
//   readonly analyzeHeadlessPath: string;
//   readonly javaHome: string;
//   readonly providerVersion: string;
//   readonly profile: AnalysisProfileCommitment;
// }
//
// const ghidraClientPrerequisites = (
//   target: BinaryTarget,
//   profile: AnalysisProfileCommitment | undefined,
//   installation: GhidraInstallationInspection,
// ): Result<GhidraClientCoordinates, AnalysisError> => {
//   if (target.kind !== "executable")
//     return err(
//       new AnalysisCapabilityUnavailableError(
//         "ghidra",
//         "health",
//         `Ghidra cannot import ${target.kind} targets through this adapter.`,
//       ),
//     );
//   if (installation.status === "unavailable")
//     return err(
//       new ProviderAdapterError("ghidra", "health", {
//         diagnostics: ghidraInstallationDiagnostics(installation),
//       }),
//     );
//   const readiness =
//     installation.platform === "win32"
//       ? inspectWindowsNativeReadiness(installation.platform)
//       : undefined;
//   if (readiness?.available === false)
//     return err(
//       new AnalysisCapabilityUnavailableError(
//         "ghidra",
//         "health",
//         readiness.reason,
//       ),
//     );
//   if (profile === undefined || profile.provider.id !== "ghidra")
//     return err(new ProviderAdapterError("ghidra", "health"));
//   return ok({
//     analyzeHeadlessPath: installation.analyzeHeadlessPath,
//     javaHome: installation.javaHome,
//     providerVersion: installation.providerVersion,
//     profile,
//   });
// };
//
// const unavailableClient = (failure: AnalysisError): AnalysisClient => ({
//   execute: () => Promise.resolve(err(failure)),
//   close: () => Promise.resolve(ok(null)),
// });
//
// const projectSessionError = (
//   operation: AnalysisOperation,
//   failure: GhidraSessionError,
//   startupTimeoutMs: number,
//   health?: ProviderOperationHealth,
// ): AnalysisError => {
//   const primary = projectPrimarySessionError(
//     operation,
//     failure,
//     startupTimeoutMs,
//     health,
//   );
//   return failure.cleanupFailure === undefined
//     ? primary
//     : analysisErrorWithCleanupFailure(
//         primary,
//         failure.cleanupFailure,
//         operation,
//       );
// };
//
// const projectPrimarySessionError = (
//   operation: AnalysisOperation,
//   failure: GhidraSessionError,
//   startupTimeoutMs: number,
//   health?: ProviderOperationHealth,
// ): AnalysisError => {
//   const context = { cause: failure, diagnostics: failure.diagnostics };
//   if (failure.cause instanceof AnalysisAccessDeniedError)
//     return new AnalysisAccessDeniedError(
//       operation,
//       failure.cause.path,
//       failure.cause.systemCode,
//       context,
//     );
//   if (failure.cause instanceof AnalysisArtifactChangedError)
//     return new AnalysisArtifactChangedError(
//       operation,
//       failure.cause.path,
//       failure.cause.reason,
//       context,
//     );
//   if (
//     operation === "annotate_native_function" &&
//     failure.kind === "remote" &&
//     failure.remoteCode === "invalid_function_name"
//   )
//     return new AnalysisInputError(operation, context, [
//       { path: ["name"], reason: "invalid_value", message: failure.message },
//     ]);
//   if (
//     failure.kind === "cancelled" ||
//     (failure.kind === "remote" && failure.remoteCode === "decompile_cancelled")
//   )
//     return new AnalysisCancelledError(operation, context);
//   if (failure.kind === "timeout" || failure.kind === "analysis_timeout")
//     return new AnalysisTimeoutError(
//       operation,
//       failure.timeoutMs ?? startupTimeoutMs,
//       context,
//     );
//   if (
//     failure.kind === "remote" &&
//     failure.remoteCode === "regex_stack_exhausted"
//   )
//     return new AnalysisResourceConstraintError(
//       operation,
//       "memory",
//       failure.message,
//       null,
//       {
//         ...context,
//         remediationAction:
//           "Retry this search in literal mode or simplify the regex. The active analysis session and annotations remain available.",
//       },
//     );
//   if (
//     failure.kind === "remote" &&
//     ["invalid_request", "not_found", "ambiguous"].includes(
//       failure.remoteCode ?? "",
//     )
//   )
//     return new AnalysisInputError(operation, context, [
//       { path: [], reason: "invalid_value", message: failure.message },
//     ]);
//   if (failure.kind === "remote" && failure.remoteCode === "method_unavailable")
//     return new AnalysisCapabilityUnavailableError(
//       "ghidra",
//       operation,
//       failure.message,
//       context,
//     );
//   const exited = exitedProviderMessage(operation, failure, health);
//   if (exited !== undefined)
//     return new ProviderAdapterError("ghidra", operation, {
//       ...context,
//       userMessage: exited,
//     });
//   return new ProviderAdapterError("ghidra", operation, context);
// };
//
// /** A provider already observed as running can be restarted by reopening. */
// const exitedProviderMessage = (
//   operation: AnalysisOperation,
//   failure: GhidraSessionError,
//   health: ProviderOperationHealth | undefined,
// ): string | undefined => {
//   if (failure.kind !== "process" && failure.kind !== "protocol")
//     return undefined;
//   if (
//     health === undefined ||
//     providerRetryAction(health.state) !== "restart_provider"
//   )
//     return undefined;
//   const observed =
//     health.state === "exited"
//       ? `exited${health.exitCode === null ? "" : ` with code ${String(health.exitCode)}`}`
//       : "became unreachable";
//   return `The Ghidra provider for this session ${observed} before ${operation} could complete. Call open_binary for the same target to start a new Ghidra session, then retry; session-only annotations from the previous provider are not retained.`;
// };
export const _l = 289;
