export const __stub = 1;
//       throw cause;
//     });
//     return this.#closePromise;
//   }
//
//   execute(
//     request: ApktoolRequest,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     if (this.#closing)
//       return Promise.resolve(
//         err(new AnalysisCancelledError(request.operation)),
//       );
//     const signal =
//       options?.signal === undefined
//         ? this.#shutdown.signal
//         : AbortSignal.any([options.signal, this.#shutdown.signal]);
//     return this.#track(this.#execute(request, signal));
//   }
//
//   async #execute(
//     request: ApktoolRequest,
//     signal: AbortSignal,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     if (signal?.aborted === true)
//       return err(new AnalysisCancelledError(request.operation));
//     const environment = this.operationEnvironment();
//     let selection: ApktoolCommandSelection;
//     let identity: ApktoolClientIdentity;
//     try {
//       selection = await resolveApktoolCommand(
//         environment,
//         process.platform,
//         signal,
//       );
//       identity = await inspectApktoolClient(
//         selection,
//         signal,
//         environment,
//         process.platform,
//         this.#retainProbeOwner,
//       );
//     } catch (cause) {
//       if (
//         cause instanceof AnalysisCancelledError ||
//         cause instanceof AnalysisTimeoutError
//       )
//         return err(cause);
//       if (cause instanceof ApktoolConfigurationFailure) {
//         if (cause.cleanup !== undefined)
//           return err(
//             probeCleanupFailure(request.operation, cause, cause.cleanup),
//           );
//         return err(
//           providerConfigurationRefusal(
//             APKTOOL_PROVIDER_IDENTITY.id,
//             request.operation,
//             cause,
//           ),
//         );
//       }
//       return err(
//         new AnalysisProtocolError(
//           `apktool version probe failed for ${request.operation}`,
//           { cause },
//         ),
//       );
//     }
//     if (signal.aborted)
//       return err(new AnalysisCancelledError(request.operation));
//     const client = {
//       command: selection.command,
//       command_source: selection.commandSource,
//       apktool_version: identity.version,
//     };
//     const provider = {
//       ...APKTOOL_PROVIDER_IDENTITY,
//       version: identity.version,
//     };
//     if (request.operation === "inspect_apktool_client")
//       return ok(createAnalysisExecution({ client }, provider));
//     return this.decodeResources(
//       request.operation,
//       selection,
//       environment,
//       client,
//       provider,
//       request.input,
//       signal,
//     );
//   }
//
//   #track<T>(operation: Promise<T>): Promise<T> {
//     const settled = operation.then(
//       () => undefined,
//       () => undefined,
//     );
//     this.#active.add(settled);
//     void settled.then(() => this.#active.delete(settled));
//     return operation;
//   }
//
//   async #drainAndClean(): Promise<void> {
//     await Promise.all(this.#active);
//     const failures: unknown[] = [];
//     const retained: string[] = [];
//     for (const [owner, root] of this.#pendingCommandOwners) {
//       try {
//         const stopped = await owner.stop();
//         if (stopped.status === "incomplete") throw new Error(stopped.reason);
//         this.#pendingCommandOwners.delete(owner);
//       } catch (cause) {
//         retained.push(root);
//         failures.push(
//           new Error(
//             `apktool process cleanup remains incomplete for ${root}: ${cause instanceof Error ? cause.message : String(cause)}`,
//             { cause },
//           ),
//         );
//       }
//     }
//     // Ownership stays retained for a later close; report it as typed cleanup.
//     if (failures.length > 0)
//       throw new ProviderCleanupError(
//         APKTOOL_PROVIDER_IDENTITY.id,
//         retained,
//         {
//           reason: failures
//             .map((failure) =>
//               failure instanceof Error ? failure.message : String(failure),
//             )
//             .join("; "),
//         },
//         {
//           operation: "close",
//           cause: new AggregateError(failures, "Apktool process cleanup failed"),
//         },
//       );
//     for (const path of this.workspaces) {
//       try {
//         await this.removeWorkspace(path);
//         this.workspaces.delete(path);
//       } catch (cause) {
//         failures.push(cause);
//       }
//     }
//     if (failures.length > 0)
//       throw new AggregateError(failures, "Apktool workspace cleanup failed");
//   }
//
//   private async decodeResources(
//     operation: "decode_android_resources",
//     selection: ApktoolCommandSelection,
//     environment: Readonly<NodeJS.ProcessEnv>,
//     client: {
//       command: string;
//       command_source: string;
//       apktool_version: string | null;
//     },
//     provider: { id: string; name: string; version: string | null },
//     input: {
//       readonly path: string;
//       readonly include_strings: boolean;
//       readonly locale?: string | undefined;
//     },
//     signal: AbortSignal | undefined,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const root = await mkdtemp(join(tmpdir(), "rea-apktool-"));
//     this.workspaces.add(root);
//     const workspace = join(root, "decoded");
//     const snapshot = join(root, "input.apk");
//     const framework = join(root, "framework");
//     let cleanupFailure: string | null = null;
//     // The workspace is removed before the result is returned, so an
//     // unremovable workspace is reported instead of silently abandoned.
//     const removeWorkspace = async (): Promise<void> => {
//       if ([...this.#pendingCommandOwners.values()].includes(root)) {
//         cleanupFailure = `The decode workspace is retained until its apktool process stops: ${root}`;
//         return;
//       }
//       try {
//         await this.removeWorkspace(root);
//         this.workspaces.delete(root);
//       } catch {
//         cleanupFailure = `The decode workspace could not be removed: ${root}`;
//       }
//     };
//     const failureWithCleanup = (failure: AnalysisError): AnalysisError =>
//       cleanupFailure === null
//         ? failure
//         : analysisErrorWithCleanupFailure(
//             failure,
//             new ProviderCleanupError(
//               APKTOOL_PROVIDER_IDENTITY.id,
//               [root],
//               { reason: cleanupFailure },
//               { operation },
//             ),
//             operation,
//           );
//     let source: FileHandle | undefined;
//     let sourceAdmissionFailed = false;
//     try {
//       throwIfCancelled(operation, signal);
//       sourceAdmissionFailed = true;
//       source = await openRegularFile(input.path, {
//         symlinks: "follow",
//         ...(signal === undefined ? {} : { signal }),
//       });
//       const sourceInfo = await source.stat();
//       sourceAdmissionFailed = false;
//       const sourceSize = sourceInfo.size;
//       let copiedBytes = 0;
//       const sourceHash = createHash("sha256");
//       const boundedSource = new Transform({
//         transform(
//           chunk: Buffer,
//           _encoding: BufferEncoding,
//           callback: TransformCallback,
export const _l = 219;
