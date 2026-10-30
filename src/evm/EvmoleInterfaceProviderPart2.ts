export const __stub = 1;
//     if (this.#closing) return Promise.resolve(err(this.#closedError()));
//     const operation = this.#tail.then(async () => {
//       if (this.#closing) return err(this.#closedError());
//       try {
//         return await this.#resources.run(() => this.#inspect(input, options));
//       } catch (cause: unknown) {
//         return err(evmInterfaceFailure(cause, "artifact-read", input.path));
//       }
//     });
//     this.#tail = operation.then(
//       () => undefined,
//       () => undefined,
//     );
//     return operation;
//   }
//
//   async #inspect(
//     input: InspectEvmInterfaceInput,
//     options?: ExecutionOptions,
//   ): Promise<Result<EvmInterfaceExecution, AnalysisError>> {
//     const pending = await this.#retire();
//     if (pending !== undefined) return err(pending);
//     let root: Pick<PrivateRuntimeRoot, "path" | "close"> | undefined;
//     let processOwner: ProviderProcessSupervisor | undefined;
//     let processCleanup:
//       | {
//           readonly reason: string;
//           readonly resources: readonly string[];
//         }
//       | undefined;
//     let retainedOutput: AnalysisCapturedOutput | undefined;
//     let phase: "configuration" | "artifact-read" | "worker" = "configuration";
//     let workerLimits: EvmWorkerLimits | undefined;
//     const limiter =
//       this.environment.REA_EVM_PRLIMIT_COMMAND ?? "/usr/bin/prlimit";
//     let result: Result<EvmInterfaceExecution, AnalysisError>;
//     try {
//       if (options?.signal?.aborted) throw new AnalysisCancelledError(OPERATION);
//       if (process.platform !== "linux" || process.arch !== "x64")
//         throw new AnalysisCapabilityUnavailableError(
//           EVMOLE_PROVIDER_IDENTITY.id,
//           OPERATION,
//           HOST_REQUIREMENT,
//           { userMessage: HOST_REQUIREMENT },
//         );
//       try {
//         if (!isAbsolute(limiter))
//           throw new Error(
//             "REA_EVM_PRLIMIT_COMMAND must be an absolute executable path.",
//           );
//         await access(limiter, constants.X_OK);
//         if (!(await stat(limiter)).isFile())
//           throw new Error(
//             "Configured prlimit must be a regular executable file, not a directory.",
//           );
//       } catch (cause: unknown) {
//         const reason = `Offline EVM interface inspection requires caller-supplied util-linux prlimit: ${limiter}; ${cause instanceof Error ? cause.message : String(cause)}`;
//         throw new AnalysisCapabilityUnavailableError(
//           EVMOLE_PROVIDER_IDENTITY.id,
//           OPERATION,
//           reason,
//           { cause, userMessage: reason },
//         );
//       }
//       let inheritedLimits: string;
//       try {
//         inheritedLimits = await readFile("/proc/self/limits", "utf8");
//       } catch (cause: unknown) {
//         const reason = `Could not read inherited Linux resource limits at /proc/self/limits: ${cause instanceof Error ? cause.message : String(cause)}`;
//         throw new AnalysisCapabilityUnavailableError(
//           EVMOLE_PROVIDER_IDENTITY.id,
//           OPERATION,
//           reason,
//           { cause, userMessage: reason },
//         );
//       }
//       const limits = selectEvmWorkerLimits(inheritedLimits);
//       if (!limits.ok)
//         throw new AnalysisCapabilityUnavailableError(
//           EVMOLE_PROVIDER_IDENTITY.id,
//           OPERATION,
//           limits.error,
//           { userMessage: limits.error },
//         );
//       workerLimits = limits.value;
//       phase = "artifact-read";
//       const carrier = await readStableArtifact(
//         input.path,
//         EVM_INTERFACE_LIMITS.inputBytes,
//         options?.signal,
//         undefined,
//         this.#resources,
//       );
//       phase = "worker";
//       root = await this.createRuntime();
//       const snapshotPath = join(root.path, "carrier.snapshot");
//       const requestPath = join(root.path, "request.json");
//       const replyPath = join(root.path, "reply.json");
//       await writeFile(snapshotPath, carrier.bytes, {
//         flag: "wx",
//         mode: 0o600,
//         ...(options?.signal === undefined ? {} : { signal: options.signal }),
//       });
//       await writeFile(
//         requestPath,
//         JSON.stringify({
//           snapshot_path: snapshotPath,
//           reply_path: replyPath,
//           failure_marker_path: join(root.path, "resource.failure"),
//           encoding: input.encoding,
//         }),
//         { flag: "wx", mode: 0o600 },
//       );
//       const { NODE_OPTIONS: _ambientNodeOptions, ...environment } =
//         this.environment;
//       const execution = await runOwnedCommand(
//         {
//           command: limiter,
//           arguments: [
//             `--as=${String(workerLimits.addressSpaceBytes)}:`,
//             `--fsize=${String(workerLimits.fileSizeBytes)}:`,
//             "--core=0:",
//             `--cpu=${String(workerLimits.cpuSeconds)}:`,
//             "--",
//             process.execPath,
//             "--max-old-space-size=256",
//             "--v8-pool-size=1",
//             "--disable-wasm-trap-handler",
//             fileURLToPath(
//               new URL("./EvmoleInterfaceWorker.js", import.meta.url),
//             ),
//             requestPath,
//           ],
//           cwd: root.path,
//           expectedCommand: null,
//           runId: `rea-evm-interface-${randomUUID()}`,
//           hostEnvironment: environment,
//         },
//         {
//           timeoutMs: EVM_INTERFACE_LIMITS.timeoutMs,
//           diagnosticBytes: EVM_INTERFACE_LIMITS.diagnosticBytes,
//         },
//         {
//           ...(options?.signal === undefined ? {} : { signal: options.signal }),
//           ...(this.launcher === undefined ? {} : { launcher: this.launcher }),
//           retainCleanup: (owner, cleanup) => {
//             processOwner = owner;
//             processCleanup = {
//               reason: cleanup.reason,
//               resources:
//                 owner.launch.ownership === undefined
//                   ? ["owned-worker"]
//                   : ownedCommandResources(owner.launch.ownership, root?.path),
//             };
//           },
//         },
//       );
//       const capturedOutput = capturedEvmOutput(execution);
//       retainedOutput = capturedOutput;
//       let reply: z.output<typeof replySchema>;
//       try {
//         const file = await readStableArtifact(
//           replyPath,
//           EVM_INTERFACE_LIMITS.outputBytes,
//           options?.signal,
//           undefined,
//           this.#resources,
//         );
//         reply = replySchema.parse(JSON.parse(file.bytes.toString("utf8")));
export const _l = 169;
