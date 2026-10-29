export const __stub = 1;
//           platform: process.platform,
//           architecture: process.arch,
//           phase: "process-ownership",
//           owned_protocol_stdin: false,
//         },
//         "windows_native_artifact",
//       );
//     }
//     const readiness = inspectWindowsNativeReadiness(process.platform, loaded);
//     throw configurationFailure(
//       readiness.available ? "runtime_unavailable" : readiness.code,
//       readiness.available
//         ? "Windows native readiness disagreed with the native loader result."
//         : readiness.reason,
//       {
//         platform: process.platform,
//         architecture: process.arch,
//         phase: "process-ownership",
//         owned_protocol_stdin: false,
//         ...(readiness.available
//           ? {}
//           : {
//               failure_stage: readiness.failureStage,
//               remediation: readiness.remediation,
//             }),
//       },
//       readiness.available
//         ? "windows_native_runtime"
//         : readiness.code === "unsupported_host"
//           ? "unsupported_host"
//           : readiness.code === "runtime_missing"
//             ? "windows_native_artifact"
//             : "windows_native_runtime",
//     );
//   }
//   throw configurationFailure(
//     "unsupported_host",
//     `Android JADX subprocess ownership is unsupported on ${process.platform}/${process.arch}; use Linux, macOS, or Windows x64 with its bundled native controls.`,
//     { platform: process.platform },
//     "unsupported_host",
//   );
// };
//
// const resolveJar = async (
//   environment: Readonly<Record<string, string | undefined>>,
// ): Promise<string> => {
//   const jar = environment.REA_JADX_MCP_JAR;
//   if (jar === undefined || !isAbsolute(jar))
//     throw configurationFailure(
//       "not_configured",
//       JADX_JAR_CONFIGURATION_REMEDIATION,
//       { jar_configured: false },
//       "jar",
//     );
//   try {
//     await access(jar, constants.R_OK);
//     if (!(await stat(jar)).isFile())
//       throw configurationFailure(
//         "executable_missing",
//         `REA_JADX_MCP_JAR is not a regular file: ${jar}`,
//         { jar_path: jar },
//         "jar",
//       );
//     return await realpath(jar);
//   } catch (cause) {
//     if (cause instanceof JadxConfigurationFailure) throw cause;
//     throw configurationFailure(
//       "executable_missing",
//       `Cannot read REA_JADX_MCP_JAR ${jar}: ${cause instanceof Error ? cause.message : String(cause)}`,
//       { jar_path: jar },
//       "jar",
//       cause,
//     );
//   }
// };
//
// const resolveJava = async (
//   environment: Readonly<Record<string, string | undefined>>,
//   signal?: AbortSignal,
// ): Promise<string> => {
//   const executable = process.platform === "win32" ? "java.exe" : "java";
//   if (environment.JAVA_HOME === undefined) {
//     if (process.platform !== "win32") return executable;
//     const path =
//       Object.entries(environment).find(
//         ([key]) => key.toLowerCase() === "path",
//       )?.[1] ?? "";
//     for (const directory of [process.cwd(), ...path.split(delimiter)]) {
//       signal?.throwIfAborted();
//       // Windows PATH commonly quotes individual entries containing spaces.
//       const selected =
//         directory.startsWith('"') && directory.endsWith('"')
//           ? directory.slice(1, -1)
//           : directory;
//       const candidate = resolve(selected, executable);
//       try {
//         await access(candidate, constants.R_OK | constants.X_OK);
//         if ((await stat(candidate)).isFile()) return await realpath(candidate);
//       } catch (cause: unknown) {
//         if (
//           typeof cause === "object" &&
//           cause !== null &&
//           "code" in cause &&
//           (cause.code === "ENOENT" || cause.code === "ENOTDIR")
//         )
//           continue;
//         throw configurationFailure(
//           "runtime_missing",
//           `Cannot inspect selected Java executable ${candidate}: ${errorText(cause)}`,
//           { java_executable: candidate },
//           "java_runtime",
//           cause,
//         );
//       }
//     }
//     throw configurationFailure(
//       "runtime_missing",
//       "Cannot find java.exe on the selected Windows PATH. Select a full JDK with JAVA_HOME or PATH, then verify it with java --list-modules. REA does not install Java.",
//       { java_executable: executable },
//       "java_runtime",
//     );
//   }
//   if (isAbsolute(environment.JAVA_HOME))
//     return join(environment.JAVA_HOME, "bin", executable);
//   throw configurationFailure(
//     "open_options_invalid",
//     "JAVA_HOME must select an existing JDK by absolute path; omit it to use java on PATH.",
//     { java_home: environment.JAVA_HOME },
//     "java_home",
//   );
// };
//
// const requireJavaHomeExecutable = async (
//   javaHome: string | undefined,
//   java: string,
// ): Promise<void> => {
//   if (javaHome === undefined) return;
//   try {
//     await access(java, constants.R_OK | constants.X_OK);
//     if ((await stat(java)).isFile()) return;
//     throw configurationFailure(
//       "runtime_missing",
//       `JAVA_HOME java is not a regular file: ${java}`,
//       { java_executable: java },
//       "java_runtime",
//     );
//   } catch (cause) {
//     if (cause instanceof JadxConfigurationFailure) throw cause;
//     throw configurationFailure(
//       "runtime_missing",
//       `Cannot execute JAVA_HOME java ${java}: ${cause instanceof Error ? cause.message : String(cause)}`,
//       { java_executable: java },
//       "java_runtime",
//       cause,
//     );
//   }
// };
//
// const resolveJvmArguments = (
//   environment: Readonly<Record<string, string | undefined>>,
export const _l = 160;
