import type { ElectronApplication, Page } from "playwright-core";
import { z } from "zod";

import type { ExecutionOptions } from "../application/AnalysisProvider.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import {
  electronActiveTimelineEventSchema,
  type ElectronActiveObservationInput,
  type ElectronActiveObservationResult,
} from "../domain/javascript/electronActiveObservation.js";

const OPERATION = "capture_electron_scenario" as const;

const hookSnapshotSchema = z.strictObject({
  events: z.array(electronActiveTimelineEventSchema),
  retention_budget_bytes: z.number().int().min(0),
  estimated_retained_bytes: z.number().int().min(0),
  event_serialized_byte_upper_bound: z.number().int().min(0),
  retained: z.number().int().min(0),
  dropped: z.number().int().min(0),
  dropped_ipc: z.number().int().min(0),
  dropped_runtime: z.number().int().min(0),
  dropped_event_families: z.array(
    z.strictObject({
      family: z.string().min(1),
      count: z.number().int().min(1),
    }),
  ),
  dropped_event_roles: z.array(
    z.strictObject({
      role: z.string().min(1),
      count: z.number().int().min(1),
    }),
  ),
  observed: z.number().int().min(0),
  observed_ipc: z.number().int().min(0),
  observed_runtime: z.number().int().min(0),
  hook_error: z.boolean(),
});

const metricSchema = z.strictObject({
  pid: z.number().int().min(1),
  type: z.string().min(1),
  name: z.string().nullable(),
  service_name: z.string().nullable(),
});

const windowMetadataSchema = z.strictObject({
  window_id: z.string(),
  web_contents_id: z.string(),
  url: z.string(),
  title: z.string(),
  visible: z.boolean().nullable(),
  destroyed: z.boolean(),
});

type ElectronAction = ElectronActiveObservationInput["actions"][number];
type ElectronActions = ElectronActiveObservationResult["actions"];

export type ElectronHookSnapshot = z.infer<typeof hookSnapshotSchema>;
export type ElectronHookEvent = z.infer<
  typeof electronActiveTimelineEventSchema
>;
export type ElectronMetrics = z.infer<typeof metricSchema>[];
type ElectronWindowMetadata = z.infer<typeof windowMetadataSchema>;

/** Run explicit actions against provider-owned Electron windows. */
export const runElectronActions = async (
  application: ElectronApplication,
  input: ElectronActiveObservationInput,
  options: ExecutionOptions,
): Promise<ElectronActions> => {
  const actions: ElectronActions = [];
  for (const action of input.actions) {
    const actionStartedAt = performance.now();
    const windowIndex = actionWindowIndex(action);
    let selectedWindow: Page | undefined;
    try {
      if (options.signal?.aborted === true)
        throw new BrowserObservationError(OPERATION, "cancelled");
      selectedWindow =
        windowIndex === null
          ? undefined
          : await waitForWindow({
              application,
              windowIndex,
              signal: options.signal,
            });
      if (
        (action.kind === "click" ||
          action.kind === "renderer-reload" ||
          action.kind === "renderer-crash") &&
        selectedWindow === undefined
      )
        throw new BrowserObservationError(OPERATION, "window_not_found");

      await runAction({
        application,
        action,
        selectedWindow,
        options,
      });
      actions.push({
        step_id: action.step_id,
        kind: action.kind,
        window_index: windowIndex,
        target:
          selectedWindow === undefined ? null : `window:${String(windowIndex)}`,
        status: "completed",
        elapsed_ms: Math.max(
          0,
          Math.round(performance.now() - actionStartedAt),
        ),
        error: null,
      });
    } catch (cause: unknown) {
      actions.push({
        step_id: action.step_id,
        kind: action.kind,
        window_index: windowIndex,
        target:
          selectedWindow === undefined ? null : `window:${String(windowIndex)}`,
        status: options.signal?.aborted ? "cancelled" : "failed",
        elapsed_ms: Math.max(
          0,
          Math.round(performance.now() - actionStartedAt),
        ),
        error: safeActionErrorMessage(cause),
      });
      break;
    }
  }
  return actions;
};

type RunActionContext = {
  readonly application: ElectronApplication;
  readonly action: ElectronAction;
  readonly selectedWindow: Page | undefined;
  readonly options: ExecutionOptions;
};

const runAction = async ({
  application,
  action,
  selectedWindow,
  options,
}: RunActionContext): Promise<void> => {
  switch (action.kind) {
    case "click":
      if (selectedWindow === undefined)
        throw new BrowserObservationError(OPERATION, "window_not_found");
      await runWithExecutionLimits(
        selectedWindow.locator(action.selector).click({
          timeout: 0,
        }),
        options.signal,
      );
      return;
    case "wait": {
      const page =
        selectedWindow ??
        (await application.firstWindow({
          timeout: 0,
        }));
      await runWithExecutionLimits(
        page.waitForTimeout(action.duration_ms),
        options.signal,
      );
      return;
    }
    case "renderer-reload":
      if (selectedWindow === undefined)
        throw new BrowserObservationError(OPERATION, "window_not_found");
      await runWithExecutionLimits(
        selectedWindow.reload({
          timeout: 0,
        }),
        options.signal,
      );
      return;
    case "renderer-crash": {
      const crashed = await runWithExecutionLimits(
        application.evaluate(({ BrowserWindow }, index) => {
          const candidate = BrowserWindow.getAllWindows()[index];
          if (candidate === undefined || candidate.isDestroyed()) return false;
          candidate.webContents.forcefullyCrashRenderer();
          return true;
        }, action.window_index),
        options.signal,
      );
      if (!crashed)
        throw new BrowserObservationError(OPERATION, "window_not_found");
      return;
    }
    case "deep-link":
      await runWithExecutionLimits(
        emitDeepLink(application, action),
        options.signal,
      );
      return;
  }
};
