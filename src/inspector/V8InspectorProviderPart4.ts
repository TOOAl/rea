export const __stub = 1;
//   const metadata = scriptMetadataValues(value);
//   const draft: ScriptDraft = {
//     rawUrl,
//     executionContextKey: contextKey(value?.executionContextId),
//     cdpHash: metadata.hash,
//     length: metadata.length,
//     isModule: metadata.isModule,
//   };
//   const bytes = retainedMetadataBytes(draft);
//   if (!retainEvent(state, bytes)) return;
//   state.scripts.push(draft);
// };
//
// const ingestContext = (event: CdpEvent, state: CaptureState): void => {
//   if (event.method === "Runtime.executionContextsCleared") {
//     let byteDelta = 0;
//     for (const context of state.contexts.values()) {
//       byteDelta +=
//         retainedMetadataBytes({ ...context, state: "cleared" }) -
//         retainedMetadataBytes(context);
//     }
//     if (replaceRetainedMetadata(state, byteDelta)) {
//       for (const context of state.contexts.values()) context.state = "cleared";
//       retainEvent(state, 0);
//     }
//     return;
//   }
//   const parameters = recordValue(event.params);
//   const runtimeContext =
//     event.method === "Runtime.executionContextCreated"
//       ? recordValue(parameters?.context)
//       : parameters;
//   const key = contextKey(
//     event.method === "Runtime.executionContextCreated"
//       ? runtimeContext?.id
//       : runtimeContext?.executionContextId,
//   );
//   if (key === null) {
//     retainEvent(state, 0);
//     return;
//   }
//   const previous = state.contexts.get(key);
//   const created = event.method === "Runtime.executionContextCreated";
//   const draft: ContextDraft = {
//     contextKey: key,
//     state: created ? "created" : "destroyed",
//     name: created
//       ? (cdpStringValue(runtimeContext?.name) ?? null)
//       : (previous?.name ?? null),
//     origin: created
//       ? (cdpStringValue(runtimeContext?.origin) ?? null)
//       : (previous?.origin ?? null),
//   };
//   const bytes =
//     retainedMetadataBytes(draft) -
//     (previous === undefined ? 0 : retainedMetadataBytes(previous));
//   if (!retainEvent(state, bytes)) return;
//   state.contexts.set(key, draft);
// };
//
// const retainEvent = (state: CaptureState, bytes: number): boolean => {
//   if (!replaceRetainedMetadata(state, bytes)) return false;
//   state.eventsRetained += 1;
//   return true;
// };
//
// const replaceRetainedMetadata = (
//   state: CaptureState,
//   byteDelta: number,
// ): boolean => {
//   if (state.metadataBytes + byteDelta > INSPECTOR_MAX_RETAINED_METADATA_BYTES) {
//     state.eventsDropped += 1;
//     state.truncated = true;
//     state.truncationReasons.add("retained_metadata_budget_exceeded");
//     return false;
//   }
//   state.metadataBytes += byteDelta;
//   return true;
// };
//
// const waitForCapture = async (
//   connection: CdpConnection,
//   observationMs: number,
//   signal?: AbortSignal,
// ): Promise<void> => {
//   let removeDisconnect = (): void => undefined;
//   let removeProtocolFailure = (): void => undefined;
//   const disconnected = new Promise<never>((_resolve, reject) => {
//     removeDisconnect = connection.onDisconnect((error) => reject(error));
//   });
//   const protocolFailure = new Promise<never>((_resolve, reject) => {
//     removeProtocolFailure = connection.onProtocolFailure((error) =>
//       reject(error),
//     );
//   });
//   const timerOwner = new AbortController();
//   const timerSignal =
//     signal === undefined
//       ? timerOwner.signal
//       : AbortSignal.any([signal, timerOwner.signal]);
//   try {
//     await Promise.race([
//       delayWithCancellation(
//         observationMs,
//         "observe_javascript_runtime",
//         timerSignal,
//       ),
//       disconnected,
//       protocolFailure,
//     ]);
//   } finally {
//     // Cancel only this wait's timer. The caller owns and retains its signal.
//     timerOwner.abort();
//     removeDisconnect();
//     removeProtocolFailure();
//   }
// };
//
// const retainedMetadataBytes = (value: ScriptDraft | ContextDraft): number => {
//   const strings =
//     "rawUrl" in value
//       ? [value.rawUrl, value.rawUrl, value.executionContextKey, value.cdpHash]
//       : [value.contextKey, value.name, value.origin];
//   return (
//     RETAINED_OBJECT_OVERHEAD_BYTES +
//     strings.reduce((total, text) => total + (text?.length ?? 0) * 2, 0)
//   );
// };
//
// const contextKey = (value: unknown): string | null => {
//   const identifier = numberValue(value);
//   return identifier !== undefined && Number.isSafeInteger(identifier)
//     ? String(identifier)
//     : null;
// };
//
// const providerError = (
//   cause: unknown,
//   operation: BrowserObservationOperation,
// ): AnalysisError => {
//   if (cause instanceof AnalysisError) return cause;
//   return new ProviderAdapterError(
//     V8_INSPECTOR_PROVIDER_IDENTITY.id,
//     operation,
//     {
//       cause,
//     },
//   );
// };
export const _l = 149;
