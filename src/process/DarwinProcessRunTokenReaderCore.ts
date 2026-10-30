import { rmSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  DEFAULT_SWIFTC_COMPILE_TIMEOUT_MS,
  providerStartupTimeoutSchema,
} from "../config/providerStartupTimeout.js";
import { boundedUtf8Text } from "./boundedUtf8Text.js";
import { execFileOutputFailure } from "./ExecFileOutput.js";

const responseSchema = z.strictObject({
  results: z.array(
    z.discriminatedUnion("state", [
      z.strictObject({
        pid: z.number().int().positive(),
        state: z.literal("readable"),
        run_id: z.string().optional(),
        reason: z.null().optional(),
      }),
      z.strictObject({
        pid: z.number().int().positive(),
        state: z.literal("unavailable"),
        run_id: z.union([z.string(), z.null()]).optional(),
        reason: z.string().min(1),
      }),
    ]),
  ),
});
const identityResponseSchema = z.strictObject({
  results: z.array(
    z.discriminatedUnion("state", [
      z.strictObject({
        pid: z.number().int().positive(),
        state: z.literal("readable"),
        identity: z.string().min(1),
        reason: z.null().optional(),
      }),
      z.strictObject({
        pid: z.number().int().positive(),
        state: z.literal("unavailable"),
        identity: z.null().optional(),
        reason: z.string().min(1),
      }),
    ]),
  ),
});

const sourceFiles = [
  fileURLToPath(
    new URL(
      "../../bridge/process/ProcessRunTokenReader.swift",
      import.meta.url,
    ),
  ),
  fileURLToPath(
    new URL(
      "../../bridge/process/ProcessRunTokenReaderMain.swift",
      import.meta.url,
    ),
  ),
];

/**
 * swift-driver runs each frontend job in its own process group. On SIGINT it
 * stops those jobs and deletes their objects before exiting; on SIGTERM it
 * exits while a job can still write objects under TMPDIR.
 */
export const SWIFTC_INTERRUPT = "SIGINT";

/**
 * Resolve the Darwin ownership-helper compile deadline from an explicit option
 * or `REA_SWIFTC_COMPILE_TIMEOUT_MS`. The default matches the measured fresh
 * Swift SDK cache on the supported Intel macOS VM (about 88s), so compilation
 * stays bounded independently of short provider version probes. Invalid ambient
 * values fall back to the default; `parseConfig` still rejects them at CLI/MCP
 * admission.
 */
export const resolveSwiftcCompileTimeoutMs = (
  options: {
    readonly compileTimeoutMs?: number;
    readonly environment?: Readonly<Record<string, string | undefined>>;
  } = {},
): number => {
  if (options.compileTimeoutMs !== undefined) return options.compileTimeoutMs;
  const raw = (options.environment ?? process.env)
    .REA_SWIFTC_COMPILE_TIMEOUT_MS;
  if (raw === undefined) return DEFAULT_SWIFTC_COMPILE_TIMEOUT_MS;
  const parsed = providerStartupTimeoutSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_SWIFTC_COMPILE_TIMEOUT_MS;
};

/** Bound on compiler diagnostics embedded in the inspection failure text. */
const STDERR_EXCERPT_LIMIT = 512;

/** The native Darwin process-ownership reader could not be prepared. */
export class DarwinProcessOwnershipInspectionError extends Error {
  constructor(
    message: string,
    options?: ErrorOptions & {
      readonly compilerOutcome?: DarwinCompilerOutcome;
    },
  ) {
    const { compilerOutcome, ...errorOptions } = options ?? {};
    super(message, errorOptions);
    this.name = "DarwinProcessOwnershipInspectionError";
    this.compilerOutcome = compilerOutcome;
  }

  readonly compilerOutcome: DarwinCompilerOutcome | undefined;
}

/** Explicit, bounded outcome from compiling REA's Darwin ownership helper. */
export interface DarwinCompilerOutcome {
  readonly outcome:
    | "exited"
    | "signaled"
    | "timed_out"
    | "spawn_failed"
    | "failed";
  readonly code: string | number | null;
  readonly signal: string | null;
  readonly stderr: string;
  readonly stderrBytes: number;
  readonly stderrTruncated: boolean;
  readonly outputTruncated: boolean;
  readonly killed: boolean;
  readonly timeoutMs?: number;
}

const MAX_COMPILER_STDERR_BYTES = 8 * 1024;

