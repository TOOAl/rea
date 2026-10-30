import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { inspectWindowsNativeReadiness } from "../process/WindowsAuthority.js";
import { systemWindowsNativeAuthority } from "../windows/WindowsNativeLoader.js";
import { AnalysisCapabilityUnavailableError } from "../domain/analysisErrorCore.js";
import type { AndroidOperation } from "../domain/android/androidAnalysis.js";
import type { JsonValue } from "../domain/jsonValue.js";
import type { ProviderAvailability } from "../application/AnalysisProvider.js";
import { ZipArtifactReader } from "../artifacts/ZipArtifactReader.js";
import type { DoctorProviderCheck } from "../application/Doctor.js";
import {
  JADX_JAR_CONFIGURATION_REMEDIATION,
  JADX_JAVA_PROBE_REMEDIATION,
  JADX_JAVA_RUNTIME_REMEDIATION,
  JADX_JVM_OPTIONS_REMEDIATION,
  JADX_UNSUPPORTED_HOST_REMEDIATION,
  JADX_WINDOWS_NATIVE_REMEDIATION,
} from "./JadxRelease.js";

const JAVA_MODULE_LISTING_TIMEOUT_MS = 10_000;
const JAVA_MODULE_LISTING_MAX_OUTPUT_BYTES = 1024 * 1024;
// Bound ZIP metadata allocation during discovery. The audited 0.7.1 JAR's
// central directory occupies 2,294,350 bytes; class bodies are not read here.
const JAR_METADATA_READ_MAX_BYTES = 8 * 1024 * 1024;

/** Caller-supplied tools, resolved only when an Android operation is selected. */
export interface JadxConfiguration {
  readonly jar: string;
  readonly java: string;
  readonly jvmArguments: readonly string[];
}

type ConfigurationFailureCode =
  | "not_configured"
  | "executable_missing"
  | "runtime_missing"
  | "runtime_unavailable"
  | "unsupported_host"
  | "unsupported_version"
  | "version_unresolved"
  | "open_options_invalid";

/**
 * Failure kinds tagged at the JADX configuration boundary. Consumers (the
 * doctor adapter) project the boundary's remediation and classification for
 * a kind; they must not reinterpret the phase/setting evidence to derive
 * them.
 */
export type JadxFailureKind =
  | "windows_native_artifact"
  | "windows_native_runtime"
  | "java_runtime"
  | "java_home"
  | "jvm_options"
  | "jar"
  | "java_probe"
  | "unsupported_host";

/** Runtime mirror of JadxFailureKind for validating the loose diagnostics tag. */
export const JADX_FAILURE_KINDS: readonly JadxFailureKind[] = [
  "windows_native_artifact",
  "windows_native_runtime",
  "java_runtime",
  "java_home",
  "jvm_options",
  "jar",
  "java_probe",
  "unsupported_host",
];

export interface JadxFailureOutcome {
  readonly remediation: string;
  readonly classification: DoctorProviderCheck["classification"];
}

/**
 * Project the boundary-owned remediation and classification for a failure
 * kind. A null kind (missing or corrupt tag) keeps JAR guidance, matching
 * the previous fallthrough for unclassified failures.
 */
export const projectJadxFailureOutcome = (
  kind: JadxFailureKind | null,
  configured: boolean,
): JadxFailureOutcome => {
  const drift = configured ? "config_drift" : "missing_analysis_engine";
  switch (kind) {
    case "windows_native_artifact":
      return {
        remediation: JADX_WINDOWS_NATIVE_REMEDIATION,
        classification: "missing_dependency",
      };
    case "windows_native_runtime":
      return {
        remediation: JADX_WINDOWS_NATIVE_REMEDIATION,
        classification: "runtime_failure",
      };
    case "java_runtime":
      return {
        remediation: JADX_JAVA_RUNTIME_REMEDIATION,
        classification: "missing_dependency",
      };
    case "java_home":
      return {
        remediation: JADX_JAVA_RUNTIME_REMEDIATION,
        classification: drift,
      };
    case "jvm_options":
      return {
        remediation: JADX_JVM_OPTIONS_REMEDIATION,
        classification: drift,
      };
    case "jar":
      return {
        remediation: JADX_JAR_CONFIGURATION_REMEDIATION,
        classification: drift,
      };
    case "java_probe":
      return {
        remediation: JADX_JAVA_PROBE_REMEDIATION,
        classification: drift,
      };
    case "unsupported_host":
      return {
        remediation: JADX_UNSUPPORTED_HOST_REMEDIATION,
        classification: "unsupported_host",
      };
    case null:
      return {
        remediation: JADX_JAR_CONFIGURATION_REMEDIATION,
        classification: drift,
      };
  }
};

