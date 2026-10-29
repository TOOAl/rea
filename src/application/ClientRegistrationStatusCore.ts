import { readClientPolicyBlock } from "./GeminiClientSettings.js";
import { readEffectiveClientRegistrationConfiguration } from "./ClientConfigurationFiles.js";
import {
  clientServerForcedEnabled,
  clientServerListedDisabled,
  effectiveClientServer,
  type ClientConfigurationDocument,
} from "./ClientConfigurationDocument.js";
import { access } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import { z } from "zod";
import { valid } from "semver";

import { PRODUCT_IDENTITY } from "../identity.js";
import { CURRENT_ENTRYPOINT_PATH } from "../process/CurrentEntrypointPath.js";
import {
  MCP_STARTUP_POLICY,
  mcpProviderDeadlineAllowanceMs,
  recommendedMcpToolTimeoutMs,
  recommendedMcpToolTimeoutSeconds,
  type McpToolTimeoutInputs,
} from "../mcpStartupPolicy.js";
import {
  clientRegistrationPackageReference,
  classifyClientRegistrationCommand,
  packageRunnerRegistrationCommand,
} from "./ClientRegistrationIdentity.js";
import {
  clientEvidencePaths,
  manualRegistrationRemediation,
  supportedClients,
} from "./SupportedClients.js";
import type { SetupClient } from "./SupportedClients.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
import { dshDocument } from "./DshCordisPatch.js";
import { clientRegistrationEnvironmentDetails } from "./ClientRegistrationEnvironment.js";
import type { ProviderRequestBudgetResolver } from "./ClientRegistrationEnvironment.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";

interface ClientRegistrationStatusBase {
  readonly client: string;
  readonly config_path: string;
  /** Exact package reference requested by npx/bunx, when registration uses one. */
  readonly package_reference?: string;
  /** Non-blocking timeout guidance; caller-selected values remain aligned. */
  readonly advisory?: string;
}

type RegistrationCommand = readonly [string, ...string[]];

export type ClientRegistrationStatus = ClientRegistrationStatusBase &
  (
    | {
        readonly command: RegistrationCommand;
        readonly state: "aligned";
        readonly remediation: null;
      }
    | {
        readonly command: RegistrationCommand;
        readonly state: "stale";
        readonly remediation: string;
      }
    | {
        readonly command: RegistrationCommand;
        readonly state: "unknown";
        readonly remediation: string;
      }
    | {
        readonly command: readonly [];
        readonly state: "missing" | "invalid" | "manual";
        readonly remediation: string;
      }
  );

export type UnhealthyClientRegistrationStatus = Exclude<
  ClientRegistrationStatus,
  { readonly state: "aligned" }
>;

