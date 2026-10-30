export const __stub = 1;
//               },
//             ],
//           },
//         ),
//       );
//     } catch (cause: unknown) {
//       outcome = err(
//         cause instanceof ProviderCleanupError
//           ? cause
//           : options?.signal?.aborted === true
//             ? new AnalysisCancelledError(request.operation)
//             : deadline.aborted
//               ? new AnalysisTimeoutError(
//                   request.operation,
//                   FIRMWARE_LIMITS.timeoutMs,
//                 )
//               : cause instanceof AnalysisError
//                 ? cause
//                 : cause instanceof z.ZodError
//                   ? new AnalysisOutputError(
//                       request.operation,
//                       "Tool report violated the pinned producer protocol",
//                       { cause },
//                     )
//                   : new ProviderAdapterError(engineName, request.operation, {
//                       cause,
//                       diagnostics: {
//                         reason:
//                           cause instanceof Error
//                             ? cause.message
//                             : String(cause),
//                       },
//                     }),
//       );
//     }
//     const finished = await finishFirmwareWorkspace(
//       root,
//       outcome,
//       engineName,
//       request,
//     );
//     if (
//       !finished.ok &&
//       finished.error.cleanupIncomplete &&
//       root !== undefined &&
//       !this.#pendingCleanup.has(root.path)
//     )
//       this.#pendingCleanup.set(root.path, {
//         root,
//         engine: engineName,
//         operation: request.operation,
//       });
//     return finished;
//   }
// }
//
// /** Keep a completed extraction beside cleanup failure, or skip removal when ownership is uncertain. */
// export const finishFirmwareWorkspace = async (
//   root: { readonly path: string; close(): Promise<void> } | undefined,
//   outcome: Outcome,
//   engineName: string,
//   request: FirmwareRequest,
// ): Promise<Outcome> => {
//   if (!outcome.ok && outcome.error.cleanupIncomplete) {
//     if (
//       root === undefined ||
//       outcome.error.cleanupResources.includes(root.path)
//     )
//       return outcome;
//     return err(
//       new ProviderCleanupError(
//         engineName,
//         [...outcome.error.cleanupResources, root.path],
//         outcome.error instanceof ProviderAdapterError
//           ? (outcome.error.diagnostics ?? { reason: outcome.error.message })
//           : { reason: outcome.error.message },
//         {
//           cause: outcome.error,
//           operation: request.operation,
//           ...(outcome.error.partialObservation === undefined
//             ? {}
//             : { partialObservation: outcome.error.partialObservation }),
//         },
//       ),
//     );
//   }
//   try {
//     await root?.close();
//   } catch (cause: unknown) {
//     const cleanup = new ProviderCleanupError(
//       engineName,
//       [
//         root?.path ?? "unknown",
//         ...(outcome.ok && request.operation === "extract_firmware"
//           ? [request.input.output_directory]
//           : []),
//       ],
//       { reason: cause instanceof Error ? cause.message : String(cause) },
//       {
//         cause,
//         operation: request.operation,
//         ...(outcome.ok
//           ? {
//               partialObservation: completedFirmwareObservation(outcome.value),
//             }
//           : outcome.error.partialObservation === undefined
//             ? {}
//             : { partialObservation: outcome.error.partialObservation }),
//       },
//     );
//     return err(
//       outcome.ok
//         ? cleanup
//         : analysisErrorWithCleanupFailure(
//             outcome.error,
//             cleanup,
//             request.operation,
//           ),
//     );
//   }
//   return outcome;
// };
//
// const completedFirmwareObservation = (
//   execution: AnalysisExecution,
// ): FirmwarePartialObservation => ({
//   kind: "firmware",
//   result: execution.result,
//   provenance: jsonValueSchema.parse({
//     raw_result: execution.rawResult,
//     provider: execution.provider,
//     subject: execution.subject,
//     locations: execution.locations,
//     limitations: execution.limitations,
//     ...(execution.analysisProfile === undefined
//       ? {}
//       : { analysis_profile: execution.analysisProfile }),
//   }),
// });
export const _l = 139;
