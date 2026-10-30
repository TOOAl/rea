export const __stub = 1;
// import { request, type ClientRequest, type IncomingMessage } from "node:http";
//
// import { z } from "zod";
//
// import { AnalysisCancelledError } from "../domain/analysisErrorCore.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { BrowserObservationError } from "../domain/browserObservationError.js";
// import type { BrowserObservationOperation } from "../domain/browserObservationErrors.js";
// import { sanitizeBrowserUrl } from "../domain/browserObservation.js";
// import { urlDeclaresQueryOrFragment } from "../domain/urlComponents.js";
// import { safeParseJson } from "../domain/safeJson.js";
// import type { CdpConnection } from "./CdpConnection.js";
//
// const endpointVersionSchema = z.object({
//   Browser: z.string().min(1),
//   "Protocol-Version": z.string().min(1),
//   "User-Agent": z.string(),
//   "V8-Version": z.string(),
//   "WebKit-Version": z.string(),
//   webSocketDebuggerUrl: z.string().min(1),
// });
//
// const endpointTargetSchema = z.object({
//   id: z.string().min(1),
//   type: z.string().min(1),
//   title: z.string().default(""),
//   url: z.string(),
//   attached: z.boolean().nullable().optional(),
//   webSocketDebuggerUrl: z.string().min(1).optional(),
// });
// const endpointTargetsSchema = z.array(endpointTargetSchema);
//
// /** Per-response bounds for loopback CDP discovery documents. */
// const CDP_DISCOVERY_RESPONSE_LIMITS = {
//   bytes: 8 * 1024 * 1024,
//   timeoutMs: 10_000,
// } as const;
//
// interface CdpDiscoveryResponseLimits {
//   readonly bytes: number;
//   readonly timeoutMs: number;
// }
//
// const browserSocketVersionSchema = z.object({
//   protocolVersion: z.string().min(1),
//   product: z.string().min(1),
//   revision: z.string(),
//   userAgent: z.string(),
//   jsVersion: z.string(),
// });
//
// const browserSocketTargetsSchema = z.object({
//   targetInfos: z.array(
//     z.object({
//       targetId: z.string().min(1),
//       type: z.string().min(1),
//       title: z.string().default(""),
//       url: z.string(),
//       attached: z.boolean().optional(),
//     }),
//   ),
// });
//
// /** Validated direct CDP WebSocket bound to one discovered page target. */
// interface CdpPageWebSocketEndpoint {
//   readonly scope: "page";
//   readonly targetId: string;
//   readonly url: string;
// }
//
// /** Validated CDP discovery socket and its command-routing scope. */
// export type CdpWebSocketEndpoint =
//   | { readonly scope: "browser"; readonly url: string }
//   | CdpPageWebSocketEndpoint;
//
// /** Bounded discovery target with an optional validated direct transport. */
// export interface CdpEndpointTarget {
//   readonly id: string;
//   readonly type: string;
//   readonly title: string;
//   readonly url: string;
//   readonly attached: boolean | null;
//   readonly webSocket?: CdpPageWebSocketEndpoint;
// }
//
// export interface CdpEndpointDiscovery {
//   readonly webSocket: CdpWebSocketEndpoint;
//   readonly version: {
//     readonly product: string;
//     readonly protocol_version: string;
//     readonly revision: string;
//     readonly user_agent: string;
//     readonly js_version: string;
//   };
//   readonly targets: readonly CdpEndpointTarget[];
// }
//
// /** Read CDP discovery endpoints without following redirects. */
// export const discoverCdpEndpoint = async (
//   endpoint: string,
//   operation: BrowserObservationOperation,
//   signal?: AbortSignal,
// ): Promise<CdpEndpointDiscovery> => {
//   const versionInput = await readCdpJson(
//     new URL("/json/version", endpoint),
//     operation,
//     signal,
//   );
//   const targetsInput = await readCdpJson(
//     new URL("/json/list", endpoint),
//     operation,
//     signal,
//   );
//   const version = parseCdpEndpointValue(
//     endpointVersionSchema,
//     versionInput,
//     operation,
//   );
//   const targets = parseCdpEndpointValue(
//     endpointTargetsSchema,
//     targetsInput,
//     operation,
//   );
//   return {
//     webSocket: safeCdpWebSocketEndpoint(
//       endpoint,
//       version.webSocketDebuggerUrl,
//       operation,
//     ),
//     version: {
//       product: version.Browser,
//       protocol_version: version["Protocol-Version"],
//       revision: version["WebKit-Version"],
export const _l = 133;