const compilerOutcome = (
  cause: unknown,
  timeoutMs: number,
): DarwinCompilerOutcome | undefined => {
  const failure = execFileOutputFailure(cause);
  if (failure === undefined) return undefined;
  const stderr = boundedUtf8Text(failure.stderr, MAX_COMPILER_STDERR_BYTES);
  const outcome =
    failure.code === "ETIMEDOUT"
      ? "timed_out"
      : typeof failure.code === "number"
        ? "exited"
        : failure.signal !== null
          ? "signaled"
          : failure.code === "ENOENT"
            ? "spawn_failed"
            : "failed";
  return {
    outcome,
    code: failure.code,
    signal: failure.signal,
    stderr: stderr.text,
    stderrBytes: Buffer.byteLength(failure.stderr, "utf8"),
    stderrTruncated: stderr.truncated,
    outputTruncated: failure.outputTruncated,
    killed: failure.killed,
    ...(outcome === "timed_out" ? { timeoutMs } : {}),
  };
};

const compilerOutcomeDescription = (
  outcome: DarwinCompilerOutcome | undefined,
  fallbackCode: string | number,
): string => {
  if (outcome === undefined) return `compiler result: ${String(fallbackCode)}`;
  if (outcome.outcome === "exited")
    return `compiler result: exit code ${String(outcome.code)}`;
  if (outcome.outcome === "timed_out")
    return `compiler result: timed out after ${String(outcome.timeoutMs)} ms`;
  if (outcome.outcome === "signaled")
    return `compiler result: stopped by signal ${outcome.signal ?? "an unknown signal"}`;
  return `compiler result: ${String(outcome.code)}`;
};

const compilerInspectionError = (
  cause: unknown,
  timeoutMs: number,
  compiler: DarwinProcessReaderCompiler,
): DarwinProcessOwnershipInspectionError => {
  const outcome = compilerOutcome(cause, timeoutMs);
  const code = outcome?.code ?? "unknown";
  const description = compilerOutcomeDescription(outcome, code);
  const launcher =
    compiler.kind === "xcrun"
      ? "xcrun"
      : "the selected Swift compiler (REA_DARWIN_SWIFTC_PATH)";
  const prefix =
    code === "ENOENT"
      ? `macOS process ownership inspection requires the Apple Swift compiler via ${launcher}`
      : `macOS process ownership helper compilation failed via ${launcher}`;
  const stderr = boundedUtf8Text(outcome?.stderr ?? "", STDERR_EXCERPT_LIMIT);
  const diagnostics = stderr.text.trim();
  const truncated =
    stderr.truncated ||
    outcome?.stderrTruncated === true ||
    outcome?.outputTruncated === true;
  const suffix = diagnostics
    ? `: ${diagnostics}${truncated ? "… [diagnostics truncated]" : ""}`
    : outcome === undefined
      ? `: ${cause instanceof Error ? cause.message : String(cause)}`
      : ": no compiler diagnostics were captured";
  return new DarwinProcessOwnershipInspectionError(
    `${prefix} (${description})${suffix}`,
    {
      cause,
      ...(outcome === undefined ? {} : { compilerOutcome: outcome }),
    },
  );
};

interface ProcessReaderCompilation {
  readonly controller: AbortController;
  promise: Promise<string>;
  waiters: number;
  aborting: boolean;
  settled: boolean;
}

const abortReason = (signal: AbortSignal): unknown => {
  if (signal.reason !== undefined) return signal.reason;
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
};

const isExpectedAbort = (cause: unknown, signal: AbortSignal): boolean =>
  signal.aborted &&
  (cause === signal.reason ||
    (cause instanceof Error && cause.name === "AbortError"));

const waitForCompilation = async (
  promise: Promise<string>,
  signal: AbortSignal | undefined,
): Promise<string> => {
  if (signal === undefined) return promise;
  if (signal.aborted) throw abortReason(signal);
  return new Promise((resolve, reject) => {
    let completed = false;
    const finish = (callback: () => void) => {
      if (completed) return;
      completed = true;
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(abortReason(signal)));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => finish(() => resolve(value)),
      (cause: unknown) => finish(() => reject(cause)),
    );
    if (signal.aborted) onAbort();
  });
};

/** Explicit tool selection; direct Swift compilation also needs its matching SDK. */
export type DarwinProcessReaderCompiler =
  | { readonly kind: "xcrun"; readonly executable: string }
  | {
      readonly kind: "swiftc";
      readonly executable: string;
      readonly sdkRoot: string;
    };

/** Compile and retain the narrow Darwin sysctl reader for this REA process. */
