import type { ElectronApplication, Page } from "playwright-core";
import { z } from "zod";

import type { ExecutionOptions } from "../application/AnalysisProvider.js";
import { BrowserObservationError } from "../domain/browserObservationError.js";
import {
  electronActiveTimelineEventSchema,
  type ElectronActiveObservationInput,
  type ElectronActiveObservationResult,
} from "../domain/javascript/electronActiveObservation.js";

const actionWindowIndex = (action: ElectronAction): number | null => {
  switch (action.kind) {
    case "click":
    case "renderer-reload":
    case "renderer-crash":
      return action.window_index;
    case "wait":
      return action.window_index ?? null;
    case "deep-link":
      return null;
  }
};

type WaitForWindowContext = {
  readonly application: ElectronApplication;
  readonly windowIndex: number;
  readonly signal: AbortSignal | undefined;
};

const waitForWindow = async ({
  application,
  windowIndex,
  signal,
}: WaitForWindowContext): Promise<Page> => {
  while (true) {
    if (signal?.aborted === true)
      throw new BrowserObservationError(OPERATION, "cancelled");
    const window = application.windows()[windowIndex];
    if (window !== undefined) return window;
    await runWithExecutionLimits(
      new Promise<void>((resolve) => setTimeout(resolve, 25)),
      signal,
    );
  }
};

const emitDeepLink = (
  application: ElectronApplication,
  action: Extract<ElectronAction, { kind: "deep-link" }>,
): Promise<boolean> =>
  application.evaluate(
    ({ app }, payload) => {
      if (payload.delivery === "open-url")
        return app.emit(
          "open-url",
          { preventDefault: () => undefined },
          payload.url,
        );
      return app.emit("second-instance", {}, [payload.url], "", {});
    },
    { delivery: action.delivery, url: action.url },
  );

/** Read the current Electron windows, metrics, and hook snapshot. */
// oxlint-disable-next-line max-lines-per-function -- one state read must share one capture boundary.
export const readApplicationState = async (
  application: ElectronApplication,
): Promise<{
  readonly windows: ReadonlyArray<{
    readonly window_id: string;
    readonly web_contents_id: string;
    readonly url: string;
    readonly title: string;
    readonly visible: boolean | null;
    readonly destroyed: boolean;
  }>;
  readonly metrics: ElectronMetrics;
  readonly electronVersion: string;
  readonly hookSnapshot: ElectronHookSnapshot;
}> => {
  const windowMetadataPromise: Promise<ElectronWindowMetadata[]> = application
    .evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map(
        (window: {
          readonly id: number;
          readonly webContents: {
            readonly id: number;
            getURL(): string;
            getTitle(): string;
          };
          isDestroyed(): boolean;
          isVisible(): boolean;
        }) => ({
          window_id: `window:${String(window.id)}`,
          web_contents_id: `webContents:${String(window.webContents.id)}`,
          url: window.webContents.getURL(),
          title: window.webContents.getTitle(),
          visible: window.isDestroyed() ? null : window.isVisible(),
          destroyed: window.isDestroyed(),
        }),
      ),
    )
    .then((value) => z.array(windowMetadataSchema).parse(value));
  const processMetricsPromise: Promise<ElectronMetrics> = application
    .evaluate(({ app }) =>
      app
        .getAppMetrics()
        .map(
          (metric: {
            readonly pid: number;
            readonly type: string;
            readonly name?: string;
            readonly serviceName?: string;
          }) => ({
            pid: metric.pid,
            type: metric.type,
            name: metric.name ?? null,
            service_name: metric.serviceName ?? null,
          }),
        ),
    )
    .then((value) => z.array(metricSchema).parse(value));
  const electronVersionPromise: Promise<string> = application
    .evaluate(() => process.versions.electron)
    .then((value) => z.string().parse(value));
  const hookSnapshotPromise: Promise<ElectronHookSnapshot> = application
    .evaluate(() => {
      const candidate = Reflect.get(globalThis, "__reaElectronActiveSnapshot");
      return typeof candidate === "function"
        ? candidate()
        : {
            events: [],
            retention_budget_bytes: 0,
            estimated_retained_bytes: 0,
            event_serialized_byte_upper_bound: 0,
            retained: 0,
            dropped: 0,
            dropped_ipc: 0,
            dropped_runtime: 0,
            dropped_event_families: [],
            dropped_event_roles: [],
            observed: 0,
            observed_ipc: 0,
            observed_runtime: 0,
            hook_error: true,
          };
    })
    .then((value) => hookSnapshotSchema.parse(value));
  const [windowMetadata, processMetrics, electronVersion, hookSnapshot] =
    await Promise.all([
      windowMetadataPromise,
      processMetricsPromise,
      electronVersionPromise,
      hookSnapshotPromise,
    ]);
  return {
    windows: windowMetadata,
    metrics: processMetrics,
    electronVersion,
    hookSnapshot,
  };
};

/** Apply an optional lifecycle deadline and caller cancellation to an operation. */
export const runWithExecutionLimits = async <Value>(
  operation: Promise<Value>,
  signal: AbortSignal | undefined,
  deadline?: number,
): Promise<Value> => {
  if (signal?.aborted === true)
    throw new BrowserObservationError(OPERATION, "cancelled");
  if (signal === undefined && deadline === undefined) return operation;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const interruptions: Promise<never>[] = [];
  if (deadline !== undefined)
    interruptions.push(
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new BrowserObservationError(OPERATION, "timeout")),
          Math.max(1, deadline - performance.now()),
        );
      }),
    );
  if (signal !== undefined)
    interruptions.push(
      new Promise<never>((_, reject) => {
        abortListener = () =>
          reject(new BrowserObservationError(OPERATION, "cancelled"));
        signal.addEventListener("abort", abortListener, { once: true });
      }),
    );
  try {
    return interruptions.length === 0
      ? await operation
      : await Promise.race([operation, ...interruptions]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (abortListener !== undefined)
      signal?.removeEventListener("abort", abortListener);
  }
};

const safeActionErrorMessage = (cause: unknown): string => {
  return cause instanceof Error ? cause.message : "Electron action failed";
};
