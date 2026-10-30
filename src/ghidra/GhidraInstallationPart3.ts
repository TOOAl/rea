export const __stub = 1;
//   }),
//   installationCheck({
//     name: "installation",
//     passed: coordinates.properties !== undefined,
//     code: "executable_missing",
//     detail:
//       coordinates.applicationPropertiesPath ??
//       "Ghidra application properties unavailable",
//     remediation:
//       "Point GHIDRA_INSTALL_DIR at the root of an extracted official Ghidra release.",
//   }),
//   versionCheck(coordinates.properties),
//   installationCheck({
//     name: "headless",
//     passed:
//       coordinates.analyzeHeadlessPath !== null &&
//       host.executable(coordinates.analyzeHeadlessPath),
//     code: "executable_missing",
//     detail: coordinates.analyzeHeadlessPath ?? "analyzeHeadless unavailable",
//     remediation:
//       "Restore support/analyzeHeadless or support/analyzeHeadless.bat from the official Ghidra release.",
//   }),
//   nativeDecompilerCheck({ coordinates, platform, architecture, host }),
//   javaCheck(
//     coordinates.java,
//     coordinates.javaCommand,
//     javaHome,
//     coordinates.properties,
//   ),
// ];
//
// /**
//  * REA's configuration parser, and so the MCP server and analysis, accept only
//  * absolute paths; a relative one that happens to resolve here must not pass.
//  */
// const configurationCheck = (
//   installDir: string | null,
//   javaHome: string | undefined,
//   platform: NodeJS.Platform,
// ): GhidraInstallationCheck => {
//   const { isAbsolute } = platform === "win32" ? win32 : posix;
//   const relative = [
//     ...(installDir !== null && !isAbsolute(installDir)
//       ? ["GHIDRA_INSTALL_DIR"]
//       : []),
//     ...(javaHome !== undefined && !isAbsolute(javaHome) ? ["JAVA_HOME"] : []),
//   ];
//   if (installDir === null || relative.length === 0)
//     return installationCheck({
//       name: "configuration",
//       passed: installDir !== null,
//       code: "not_configured",
//       detail: installDir ?? "GHIDRA_INSTALL_DIR is not set",
//       remediation: `Set GHIDRA_INSTALL_DIR to an extracted Ghidra ${ghidraReleaseLine()} release directory.`,
//     });
//   const settings = relative.join(" and ");
//   return installationCheck({
//     name: "configuration",
//     passed: false,
//     code: "not_configured",
//     detail: `${settings} must be absolute`,
//     remediation: `Set ${settings} to ${relative.length === 1 ? "an absolute path" : "absolute paths"}. REA's analysis and MCP server reject relative paths even when they resolve from the current directory.`,
//   });
// };
//
// /** Project an installation probe into caller-visible, secret-free diagnostics. */
// export const ghidraInstallationDiagnostics = (
//   inspection: GhidraInstallationInspection,
// ): Readonly<Record<string, JsonValue>> => ({
//   install_dir: inspection.installDir,
//   analyze_headless_path: inspection.analyzeHeadlessPath,
//   native_decompiler_path: inspection.nativeDecompilerPath,
//   application_properties_path: inspection.applicationPropertiesPath,
//   provider_version: inspection.providerVersion,
//   java_command: inspection.javaCommand,
//   java_home: inspection.javaHome,
//   java_version: inspection.javaVersion,
//   java_vm_name: inspection.javaVmName ?? null,
//   java_os_arch: inspection.javaOsArch ?? null,
//   java_os_name: inspection.javaOsName ?? null,
//   platform: inspection.platform,
//   architecture: inspection.architecture,
//   checks: inspection.checks.map((check) => ({
//     name: check.name,
//     ok: check.status === "passed",
//     code: check.status === "failed" ? check.code : null,
//     detail: check.detail,
//   })),
// });
//
// /** Environment that makes an explicitly selected JDK win over PATH discovery. */
// export const ghidraJavaEnvironment = (
//   javaHome: string | undefined,
//   environment: Readonly<NodeJS.ProcessEnv>,
//   platform: NodeJS.Platform = process.platform,
// ): NodeJS.ProcessEnv => {
//   const selectedEnvironment = snapshotEnvironment(environment, platform);
//   const boundedEnvironment = {
//     ...selectedEnvironment,
//     _JAVA_OPTIONS: "",
//     JAVA_TOOL_OPTIONS: "",
//     JDK_JAVA_OPTIONS: "",
//     GHIDRA_JAVA_OPTIONS: "",
//   };
//   return javaHome === undefined
//     ? boundedEnvironment
//     : {
//         ...boundedEnvironment,
//         JAVA_HOME: javaHome,
//         PATH: `${(platform === "win32" ? win32 : posix).join(
//           javaHome,
//           "bin",
//         )}${platform === "win32" ? win32.delimiter : posix.delimiter}${selectedEnvironment.PATH ?? ""}`,
//       };
// };
//
// const installationCheck = (options: {
//   readonly name: GhidraInstallationCheckName;
//   readonly passed: boolean;
//   readonly detail: string;
//   readonly code: ProviderRejectionCode;
//   readonly remediation: string;
// }): GhidraInstallationCheck =>
//   options.passed
//     ? {
//         status: "passed",
//         name: options.name,
//         detail: options.detail,
//       }
//     : {
//         status: "failed",
//         name: options.name,
//         code: options.code,
//         detail: options.detail,
//         remediation: options.remediation,
//       };
//
// /** Require a present native decompiler without positively incompatible bytes. */
// const nativeDecompilerCheck = ({
//   coordinates,
//   platform,
//   architecture,
//   host,
// }: Pick<
//   GhidraInstallationCheckContext,
//   "coordinates" | "platform" | "architecture" | "host"
// >): GhidraInstallationCheck => {
//   const path = coordinates.nativeDecompilerPath;
//   const compatibility =
//     path === null
//       ? undefined
//       : assessNativeDecompiler(
//           path,
//           platform,
//           architecture,
//           host.executableHeader?.(path),
//         );
//   // Ghidra resolves its native decompiler directory from the JVM's os.arch,
//   // not the host process architecture. A JDK running under emulation (for
//   // example x86_64 under Rosetta on Apple silicon) selects a directory that
//   // was never validated, so every analysis fails after a passing doctor.
//   // Ghidra resolves the OS directory from the JVM os.name/os.arch pair, so a
//   // JVM reporting a non-host os.name (for example through -Dos.name=Windows)
//   // selects a different OS directory even when os.arch matches.
//   const osArch = coordinates.java?.osArch;
//   const osName = coordinates.java?.osName;
//   const selectedDirectory = jvmOsArchNativeDirectory(platform, osArch);
//   const validatedDirectory = NATIVE_PLATFORMS[platform]?.[architecture];
//   // Without a JVM observation the java check reports the missing runtime;
//   // the decompiler directory cannot be selected, so this check defers to it.
//   if (coordinates.java !== undefined) {
//     if (selectedDirectory === undefined)
//       return installationCheck({
//         name: "native_decompiler",
//         passed: false,
//         code: "executable_missing",
//         detail:
//           osArch === undefined
//             ? "The Java probe did not report os.arch; the JVM-selected native decompiler directory is unknown and cannot be matched to the validated host directory"
//             : `JVM reports unrecognized os.arch=${osArch}; its selected native decompiler directory is unknown and cannot be matched to the validated host directory`,
//         remediation: `Point JAVA_HOME at a JDK whose reported architecture maps to the validated Ghidra decompiler (${validatedDirectory ?? "unsupported host"}). REA does not build or install native tools.`,
//       });
//     if (
//       validatedDirectory !== undefined &&
//       selectedDirectory !== validatedDirectory &&
//       path !== null
//     )
//       return installationCheck({
//         name: "native_decompiler",
//         passed: false,
//         code: "executable_missing",
//         detail: `JVM reports os.arch=${osArch}, so Ghidra selects its native decompiler from os/${selectedDirectory}, but the validated decompiler targets ${validatedDirectory} (host ${platform}/${architecture})`,
//         remediation: `Point JAVA_HOME at a JDK whose architecture matches the built decompiler (${validatedDirectory}). REA does not build or install native tools.`,
//       });
//     if (osName === undefined)
//       return installationCheck({
//         name: "native_decompiler",
//         passed: false,
//         code: "executable_missing",
//         detail:
//           "The Java probe did not report os.name; the JVM-selected native decompiler OS directory is unknown and cannot be matched to the validated host platform",
//         remediation: `Point JAVA_HOME at a JDK whose reported operating system matches the host platform (${platform}). REA does not build or install native tools.`,
//       });
//     if (!jvmOsNameMatchesPlatform(platform, osName) && path !== null)
//       return installationCheck({
//         name: "native_decompiler",
//         passed: false,
//         code: "executable_missing",
//         detail: `JVM reports os.name=${osName}, which does not match the validated host platform ${platform} (host ${platform}/${architecture})`,
//         remediation: `Point JAVA_HOME at a JDK whose reported operating system matches the host platform (${platform}). REA does not build or install native tools.`,
//       });
//   }
//   return installationCheck({
//     name: "native_decompiler",
//     passed: path !== null && compatibility?.status !== "incompatible",
//     code: "executable_missing",
//     detail:
//       compatibility?.detail ??
//       `Matching native decompiler for ${platform}/${architecture} was not found`,
//     remediation:
//       compatibility?.status === "incompatible"
//         ? compatibility.remediation
//         : `Provide an executable Ghidra/Features/Decompiler/os/${NATIVE_PLATFORMS[platform]?.[architecture] ?? "<platform>"}/${platform === "win32" ? "decompile.exe" : "decompile"}, or its build/os equivalent. REA does not build or install native tools.`,
//   });
// };
//
// /**
//  * Whether a JVM os.name value selects the host platform's native OS directory.
//  * Unknown values never align with the validated host directory; admission
//  * must not treat them as matching.
//  */
// const jvmOsNameMatchesPlatform = (
//   platform: NodeJS.Platform,
//   osName: string,
// ): boolean => {
//   const normalized = osName.toLowerCase();
//   if (platform === "win32") return normalized.startsWith("windows");
//   if (platform === "darwin")
//     return normalized.startsWith("mac") || normalized.startsWith("darwin");
//   if (platform === "linux") return normalized.startsWith("linux");
//   return false;
// };
//
// /**
//  * Map a JVM os.arch value to the Ghidra native directory that JVM selects.
//  * Unknown values stay unknown; admission must not treat them as aligned with
//  * the validated host directory.
//  */
// const jvmOsArchNativeDirectory = (
//   platform: NodeJS.Platform,
//   osArch: string | undefined,
// ): string | undefined => {
//   if (osArch === undefined) return undefined;
//   const normalized = osArch.toLowerCase();
//   const node: NodeJS.Architecture | undefined =
//     normalized === "x86_64" || normalized === "amd64" || normalized === "x64"
//       ? "x64"
//       : normalized === "aarch64" || normalized === "arm64"
//         ? "arm64"
//         : undefined;
//   return node === undefined ? undefined : NATIVE_PLATFORMS[platform]?.[node];
export const _l = 261;
