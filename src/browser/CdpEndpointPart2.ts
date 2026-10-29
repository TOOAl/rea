export const __stub = 1;
//       user_agent: version["User-Agent"],
//       js_version: version["V8-Version"],
//     },
//     targets: targets.map((target) => ({
//       id: target.id,
//       type: target.type,
//       title: sanitizeTargetTitle(target.title, target.url),
//       url: target.url,
//       attached: target.attached ?? null,
//       ...targetWebSocket(endpoint, target, operation),
//     })),
//   };
// };
//
// /**
//  * Run browser-socket discovery work, including its WebSocket handshake, under
//  * the HTTP discovery deadline. Reaching the deadline is a timeout, not a
//  * caller cancellation, so the internal abort is not carried as its cause.
//  */
// export const withCdpDiscoveryDeadline = async <T>(
//   operation: BrowserObservationOperation,
//   signal: AbortSignal | undefined,
//   work: (deadlineSignal: AbortSignal) => Promise<T>,
//   timeoutMs: number = CDP_DISCOVERY_RESPONSE_LIMITS.timeoutMs,
// ): Promise<T> => {
//   const deadline = new AbortController();
//   const timer = setTimeout(() => deadline.abort(), timeoutMs);
//   try {
//     return await work(
//       signal === undefined
//         ? deadline.signal
//         : AbortSignal.any([signal, deadline.signal]),
//     );
//   } catch (cause: unknown) {
//     if (deadline.signal.aborted && signal?.aborted !== true)
//       throw new BrowserObservationError(operation, "timeout", {
//         detail: `CDP browser-socket discovery exceeded its ${String(timeoutMs)} ms deadline.`,
//       });
//     throw cause;
//   } finally {
//     clearTimeout(timer);
//   }
// };
//
// /**
//  * Read discovery facts over a browser socket that has no HTTP discovery.
//  * Each reply is bounded by the connection's protocol message limit; callers
//  * apply the discovery deadline through `signal`.
//  */
// export const discoverCdpBrowserSocket = async (
//   connection: CdpConnection,
//   url: string,
//   operation: BrowserObservationOperation,
//   signal?: AbortSignal,
// ): Promise<CdpEndpointDiscovery> => {
//   const versionInput = await connection.send(
//     "Browser.getVersion",
//     {},
//     undefined,
//     signal,
//   );
//   const targetsInput = await connection.send(
//     "Target.getTargets",
//     {},
//     undefined,
//     signal,
//   );
//   const version = parseCdpEndpointValue(
//     browserSocketVersionSchema,
//     versionInput,
//     operation,
//   );
//   const targets = parseCdpEndpointValue(
//     browserSocketTargetsSchema,
//     targetsInput,
//     operation,
//   );
//   return {
//     webSocket: { scope: "browser", url },
//     version: {
//       product: version.product,
//       protocol_version: version.protocolVersion,
//       revision: version.revision,
//       user_agent: version.userAgent,
//       js_version: version.jsVersion,
//     },
//     targets: targets.targetInfos.map((target) => ({
//       id: target.targetId,
//       type: target.type,
//       title: sanitizeTargetTitle(target.title, target.url),
//       url: target.url,
//       attached: target.attached ?? null,
//     })),
//   };
// };
//
// const sanitizeTargetTitle = (value: string, targetUrl: string): string => {
//   let url: URL;
//   try {
//     url = new URL(value);
//   } catch (cause: unknown) {
//     // Non-URL titles fall back to alias redaction.
//     void cause;
//     return sanitizeTargetUrlAlias(value, targetUrl);
//   }
//   return url.protocol === "http:" || url.protocol === "https:"
//     ? sanitizeBrowserUrl(value).url
//     : sanitizeTargetUrlAlias(value, targetUrl);
// };
//
// const sanitizeTargetUrlAlias = (value: string, targetUrl: string): string => {
//   let parsed: URL;
//   try {
//     parsed = new URL(targetUrl);
//   } catch (cause: unknown) {
//     // Without a parseable target URL there is nothing to redact.
//     void cause;
//     return value;
//   }
//   const markers = [parsed.origin, `//${parsed.host}`, parsed.host];
//   if (parsed.pathname !== "/") markers.push(parsed.pathname);
//   const candidatePattern = new RegExp(
//     `(?:${markers.map(escapeRegExp).join("|")})[^\\s<>"']*`,
//     "gu",
//   );
//   return value.replace(candidatePattern, (candidate) =>
//     sanitizeSameOriginTitleUrl(candidate, parsed),
//   );
// };
//
// const sanitizeSameOriginTitleUrl = (candidate: string, target: URL): string => {
//   let parsed: URL;
//   try {
export const _l = 133;
