import type { InspectWebPageInput } from "../domain/browserObservation.js";
import type { WebPageInspection } from "../domain/browserObservationSchemas.js";
import type { ProgressReporter } from "../application/ProgressReporter.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import type { BrowserObservationOperation } from "../domain/browserObservationErrors.js";
import { stableWebResources } from "../domain/webInventory.js";
import type { CdpEndpointDiscovery, CdpEndpointTarget } from "./CdpEndpoint.js";
import { CdpConnection } from "./CdpConnection.js";
import { CdpCaptureEvents } from "./CdpCaptureEvents.js";
import { authorizedMainFrame } from "./CdpAuthorizedMainFrame.js";
import { captureStorage } from "./CdpCaptureStorage.js";
import { optionalCdpCommand } from "./CdpOptionalCommand.js";
import { CdpCommandRejection } from "./CdpCommandRejection.js";
import {
  captureAccessibility,
  captureDom,
  captureFrames,
  captureResources,
  type CapturedResource,
  type DomCapture,
  mainFrameUrl,
} from "./CdpCaptureDocuments.js";
import { capturedSvgNodeKind } from "./CdpCaptureDomSvg.js";
import {
  allowedSanitizedUrl,
  delayWithCancellation,
} from "./CdpCaptureValues.js";
import { captureScripts } from "./CdpPageCaptureScripts.js";
import { captureWorkers } from "./CdpPageCaptureWorkers.js";
import type { WebSourceMapRequest } from "./WebSourceMapFetcher.js";

export interface CaptureContext {
  readonly connection: CdpConnection;
  readonly sessionId: string | undefined;
  readonly operation: Extract<
    BrowserObservationOperation,
    "inspect_web_page" | "analyze_web_bundle"
  >;
  readonly discovery: CdpEndpointDiscovery;
  readonly target: CdpEndpointTarget;
  readonly input: InspectWebPageInput;
  readonly signal?: AbortSignal;
  readonly progress?: ProgressReporter;
}

interface CaptureState {
  readonly context: CaptureContext;
  readonly events: CdpCaptureEvents;
  readonly allowedOrigins: ReadonlySet<string>;
  readonly limitations: string[];
  readonly startedAt: string;
}

interface CapturedSections {
  readonly attachedUrl: string;
  readonly frames: WebPageInspection["frames"];
  readonly dom: DomCapture;
  readonly accessibility: ReturnType<typeof captureAccessibility>;
  readonly scripts: WebPageInspection["scripts"];
  readonly resources: WebPageInspection["resources"];
  readonly workers: WebPageInspection["workers"];
  readonly storage: WebPageInspection["storage"];
}

export interface CapturedPage {
  readonly inspection: WebPageInspection;
  readonly sourceMapRequests: readonly WebSourceMapRequest[];
}

/** Capture and normalize one attached page without evaluating page JavaScript. */
export const capturePage = async (
  context: CaptureContext,
): Promise<CapturedPage> => {
  const allowedOrigins = new Set(context.input.allowed_origins);
  const events = new CdpCaptureEvents(context.input, allowedOrigins);
  const removeListener = context.connection.onEvent((event) => {
    if (event.sessionId !== context.sessionId) return;
    events.ingest(event);
  });
  const state: CaptureState = {
    context,
    events,
    allowedOrigins,
    limitations: [
      "Observation starts when REA attaches; prior network and console activity is unavailable.",
      "Raw network headers, bodies, cookies, storage values, console objects, and WebSocket payloads are never retained; explicitly requested primitive console text is retained verbatim, while payload captures retain value-free shapes.",
      "Source maps are reported only as declarative URLs and are not fetched.",
      "URL-less scripts and console events without an allowed source URL are excluded because their origin cannot be proven.",
      ...(context.target.attached === null
        ? [
            "CDP discovery omitted the target attachment state; attached is reported as unknown.",
          ]
        : []),
    ],
    startedAt: new Date().toISOString(),
  };
  try {
    return await captureAuthorizedPage(state);
  } finally {
    removeListener();
  }
};

