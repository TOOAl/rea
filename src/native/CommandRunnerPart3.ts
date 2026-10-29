export const __stub = 1;
//         "Previously owned native command cleanup remains incomplete",
//       ),
//     },
//     null,
//     failures
//       .map(({ reason, resources }) => `${resources.join(", ")}: ${reason}`)
//       .join("; "),
//     [...new Set(failures.flatMap(({ resources }) => resources))],
//   );
//
// /** Executable path and SHA-256 sampled during one tool resolution. */
// export interface ResolvedTool {
//   readonly path: string;
//   readonly sha256: string;
// }
//
// const ALLOWED_TOOLS = new Set([
//   "codesign",
//   "dyld_info",
//   "dwarfdump",
//   "file",
//   "lipo",
//   "nm",
//   "otool",
//   "plutil",
//   "strings",
//   "swift-demangle",
//   "vtool",
// ]);
//
// /** Locate an Xcode tool through `xcrun --find` and sample its executable digest. */
// export const resolveXcrunTool = async (
//   tool: string,
//   environment: Readonly<NodeJS.ProcessEnv>,
//   signal?: AbortSignal,
//   launcher?: NativeCommandLauncher,
// ): Promise<Result<ResolvedTool, NativeCommandFailure>> => {
//   const found = await captureProcess(
//     "/usr/bin/xcrun",
//     ["--find", tool],
//     "xcrun",
//     signal === undefined ? {} : { signal },
//     environment,
//     launcher,
//   );
//   if (!found.ok) {
//     return err(
//       new NativeCommandFailure(
//         tool,
//         found.error.reason === "nonzero-exit" ||
//           found.error.reason === "unavailable"
//           ? "unavailable"
//           : found.error.reason,
//         found.error.exitCode,
//         {
//           cause: found.error,
//           ...(found.error.cleanupOwner === undefined
//             ? {}
//             : { cleanupOwner: found.error.cleanupOwner }),
//           ...(found.error.cleanupFailures.length === 0
//             ? {}
//             : { cleanupFailures: found.error.cleanupFailures }),
//           ...(found.error.detail === null
//             ? {}
//             : { detail: found.error.detail }),
//         },
//         found.error.capture,
//         found.error.cleanupFailure,
//         found.error.cleanupResources,
//       ),
//     );
//   }
//   if (found.value.exitCode !== 0)
//     return err(
//       new NativeCommandFailure(
//         tool,
//         "unavailable",
//         found.value.exitCode,
//         undefined,
//         failureCapture(found.value, false),
//       ),
//     );
//   const candidate = found.value.stdout.trim();
//   if (!candidate.startsWith("/"))
//     return err(
//       new NativeCommandFailure(
//         tool,
//         "unavailable",
//         found.value.exitCode,
//         undefined,
//         failureCapture(found.value, false),
//       ),
//     );
//   try {
//     const path = await realpath(candidate);
//     return ok({ path, sha256: await hashFile(path, signal) });
//   } catch (cause: unknown) {
//     const capture = failureCapture(found.value, false);
//     if (signal?.aborted === true)
//       return err(
//         new NativeCommandFailure(
//           tool,
//           "cancelled",
//           capture.exitCode,
//           { cause },
//           capture,
//         ),
//       );
//     return err(
//       new NativeCommandFailure(
//         tool,
//         "io",
//         capture.exitCode,
//         { cause },
//         capture,
//       ),
//     );
//   }
// };
//
// type ProcessCapture = Omit<
//   NativeCommandCapture,
//   | "tool"
//   | "executable"
//   | "executableSha256"
//   | "toolVersion"
//   | "versionReason"
//   | "arguments"
// >;
//
// /** Bound one command's output for failure diagnostics, keeping observed byte totals. */
export const _l = 131;
