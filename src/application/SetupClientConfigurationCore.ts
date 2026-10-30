import { readClientPolicyBlock } from "./GeminiClientSettings.js";
import {
  readClientConfigurationFiles,
  readConfigurationText,
} from "./ClientConfigurationFiles.js";
import { ConfigurationError } from "../domain/configurationErrors.js";
import {
  clientConfigurationValuesEqual,
  clientServerPath,
  legacyClientServerPath,
  OMP_DISABLED_SERVERS_KEY,
  parseClientConfiguration,
  serializeClientConfiguration,
  withClientServers,
  type ClientConfigurationDocument,
} from "./ClientConfigurationDocument.js";
import { dshDocument } from "./DshCordisPatch.js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import writeFileAtomic from "write-file-atomic";
import {
  clientRegistrationEnvironmentDetails,
  type ProviderRequestBudgetResolver,
} from "./ClientRegistrationEnvironment.js";

import { PRODUCT_IDENTITY } from "../identity.js";
import { npxRegistrationCommand } from "./ClientRegistrationIdentity.js";
import { resolveClientConfigTransactionPath } from "./ClientConfigPath.js";
import { packageReadTargetChanged } from "./MsixPackageStorage.js";
import {
  readRegularFileText,
  RegularFileCleanupFailure,
} from "./RegularFileRead.js";
import {
  preserveRecoveryBackup,
  selectCurrentRecoveryBackup,
} from "./SetupRecoveryBackup.js";
import type {
  ClientConfigurationInspection,
  ClientConfigurationResult,
  SetupProviderEnvironment,
} from "./SetupTypes.js";
import {
  registrationWriteBlocker,
  type SetupClient,
} from "./SupportedClients.js";

export class ClientConfigurationCleanupRollbackFailure extends RegularFileCleanupFailure<string> {
  constructor(
    failure: RegularFileCleanupFailure<string>,
    readonly configurationFailure: Extract<
      ClientConfigurationResult,
      { readonly status: "failed"; readonly reason: "rollback" }
    >,
  ) {
    super(
      failure.path,
      failure.owner,
      failure.outcome,
      new AggregateError(
        [failure.cleanupCause, new Error(configurationFailure.failure.detail)],
        `Configuration readback cleanup and rollback failed: ${configurationFailure.failure.path}`,
      ),
    );
  }
}

/** Configure one supported client's native stdio MCP registration shape. */
export const configureClientConfiguration = (
  client: SetupClient,
  environment: SetupProviderEnvironment = {},
  command: readonly string[] = npxRegistrationCommand(),
  resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
): Promise<ClientConfigurationResult> => {
  if (client.configPathError !== undefined)
    return Promise.resolve({ status: "failed", reason: "path" });
  return configureClientDocument(
    client,
    environment,
    command,
    resolveProviderRequestBudget,
  );
};

