export const __stub = 1;
//         ownership: started.ownership,
//         cleanup,
//         launcherCommand: linuxDemo?.command ?? this.options.launcherPath,
//         ...(lease === undefined ? {} : { releaseLease: () => lease.release() }),
//       };
//       return ownsProcessLifetime
//         ? ok({
//             ...ownedLauncher,
//             providerLifetime: "launcher-process",
//             shutdownMode: "process-cleanup",
//           })
//         : ok({
//             ...ownedLauncher,
//             providerLifetime: "external-application",
//             shutdownMode: "bridge-request",
//             ...(nativeHelperVerified
//               ? { nativeHelperVerified: true as const }
//               : {}),
//             // The vendor helper interpolates these values into AppleScript
//             // literals without escaping. Preserve them, but withhold the
//             // pre-handoff conclusion when they can alter that script.
//             ...((this.dependencies.platform ?? process.platform) === "darwin" &&
//             ![this.options.launcherPath, ...argumentsForTarget].some((value) =>
//               /["\\\r\n]/u.test(value),
//             )
//               ? { authorizationDenialBeforeHandoff: true as const }
//               : {}),
//           });
//     } catch (cause: unknown) {
//       return err(hopperLaunchFailure(cause, signal));
//     } finally {
//       // Remove the token-bearing bootstrap file on every non-success path.
//       // Only the launched process needs the file; all error returns, early
//       // cancellations, and thrown exceptions must not leave it on disk.
//       if (!launched)
//         await rm(bootstrapPath, { force: true }).catch(() => undefined);
//     }
//   }
//
//   async #acquireLaunchLease(
//     runId: string,
//   ): Promise<Result<HopperTargetLease | undefined, HopperStartError>> {
//     const platform = this.dependencies.platform ?? process.platform;
//     const applicationLease =
//       platform === "linux" && usesLinuxDemo(this.options);
//     if (!applicationLease && platform !== "darwin") return ok(undefined);
//     try {
//       const acquisition = applicationLease
//         ? await (
//             this.dependencies.acquireApplicationLease ??
//             acquireLinuxHopperApplicationLease
//           )({ runId })
//         : await (
//             this.dependencies.acquireTargetLease ?? acquireHopperTargetLease
//           )({
//             targetPath: this.options.targetPath,
//             targetKind: this.options.targetKind,
//             loaderArgs: this.options.loaderArgs,
//             runId,
//           });
//       if (!acquisition.acquired)
//         return err(
//           new HopperStartError({
//             ownerRunId: acquisition.owner.runId,
//             userMessage: applicationLease
//               ? `Linux Hopper is already active in REA session ${acquisition.owner.runId}; it cannot open ${this.options.targetPath} in another session. This build forwards new launches to the existing application. Use the owning REA session to switch targets, or close it before retrying.`
//               : `This Hopper target is already open in REA session ${acquisition.owner.runId}. ` +
//                 "Use that REA session or close it before opening this target again.",
//           }),
//         );
//       return ok(acquisition.lease);
//     } catch (cause: unknown) {
//       return err(
//         cause instanceof HopperStartError
//           ? cause
//           : new HopperStartError({ cause }),
//       );
//     }
//   }
//
//   async #writeBootstrap(
//     session: BridgeSession,
//     ownsProcessLifetime: boolean,
//     loadedPath: string,
//   ): Promise<Result<string, HopperStartError>> {
//     const bootstrapPath = `${session.directory}/bootstrap.py`;
//     try {
//       await writeFile(
//         bootstrapPath,
//         bridgeBootstrapSource(
//           session,
//           this.options,
//           ownsProcessLifetime,
//           loadedPath,
//         ),
//         { encoding: "utf8", mode: 0o600 },
//       );
//       await chmod(bootstrapPath, 0o600);
//       return ok(bootstrapPath);
//     } catch (cause: unknown) {
//       // Clean up any partially written bootstrap file that may contain the token.
//       await rm(bootstrapPath, { force: true }).catch(() => undefined);
//       return err(new HopperStartError({ cause }));
//     }
//   }
//
//   async #privateDisplay(signal: AbortSignal | undefined): Promise<
//     | {
//         readonly ok: true;
//         readonly strategy: LinuxPrivateDisplayRunnableStrategy | undefined;
//       }
//     | {
//         readonly ok: false;
//         readonly error: HopperProcessError | HopperCancelledError;
//       }
//   > {
//     if (!usesLinuxDemo(this.options)) return { ok: true, strategy: undefined };
//     const selection = await (
//       this.dependencies.selectPrivateDisplay ??
//       selectLinuxPrivateDisplayStrategy
//     )({
//       helperPath: this.options.demoHelperPath,
//       environment: this.options.environment,
//       ...(signal === undefined ? {} : { signal }),
//     });
//     if (signal?.aborted === true)
//       return { ok: false, error: new HopperCancelledError() };
//     return selection.ok
//       ? { ok: true, strategy: selection.strategy }
//       : {
//           ok: false,
//           error: new HopperProcessError(selection.exitCode, {
//             diagnostic: selection.diagnostic,
//           }),
//         };
//   }
// }
//
// const bridgeBootstrapSource = (
//   session: BridgeSession,
//   options: SharedHopperApplicationLauncherOptions,
//   ownsProcessLifetime: boolean,
//   loadedPath: string,
// ): string =>
//   [
//     `REA_SOCKET = ${JSON.stringify(session.socketPath)}`,
//     `REA_TOKEN = ${JSON.stringify(session.token)}`,
//     `REA_RUN_ID = ${JSON.stringify(session.runId)}`,
//     `REA_TARGET_PATH = ${JSON.stringify(loadedPath)}`,
//     `REA_OWNS_PROCESS_LIFETIME = ${ownsProcessLifetime ? "True" : "False"}`,
//     `REA_RECONNECT_TIMEOUT_SECONDS = ${HOPPER_SHUTDOWN_TIMEOUT_MS / 1_000}`,
//     `exec(compile(open(${JSON.stringify(options.bridgeScriptPath)}, 'rb').read(), ${JSON.stringify(options.bridgeScriptPath)}, 'exec'))`,
//     "",
//   ].join("\n");
//
// const launchHopperProcess = async (input: {
export const _l = 156;
