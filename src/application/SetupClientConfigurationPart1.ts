export const __stub = 1;
// import { readClientPolicyBlock } from "./GeminiClientSettings.js";
// import {
//   readClientConfigurationFiles,
//   effectiveClientConfiguration,
//   readConfigurationText,
//   type ClientConfigurationSource,
// } from "./ClientConfigurationFiles.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { ConfigurationError } from "../domain/configurationErrors.js";
// import {
//   clientRegistrationEntry,
//   clientConfigurationValuesEqual,
//   clientServerListedDisabled,
//   clientServerPath,
//   legacyClientServerPath,
//   OMP_DISABLED_SERVERS_KEY,
//   parseClientConfiguration,
//   parseZcodeFallbackConfiguration,
//   serializeClientConfiguration,
//   withClientServers,
//   type ClientConfigurationDocument,
// } from "./ClientConfigurationDocument.js";
// import { dshDocument, DshCordisDocument } from "./DshCordisPatch.js";
// import { mkdir, rm, writeFile } from "node:fs/promises";
// import { dirname } from "node:path";
// import writeFileAtomic from "write-file-atomic";
// import {
//   clientRegistrationEnvironment,
//   clientRegistrationEnvironmentDetails,
//   type ProviderRequestBudgetResolver,
// } from "./ClientRegistrationEnvironment.js";
//
// import { PRODUCT_IDENTITY } from "../identity.js";
// import { npxRegistrationCommand } from "./ClientRegistrationIdentity.js";
// import {
//   MCP_STARTUP_POLICY,
//   recommendedMcpToolTimeoutMs,
//   recommendedMcpToolTimeoutSeconds,
// } from "../mcpStartupPolicy.js";
// import { resolveClientConfigTransactionPath } from "./ClientConfigPath.js";
// import { packageReadTargetChanged } from "./MsixPackageStorage.js";
// import {
//   readRegularFileText,
//   RegularFileCleanupFailure,
// } from "./RegularFileRead.js";
// import {
//   preserveRecoveryBackup,
//   selectCurrentRecoveryBackup,
// } from "./SetupRecoveryBackup.js";
// import type { ClientConfigurationFileError } from "./ClientConfigurationFiles.js";
// import type {
//   ClientConfigurationInspection,
//   ClientConfigurationResult,
//   SetupProviderEnvironment,
// } from "./SetupTypes.js";
// import {
//   registrationWriteBlocker,
//   type SetupClient,
// } from "./SupportedClients.js";
//
// export class ClientConfigurationCleanupRollbackFailure extends RegularFileCleanupFailure<string> {
//   constructor(
//     failure: RegularFileCleanupFailure<string>,
//     readonly configurationFailure: Extract<
//       ClientConfigurationResult,
//       { readonly status: "failed"; readonly reason: "rollback" }
//     >,
//   ) {
//     super(
//       failure.path,
//       failure.owner,
//       failure.outcome,
//       new AggregateError(
//         [failure.cleanupCause, new Error(configurationFailure.failure.detail)],
//         `Configuration readback cleanup and rollback failed: ${configurationFailure.failure.path}`,
//       ),
//     );
//   }
// }
//
// /** Configure one supported client's native stdio MCP registration shape. */
// export const configureClientConfiguration = (
//   client: SetupClient,
//   environment: SetupProviderEnvironment = {},
//   command: readonly string[] = npxRegistrationCommand(),
//   resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
// ): Promise<ClientConfigurationResult> => {
//   if (client.configPathError !== undefined)
//     return Promise.resolve({ status: "failed", reason: "path" });
//   return configureClientDocument(
//     client,
//     environment,
//     command,
//     resolveProviderRequestBudget,
//   );
// };
//
// const configureClientDocument = async (
//   client: SetupClient,
//   environment: SetupProviderEnvironment,
//   command: readonly string[],
//   resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
// ): Promise<ClientConfigurationResult> => {
//   const format = client.format;
//   if (format === undefined || format === "unsupported")
//     return { status: "failed", reason: "readback" };
//   const files = await readClientConfigurationFiles(client);
//   if (!files.ok) {
//     throwCleanupFailure(files.error);
//     return { status: "failed", reason: "readback" };
//   }
//   const existing = files.value.find(
//     ({ sourcePath }) => sourcePath === client.configPath,
//   );
//   const editabilityError =
//     existing?.dialect === "dsh"
//       ? dshDocument(existing.document).editabilityError
//       : undefined;
//   if (editabilityError !== undefined)
//     return { status: "failed", reason: "readback" };
//   const policy = await readClientPolicyBlock(
//     client,
//     undefined,
//     clientConfigurationDesired(
//       client,
//       environment,
//       command,
//       existing,
//       files.value,
//       resolveProviderRequestBudget,
//     ),
//   );
//   if (!policy.ok) {
//     throwCleanupFailure(policy.error);
//     return { status: "failed", reason: "readback" };
//   }
//   if (policy.value !== undefined)
//     return { status: "failed", reason: "readback" };
//   const transactionPath = await resolveClientConfigTransactionPath(
//     client.configPath,
//   );
//   if (transactionPath === undefined)
//     return { status: "failed", reason: "path" };
//   let original: string | undefined;
//   try {
//     original = await readRegularFileText(transactionPath);
//   } catch (cause: unknown) {
//     if (cause instanceof RegularFileCleanupFailure) throw cause;
//     if (!isMissing(cause)) return { status: "failed", reason: "readback" };
//   }
//   let parsed: ClientConfigurationDocument;
//   try {
//     parsed = parseClientConfiguration(
//       original ??
//         (format === "toml" || format === "grok" || format === "dsh"
//           ? ""
//           : "{}"),
//       format,
//     );
//     const policy = await readClientPolicyBlock(
//       client,
//       parsed,
//       clientConfigurationDesired(
//         client,
//         environment,
//         command,
//         parsed,
//         files.value,
//         resolveProviderRequestBudget,
//       ),
//     );
//     if (!policy.ok) {
//       throwCleanupFailure(policy.error);
//       return { status: "failed", reason: "readback" };
//     }
//     if (policy.value !== undefined)
//       return { status: "failed", reason: "readback" };
//   } catch (cause: unknown) {
//     if (cause instanceof RegularFileCleanupFailure) throw cause;
//     // Malformed existing configuration fails the readback gate.
//     void cause;
//     return { status: "failed", reason: "readback" };
//   }
//   const fallback = await readZcodeFallbackServers(client, parsed);
//   if (!fallback.ok) {
//     throwCleanupFailure(fallback.error);
//     return { status: "failed", reason: "readback" };
//   }
//   const desired = clientConfigurationDesired(
//     client,
//     environment,
//     command,
//     {
//       ...parsed,
//       servers: { ...fallback.value, ...parsed.servers },
//     },
//     files.value,
//     resolveProviderRequestBudget,
export const _l = 198;
