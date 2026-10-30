export const __stub = 1;
//     parsed = candidate.startsWith("//")
//       ? new URL(`${target.protocol}${candidate}`)
//       : candidate.startsWith(target.host)
//         ? new URL(`${target.protocol}//${candidate}`)
//         : new URL(candidate, target.origin);
//   } catch (cause: unknown) {
//     // Unparseable candidates are preserved verbatim.
//     void cause;
//     return candidate;
//   }
//   return parsed.origin === target.origin &&
//     (parsed.username !== "" || parsed.password !== "")
//     ? sanitizeBrowserUrl(candidate).url
//     : candidate;
// };
//
// const escapeRegExp = (value: string): string =>
//   value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
//
// /** Select a browser attachment socket or a direct socket for one page target. */
// export const cdpTargetWebSocket = (
//   discovery: CdpEndpointDiscovery,
//   target: CdpEndpointTarget,
//   operation: BrowserObservationOperation,
// ): CdpWebSocketEndpoint => {
//   const webSocket = availableCdpTargetWebSocket(discovery, target);
//   if (webSocket !== undefined) return webSocket;
//   throw new BrowserObservationError(operation, "invalid_endpoint_response");
// };
//
// /** Report whether discovery contains a validated transport for one target. */
// export const hasCdpTargetWebSocket = (
//   discovery: CdpEndpointDiscovery,
//   target: CdpEndpointTarget,
// ): boolean => availableCdpTargetWebSocket(discovery, target) !== undefined;
//
// const availableCdpTargetWebSocket = (
//   discovery: CdpEndpointDiscovery,
//   target: CdpEndpointTarget,
// ): CdpWebSocketEndpoint | undefined => {
//   if (discovery.webSocket.scope === "browser") return discovery.webSocket;
//   if (target.webSocket !== undefined) return target.webSocket;
//   return discovery.webSocket.targetId === target.id
//     ? discovery.webSocket
//     : undefined;
// };
//
// /** Parse one CDP discovery value through its exact boundary schema. */
// export const parseCdpEndpointValue = <Output>(
//   schema: z.ZodType<Output>,
//   input: unknown,
//   operation: BrowserObservationOperation,
// ): Output => {
//   const parsed = schema.safeParse(input);
//   if (!parsed.success)
//     throw new BrowserObservationError(operation, "invalid_endpoint_response", {
//       cause: parsed.error,
//     });
//   return parsed.data;
// };
//
// const safeCdpWebSocketEndpoint = (
//   endpoint: string,
//   reported: string,
//   operation: BrowserObservationOperation,
// ): CdpWebSocketEndpoint => {
//   let parsed: URL;
//   try {
//     parsed = new URL(reported);
//   } catch (cause: unknown) {
//     throw new BrowserObservationError(operation, "invalid_endpoint_response", {
//       cause,
//     });
//   }
//   const trustedEndpoint = new URL(endpoint);
//   const path = cdpWebSocketPath(parsed.pathname);
//   if (
//     parsed.protocol !== "ws:" ||
//     parsed.port !== trustedEndpoint.port ||
//     parsed.username !== "" ||
//     parsed.password !== "" ||
//     urlDeclaresQueryOrFragment(parsed) ||
//     path === undefined
//   )
//     throw new BrowserObservationError(operation, "invalid_endpoint_response");
//   parsed.hostname = trustedEndpoint.hostname;
//   return path.scope === "browser"
//     ? { scope: "browser", url: parsed.href }
//     : { scope: "page", targetId: path.targetId, url: parsed.href };
// };
//
// const cdpWebSocketPath = (
//   pathname: string,
// ):
//   | { readonly scope: "browser" }
//   | { readonly scope: "page"; targetId: string }
//   | undefined => {
//   const browserId = pathIdentifier(pathname, "/devtools/browser/");
//   if (browserId !== undefined) return { scope: "browser" };
//   const targetId = pathIdentifier(pathname, "/devtools/page/");
//   return targetId === undefined ? undefined : { scope: "page", targetId };
// };
//
// const pathIdentifier = (
//   pathname: string,
//   prefix: string,
// ): string | undefined => {
//   if (!pathname.startsWith(prefix)) return undefined;
//   const identifier = pathname.slice(prefix.length);
//   return identifier.length > 0 && !identifier.includes("/")
//     ? identifier
//     : undefined;
// };
//
// const targetWebSocket = (
//   endpoint: string,
//   target: z.infer<typeof endpointTargetSchema>,
//   operation: BrowserObservationOperation,
// ): { readonly webSocket?: CdpPageWebSocketEndpoint } => {
//   if (target.webSocketDebuggerUrl === undefined) return {};
//   try {
//     const webSocket = safeCdpWebSocketEndpoint(
//       endpoint,
//       target.webSocketDebuggerUrl,
//       operation,
//     );
//     return webSocket.scope === "page" && webSocket.targetId === target.id
//       ? { webSocket }
//       : {};
//   } catch (cause: unknown) {
//     // Endpoint validation failures mean no validated transport exists.
//     void cause;
//     return {};
export const _l = 133;
