import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";

import { err, ok, type Result } from "../domain/result.js";
import { DarwinProcessOwnershipInspectionError } from "../process/DarwinProcessRunTokenReader.js";
import {
  OwnedCommandFailure,
  runOwnedCommand,
} from "../process/OwnedCommand.js";
import type {
  ProviderProcessSnapshot,
  SpawnedOwnedProviderProcess,
} from "../process/ProviderProcess.js";

/** Maximum wall-clock duration for one native command. */

// src/native/CommandRunnerPart2.ts
const captureProcess = async (
  executable: string,
  arguments_: readonly string[],
  tool: string,
  options: {
    readonly signal?: AbortSignal;
    readonly acceptNonZero?: boolean;
  },
  environment: Readonly<NodeJS.ProcessEnv>,
  launcher?: NativeCommandLauncher,
): Promise<Result<ProcessCapture, NativeCommandFailure>> => {
  const runId = `rea-native-command-${randomUUID()}`;
  try {
    const snapshot = await runOwnedCommand(
      {
        command: executable,
        arguments: [...arguments_],
        runId,
        env: {
          LC_ALL: "C",
          LANG: "C",
        },
        hostEnvironment: environment,
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      },
      {
        timeoutMs: NATIVE_COMMAND_TIMEOUT_MS,
        diagnosticBytes: NATIVE_COMMAND_OUTPUT_BUDGET_BYTES,
        acceptNonZeroExit: options.acceptNonZero === true,
      },
      launcher === undefined ? {} : { launcher },
    );
    return ok(processCaptureFromSnapshot(snapshot));
  } catch (cause: unknown) {
    if (cause instanceof OwnedCommandFailure) {
      const capture =
        cause.snapshot === null
          ? null
          : failureCapture(
              processCaptureFromSnapshot(cause.snapshot),
              cause.snapshot.diagnosticTruncated === true,
            );
      return err(
        new NativeCommandFailure(
          tool,
          cause.reason === "process"
            ? processFailureReason(capture)
            : cause.reason,
          capture?.exitCode ?? null,
          {
            cause,
            ...(cause.cleanupOwner === undefined
              ? {}
              : { cleanupOwner: cause.cleanupOwner }),
          },
          capture,
          cause.cleanupFailure,
          cause.resources,
        ),
      );
    }
    return err(
      new NativeCommandFailure(tool, "io", null, {
        cause,
        // Process supervision needs the Darwin ownership helper; its typed
        // message names the compiler or SDK prerequisite to fix.
        ...(cause instanceof DarwinProcessOwnershipInspectionError
          ? { detail: cause.message }
          : {}),
      }),
    );
  }
};

const processFailureReason = (
  capture: NativeCommandFailureCapture | null,
): "io" | "nonzero-exit" =>
  capture !== null &&
  (capture.signal !== null ||
    (capture.exitCode !== null && capture.exitCode !== 0))
    ? "nonzero-exit"
    : "io";

const processCaptureFromSnapshot = (
  snapshot: ProviderProcessSnapshot,
): ProcessCapture => ({
  stdout: snapshot.stdout.text,
  stderr: snapshot.stderr.text,
  stdoutBytes: snapshot.stdout.bytes,
  stderrBytes: snapshot.stderr.bytes,
  exitCode: snapshot.exitCode ?? null,
  signal: snapshot.signal ?? null,
});

const hashFile = (path: string, signal?: AbortSignal): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(
      path,
      signal === undefined ? undefined : { signal },
    );
    stream.on("data", (chunk) => hash.update(chunk));
    stream.once("error", reject);
    stream.once("end", () => resolve(hash.digest("hex")));
  });
