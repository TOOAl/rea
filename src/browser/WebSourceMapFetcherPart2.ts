export const __stub = 1;
//         await response.body?.cancel();
//       } catch (cleanupCause: unknown) {
//         if (cause instanceof SourceMapFormatFailure && cause.reason === "limit")
//           throw sourceMapOutputError(cause, {
//             cause: new AggregateError(
//               [cause, cleanupCause],
//               "Source-map response cleanup failed after its output exceeded capacity.",
//             ),
//             cleanup: {
//               reason:
//                 "Source-map response cancellation failed after its output exceeded capacity.",
//               resources: ["source-map-response"],
//             },
//           });
//         throw cause;
//       }
//       throw cause;
//     }
//     if (!response.ok) {
//       await response.body?.cancel();
//       return emptySourceMapItem(
//         request,
//         "fetch_failed",
//         `Source-map server returned HTTP ${String(response.status)}.`,
//         fetchedUrl,
//       );
//     }
//     checkOperation(undefined, signal, budget.deadlineAt);
//     return normalizeSourceMap(
//       request,
//       await readBoundedText(
//         response,
//         budget,
//         host.maxResponseBytes ?? SOURCE_MAP_RESPONSE_BYTES,
//         signal,
//       ),
//       fetchedUrl,
//       {
//         signal,
//         deadlineAt: budget.deadlineAt,
//         budget: budget.decodedRecords,
//       },
//     );
//   } catch (cause: unknown) {
//     if (cause instanceof AnalysisResourceConstraintError) throw cause;
//     if (cause instanceof SourceMapFormatFailure && cause.reason === "limit")
//       throw cause;
//     if (
//       signal?.aborted === true &&
//       !(signal.reason instanceof SourceMapDeadlineError)
//     )
//       throw cause;
//     if (cause instanceof SourceMapEncodingError)
//       return emptySourceMapItem(
//         request,
//         "invalid",
//         cause.message,
//         effectiveUrl,
//       );
//     return emptySourceMapItem(
//       request,
//       "fetch_failed",
//       cause instanceof SourceMapRedirectLocationError ||
//         cause instanceof SourceMapSizeLimitError ||
//         cause instanceof SourceMapDeadlineError
//         ? cause.message
//         : "Source-map fetch or validation failed.",
//       effectiveUrl,
//     );
//   }
// };
//
// /**
//  * Fetch redirect statuses per WHATWG Fetch (redirect status list:
//  * 301, 302, 303, 307, 308). Single owner for redirect decisions.
//  * 300/304/305/306 carry `Location` without being redirects — following
//  * them would replace the observed failure with an unrelated map.
//  * See https://fetch.spec.whatwg.org/#redirect-status
//  */
// export const isFetchRedirectStatus = (status: number): boolean =>
//   status === 301 ||
//   status === 302 ||
//   status === 303 ||
//   status === 307 ||
//   status === 308;
//
// const fetchFollowingApprovedRedirects = async (
//   initialUrl: string,
//   allowedOrigins: readonly string[],
//   signal: AbortSignal | undefined,
//   host: SourceMapFetchHost,
//   observeResponse: (url: string) => void,
// ): Promise<{ response: Response; fetchedUrl: string } | undefined> => {
//   let current = initialUrl;
//   const visited = new Set<string>();
//   for (;;) {
//     if (signal?.aborted === true) throw signal.reason;
//     if (!approvedUrl(current, allowedOrigins)) return undefined;
//     if (visited.has(current)) throw new Error("source_map_redirect_loop");
//     visited.add(current);
//     const response = await promiseWithAbort(
//       host.fetch(current, {
//         method: "GET",
//         headers: {
//           Accept: "application/json, application/source-map+json;q=0.9",
//         },
//         redirect: "manual",
//         credentials: "omit",
//         referrerPolicy: "no-referrer",
//         ...(signal === undefined ? {} : { signal }),
//       }),
//       signal,
//     );
//     observeResponse(current);
//     if (signal !== undefined && signalIsAborted(signal)) {
//       await response.body?.cancel(signal.reason).catch(() => undefined);
//       throw signal.reason;
//     }
//     // `Location` is a redirect target only for Fetch redirect statuses.
//     // Other 3xx responses retain their own HTTP failure (strict identity:
//     // never replace the observed failure with an unrelated map).
//     if (!isFetchRedirectStatus(response.status))
//       return { response, fetchedUrl: current };
//     const location = response.headers.get("location");
//     if (location === null) return { response, fetchedUrl: current };
//     await response.body?.cancel();
//     try {
//       current = new URL(location, current).href;
//     } catch {
//       throw new SourceMapRedirectLocationError(current, location);
//     }
//   }
// };
//
// const readBoundedText = async (
//   response: Response,
//   budget: { retainedBytes: number },
//   maxBytes: number,
//   signal: AbortSignal | undefined,
// ): Promise<string> => {
//   if (response.body === null) return "";
//   const reader = response.body.getReader();
//   const chunks: Uint8Array[] = [];
//   let bytes = 0;
//   try {
//     for (;;) {
//       if (signal?.aborted === true) throw signal.reason;
//       const { done, value } = await readWithAbort(reader, signal);
//       if (done) break;
//       const nextBytes = value?.byteLength ?? 0;
//       if (budget.retainedBytes + bytes + nextBytes > maxBytes) {
//         await reader.cancel(new SourceMapSizeLimitError());
//         throw new SourceMapSizeLimitError();
//       }
//       if (value !== undefined) chunks.push(value);
//       bytes += nextBytes;
//     }
//   } finally {
//     // Aborting cancels the reader in readWithAbort. It owns the pending read
//     // until that cancellation settles, so releasing the lock here can throw.
//     if (signal?.aborted !== true) reader.releaseLock();
//   }
//   budget.retainedBytes += bytes;
//   const joined = new Uint8Array(bytes);
//   let offset = 0;
//   for (const chunk of chunks) {
//     joined.set(chunk, offset);
//     offset += chunk.byteLength;
//   }
//   try {
//     return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
//       joined,
//     );
//   } catch {
//     throw new SourceMapEncodingError();
//   }
// };
//
// const readWithAbort = <T>(
//   reader: ReadableStreamDefaultReader<T>,
//   signal: AbortSignal | undefined,
// ): Promise<Awaited<ReturnType<ReadableStreamDefaultReader<T>["read"]>>> => {
//   if (signal === undefined) return reader.read();
//   if (signal.aborted) return Promise.reject(signal.reason);
//   return new Promise((resolve, reject) => {
//     let settled = false;
//     const cleanup = (): void => signal.removeEventListener("abort", abort);
//     const abort = (): void => {
//       if (settled) return;
//       settled = true;
//       cleanup();
//       void reader.cancel(signal.reason).catch(() => undefined);
//       reject(signal.reason);
//     };
//     signal.addEventListener("abort", abort, { once: true });
//     void reader.read().then(
//       (value) => {
//         if (settled) return;
//         settled = true;
//         cleanup();
//         resolve(value);
//       },
//       (cause: unknown) => {
//         if (settled) return;
//         settled = true;
//         cleanup();
//         void reader.cancel(cause).catch(() => undefined);
//         reject(cause);
//       },
//     );
//   });
// };
//
// const signalIsAborted = (signal: AbortSignal | undefined): boolean =>
//   signal?.aborted === true;
//
// const promiseWithAbort = (
//   promise: Promise<Response>,
//   signal: AbortSignal | undefined,
// ): Promise<Response> => {
//   if (signal === undefined) return promise;
//   if (signal.aborted) return Promise.reject(signal.reason);
//   return new Promise((resolve, reject) => {
//     let settled = false;
//     const cleanup = (): void => signal.removeEventListener("abort", abort);
//     const abort = (): void => {
//       if (settled) return;
//       settled = true;
//       cleanup();
//       reject(signal.reason);
//     };
//     signal.addEventListener("abort", abort, { once: true });
//     void promise.then(
//       (response) => {
//         if (settled || signal.aborted) {
//           void response.body?.cancel(signal.reason).catch(() => undefined);
//           if (!settled) {
//             settled = true;
//             cleanup();
//             reject(signal.reason);
//           }
//           return;
//         }
//         settled = true;
//         cleanup();
//         resolve(response);
//       },
//       (cause: unknown) => {
//         if (settled) return;
//         settled = true;
//         cleanup();
//         reject(cause);
//       },
//     );
//   });
// };
//
// const normalizeSourceMap = (
//   request: WebSourceMapRequest,
//   text: string,
//   fetchedUrl: string,
//   context: SourceMapDecodeContext,
// ): SourceMapItem => {
//   const parsedJson = safeParseJson(sourceMapJsonText(text));
//   if (!parsedJson.ok)
//     return emptySourceMapItem(
//       request,
//       "invalid",
//       "Source-map JSON is not a version 3 map.",
//       fetchedUrl,
//     );
//   const retainedBytesBeforeMap = context.budget.expandedBytes;
//   try {
//     const check = (): void =>
//       checkOperation(undefined, context.signal, context.deadlineAt);
//     const inspected = inspectSourceMapValue(parsedJson.value, {
//       profile: "browser-collection",
//       budget: context.budget,
export const _l = 278;
