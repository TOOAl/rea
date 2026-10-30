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

const validateLifecycle = (
  capture: UnverifiedProcessCapture,
  require: RequireInvariant,
): void => {
  require(capture.filesystem_checkpoints.map(({ name }) => name).join(",") ===
    "before,after_settlement", "filesystem_checkpoints", "capture must include initial and final filesystem snapshots");
  require(orderedTimestamps(
    capture.filesystem_checkpoints.map(({ at_ms }) => at_ms),
  ), "filesystem_checkpoints", "filesystem snapshot times must be ordered");
  require(!capture.filesystem_checkpoints.some(({ truncated }) => truncated) ||
    capture.truncated, "truncated", "filesystem snapshot truncation must propagate to the capture");
  require(capture.exit.reason === "exited" ||
    capture.exit.code ===
      null, "exit", "deadline termination cannot declare a normal exit code");
  const finalizationIssue = finalizationConsistencyIssue(
    capture.exit,
    capture.manifest.scenario,
    capture.manifest.comparison_contract,
  );
  require(finalizationIssue === undefined, "exit", finalizationIssue ?? "");
};

const validateCoverage = (
  capture: UnverifiedProcessCapture,
  require: RequireInvariant,
): void => {
  const details = capture.truncation_details;
  require(details.process.retained_samples === capture.process_samples.length &&
    details.process.retained_samples <= details.process.sample_limit &&
    details.process.sampling_partial ===
      (details.process.sample_limit_reached ||
        details.process.sampling_failures > 0) &&
    (details.process.sampling_failures === 0) ===
      (details.process.first_sampling_failure ===
        null), "truncation_details.process", "sampling coverage must agree with retained samples and observed failures");
  require(capture.truncated ===
    hasCaptureTruncation(
      details,
    ), "truncation_details", "aggregate truncation must match producer coverage");
  for (const [name, retention, count, bytes] of [
    [
      "raw_terminal",
      details.raw_terminal,
      capture.frames.length,
      capture.frames.reduce(
        (total, frame) =>
          total + Buffer.byteLength(frame.raw_data ?? frame.data),
        0,
      ),
    ],
    [
      "rendered_terminal",
      details.rendered_terminal,
      capture.rendered_frames.length,
      capture.rendered_frames.reduce(
        (total, frame) =>
          frame.lines.reduce(
            (sum, line) => sum + Buffer.byteLength(line),
            total + Buffer.byteLength(frame.serialized_state),
          ),
        0,
      ),
    ],
  ] as const) {
    // Whole frames are retained or omitted, so retained bytes are exactly the
    // retained frames' bytes, and nothing is unretained when no frame was omitted.
    require(retention.retained_frames === count &&
      retention.observed_frames >= count &&
      retention.retained_bytes === bytes &&
      retention.observed_bytes >= retention.retained_bytes &&
      (retention.observed_frames > count ||
        retention.observed_bytes === retention.retained_bytes) &&
      retention.retained_bytes <= retention.budget_bytes &&
      (retention.unknown_size_frames ?? 0) <=
        retention.observed_frames -
          retention.retained_frames, `truncation_details.${name}`, "retained observations and budget accounting do not agree");
  }
  const normalized = details.normalized_terminal;
  if (normalized !== undefined) {
    const committedOutputBudget =
      processScenarioOutputBudgetProjectionSchema.safeParse(
        capture.manifest.scenario["limits"],
      );
    require(committedOutputBudget.success, "manifest.scenario.limits.output_bytes", "committed process scenario must include an explicit valid output_bytes budget");
    const retainedBytes = capture.frames.reduce(
      (total, frame) => total + Buffer.byteLength(frame.data),
      0,
    );
    if (committedOutputBudget.success)
      require(normalized.budget_bytes ===
        committedOutputBudget.data.output_bytes &&
        normalized.retained_bytes === retainedBytes &&
        normalized.retained_bytes <= normalized.budget_bytes &&
        normalized.omitted_frames <=
          details.raw_terminal.observed_frames -
            details.raw_terminal
              .retained_frames, "truncation_details.normalized_terminal", "normalized terminal retention must agree with the committed budget and retained frames");
  }
  for (const [name, coverage, files, checkpoint] of [
    [
      "filesystem_before",
      details.filesystem_before,
      capture.files_before,
      capture.filesystem_checkpoints[0],
    ],
    [
      "filesystem_after",
      details.filesystem_after,
      capture.files_after,
      capture.filesystem_checkpoints[1],
    ],
  ] as const) {
    const unhashedFiles = new Map(
      files
        .filter((file) => file.type === "file" && file.sha256 === null)
        .map((file) => [file.path, file]),
    );
    const directories = new Set(
      files.filter((file) => file.type === "directory").map(({ path }) => path),
    );
    require(coverage.hash_omissions.length === unhashedFiles.size &&
      new Set(coverage.hash_omissions.map(({ path }) => path)).size ===
        unhashedFiles.size &&
      coverage.hash_omissions.every(
        (omission) =>
          unhashedFiles.get(omission.path)?.size === omission.size_bytes &&
          omission.remaining_budget_bytes <= coverage.hash_budget_bytes &&
          (omission.reason === "file_unavailable"
            ? omission.system_code !== null
            : omission.system_code === null),
      ), `truncation_details.${name}.hash_omissions`, "every retained regular file without a digest must have one matching omission reason");
    require(new Set(coverage.enumeration_omissions.map(({ path }) => path))
      .size === coverage.enumeration_omissions.length &&
      (coverage.enumeration_omissions.length === 0 ||
        coverage.enumeration_reasons.includes("directory_unavailable")) &&
      coverage.enumeration_omissions.every(
        (omission) =>
          directories.has(omission.path) && omission.system_code !== null,
      ), `truncation_details.${name}.enumeration_omissions`, "every directory enumeration omission must identify one retained directory and its system error");
    require(coverage.hashed_bytes ===
      files
        .filter((file) => file.type === "file" && file.sha256 !== null)
        .reduce((sum, file) => sum + file.size, 0) &&
      coverage.hashed_bytes <= coverage.hash_budget_bytes &&
      files.length <=
        coverage.files_limit, `truncation_details.${name}`, "filesystem budget accounting does not match retained observations");
    require(coverage.enumeration_truncated ===
      coverage.enumeration_reasons.length > 0 &&
      checkpoint?.truncated ===
        (coverage.enumeration_truncated ||
          coverage.enumeration_omissions.length > 0 ||
          coverage.hash_omissions.length >
            0), `truncation_details.${name}`, "filesystem checkpoint truncation must match enumeration and digest coverage");
  }
};

/** Recompute commitments and cross-field invariants without side effects. */
export const collectProcessCaptureIssues = (
  capture: UnverifiedProcessCapture,
): readonly ProcessCaptureValidationIssue[] => {
  const issues: ProcessCaptureValidationIssue[] = [];
  const require: RequireInvariant = (condition, path, message) => {
    if (!condition) issues.push({ path, message });
  };
  validateCommitments(capture, require);
  validateOrdering(capture, require);
  validateEventJournal(capture, require);
  validateLifecycle(capture, require);
  validateCoverage(capture, require);
  return issues;
};
