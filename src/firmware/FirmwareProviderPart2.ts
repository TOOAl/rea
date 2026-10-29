export const __stub = 1;
//       if (cleanup.processUnverified && cleanup.failure !== undefined)
//         return err(cleanup.failure);
//       return await this.#execute(request, options);
//     } finally {
//       release();
//     }
//   }
//
//   /** Retry every retained owner, reporting failures without discarding other roots. */
//   async close(): Promise<void> {
//     this.#closed = true;
//     await this.#tail;
//     const cleanup = await this.#retryCleanup();
//     if (cleanup.failure !== undefined) throw cleanup.failure;
//   }
//
//   async #retryCleanup(): Promise<FirmwareCleanupAttempt> {
//     const failures: ProviderCleanupError[] = [];
//     let processUnverified = false;
//     for (const [path, pending] of this.#pendingCleanup) {
//       try {
//         const stopped = await pending.supervisor?.stop();
//         if (stopped?.status === "incomplete") {
//           processUnverified = true;
//           failures.push(
//             new ProviderCleanupError(
//               pending.engine,
//               [path],
//               { reason: stopped.reason },
//               { operation: pending.operation },
//             ),
//           );
//           continue;
//         }
//         delete pending.supervisor;
//       } catch (cause: unknown) {
//         processUnverified = true;
//         failures.push(
//           new ProviderCleanupError(
//             pending.engine,
//             [path],
//             { reason: cause instanceof Error ? cause.message : String(cause) },
//             { operation: pending.operation, cause },
//           ),
//         );
//         continue;
//       }
//       try {
//         if (pending.tree !== undefined) {
//           await pending.tree.rollback();
//           delete pending.tree;
//         }
//       } catch (cause: unknown) {
//         failures.push(
//           new ProviderCleanupError(
//             pending.engine,
//             [path, pending.tree?.outputRoot ?? path],
//             { reason: cause instanceof Error ? cause.message : String(cause) },
//             { operation: pending.operation, cause },
//           ),
//         );
//       }
//       try {
//         await pending.root.close();
//         if (pending.tree === undefined) this.#pendingCleanup.delete(path);
//       } catch (cause: unknown) {
//         // A verified stopped process cannot use this root. Keep ownership for
//         // later removal without blocking a new operation's disjoint workspace.
//         failures.push(
//           new ProviderCleanupError(
//             pending.engine,
//             [path],
//             { reason: cause instanceof Error ? cause.message : String(cause) },
//             { operation: pending.operation, cause },
//           ),
//         );
//       }
//     }
//     return { failure: combineCleanupFailures(failures), processUnverified };
//   }
//
//   async #execute(
//     request: FirmwareRequest,
//     options?: ExecutionOptions,
//   ): Promise<Outcome> {
//     let root: PrivateRuntimeRoot | undefined;
//     const engineName =
//       request.operation === "inspect_firmware_regions" ? "binwalk" : "unblob";
//     const deadline = AbortSignal.timeout(FIRMWARE_LIMITS.timeoutMs);
//     const signal =
//       options?.signal === undefined
//         ? deadline
//         : AbortSignal.any([options.signal, deadline]);
//     let outcome: Outcome;
//     try {
//       if (signal.aborted) throw new AnalysisCancelledError(request.operation);
//       const command = await resolveFirmwareCommand(
//         this.environment,
//         engineName,
//         request.operation,
//       );
//       root = await PrivateRuntimeRoot.create({ prefix: "rea-firmware-" });
//       const ownedRoot = root;
//       const target = await snapshotFirmware(request, root.path, signal);
//       const run = (
//         args: readonly string[],
//         outputBudget?: { root: string; bytes: number; entries: number },
//       ) =>
//         runFirmwareCommand({
//           engine: engineName,
//           operation: request.operation,
//           ...command,
//           args,
//           cwd: root?.path ?? "",
//           environment: this.environment,
//           signal,
//           retainCleanup: (supervisor) => {
//             this.#pendingCleanup.set(ownedRoot.path, {
//               supervisor,
//               root: ownedRoot,
//               engine: engineName,
//               operation: request.operation,
//             });
//           },
//           ...(this.launcher === undefined ? {} : { launcher: this.launcher }),
//           ...(outputBudget === undefined
//             ? {}
//             : { outputBudget, acceptReportedExtractionFailure: true }),
//         });
//       const versionRun = await run(["--version"]);
//       const version = versionRun.stdout.text.trim();
//       if (versionRun.stdout.bytes > 1024)
//         throw firmwareToolUnavailable(
//           engineName,
//           request.operation,
//           `Tool version banner is ${String(versionRun.stdout.bytes)} bytes; expected a short ${engineName} version line.`,
//         );
//       const admitted = admitFirmwareVersion(engineName, version);
//       if (admitted.status === "unsupported" || admitted.status === "unresolved")
//         throw firmwareToolUnavailable(
//           engineName,
export const _l = 141;