const configureClientDocument = async (
  client: SetupClient,
  environment: SetupProviderEnvironment,
  command: readonly string[],
  resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
): Promise<ClientConfigurationResult> => {
  const format = client.format;
  if (format === undefined || format === "unsupported")
    return { status: "failed", reason: "readback" };
  const files = await readClientConfigurationFiles(client);
  if (!files.ok) {
    throwCleanupFailure(files.error);
    return { status: "failed", reason: "readback" };
  }
  const existing = files.value.find(
    ({ sourcePath }) => sourcePath === client.configPath,
  );
  const editabilityError =
    existing?.dialect === "dsh"
      ? dshDocument(existing.document).editabilityError
      : undefined;
  if (editabilityError !== undefined)
    return { status: "failed", reason: "readback" };
  const policy = await readClientPolicyBlock(
    client,
    undefined,
    clientConfigurationDesired(
      client,
      environment,
      command,
      existing,
      files.value,
      resolveProviderRequestBudget,
    ),
  );
  if (!policy.ok) {
    throwCleanupFailure(policy.error);
    return { status: "failed", reason: "readback" };
  }
  if (policy.value !== undefined)
    return { status: "failed", reason: "readback" };
  const transactionPath = await resolveClientConfigTransactionPath(
    client.configPath,
  );
  if (transactionPath === undefined)
    return { status: "failed", reason: "path" };
  let original: string | undefined;
  try {
    original = await readRegularFileText(transactionPath);
  } catch (cause: unknown) {
    if (cause instanceof RegularFileCleanupFailure) throw cause;
    if (!isMissing(cause)) return { status: "failed", reason: "readback" };
  }
  let parsed: ClientConfigurationDocument;
  try {
    parsed = parseClientConfiguration(
      original ??
        (format === "toml" || format === "grok" || format === "dsh"
          ? ""
          : "{}"),
      format,
    );
    const policy = await readClientPolicyBlock(
      client,
      parsed,
      clientConfigurationDesired(
        client,
        environment,
        command,
        parsed,
        files.value,
        resolveProviderRequestBudget,
      ),
    );
    if (!policy.ok) {
      throwCleanupFailure(policy.error);
      return { status: "failed", reason: "readback" };
    }
    if (policy.value !== undefined)
      return { status: "failed", reason: "readback" };
  } catch (cause: unknown) {
    if (cause instanceof RegularFileCleanupFailure) throw cause;
    // Malformed existing configuration fails the readback gate.
    void cause;
    return { status: "failed", reason: "readback" };
  }
  const fallback = await readZcodeFallbackServers(client, parsed);
  if (!fallback.ok) {
    throwCleanupFailure(fallback.error);
    return { status: "failed", reason: "readback" };
  }
  const desired = clientConfigurationDesired(
    client,
    environment,
    command,
    {
      ...parsed,
      servers: { ...fallback.value, ...parsed.servers },
    },
    files.value,
    resolveProviderRequestBudget,
  );
  if (registrationCurrent(parsed, desired)) return { status: "unchanged" };
  return persistClientConfiguration({
    client,
    transactionPath,
    format,
    original,
    parsed,
    desired,
    fallbackServers: fallback.value,
  });
};

interface ClientConfigurationUpdate {
  readonly client: SetupClient;
  readonly transactionPath: string;
  readonly format: NonNullable<SetupClient["format"]>;
  readonly original: string | undefined;
  readonly parsed: ClientConfigurationDocument;
  readonly desired: unknown;
  readonly fallbackServers: Readonly<Record<string, unknown>>;
}

const persistClientConfiguration = async ({
  client,
  transactionPath,
  format,
  original,
  parsed,
  desired,
  fallbackServers,
}: ClientConfigurationUpdate): Promise<ClientConfigurationResult> => {
  // The plan chose this file; an MSIX package may have switched to its
  // private copy since, for example when it quit.
  if (
    client.msixPackage !== undefined &&
    (await packageReadTargetChanged(client.msixPackage, client.configPath))
  )
    return { status: "failed", reason: "target_changed" };
  const backupPath =
    original === undefined ? undefined : `${client.configPath}.rea.backup`;
  let recoveryBackupPath: string | undefined;
  if (backupPath !== undefined && original !== undefined) {
    const selection = await selectCurrentRecoveryBackup(backupPath, original);
    if (!selection.ok) return { status: "failed", reason: "backup" };
    if (
      !(await preserveRecoveryBackup(
        transactionPath,
        selection.value.backupPath,
      ))
    )
      return { status: "failed", reason: "backup" };
    const verified = await selectCurrentRecoveryBackup(backupPath, original);
    if (
      !verified.ok ||
      verified.value.backupPath !== selection.value.backupPath ||
      !verified.value.present
    )
      return { status: "failed", reason: "backup" };
    recoveryBackupPath = verified.value.backupPath;
  }
  // A native OpenCode V2 entry replaces REA's legacy V1 entry, which would
  // otherwise conflict with it.
  const legacyPath = legacyClientServerPath(
    parsed,
    PRODUCT_IDENTITY.mcpServerKey,
  );
  const registered = withClientServers(
    parsed,
    {
      ...fallbackServers,
      ...parsed.servers,
      [PRODUCT_IDENTITY.mcpServerKey]: desired,
    },
    PRODUCT_IDENTITY.mcpServerKey,
  );
  // OMP's denylist would hide the registration; keep every other listed name.
  const ompDisabled =
    parsed.dialect === "omp"
      ? parsed.document[OMP_DISABLED_SERVERS_KEY]
      : undefined;
  const enableOmp =
    Array.isArray(ompDisabled) &&
    ompDisabled.includes(PRODUCT_IDENTITY.mcpServerKey);
  const document =
    enableOmp && Array.isArray(ompDisabled)
      ? {
          ...registered,
          [OMP_DISABLED_SERVERS_KEY]: ompDisabled.filter(
            (name: unknown) => name !== PRODUCT_IDENTITY.mcpServerKey,
          ),
        }
      : registered;
  try {
    await mkdir(dirname(client.configPath), { recursive: true });
    await writeFileAtomic(
      transactionPath,
      serializeClientConfiguration(document, format, original, [
        ...Object.keys(fallbackServers)
          .filter((name) => name !== PRODUCT_IDENTITY.mcpServerKey)
          .map((name) => clientServerPath(parsed, name)),
        clientServerPath(parsed, PRODUCT_IDENTITY.mcpServerKey),
        ...(legacyPath === undefined ? [] : [legacyPath]),
        ...(enableOmp ? [[OMP_DISABLED_SERVERS_KEY]] : []),
      ]),
      {
        encoding: "utf8",
        mode: 0o600,
      },
    );
  } catch (cause: unknown) {
    // Write failure is reported by the status reason.
    void cause;
    return { status: "failed", reason: "write" };
  }
  try {
    const readback = parseClientConfiguration(
      await readRegularFileText(transactionPath),
      format,
    );
    if (
      !registrationCurrent(readback, desired) ||
      Object.entries(fallbackServers).some(
        ([name, entry]) =>
          name !== PRODUCT_IDENTITY.mcpServerKey &&
          !clientConfigurationValuesEqual(readback.servers[name], entry),
      )
    ) {
      return rollbackOrReadbackFailure(
        transactionPath,
        original,
        recoveryBackupPath,
      );
    }
  } catch (cause: unknown) {
    if (cause instanceof RegularFileCleanupFailure) {
      const rollback = await restoreConfig(transactionPath, original);
      if (!rollback.ok)
        throw new ClientConfigurationCleanupRollbackFailure(cause, {
          status: "failed",
          reason: "rollback",
          ...(recoveryBackupPath === undefined
            ? {}
            : { backupPath: recoveryBackupPath }),
          failure: rollback.error,
        });
      throw cause;
    }
    // Readback failure restores the transaction before reporting.
    void cause;
    return rollbackOrReadbackFailure(
      transactionPath,
      original,
      recoveryBackupPath,
    );
  }
  return {
    status: "configured",
    ...(recoveryBackupPath === undefined
      ? {}
      : { backupPath: recoveryBackupPath }),
  };
};

