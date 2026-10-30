export const __stub = 1;
//   if (signal === undefined) return await closing;
//   let onAbort: (() => void) | undefined;
//   const cancelled = new Promise<void>((resolve) => {
//     onAbort = () => resolve();
//     signal.addEventListener("abort", onAbort, { once: true });
//     if (signal.aborted) onAbort();
//   });
//   try {
//     await Promise.race([closing, cancelled]);
//   } finally {
//     if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
//   }
// };
//
// export const inspectorCleanupError = (
//   primaryFailure: unknown,
//   cleanupFailure: unknown,
//   hasPrimaryFailure: boolean,
//   partialObservation?: AnalysisPartialObservation,
// ): BrowserObservationError => {
//   const cause = hasPrimaryFailure
//     ? new AggregateError(
//         [primaryFailure, cleanupFailure],
//         "Inspector observation and cleanup both failed",
//       )
//     : cleanupFailure;
//   const cleanupReason =
//     cleanupFailure instanceof Error
//       ? cleanupFailure.message
//       : String(cleanupFailure);
//   return new BrowserObservationError(
//     "observe_javascript_runtime",
//     "cleanup_failed",
//     {
//       cause,
//       cleanup: {
//         reason: cleanupReason,
//         resources: ["browser_transport"],
//       },
//       ...(partialObservation === undefined ? {} : { partialObservation }),
//     },
//   );
// };
//
// const projectTarget = (target: AuthorizedV8InspectorTarget) => ({
//   target_id: target.id,
//   protocol_type: target.type,
//   attached: target.attached,
//   location: target.location,
// });
//
// const authorizedTarget = async (
//   targets: readonly V8InspectorTarget[],
//   input: ObserveJavaScriptRuntimeInput,
//   product: string,
// ): Promise<AuthorizedV8InspectorTarget> => {
//   const target = targets.find(({ id }) => id === input.target_id);
//   if (target === undefined)
//     throw new BrowserObservationError(
//       "observe_javascript_runtime",
//       "target_not_found",
//     );
//   const decision = await authorizeRuntimeTargetLocation(target.url, {
//     type: target.type,
//     product,
//   });
//   if (
//     target.attached === true ||
//     !decision.allowed ||
//     decision.location.kind === "builtin"
//   )
//     throw new BrowserObservationError(
//       "observe_javascript_runtime",
//       "target_not_allowed",
//     );
//   if (target.webSocketUrl === null)
//     throw new BrowserObservationError(
//       "observe_javascript_runtime",
//       "invalid_endpoint_response",
//       {
//         detail:
//           "The selected Inspector target has no validated direct WebSocket endpoint.",
//       },
//     );
//   return {
//     id: target.id,
//     type: target.type,
//     url: target.url,
//     attached: target.attached,
//     webSocketUrl: target.webSocketUrl,
//     location: decision.location,
//   };
// };
//
// const assertRuntimeKind = (
//   target: AuthorizedV8InspectorTarget,
//   kind: ObserveJavaScriptRuntimeInput["runtime_kind"],
// ): void => {
//   const accepted =
//     kind === "electron-preload" || kind === "electron-renderer"
//       ? target.type === "page"
//       : target.type === "node";
//   if (!accepted)
//     throw new BrowserObservationError(
//       "observe_javascript_runtime",
//       "target_not_allowed",
//     );
// };
//
// const emptyCaptureState = (): CaptureState => ({
//   scripts: [],
//   contexts: new Map(),
//   eventsObserved: 0,
//   eventsRetained: 0,
//   eventsDropped: 0,
//   metadataBytes: 0,
//   scriptsObserved: 0,
//   invalidScripts: 0,
//   truncated: false,
//   truncationReasons: new Set(),
// });
//
// const ingestEvent = (event: CdpEvent, state: CaptureState): void => {
//   if (
//     event.method !== "Debugger.scriptParsed" &&
//     event.method !== "Debugger.scriptFailedToParse" &&
//     event.method !== "Runtime.executionContextCreated" &&
//     event.method !== "Runtime.executionContextDestroyed" &&
//     event.method !== "Runtime.executionContextsCleared"
//   )
//     return;
//   state.eventsObserved += 1;
//   if (event.method === "Debugger.scriptParsed") {
//     ingestScript(event, state);
//     return;
//   }
//   if (event.method === "Debugger.scriptFailedToParse") {
//     state.invalidScripts += 1;
//     retainEvent(state, 0);
//     return;
//   }
//   ingestContext(event, state);
// };
//
// const ingestScript = (event: CdpEvent, state: CaptureState): void => {
//   state.scriptsObserved += 1;
//   const value = recordValue(event.params);
//   const rawUrl = cdpStringValue(value?.url);
//   if (rawUrl === undefined) {
//     state.invalidScripts += 1;
//     retainEvent(state, 0);
//     return;
//   }
export const _l = 153;
