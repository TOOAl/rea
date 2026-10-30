import type { ProcessSamplingCoverage } from "../../domain/process/processCaptureCoverage.js";
import type {
  ProcessSample,
  RecordProcessCaptureEvent,
} from "../../domain/process/processCapture.js";
import { monotonicProcessCaptureClock } from "./ProcessCaptureClock.js";

const PROC_READ_CONCURRENCY = 64;

interface ProcessRow {
  readonly pid: number;
  readonly parent_pid: number;
  readonly process_group_id: number | null;
  readonly session_id: number | null;
  readonly command: string;
  readonly startTime: string | undefined;
}

// src/process/capture/ProcessSamplingPart2.ts
const sampleProcesses = async (
  context: SampleProcessContext,
): Promise<readonly ProcessSample[]> => {
  if (process.platform === "win32" || context.limit <= 0) return [];

  const rows =
    process.platform === "linux"
      ? await sampleLinux(context)
      : await samplePs(context);

  const { elapsedMs, identities } = context;
  const samples: ProcessSample[] = [];
  for (const row of rows) {
    if (row.startTime !== undefined) {
      const existing = identities.get(row.pid);
      if (existing !== undefined && existing !== row.startTime) continue;
      identities.set(row.pid, row.startTime);
    }
    samples.push({
      at_ms: elapsedMs,
      pid: row.pid,
      parent_pid: row.parent_pid,
      command: row.command,
      process_group_id: row.process_group_id,
      session_id: row.session_id,
    });
  }
  return samples;
};

/** Start bounded process-tree sampling and expose an awaited stop. */
export const startProcessSampler = (options: {
  readonly rootPid: number;
  readonly runId: string;
  readonly started: number;
  readonly limit: number;
  readonly samples: ProcessSample[];
  readonly recordEvent?: RecordProcessCaptureEvent;
}): (() => Promise<{
  readonly partial: boolean;
  readonly coverage: ProcessSamplingCoverage;
}>) => {
  const { rootPid, runId, started, limit, samples } = options;
  const identities = new Map<number, string>();
  const lastObservations = new Map<number, string>();
  let pending: Promise<void> | undefined;
  let stopped = false;
  let abortCurrent: (() => void) | undefined;
  let partial = false;
  let limitReached = false;
  let samplingFailures = 0;
  let firstSamplingFailure: string | null = null;
  let rootInitialized = false;

  const sample = (): void => {
    if (stopped || pending !== undefined) return;

    const controller = new AbortController();
    abortCurrent = () => controller.abort();
    pending = (async () => {
      if (!rootInitialized) {
        const identity = await inspectInitializedPtyRoot(
          rootPid,
          runId,
          controller.signal,
        );
        if (identity === undefined) return [];
        if (identity.startTime !== undefined)
          identities.set(rootPid, identity.startTime);
        rootInitialized = true;
      }
      return sampleProcesses({
        rootPid,
        elapsedMs: monotonicProcessCaptureClock() - started,
        limit: limit + 1,
        identities,
        signal: controller.signal,
      });
    })()
      .then((values) => {
        for (const value of values) {
          const observation = JSON.stringify({
            parent_pid: value.parent_pid,
            command: value.command,
            process_group_id: value.process_group_id,
            session_id: value.session_id,
          });
          if (lastObservations.get(value.pid) === observation) continue;
          if (samples.length >= limit) {
            partial = true;
            limitReached = true;
            continue;
          }
          lastObservations.set(value.pid, observation);
          const index = samples.length;
          samples.push(value);
          options.recordEvent?.("process_samples", index);
        }
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof Error && cause.name === "AbortError")) {
          partial = true;
          samplingFailures += 1;
          firstSamplingFailure ??=
            cause instanceof Error
              ? `${cause.name}: ${cause.message}`
              : typeof cause === "string"
                ? cause
                : `Unexpected sampling rejection (${typeof cause})`;
        }
      })
      .then(() => {
        abortCurrent = undefined;
        pending = undefined;
      });
  };

  const timer = setInterval(sample, 50);
  sample();

  return async () => {
    stopped = true;
    clearInterval(timer);
    abortCurrent?.();
    await pending;
    return {
      partial,
      coverage: {
        sample_limit: limit,
        sampling_partial: partial,
        retained_samples: samples.length,
        sample_limit_reached: limitReached,
        sampling_failures: samplingFailures,
        first_sampling_failure: firstSamplingFailure,
        coverage: "sampled",
      },
    };
  };
};
