export const __stub = 1;
//   private readonly environment: NodeJS.ProcessEnv;
//   readonly #pendingCleanup = new Set<ProviderProcessSupervisor>();
//   #cleanupAttempt: Promise<readonly NativeCommandCleanupFailure[]> | undefined;
//   constructor(
//     environment: Readonly<NodeJS.ProcessEnv>,
//     private readonly resolveTool: NativeToolResolver = (tool, signal) =>
//       resolveXcrunTool(tool, this.environment, signal, this.launcher),
//     private readonly launcher?: NativeCommandLauncher,
//   ) {
//     this.environment = snapshotEnvironment(environment);
//   }
//
//   run(
//     tool: string,
//     arguments_: readonly string[],
//     options: NativeCommandOptions,
//   ): Promise<Result<NativeCommandCapture, NativeCommandFailure>> {
//     if (!ALLOWED_TOOLS.has(tool))
//       return Promise.resolve(
//         err(new NativeCommandFailure(tool, "unavailable")),
//       );
//     return this.#runAfterCleanup(tool, arguments_, options);
//   }
//
//   /** Retry every retained owner; a failed retry prevents another command launch. */
//   retryCleanup(): Promise<readonly NativeCommandCleanupFailure[]> {
//     if (this.#pendingCleanup.size === 0) return Promise.resolve([]);
//     if (this.#cleanupAttempt !== undefined) return this.#cleanupAttempt;
//     this.#cleanupAttempt = this.#retryCleanup().finally(() => {
//       this.#cleanupAttempt = undefined;
//     });
//     return this.#cleanupAttempt;
//   }
//
//   async #runAfterCleanup(
//     tool: string,
//     arguments_: readonly string[],
//     options: NativeCommandOptions,
//   ): Promise<Result<NativeCommandCapture, NativeCommandFailure>> {
//     const pendingFailures = await this.retryCleanup();
//     if (pendingFailures.length > 0)
//       return err(commandCleanupFailure(tool, pendingFailures));
//     const resolved = await this.resolveTool(
//       tool,
//       options.signal,
//       this.launcher,
//     );
//     if (!resolved.ok) {
//       if (resolved.error.cleanupOwner !== undefined)
//         this.#pendingCleanup.add(resolved.error.cleanupOwner);
//       return resolved;
//     }
//     const captured = await captureProcess(
//       resolved.value.path,
//       arguments_,
//       tool,
//       options,
//       this.environment,
//       this.launcher,
//     );
//     if (!captured.ok && captured.error.cleanupOwner !== undefined)
//       this.#pendingCleanup.add(captured.error.cleanupOwner);
//     return captured.ok
//       ? ok({
//           ...captured.value,
//           tool,
//           executable: resolved.value.path,
//           executableSha256: resolved.value.sha256,
//           toolVersion: null,
//           versionReason:
//             "Tool exposes no uniform stable version flag; executable SHA-256 is a prelaunch file sample and does not prove atomic OS image binding.",
//           arguments: [...arguments_],
//         })
//       : captured;
//   }
//
//   async #retryCleanup(): Promise<readonly NativeCommandCleanupFailure[]> {
//     const failures: NativeCommandCleanupFailure[] = [];
//     for (const owner of this.#pendingCleanup) {
//       let reason: string | undefined;
//       try {
//         const stopped = await owner.stop();
//         if (stopped.status !== "incomplete") {
//           this.#pendingCleanup.delete(owner);
//           continue;
//         }
//         reason = stopped.reason || "native command cleanup remains unverified";
//       } catch (cause: unknown) {
//         reason =
//           cause instanceof Error
//             ? cause.message || cause.name
//             : String(cause) || "native command cleanup failed unexpectedly";
//       }
//       failures.push({
//         owner,
//         reason: reason ?? "native command cleanup remains unverified",
//         resources: commandProcessResources(owner),
//       });
//     }
//     return failures;
//   }
// }
//
// const commandProcessResources = (
//   owner: ProviderProcessSupervisor,
// ): readonly string[] => {
//   const ownership = owner.launch.ownership;
//   return ownership === undefined
//     ? ["native-command-process"]
//     : [
//         ownership.runId,
//         `pid:${String(ownership.leaderPid)}`,
//         `process-group:${String(ownership.processGroupId)}`,
//       ];
// };
//
// const commandCleanupFailure = (
//   tool: string,
//   failures: readonly NativeCommandCleanupFailure[],
// ): NativeCommandFailure =>
//   new NativeCommandFailure(
//     tool,
//     "io",
//     null,
//     {
//       cleanupFailures: failures,
//       cause: new AggregateError(
//         failures.map(
//           ({ reason, resources }) =>
//             new Error(`${reason} (${resources.join(", ")})`),
//         ),
export const _l = 131;
