import { access } from "node:fs/promises";
// removed unused import: // removed unused import: import { resolve } from "node:path";  // resolve unused  // resolve unused

import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
import { ConfigurationError } from "../domain/configurationErrors.js";
// removed unused import: // removed unused import: import { PRODUCT_IDENTITY } from "../identity.js";  // PRODUCT_IDENTITY unused  // PRODUCT_IDENTITY unused
import { systemDoctorHost, type DoctorHost } from "./Doctor.js";
import {
  LinuxHopperTemporaryCleanupOwner,
  systemLinuxHopperInstallHost,
  type LinuxHopperInstallHost,
} from "./LinuxHopper.js";
import { systemMacHopperInstallHost } from "./MacHopper.js";
import {
  clientEvidencePaths,
  supportedClients,
  type SetupClient,
} from "./SupportedClients.js";
import {
  clientConfigurationAligned,
  ClientConfigurationCleanupRollbackFailure,
  configureClientConfiguration,
  inspectClientConfiguration,
} from "./SetupClientConfiguration.js";
import { failedConfigurationMessage } from "./SetupClients.js";
import {
  RegularFileCleanupFailure,
  retryRegularFileCleanup,
} from "./RegularFileRead.js";
import type {
  SetupInitialState,
  SetupProviderEnvironment,
} from "./SetupTypes.js";

/** Resolve the executable and arguments used in a managed MCP registration. */

const setupInstallerDiagnostic = (
  value: string | undefined,
): string | undefined => {
  if (value === undefined) return undefined;
  const normalized = value
    .replace(/\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\([0-9A-Za-z]|[@-Z\\^_])/gu, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (normalized === "") return undefined;
  return normalized.length <= 400
    ? normalized
    : `${normalized.slice(0, 397).trimEnd()}...`;
};

const clientConfigurationOperations = (
  resources: ArtifactResourceScope,
  resolveProviderRequestBudget: DoctorHost["resolveProviderRequestBudget"],
) => ({
  configureClient: (
    client: SetupClient,
    providerEnvironment: SetupProviderEnvironment,
    command: readonly string[],
  ) =>
    runClientConfigurationOperation(resources, async () =>
      client.format === "unsupported"
        ? { status: "skipped" as const }
        : configureClientConfiguration(
            client,
            providerEnvironment,
            command,
            resolveProviderRequestBudget,
          ),
    ),
  clientNeedsConfigure: (
    client: SetupClient,
    providerEnvironment: SetupProviderEnvironment,
    command: readonly string[],
  ) =>
    runClientConfigurationOperation(resources, async () =>
      client.format === "unsupported"
        ? false
        : !(await clientConfigurationAligned(
            client,
            providerEnvironment,
            command,
            resolveProviderRequestBudget,
          )),
    ),
  inspectClientConfiguration: (
    client: SetupClient,
    providerEnvironment: SetupProviderEnvironment,
    command: readonly string[],
  ) =>
    runClientConfigurationOperation(resources, () =>
      inspectClientConfiguration(
        client,
        providerEnvironment,
        command,
        resolveProviderRequestBudget,
      ),
    ),
});

const closeSetupResources = async (
  resources: ArtifactResourceScope,
  macHopperHost: ReturnType<typeof systemMacHopperInstallHost> | undefined,
  doctorHost: DoctorHost,
  retryLinuxHopperCleanup: () => Promise<string | undefined>,
): Promise<string | undefined> => {
  const [resourceCleanup, hopperCleanup, doctorCleanup, linuxCleanup] =
    await Promise.allSettled([
      resources.close(),
      Promise.resolve().then(() => macHopperHost?.close()),
      Promise.resolve().then(() => doctorHost.close?.()),
      retryLinuxHopperCleanup(),
    ]);
  const failures: string[] = [];
  if (hopperCleanup.status === "rejected")
    failures.push(
      `Hopper host cleanup failed: ${errorMessage(hopperCleanup.reason)}`,
    );
  else if (hopperCleanup.value !== undefined)
    failures.push(hopperCleanup.value);
  if (doctorCleanup.status === "rejected")
    failures.push(
      `Doctor host cleanup failed: ${errorMessage(doctorCleanup.reason)}`,
    );
  else if (doctorCleanup.value !== undefined)
    failures.push(doctorCleanup.value);
  if (linuxCleanup.status === "rejected")
    failures.push(
      `Linux Hopper cleanup retry failed: ${errorMessage(linuxCleanup.reason)}`,
    );
  else if (linuxCleanup.value !== undefined) failures.push(linuxCleanup.value);
  if (resourceCleanup.status === "rejected")
    failures.push(errorMessage(resourceCleanup.reason));
  return failures.length === 0 ? undefined : failures.join("; ");
};

const runClientConfigurationOperation = async <Value>(
  resources: ArtifactResourceScope,
  operation: () => Promise<Value>,
): Promise<Value> => {
  try {
    return await resources.run(async () => {
      try {
        return await operation();
      } catch (cause: unknown) {
        if (!(cause instanceof RegularFileCleanupFailure)) throw cause;
        const cleanup = await retryRegularFileCleanup(cause, resources);
        const primary =
          cleanup.outcome.kind === "failed"
            ? cleanup.outcome.cause
            : cause.cleanupCause;
        const rollbackMessage =
          cause instanceof ClientConfigurationCleanupRollbackFailure
            ? ` ${failedConfigurationMessage(cause.configurationFailure)}`
            : "";
        throw configurationCleanupError(
          `Could not safely access client configuration at ${cause.path}: ${errorMessage(primary)}.${rollbackMessage}`,
          cause,
          cleanup.cleanup,
        );
      }
    });
  } catch (cause: unknown) {
    if (cause instanceof ArtifactReaderFailure)
      throw configurationCleanupError(cause.message, cause, cause.cleanup);
    throw cause;
  }
};

const configurationCleanupError = (
  message: string,
  cause: unknown,
  cleanup:
    | { readonly reason: string; readonly resources: readonly string[] }
    | undefined,
): ConfigurationError =>
  new ConfigurationError(message, {
    cause,
    settings: [{ setting: "client configuration", constraint: message }],
    ...(cleanup === undefined ? {} : { cleanup }),
  });

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const closeLinuxHopperInstallHost = async (
  host: LinuxHopperInstallHost,
  temporaryOwner: LinuxHopperTemporaryCleanupOwner,
): Promise<string | undefined> => {
  const reasons: string[] = [];
  const temporary = await temporaryOwner.retry(host.cleanup);
  if (temporary !== undefined) reasons.push(temporary);
  try {
    await host.close?.();
  } catch (cause: unknown) {
    reasons.push(
      `Linux Hopper publisher cleanup failed: ${errorMessage(cause)}`,
    );
  }
  return reasons.length === 0 ? undefined : reasons.join("; ");
};

/** Detect supported agents from their config files or stable installation markers. */
export const detectClients = async (
  home: string,
  platform: NodeJS.Platform = process.platform,
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): Promise<readonly SetupClient[]> => {
  const detected: SetupClient[] = [];
  for (const candidate of supportedClients(home, platform, environment)) {
    if (candidate.configPathError !== undefined) continue;
    if (await clientEvidencePresent(candidate)) detected.push(candidate);
  }
  return detected;
};

const major = (version: string): number =>
  Number.parseInt(version.split(".")[0] ?? "0", 10);
const clientEvidencePresent = async (client: SetupClient): Promise<boolean> => {
  for (const path of clientEvidencePaths(client))
    if (await exists(path)) return true;
  return false;
};

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch (cause: unknown) {
    // best-effort cleanup: optional host probing; absence means unavailable.
    void cause;
    return false;
  }
};
