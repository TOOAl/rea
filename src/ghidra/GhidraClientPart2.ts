export const __stub = 1;
//             completed: 0,
//             total: null,
//             message: `Waiting for Ghidra startup (${String(Math.floor((performance.now() - startedAt) / 1000))}s elapsed); import, auto-analysis and bridge readiness may still be pending`,
//           });
//         })
//         // Notification failure does not release the owned startup process.
//         .catch(() => {})
//         .finally(() => {
//           reporting = false;
//         });
//     }, 10_000);
//     try {
//       return await started;
//     } finally {
//       active = false;
//       clearInterval(timer);
//     }
//   }
//
//   /** Revalidate live bridge, provider, run, and profile metadata. */
//   async ping(
//     options: GhidraRequestOptions = {},
//   ): Promise<Result<GhidraSessionInfo, GhidraSessionError>> {
//     const started = await this.start(options.signal);
//     if (!started.ok) return started;
//     const result = await this.#wire.request("ping", {}, options);
//     if (!result.ok) return result;
//     return this.#parseSessionInfo(result.value);
//   }
//
//   /** Execute one admitted operation through the serial per-Program queue. */
//   async callTool(
//     operation: GhidraOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options: {
//       readonly signal?: AbortSignal;
//       readonly progress?: ProgressReporter;
//     } = {},
//   ): Promise<Result<JsonValue, GhidraSessionError>> {
//     const started = await this.start(options.signal, options.progress);
//     if (!started.ok) return started;
//     return this.#requestQueue.run(
//       operation,
//       parameters,
//       options.signal === undefined ? {} : { signal: options.signal },
//     );
//   }
//
//   /** Dispatch against the connected bridge without invoking startup or retry. */
//   callToolIfReady(
//     operation: GhidraOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options: { readonly signal?: AbortSignal } = {},
//   ): Promise<Result<JsonValue, GhidraSessionError> | undefined> {
//     if (!this.isReady()) return Promise.resolve(undefined);
//     return this.#requestQueue.run(
//       operation,
//       parameters,
//       options.signal === undefined ? {} : { signal: options.signal },
//     );
//   }
//
//   /** Read the private immutable source for format parsers that require captured bytes. */
//   readTargetSnapshot(
//     maximumBytes?: number,
//     signal?: AbortSignal,
//   ): Promise<Result<GhidraTargetSnapshot, GhidraSessionError>> {
//     return this.#withTargetSnapshot(async (handle, initial, path) => {
//       if (
//         maximumBytes !== undefined &&
//         (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
//       )
//         throw new RangeError("Snapshot byte limit must be a safe integer");
//       if (maximumBytes !== undefined && initial.size > maximumBytes)
//         return {
//           kind: "over-capacity",
//           sourceBytesAtLeast: initial.size,
//           maximumBytes,
//         };
//       const bytes = await readBoundedFileBytes(
//         handle,
//         maximumBytes ?? initial.size,
//         signal,
//         initial.size,
//       );
//       if (bytes === undefined || bytes.length !== initial.size)
//         throw new RegularFileChangedError(path);
//       return { kind: "captured", bytes };
//     }, signal);
//   }
//
//   /** Measure the complete snapshot identity without retaining its bytes in memory. */
//   hashTargetSnapshot(
//     signal?: AbortSignal,
//   ): Promise<
//     Result<
//       { readonly sha256: string; readonly bytes: number },
//       GhidraSessionError
//     >
//   > {
//     return this.#withTargetSnapshot(async (handle, initial, path) => {
//       const hash = createHash("sha256");
//       let bytes = 0;
//       for await (const chunk of readFileHandleChunks(handle, {
//         end: initial.size,
//         signal,
//       })) {
//         bytes += chunk.length;
//         if (bytes > initial.size) throw new RegularFileChangedError(path);
//         hash.update(chunk);
//       }
//       if (bytes !== initial.size) throw new RegularFileChangedError(path);
//       return { sha256: hash.digest("hex"), bytes };
//     }, signal);
//   }
//
//   async #withTargetSnapshot<T>(
//     read: (handle: FileHandle, initial: Stats, path: string) => Promise<T>,
//     signal?: AbortSignal,
//   ): Promise<Result<T, GhidraSessionError>> {
//     const path = this.#snapshotPath;
//     if (path === undefined)
//       return err(
//         this.#failure(
//           "protocol",
//           "Ghidra target snapshot is unavailable before startup or after close",
//         ),
//       );
//     try {
//       const handle = await openRegularFile(path, {
//         symlinks: "reject",
//         signal,
//       });
//       const owner = new OwnedFileHandle(handle);
//       this.#snapshotOwners.add(owner);
//       let result: Result<T, unknown>;
//       try {
//         const initial = await handle.stat();
//         signal?.throwIfAborted();
//         if (!Number.isSafeInteger(initial.size) || initial.size < 0)
//           throw new RangeError("Snapshot size must be a safe integer");
//         const value = await read(handle, initial, path);
//         signal?.throwIfAborted();
//         const after = await handle.stat();
//         signal?.throwIfAborted();
//         if (!sameRegularFileState(initial, after))
//           throw new RegularFileChangedError(path);
//         result = ok(value);
//       } catch (cause: unknown) {
//         result = err(cause);
//       }
//       try {
//         await owner.close();
//         this.#snapshotOwners.delete(owner);
//       } catch (closeFailure: unknown) {
//         throw new AggregateError(
//           result.ok ? [closeFailure] : [result.error, closeFailure],
//           "Ghidra target snapshot read or descriptor cleanup failed",
//         );
//       }
//       if (!result.ok) throw result.error;
//       return result;
//     } catch (cause: unknown) {
//       if (cause instanceof RegularFileAdmissionFailure)
//         this.#snapshotOwners.add(cause.owner);
//       return err(
//         this.#failure(
//           signal?.aborted === true ? "cancelled" : "protocol",
//           "Ghidra target snapshot could not be read for load-image verification",
//           cause,
//         ),
//       );
//     }
//   }
//
//   /** Stop the owned process group and remove all project/runtime artifacts. */
//   async close(): Promise<Result<null, AnalysisError>> {
//     try {
//       await this.#requestClose(false);
//       return ok(null);
//     } catch (cause: unknown) {
//       return err(this.#cleanupError(cause));
//     }
//   }
//
//   /** True only after the authenticated startup handshake has completed. */
//   isReady(): boolean {
//     return (
//       this.#ready &&
//       this.#socket !== undefined &&
//       !this.#socket.destroyed &&
//       this.#closePromise === undefined
//     );
//   }
//
//   #cleanupError(cause: unknown): AnalysisError {
//     if (cause instanceof AnalysisError && cause.cleanupIncomplete) return cause;
//     return new ProviderCleanupError(
//       "ghidra",
//       [
//         ...(this.#process === undefined ? [] : ["ghidra-process"]),
//         ...[this.#runtimeRoot, this.#socketRoot].flatMap((root) =>
//           root === undefined ? [] : [root.path],
//         ),
//       ],
//       {
//         reason: cause instanceof Error ? cause.message : String(cause),
//         diagnostics: this.#diagnostics(),
//       },
//       { cause },
//     );
//   }
//
//   async #startupFailure(
//     primary: GhidraSessionError,
//   ): Promise<GhidraStartResult> {
//     try {
//       await this.#cleanup();
//       return err(primary);
//     } catch (cause: unknown) {
//       return err(
//         new GhidraSessionError(
//           primary.kind,
//           primary.message,
//           primary.diagnostics,
//           {
//             ...(primary.cause === undefined ? {} : { cause: primary.cause }),
//             ...(primary.timeoutMs === undefined
//               ? {}
//               : { timeoutMs: primary.timeoutMs }),
//             ...(primary.remoteCode === undefined
//               ? {}
//               : { remoteCode: primary.remoteCode }),
//             cleanupFailure: this.#cleanupError(cause),
//           },
//         ),
//       );
//     }
//   }
//
//   #requestClose(forceStop: boolean): Promise<void> {
//     this.#ready = false;
//     const starting = this.#startPromise;
//     const controller = this.#startupController;
//     controller?.abort();
//     this.#closePromise ??= Promise.resolve().then(() =>
//       this.#close(starting, controller, forceStop),
//     );
//     return this.#closePromise;
//   }
export const _l = 250;
