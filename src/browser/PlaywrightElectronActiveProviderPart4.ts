export const __stub = 1;
//       "PATH",
//       "TMP",
//       "TMPDIR",
//       "USER",
//       "DISPLAY",
//       "WAYLAND_DISPLAY",
//       ...(platform === "win32"
//         ? [
//             "SYSTEMROOT",
//             "TEMP",
//             "APPDATA",
//             "LOCALAPPDATA",
//             "USERPROFILE",
//             "COMSPEC",
//             "PATHEXT",
//             "PROGRAMDATA",
//             "ALLUSERSPROFILE",
//             "USERNAME",
//             "SYSTEMDRIVE",
//             "HOMEDRIVE",
//             "HOMEPATH",
//           ]
//         : []),
//     ]
//       .map((name) => [name, environment[name]] as const)
//       .filter(
//         (entry): entry is readonly [string, string] => entry[1] !== undefined,
//       ),
//     ["REA_PROCESS_RUN_ID", runId] as const,
//   ]);
//
// const PLAYWRIGHT_INTERNAL_FRAME = /playwright-core[\\/]lib[\\/]/;
// interface LaunchRejectionScope {
//   failure?: unknown;
// }
// const activeLaunches = new Set<LaunchRejectionScope>();
// const heldLaunchRejections = new Map<
//   Promise<unknown>,
//   {
//     readonly reason: Error;
//     readonly candidates: Set<LaunchRejectionScope>;
//     readonly hadExternalListener: boolean;
//   }
// >();
//
// const holdLaunchRejection = (
//   reason: unknown,
//   promise: Promise<unknown>,
// ): void => {
//   if (
//     !(reason instanceof Error) ||
//     !PLAYWRIGHT_INTERNAL_FRAME.test(reason.stack ?? "")
//   )
//     throw reason;
//   if (!heldLaunchRejections.has(promise))
//     heldLaunchRejections.set(promise, {
//       reason,
//       candidates: new Set(activeLaunches),
//       hadExternalListener: process
//         .listeners("unhandledRejection")
//         .some((listener) => listener !== holdLaunchRejection),
//     });
// };
//
// const forwardLaunchRejection = (
//   reason: Error,
//   hadExternalListener: boolean,
// ): void => {
//   // Listeners present at the original event already observed it. When the
//   // holding listener was the only listener, restore Node's fatal behavior.
//   if (!hadExternalListener)
//     process.nextTick(() => {
//       throw reason;
//     });
// };
//
// /** Playwright leaves rejected launch promises unhandled; absorb only those that repeat this launch's failure. */
// const containLaunchRejections = async <T>(
//   launch: () => Promise<T>,
// ): Promise<T> => {
//   const scope: LaunchRejectionScope = {};
//   if (activeLaunches.size === 0)
//     process.on("unhandledRejection", holdLaunchRejection);
//   activeLaunches.add(scope);
//   try {
//     return await launch();
//   } catch (cause: unknown) {
//     scope.failure = cause;
//     throw cause;
//   } finally {
//     await new Promise<void>((resolve) => setImmediate(resolve));
//     activeLaunches.delete(scope);
//     if (activeLaunches.size === 0)
//       process.off("unhandledRejection", holdLaunchRejection);
//     for (const [
//       promise,
//       { reason, candidates, hadExternalListener },
//     ] of heldLaunchRejections) {
//       if (!candidates.delete(scope)) continue;
//       if (
//         scope.failure instanceof Error &&
//         reason.message !== "" &&
//         scope.failure.message.includes(reason.message)
//       )
//         heldLaunchRejections.delete(promise);
//       else if (candidates.size === 0) {
//         heldLaunchRejections.delete(promise);
//         forwardLaunchRejection(reason, hadExternalListener);
//       }
//     }
//   }
// };
//
// const providerError = (cause: unknown): AnalysisError =>
//   cause instanceof AnalysisError
//     ? cause
//     : new ProviderAdapterError(
//         PLAYWRIGHT_ELECTRON_ACTIVE_PROVIDER_IDENTITY.id,
//         OPERATION,
//         {
//           cause,
//           diagnostics: {
//             message: cause instanceof Error ? cause.message : String(cause),
//           },
//         },
//       );
export const _l = 126;
