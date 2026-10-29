export const __stub = 1;
//   readonly vmName?: string;
//   /**
//    * Observed JVM os.arch property, which Ghidra uses to select its native
//    * decompiler directory. Omitted when the probe cannot establish it.
//    */
//   readonly osArch?: string;
//   /**
//    * Observed JVM os.name property, which Ghidra uses with os.arch to select
//    * its native decompiler OS directory. Omitted when the probe cannot
//    * establish it.
//    */
//   readonly osName?: string;
// }
//
// /** A bounded executable-header probe: a small prefix plus the whole file size. */
// export interface GhidraExecutableHeaderProbe {
//   /** A bounded prefix; a larger or unreadable header remains unknown. */
//   readonly bytes: Buffer;
//   /** Whole-file size, since header commitments are checked against it, not the prefix. */
//   readonly size: number;
// }
//
// /** Narrow synchronous seam used by provider discovery without launching Ghidra. */
// export interface GhidraInstallationHost {
//   readonly platform?: NodeJS.Platform;
//   readonly architecture?: NodeJS.Architecture;
//   readText(path: string): string | undefined;
//   executable(path: string): boolean;
//   /**
//    * Read a bounded header prefix of one executable so admission can reject a
//    * tool built for another platform or architecture. An omitted seam, or an
//    * unreadable file, reports the header as unknown and never rejects an
//    * installation that the other checks already accept.
//    */
//   executableHeader?(path: string): GhidraExecutableHeaderProbe | undefined;
//   probeJava(
//     command: string,
//     environment: NodeJS.ProcessEnv,
//   ): GhidraJavaObservation | undefined;
//   /** Resolve a PATH launcher to a validated installation without executing it. */
//   discoverInstallDirOnPath?(
//     environment: Readonly<NodeJS.ProcessEnv>,
//     platform: NodeJS.Platform,
//   ): string | undefined;
// }
//
// interface GhidraInstallationCoordinates {
//   readonly installDir: string | null;
//   readonly applicationPropertiesPath: string | null;
//   readonly analyzeHeadlessPath: string | null;
//   readonly nativeDecompilerPath: string | null;
//   readonly properties: GhidraApplicationProperties | undefined;
//   readonly javaCommand: string;
//   readonly java: GhidraJavaObservation | undefined;
// }
//
// interface GhidraInstallationCheckContext {
//   readonly coordinates: GhidraInstallationCoordinates;
//   readonly platform: NodeJS.Platform;
//   readonly architecture: NodeJS.Architecture;
//   readonly javaHome: string | undefined;
//   readonly host: GhidraInstallationHost;
// }
//
// /** Inspect an installation without importing a target or modifying Ghidra. */
// export const inspectGhidraInstallation = (
//   options: GhidraInstallationOptions,
//   host: GhidraInstallationHost = systemGhidraInstallationHost(),
// ): GhidraInstallationInspection => {
//   const platform = options.platform ?? process.platform;
//   const architecture = options.architecture ?? process.arch;
//   const coordinates = installationCoordinates(
//     options,
//     platform,
//     architecture,
//     host,
//   );
//   const checks = installationChecks({
//     coordinates,
//     platform,
//     architecture,
//     javaHome: options.javaHome,
//     host,
//   });
//   const failed = checks.find(
//     (check): check is Extract<GhidraInstallationCheck, { status: "failed" }> =>
//       check.status === "failed",
//   );
//   const observation = {
//     platform,
//     architecture,
//     applicationPropertiesPath: coordinates.applicationPropertiesPath,
//     nativeDecompilerPath: coordinates.nativeDecompilerPath,
//     javaCommand: coordinates.javaCommand,
//     ...(coordinates.java?.vmName === undefined
//       ? {}
//       : { javaVmName: coordinates.java.vmName }),
//     ...(coordinates.java?.osArch === undefined
//       ? {}
//       : { javaOsArch: coordinates.java.osArch }),
//     ...(coordinates.java?.osName === undefined
//       ? {}
//       : { javaOsName: coordinates.java.osName }),
//     checks,
//   };
//   if (failed !== undefined)
//     return {
//       status: "unavailable",
//       ...observation,
//       installDir: coordinates.installDir,
//       analyzeHeadlessPath: coordinates.analyzeHeadlessPath,
//       providerVersion: coordinates.properties?.providerVersion ?? null,
//       javaHome: coordinates.java?.home ?? options.javaHome ?? null,
//       javaVersion: coordinates.java?.version ?? null,
//       rejection: { code: failed.code, reason: failed.remediation },
//     };
//   return availableInstallation(coordinates, observation);
// };
//
// const availableInstallation = (
//   coordinates: GhidraInstallationCoordinates,
//   observation: GhidraInstallationObservation,
// ): AvailableGhidraInstallation => {
//   const providerVersion = coordinates.properties?.providerVersion;
//   if (
//     coordinates.installDir === null ||
//     coordinates.applicationPropertiesPath === null ||
//     coordinates.analyzeHeadlessPath === null ||
//     providerVersion === null ||
//     providerVersion === undefined ||
//     coordinates.java === undefined
//   )
//     throw new TypeError(
//       "Passing Ghidra installation checks produced incomplete coordinates",
//     );
//   return {
//     status: "available",
//     ...observation,
//     installDir: coordinates.installDir,
//     analyzeHeadlessPath: coordinates.analyzeHeadlessPath,
//     applicationPropertiesPath: coordinates.applicationPropertiesPath,
//     providerVersion,
//     javaHome: coordinates.java.home,
//     javaVersion: coordinates.java.version,
//   };
// };
//
// const installationCoordinates = (
//   options: GhidraInstallationOptions,
//   platform: NodeJS.Platform,
//   architecture: NodeJS.Architecture,
//   host: GhidraInstallationHost,
// ): GhidraInstallationCoordinates => {
//   const path = platform === "win32" ? win32 : posix;
//   // An explicit setting remains authoritative even when malformed or stale;
//   // automatic discovery is only a fallback when the caller supplied none.
//   const installDir =
//     options.installDir ??
//     host.discoverInstallDirOnPath?.(options.environment, platform) ??
//     null;
//   const applicationPropertiesPath =
//     installDir === null
//       ? null
//       : path.join(installDir, "Ghidra", "application.properties");
//   const analyzeHeadlessPath =
//     installDir === null
//       ? null
//       : path.join(
//           installDir,
//           "support",
//           platform === "win32" ? "analyzeHeadless.bat" : "analyzeHeadless",
//         );
//   const decompilerPlatform = NATIVE_PLATFORMS[platform]?.[architecture];
//   const decompilerExecutable =
//     platform === "win32" ? "decompile.exe" : "decompile";
//   const nativeDecompilerPath =
//     installDir === null || decompilerPlatform === undefined
//       ? null
//       : ([
//           path.join(
//             installDir,
//             "Ghidra",
//             "Features",
//             "Decompiler",
//             "os",
//             decompilerPlatform,
//             decompilerExecutable,
//           ),
//           path.join(
//             installDir,
//             "Ghidra",
//             "Features",
//             "Decompiler",
//             "build",
//             "os",
//             decompilerPlatform,
//             decompilerExecutable,
//           ),
//         ].find((candidate) => host.executable(candidate)) ?? null);
//   const properties =
//     applicationPropertiesPath === null
//       ? undefined
//       : host.readText(applicationPropertiesPath);
//   const javaCommand =
//     options.javaHome === undefined
//       ? platform === "win32"
//         ? "java.exe"
//         : "java"
//       : path.join(
//           options.javaHome,
//           "bin",
//           platform === "win32" ? "java.exe" : "java",
//         );
//   return {
//     installDir,
//     applicationPropertiesPath,
//     analyzeHeadlessPath,
//     nativeDecompilerPath,
//     properties:
//       properties === undefined
//         ? undefined
//         : ghidraApplicationProperties(properties),
//     javaCommand,
//     // The configuration check rejects a relative JAVA_HOME. Probing it would
//     // run whatever `bin/java` the current directory holds.
//     java:
//       options.javaHome === undefined || path.isAbsolute(options.javaHome)
//         ? host.probeJava(
//             javaCommand,
//             ghidraJavaEnvironment(
//               options.javaHome,
//               options.environment,
//               platform,
//             ),
//           )
//         : undefined,
//   };
// };
//
// const installationChecks = ({
//   coordinates,
//   platform,
//   architecture,
//   javaHome,
//   host,
// }: GhidraInstallationCheckContext): readonly GhidraInstallationCheck[] => [
//   configurationCheck(coordinates.installDir, javaHome, platform),
//   installationCheck({
//     name: "platform",
//     passed: NATIVE_PLATFORMS[platform] !== undefined,
//     code: "unsupported_host",
//     detail: platform,
//     remediation:
//       "Use Linux or macOS x64/arm64, or Windows x64 with matching native Ghidra tools.",
//   }),
//   installationCheck({
//     name: "architecture",
//     passed: NATIVE_PLATFORMS[platform]?.[architecture] !== undefined,
//     code: "unsupported_host",
//     detail: architecture,
//     remediation: "Use x64/arm64 on Linux or macOS, or x64 on Windows.",
export const _l = 261;
