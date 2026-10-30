import { randomUUID } from "node:crypto";
import { access, mkdir, opendir, open, stat } from "node:fs/promises";
import { join } from "node:path";
import { androidLocaleQualifierSchema } from "../domain/apktool/apktoolResourceAnalysis.js";
import {
  AnalysisCapabilityUnavailableError,
  AnalysisCancelledError,
  AnalysisProtocolError,
  AnalysisResourceConstraintError,
  AnalysisTimeoutError,
  AnalysisUnsupportedTargetError,
} from "../domain/analysisErrorCore.js";
import type { AnalysisError } from "../domain/analysisErrorBase.js";
import { err, ok, type Result } from "../domain/result.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import {
  OwnedCommandFailure,
  runOwnedCommand,
} from "../process/OwnedCommand.js";
import type { ProviderProcessSupervisor } from "../process/ProviderProcess.js";
import { WindowsBatchCommandError } from "../process/WindowsBatchCommand.js";
import {
  ApktoolConfigurationFailure,
  type ApktoolProbeCleanup,
  apktoolInvocation,
  resolveApktoolCommand,
  type ApktoolCommandSelection,
} from "./ApktoolConfiguration.js";

/** Stable identity for the Apktool resource-decoding provider. */

export const APKTOOL_PROVIDER_IDENTITY = {
  id: "apktool",
  name: "Apktool",
  version: null,
} as const;

const DECODE_TIMEOUT_MS = 600_000;
const DECODE_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MANIFEST_MAX_BYTES = 512 * 1024;
const STRINGS_XML_MAX_BYTES = 8 * 1024 * 1024;
const MAX_STRINGS = 2_000;
const MAX_DECODED_ENTRIES_VISITED = 100_000;
const STDERR_EXCERPT_BYTES = 512;

const throwIfCancelled = (
  operation: string,
  signal: AbortSignal | undefined,
): void => {
  if (signal?.aborted === true) throw new AnalysisCancelledError(operation);
};

/** Read at most the byte budget plus one byte, before decoding UTF-8. */
const readBoundedText = async (
  path: string,
  budget: number,
  operation: string,
  signal: AbortSignal | undefined,
): Promise<{ text: string | null; truncated: boolean }> => {
  const file = await open(path, "r").catch((cause: unknown) => {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw cause;
  });
  if (file === null) return { text: null, truncated: false };
  try {
    throwIfCancelled(operation, signal);
    const bytes = Buffer.alloc(budget + 1);
    let length = 0;
    while (length < bytes.length) {
      throwIfCancelled(operation, signal);
      const result = await file.read(
        bytes,
        length,
        bytes.length - length,
        null,
      );
      if (result.bytesRead === 0) break;
      length += result.bytesRead;
    }
    throwIfCancelled(operation, signal);
    const truncated = length > budget;
    // A prefix may end within a UTF-8 character; omit those trailing bytes.
    try {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      return {
        text: decoder.decode(bytes.subarray(0, Math.min(length, budget)), {
          stream: truncated,
        }),
        truncated,
      };
    } catch (cause: unknown) {
      throw new AnalysisProtocolError(
        `apktool produced invalid UTF-8 in ${path}`,
        { cause },
      );
    }
  } finally {
    await file.close();
  }
};

const localeQualifier = (locale: string): string =>
  locale.replace(/^([a-z]{2,3})-([A-Z]{2}|[0-9]{3})$/u, "$1-r$2");

interface DecodeLimits {
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}

/** A probe whose launched processes could not be confirmed stopped. */
const probeCleanupFailure = (
  operation: string,
  failure: ApktoolConfigurationFailure,
  cleanup: ApktoolProbeCleanup,
): ProviderCleanupError =>
  new ProviderCleanupError(
    APKTOOL_PROVIDER_IDENTITY.id,
    cleanup.resources,
    { reason: cleanup.reason, probe_failure: failure.message },
    { operation, cause: failure },
  );

