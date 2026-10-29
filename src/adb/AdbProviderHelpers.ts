// removed unused import: import { createHash } from "node:crypto";  // createHash unused
import { constants as fsConstants } from "node:fs";
import {
  access,
  copyFile,
  lstat,
  mkdtemp,
  mkdir,
  rmdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import type {
  ExecutionOptions,
  ProviderAvailability,
} from "../application/AnalysisProvider.js";
// removed unused import: import { providerConfigurationRefusal } from "../domain/providerConfigurationRefusal.js";  // providerConfigurationRefusal unused
import {
  createAnalysisExecution,
  type _AnalysisExecution,
} from "../application/AnalysisProvider.js";
import type {
  AdbActivityStartPartialObservation,
  AdbAcquiredFilePartialObservation,
  AdbRequest,
} from "../domain/adb/adbDeviceAnalysis.js";
// removed unused import: import { adbResultSchemas } from "../domain/adb/adbDeviceAnalysis.js";  // adbResultSchemas unused
import {
  AnalysisArtifactChangedError,
  AnalysisCancelledError,
  AnalysisInputError,
  AnalysisOutputError,
  AnalysisProtocolError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
  AnalysisUnsupportedTargetError,
} from "../domain/analysisErrorCore.js";
import { AnalysisError } from "../domain/analysisErrorBase.js";
// removed unused import: import { analysisErrorWithCleanupFailure } from "../domain/analysisErrorCleanup.js";  // analysisErrorWithCleanupFailure unused
import { err, ok, type Result } from "../domain/result.js";
import { hashStableFile } from "../filesystem/StableFileHash.js";
// removed unused import: import { ProviderCleanupError } from "../domain/providerCleanupError.js";  // ProviderCleanupError unused
import {
  execFileBytes,
  execFileOutputFailure,
} from "../process/ExecFileOutput.js";
import {
  AdbConfigurationFailure,
  adbConfigurationAvailability,
  inspectAdbClient,
  resolveAdbBinary,
  type AdbBinarySelection,
  type AdbClientIdentity,
} from "./AdbConfiguration.js";
import {
  displayDevicePath,
  parseAdbDevicesOutput,
  parseGetpropOutput,
  parsePackageListOutput,
  parsePmPathOutput,
} from "./AdbDeviceOutput.js";
// removed unused import: import { adbHostFileName } from "./AdbHostFileName.js";  // adbHostFileName unused
import {
  ADB_DIRECTORY_BATCH_SCRIPT,
  parseAdbDirectoryListing,
} from "./AdbDirectoryListing.js";
import {
  parseAmStartOutput,
  parseBugreportCopiedPath,
  parseDumpsysPackageOutput,
  parseFeatureListOutput,
  packageChangeFailureReason,
  parsePackageChangeOutput,
  parseProcessListOutput,
  parsePngDimensions,
  parseResolveActivityOutput,
  parseServiceListOutput,
  parseSettingsGetOutput,
  parseWindowFocusOutput,
  parseWmDensityOutput,
  parseWmSizeOutput,
} from "./AdbShellOutput.js";

/** Stable identity for the ADB device-acquisition provider. */
export const ADB_PROVIDER_IDENTITY = {
  id: "adb",
  name: "Android Debug Bridge",
  version: null,
} as const;

export const DEVICES_TIMEOUT_MS = 20_000;
export const DEVICES_MAX_OUTPUT_BYTES = 1024 * 1024;
export const SHELL_TIMEOUT_MS = 30_000;
export const GETPROP_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const PACKAGE_LIST_TIMEOUT_MS = 60_000;
export const PACKAGE_LIST_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
export const PM_PATH_TIMEOUT_MS = 30_000;
export const PM_PATH_MAX_OUTPUT_BYTES = 64 * 1024;
export const PULL_TIMEOUT_MS = 600_000;
export const PULL_MAX_OUTPUT_BYTES = 1024 * 1024;
export const LOGCAT_TIMEOUT_MS = 60_000;
export const LOGCAT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
export const DUMPSYS_PACKAGE_TIMEOUT_MS = 60_000;
export const DUMPSYS_PACKAGE_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
export const DUMPSYS_WINDOW_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
export const LISTING_TIMEOUT_MS = 30_000;
export const LISTING_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
export const SETTINGS_TIMEOUT_MS = 20_000;
export const SETTINGS_MAX_OUTPUT_BYTES = 1024 * 1024;
export const SCREEN_TIMEOUT_MS = 60_000;
export const SCREEN_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
export const BUGREPORT_TIMEOUT_MS = 600_000;
export const BUGREPORT_MAX_OUTPUT_BYTES = 1024 * 1024;
export const STDERR_EXCERPT_BYTES = 512;
export const UNPARSED_LINES_REPORTED = 10;

export const hashAdbFile = async (
  path: string,
  operation: string,
  signal: AbortSignal | undefined,
) => {
  try {
    return await hashStableFile(path, signal);
  } catch (cause: unknown) {
    if (signal?.aborted === true)
      throw new AnalysisCancelledError(operation, { cause });
    throw cause;
  }
};

/** adb joins shell operands into a remote POSIX command; quote at that boundary. */
export const quoteShellOperand = (value: string): string =>
  /^[A-Za-z0-9_./:=@+,-]+$/u.test(value)
    ? value
    : "'" + value.replaceAll("'", "'\\''") + "'";

export const adbArguments = (
  serial: string | undefined,
  arguments_: readonly string[],
): readonly string[] => {
  const operands =
    arguments_[0] === "shell"
      ? ["shell", ...arguments_.slice(1).map(quoteShellOperand)]
      : [...arguments_];
  return serial === undefined ? operands : ["-s", serial, ...operands];
};

export interface AdbRunLimits {
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}

/** Run one bounded adb invocation and keep its exact failure shape. */
export const runAdbCapture = async (
  operation: string,
  targetPath: string,
  binary: string,
  arguments_: readonly string[],
  limits: AdbRunLimits,
  signal: AbortSignal | undefined,
): Promise<Result<{ stdout: Buffer; stderr: Buffer }, AnalysisError>> => {
  if (signal?.aborted === true)
    return err(new AnalysisCancelledError(operation));
  try {
    return ok(
      await execFileBytes(binary, arguments_, {
        timeout: limits.timeoutMs,
        maxBuffer: limits.maxOutputBytes,
        stopSignal: "SIGTERM",
        ...(signal === undefined ? {} : { signal }),
      }),
    );
  } catch (cause) {
    if (signal?.aborted || execFileOutputFailure(cause)?.code === "ABORT_ERR")
      return err(new AnalysisCancelledError(operation, { cause }));
    const failure = execFileOutputFailure(cause);
    if (failure === undefined)
      return err(
        new AnalysisProtocolError(`adb failed for ${operation}`, { cause }),
      );
    if (failure.outputTruncated)
      return err(
        new AnalysisResourceConstraintError(
          operation,
          "memory",
          `adb output exceeded the ${String(limits.maxOutputBytes)}-byte capture budget`,
          { max_output_bytes: limits.maxOutputBytes },
          { cause },
        ),
      );
    const excerpt = failure.stderr.trim().slice(0, STDERR_EXCERPT_BYTES);
    if (/unauthorized/iu.test(excerpt))
      return err(
        new AnalysisUnsupportedTargetError(operation, targetPath, excerpt, {
          cause,
        }),
      );
    if (
      /device[^\n]*not found|device offline|still authorizing|more than one device/iu.test(
        excerpt,
      )
    )
      return err(
        new AnalysisUnsupportedTargetError(operation, targetPath, excerpt, {
          cause,
        }),
      );
    if (
      /No such file or directory|Permission denied|read: Permission denied/iu.test(
        excerpt,
      )
    )
      return err(
        new AnalysisUnsupportedTargetError(operation, targetPath, excerpt, {
          cause,
        }),
      );
    if (failure.killed)
      return err(
        new AnalysisTimeoutError(operation, limits.timeoutMs, { cause }),
      );
    return err(
      new AnalysisProtocolError(
        excerpt === ""
          ? `adb exited with code ${String(failure.code)} for ${operation}`
          : excerpt,
        { cause },
      ),
    );
  }
};

/** Decode textual adb protocols after the shared byte capture and error boundary. */
export const runAdb = async (
  ...arguments_: Parameters<typeof runAdbCapture>
): Promise<
  Result<{ stdout: string; stderr: string; stdoutBytes: number }, AnalysisError>
> => {
  const captured = await runAdbCapture(...arguments_);
  if (!captured.ok) return captured;
  return ok({
    stdout: captured.value.stdout.toString("utf8"),
    stderr: captured.value.stderr.toString("utf8"),
    // Byte count of the captured output before UTF-8 decoding, so malformed
    // sequences replaced by U+FFFD still report their true captured size.
    stdoutBytes: captured.value.stdout.byteLength,
  });
};

/**
 * adb exits nonzero when the device refuses a package change, printing the
 * `Failure [...]` verdict to stderr (install) or stdout (uninstall). Read the
 * refusal from that failed run so it is not reported as unreadable output.
 */
export const packageChangeRefusal = (
  operation: string,
  serial: string,
  error: AnalysisError,
): Result<never, AnalysisError> | undefined => {
  if (!(error instanceof AnalysisProtocolError)) return undefined;
  const failure = execFileOutputFailure(error.cause);
  if (failure === undefined) return undefined;
  const reason = packageChangeFailureReason(
    `${failure.stdout}\n${failure.stderr}`,
  );
  return reason === null
    ? undefined
    : err(
        new AnalysisUnsupportedTargetError(operation, serial, reason, {
          cause: error,
        }),
      );
};

export const clientIdentityResult = (
  selection: AdbBinarySelection,
  identity: AdbClientIdentity,
) => ({
  binary_path: selection.binary,
  path_source: selection.pathSource,
  version: identity.version,
  installed_path: identity.installedPath,
});

export type ClientIdentity = ReturnType<typeof clientIdentityResult>;
export type ProviderIdentity = {
  id: string;
  name: string;
  version: string | null;
};

export const reported = (
  unparsedLines: readonly string[],
  coverage: "complete" | "partial",
) => ({
  unparsed_lines: unparsedLines.slice(0, UNPARSED_LINES_REPORTED),
  coverage:
    coverage === "partial" || unparsedLines.length > 0 ? "partial" : "complete",
});

export const unparsedOverflowLimitation = (
  unparsedLines: readonly string[],
): string[] =>
  unparsedLines.length > UNPARSED_LINES_REPORTED
    ? [
        `unparsed_lines reports the first ${String(UNPARSED_LINES_REPORTED)} of ${String(unparsedLines.length)} unrecognized lines`,
      ]
    : [];

/** Materialize the caller's output directory, refusing existing files inside. */
export const prepareOutputDirectory = async (
  operation: string,
  directory: string,
): Promise<Result<string, AnalysisError>> => {
  const root = resolve(directory);
  try {
    await mkdir(root, { recursive: true });
    await access(root, fsConstants.W_OK);
  } catch (cause) {
    return err(
      new AnalysisOutputError(
        operation,
        `The output directory is not writable or could not be created: ${root}`,
        { cause },
      ),
    );
  }
  return ok(root);
};

export const refuseExistingTarget = async (
  operation: string,
  path: string,
): Promise<AnalysisError | undefined> => {
  if (
    await lstat(path).then(
      () => true,
      () => false,
    )
  )
    return new AnalysisOutputError(
      operation,
      `The output file already exists: ${path}`,
    );
  return undefined;
};

/** Publish an ADB-produced archive without replacing an existing caller file. */
