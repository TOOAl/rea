export const __stub = 1;
//         );
//       ownership = {
//         runId,
//         leaderPid,
//         processGroupId: leaderPid,
//         expectedParentPid: process.pid,
//         expectedCommand: paths.executable,
//         sweepTokenOwnedProcesses: true,
//         ...(captureBaseline === undefined ? {} : { captureBaseline }),
//       };
//       lineage = await observeOwnedProcessLineage(ownership);
//       initialState = await readApplicationState(application);
//       actions = await runElectronActions(application, input, options);
//       const state = await runWithExecutionLimits(
//         readApplicationState(application),
//         undefined,
//         options.signal?.aborted ? performance.now() + 5_000 : undefined,
//       );
//       capture = projectElectronActiveCapture(paths, actions, state);
//       outcome = options.signal?.aborted
//         ? err(
//             new BrowserObservationError(OPERATION, "cancelled", {
//               partialObservation: {
//                 kind: "electron-active-observation",
//                 capture,
//               },
//             }),
//           )
//         : ok(capture);
//     } catch (cause: unknown) {
//       if (paths !== undefined && initialState !== undefined) {
//         const retainedCapture = projectElectronActiveCapture(
//           paths,
//           actions,
//           initialState,
//         );
//         capture = {
//           ...retainedCapture,
//           limitations: [
//             ...retainedCapture.limitations,
//             `Capture stopped after the initial pre-action snapshot: ${cause instanceof Error ? cause.message : String(cause)}. Final Windows, metrics, IPC, and timeline state is unknown; the retained snapshot may omit action effects.`,
//           ],
//         };
//       }
//       if (options.signal?.aborted === true)
//         outcome = err(
//           new BrowserObservationError(OPERATION, "cancelled", {
//             cause,
//             ...(capture === undefined
//               ? {}
//               : {
//                   partialObservation: {
//                     kind: "electron-active-observation" as const,
//                     capture,
//                   },
//                 }),
//           }),
//         );
//       else {
//         const error = providerError(cause);
//         if (capture !== undefined)
//           error.retainPartialObservation({
//             kind: "electron-active-observation",
//             capture,
//           });
//         outcome = err(error);
//       }
//     }
//     if (application !== undefined) {
//       if (ownership !== undefined) {
//         const currentLineage = await observeOwnedProcessLineage(ownership);
//         if (currentLineage.status === "verified" || lineage === undefined)
//           lineage = currentLineage;
//       }
//       let closeError: unknown;
//       try {
//         await runWithExecutionLimits(
//           application.close(),
//           undefined,
//           performance.now() + 5_000,
//         );
//       } catch (cause: unknown) {
//         closeError = cause;
//       }
//       const cleanup =
//         ownership === undefined
//           ? ({
//               cleaned: false,
//               reason: "owned Electron process identity was unavailable",
//             } satisfies ProcessCleanupResult)
//           : await cleanupElectronProcesses(ownership, lineage);
//       if (!cleanup.cleaned)
//         return err(
//           new BrowserObservationError(OPERATION, "cleanup_failed", {
//             cause: outcome.ok ? new Error(cleanup.reason) : outcome.error,
//             detail: `Electron cleanup could not be verified: ${cleanup.reason}.${capture !== undefined ? " Collected observations are retained in partial_observation." : ""}${outcome.ok ? "" : ` Capture also failed: ${outcome.error.message}.`} Inspect the reported process resources before launching another capture.`,
//             cleanup: {
//               reason: cleanup.reason,
//               resources:
//                 ownership === undefined
//                   ? ["owned_process_group"]
//                   : [
//                       "owned_process_group",
//                       `run:${ownership.runId}`,
//                       `process-group:${String(ownership.processGroupId)}`,
//                     ],
//             },
//             ...(capture !== undefined
//               ? {
//                   partialObservation: {
//                     kind: "electron-active-observation" as const,
//                     capture: {
//                       ...capture,
//                       application: {
//                         ...capture.application,
//                         cleanup: "unverified" as const,
//                       },
//                     },
//                   },
//                 }
//               : {}),
//           }),
//         );
//       if (closeError !== undefined)
//         return err(
//           new BrowserObservationError(OPERATION, "cleanup_failed", {
//             cause: outcome.ok ? closeError : outcome.error,
//             detail: `Electron transport teardown failed after process cleanup: ${closeError instanceof Error ? closeError.message : String(closeError)}.${capture !== undefined ? " Collected observations are retained in partial_observation." : ""}${outcome.ok ? "" : ` Capture also failed: ${outcome.error.message}.`}`,
export const _l = 128;
