import type { WebPageInspection } from "../domain/browserObservationSchemas.js";
import type { ProgressReporter } from "../application/ProgressReporter.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import type { CdpEndpointTarget } from "./CdpEndpoint.js";
import { CdpConnection } from "./CdpConnection.js";
import { authorizedMainFrame } from "./CdpAuthorizedMainFrame.js";
import { optionalCdpCommand } from "./CdpOptionalCommand.js";
import { CdpCommandRejection } from "./CdpCommandRejection.js";
import {
  captureAccessibility,
  captureDom,
  captureFrames,
  type CapturedResource,
  type DomCapture,
} from "./CdpCaptureDocuments.js";
import { capturedSvgNodeKind } from "./CdpCaptureDomSvg.js";
import {
  allowedSanitizedUrl,
  delayWithCancellation,
} from "./CdpCaptureValues.js";

const authorizeObservationWindow = async (
  state: CaptureState,
): Promise<void> => {
  const { context, allowedOrigins, events } = state;
  const { connection, sessionId, signal } = context;
  await report(context.progress, 1, "Enabling passive CDP domains");
  await connection.send("Page.enable", {}, sessionId, signal);
  const initialFrameResult = await authorizedMainFrame({
    connection: context.connection,
    sessionId: context.sessionId,
    signal: context.signal,
    allowedOrigins,
    operation: context.operation,
  });
  const mainFrame = captureFrames(initialFrameResult, allowedOrigins).items[0];
  if (mainFrame === undefined)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
  events.beginAuthorizedFrame(mainFrame.frame_id);
  await enableObservationDomains(connection, sessionId, signal);
  await report(context.progress, 2, "Observing page events");
  await delayWithCancellation(
    context.input.observation_ms,
    context.operation,
    signal,
  );
  if (events.originViolation)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
};

const capturePageDom = async (state: CaptureState): Promise<DomCapture> => {
  const { context, allowedOrigins } = state;
  const result = await context.connection.send(
    "DOMSnapshot.captureSnapshot",
    {
      computedStyles: [],
      includePaintOrder: false,
      includeDOMRects: false,
    },
    context.sessionId,
    context.signal,
  );
  const capture = captureDom(
    result,
    allowedOrigins,
    context.input,
    state.events.completeness,
  );
  let step = capture.next();
  let descriptionUnavailable = false;
  const pendingController = new AbortController();
  const signal =
    context.signal === undefined
      ? pendingController.signal
      : AbortSignal.any([context.signal, pendingController.signal]);
  while (!step.done) {
    const pending = step.value.map(async (query) => {
      if (descriptionUnavailable) return undefined;
      try {
        return capturedSvgNodeKind(
          query,
          await context.connection.send(
            "DOM.describeNode",
            { backendNodeId: query.backendNodeId, depth: 0 },
            context.sessionId,
            signal,
          ),
        );
      } catch (cause: unknown) {
        // A detached node can disappear between snapshot and description.
        // Preserve partial metadata, but propagate transport/cancellation errors.
        if (!(cause instanceof CdpCommandRejection)) throw cause;
        if (cause.code === -32_601) descriptionUnavailable = true;
        else if (cause.code !== -32_000) throw cause;
        return undefined;
      }
    });
    try {
      // Promise.all preserves snapshot order even when CDP replies out of order.
      step = capture.next(await Promise.all(pending));
    } catch (cause: unknown) {
      // Stop and settle this bounded batch before the session can be detached.
      pendingController.abort();
      await Promise.allSettled(pending);
      throw cause;
    }
  }
  if (step.value.unresolvedSvgNodes > 0)
    state.limitations.push(
      `SVG identity was unavailable for ${String(step.value.unresolvedSvgNodes)} snapshotted XLink candidate nodes; their URL destinations remain unknown.`,
    );
  return step.value;
};

