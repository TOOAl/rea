import {
  digestProcessCommitment,
  processScenarioOutputBudgetProjectionSchema,
} from "./processScenario.js";
import { hasCaptureTruncation } from "./processCaptureCoverage.js";

import type {
  ProcessCaptureFinalization,
  UnverifiedProcessCapture,
} from "./processCapture.js";
/** One pure semantic validation failure in a shaped process capture. */
export interface ProcessCaptureValidationIssue {
  readonly path: string;
  readonly message: string;
}

type RequireInvariant = (
  condition: boolean,
  path: string,
  message: string,
) => void;

const orderedTimestamps = (values: readonly number[]): boolean =>
  values.every((value, index) => {
    const previous = values[index - 1];
    return previous === undefined || value >= previous;
  });

const validateCommitments = (
  capture: UnverifiedProcessCapture,
  require: RequireInvariant,
): void => {
  const { manifest } = capture;
  require(manifest.scenario.executable_sha256 ===
    manifest.selected_executable_sha256, "manifest.selected_executable_sha256", "selected executable commitment does not match the scenario projection");
  require(manifest.executable_identity.state === "path_metadata_unchanged"
    ? manifest.executable_sha256 === manifest.selected_executable_sha256 &&
        manifest.executable_identity.reason === null
    : manifest.executable_sha256 === null &&
        manifest.executable_identity.reason !==
          null, "manifest.executable_identity", "launch identity and executable digest do not agree");
  for (const [field, value] of [
    ["full_scenario_sha256", manifest.scenario],
    ["comparison_contract_sha256", manifest.comparison_contract],
    ["normalization_sha256", capture.normalization],
  ] as const)
    require(manifest[field] ===
      digestProcessCommitment(
        value,
      ), `manifest.${field}`, "commitment does not match its canonical value");
};

const validateOrdering = (
  capture: UnverifiedProcessCapture,
  require: RequireInvariant,
): void => {
  for (const [name, values] of [
    ["frames", capture.frames],
    ["rendered_frames", capture.rendered_frames],
    ["interaction_events", capture.interaction_events],
  ] as const)
    require(values.every(
      ({ sequence }, index) => sequence === index,
    ), name, "sequence values must be contiguous from zero");
  for (const [name, values] of [
    ["frames", capture.frames],
    ["rendered_frames", capture.rendered_frames],
    ["process_samples", capture.process_samples],
  ] as const)
    require(orderedTimestamps(
      values.map(({ at_ms }) => at_ms),
    ), name, "timestamps must be ordered");
  // Interactions are dispatched in sequence, so their recorded dispatch
  // times cannot decrease; comparison ranks a changed interaction by it.
  require(orderedTimestamps(
    capture.interaction_events.map(({ dispatched_at_ms }) => dispatched_at_ms),
  ), "interaction_events", "dispatch timestamps must be ordered");
};

const validateEventJournal = (
  capture: UnverifiedProcessCapture,
  require: RequireInvariant,
): void => {
  const journal = capture.event_journal;
  if (journal.length === 0) return;
  const sizes = {
    frames: capture.frames.length,
    rendered_frames: capture.rendered_frames.length,
    interaction_events: capture.interaction_events.length,
    lifecycle: 2,
    process_samples: capture.process_samples.length,
    filesystem_checkpoints: capture.filesystem_checkpoints.length,
  };
  const references = new Set<string>();
  for (const [position, entry] of journal.entries()) {
    require(entry.capture_order ===
      position, `event_journal.${String(position)}.capture_order`, "capture order must be contiguous from zero");
    require(entry.index <
      sizes[
        entry.collection
      ], `event_journal.${String(position)}.index`, "journal reference is outside its capture collection");
    const reference = `${entry.collection}:${String(entry.index)}`;
    require(!references.has(
      reference,
    ), `event_journal.${String(position)}`, "journal references must be unique");
    references.add(reference);
  }
  const expectedSize = Object.values(sizes).reduce(
    (total, size) => total + size,
    0,
  );
  require(journal.length ===
    expectedSize, "event_journal", "nonempty journal must reference every captured observation");
};

/**
 * The committed comparison contract carries `finalization_ms` exactly when the
 * committed scenario does, with the same value. Independent of the exit, so a
 * partial capture with an unavailable exit is still checked.
 */
