export const __stub = 1;
//
// interface FrameScopeState {
//   readonly origins: ReadonlySet<string>;
//   readonly frames: Map<string, FrameScopeFrame>;
//   readonly tools: Map<string, WebMcpDiscovery["tools"]["items"][number]>;
//   readonly completeness: CdpCaptureCompleteness;
//   readonly transientFrames: Set<string>;
//   readonly resolvedTransientFrames: Set<string>;
// }
//
// interface FrameScopeFrame {
//   readonly url: string;
//   readonly origin: string | null;
//   readonly parentFrameId: string | null;
//   readonly loaderId?: string | undefined;
// }
//
// const initialFrameScope = (
//   frameTree: unknown,
//   frames: ReturnType<typeof captureFrames>["items"],
//   completeness: CdpCaptureCompleteness,
// ): Map<string, FrameScopeFrame> => {
//   const scoped = new Map<string, FrameScopeFrame>(
//     frames.map((frame) => [
//       frame.frame_id,
//       {
//         url: frame.url,
//         origin: frame.origin,
//         parentFrameId: frame.parent_frame_id,
//       },
//     ]),
//   );
//   const root = recordValue(recordValue(frameTree)?.frameTree);
//   if (root === undefined) return scoped;
//   for (const tree of walkFrameTrees(root, () =>
//     completeness.exclude("webmcp_tools", "invalid_protocol_value"),
//   )) {
//     const frame = recordValue(tree.frame);
//     const frameId = cdpStringValue(frame?.id);
//     const prior = frameId === undefined ? undefined : scoped.get(frameId);
//     if (frameId !== undefined && prior !== undefined)
//       scoped.set(frameId, {
//         ...prior,
//         loaderId: cdpStringValue(frame?.loaderId),
//       });
//   }
//   return scoped;
// };
//
// const ingestFrameScopeEvent = (
//   event: CdpEvent,
//   state: FrameScopeState,
// ): boolean => {
//   const params = recordValue(event.params);
//   if (params === undefined) return false;
//   switch (event.method) {
//     case "Page.frameDetached":
//       return handleFrameDetached(params, state);
//     case "Page.frameNavigated":
//       return handleFrameUpdate(recordValue(params.frame), state, true);
//     case "Page.navigatedWithinDocument":
//       return handleFrameUpdate(params, state, false);
//     default:
//       return false;
//   }
// };
//
// const handleFrameDetached = (
//   params: UnknownRecord,
//   state: FrameScopeState,
// ): boolean => {
//   const frameId = cdpStringValue(params.frameId);
//   if (frameId === undefined) {
//     state.completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return true;
//   }
//   removeFrame(frameId, state.frames, state.tools);
//   state.transientFrames.delete(frameId);
//   state.resolvedTransientFrames.delete(frameId);
//   return true;
// };
//
// const handleFrameUpdate = (
//   frame: UnknownRecord | undefined,
//   state: FrameScopeState,
//   documentCommitted: boolean,
// ): boolean => {
//   if (frame === undefined) {
//     state.completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return true;
//   }
//   const frameId = cdpStringValue(frame?.id) ?? cdpStringValue(frame?.frameId);
//   if (frameId === undefined) {
//     state.completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return true;
//   }
//   const rawUrl = cdpStringValue(frame?.url);
//   // Chromium can briefly commit an inherited, empty document while replacing
//   // a subframe. That intermediate URL says nothing about the frame's eventual
//   // scope or its registered tools; wait for the next committed URL (or the
//   // authoritative frame-tree re-probe at the end of discovery).
//   if (isTransientFrameUrl(rawUrl)) {
//     if (documentCommitted) {
//       removeFrameTools(frameId, state.tools);
//       state.transientFrames.add(frameId);
//       state.resolvedTransientFrames.delete(frameId);
//     }
//     return true;
//   }
//   updateFrameScope(frame, frameId, state, documentCommitted);
//   return true;
// };
//
// const updateFrameScope = (
//   frame: UnknownRecord,
//   frameId: string,
//   state: FrameScopeState,
//   documentCommitted: boolean,
// ): void => {
//   const url = allowedSanitizedUrl(frame?.url, state.origins);
//   if (url === undefined || url.origin === null) {
//     removeFrameTools(frameId, state.tools);
//     state.frames.delete(frameId);
//     state.completeness.exclude("webmcp_tools", "out_of_target_scope");
//     return;
//   }
//   const previous = state.frames.get(frameId);
//   const loaderId = cdpStringValue(frame?.loaderId);
//   if (hasNewDocument(documentCommitted, previous, url.url, loaderId))
//     removeFrameTools(frameId, state.tools);
//   if (documentCommitted && state.transientFrames.has(frameId))
//     state.resolvedTransientFrames.add(frameId);
//   state.frames.set(frameId, {
//     url: url.url,
//     origin: url.origin,
//     ...(loaderId === undefined ? {} : { loaderId }),
//     parentFrameId:
//       (cdpStringValue(frame?.parentId) ??
//         state.frames.get(frameId)?.parentFrameId ??
//         "") ||
//       null,
//   });
export const _l = 142;