const runApktool = async (
  operation: string,
  selection: ApktoolCommandSelection,
  arguments_: readonly string[],
  limits: DecodeLimits,
  signal: AbortSignal | undefined,
  environment: Readonly<Record<string, string | undefined>>,
  onCleanupOwner: (owner: ProviderProcessSupervisor) => void,
): Promise<Result<{ stdout: string; stderr: string }, AnalysisError>> => {
  if (signal?.aborted === true)
    return err(new AnalysisCancelledError(operation));
  let invocation: ReturnType<typeof apktoolInvocation>;
  try {
    invocation = apktoolInvocation(selection, arguments_, environment);
  } catch (cause) {
    if (!(cause instanceof WindowsBatchCommandError)) throw cause;
    const reason = `The apktool batch launcher cannot receive REA's decode paths through cmd.exe: ${cause.message}`;
    return err(
      new AnalysisCapabilityUnavailableError(
        APKTOOL_PROVIDER_IDENTITY.id,
        operation,
        reason,
        { cause, userMessage: reason },
      ),
    );
  }
  try {
    const output = await runOwnedCommand(
      {
        command: invocation.command,
        arguments: invocation.arguments,
        windowsVerbatimArguments: invocation.windowsVerbatimArguments,
        // Apktool launchers are commonly interpreter scripts, so ownership is
        // proved by the run token rather than the launcher's argv prefix.
        expectedCommand: null,
        runId: randomUUID(),
        hostEnvironment: environment,
      },
      {
        timeoutMs: limits.timeoutMs,
        diagnosticBytes: limits.maxOutputBytes,
      },
      signal === undefined ? {} : { signal },
    );
    return ok({ stdout: output.stdout.text, stderr: output.stderr.text });
  } catch (cause) {
    if (!(cause instanceof OwnedCommandFailure))
      return err(
        new AnalysisProtocolError(`apktool failed for ${operation}`, { cause }),
      );
    if (cause.cleanupOwner !== undefined) onCleanupOwner(cause.cleanupOwner);
    const output = cause.snapshot;
    const capturedOutput =
      output === null
        ? undefined
        : {
            stdout: output.stdout.text,
            stderr: output.stderr.text,
            truncated: output.diagnosticTruncated === true,
            stdout_bytes: output.stdout.bytes,
            stderr_bytes: output.stderr.bytes,
            exit_code: output.exitCode ?? null,
            signal: output.signal ?? null,
          };
    const cleanup =
      cause.cleanupFailure === null
        ? undefined
        : {
            reason: cause.cleanupFailure,
            resources: cause.resources,
          };
    if (cause.reason === "cancelled")
      return err(
        new AnalysisCancelledError(operation, {
          cause,
          ...(cleanup === undefined ? {} : { cleanup }),
          ...(capturedOutput === undefined ? {} : { capturedOutput }),
        }),
      );
    if (cause.reason === "timeout")
      return err(
        new AnalysisTimeoutError(operation, limits.timeoutMs, {
          cause,
          ...(cleanup === undefined ? {} : { cleanup }),
          ...(capturedOutput === undefined ? {} : { capturedOutput }),
        }),
      );
    if (cause.reason === "output-limit")
      return err(
        new AnalysisResourceConstraintError(
          operation,
          "memory",
          `apktool output exceeded the ${String(limits.maxOutputBytes)}-byte capture budget`,
          { max_output_bytes: limits.maxOutputBytes },
          {
            cause,
            ...(cleanup === undefined ? {} : { cleanup }),
            ...(capturedOutput === undefined ? {} : { capturedOutput }),
          },
        ),
      );
    return err(
      new AnalysisUnsupportedTargetError(
        operation,
        selection.command,
        output?.stderr.text.trim().slice(0, STDERR_EXCERPT_BYTES) ||
          `apktool exited with code ${String(output?.exitCode ?? "unknown")} for ${operation}`,
        {
          cause,
          ...(cleanup === undefined ? {} : { cleanup }),
          ...(capturedOutput === undefined ? {} : { capturedOutput }),
        },
      ),
    );
  }
};

/** Count files while bounding streamed directory-entry traversal. */
const countDecodedFiles = async (
  root: string,
  signal: AbortSignal | undefined,
  operation: string,
): Promise<{
  count: number;
  capped: boolean;
  locales: readonly string[];
}> => {
  let count = 0;
  let capped = false;
  let visited = 0;
  const directories = [root];
  const locales: string[] = [];
  while (directories.length > 0 && !capped) {
    throwIfCancelled(operation, signal);
    const directory = directories.pop()!;
    for await (const entry of await opendir(directory)) {
      throwIfCancelled(operation, signal);
      if (visited >= MAX_DECODED_ENTRIES_VISITED) {
        capped = true;
        break;
      }
      visited += 1;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        directories.push(path);
        if (directory === join(root, "res")) {
          const match = /^values-(.+)$/u.exec(entry.name);
          if (
            match !== null &&
            androidLocaleQualifierSchema.safeParse(match[1]).success &&
            (await access(join(path, "strings.xml")).then(
              () => true,
              () => false,
            ))
          )
            locales.push(match[1]!);
        }
      } else if (entry.isFile()) count += 1;
    }
  }
  return { count, capped, locales: locales.sort() };
};

export interface ApktoolProviderOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly removeWorkspace?: (path: string) => Promise<void>;
}

/**
 * Apktool resource decoding over a caller-selected launcher.
 *
 * Decoding happens in a provider-owned temporary workspace that is removed
 * once the requested facts are projected; smali production is skipped
 * (`--no-src`) because Java-source recovery belongs to the JADX family.
 */
