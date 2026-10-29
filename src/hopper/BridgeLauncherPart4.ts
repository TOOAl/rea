export const __stub = 1;
//   readonly options: HopperApplicationLauncherOptions;
//   readonly session: BridgeSession;
//   readonly bootstrapPath: string;
//   readonly ownsProcessLifetime: boolean;
//   readonly argumentsForTarget: readonly string[];
//   readonly linuxDemo: ReturnType<typeof linuxDemoLaunch>;
//   readonly signal: AbortSignal | undefined;
// }): Promise<Awaited<ReturnType<typeof spawnOwnedProviderProcess>> | null> => {
//   const ownershipCommand =
//     input.linuxDemo?.ownershipCommand ?? input.options.launcherPath;
//   const spawn = (arguments_: readonly string[]) =>
//     spawnOwnedProviderProcess({
//       command: input.options.launcherPath,
//       arguments: arguments_,
//       runId: input.session.runId,
//       expectedCommand: ownershipCommand,
//       hostEnvironment: input.options.environment,
//       ...(input.signal === undefined ? {} : { signal: input.signal }),
//     });
//   if (input.linuxDemo !== undefined)
//     return spawnOwnedProviderProcess({
//       command: input.linuxDemo.command,
//       arguments: input.linuxDemo.args,
//       runId: input.session.runId,
//       expectedCommand: ownershipCommand,
//       hostEnvironment: input.options.environment,
//       // The helper observes EOF when this REA process exits, including SIGKILL.
//       stdin: "pipe",
//       ...(input.signal === undefined ? {} : { signal: input.signal }),
//     });
//   return spawn(input.argumentsForTarget);
// };
//
// export const linuxDemoLaunch = (
//   options: HopperApplicationLauncherOptions,
//   session: BridgeSession,
//   hopperArgs: readonly string[],
//   strategy: LinuxPrivateDisplayRunnableStrategy | undefined,
//   expectedSha256?: string,
// ):
//   | {
//       readonly command: string;
//       readonly args: readonly string[];
//       readonly ownershipCommand: string;
//     }
//   | undefined => {
//   if (!usesLinuxDemo(options) || options.demoHelperPath === undefined)
//     return undefined;
//   if (expectedSha256 === undefined || !/^[a-f0-9]{64}$/u.test(expectedSha256))
//     throw new TypeError(
//       "Linux Hopper launch requires an authenticated launcher SHA-256",
//     );
//   const helperArguments = [
//     options.demoHelperPath,
//     "--owner-stdin",
//     "--strategy",
//     strategy ?? "direct",
//     ...(strategy === "user-mount-namespace" ? ["--mount-private-x11"] : []),
//     "--hopper",
//     options.launcherPath,
//     "--expected-launcher-sha256",
//     expectedSha256,
//     "--socket",
//     session.socketPath,
//     "--",
//     options.launcherPath,
//     ...hopperArgs,
//   ];
//   if (strategy === "user-mount-namespace")
//     return {
//       command: "/usr/bin/unshare",
//       ownershipCommand: "/usr/bin/python3",
//       args: [
//         "--user",
//         "--map-root-user",
//         "--mount",
//         "--propagation",
//         "private",
//         "/usr/bin/python3",
//         ...helperArguments,
//       ],
//     };
//   return {
//     command: "/usr/bin/python3",
//     ownershipCommand: "/usr/bin/python3",
//     args: helperArguments,
//   };
// };
//
// const hopperLaunchFailure = (
//   cause: unknown,
//   signal: AbortSignal | undefined,
// ): HopperCancelledError | HopperStartError =>
//   signal?.aborted === true
//     ? new HopperCancelledError()
//     : new HopperStartError({ cause });
//
// /** Select the publisher-verified demo adapter from the caller's explicit launch mode. */
// export const usesLinuxDemo = (
//   options: HopperApplicationLauncherOptions,
// ): options is HopperApplicationLauncherOptions & {
//   readonly launchMode: "verified_linux_demo";
//   readonly demoHelperPath: string;
// } => options.launchMode === "verified_linux_demo";
//
// const prepareHopperApplication = async (
//   launcherPath: string,
//   environment: Readonly<NodeJS.ProcessEnv>,
//   signal?: AbortSignal,
// ): Promise<boolean> => {
//   const appBundle = hopperApplicationBundle(launcherPath);
//   if (appBundle === undefined) return signal?.aborted !== true;
//   const executablePath = join(appBundle, "Contents/MacOS/Hopper Disassembler");
//   if (await processIsRunning(executablePath, environment))
//     return signal?.aborted !== true;
//   // This reduces activation when Hopper is cold, but the vendor launcher that
//   // follows may still activate its window. See HopperApplicationLauncher.
//   await execFileAsync(
//     "/usr/bin/open",
//     ["--hide", "--background", "-a", appBundle],
//     { env: environment },
//   );
//   return (
//     (await waitForAbortableDelay(HOPPER_BACKGROUND_STARTUP_MS, signal)) ===
//     "elapsed"
//   );
// };
//
// const hopperApplicationBundle = (launcherPath: string): string | undefined => {
//   if (basename(launcherPath) !== "hopper") return undefined;
//   const candidate = dirname(dirname(dirname(launcherPath)));
//   return extname(candidate) === ".app" ? candidate : undefined;
// };
//
// const processIsRunning = async (
//   executablePath: string,
//   environment: Readonly<NodeJS.ProcessEnv>,
// ): Promise<boolean> => {
//   try {
//     const processes = await execFileOutput(
//       "/bin/ps",
//       ["-ax", "-o", "command="],
//       { env: environment },
//     );
//     return processes.stdout
//       .split("\n")
//       .some((command) => command.trim() === executablePath);
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional process probing; failure means not running.
//     void cause;
//     return false;
//   }
// };
export const _l = 153;
