export const __stub = 1;
//     };
//
// /**
//  * Spawn a provider in an owned Windows job or dedicated POSIX process group.
//  *
//  * The caller remains responsible for persisting any ownership manifest and for
//  * selecting provider-specific command arguments or environment values.
//  */
// export const spawnOwnedProviderProcess = async (
//   options: OwnedProviderProcessSpawnOptions,
// ): Promise<SpawnedOwnedProviderProcess> => {
//   options.signal?.throwIfAborted();
//   await prepareProcessOwnershipInspection(options.signal);
//   options.signal?.throwIfAborted();
//   const platform = options.platform ?? process.platform;
//   const sweepTokenOwnedProcesses =
//     options.sweepTokenOwnedProcesses === true && platform !== "win32";
//   let captureBaseline: ProcessOwnershipBaseline | undefined;
//   if (sweepTokenOwnedProcesses) {
//     const capture = systemProcessOwnershipHost.captureBaseline;
//     if (capture === undefined)
//       throw new Error("Process ownership baseline is unavailable on this host");
//     captureBaseline = await capture(options.signal);
//     options.signal?.throwIfAborted();
//   }
//   const hostEnvironment = options.hostEnvironment ?? process.env;
//   const environment = {
//     ...hostEnvironment,
//     ...options.env,
//     REA_PROCESS_RUN_ID: options.runId,
//   };
//   if (platform === "win32" && process.platform === "win32") {
//     const child = new WindowsOwnedProcess(
//       options.command,
//       options.arguments,
//       options.cwd,
//       environment,
//       options.windowsVerbatimArguments ?? false,
//       {
//         protocolStdin: options.stdin === "pipe",
//         ...(options.memoryLimitBytes === undefined
//           ? {}
//           : { memoryLimitBytes: options.memoryLimitBytes }),
//       },
//     );
//     return {
//       process: child,
//       ownership: {
//         runId: options.runId,
//         leaderPid: child.pid,
//         processGroupId: child.pid,
//         expectedParentPid: process.pid,
//       },
//       cleanup: () => child.cleanup(),
//     };
//   }
//   if (options.memoryLimitBytes !== undefined)
//     throw new Error(
//       "Owned process memory limits require the Windows Job Object launcher; no limit can be enforced on this host.",
//     );
//   const child = spawn(options.command, [...options.arguments], {
//     shell: false,
//     windowsHide: true,
//     stdio: [options.stdin ?? "ignore", "pipe", "pipe"],
//     detached: platform !== "win32",
//     windowsVerbatimArguments: options.windowsVerbatimArguments ?? false,
//     env: environment,
//     ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
//   });
//   await waitForSpawn(child);
//   const pid = child.pid;
//   if (pid === undefined) throw new Error("Provider launcher has no process ID");
//   const ownership: OwnedProcessGroup = {
//     runId: options.runId,
//     leaderPid: pid,
//     processGroupId: pid,
//     expectedParentPid: process.pid,
//     ...(sweepTokenOwnedProcesses
//       ? {
//           sweepTokenOwnedProcesses: true,
//           captureBaseline: captureBaseline!,
//         }
//       : {}),
//     ...(options.expectedCommand === null
//       ? {}
//       : { expectedCommand: options.expectedCommand ?? options.command }),
//   };
//   return { process: child, ownership };
// };
//
// /**
//  * Supervises only generic process resources; wire protocol remains adapter-owned.
//  *
//  * Output retention is complete per stream; adapters own resource budgets. Stop
//  * first honors token-verified group cleanup when supplied, otherwise it uses a
//  * bounded TERM-to-KILL escalation for a directly owned child.
//  */
// export class ProviderProcessSupervisor {
//   readonly #options: ProviderProcessSupervisorOptions;
//   readonly #stdout = new ProcessOutputCapture();
//   readonly #stderr = new ProcessOutputCapture();
//   readonly #exit = deferred<ProviderProcessExitObservation>();
//   readonly #outputClose = deferred<void>();
//   #outputClosed = false;
//   #stdoutObservedBytes = 0;
//   #stderrObservedBytes = 0;
//   #diagnosticTruncated = false;
//   readonly #onStdout = (chunk: Buffer | string): void => {
//     this.#capture("stdout", this.#stdout, chunk);
//   };
//   readonly #onStderr = (chunk: Buffer | string): void => {
//     this.#capture("stderr", this.#stderr, chunk);
//   };
//   readonly #onStdoutError = (cause: Error): void => {
//     this.#recordStreamError("stdout", cause);
//   };
//   readonly #onStderrError = (cause: Error): void => {
//     this.#recordStreamError("stderr", cause);
//   };
//   readonly #onExit = (
//     code: number | null,
//     signal: NodeJS.Signals | null,
//   ): void => {
//     this.#recordExit(code, signal);
//   };
//   readonly #onClose = (
//     code: number | null,
//     signal: NodeJS.Signals | null,
//   ): void => {
//     this.#recordExit(code, signal);
//     this.#outputClosed = true;
//     this.#outputClose.resolve(undefined);
//   };
//   readonly #onError = (cause: Error): void => {
//     this.#options.onDiagnostic?.({ type: "error", message: cause.message });
//   };
//   #exitObservation: ProviderProcessExitObservation | undefined;
//   #stopPromise: Promise<ProviderProcessStopResult> | undefined;
//   #disposed = false;
//   #maxDiagnosticBytes: number | undefined;
//
//   constructor(
//     readonly launch: ProviderProcessLaunch,
//     options: ProviderProcessSupervisorOptions = {},
//   ) {
//     this.#options = options;
//     this.#maxDiagnosticBytes = options.maxDiagnosticBytes;
//     if (options.captureStdout !== false)
//       this.#attach(launch.process.stdout, "stdout");
//     this.#attach(launch.process.stderr, "stderr");
//     launch.process.once("exit", this.#onExit);
//     launch.process.once("close", this.#onClose);
//     launch.process.on("error", this.#onError);
//     if (launch.process.exitCode !== null || launch.process.signalCode !== null)
//       this.#recordExit(launch.process.exitCode, launch.process.signalCode);
//   }
//
//   /**
//    * Recorded process exit without concatenating retained stream diagnostics.
//    * Undefined until exit or close is observed.
//    */
//   observedExit(): ProviderProcessExitObservation | undefined {
//     const exit = this.#exitObservation;
//     if (exit === undefined) return undefined;
//     return { code: exit.code, signal: exit.signal };
//   }
//
//   /** Latest retained output and exit observation, with explicit configured truncation. */
//   snapshot(): ProviderProcessSnapshot {
//     const outputIncomplete = this.launch.process.outputIncomplete === true;
//     return {
//       ...(this.#diagnosticTruncated || outputIncomplete
//         ? { diagnosticTruncated: true }
//         : {}),
//       stdout: this.#stdout.snapshot(this.#stdoutObservedBytes),
export const _l = 175;