const captureAuthorizedPage = async (
  state: CaptureState,
): Promise<CapturedPage> => {
  const { context, allowedOrigins, limitations } = state;
  const { connection, sessionId, input, signal } = context;
  await authorizeObservationWindow(state);
  await captureJsonResponseBodies(state);
  const frameResult = await authorizedMainFrame({
    connection: context.connection,
    sessionId: context.sessionId,
    signal: context.signal,
    allowedOrigins,
    operation: context.operation,
  });
  const attachedUrl = mainFrameUrl(frameResult) ?? "";
  const frameCapture = captureFrames(
    frameResult,
    allowedOrigins,
    undefined,
    state.events.completeness,
  );
  const frames = frameCapture.items;
  const captureFrame = frames[0];
  if (captureFrame === undefined)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
  state.events.beginFinalCapture(captureFrame.frame_id);
  const resourceCapture = captureResources(
    await connection.send("Page.getResourceTree", {}, sessionId, signal),
    allowedOrigins,
    state.events.completeness,
  );
  const resources = stableWebResources(
    resourceCapture.items.map(publicResource),
  );
  const dom = await capturePageDom(state);
  const accessibility = await accessibilityForFrames(state, frames);
  const scripts = await captureScripts({
    context,
    events: state.events,
    rawResources: resourceCapture.items,
    resources,
    frameIds: new Set(frames.map((frame) => frame.frame_id)),
  });
  const workers = await captureWorkers(
    { context, allowedOrigins, limitations, events: state.events },
    new Set(frames.map((frame) => frame.frame_id)),
  );
  const storageCapture = await captureStorage(
    context,
    attachedUrl,
    limitations,
  );
  if (!input.include_storage_keys)
    state.events.completeness.exclude("storage_keys", "not_approved", null);
  else if (storageCapture.keysExclusion !== undefined)
    state.events.completeness.exclude(
      "storage_keys",
      storageCapture.keysExclusion,
      null,
    );
  await report(context.progress, 3, "Normalizing browser evidence");
  const completedFrameResult = await authorizedMainFrame({
    connection: context.connection,
    sessionId: context.sessionId,
    signal: context.signal,
    allowedOrigins,
    operation: context.operation,
  });
  const completedUrl = mainFrameUrl(completedFrameResult) ?? "";
  if (state.events.originViolation)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
  if (state.events.navigationDuringCapture || completedUrl !== attachedUrl)
    throw new BrowserObservationError("inspect_web_page", "target_changed");
  // Body IDs were enumerated before asynchronous CDP reads. Events remain
  // enabled through the final capture, so account for eligible responses that
  // arrived while those reads were pending.
  state.events.settleUnexaminedResponseBodies();
  state.events.recordScriptMetadataBudgetExclusions();
  return {
    inspection: normalizedInspection(state, {
      attachedUrl,
      frames,
      dom,
      accessibility,
      scripts: scripts.inventory,
      resources,
      workers,
      storage: storageCapture.value,
    }),
    sourceMapRequests: scripts.sourceMapRequests,
  };
};

const captureJsonResponseBodies = async (
  state: CaptureState,
): Promise<void> => {
  const requests = state.events.responseBodyRequests();
  for (let index = 0; index < requests.length; index += 1) {
    const candidate = requests[index];
    if (candidate === undefined) continue;
    const current = state.events.currentResponseBodyRequest(candidate);
    if (current === undefined) continue;
    if (current.encoded_data_length === null) {
      state.events.responseBodyUnavailable(candidate);
      continue;
    }
    let result: unknown;
    try {
      result = await optionalCdpCommand(
        state.context,
        "Network.getResponseBody",
        { requestId: candidate.requestId },
        state.limitations,
      );
    } catch (cause: unknown) {
      if (
        !(cause instanceof CdpCommandRejection) ||
        cause.command !== "Network.getResponseBody" ||
        cause.code !== -32_000 ||
        cause.reportedMessage === null
      )
        throw cause;
      state.events.responseBodyUnavailable(candidate);
      state.limitations.push(
        `Response body unavailable for request ${candidate.requestId}: ${cause.userMessage}`,
      );
      continue;
    }
    if (result !== undefined) {
      state.events.ingestResponseBody(candidate, result);
      continue;
    }
    for (const remaining of requests.slice(index))
      state.events.responseBodyUnavailable(remaining);
    return;
  }
};
