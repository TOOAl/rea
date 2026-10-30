export const __stub = 1;
//     result = await host.run(arguments_, signal, options);
//   } catch (cause: unknown) {
//     if (cause instanceof ArtifactReaderFailure) throw cause;
//     if (cause instanceof Error && cause.name === "AbortError")
//       throw new NativeDmgCommandFailure(
//         { reason: "cancelled" },
//         "DMG operation cancelled",
//         execFileOutputFailure(cause)?.stdout ?? "",
//         { cause },
//       );
//     const output = execFileOutputFailure(cause);
//     throw new NativeDmgCommandFailure(
//       classifyCommandFailure(cause, arguments_[0]),
//       `hdiutil ${arguments_[0] ?? "operation"} failed: ${describeCommandFailure(
//         cause,
//         arguments_,
//       )}`,
//       output?.stdout ?? "",
//       { cause, processNotStarted: processNotStarted(cause) },
//     );
//   }
//   if (result.exitCode !== 0) {
//     const failure = {
//       command: "/usr/bin/hdiutil",
//       exitCode: result.exitCode,
//       ...(result.cause === undefined
//         ? {}
//         : { code: processExitCode(result.cause) }),
//       stdout: result.stdout,
//       ...(result.stderr === undefined ? {} : { stderr: result.stderr }),
//     };
//     const classification = classifyCommandFailure(failure, arguments_[0]);
//     const details = describeCommandFailure(failure, arguments_);
//     const unknownVerifyFailure =
//       arguments_[0] === "verify" && classification.reason === "unavailable";
//     throw new NativeDmgCommandFailure(
//       classification,
//       unknownVerifyFailure
//         ? `hdiutil verify failed; captured diagnostics do not establish the failure cause: ${details}`
//         : `hdiutil ${arguments_[0] ?? "operation"} failed: ${details}`,
//       result.stdout,
//       { cause: result.cause ?? failure, exitCode: result.exitCode },
//     );
//   }
//   return { stdout: result.stdout, exitCode: 0 };
// };
//
// const describeCommandFailure = (
//   cause: unknown,
//   arguments_: readonly string[],
// ): string => {
//   const fields: Record<string, string | number | readonly string[]> = {
//     command: "/usr/bin/hdiutil",
//     arguments: [...arguments_],
//   };
//   if (typeof cause === "object" && cause !== null) {
//     for (const key of [
//       "code",
//       "exitCode",
//       "errno",
//       "syscall",
//       "signal",
//       "stdout",
//       "stderr",
//     ] as const) {
//       const value = Reflect.get(cause, key);
//       if (typeof value === "string" || typeof value === "number")
//         fields[key] = value;
//     }
//     const code = Reflect.get(cause, "code");
//     if (typeof code === "number") fields.exitCode = code;
//   }
//   if (cause instanceof ArtifactReaderFailure) fields.message = cause.message;
//   else if (cause instanceof Error) fields.message = cause.message;
//   return JSON.stringify(fields);
// };
//
// const processExitCode = (cause: unknown): number | undefined => {
//   if (typeof cause !== "object" || cause === null) return undefined;
//   const exitCode = Reflect.get(cause, "exitCode");
//   if (typeof exitCode === "number") return exitCode;
//   const code = Reflect.get(cause, "code");
//   return typeof code === "number" ? code : undefined;
// };
//
// const processOutput = (cause: unknown, field: "stdout" | "stderr"): string => {
//   if (typeof cause !== "object" || cause === null) return "";
//   const value = Reflect.get(cause, field);
//   return typeof value === "string" ? value : "";
// };
//
// const classifyCommandFailure = (
//   cause: unknown,
//   operation: string | undefined,
// ): {
//   readonly reason: ArtifactReaderFailure["reason"];
//   readonly verifyDiagnostic?: string;
// } => {
//   if (typeof cause !== "object" || cause === null)
//     return { reason: "unavailable" };
//   const code = Reflect.get(cause, "code");
//   const exitCode = Reflect.get(cause, "exitCode");
//   if (typeof code === "number" || typeof exitCode === "number") {
//     if (operation !== "verify") return { reason: "unavailable" };
//     const diagnostic = verifyFailureDiagnostic(
//       processOutput(cause, "stdout"),
//       processOutput(cause, "stderr"),
//     );
//     return {
//       reason: verifyFailureReason(diagnostic),
//       ...(diagnostic === undefined ? {} : { verifyDiagnostic: diagnostic }),
//     };
//   }
//   if (code === "ENOENT") {
//     const syscall = Reflect.get(cause, "syscall");
//     return {
//       reason:
//         typeof syscall === "string" && syscall.startsWith("spawn")
//           ? "unavailable"
//           : "io",
//     };
//   }
//   if (
//     code === "EACCES" ||
//     code === "EPERM" ||
//     code === "EIO" ||
//     code === "ENOTDIR" ||
//     code === "EISDIR" ||
//     code === "ENODEV" ||
//     code === "EROFS" ||
//     code === "EMFILE" ||
//     code === "ENFILE"
//   )
//     return { reason: "io" };
//   return { reason: "unavailable" };
// };
//
// const verifyFailureReason = (
//   diagnostic: string | undefined,
// ): ArtifactReaderFailure["reason"] => {
//   switch (diagnostic) {
//     // hdiutil follows AppleLanguages, so en-GB and en-AU spell it "recognised".
//     case "image not recognized":
//     case "image not recognised":
//       return "format";
//     case "invalid checksum":
//     case "image data corrupted":
//       return "integrity";
//     case "No such file or directory":
//     case "Permission denied":
//     case "Input/output error":
//       return "io";
//     default:
//       return "unavailable";
//   }
// };
//
// const verifyFailureDiagnostic = (
//   stdout: string,
//   stderr: string,
// ): string | undefined => {
//   const prefix = "hdiutil: verify failed - ";
//   return `${stdout}\n${stderr}`
//     .split(/\r?\n/u)
//     .map((line) => line.trim())
//     .find((line) => line.startsWith(prefix))
//     ?.slice(prefix.length);
// };
//
// const command = (
//   arguments_: readonly string[],
//   effects: ArtifactCommand["effects"],
//   exitCode: number | null = 0,
// ): ArtifactCommand => ({
//   tool: "/usr/bin/hdiutil",
//   arguments: [...arguments_],
//   tool_version: null,
//   executable_sha256: null,
//   exit_code: exitCode,
//   effects,
// });
export const _l = 181;
