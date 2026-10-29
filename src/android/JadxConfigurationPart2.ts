export const __stub = 1;
//     );
//     await validateJadxConfigurationContents(configuration, environment, signal);
//     return {
//       status: "available",
//       code: null,
//       reason: null,
//       diagnostics: {
//         configured: true,
//         java_executable: configuration.java,
//         jdk_compiler: true,
//         jar_path: configuration.jar,
//       },
//     };
//   } catch (cause) {
//     if (signal?.aborted === true) throw cause;
//     if (cause instanceof JadxConfigurationFailure)
//       return {
//         status: "unavailable",
//         code: cause.code,
//         reason: cause.message,
//         diagnostics: { ...cause.diagnostics, failure_kind: cause.kind },
//       };
//     throw cause;
//   }
// };
//
// /** Resolve caller-selected paths and JVM options without probing their contents. */
// export const resolveJadxConfigurationInputs = async (
//   environment: Readonly<Record<string, string | undefined>>,
//   operation: AndroidOperation,
//   signal?: AbortSignal,
// ): Promise<JadxConfiguration> => {
//   try {
//     return await readJadxConfigurationInputs(environment, signal);
//   } catch (cause) {
//     if (signal?.aborted === true) throw cause;
//     if (!(cause instanceof JadxConfigurationFailure)) throw cause;
//     throw projectConfigurationFailure(operation, cause);
//   }
// };
//
// /** Probe Java and archive prerequisites before starting a new engine session. */
// export const validateJadxConfiguration = async (
//   configuration: JadxConfiguration,
//   environment: Readonly<Record<string, string | undefined>>,
//   operation: AndroidOperation,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   try {
//     await validateJadxConfigurationContents(configuration, environment, signal);
//   } catch (cause) {
//     if (signal?.aborted === true) throw cause;
//     if (!(cause instanceof JadxConfigurationFailure)) throw cause;
//     throw projectConfigurationFailure(operation, cause);
//   }
// };
//
// const readJadxConfigurationInputs = async (
//   environment: Readonly<Record<string, string | undefined>>,
//   signal?: AbortSignal,
// ): Promise<JadxConfiguration> => {
//   signal?.throwIfAborted();
//   requireSupportedHost();
//   const jar = await resolveJar(environment);
//   const java = await resolveJava(environment, signal);
//   await requireJavaHomeExecutable(environment.JAVA_HOME, java);
//   signal?.throwIfAborted();
//   return { jar, java, jvmArguments: resolveJvmArguments(environment) };
// };
//
// const validateJadxConfigurationContents = async (
//   configuration: JadxConfiguration,
//   environment: Readonly<Record<string, string | undefined>>,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   signal?.throwIfAborted();
//   await inspectJavaRuntime(configuration.java, environment, signal);
//   await requireEngineArchive(configuration.jar, signal);
// };
//
// const projectConfigurationFailure = (
//   operation: AndroidOperation,
//   cause: JadxConfigurationFailure,
// ): AnalysisCapabilityUnavailableError => {
//   const output = cause.diagnostics;
//   return new AnalysisCapabilityUnavailableError(
//     "jadx",
//     operation,
//     cause.message,
//     {
//       cause,
//       userMessage: cause.message,
//       ...(typeof output.stdout === "string" && typeof output.stderr === "string"
//         ? {
//             capturedOutput: {
//               stdout: output.stdout,
//               stderr: output.stderr,
//               truncated: output.output_truncated === true,
//             },
//           }
//         : {}),
//     },
//   );
// };
//
// const requireEngineArchive = async (
//   jar: string,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   // These classes are consumed directly by ReaJadxBridge.java. This checks the
//   // classpath inventory without loading engine code or starting a JADX session.
//   const missing = new Set([
//     "com/atxx/jhmcp/JadxSession.class",
//     "com/atxx/jhmcp/SessionHolder.class",
//     "jadx/api/JadxDecompiler.class",
//     "com/google/gson/Gson.class",
//     "io/modelcontextprotocol/kotlin/sdk/server/Server.class",
//   ]);
//   const reader = new ZipArtifactReader(jar, "zip", JAR_METADATA_READ_MAX_BYTES);
//   try {
//     for await (const entry of reader.entries(signal)) {
//       if (entry.kind === "file" && !entry.encrypted) missing.delete(entry.path);
//       if (missing.size === 0) return;
//     }
//   } catch (cause) {
//     if (signal?.aborted === true) throw cause;
//     const reason = cause instanceof Error ? cause.message : String(cause);
//     throw configurationFailure(
//       "version_unresolved",
//       `Cannot inspect REA_JADX_MCP_JAR ${jar} as a Java archive: ${reason}. ${JADX_JAR_CONFIGURATION_REMEDIATION}`,
//       {
//         jar_path: jar,
//         phase: "jar-inspection",
//         archive_error: reason,
//         maximum_metadata_read_bytes: JAR_METADATA_READ_MAX_BYTES,
//       },
//       "jar",
//       cause,
//     );
//   } finally {
//     await reader.close();
//   }
//   throw configurationFailure(
//     "unsupported_version",
//     `REA_JADX_MCP_JAR ${jar} does not contain the required metadata bridge classes: ${[...missing].join(", ")}. ${JADX_JAR_CONFIGURATION_REMEDIATION}`,
//     { jar_path: jar, phase: "jar-inspection", missing_classes: [...missing] },
//     "jar",
//   );
// };
//
// const requireSupportedHost = (): void => {
//   if (process.platform === "linux" || process.platform === "darwin") return;
//   if (process.platform === "win32" && process.arch === "x64") {
//     const loaded = systemWindowsNativeAuthority();
//     if (loaded.available) {
//       if (loaded.authority.inspection.protocolStdin === true) return;
//       throw configurationFailure(
//         "runtime_missing",
//         "The bundled Windows native artifact lacks owned protocol stdin; use a matching current Windows x64 REA package.",
//         {
export const _l = 160;