/** Determine whether an existing client configuration matches the desired registration. */
export const clientConfigurationAligned = async (
  client: SetupClient,
  providerEnvironment: SetupProviderEnvironment,
  command: readonly string[],
  resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
): Promise<boolean> => {
  if (client.configPathError !== undefined) return false;
  try {
    const files = await readClientConfigurationFiles(client);
    if (!files.ok) {
      throwCleanupFailure(files.error);
      return false;
    }
    const original = await readRegularFileText(client.configPath);
    const parsed = parseClientConfiguration(original, client.format);
    const policy = await readClientPolicyBlock(
      client,
      parsed,
      clientConfigurationDesired(
        client,
        providerEnvironment,
        command,
        parsed,
        files.value,
        resolveProviderRequestBudget,
      ),
    );
    if (!policy.ok) {
      throwCleanupFailure(policy.error);
      return false;
    }
    return (
      policy.value === undefined &&
      registrationCurrent(
        parsed,
        clientConfigurationDesired(
          client,
          providerEnvironment,
          command,
          parsed,
          files.value,
          resolveProviderRequestBudget,
        ),
      )
    );
  } catch (cause: unknown) {
    if (cause instanceof RegularFileCleanupFailure) throw cause;
    // Unreadable configuration is treated as not aligned so setup repairs it.
    void cause;
    return false;
  }
};

/** Preflight one client configuration before setup presents any mutations. */
export const inspectClientConfiguration = async (
  client: SetupClient,
  providerEnvironment: SetupProviderEnvironment,
  command: readonly string[],
  resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
): Promise<ClientConfigurationInspection> => {
  const inspection = await inspectClientDocument(
    client,
    providerEnvironment,
    command,
    resolveProviderRequestBudget,
  );
  if (inspection.status !== "create" && inspection.status !== "update")
    return inspection;
  // A change the running client would overwrite is not a persisted registration.
  const blocker = registrationWriteBlocker(client, "setup");
  return blocker === undefined
    ? inspection
    : { status: "invalid", remediation: blocker };
};
