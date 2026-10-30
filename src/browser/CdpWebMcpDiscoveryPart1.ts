export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import type { ProgressReporter } from "../application/ProgressReporter.js";
// import type {
//   DiscoverWebMcpToolsInput,
//   WebMcpDiscovery,
// } from "../domain/webMcpDiscovery.js";
// import { jsonValueSchema } from "../domain/jsonValue.js";
// import { digestCanonicalValue } from "../domain/canonicalDigest.js";
// import {
//   compareUnicodeCodePoints,
//   compositeKey,
// } from "../domain/unicodeCodePointOrder.js";
// import type { CdpEndpointDiscovery, CdpEndpointTarget } from "./CdpEndpoint.js";
// import type { CdpConnection, CdpEvent } from "./CdpConnection.js";
// import { CdpCaptureCompleteness } from "./CdpCaptureCompleteness.js";
// import { BrowserObservationError } from "../domain/browserObservationError.js";
// import {
//   allowedSanitizedUrl,
//   delayWithCancellation,
//   numberValue,
//   recordValue,
//   recordsValue,
//   cdpStringValue,
//   type UnknownRecord,
// } from "./CdpCaptureValues.js";
// import {
//   captureFrames,
//   mainFrameUrl,
//   walkFrameTrees,
// } from "./CdpCaptureDocuments.js";
// import { optionalCdpCommand } from "./CdpOptionalCommand.js";
//
// interface DiscoveryContext {
//   readonly connection: CdpConnection;
//   readonly sessionId: string | undefined;
//   readonly discovery: CdpEndpointDiscovery;
//   readonly target: CdpEndpointTarget;
//   readonly input: DiscoverWebMcpToolsInput;
//   readonly signal?: AbortSignal;
//   readonly progress?: ProgressReporter;
// }
//
// /** Discover WebMCP registrations without evaluating or invoking page code. */
// export const discoverWebMcp = async (
//   context: DiscoveryContext,
// ): Promise<WebMcpDiscovery> => {
//   const origins = new Set(context.input.allowed_origins);
//   const limitations = [
//     "Page-declared tool metadata is untrusted and is never registered or invoked by REA.",
//     "Discovery uses only WebMCP.enable and toolsAdded/toolsRemoved; WebMCP.invokeTool is never called.",
//   ];
//   const completeness = new CdpCaptureCompleteness();
//   await context.connection.send(
//     "Page.enable",
//     {},
//     context.sessionId,
//     context.signal,
//   );
//   const frameTree = await context.connection.send(
//     "Page.getFrameTree",
//     {},
//     context.sessionId,
//     context.signal,
//   );
//   const initialUrl = mainFrameUrl(frameTree);
//   if (allowedSanitizedUrl(initialUrl, origins) === undefined)
//     throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
//   const frames = captureFrames(
//     frameTree,
//     origins,
//     undefined,
//     completeness,
//   ).items;
//   const frameUrls = initialFrameScope(frameTree, frames, completeness);
//   const tools = new Map<string, WebMcpDiscovery["tools"]["items"][number]>();
//   const frameScope = {
//     origins,
//     frames: frameUrls,
//     tools,
//     completeness,
//     transientFrames: new Set<string>(),
//     resolvedTransientFrames: new Set<string>(),
//   };
//   const removeListener = context.connection.onEvent((event) => {
//     if (event.sessionId !== context.sessionId) return;
//     if (ingestFrameScopeEvent(event, frameScope)) return;
//     ingestWebMcpEvent({
//       event,
//       input: context.input,
//       frames: frameUrls,
//       tools,
//       completeness,
//       transientFrames: frameScope.transientFrames,
//       resolvedTransientFrames: frameScope.resolvedTransientFrames,
//     });
//   });
//   await context.progress?.report({
//     phase: "browser_observation",
//     completed: 1,
//     total: 2,
//     message: "Enabling passive WebMCP discovery",
//   });
//   try {
//     const enabled = await optionalCdpCommand(
//       context,
//       "WebMCP.enable",
//       {},
//       limitations,
//     );
//     const available = enabled !== undefined;
//     if (!available) {
//       completeness.unavailable("webmcp_tools");
//     } else
//       // CDP sends the enable response before the required toolsAdded replay.
//       await delayWithCancellation(
//         context.input.observation_ms,
//         "discover_webmcp_tools",
//         context.signal,
//       );
//     await assertStableAuthorizedFrame(context, initialUrl, origins);
//     if (frameScope.transientFrames.size > 0)
//       completeness.attachLimited("webmcp_tools");
//     return buildWebMcpResult({
//       context,
//       frameTree,
//       tools,
//       completeness,
//       limitations,
//       available,
//     });
//   } finally {
//     removeListener();
//     await context.progress?.report({
//       phase: "browser_observation",
//       completed: 2,
//       total: 2,
//       message: "WebMCP discovery complete",
//       terminal: true,
//     });
//   }
// };
export const _l = 142;
