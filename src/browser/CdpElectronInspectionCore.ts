import type { ProgressReporter } from "../application/ProgressReporter.js";
import type {
  ElectronPageInspection,
  InspectElectronPageInput,
} from "../domain/javascript/electronObservation.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import type { CdpConnection } from "./CdpConnection.js";
import type { CdpEndpointDiscovery, CdpEndpointTarget } from "./CdpEndpoint.js";
import { CdpCaptureCompleteness } from "./CdpCaptureCompleteness.js";
import {
  delayWithCancellation,
  recordValue,
  cdpStringValue,
} from "./CdpCaptureValues.js";
import {
  ingestElectronScriptEvent,
  type ElectronScriptDraft,
} from "./CdpElectronScriptEvents.js";
import { captureElectronScripts } from "./CdpElectronScripts.js";
import { captureElectronWorkers } from "./CdpElectronWorkers.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

interface ElectronContext {
  readonly connection: CdpConnection;
  readonly sessionId: string | undefined;
  readonly discovery: CdpEndpointDiscovery;
  readonly target: CdpEndpointTarget;
  readonly input: InspectElectronPageInput;
  readonly signal?: AbortSignal;
  readonly progress?: ProgressReporter;
}

interface ElectronInspectionState {
  readonly completeness: CdpCaptureCompleteness;
  readonly scripts: ElectronScriptDraft[];
  readonly executionContextFrames: Map<string, string>;
  readonly limitations: string[];
  mainFrameId: string | undefined;
  navigationDuringCapture: boolean;
}

/** Passively inspect one Electron file page from the selected CDP endpoint. */
export const inspectCdpElectronPage = async (
  context: ElectronContext,
): Promise<ElectronPageInspection> => {
  const state: ElectronInspectionState = {
    completeness: new CdpCaptureCompleteness(),
    scripts: [],
    executionContextFrames: new Map(),
    limitations: [
      "Local file paths exposed by the selected CDP target are retained in the observation.",
      "REA does not evaluate renderer JavaScript, invoke Electron APIs, navigate, click, or close the page.",
      "Select include_script_sources to retain script contents.",
      ...(context.target.attached === null
        ? [
            "CDP discovery omitted the target attachment state; attached is reported as unknown.",
          ]
        : []),
    ],
    mainFrameId: undefined,
    navigationDuringCapture: false,
  };
  const removeListener = context.connection.onEvent((event) => {
    if (event.sessionId !== context.sessionId) return;
    ingestElectronScriptEvent({
      event,
      scripts: state.scripts,
      executionContextFrames: state.executionContextFrames,
      completeness: state.completeness,
    });
    if (
      state.mainFrameId !== undefined &&
      navigatedFrameId(event) === state.mainFrameId
    )
      state.navigationDuringCapture = true;
  });
  try {
    return await runElectronInspection(
      context,
      state,
      new Date().toISOString(),
    );
  } finally {
    removeListener();
  }
};

const runElectronInspection = async (
  context: ElectronContext,
  state: ElectronInspectionState,
  startedAt: string,
): Promise<ElectronPageInspection> => {
  const frames = await authorizeInitialFrames(context, state);
  const main = frames.at(0);
  if (main === undefined)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
  state.mainFrameId = main.frame_id;
  await enableElectronCapture(context);
  await delayWithCancellation(
    context.input.observation_ms,
    "inspect_electron_page",
    context.signal,
  );
  const captured = await captureElectronContent(context, state, frames);
  await assertStableMainFrame(context, state, main.file_path);
  await report(context.progress, 3, "Electron inspection complete");
  return {
    browser: context.discovery.version,
    target: {
      target_id: context.target.id,
      type: context.target.type,
      title: context.target.title,
      file_path: main.file_path,
      attached: context.target.attached,
    },
    capture_window: {
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      observation_ms: context.input.observation_ms,
    },
    completeness: state.completeness.snapshot(),
    frames,
    ...captured,
    limitations: state.limitations,
  };
};

const authorizeInitialFrames = async (
  context: ElectronContext,
  state: ElectronInspectionState,
): Promise<ElectronPageInspection["frames"]> => {
  await report(context.progress, 1, "Authorizing Electron file frames");
  await context.connection.send(
    "Page.enable",
    {},
    context.sessionId,
    context.signal,
  );
  const result = await context.connection.send(
    "Page.getFrameTree",
    {},
    context.sessionId,
    context.signal,
  );
  const frames = await captureFrames(result, state.completeness);
  if (frames[0] === undefined)
    throw new BrowserObservationError("inspect_web_page", "target_not_allowed");
  return frames;
};

const enableElectronCapture = async (
  context: ElectronContext,
): Promise<void> => {
  await context.connection.send(
    "Runtime.enable",
    {},
    context.sessionId,
    context.signal,
  );
  await context.connection.send(
    "Debugger.enable",
    {},
    context.sessionId,
    context.signal,
  );
};

const captureElectronContent = async (
  context: ElectronContext,
  state: ElectronInspectionState,
  frames: ElectronPageInspection["frames"],
): Promise<
  Pick<ElectronPageInspection, "dom" | "scripts" | "resources" | "workers">
> => {
  await report(context.progress, 2, "Capturing Electron structure");
  const frameIds = new Set(frames.map((frame) => frame.frame_id));
  const resources = await captureResources(context, state.completeness);
  const dom = await captureDom(context, state.completeness);
  const scripts = await captureElectronScripts({
    connection: context.connection,
    sessionId: context.sessionId,
    ...(context.signal === undefined ? {} : { signal: context.signal }),
    request: context.input,
    scripts: state.scripts,
    executionContextFrames: state.executionContextFrames,
    frameIds,
    completeness: state.completeness,
  });
  const workers = await captureElectronWorkers({
    connection: context.connection,
    ...(context.signal === undefined ? {} : { signal: context.signal }),
    target: context.target,
    request: context.input,
    frameIds,
    completeness: state.completeness,
    limitations: state.limitations,
  });
  return { dom, scripts, resources, workers };
};
