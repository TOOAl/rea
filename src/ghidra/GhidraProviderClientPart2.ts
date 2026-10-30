export const __stub = 1;
//                 observations,
//               );
//             if (controller.signal.aborted)
//               return err(new AnalysisCancelledError(operation));
//             const parsed =
//               snapshot.value.kind === "over-capacity"
//                 ? {
//                     summary: nativeAotSnapshotOverCapacity(
//                       target.sha256,
//                       snapshot.value.sourceBytesAtLeast,
//                       NATIVE_AOT_MAX_REPORT_BYTES,
//                     ),
//                     readTypeDetail: () => undefined,
//                   }
//                 : parseNativeAotPe(
//                     snapshot.value.bytes,
//                     target.sha256,
//                     NATIVE_AOT_MAX_REPORT_BYTES,
//                     imageBase,
//                   );
//             if (closed) return err(new AnalysisCancelledError(operation));
//             if (identityConflict)
//               return identityConflictFailure(
//                 operation,
//                 imageBase,
//                 observations,
//               );
//             if (controller.signal.aborted)
//               return err(new AnalysisCancelledError(operation));
//             return ok(parsed);
//           } catch (cause: unknown) {
//             return err(
//               new ProviderAdapterError("ghidra", operation, {
//                 diagnostics: {
//                   reason:
//                     cause instanceof Error
//                       ? cause.message
//                       : "NativeAOT metadata could not be derived from the captured target snapshot.",
//                 },
//                 cause,
//               }),
//             );
//           }
//         })();
//       const current = { identity: key, promise };
//       pending = current;
//       void promise.then((settled) => {
//         if (pending !== current) return;
//         pending = undefined;
//         if (settled.ok && !closed && !identityConflict) result = settled.value;
//       });
//     }
//     const settled = await waitForAbortable(pending.promise, callerSignal);
//     if (closed) return err(new AnalysisCancelledError(operation));
//     if (identityConflict)
//       return identityConflictFailure(operation, imageBase, observations);
//     if (controller.signal.aborted)
//       return err(new AnalysisCancelledError(operation));
//     return settled === ABORTED
//       ? err(new AnalysisCancelledError(operation))
//       : settled;
//   };
//   return {
//     derive,
//     readTypeDetail: (address) =>
//       result?.readTypeDetail(address, NATIVE_AOT_MAX_REPORT_BYTES),
//     close: () => {
//       closed = true;
//       controller.abort();
//       result = undefined;
//       pending = undefined;
//     },
//   };
// };
//
// /** Build one AnalysisClient for an admitted Ghidra target and profile. */
// export const createGhidraProviderClient = (input: {
//   readonly config: AppConfig;
//   readonly environment: Readonly<NodeJS.ProcessEnv>;
//   readonly logger: Logger;
//   readonly clientFactory: GhidraProviderClientFactory;
//   readonly target: BinaryTarget;
//   readonly profile?: AnalysisProfileCommitment;
//   readonly context?: AnalysisClientContext;
//   readonly installation: GhidraInstallationInspection;
// }): AnalysisClient => {
//   const { config, logger, clientFactory, target, context, installation } =
//     input;
//   const prerequisites = ghidraClientPrerequisites(
//     target,
//     input.profile,
//     installation,
//   );
//   if (!prerequisites.ok) return unavailableClient(prerequisites.error);
//   const committedProfile = prerequisites.value.profile;
//   const psp = isGhidraPspTarget(target);
//   const pspExtension = psp
//     ? ghidraPspExtensionSchema.safeParse(
//         committedProfile.parameters.psp_extension,
//       )
//     : null;
//   if (
//     pspExtension !== null &&
//     (!pspExtension.success ||
//       committedProfile.parameters.language_id !== "Allegrex:LE:32:default" ||
//       committedProfile.parameters.loader !== "PspElfLoader")
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "Resolve the supported PSP profile and installed Allegrex extension before opening the session.",
//         },
//       }),
//     );
//   const softFloat = isGhidraMipsSoftFloatTarget(target);
//   if (
//     softFloat !==
//     (committedProfile.parameters.mips_soft_float_storage ===
//       GHIDRA_MIPS_SOFT_FLOAT_STORAGE)
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "Resolve the soft-float MIPS storage policy into the analysis profile before opening the session.",
//         },
//       }),
//     );
//   const extensionProfile = ghidraExtensionSchema
//     .array()
//     .safeParse(committedProfile.parameters.analysis_extensions ?? []);
//   if (
//     !extensionProfile.success ||
//     (config.ghidraNativeAotJar !== undefined &&
//       extensionProfile.data.length === 0)
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "Resolve the configured Ghidra extensions into an analysis profile before opening the session.",
//         },
//       }),
//     );
//   const extensions = extensionProfile.data;
//   const seedProfile = ghidraSeedCommitmentSchema
//     .optional()
//     .safeParse(committedProfile.parameters.analysis_seeds);
//   if (
//     !seedProfile.success ||
//     (config.ghidraSeedFile === undefined) !== (seedProfile.data === undefined)
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "Resolve REA_GHIDRA_SEED_FILE into an analysis profile before opening the session.",
//         },
//       }),
//     );
//   const seeds = seedProfile.data;
//   const parameterLanguage = ghidraProfileLanguageOverride(
//     committedProfile.parameters,
//   );
//   const pinnedLanguage = ghidraPinnedMipsLanguage(committedProfile.parameters);
//   const targetLanguage = ghidraPinnedLanguage(target);
//   if (pinnedLanguage !== undefined && targetLanguage === undefined)
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "The committed profile pins a MIPS language that the current target does not establish; reopen an admitted target to resolve a new profile.",
//         },
//       }),
//     );
//   // Provider-pinned profiles declare their language through the same
//   // parameter slot caller-configured profiles use, so only an environment
//   // override conflicts with the legacy pin; the slot itself carries it.
//   if (
//     pinnedLanguage !== undefined &&
//     config.ghidraLanguageOverride !== undefined
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "The committed legacy MIPS profile pins its import language; REA_GHIDRA_LANGUAGE_ID/REA_GHIDRA_COMPILER_SPEC_ID cannot be combined with it. Reopen the target without the override.",
//         },
//       }),
//     );
//   if (
//     !sameGhidraLanguageOverride(
//       parameterLanguage,
//       config.ghidraLanguageOverride ?? targetLanguage,
//     )
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "The committed analysis profile and REA_GHIDRA_LANGUAGE_ID/REA_GHIDRA_COMPILER_SPEC_ID differ; reopen the target to resolve a new profile.",
//         },
//       }),
//     );
//   // Both caller-selected and provider-pinned languages use the validated
//   // committed slot; the profile cannot supply its own applicability proof.
//   const importLanguage = parameterLanguage;
//   const disabledAnalyzers = ghidraProfileDisabledAnalyzers(
//     committedProfile.parameters,
//   );
//   if (
//     !sameGhidraDisabledAnalyzers(
//       disabledAnalyzers,
//       config.ghidraDisabledAnalyzers,
//     )
//   )
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: {
//           reason:
//             "The committed analysis profile and REA_GHIDRA_DISABLED_ANALYZERS differ; reopen the target to resolve a new profile.",
//         },
//       }),
//     );
//
//   const invalidProfile = validateGhidraExtensionProfile(
//     extensions,
//     config,
//     target,
//     installation.platform,
//   );
//   if (invalidProfile !== null)
//     return unavailableClient(
//       new ProviderAdapterError("ghidra", "open_binary", {
//         diagnostics: { reason: invalidProfile },
//       }),
//     );
//   let extensionFailure: AnalysisError | undefined;
//   // Replaced by the reported outcome once the session handshake is checked.
//   const seedLimitations: string[] = [...ghidraSeedLimitations(seeds)];
//   const pdbLimitations: string[] = [];
//   // Replaced by the reported storage outcome once the handshake is checked.
//   const softFloatLimitations: string[] = [
//     ...ghidraMipsSoftFloatLimitations(softFloat),
//   ];
//   const rawLanguage =
//     target.format === "raw-binary"
//       ? ghidraRawBinaryLanguage(target.architecture)
//       : undefined;
//   const targetLimitations = [
//     ...(target.format === "dos-mz"
//       ? [
//           "DOS MZ uses 16-bit x86 real mode with the Ghidra load segment 0x1000. Returned addresses are linear byte coordinates; they do not identify a unique segment:offset alias.",
//           "Static DOS analysis does not emulate BIOS, DOS interrupts, device ports, or self-modifying unpacking code. Packed targets require a separately identified unpacked artifact for original-program analysis; appended overlays are not the initialized load module.",
//         ]
//       : []),
//     ...(target.format === "raw-binary"
//       ? [
//           "Headerless raw-binary analysis uses the caller-supplied architecture and entry address; file offset 0 is mapped at that address. Headers are not discovered from file bytes.",
//           "Little-endian generic Ghidra languages are used for x86, x86_64, arm, arm64, and NMOS 6502. Big-endian, Thumb-only, Cortex-M, 65C02, 65816, and other processor variants are unsupported in this increment.",
//           "Static analysis does not emulate reset vectors, memory-mapped I/O, or firmware boot sequences.",
//         ]
//       : []),
//     ...(target.kind === "executable" && target.architecture === "mips"
//       ? (target.mips.limitations ?? [])
//       : []),
//     ...(committedProfile.parameters.mips_abi_basis ===
//     "inferred-o32-assumption-v1"
//       ? [
//           "The ELF header declares no ABI field and no ABI flags record was observed; o32 calling conventions are an analysis assumption of this lane, not a declared fact.",
//           "Floating-point ABI semantics are unverified for this recordless legacy admission.",
//         ]
//       : []),
//     ...ghidraMipsRelocatableLimitations(target),
//     ...ghidraMipsSharedLimitations(target),
//     ...ghidraRiscvLimitations(target),
//   ];
//   const providerLimitations =
//     installation.platform === "win32"
//       ? windowsP0Limitations
//       : installation.platform === "darwin"
//         ? [
//             "macOS sessions require a matching executable Ghidra native decompiler; REA checks for it but does not build native components or change Gatekeeper quarantine state.",
//           ]
//         : [];
//   const client = clientFactory({
//     startupTimeoutMs: config.ghidraStartupTimeoutMs,
//     platform: installation.platform,
//     launcher: new GhidraHeadlessLauncher({
export const _l = 290;
