export const __stub = 1;
// };
//
// const hasNewDocument = (
//   documentCommitted: boolean,
//   previous: FrameScopeFrame | undefined,
//   url: string,
//   loaderId: string | undefined,
// ): boolean =>
//   documentCommitted &&
//   previous !== undefined &&
//   (previous.url !== url ||
//     (loaderId !== undefined &&
//       previous.loaderId !== undefined &&
//       previous.loaderId !== loaderId));
//
// const removeFrameTools = (
//   frameId: string,
//   tools: Map<string, WebMcpDiscovery["tools"]["items"][number]>,
// ): void => {
//   for (const [key, tool] of tools)
//     if (tool.frame_id === frameId) tools.delete(key);
// };
//
// const isTransientFrameUrl = (url: string | undefined): boolean =>
//   url === "" || url === "about:blank" || url === "about:srcdoc";
//
// const removeFrame = (
//   frameId: string,
//   frames: Map<string, FrameScopeFrame>,
//   tools: Map<string, WebMcpDiscovery["tools"]["items"][number]>,
// ): void => {
//   const pending = [frameId];
//   const removed = new Set<string>();
//   while (pending.length > 0) {
//     const current = pending.pop();
//     if (current === undefined || removed.has(current)) continue;
//     removed.add(current);
//     for (const [candidate, frame] of frames)
//       if (frame.parentFrameId === current) pending.push(candidate);
//     frames.delete(current);
//   }
//   for (const [key, tool] of tools)
//     if (removed.has(tool.frame_id)) tools.delete(key);
// };
//
// const assertStableAuthorizedFrame = async (
//   context: DiscoveryContext,
//   initialUrl: string | undefined,
//   origins: ReadonlySet<string>,
// ): Promise<void> => {
//   const finalTree = await context.connection.send(
//     "Page.getFrameTree",
//     {},
//     context.sessionId,
//     context.signal,
//   );
//   const finalUrl = mainFrameUrl(finalTree);
//   if (allowedSanitizedUrl(finalUrl, origins) === undefined)
//     throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
//   if (finalUrl !== initialUrl)
//     throw new BrowserObservationError("inspect_web_page", "target_changed");
// };
//
// interface WebMcpIngestOptions {
//   readonly event: CdpEvent;
//   readonly input: DiscoverWebMcpToolsInput;
//   readonly frames: ReadonlyMap<
//     string,
//     { readonly url: string; readonly origin: string | null }
//   >;
//   readonly tools: Map<string, WebMcpDiscovery["tools"]["items"][number]>;
//   readonly completeness: CdpCaptureCompleteness;
//   readonly transientFrames: Set<string>;
//   readonly resolvedTransientFrames: Set<string>;
// }
//
// const ingestWebMcpEvent = (options: WebMcpIngestOptions): void => {
//   const {
//     event,
//     input,
//     frames,
//     tools,
//     completeness,
//     transientFrames,
//     resolvedTransientFrames,
//   } = options;
//   if (
//     event.method !== "WebMCP.toolsAdded" &&
//     event.method !== "WebMCP.toolsRemoved"
//   )
//     return;
//   const params = recordValue(event.params);
//   if (params === undefined) {
//     completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return;
//   }
//   if (event.method === "WebMCP.toolsRemoved") {
//     for (const removed of webMcpEventTools(params.tools, completeness)) {
//       const name = cdpStringValue(removed.name);
//       const frameId = cdpStringValue(removed.frameId);
//       if (name === undefined || frameId === undefined) {
//         completeness.exclude("webmcp_tools", "invalid_protocol_value");
//         continue;
//       }
//       for (const [key, tool] of tools)
//         if (tool.name === name && tool.frame_id === frameId) tools.delete(key);
//     }
//     return;
//   }
//   for (const declared of webMcpEventTools(params.tools, completeness)) {
//     const frameId = cdpStringValue(declared.frameId);
//     if (frameId !== undefined && transientFrames.has(frameId)) {
//       if (!resolvedTransientFrames.has(frameId)) continue;
//       transientFrames.delete(frameId);
//       resolvedTransientFrames.delete(frameId);
//     }
//     const normalized = normalizeTool(declared, input, frames, completeness);
//     if (normalized === undefined) continue;
//     tools.set(normalized.tool_key, normalized);
//   }
// };
//
// const webMcpEventTools = (
//   value: unknown,
//   completeness: CdpCaptureCompleteness,
// ): UnknownRecord[] => {
//   if (!Array.isArray(value)) {
//     completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return [];
//   }
//   const records: UnknownRecord[] = [];
//   for (const item of value) {
//     const record = recordValue(item);
//     if (record === undefined) {
//       completeness.exclude("webmcp_tools", "invalid_protocol_value");
//       continue;
//     }
//     records.push(record);
//   }
//   return records;
// };
//
export const _l = 142;
