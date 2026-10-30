export const __stub = 1;
//
// const nativeCommandCleanupFailure = (
//   failures: readonly NativeCommandCleanupFailure[],
// ): ProviderCleanupError =>
//   new ProviderCleanupError(
//     IDENTITY.id,
//     [...new Set(failures.flatMap(({ resources }) => resources))],
//     {
//       reason: "Native command process cleanup remains incomplete",
//       failures: failures.map(({ reason, resources }) => ({
//         reason,
//         resources: [...resources],
//       })),
//     },
//   );
//
// interface NativeObservation {
//   readonly result: JsonValue;
//   readonly limitations: readonly string[];
//   readonly locations: readonly EvidenceLocation[];
// }
//
// interface MixedSignatureSlices {
//   readonly captures: readonly NativeCommandCapture[];
//   readonly limitations: readonly string[];
// }
//
// const isNativeOperation = (
//   operation: AnalysisOperation,
// ): operation is NativeToolName =>
//   NATIVE_TOOL_CONTRACTS.some(({ name }) => name === operation);
//
// const translateCommandFailure = (
//   operation: NativeToolName,
//   failure: NativeCommandFailure,
// ): AnalysisError => {
//   const capturedOutput =
//     failure.capture === null
//       ? undefined
//       : {
//           stdout: failure.capture.stdout,
//           stderr: failure.capture.stderr,
//           truncated: failure.capture.truncated,
//           stdout_bytes: failure.capture.stdoutBytes,
//           stderr_bytes: failure.capture.stderrBytes,
//           exit_code: failure.capture.exitCode,
//           signal: failure.capture.signal,
//         };
//   const cleanup =
//     failure.cleanupFailure === null
//       ? undefined
//       : {
//           reason: failure.cleanupFailure,
//           resources: [...failure.cleanupResources],
//         };
//   const errorOptions = {
//     ...(capturedOutput === undefined ? {} : { capturedOutput }),
//     ...(cleanup === undefined ? {} : { cleanup }),
//   };
//   if (failure.reason === "unavailable") {
//     const reason = `${failure.tool} is unavailable through xcrun.`;
//     return new AnalysisCapabilityUnavailableError(
//       IDENTITY.id,
//       operation,
//       reason,
//       { ...errorOptions, userMessage: reason },
//     );
//   }
//   if (failure.reason === "cancelled")
//     return new AnalysisCancelledError(operation, errorOptions);
//   if (failure.reason === "timeout")
//     return new AnalysisTimeoutError(
//       operation,
//       NATIVE_COMMAND_TIMEOUT_MS,
//       errorOptions,
//     );
//   if (failure.reason === "output-limit")
//     return new AnalysisResourceConstraintError(
//       operation,
//       "memory",
//       `Native command output exceeded ${String(NATIVE_COMMAND_OUTPUT_BUDGET_BYTES)} bytes; complete output is required for analysis.`,
//       { max_output_bytes: NATIVE_COMMAND_OUTPUT_BUDGET_BYTES },
//       errorOptions,
//     );
//   return new ProviderAdapterError(IDENTITY.id, operation, {
//     cause: failure,
//     ...errorOptions,
//     diagnostics: {
//       tool: failure.tool,
//       reason: failure.reason,
//       exit_code: failure.capture?.exitCode ?? failure.exitCode,
//       signal: failure.capture?.signal ?? null,
//       stdout_bytes: failure.capture?.stdoutBytes ?? 0,
//       stderr_bytes: failure.capture?.stderrBytes ?? 0,
//       ...(failure.detail === null ? {} : { detail: failure.detail }),
//     },
//   });
// };
//
// const translateCodeSignExitFailure = (
//   capture: NativeCommandCapture,
// ): AnalysisError =>
//   translateCommandFailure(
//     "inspect_signature",
//     new NativeCommandFailure(
//       "codesign",
//       "nonzero-exit",
//       capture.exitCode,
//       undefined,
//       // Accepted output stays complete until the provider decides it failed.
//       failureCapture(capture, false),
//     ),
//   );
//
// const commandOutput = (capture: NativeCommandCapture): string =>
//   `${capture.stdout}\n${capture.stderr}`;
//
// /**
//  * A signed artifact exits zero; its diagnostics can still contain this text
//  * through the echoed path or identifier.
//  */
// const isNonzeroUnsignedObservation = (capture: NativeCommandCapture): boolean =>
//   capture.exitCode !== null &&
//   capture.exitCode !== 0 &&
//   /not signed at all|code object is not signed/iu.test(commandOutput(capture));
//
// const canonicalPath = async (path: string): Promise<string[]> => {
//   try {
//     return [await realpath(path)];
//   } catch {
//     return [];
//   }
// };
//
// const codeSignCaptureFailure = (
//   capture: NativeCommandCapture,
// ): AnalysisError | null =>
//   capture.exitCode === 0 || isNonzeroUnsignedObservation(capture)
//     ? null
//     : translateCodeSignExitFailure(capture);
//
// const codeSignArchitectures = (
//   format: string | null,
//   target: BinaryTarget,
// ): string[] => {
//   const universal = /^Mach-O universal \(([^)\r\n]+)\)$/u.exec(
//     format ?? "",
//   )?.[1];
//   if (universal !== undefined) {
//     const architectures = universal
//       .split(/\s+/u)
//       .filter((architecture) =>
//         /^(?:i386|x86_64|armv7|arm64|arm64e)$/u.test(architecture),
//       );
//     if (architectures.length > 0) return [...new Set(architectures)];
//   }
//   if (target.kind !== "executable" || !isMachOFormat(target.format)) return [];
//   return target.availableArchitectures.map((architecture) =>
//     architecture === "x86" ? "i386" : architecture,
//   );
// };
//
// const invocation = (
//   capture: NativeCommandCapture,
//   artifactPath: string,
//   alias = "$ARTIFACT",
// ): NativeCommandInvocation => ({
//   tool: capture.tool,
//   command: [
//     capture.executable,
//     ...capture.arguments.map((argument) =>
//       argument === artifactPath ? alias : argument,
//     ),
//   ],
//   tool_version: capture.toolVersion,
//   version_reason: capture.versionReason,
//   executable_sha256: capture.executableSha256,
//   exit: { code: capture.exitCode, signal: capture.signal },
//   stdout_bytes: capture.stdoutBytes,
//   stderr_bytes: capture.stderrBytes,
// });
//
// const parseEntitlements = (
//   output: string,
// ): { readonly value: JsonValue; readonly omittedPrototypeKeys: number } => {
//   const start = output.indexOf("<?xml");
//   const end = output.lastIndexOf("</plist>");
//   if (start < 0 || end < start) return { value: null, omittedPrototypeKeys: 0 };
//   const { value, omittedPrototypeKeys } = parseXmlPropertyList(
//     output.slice(start, end + "</plist>".length),
//   );
//   return { value: jsonValueSchema.parse(value), omittedPrototypeKeys };
// };
//
// /**
//  * Report a plist that cannot be decoded as the caller's selection, or as the
//  * target's missing default, rather than as a failed tool run.
//  */
// const unreadablePlist = (
//   path: string,
//   requested: string | undefined,
//   reason: string,
// ): AnalysisError => {
//   const sentence = reason.endsWith(".") ? reason : `${reason}.`;
//   // Name the default that is missing and the selection that still works.
//   const missingDefault = `The target has no readable default plist at ${path}: ${sentence} Select another plist in the target with the path input (CLI: --relative-path).`;
//   return requested === undefined
//     ? new AnalysisCapabilityUnavailableError(
//         IDENTITY.id,
//         "inspect_plist",
//         missingDefault,
//         { userMessage: missingDefault },
//       )
//     : new AnalysisInputError("inspect_plist", undefined, [
//         {
//           path: ["path"],
//           reason: "invalid_value",
//           message: `Cannot inspect ${path}: ${sentence}`,
//         },
//       ]);
// };
//
// /** plutil prefixes its diagnostic with the path the message already names. */
// const plutilDiagnostic = (stderr: string, path: string): string => {
//   const text = stderr.trim();
//   return text.startsWith(`${path}: `) ? text.slice(path.length + 2) : text;
// };
//
// /**
//  * Admit a readable regular file before plutil runs, so a later plutil failure
//  * reflects the bytes rather than a missing path or a host permission denial.
//  */
// const requireRegularPlist = async (
//   path: string,
//   requested: string | undefined,
// ): Promise<Result<null, AnalysisError>> => {
//   try {
//     if (!(await stat(path)).isFile())
//       return err(unreadablePlist(path, requested, "it is not a regular file"));
//     // Opening also observes ACL and macOS privacy denials that stat permits.
//     await (await open(path, "r")).close();
//     return ok(null);
//   } catch (cause: unknown) {
//     const code =
//       cause instanceof Error && "code" in cause ? cause.code : undefined;
//     if (code === "ENOENT" || code === "ENOTDIR")
//       return err(unreadablePlist(path, requested, "no file exists there"));
//     if (code === "EACCES" || code === "EPERM")
//       return err(
//         new BinaryTargetError(
//           path,
//           `permission denied while reading plist (${code})`,
//           { cause },
//         ),
//       );
//     return err(
//       new ProviderAdapterError(IDENTITY.id, "inspect_plist", { cause }),
//     );
//   }
// };
//
// /** The bundle whose Contents/MacOS directory directly holds `path`. */
// const macOSBundleRoot = (path: string): string | undefined => {
//   const programs = dirname(path);
//   const contents = dirname(programs);
//   return basename(programs) === "MacOS" && basename(contents) === "Contents"
//     ? dirname(contents)
//     : undefined;
// };
//
// const resolvePlistPath = async (
//   target: BinaryTarget,
//   requested: string | undefined,
// ): Promise<Result<string, AnalysisError>> => {
//   try {
//     const source = target.sourcePath ?? target.path;
//     if (requested !== undefined && isAbsolute(requested))
//       return ok(resolve(requested));
//     const sourceMetadata = await stat(source);
//     const root = sourceMetadata.isDirectory()
//       ? source
//       : (macOSBundleRoot(target.path) ?? dirname(target.path));
//     if (requested !== undefined) return ok(resolve(root, requested));
//     // A selected plist file is itself the plist to inspect.
//     if (target.kind === "artifact" && target.format === "plist")
//       return ok(target.path);
//     // A bundle target records the Info.plist its program file was declared
//     // in: Contents/Info.plist, or the root plist of an iOS-style bundle.
//     return ok(target.bundleInfoPlist ?? resolve(root, "Contents/Info.plist"));
//   } catch (cause: unknown) {
//     return err(
//       new ProviderAdapterError(IDENTITY.id, "inspect_plist", { cause }),
//     );
//   }
// };
export const _l = 295;