class JadxConfigurationFailure extends Error {
  constructor(
    readonly code: ConfigurationFailureCode,
    message: string,
    readonly diagnostics: Readonly<Record<string, JsonValue>>,
    readonly kind: JadxFailureKind,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/** Inspect the same JAR and Java prerequisites that gate actual execution. */
export const inspectJadxAvailability = async (
  environment: Readonly<Record<string, string | undefined>>,
  signal?: AbortSignal,
): Promise<ProviderAvailability> => {
  try {
    const configuration = await readJadxConfigurationInputs(
      environment,
      signal,
    );
    await validateJadxConfigurationContents(configuration, environment, signal);
    return {
      status: "available",
      code: null,
      reason: null,
      diagnostics: {
        configured: true,
        java_executable: configuration.java,
        jdk_compiler: true,
        jar_path: configuration.jar,
      },
    };
  } catch (cause) {
    if (signal?.aborted === true) throw cause;
    if (cause instanceof JadxConfigurationFailure)
      return {
        status: "unavailable",
        code: cause.code,
        reason: cause.message,
        diagnostics: { ...cause.diagnostics, failure_kind: cause.kind },
      };
    throw cause;
  }
};

/** Resolve caller-selected paths and JVM options without probing their contents. */
export const resolveJadxConfigurationInputs = async (
  environment: Readonly<Record<string, string | undefined>>,
  operation: AndroidOperation,
  signal?: AbortSignal,
): Promise<JadxConfiguration> => {
  try {
    return await readJadxConfigurationInputs(environment, signal);
  } catch (cause) {
    if (signal?.aborted === true) throw cause;
    if (!(cause instanceof JadxConfigurationFailure)) throw cause;
    throw projectConfigurationFailure(operation, cause);
  }
};

/** Probe Java and archive prerequisites before starting a new engine session. */
export const validateJadxConfiguration = async (
  configuration: JadxConfiguration,
  environment: Readonly<Record<string, string | undefined>>,
  operation: AndroidOperation,
  signal?: AbortSignal,
): Promise<void> => {
  try {
    await validateJadxConfigurationContents(configuration, environment, signal);
  } catch (cause) {
    if (signal?.aborted === true) throw cause;
    if (!(cause instanceof JadxConfigurationFailure)) throw cause;
    throw projectConfigurationFailure(operation, cause);
  }
};

const readJadxConfigurationInputs = async (
  environment: Readonly<Record<string, string | undefined>>,
  signal?: AbortSignal,
): Promise<JadxConfiguration> => {
  signal?.throwIfAborted();
  requireSupportedHost();
  const jar = await resolveJar(environment);
  const java = await resolveJava(environment, signal);
  await requireJavaHomeExecutable(environment.JAVA_HOME, java);
  signal?.throwIfAborted();
  return { jar, java, jvmArguments: resolveJvmArguments(environment) };
};

const validateJadxConfigurationContents = async (
  configuration: JadxConfiguration,
  environment: Readonly<Record<string, string | undefined>>,
  signal?: AbortSignal,
): Promise<void> => {
  signal?.throwIfAborted();
  await inspectJavaRuntime(configuration.java, environment, signal);
  await requireEngineArchive(configuration.jar, signal);
};

const projectConfigurationFailure = (
  operation: AndroidOperation,
  cause: JadxConfigurationFailure,
): AnalysisCapabilityUnavailableError => {
  const output = cause.diagnostics;
  return new AnalysisCapabilityUnavailableError(
    "jadx",
    operation,
    cause.message,
    {
      cause,
      userMessage: cause.message,
      ...(typeof output.stdout === "string" && typeof output.stderr === "string"
        ? {
            capturedOutput: {
              stdout: output.stdout,
              stderr: output.stderr,
              truncated: output.output_truncated === true,
            },
          }
        : {}),
    },
  );
};

const requireEngineArchive = async (
  jar: string,
  signal?: AbortSignal,
): Promise<void> => {
  // These classes are consumed directly by ReaJadxBridge.java. This checks the
  // classpath inventory without loading engine code or starting a JADX session.
  const missing = new Set([
    "com/atxx/jhmcp/JadxSession.class",
    "com/atxx/jhmcp/SessionHolder.class",
    "jadx/api/JadxDecompiler.class",
    "com/google/gson/Gson.class",
    "io/modelcontextprotocol/kotlin/sdk/server/Server.class",
  ]);
  const reader = new ZipArtifactReader(jar, "zip", JAR_METADATA_READ_MAX_BYTES);
  try {
    for await (const entry of reader.entries(signal)) {
      if (entry.kind === "file" && !entry.encrypted) missing.delete(entry.path);
      if (missing.size === 0) return;
    }
  } catch (cause) {
    if (signal?.aborted === true) throw cause;
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw configurationFailure(
      "version_unresolved",
      `Cannot inspect REA_JADX_MCP_JAR ${jar} as a Java archive: ${reason}. ${JADX_JAR_CONFIGURATION_REMEDIATION}`,
      {
        jar_path: jar,
        phase: "jar-inspection",
        archive_error: reason,
        maximum_metadata_read_bytes: JAR_METADATA_READ_MAX_BYTES,
      },
      "jar",
      cause,
    );
  } finally {
    await reader.close();
  }
  throw configurationFailure(
    "unsupported_version",
    `REA_JADX_MCP_JAR ${jar} does not contain the required metadata bridge classes: ${[...missing].join(", ")}. ${JADX_JAR_CONFIGURATION_REMEDIATION}`,
    { jar_path: jar, phase: "jar-inspection", missing_classes: [...missing] },
    "jar",
  );
};

const requireSupportedHost = (): void => {
  if (process.platform === "linux" || process.platform === "darwin") return;
  if (process.platform === "win32" && process.arch === "x64") {
    const loaded = systemWindowsNativeAuthority();
    if (loaded.available) {
      if (loaded.authority.inspection.protocolStdin === true) return;
      throw configurationFailure(
        "runtime_missing",
        "The bundled Windows native artifact lacks owned protocol stdin; use a matching current Windows x64 REA package.",
        {
          platform: process.platform,
          architecture: process.arch,
          phase: "process-ownership",
          owned_protocol_stdin: false,
        },
        "windows_native_artifact",
      );
    }
    const readiness = inspectWindowsNativeReadiness(process.platform, loaded);
    throw configurationFailure(
      readiness.available ? "runtime_unavailable" : readiness.code,
      readiness.available
        ? "Windows native readiness disagreed with the native loader result."
        : readiness.reason,
      {
        platform: process.platform,
        architecture: process.arch,
        phase: "process-ownership",
        owned_protocol_stdin: false,
        ...(readiness.available
          ? {}
          : {
              failure_stage: readiness.failureStage,
              remediation: readiness.remediation,
            }),
      },
      readiness.available
        ? "windows_native_runtime"
        : readiness.code === "unsupported_host"
          ? "unsupported_host"
          : readiness.code === "runtime_missing"
            ? "windows_native_artifact"
            : "windows_native_runtime",
    );
  }
  throw configurationFailure(
    "unsupported_host",
    `Android JADX subprocess ownership is unsupported on ${process.platform}/${process.arch}; use Linux, macOS, or Windows x64 with its bundled native controls.`,
    { platform: process.platform },
    "unsupported_host",
  );
};

const resolveJar = async (
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string> => {
  const jar = environment.REA_JADX_MCP_JAR;
  if (jar === undefined || !isAbsolute(jar))
    throw configurationFailure(
      "not_configured",
      JADX_JAR_CONFIGURATION_REMEDIATION,
      { jar_configured: false },
      "jar",
    );
  try {
    await access(jar, constants.R_OK);
    if (!(await stat(jar)).isFile())
      throw configurationFailure(
        "executable_missing",
        `REA_JADX_MCP_JAR is not a regular file: ${jar}`,
        { jar_path: jar },
        "jar",
      );
    return await realpath(jar);
  } catch (cause) {
    if (cause instanceof JadxConfigurationFailure) throw cause;
    throw configurationFailure(
      "executable_missing",
      `Cannot read REA_JADX_MCP_JAR ${jar}: ${cause instanceof Error ? cause.message : String(cause)}`,
      { jar_path: jar },
      "jar",
      cause,
    );
  }
};