export const finalizationManifestIssue = (
  committedScenario?: Readonly<Record<string, unknown>>,
  committedComparison?: Readonly<Record<string, unknown>>,
): string | undefined =>
  committedScenario !== undefined &&
  committedComparison !== undefined &&
  committedScenario["finalization_ms"] !==
    committedComparison["finalization_ms"]
    ? "comparison_contract finalization_ms must match the committed scenario"
    : undefined;

type FinalizationAttempts = Pick<
  ProcessCaptureFinalization,
  "requested_ms" | "elapsed_ms" | "exit_code"
> & {
  readonly signals: readonly Pick<
    ProcessCaptureFinalization["signals"][number],
    "signal" | "sent_at_ms"
  >[];
};

/** Ensure incomplete exit and sibling finalization observations preserve one fact. */
export const finalizationAgreementIssue = (
  exitFinalization: ProcessCaptureFinalization | undefined,
  observedFinalization: ProcessCaptureFinalization | undefined,
): string | undefined =>
  exitFinalization !== undefined &&
  observedFinalization !== undefined &&
  JSON.stringify(exitFinalization) !== JSON.stringify(observedFinalization)
    ? "exit finalization and finalization observation must agree"
    : undefined;

/**
 * Cross-field rule for `exit.finalization`, shared by complete and partial
 * captures. Returns the violated rule, or undefined when the record is
 * consistent.
 */
export const finalizationConsistencyIssue = (
  exit:
    | {
        readonly reason: string;
        readonly signal?: number | null | undefined;
        readonly finalization?: FinalizationAttempts | undefined;
      }
    | undefined,
  committedScenario?: Readonly<Record<string, unknown>>,
  committedComparison?: Readonly<Record<string, unknown>>,
  options?: {
    readonly finalization?: FinalizationAttempts;
    readonly allowNullElapsedMs?: boolean;
  },
): string | undefined => {
  const manifestIssue = finalizationManifestIssue(
    committedScenario,
    committedComparison,
  );
  if (manifestIssue !== undefined) return manifestIssue;
  const finalization = exit?.finalization ?? options?.finalization;
  if (finalization === undefined) {
    // A deadline that fired under a committed interval must have attempted
    // finalization; cancellation before the deadline legitimately has none.
    const committed = committedScenario?.["finalization_ms"];
    return (exit?.reason === "timeout" || exit?.reason === "idle_timeout") &&
      typeof committed === "number" &&
      committed > 0
      ? "a deadline exit under a committed finalization_ms requires finalization evidence"
      : undefined;
  }
  if (exit?.reason === "exited")
    return "finalization requires a deadline exit reason";
  const first = finalization.signals[0];
  if (first?.signal !== "SIGTERM")
    return "finalization signals must start with SIGTERM";
  const killIndexes = finalization.signals.flatMap(({ signal }, index) =>
    signal === "SIGKILL" ? [index] : [],
  );
  if (
    killIndexes.length > 1 ||
    (killIndexes[0] !== undefined &&
      killIndexes[0] !== finalization.signals.length - 1)
  )
    return "finalization may contain at most one final SIGKILL";
  if (
    !finalization.signals.every(({ sent_at_ms }, index) => {
      const previous = finalization.signals[index - 1];
      return previous === undefined || sent_at_ms >= previous.sent_at_ms;
    })
  )
    return "finalization signal attempt times must not decrease";
  if (
    finalization.signals.filter(({ signal }) => signal === "SIGTERM").length !==
    1
  )
    return "finalization must attempt SIGTERM exactly once";
  const kill = finalization.signals.find(({ signal }) => signal === "SIGKILL");
  if (
    kill !== undefined &&
    kill.sent_at_ms < finalization.requested_ms &&
    exit !== undefined &&
    exit.reason !== "cancelled"
  )
    return "finalization SIGKILL cannot precede the requested interval";
  if (finalization.elapsed_ms === null && options?.allowNullElapsedMs !== true)
    return "finalization requires an observed elapsed_ms";
  if (
    finalization.exit_code !== null &&
    exit?.signal !== undefined &&
    exit.signal !== null &&
    exit.signal !== 0
  )
    return "finalization exit_code requires an exit not caused by a signal";
  if (
    finalization.elapsed_ms !== null &&
    finalization.elapsed_ms <
      (finalization.signals.at(-1)?.sent_at_ms ?? first.sent_at_ms)
  )
    return "finalization elapsed_ms cannot precede the last signal attempt";
  if (
    committedScenario !== undefined &&
    committedScenario["finalization_ms"] !== finalization.requested_ms
  )
    return "finalization must match the committed finalization_ms";
  return undefined;
};
