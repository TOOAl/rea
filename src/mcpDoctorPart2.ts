import { performance } from "node:perf_hooks";
import { StringDecoder } from "node:string_decoder";

import { createCatalogIdentity } from "./catalogIdentity.js";
import {
  compactPresentationForMcpInputSchemaProfile,
  parseMcpInputSchemaProfile,
} from "./config/mcpInputSchemaProfile.js";
import { parseMcpOutputSchemaProfile } from "./config/mcpOutputSchemaProfile.js";
import { MCP_STARTUP_POLICY } from "./mcpStartupPolicy.js";

const OUTPUT_FORMATS = ["toon", "json", "yaml", "md", "jsonl"] as const;

// src/mcpDoctorPart2.ts
/**
 * Report whether `--help`/`-h` appears in option position. Tokens consumed
 * as `--format`'s value are skipped so `--format --help` stays an invalid
 * format error instead of silently becoming a help request.
 */
const hasHelpInOptionPosition = (arguments_: readonly string[]): boolean => {
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--format") {
      index += 1;
      continue;
    }
    if (HELP_FLAGS.has(argument ?? "")) return true;
  }
  return false;
};

const isOutputFormat = (value: string | undefined): value is OutputFormat =>
  OUTPUT_FORMATS.some((candidate) => candidate === value);

const requestOptions = (deadline: number, signal: AbortSignal) => ({
  signal,
  timeout: Math.max(1, Math.ceil(deadline - performance.now())),
});

const targetFreeEnvironment = (
  environment: Readonly<Record<string, string | undefined>>,
): Record<string, string> => {
  const result = Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  for (const name of [
    "HOPPER_TARGET_PATH",
    "HOPPER_TARGET_KIND",
    "HOPPER_LOADER_ARGS_JSON",
  ])
    delete result[name];
  return result;
};

const catalogIdentityForEnvironment = (
  environment: Readonly<Record<string, string | undefined>>,
): ReturnType<typeof createCatalogIdentity> => {
  const inputProfile = parseMcpInputSchemaProfile(
    environment.REA_MCP_INPUT_SCHEMA_PROFILE,
  );
  const outputProfile = parseMcpOutputSchemaProfile(
    environment.REA_MCP_OUTPUT_SCHEMA_PROFILE,
  );
  return createCatalogIdentity(
    compactPresentationForMcpInputSchemaProfile(
      inputProfile.ok ? inputProfile.value : undefined,
    ),
    outputProfile.ok ? (outputProfile.value ?? "full") : "full",
  );
};

const captureStderr = () => {
  const retained = Buffer.allocUnsafe(MCP_STARTUP_POLICY.doctorStderrBytes);
  let retainedBytes = 0;
  let bytes = 0;
  let truncated = false;
  return {
    append(chunk: unknown) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk), "utf8");
      bytes += buffer.byteLength;
      const remaining = retained.byteLength - retainedBytes;
      const copied = Math.min(remaining, buffer.byteLength);
      if (copied > 0) {
        buffer.copy(retained, retainedBytes, 0, copied);
        retainedBytes += copied;
      }
      if (copied < buffer.byteLength) truncated = true;
    },
    value: () => ({
      stderr: truncated
        ? new StringDecoder("utf8").write(retained.subarray(0, retainedBytes))
        : retained.toString("utf8", 0, retainedBytes),
      stderr_bytes: bytes,
      stderr_truncated: truncated,
    }),
  };
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);
