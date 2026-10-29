export const __stub = 1;
// };
//
// const versionCheck = (
//   properties: GhidraApplicationProperties | undefined,
// ): GhidraInstallationCheck => {
//   const raw = properties?.providerVersion;
//   const parseError = properties?.parseError;
//   return installationCheck({
//     name: "version",
//     passed: parseError == null && ghidraReleaseAccepted(raw),
//     code:
//       parseError != null
//         ? "version_unresolved"
//         : ghidraReleaseCompatibility(raw).status === "unsupported"
//           ? "unsupported_version"
//           : "version_unresolved",
//     detail:
//       parseError == null
//         ? ghidraVersionDetail(raw)
//         : `application.properties could not be parsed: ${parseError}`,
//     remediation: `Install a Ghidra ${ghidraReleaseLine()} release (verified with ${SUPPORTED_GHIDRA_VERSION}), or update REA for another Ghidra line.`,
//   });
// };
//
// const javaCheck = (
//   observation: GhidraJavaObservation | undefined,
//   command: string,
//   configuredHome: string | undefined,
//   properties: GhidraApplicationProperties | undefined,
// ): GhidraInstallationCheck => {
//   const requirement = ghidraJavaRequirement(properties);
//   const range = ghidraJavaRangeLabel(requirement);
//   const supported =
//     observation !== undefined &&
//     ghidraJavaMajorAccepted(observation.major, requirement) &&
//     observation.bits === 64 &&
//     observation.runtime === "jdk";
//   const bitness =
//     observation === undefined
//       ? undefined
//       : observation.bits === null
//         ? `bitness unknown${observation.unparsedBits === undefined ? "" : ` (sun.arch.data.model = ${JSON.stringify(observation.unparsedBits)})`}`
//         : `${String(observation.bits)}-bit`;
//   const knownMismatch =
//     observation !== undefined &&
//     (!ghidraJavaMajorAccepted(observation.major, requirement) ||
//       (observation.bits !== null && observation.bits !== 64) ||
//       observation.runtime !== "jdk");
//   const detail =
//     observation === undefined
//       ? requirement.unresolved === null
//         ? command
//         : `${command}; ${requirement.unresolved}`
//       : `${observation.version}; ${bitness}; ${observation.runtime === "jdk" ? "JDK" : "runtime only"}; ${observation.home}; accepted ${range}`;
//   return installationCheck({
//     name: "java",
//     passed: supported,
//     code:
//       requirement.unresolved !== null
//         ? "version_unresolved"
//         : observation === undefined
//           ? "runtime_missing"
//           : knownMismatch
//             ? "unsupported_version"
//             : "version_unresolved",
//     detail,
//     remediation: javaRemediation(requirement, configuredHome, range),
//   });
// };
//
// const javaRemediation = (
//   requirement: GhidraJavaRequirement,
//   configuredHome: string | undefined,
//   range: string,
// ): string => {
//   if (requirement.unresolved !== null)
//     return `The Ghidra installation's Java bounds could not be read (${requirement.unresolved}). Install a 64-bit full JDK inside the declared application.java.min and application.java.max.`;
//   return configuredHome === undefined
//     ? `Install ${range}, or set JAVA_HOME before starting REA.`
//     : `Update JAVA_HOME to the root of ${range} installation.`;
// };
//
// const systemGhidraInstallationHost = (): GhidraInstallationHost => ({
//   readText(path) {
//     try {
//       // Ghidra loads this file with Properties.load(InputStream), which maps
//       // bytes as ISO-8859-1 rather than decoding UTF-8.
//       return readFileSync(path).toString("latin1");
//     } catch (cause: unknown) {
//       // best-effort cleanup: optional install probing; unreadable means unknown.
//       void cause;
//       return undefined;
//     }
//   },
//   executableHeader(path) {
//     let handle: number | undefined;
//     try {
//       handle = openSync(
//         path,
//         constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOCTTY,
//       );
//       const metadata = fstatSync(handle);
//       if (!metadata.isFile()) return undefined;
//       const bytes = Buffer.alloc(EXECUTABLE_HEADER_PROBE_BYTES);
//       const read = readSync(handle, bytes, 0, bytes.length, 0);
//       return { bytes: bytes.subarray(0, read), size: metadata.size };
//     } catch (cause: unknown) {
//       // best-effort cleanup: a header that cannot be read stays unknown.
//       void cause;
//       return undefined;
//     } finally {
//       if (handle !== undefined) closeSync(handle);
//     }
//   },
//   executable(path) {
//     try {
//       accessSync(path, constants.X_OK);
//       return statSync(path).isFile();
//     } catch (cause: unknown) {
//       // best-effort cleanup: optional executable probing; failure means missing.
//       void cause;
//       return false;
//     }
//   },
//   probeJava(command, environment) {
//     const observed = spawnSync(
//       command,
//       [
//         "-Dstdout.encoding=UTF-8",
//         "-Dstderr.encoding=UTF-8",
//         // JDK 17/18 use the legacy names; JDK 19+ use the names above.
//         "-Dsun.stdout.encoding=UTF-8",
//         "-Dsun.stderr.encoding=UTF-8",
//         "-XX:-UsePerfData",
//         "-XshowSettings:properties",
//         "-version",
//       ],
//       {
//         encoding: "utf8",
//         env: environment,
//         timeout: 5_000,
//         maxBuffer: JAVA_PROBE_MAX_OUTPUT_BYTES,
//         windowsHide: true,
//       },
//     );
//     if (observed.error !== undefined || observed.status !== 0) return undefined;
//     const output = `${observed.stdout ?? ""}\n${observed.stderr ?? ""}`;
//     const version = javaProperty(output, "java.version");
//     const home = javaProperty(output, "java.home");
//     const vmName = javaProperty(output, "java.vm.name");
//     const osArch = javaProperty(output, "os.arch");
//     const osName = javaProperty(output, "os.name");
//     const reportedBits = javaProperty(output, "sun.arch.data.model");
//     const parsedBits =
//       reportedBits !== null && /^\d+$/.test(reportedBits)
//         ? Number(reportedBits)
//         : null;
//     const bits =
//       parsedBits !== null && Number.isSafeInteger(parsedBits)
//         ? parsedBits
//         : null;
//     if (
//       version === null ||
//       version.length === 0 ||
//       home === null ||
//       home.length === 0
//     )
//       return undefined;
//     return {
//       version,
//       major: javaMajor(version),
//       home,
//       ...(vmName === null ? {} : { vmName }),
//       ...(osArch === null ? {} : { osArch }),
//       ...(osName === null ? {} : { osName }),
//       bits,
//       ...(reportedBits === null || bits !== null
//         ? {}
//         : { unparsedBits: reportedBits }),
//       runtime: executablePath(
//         (process.platform === "win32" ? win32 : posix).join(
//           home,
//           "bin",
//           process.platform === "win32" ? "javac.exe" : "javac",
//         ),
//       )
//         ? "jdk"
//         : "jre",
//     };
//   },
//   discoverInstallDirOnPath: discoverGhidraInstallationOnPath,
// });
//
// /** Find a PATH launcher whose real target is inside a complete Ghidra tree. */
// export const discoverGhidraInstallationOnPath = (
//   environment: Readonly<NodeJS.ProcessEnv>,
//   platform: NodeJS.Platform,
// ): string | undefined => {
//   if (platform !== process.platform) return undefined;
//   const path = platform === "win32" ? win32 : posix;
//   const pathValue = environment.PATH;
//   if (pathValue === undefined || pathValue.length === 0) return undefined;
//   const launchers =
//     platform === "win32"
//       ? ["ghidra.bat", "ghidraRun.bat", "ghidra.exe", "ghidraRun.exe"]
//       : ["ghidra", "ghidraRun"];
//   for (const directory of pathValue.split(pathDelimiter)) {
//     if (directory.length === 0) continue;
//     for (const launcher of launchers) {
//       let resolved: string;
//       try {
//         const candidate = path.resolve(directory, launcher);
//         if (!executablePath(candidate)) continue;
//         resolved = realpathSync(candidate);
//       } catch (cause: unknown) {
//         void cause;
//         continue;
//       }
//       const root = dirname(resolved);
//       const properties = path.join(root, "Ghidra", "application.properties");
//       const headless = path.join(
//         root,
//         "support",
//         platform === "win32" ? "analyzeHeadless.bat" : "analyzeHeadless",
//       );
//       try {
//         if (statSync(properties).isFile() && executablePath(headless))
//           return root;
//       } catch (cause: unknown) {
//         void cause;
//       }
//     }
//   }
//   return undefined;
// };
//
// const executablePath = (path: string): boolean => {
//   try {
//     accessSync(path, constants.X_OK);
//     return statSync(path).isFile();
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional executable probing; failure means missing.
//     void cause;
//     return false;
//   }
// };
//
// const javaProperty = (output: string, name: string): string | null =>
//   new RegExp(
//     `^[ \\t]*${name.replaceAll(".", "\\.")}[ \\t]*=[ \\t]*([^\\r\\n]*?)[ \\t]*\\r?$`,
//     "mu",
//   ).exec(output)?.[1] ?? null;
//
// const javaMajor = (version: string): number => {
//   const first = Number.parseInt(version.split(".")[0] ?? "0", 10);
//   if (first !== 1) return first;
//   return Number.parseInt(version.split(".")[1] ?? "0", 10);
// };
export const _l = 258;
