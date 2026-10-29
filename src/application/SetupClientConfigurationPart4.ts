export const __stub = 1;
//   if (
//     client.format !== "zcode" ||
//     (parsed !== undefined && Object.keys(parsed.servers).length > 0)
//   )
//     return ok({});
//   const path = client.zcodeFallbackPath;
//   const detail = `The ZCode fallback configuration ${path ?? "path"} is unresolved, malformed or unreadable. Repair it before rerunning setup: the first native server would suppress that fallback.`;
//   if (path === undefined)
//     return err({ kind: "unreadable", path: client.configPath, detail });
//   const transactionPath = await resolveClientConfigTransactionPath(path);
//   if (transactionPath === undefined)
//     return err({ kind: "unreadable", path, detail });
//   const source = await readConfigurationText(transactionPath);
//   if (!source.ok)
//     return err({ ...source.error, detail: `${detail} ${source.error.detail}` });
//   if (source.value === undefined) return ok({});
//   try {
//     const parsed = parseZcodeFallbackConfiguration(source.value);
//     const environment = clientRegistrationEnvironment(parsed);
//     if (!environment.ok)
//       return err({
//         kind: "malformed",
//         path,
//         detail: `${detail} ${environment.error.settings.map(({ setting, constraint }) => `${setting}: ${constraint}`).join("; ")}`,
//       });
//     return ok(parsed.servers);
//   } catch (cause: unknown) {
//     return err({
//       kind: "malformed",
//       path,
//       detail: `${detail} ${cause instanceof Error ? cause.message : String(cause)}`,
//     });
//   }
// };
//
// const restoreConfig = async (
//   path: string,
//   original: string | undefined,
// ): Promise<
//   Result<
//     void,
//     { readonly kind: "restore"; readonly path: string; readonly detail: string }
//   >
// > => {
//   try {
//     if (original === undefined) await rm(path, { force: true });
//     else await writeFile(path, original, { encoding: "utf8", mode: 0o600 });
//     return ok(undefined);
//   } catch (cause: unknown) {
//     return err({ kind: "restore", path, detail: errorDetail(cause) });
//   }
// };
//
// const rollbackOrReadbackFailure = async (
//   targetPath: string,
//   original: string | undefined,
//   backupPath: string | undefined,
// ): Promise<ClientConfigurationResult> => {
//   const rollback = await restoreConfig(targetPath, original);
//   return rollback.ok
//     ? { status: "failed", reason: "readback" }
//     : {
//         status: "failed",
//         reason: "rollback",
//         ...(backupPath === undefined ? {} : { backupPath }),
//         failure: rollback.error,
//       };
// };
//
// const errorDetail = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
//
// /** Whether REA's entry matches, no legacy entry remains, and no client disable list suppresses it. */
// const registrationCurrent = (
//   parsed: ClientConfigurationDocument,
//   desired: unknown,
// ): boolean =>
//   (parsed.dialect !== "dsh" || dshDocument(parsed.document).ready) &&
//   clientConfigurationValuesEqual(
//     parsed.servers[PRODUCT_IDENTITY.mcpServerKey],
//     desired,
//   ) &&
//   !Object.hasOwn(parsed.legacyServers, PRODUCT_IDENTITY.mcpServerKey) &&
//   !clientServerListedDisabled(parsed, PRODUCT_IDENTITY.mcpServerKey);
//
// const clientConfigurationDesired = (
//   client: SetupClient,
//   providerEnvironment: SetupProviderEnvironment,
//   command: readonly string[],
//   parsed: ClientConfigurationDocument | undefined,
//   sources: readonly ClientConfigurationSource[],
//   resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
// ) => {
//   const effective = effectiveClientConfiguration(sources, {
//     client,
//     document: parsed,
//   });
//   const format = parsed?.dialect ?? client.format ?? "json";
//   const launcher =
//     command.length === 0 ? [PRODUCT_IDENTITY.cliBinary, "mcp"] : command;
//   if (format === "dsh") {
//     const validated = clientRegistrationEnvironment(
//       effective,
//       providerEnvironment,
//     );
//     if (!validated.ok) throw validated.error;
//     const desired = (
//       parsed === undefined
//         ? new DshCordisDocument("")
//         : dshDocument(parsed.document)
//     ).desired(launcher, providerEnvironment);
//     if (!desired.ok) throw desired.error;
//     return desired.value;
//   }
//   const validated = clientRegistrationEnvironmentDetails(
//     effective,
//     providerEnvironment,
//     "effective",
//     client.name === "codex" || client.name === "kimi"
//       ? resolveProviderRequestBudget
//       : undefined,
//   );
//   if (!validated.ok) throw validated.error;
//   // Preserve explicitly configured server settings, never the ambient process
//   // environment. The effective layered view validates precedence and supplies
//   // timeout facts; the target file's fragment remains the value being written.
//   const environment = clientRegistrationEnvironment(
//     parsed,
//     providerEnvironment,
//     "fragment",
//   );
//   if (!environment.ok) throw environment.error;
//   const registrationEnvironment =
//     client.name === "kimi" &&
//     environment.value.REA_MCP_INPUT_SCHEMA_PROFILE === undefined
//       ? {
//           ...environment.value,
//           REA_MCP_INPUT_SCHEMA_PROFILE: "compact",
//         }
//       : environment.value;
//   const registration = clientRegistrationEntry(
//     format,
//     launcher,
//     registrationEnvironment,
//   );
//   const previous = parsed?.servers[PRODUCT_IDENTITY.mcpServerKey];
//   if (
//     client.name === "kimi" &&
//     typeof previous === "object" &&
//     previous !== null &&
//     "enabledTools" in previous
//   )
//     registration.enabledTools = previous.enabledTools;
//   return {
//     ...registration,
//     ...(client.name === "codex" || client.name === "grok_build"
//       ? {
//           startup_timeout_sec:
//             client.name === "codex"
//               ? (positiveTimeout(previous, "startup_timeout_sec") ??
//                 MCP_STARTUP_POLICY.codexStartupTimeoutSeconds)
//               : MCP_STARTUP_POLICY.codexStartupTimeoutSeconds,
//         }
//       : {}),
//     ...(client.name === "codex"
//       ? {
//           tool_timeout_sec:
//             positiveTimeout(previous, "tool_timeout_sec") ??
//             recommendedMcpToolTimeoutSeconds(validated.value.timeoutInputs),
//         }
//       : {}),
//     ...(client.name === "kimi"
//       ? {
//           startupTimeoutMs:
//             positiveTimeout(previous, "startupTimeoutMs") ??
//             MCP_STARTUP_POLICY.kimiStartupTimeoutMs,
//           toolTimeoutMs:
//             positiveTimeout(previous, "toolTimeoutMs") ??
//             recommendedMcpToolTimeoutMs(validated.value.timeoutInputs),
//         }
//       : {}),
//   };
// };
//
// const positiveTimeout = (
//   registration: unknown,
//   key: string,
// ): number | undefined => {
//   if (typeof registration !== "object" || registration === null) return;
//   const value: unknown = Reflect.get(registration, key);
//   return typeof value === "number" && Number.isFinite(value) && value > 0
//     ? value
//     : undefined;
// };
export const _l = 194;