const normalizedInspection = (
  state: CaptureState,
  captured: CapturedSections,
): WebPageInspection => ({
  browser: state.context.discovery.version,
  target: normalizedTarget(
    state.context.target,
    captured.attachedUrl,
    state.allowedOrigins,
  ),
  capture_window: {
    started_at: state.startedAt,
    ended_at: new Date().toISOString(),
    observation_ms: state.context.input.observation_ms,
  },
  completeness: state.events.completeness.snapshot(),
  frames: [...captured.frames],
  dom: { total_nodes: captured.dom.total, nodes: [...captured.dom.nodes] },
  accessibility: {
    total_nodes: captured.accessibility.total,
    text_capture: captured.accessibility.textCapture,
    nodes: [...captured.accessibility.nodes],
  },
  scripts: captured.scripts,
  resources: [...captured.resources],
  network: {
    requests: [...state.events.network.values()],
    websocket_connections: [...state.events.webSocketConnectionsById.values()],
    coverage_started_at: state.startedAt,
    prior_activity_available: false,
  },
  console: {
    events: [...state.events.console],
    coverage_started_at: state.startedAt,
    prior_activity_available: false,
  },
  workers: [...captured.workers],
  metadata: {
    responses: [...state.events.responseMetadata],
    dom_urls: [...captured.dom.urls],
    agent_hints: deduplicatedAgentHints([
      ...state.events.agentHints,
      ...captured.dom.agentHints,
    ]),
    excluded_dom_urls: captured.dom.excludedUrls,
    headers_allowlisted: true,
  },
  storage: captured.storage,
  limitations: state.limitations,
});

const enableObservationDomains = async (
  connection: CdpConnection,
  sessionId: string | undefined,
  signal?: AbortSignal,
): Promise<void> => {
  await connection.send("Runtime.enable", {}, sessionId, signal);
  await connection.send("Debugger.enable", {}, sessionId, signal);
  await connection.send("Network.enable", {}, sessionId, signal);
};

const accessibilityForFrames = async (
  state: CaptureState,
  frames: readonly { readonly frame_id: string }[],
): Promise<ReturnType<typeof captureAccessibility>> => {
  const { context, limitations, events } = state;
  const results: unknown[] = [];
  let unavailable = false;
  for (const frame of frames) {
    const result = await optionalCdpCommand(
      context,
      "Accessibility.getFullAXTree",
      { frameId: frame.frame_id },
      limitations,
    );
    if (result === undefined) unavailable = true;
    else results.push(result);
  }
  if (unavailable) events.completeness.unavailable("accessibility");
  const capture = captureAccessibility(results, {
    includeText: context.input.include_accessibility_text,
    ...(results.length === 0 && unavailable ? { unavailable: true } : {}),
  });
  if (!context.input.include_accessibility_text)
    events.completeness.exclude(
      "accessibility",
      "not_approved",
      capture.textCapture.excluded_fields,
    );
  if (capture.treeIncomplete) events.completeness.truncate("accessibility");
  return capture;
};

const publicResource = ({ rawUrl: _rawUrl, ...resource }: CapturedResource) =>
  resource;

const deduplicatedAgentHints = (
  hints: WebPageInspection["metadata"]["agent_hints"],
): WebPageInspection["metadata"]["agent_hints"] => {
  const seen = new Set<string>();
  return hints.filter((hint) => {
    const key = `${hint.mechanism}\0${hint.declaration}\0${hint.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizedTarget = (
  target: CdpEndpointTarget,
  currentUrl: string,
  allowedOrigins: ReadonlySet<string>,
): WebPageInspection["target"] => {
  const url = allowedSanitizedUrl(currentUrl, allowedOrigins);
  return {
    target_id: target.id,
    type: target.type,
    title: target.title,
    url: url?.url ?? "[unsupported-url]",
    origin: url?.origin ?? "",
    attached: target.attached,
  };
};

const report = async (
  progress: ProgressReporter | undefined,
  completed: number,
  message: string,
): Promise<void> =>
  await progress?.report({
    phase: "browser_observation",
    completed,
    total: 3,
    message,
    ...(completed === 3 ? { terminal: true } : {}),
  });
