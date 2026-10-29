export const __stub = 1;
// import { readClientPolicyBlock } from "./GeminiClientSettings.js";
// import { readEffectiveClientRegistrationConfiguration } from "./ClientConfigurationFiles.js";
// import {
//   clientServerForcedEnabled,
//   clientServerListedDisabled,
//   effectiveClientServer,
//   type ClientConfigurationDocument,
// } from "./ClientConfigurationDocument.js";
// import { access } from "node:fs/promises";
// import { isAbsolute, resolve } from "node:path";
//
// import { z } from "zod";
// import { valid } from "semver";
//
// import { PRODUCT_IDENTITY } from "../identity.js";
// import { CURRENT_ENTRYPOINT_PATH } from "../process/CurrentEntrypointPath.js";
// import {
//   MCP_STARTUP_POLICY,
//   mcpProviderDeadlineAllowanceMs,
//   recommendedMcpToolTimeoutMs,
//   recommendedMcpToolTimeoutSeconds,
//   type McpToolTimeoutInputs,
// } from "../mcpStartupPolicy.js";
// import {
//   clientRegistrationPackageReference,
//   classifyClientRegistrationCommand,
//   packageRunnerRegistrationCommand,
// } from "./ClientRegistrationIdentity.js";
// import {
//   clientEvidencePaths,
//   manualRegistrationRemediation,
//   supportedClients,
// } from "./SupportedClients.js";
// import type { SetupClient } from "./SupportedClients.js";
// import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";
// import { dshDocument } from "./DshCordisPatch.js";
// import { clientRegistrationEnvironmentDetails } from "./ClientRegistrationEnvironment.js";
// import type { ProviderRequestBudgetResolver } from "./ClientRegistrationEnvironment.js";
// import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
//
// interface ClientRegistrationStatusBase {
//   readonly client: string;
//   readonly config_path: string;
//   /** Exact package reference requested by npx/bunx, when registration uses one. */
//   readonly package_reference?: string;
//   /** Non-blocking timeout guidance; caller-selected values remain aligned. */
//   readonly advisory?: string;
// }
//
// type RegistrationCommand = readonly [string, ...string[]];
//
// export type ClientRegistrationStatus = ClientRegistrationStatusBase &
//   (
//     | {
//         readonly command: RegistrationCommand;
//         readonly state: "aligned";
//         readonly remediation: null;
//       }
//     | {
//         readonly command: RegistrationCommand;
//         readonly state: "stale";
//         readonly remediation: string;
//       }
//     | {
//         readonly command: RegistrationCommand;
//         readonly state: "unknown";
//         readonly remediation: string;
//       }
//     | {
//         readonly command: readonly [];
//         readonly state: "missing" | "invalid" | "manual";
//         readonly remediation: string;
//       }
//   );
//
// export type UnhealthyClientRegistrationStatus = Exclude<
//   ClientRegistrationStatus,
//   { readonly state: "aligned" }
// >;
//
// const registrationSchema = z
//   .object({
//     command: z.string().min(1),
//     args: z.array(z.string()).default([]),
//     startup_timeout_sec: z.number().positive().optional(),
//     tool_timeout_sec: z.number().positive().optional(),
//     startupTimeoutMs: z.number().positive().optional(),
//     toolTimeoutMs: z.number().positive().optional(),
//     type: z.string().optional(),
//     transport: z.string().optional(),
//     serverName: z.string().optional(),
//     tools: z.array(z.string()).optional(),
//     disabled: z.boolean().optional(),
//     enabled: z.boolean().optional(),
//   })
//   .passthrough();
//
// interface ClientRegistrationReadOptions {
//   readonly platform?: NodeJS.Platform;
//   readonly environment?: NodeJS.ProcessEnv;
//   readonly resources?: ArtifactResourceScope;
//   readonly resolveProviderRequestBudget?: ProviderRequestBudgetResolver;
// }
//
// /** Registration facts shared by diagnostics and update maintenance. */
// export interface ClientRegistrationInspection {
//   readonly status: ClientRegistrationStatus;
//   readonly activation: "enabled" | "disabled" | "unknown";
// }
//
// /** Project diagnostics from the same inspection used to select maintenance. */
// export const readClientRegistrationStatuses = async (
//   home: string,
//   currentCommandPath: string | undefined = CURRENT_ENTRYPOINT_PATH,
//   options: ClientRegistrationReadOptions = {},
// ): Promise<readonly ClientRegistrationStatus[]> =>
//   (
//     await readClientRegistrationInspections(home, currentCommandPath, options)
//   ).map(({ status }) => status);
//
// /** Parse effective registrations and their client-specific activation once. */
// export const readClientRegistrationInspections = async (
//   home: string,
//   currentCommandPath: string | undefined = CURRENT_ENTRYPOINT_PATH,
//   options: ClientRegistrationReadOptions = {},
// ): Promise<readonly ClientRegistrationInspection[]> => {
//   const inspections: ClientRegistrationInspection[] = [];
//   const record = (
//     status: ClientRegistrationStatus,
//     activation: ClientRegistrationInspection["activation"] = "unknown",
//   ): void => {
//     inspections.push({ status, activation });
//   };
//   for (const client of supportedClients(
//     home,
//     options.platform,
//     options.environment,
//   )) {
//     if (client.configPathError !== undefined) {
//       record({
//         client: client.name,
//         config_path: client.configPath,
//         command: [],
//         state: "invalid",
//         remediation: client.configPathError,
//       });
//       continue;
//     }
//     if (!(await clientEvidencePresent(client))) continue;
//     const manualRemediation = manualRegistrationRemediation(client.name);
export const _l = 150;
