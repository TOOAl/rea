export const __stub = 1;
//               limiter,
//               fileFailure,
//             )
//           : options?.signal?.aborted &&
//               (cause === options.signal.reason ||
//                 (cause instanceof Error && cause.name === "AbortError"))
//             ? new AnalysisCancelledError(OPERATION, {
//                 cause,
//                 ...(retainedOutput === undefined
//                   ? {}
//                   : { capturedOutput: retainedOutput }),
//                 ...(cause instanceof ArtifactReaderFailure &&
//                 cause.cleanup !== undefined
//                   ? { cleanup: cause.cleanup }
//                   : {}),
//               })
//             : evmInterfaceFailure(
//                 cause,
//                 phase,
//                 input.path,
//                 workerLimits,
//                 limiter,
//                 fileFailure,
//               ),
//       );
//     }
//     if (processOwner !== undefined) {
//       this.#pendingCleanup = {
//         root,
//         process: processOwner,
//       };
//       if (processCleanup === undefined) return result;
//       return err(
//         evmCleanupFailure(
//           input,
//           result,
//           [
//             ...new Set([
//               ...(root === undefined ? [] : [root.path]),
//               ...processCleanup.resources,
//             ]),
//           ],
//           processCleanup.reason,
//           retainedOutput,
//           processOwner,
//         ),
//       );
//     }
//     if (root !== undefined) {
//       try {
//         await root.close();
//       } catch (cause: unknown) {
//         const retainedRoot = root;
//         this.#pendingCleanup = { root: retainedRoot, process: undefined };
//         root = undefined;
//         return err(
//           evmCleanupFailure(
//             input,
//             result,
//             [retainedRoot.path],
//             cause instanceof Error ? cause.message : String(cause),
//             retainedOutput,
//             cause,
//           ),
//         );
//       }
//     }
//     return result.ok && options?.signal?.aborted
//       ? err(
//           new AnalysisCancelledError(
//             OPERATION,
//             retainedOutput === undefined
//               ? undefined
//               : { capturedOutput: retainedOutput },
//           ),
//         )
//       : result;
//   }
//
//   async close(): Promise<void> {
//     this.#closing = true;
//     this.#closePromise ??= this.#tail
//       .then(async () => {
//         const outcomes = await Promise.allSettled([
//           this.#retire(),
//           this.#resources.close(),
//         ]);
//         const failures = outcomes.flatMap((outcome) =>
//           outcome.status === "rejected"
//             ? [outcome.reason]
//             : outcome.value === undefined
//               ? []
//               : [outcome.value],
//         );
//         if (failures.length > 0) {
//           const resources = failures.flatMap((failure) =>
//             failure instanceof ProviderCleanupError
//               ? failure.cleanupResources
//               : failure instanceof ArtifactReaderFailure &&
//                   failure.cleanup !== undefined
//                 ? failure.cleanup.resources
//                 : ["artifact-resources"],
//           );
//           throw new ProviderCleanupError(
//             EVMOLE_PROVIDER_IDENTITY.id,
//             [...new Set(resources)],
//             {
//               failures: failures.map((failure) =>
//                 failure instanceof Error ? failure.message : String(failure),
//               ),
//             },
//             { operation: OPERATION, cause: new AggregateError(failures) },
//           );
//         }
//       })
//       .catch((cause: unknown) => {
//         this.#closePromise = undefined;
//         throw cause;
//       });
//     return this.#closePromise;
//   }
//
//   #closedError(): ProviderCleanupError {
//     return new ProviderCleanupError(
//       EVMOLE_PROVIDER_IDENTITY.id,
//       [],
//       { reason: "Provider is closing" },
//       { operation: OPERATION },
//     );
//   }
//
//   async #retire(): Promise<ProviderCleanupError | undefined> {
//     const pending = this.#pendingCleanup;
//     if (pending === undefined) return undefined;
//     if (pending.process !== undefined) {
//       const stopped = await pending.process.stop();
//       if (stopped.status === "incomplete")
//         return new ProviderCleanupError(
//           EVMOLE_PROVIDER_IDENTITY.id,
//           [
//             ...(pending.root === undefined ? [] : [pending.root.path]),
//             ...(pending.process.launch.ownership === undefined
//               ? ["owned-worker"]
//               : ownedCommandResources(pending.process.launch.ownership)),
//           ],
//           { reason: stopped.reason },
//           { operation: OPERATION },
//         );
//       pending.process = undefined;
//     }
//     if (pending.root !== undefined) {
//       const root = pending.root;
//       try {
//         await root.close();
//         pending.root = undefined;
//       } catch (cause: unknown) {
//         return new ProviderCleanupError(
//           EVMOLE_PROVIDER_IDENTITY.id,
//           [root.path],
//           { reason: cause instanceof Error ? cause.message : String(cause) },
//           { operation: OPERATION, cause },
//         );
//       }
//     }
//     this.#pendingCleanup = undefined;
//     return undefined;
//   }
// }
export const _l = 168;