const registrationSchema = z
  .object({
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    startup_timeout_sec: z.number().positive().optional(),
    tool_timeout_sec: z.number().positive().optional(),
    startupTimeoutMs: z.number().positive().optional(),
    toolTimeoutMs: z.number().positive().optional(),
    type: z.string().optional(),
    transport: z.string().optional(),
    serverName: z.string().optional(),
    tools: z.array(z.string()).optional(),
    disabled: z.boolean().optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

interface ClientRegistrationReadOptions {
  readonly platform?: NodeJS.Platform;
  readonly environment?: NodeJS.ProcessEnv;
  readonly resources?: ArtifactResourceScope;
  readonly resolveProviderRequestBudget?: ProviderRequestBudgetResolver;
}

/** Registration facts shared by diagnostics and update maintenance. */
export interface ClientRegistrationInspection {
  readonly status: ClientRegistrationStatus;
  readonly activation: "enabled" | "disabled" | "unknown";
}

/** Project diagnostics from the same inspection used to select maintenance. */
export const readClientRegistrationStatuses = async (
  home: string,
  currentCommandPath: string | undefined = CURRENT_ENTRYPOINT_PATH,
  options: ClientRegistrationReadOptions = {},
): Promise<readonly ClientRegistrationStatus[]> =>
  (
    await readClientRegistrationInspections(home, currentCommandPath, options)
  ).map(({ status }) => status);

/** Parse effective registrations and their client-specific activation once. */
export const readClientRegistrationInspections = async (
  home: string,
  currentCommandPath: string | undefined = CURRENT_ENTRYPOINT_PATH,
  options: ClientRegistrationReadOptions = {},
): Promise<readonly ClientRegistrationInspection[]> => {
  const inspections: ClientRegistrationInspection[] = [];
  const record = (
    status: ClientRegistrationStatus,
    activation: ClientRegistrationInspection["activation"] = "unknown",
  ): void => {
    inspections.push({ status, activation });
  };
  for (const client of supportedClients(
    home,
    options.platform,
    options.environment,
  )) {
    if (client.configPathError !== undefined) {
      record({
        client: client.name,
        config_path: client.configPath,
        command: [],
        state: "invalid",
        remediation: client.configPathError,
      });
      continue;
    }
    if (!(await clientEvidencePresent(client))) continue;
    const manualRemediation = manualRegistrationRemediation(client.name);
    if (client.format === "unsupported") {
      if (manualRemediation !== undefined)
        record({
          client: client.name,
          config_path: client.markerPath ?? client.configPath,
          command: [],
          state: "manual",
          remediation: manualRemediation,
        });
      continue;
    }
    let selectedConfigPath = client.configPath;
    try {
      const configuration = await readEffectiveClientRegistrationConfiguration(
        client,
        options.resources,
      );
      if (!configuration.ok) {
        record({
          client: client.name,
          config_path: configuration.error.path,
          command: [],
          state: "invalid",
          remediation: configuration.error.detail,
        });
        continue;
      }
      const { document: parsed, configPath } = configuration.value;
      selectedConfigPath = configPath;
      if (parsed === undefined) {
        record(unavailableStatus(client, "missing", configPath));
        continue;
      }
      const policy = await readClientPolicyBlock(
        client,
        parsed,
        undefined,
        options.resources,
      );
      if (!policy.ok) {
        record({
          client: client.name,
          config_path: configPath,
          command: [],
          state: "invalid",
          remediation: policy.error.detail,
        });
        continue;
      }
      const policyBlock = policy.value;
      const raw = effectiveClientServer(parsed, PRODUCT_IDENTITY.mcpServerKey);
      if (raw === undefined) {
        const editabilityError =
          parsed.dialect === "dsh"
            ? dshDocument(parsed.document).editabilityError
            : undefined;
        if (editabilityError !== undefined) {
          record({
            client: client.name,
            config_path: configPath,
            command: [],
            state: "invalid",
            remediation: editabilityError.message,
          });
          continue;
        }
        record(unavailableStatus(client, "missing", configPath));
        continue;
      }
      const effectiveClient: SetupClient =
        parsed.dialect === "zcode_fallback"
          ? {
              ...client,
              configPath,
              configPaths: [configPath],
              format: "zcode_fallback",
            }
          : client;
      const registration = parseRegistration(raw, effectiveClient);
      const registrationEnvironment =
        client.name === "kimi" || client.name === "codex"
          ? clientRegistrationEnvironmentDetails(
              parsed,
              {},
              "effective",
              options.resolveProviderRequestBudget,
            )
          : undefined;
      if (
        registrationEnvironment !== undefined &&
        !registrationEnvironment.ok
      ) {
        record({
          client: client.name,
          config_path: configPath,
          command: [],
          state: "invalid",
          remediation: registrationEnvironment.error.message,
        });
        continue;
      }
      const command: RegistrationCommand = [
        registration.command,
        ...registration.args,
      ];
      const packageReference = clientRegistrationPackageReference(command);
      const activation = registrationActivation(registration, client, parsed);
      const packageVersion = exactRegisteredPackageVersion(packageReference);
      const packageVersionDrift =
        packageVersion !== undefined &&
        packageVersion !== PRODUCT_IDENTITY.packageVersion;
      const alignment = registrationAligned({
        registration,
        client: effectiveClient,
        currentCommandPath,
        platform: options.platform ?? process.platform,
        kimiInputSchemaProfileSelected:
          registrationEnvironment?.ok === true &&
          registrationEnvironment.value.values.REA_MCP_INPUT_SCHEMA_PROFILE !==
            undefined,
      });
      record(
        configuredStatus(
          effectiveClient,
          command,
          alignment === "unknown"
            ? "unknown"
            : activation === "enabled" &&
                !packageVersionDrift &&
                alignment === "aligned" &&
                (parsed.dialect !== "dsh" ||
                  dshDocument(parsed.document).ready) &&
                policyBlock === undefined
              ? "aligned"
              : "stale",
          policyBlock ??
            (packageVersionDrift
              ? packageVersionRemediation(packageReference ?? "", client)
              : alignment === "unknown"
                ? unknownEntryPointRemediation()
                : undefined),
          packageReference,
          registrationEnvironment?.ok === true
            ? timeoutAdvisory(
                client,
                registration,
                registrationEnvironment.value.timeoutInputs,
              )
            : undefined,
        ),
        activation,
      );
    } catch (cause: unknown) {
      record(
        unavailableStatus(
          client,
          isMissing(cause) ? "missing" : "invalid",
          selectedConfigPath,
        ),
      );
    }
  }
  return inspections.sort((left, right) =>
    compareUnicodeCodePoints(left.status.client, right.status.client),
  );
};

const registrationActivation = (
  registration: z.output<typeof registrationSchema>,
  client: SetupClient,
  parsed: ClientConfigurationDocument,
): "enabled" | "disabled" =>
  (client.format !== "grok" && registration.disabled === true) ||
  (registration.enabled === false &&
    !clientServerForcedEnabled(parsed, PRODUCT_IDENTITY.mcpServerKey)) ||
  ((parsed.dialect === "zcode" || parsed.dialect === "zcode_fallback") &&
    registration.enable === false) ||
  clientServerListedDisabled(parsed, PRODUCT_IDENTITY.mcpServerKey)
    ? "disabled"
    : "enabled";

const registrationAligned = ({
  registration,
  client,
  currentCommandPath,
  platform,
  kimiInputSchemaProfileSelected,
}: {
  readonly registration: z.output<typeof registrationSchema>;
  readonly client: SetupClient;
  readonly currentCommandPath: string | undefined;
  readonly platform: NodeJS.Platform;
  readonly kimiInputSchemaProfileSelected: boolean;
}): "aligned" | "stale" | "unknown" => {
  const command = [registration.command, ...registration.args];
  const identity = classifyClientRegistrationCommand(
    command,
    currentCommandPath,
  );
  if (identity === "unknown") return "unknown";
  if (identity === "foreign") return "stale";
  if (
    client.name === "grok_build" &&
    registration.startup_timeout_sec !==
      MCP_STARTUP_POLICY.codexStartupTimeoutSeconds
  )
    return "stale";
  if (
    client.name === "codex" &&
    (registration.startup_timeout_sec === undefined ||
      registration.tool_timeout_sec === undefined)
  )
    return "stale";
  if (
    client.name === "kimi" &&
    (registration.startupTimeoutMs === undefined ||
      registration.toolTimeoutMs === undefined)
  )
    return "stale";
  if (client.name === "kimi" && !kimiInputSchemaProfileSelected) return "stale";
  if (
    (client.format === "kimi" ||
      client.format === "omp" ||
      client.format === "pi") &&
    registration.type !== undefined &&
    registration.type !== "stdio"
  )
    return "stale";
  if (client.format === "vscode" && registration.type !== "stdio")
    return "stale";
  // A Harness registration only connects as the rea stdio server; another
  // server name or transport leaves the session without REA tools.
  if (
    client.format === "dsh" &&
    (registration.serverName !== "rea" || registration.transport !== "stdio")
  )
    return "stale";
  if (
    client.format === "copilot_cli" &&
    (registration.type !== "stdio" ||
      JSON.stringify(registration.tools) !== JSON.stringify(["*"]))
  )
    return "stale";
  if (client.format === "commandcode" && registration.transport !== "stdio")
    return "stale";
  if (
    (["npx", "bunx"] as const).some((runner) => {
      const expected = packageRunnerRegistrationCommand(runner, platform);
      return (
        command.length === expected.length &&
        command.every((argument, index) => argument === expected[index])
      );
    })
  )
    return "aligned";
  if (
    currentCommandPath !== undefined &&
    currentCommandPath.length > 0 &&
    command.length === 3 &&
    command[2] === "mcp" &&
    isAbsolute(command[0] ?? "") &&
    isAbsolute(command[1] ?? "") &&
    resolve(command[0] ?? "") === resolve(process.execPath) &&
    resolve(command[1] ?? "") === currentCommandPath
  )
    return "aligned";
  if (
    currentCommandPath !== undefined &&
    currentCommandPath.length > 0 &&
    command.length === 2 &&
    command[1] === "mcp" &&
    isAbsolute(command[0] ?? "") &&
    resolve(command[0] ?? "") === currentCommandPath
  )
    return "aligned";
  return "stale";
};

