export const __stub = 1;
//     let connectionClosePromise: Promise<void> | undefined;
//     let outcome:
//       | Result<JavaScriptRuntimeObservation, AnalysisError>
//       | undefined;
//     const closeConnection = (): Promise<void> => {
//       if (connection === undefined) return Promise.resolve();
//       connectionClosePromise ??= closeInspectorConnection(
//         connection,
//         options.signal,
//       );
//       return connectionClosePromise;
//     };
//     try {
//       discovery = await discoverV8Inspector(
//         input.inspector_endpoint,
//         "observe_javascript_runtime",
//         options.signal,
//       );
//       target = await authorizedTarget(
//         discovery.targets,
//         input,
//         discovery.runtime.product,
//       );
//       if (input.runtime_kind !== undefined)
//         assertRuntimeKind(target, input.runtime_kind);
//       connection = await CdpConnection.connect(
//         target.webSocketUrl,
//         "observe_javascript_runtime",
//         options.signal,
//         { maxPayloadBytes: INSPECTOR_MAX_PAYLOAD_BYTES },
//       );
//       const captureState = emptyCaptureState();
//       state = captureState;
//       const removeListener = connection.onEvent((event) =>
//         ingestEvent(event, captureState),
//       );
//       try {
//         await connection.send("Runtime.enable", {}, undefined, options.signal);
//         await connection.send("Debugger.enable", {}, undefined, options.signal);
//         await waitForCapture(connection, input.observation_ms, options.signal);
//       } finally {
//         removeListener();
//       }
//       const result = await finalizeInspectorCapture({
//         input,
//         runtime: discovery.runtime,
//         target,
//         state: captureState,
//         ...(options.signal === undefined ? {} : { signal: options.signal }),
//       });
//       outcome = ok(javascriptRuntimeObservationSchema.parse(result));
//     } catch (cause: unknown) {
//       failed = true;
//       primaryFailure = cause;
//       let error = providerError(cause, "observe_javascript_runtime");
//       if (
//         state !== undefined &&
//         discovery !== undefined &&
//         target !== undefined &&
//         (cause instanceof BrowserObservationError ||
//           options.signal?.aborted === true)
//       ) {
//         const reason =
//           options.signal?.aborted === true
//             ? "cancelled"
//             : cause instanceof BrowserObservationError
//               ? cause.reason
//               : "protocol_error";
//         try {
//           await closeConnection();
//         } catch (cause: unknown) {
//           cleanupFailed = true;
//           cleanupFailure = cause;
//         }
//         try {
//           const partialObservation = await finalizeInspectorCapture({
//             input,
//             runtime: discovery.runtime,
//             target,
//             state,
//             locationMode: "reported",
//           });
//           error = new BrowserObservationError(
//             "observe_javascript_runtime",
//             reason,
//             {
//               cause: error,
//               ...(error.userMessage === undefined
//                 ? {}
//                 : { detail: error.userMessage }),
//               partialObservation,
//             },
//           );
//         } catch (projectionFailure: unknown) {
//           error = new BrowserObservationError(
//             "observe_javascript_runtime",
//             reason,
//             {
//               cause: new AggregateError(
//                 [error, projectionFailure],
//                 "Inspector failure and partial-observation projection both failed",
//               ),
//               detail: `${error.message} Partial observations could not be projected.`,
//             },
//           );
//         }
//       }
//       outcome = err(error);
//     } finally {
//       if (connection !== undefined)
//         try {
//           await closeConnection();
//         } catch (cause: unknown) {
//           cleanupFailed = true;
//           cleanupFailure = cause;
//         }
//     }
//     if (cleanupFailed) {
//       return err(
//         inspectorCleanupError(
//           primaryFailure,
//           cleanupFailure,
//           failed,
//           outcome?.ok === true
//             ? outcome.value
//             : outcome?.ok === false
//               ? outcome.error.partialObservation
//               : undefined,
//         ),
//       );
//     }
//     return (
//       outcome ??
//       err(
//         new BrowserObservationError(
//           "observe_javascript_runtime",
//           "protocol_error",
//         ),
//       )
//     );
//   }
// }
//
// export const closeInspectorConnection = async (
//   connection: Pick<CdpConnection, "close">,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   const closing = connection.close();
//   // best-effort cleanup: the race below observes the close; this only prevents
//   // unhandled rejection when the caller abandons the close via cancellation.
//   void closing.catch(() => undefined);
//   // CdpConnection.close has its own one second transport bound. Do not make a
//   // cancelled caller wait for that fallback.
export const _l = 153;
