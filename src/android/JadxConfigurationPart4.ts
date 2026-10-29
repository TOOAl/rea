export const __stub = 1;
// ): readonly string[] => {
//   const result: string[] = [];
//   for (const [name, prefix, suffix] of [
//     ["REA_JADX_HEAP_MIB", "-Xmx", "m"],
//     ["REA_JADX_ACTIVE_PROCESSOR_COUNT", "-XX:ActiveProcessorCount=", ""],
//   ] as const) {
//     const value = environment[name];
//     if (value === undefined) continue;
//     if (!/^[1-9]\d*$/u.test(value) || !Number.isSafeInteger(Number(value)))
//       throw configurationFailure(
//         "open_options_invalid",
//         `${name} must be a positive safe integer; received ${value}.`,
//         { setting: name, value },
//         "jvm_options",
//       );
//     if (
//       name === "REA_JADX_ACTIVE_PROCESSOR_COUNT" &&
//       Number(value) > 2_147_483_647
//     )
//       throw configurationFailure(
//         "open_options_invalid",
//         `${name} exceeds the JVM's signed 32-bit processor-count range.`,
//         { setting: name, value },
//         "jvm_options",
//       );
//     result.push(`${prefix}${value}${suffix}`);
//   }
//   return result;
// };
//
// const inspectJavaRuntime = async (
//   java: string,
//   environment: Readonly<Record<string, string | undefined>>,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   let stdout: string;
//   let stderr: string;
//   try {
//     ({ stdout, stderr } = await execFileOutput(java, ["--list-modules"], {
//       env: { ...environment },
//       timeout: JAVA_MODULE_LISTING_TIMEOUT_MS,
//       maxBuffer: JAVA_MODULE_LISTING_MAX_OUTPUT_BYTES,
//       ...(signal === undefined ? {} : { signal }),
//     }));
//   } catch (cause) {
//     if (signal?.aborted === true) throw cause;
//     const output = execFileOutputFailure(cause);
//     if (output === undefined) throw cause;
//     const diagnostics = {
//       java_executable: java,
//       phase: "module-inspection",
//       exit_code: typeof output.code === "number" ? output.code : null,
//       process_error_code: typeof output.code === "string" ? output.code : null,
//       signal: output.signal,
//       killed: output.killed,
//       stdout: output.stdout,
//       stderr: output.stderr,
//       output_truncated: output.outputTruncated,
//     } satisfies Readonly<Record<string, JsonValue>>;
//     if (output.outputTruncated)
//       throw configurationFailure(
//         "version_unresolved",
//         `The selected Java launcher ${java} exceeded the ${JAVA_MODULE_LISTING_MAX_OUTPUT_BYTES / (1024 * 1024)} MiB output budget while listing modules. REA retained partial output but could not establish compiler or version availability. Inspect the selected launcher for verbose or unbounded output; ` +
//           "java --list-modules should return a concise module listing.",
//         {
//           ...diagnostics,
//           failure: "output_limit",
//           output_limit_bytes: JAVA_MODULE_LISTING_MAX_OUTPUT_BYTES,
//         },
//         "java_probe",
//         cause,
//       );
//     if (output.killed)
//       throw configurationFailure(
//         "version_unresolved",
//         `The selected Java launcher ${java} was terminated or did not finish the module-listing probe within ${JAVA_MODULE_LISTING_TIMEOUT_MS / 1000} seconds. Inspect the launcher and its startup responsiveness, then verify it returns compiler and version modules with java --list-modules.`,
//         {
//           ...diagnostics,
//           failure: "probe_terminated",
//           deadline_ms: JAVA_MODULE_LISTING_TIMEOUT_MS,
//         },
//         "java_probe",
//         cause,
//       );
//     throw configurationFailure(
//       "runtime_missing",
//       `Cannot inspect selected Java runtime ${java}: ${output.stderr.trim() || errorText(cause)}. Select a full JDK including jdk.compiler via JAVA_HOME or PATH; verify it with java --list-modules.`,
//       diagnostics,
//       "java_runtime",
//       cause,
//     );
//   }
//   const compiler = /^jdk\.compiler(?:@|$)/mu.test(stdout);
//   if (!compiler)
//     throw configurationFailure(
//       "runtime_missing",
//       `Selected Java runtime ${java} does not provide jdk.compiler. Select a full JDK including jdk.compiler via JAVA_HOME or PATH; verify it with java --list-modules. A JRE cannot compile REA's source bridge.`,
//       {
//         java_executable: java,
//         phase: "module-inspection",
//         jdk_compiler: false,
//         stdout,
//         stderr,
//         output_truncated: false,
//       },
//       "java_runtime",
//     );
//   const major = /^java\.base@(\d+)(?:[.+_-]|$)/mu.exec(stdout)?.[1];
//   if (major === undefined)
//     throw configurationFailure(
//       "version_unresolved",
//       `The selected Java launcher ${java} did not report a parseable java.base version in its module listing. Inspect the launcher output and verify it with java --list-modules.`,
//       {
//         java_executable: java,
//         phase: "module-inspection",
//         jdk_compiler: true,
//         java_major: null,
//         stdout,
//         stderr,
//         output_truncated: false,
//       },
//       "java_probe",
//     );
//   if (Number(major) < 17)
//     throw configurationFailure(
//       "unsupported_version",
//       `Selected Java runtime ${java} must be JDK 17 or newer and include jdk.compiler; verify it with java --list-modules.`,
//       {
//         java_executable: java,
//         phase: "module-inspection",
//         jdk_compiler: true,
//         java_major: major ?? null,
//         stdout,
//         stderr,
//         output_truncated: false,
//       },
//       "java_runtime",
//     );
// };
//
// const configurationFailure = (
//   code: ConfigurationFailureCode,
//   message: string,
//   diagnostics: Readonly<Record<string, JsonValue>>,
//   kind: JadxFailureKind,
//   cause?: unknown,
// ): JadxConfigurationFailure =>
//   new JadxConfigurationFailure(
//     code,
//     message,
//     diagnostics,
//     kind,
//     cause === undefined ? undefined : { cause },
//   );
//
// const errorText = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
export const _l = 157;
