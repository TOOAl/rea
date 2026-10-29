export const __stub = 1;
//         );
//       }
//       return err(primary);
//     }
//   }
// }
//
// const ownedGhidraLaunch = (
//   spawned: SpawnedOwnedProviderProcess,
//   paths: ReturnType<typeof ghidraRuntimePaths>,
//   platform: NodeJS.Platform,
//   launchSupport: readonly GhidraLaunchSupportDiagnostic[],
// ): GhidraLaunch => ({
//   ...ownedGhidraProcess(spawned, platform),
//   projectRoot: paths.projectRoot,
//   ghidraLogPath: paths.ghidraLogPath,
//   scriptLogPath: paths.scriptLogPath,
//   ...(launchSupport.length === 0 ? {} : { launchSupport: [...launchSupport] }),
// });
//
// const ownedGhidraProcess = (
//   spawned: SpawnedOwnedProviderProcess,
//   platform: NodeJS.Platform,
// ): Pick<
//   Extract<ProviderProcessLaunch, { readonly ownsProcessLifetime: true }>,
//   "process" | "ownsProcessLifetime" | "ownership" | "cleanup"
// > => ({
//   process: spawned.process,
//   ownsProcessLifetime: true,
//   ownership: spawned.ownership,
//   cleanup: () => cleanupStartedProcess(spawned, platform),
// });
//
// /** Exact executable and argv passed to shell-free process creation. */
// export interface GhidraHeadlessCommand {
//   readonly command: string;
//   readonly arguments: readonly string[];
// }
//
// /** Build a direct POSIX launch or a conservatively quoted Windows batch call. */
// export const ghidraHeadlessCommand = (options: {
//   readonly environment: Readonly<NodeJS.ProcessEnv>;
//   readonly platform: NodeJS.Platform;
//   readonly analyzeHeadlessPath: string;
//   readonly arguments: readonly string[];
//   readonly comSpec?: string;
// }): GhidraHeadlessCommand => {
//   if (options.platform !== "win32")
//     return {
//       command: options.analyzeHeadlessPath,
//       arguments: [...options.arguments],
//     };
//   const command = ghidraBatchStep(() =>
//     windowsBatchCommand({
//       environment: options.environment,
//       batchPath: options.analyzeHeadlessPath,
//       arguments: options.arguments,
//       ...(options.comSpec === undefined ? {} : { comSpec: options.comSpec }),
//     }),
//   );
//   if ((command.arguments.at(-1)?.length ?? 0) > 30_000)
//     throw new GhidraLaunchError(
//       "Windows Ghidra command exceeds the P0 length limit",
//     );
//   return command;
// };
//
// /** Keep Ghidra's launch error type and P0 wording for shared batch checks. */
// const ghidraBatchStep = <T>(step: () => T): T => {
//   try {
//     return step();
//   } catch (cause: unknown) {
//     if (!(cause instanceof WindowsBatchCommandError)) throw cause;
//     throw new GhidraLaunchError(
//       cause.reason === "metacharacter"
//         ? "Windows Ghidra P0 paths cannot contain command-interpreter metacharacters"
//         : cause.message,
//       { cause },
//     );
//   }
// };
//
// const cleanupStartedProcess = (
//   started: SpawnedOwnedProviderProcess,
//   platform: NodeJS.Platform,
// ): Promise<ProcessCleanupResult> =>
//   started.cleanup !== undefined
//     ? started.cleanup()
//     : platform === "win32"
//       ? cleanupWindowsProcessTree(started.ownership.leaderPid)
//       : cleanupOwnedProcessGroup(started.ownership);
//
// /** Paths encoded into one bounded analyzeHeadless invocation. */
// export interface GhidraHeadlessArgumentOptions {
//   readonly platform?: NodeJS.Platform;
//   readonly projectRoot: string;
//   readonly targetPath: string;
//   readonly bridgeScriptPath: string;
//   readonly descriptorPath: string;
//   readonly ghidraLogPath: string;
//   readonly scriptLogPath: string;
//   readonly psp?: true;
//   readonly mipsSoftFloat?: true;
//   readonly dosMz?: true;
//   readonly dosCom?: true;
//   readonly rawBinary?: {
//     readonly languageId: string;
//     readonly compilerSpecId: string;
//     readonly baseAddr: string;
//   };
//   readonly languageOverride?: GhidraLanguageOverride;
//   /** Auto-analyzers disabled by the pre-analysis options script. */
//   readonly disabledAnalyzers?: readonly string[];
//   /** Canonical seed snapshot passed to the pre-analysis seed script. */
//   readonly seedPath?: string;
// }
//
// /** Build the complete read-only headless invocation in deterministic order. */
// export const ghidraHeadlessArguments = (
//   options: GhidraHeadlessArgumentOptions,
// ): readonly string[] => {
//   // Bridge script paths use the target platform's syntax, which differs from
//   // the host when building a cross-platform invocation.
//   const scriptPath =
//     (options.platform ?? process.platform) === "win32" ? win32 : posix;
//   const bridgeDirectory = scriptPath.dirname(options.bridgeScriptPath);
//   const override = options.languageOverride;
//   const rawBinary = options.rawBinary;
//   if (
//     options.psp === true &&
//     (options.dosMz === true ||
//       options.dosCom === true ||
//       override !== undefined)
//   )
//     throw new Error(
//       "A PSP ELF import cannot be combined with DOS or a generic Ghidra language override.",
//     );
//   if (options.psp === true && rawBinary !== undefined)
//     throw new Error(
//       "A PSP ELF import cannot be combined with a raw-binary import.",
//     );
//   if (
//     options.mipsSoftFloat === true &&
//     (options.psp === true ||
//       options.dosMz === true ||
//       options.dosCom === true ||
//       rawBinary !== undefined)
//   )
//     throw new Error(
//       "MIPS soft-float storage applies only to a generic MIPS ELF import.",
//     );
//   if (
//     override !== undefined &&
//     (options.dosMz === true || options.dosCom === true)
//   )
//     throw new Error(
//       "A Ghidra language override cannot be combined with a DOS import.",
//     );
//   if (override !== undefined && rawBinary !== undefined)
//     throw new Error(
//       "A Ghidra language override cannot be combined with a raw-binary import.",
//     );
//   if (
//     rawBinary !== undefined &&
//     (options.dosMz === true || options.dosCom === true)
//   )
//     throw new Error(
//       "A raw-binary import cannot be combined with a DOS import.",
//     );
//   return [
//     options.projectRoot,
//     "rea-project",
//     "-import",
//     options.targetPath,
//     ...(options.dosMz === true
//       ? [
//           "-loader",
//           "MzLoader",
//           "-processor",
//           "x86:LE:16:Real Mode",
//           "-cspec",
//           "default",
//         ]
//       : options.dosCom === true
//         ? [
//             "-loader",
//             "BinaryLoader",
//             "-loader-baseAddr",
//             "1000:0100",
//             "-processor",
//             "x86:LE:16:Real Mode",
//             "-cspec",
//             "default",
//           ]
//         : rawBinary === undefined
//           ? options.psp === true
//             ? [
//                 "-loader",
//                 "PspElfLoader",
//                 "-processor",
//                 "Allegrex:LE:32:default",
//                 "-cspec",
//                 "default",
//               ]
//             : override !== undefined
//               ? [
//                   "-processor",
//                   override.languageId,
//                   ...(override.compilerSpecId === undefined
//                     ? []
//                     : ["-cspec", override.compilerSpecId]),
//                 ]
//               : []
//           : [
//               "-loader",
//               "BinaryLoader",
//               "-loader-baseAddr",
//               rawBinary.baseAddr,
export const _l = 218;
