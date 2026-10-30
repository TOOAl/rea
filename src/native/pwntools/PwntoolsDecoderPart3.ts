export const __stub = 1;
//             { capturedOutput },
//           );
//         if (reply.reason === "resource-limit")
//           throw new AnalysisResourceConstraintError(
//             OPERATION,
//             "memory",
//             reply.message,
//             reply.reported_limits ?? null,
//             { capturedOutput },
//           );
//         if (reply.reason === "format")
//           throw new AnalysisInputError(OPERATION, { capturedOutput }, [
//             {
//               path: ["path"],
//               reason: "invalid_format",
//               message: reply.message,
//             },
//           ]);
//         if (reply.reason === "unavailable")
//           throw pwntoolsUnavailable(
//             reply.message,
//             this.environment.REA_PWNTOOLS_PYTHON ?? "",
//             undefined,
//             capturedOutput,
//             context,
//           );
//         if (reply.reason === "unsupported")
//           throw new AnalysisCapabilityUnavailableError(
//             this.identity.id,
//             OPERATION,
//             reply.message,
//             { userMessage: reply.message, capturedOutput },
//           );
//         if (reply.reason === "output-limit")
//           throw new AnalysisOutputError(OPERATION, reply.message, {
//             capturedOutput,
//           });
//         throw new ProviderAdapterError(this.identity.id, OPERATION, {
//           diagnostics: {
//             phase,
//             failure_kind: reply.reason,
//             reason: reply.message,
//             stdout: execution.stdout.text,
//             stderr: execution.stderr.text,
//             captured_output: { ...capturedOutput },
//           },
//         });
//       }
//       result = ok(
//         await this.profile.project({
//           input,
//           payload: reply.value,
//           snapshot,
//           rootPath: root.path,
//           resources: this.#resources,
//           diagnostics: capturedOutput,
//           options,
//           runCommand: (spawn, classifyFailure) =>
//             this.#runCommand(spawn, options, classifyFailure),
//         }),
//       );
//     } catch (cause: unknown) {
//       // The command owner has exhausted this operation's cleanup attempts.
//       // Keep its resources and do not consume files an unresolved worker may change.
//       if (cause instanceof AnalysisError && cause.cleanupIncomplete) {
//         if (this.#pendingCleanup !== undefined) {
//           this.#pendingCleanup.failure = cause;
//           this.#pendingCleanup.observation = cause.partialObservation;
//         }
//         return err(cause);
//       }
//       const evidence = await readPwntoolsFailureEvidence(
//         cause,
//         root?.path,
//         this.#resources,
//       );
//       const primary =
//         options?.signal?.aborted &&
//         (cause === options.signal.reason ||
//           (cause instanceof Error && cause.name === "AbortError") ||
//           (cause instanceof ArtifactReaderFailure &&
//             cause.cleanup !== undefined))
//           ? new AnalysisCancelledError(OPERATION, { cause })
//           : pwntoolsDecoderFailure(
//               cause,
//               phase,
//               selectedPath,
//               executablePath,
//               evidence,
//               context,
//             );
//       result = err(primary);
//     }
//     if (this.#pendingCleanup !== undefined) {
//       this.#pendingCleanup.failure = result.ok ? undefined : result.error;
//       this.#pendingCleanup.observation = result.ok
//         ? result.value
//         : result.error.partialObservation;
//       this.#pendingCleanup.diagnostics = result.ok
//         ? result.value.diagnostics
//         : result.error.capturedOutput;
//     }
//     const cleanup = await this.#completeCleanup(() => this.#retire());
//     if (cleanup !== undefined)
//       return err(
//         result.ok
//           ? cleanup
//           : analysisErrorWithCleanupFailure(result.error, cleanup, OPERATION),
//       );
//     return result.ok && options?.signal?.aborted
//       ? err(
//           new AnalysisCancelledError(OPERATION, {
//             partialObservation: result.value,
//             capturedOutput: {
//               stdout: result.value.diagnostics.stdout,
//               stderr: result.value.diagnostics.stderr,
//               truncated: result.value.diagnostics.truncated,
//             },
//           }),
//         )
//       : result;
//   }
//
//   async #runCommand(
//     spawn: OwnedProviderProcessSpawnOptions,
//     options: ExecutionOptions | undefined,
//     failure: (cause: unknown) => AnalysisError,
//   ): Promise<ProviderProcessSnapshot> {
//     // A runtime is registered before either decoder stage may acquire a process.
//     const pending = this.#pendingCleanup;
//     if (pending === undefined)
//       throw new Error("Decoder command requires an owned runtime.");
//     let outcome: Result<ProviderProcessSnapshot, unknown>;
//     try {
//       outcome = ok(
//         await runOwnedCommand(
//           spawn,
//           {
//             timeoutMs: PWNTOOLS_LIMITS.timeoutMs,
//             diagnosticBytes: PWNTOOLS_LIMITS.diagnosticBytes,
//           },
//           {
//             ...(options?.signal === undefined
//               ? {}
//               : { signal: options.signal }),
//             ...(this.launcher === undefined ? {} : { launcher: this.launcher }),
//             retainCleanup: (owner) => {
//               pending.process = owner;
//             },
//           },
//         ),
//       );
//     } catch (cause: unknown) {
//       outcome = err(cause);
//     }
//     const cleanup = await this.#completeCleanup(() => this.#retireProcess());
//     if (cleanup !== undefined) {
//       if (outcome.ok) throw cleanup;
//       // Until retirement succeeds, resource-limit markers remain unverified.
//       const primary = failure(outcome.error);
//       throw analysisErrorWithCleanupFailure(
//         primary,
//         cleanup,
//         this.profile.operation,
//       );
//     }
//     if (!outcome.ok) throw outcome.error;
//     return outcome.value;
//   }
//
//   /** Drain the running inspection, reject queued acquisition, and retry retained processes before deleting their files. */
//   close(): Promise<void> {
export const _l = 172;
