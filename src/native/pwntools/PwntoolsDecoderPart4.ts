export const __stub = 1;
//     this.#closing = true;
//     this.#closePromise ??= this.#tail
//       .then(async () => {
//         let failure: AnalysisError | undefined;
//         try {
//           failure = await this.#retire();
//         } catch (cause: unknown) {
//           failure = new ProviderCleanupError(
//             this.identity.id,
//             [this.#pendingCleanup?.root?.path ?? "pwntools decoder"],
//             { reason: cause instanceof Error ? cause.message : String(cause) },
//             { operation: this.profile.operation, cause },
//           );
//         }
//         try {
//           await this.#resources.close();
//         } catch (cause: unknown) {
//           const observation = ArtifactReaderFailure.cleanupObservation(
//             cause,
//             "pwntools artifact read",
//           );
//           const resourceFailure = new ProviderCleanupError(
//             this.identity.id,
//             observation.resources,
//             { reason: observation.reason },
//             { operation: this.profile.operation, cause },
//           );
//           failure =
//             failure === undefined
//               ? resourceFailure
//               : analysisErrorWithCleanupFailure(
//                   failure,
//                   resourceFailure,
//                   this.profile.operation,
//                 );
//         }
//         if (failure !== undefined) throw failure;
//       })
//       .catch((cause: unknown) => {
//         this.#closePromise = undefined;
//         throw cause;
//       });
//     return this.#closePromise;
//   }
//
//   #closedError(): AnalysisCapabilityUnavailableError {
//     return new AnalysisCapabilityUnavailableError(
//       this.identity.id,
//       this.profile.operation,
//       "Provider is closing; create a new inspection service.",
//     );
//   }
//
//   async #completeCleanup(
//     retire: () => Promise<AnalysisError | undefined>,
//   ): Promise<AnalysisError | undefined> {
//     const failure = await retire();
//     return failure !== undefined && this.#closing ? retire() : failure;
//   }
//
//   async #retireProcess(): Promise<ProviderCleanupError | undefined> {
//     const pending = this.#pendingCleanup;
//     if (pending?.process === undefined) return undefined;
//     const stopped = await pending.process.stop();
//     const ownership = pending.process.launch.ownership;
//     if (stopped.status === "incomplete")
//       return new ProviderCleanupError(
//         this.identity.id,
//         ownership === undefined
//           ? [
//               "owned-decoder",
//               ...(pending.root === undefined ? [] : [pending.root.path]),
//             ]
//           : ownedCommandResources(ownership, pending.root?.path),
//         {
//           reason: stopped.reason,
//           captured_output: {
//             ...(pending.diagnostics ??
//               capturedPwntoolsOutput(pending.process.snapshot())),
//           },
//           previous_error:
//             pending.failure === undefined
//               ? null
//               : projectAnalysisError(pending.failure),
//         },
//         {
//           operation: this.profile.operation,
//           ...(pending.observation === undefined
//             ? {}
//             : { partialObservation: pending.observation }),
//         },
//       );
//     pending.process = undefined;
//     return undefined;
//   }
//
//   async #retire(): Promise<AnalysisError | undefined> {
//     let failure: AnalysisError | undefined;
//     try {
//       await this.#resources.retryCleanup();
//     } catch (cause: unknown) {
//       const observation = ArtifactReaderFailure.cleanupObservation(
//         cause,
//         "pwntools artifact read",
//       );
//       failure = new ProviderCleanupError(
//         this.identity.id,
//         observation.resources,
//         { reason: observation.reason },
//         {
//           operation: this.profile.operation,
//           cause,
//           ...(this.#pendingCleanup?.observation === undefined
//             ? {}
//             : { partialObservation: this.#pendingCleanup.observation }),
//         },
//       );
//     }
//     const processFailure = await this.#retireProcess();
//     if (processFailure !== undefined) {
//       return failure === undefined
//         ? processFailure
//         : analysisErrorWithCleanupFailure(
//             failure,
//             processFailure,
//             this.profile.operation,
//           );
//     }
//     const pending = this.#pendingCleanup;
//     if (pending?.root !== undefined) {
//       const root = pending.root;
//       try {
//         await root.close();
//         pending.root = undefined;
//       } catch (cause: unknown) {
//         const rootFailure = new ProviderCleanupError(
//           this.identity.id,
//           [root.path],
//           {
//             reason: cause instanceof Error ? cause.message : String(cause),
//             ...(pending.diagnostics === undefined
//               ? {}
//               : { captured_output: { ...pending.diagnostics } }),
//             previous_error:
//               pending.failure === undefined
//                 ? null
//                 : projectAnalysisError(pending.failure),
//           },
//           {
//             operation: this.profile.operation,
//             cause,
//             ...(pending.observation === undefined
//               ? {}
//               : { partialObservation: pending.observation }),
//           },
//         );
//         failure =
//           failure === undefined
//             ? rootFailure
//             : analysisErrorWithCleanupFailure(
//                 failure,
//                 rootFailure,
//                 this.profile.operation,
//               );
//       }
//     }
//     if (!this.#resources.hasPending && pending?.root === undefined)
//       this.#pendingCleanup = undefined;
//     return failure;
//   }
// }
export const _l = 171;
