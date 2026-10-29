export const __stub = 1;
//       args,
//     });
//   }
//   const registration = registrationSchema.parse(value);
//   if (
//     client.format === "kimi" &&
//     registration.transport !== undefined &&
//     registration.transport !== "stdio"
//   )
//     throw new TypeError("Expected an stdio registration");
//   if (
//     (client.format === "vscode" || client.format === "copilot_cli") &&
//     registration.type !== "stdio"
//   )
//     throw new TypeError("Expected an stdio registration");
//   if (client.format === "commandcode" && registration.transport !== "stdio")
//     throw new TypeError("Expected an stdio registration");
//   if (
//     (client.format === "kimi" ||
//       client.format === "omp" ||
//       client.format === "pi") &&
//     registration.type !== undefined &&
//     registration.type !== "stdio"
//   )
//     throw new TypeError("Expected an stdio registration");
//   return registration;
// };
//
// /** A client that rewrites its file from memory must be quit before setup. */
// const remediation = (client: SetupClient): string => {
//   if (client.quitBeforeSetup !== true)
//     return "Run rea setup to refresh this registration, then restart the client.";
//   const name = client.displayName ?? client.name;
//   return `Quit ${name} fully, run rea setup to refresh this registration, then start ${name} again. A running ${name} can rewrite its configuration from memory and drop the registration.`;
// };
//
// const unknownEntryPointRemediation = (): string =>
//   "The existing registration was retained because its executable identity cannot be verified. Run the installed REA CLI or a supported package runner, then rerun rea doctor; no registration was changed.";
//
// const configuredStatus = (
//   client: SetupClient,
//   command: RegistrationCommand,
//   state: "aligned" | "stale" | "unknown",
//   policyRemediation?: string,
//   packageReference?: string,
//   advisory?: string,
// ): ClientRegistrationStatus =>
//   state === "aligned"
//     ? {
//         client: client.name,
//         config_path: client.configPath,
//         command,
//         ...(packageReference === undefined
//           ? {}
//           : { package_reference: packageReference }),
//         state,
//         remediation: null,
//         ...(advisory === undefined ? {} : { advisory }),
//       }
//     : {
//         client: client.name,
//         config_path: client.configPath,
//         command,
//         ...(packageReference === undefined
//           ? {}
//           : { package_reference: packageReference }),
//         state,
//         remediation: policyRemediation ?? remediation(client),
//       };
//
// const timeoutAdvisory = (
//   client: SetupClient,
//   registration: z.output<typeof registrationSchema>,
//   timeoutInputs: McpToolTimeoutInputs,
// ): string | undefined => {
//   const toolTimeout =
//     client.name === "kimi"
//       ? registration.toolTimeoutMs
//       : client.name === "codex"
//         ? registration.tool_timeout_sec
//         : undefined;
//   if (toolTimeout === undefined) return undefined;
//   const providerAllowance = mcpProviderDeadlineAllowanceMs(timeoutInputs);
//   const isKimi = client.name === "kimi";
//   const toolTimeoutMs = isKimi ? toolTimeout : toolTimeout * 1000;
//   if (toolTimeoutMs >= providerAllowance) return undefined;
//   const setting = isKimi ? "toolTimeoutMs" : "tool_timeout_sec";
//   const currentValue = isKimi
//     ? `${String(toolTimeout)} ms`
//     : `${String(toolTimeout)} seconds`;
//   const recommendedValue = isKimi
//     ? `${String(recommendedMcpToolTimeoutMs(timeoutInputs))} ms`
//     : `${String(recommendedMcpToolTimeoutSeconds(timeoutInputs))} seconds`;
//   const headroom = isKimi
//     ? `${String(MCP_STARTUP_POLICY.toolOperationHeadroomMs)} ms`
//     : `${String(MCP_STARTUP_POLICY.toolOperationHeadroomMs / 1000)} seconds`;
//   return `The configured ${setting} (${currentValue}) is shorter than REA's known provider allowance (${String(providerAllowance)} ms), so provider startup or an upstream request may exceed this client deadline. REA recommends ${setting} = ${recommendedValue} to cover that allowance plus ${headroom} of operation headroom; this additional headroom is a recommendation, not a guarantee for every analysis.`;
// };
//
// const exactRegisteredPackageVersion = (
//   packageReference: string | undefined,
// ): string | undefined => {
//   if (packageReference === undefined) return undefined;
//   const prefix = `${PRODUCT_IDENTITY.packageName}@`;
//   if (!packageReference.startsWith(prefix)) return undefined;
//   const version = packageReference.slice(prefix.length);
//   return valid(version) === version ? version : undefined;
// };
//
// const packageVersionRemediation = (
//   packageReference: string,
//   client: SetupClient,
// ): string =>
//   `This registration requests ${packageReference}, while the current REA CLI package is ${PRODUCT_IDENTITY.packageVersion}. REA does not resolve package-runner requests during doctor; update the registration with rea setup --client ${client.name}, then restart the client.`;
//
// const unavailableStatus = (
//   client: SetupClient,
//   state: "missing" | "invalid",
//   configPath: string = client.configPath,
// ): ClientRegistrationStatus => ({
//   client: client.name,
//   config_path: configPath,
//   command: [],
//   state,
//   remediation: remediation(client),
// });
//
// const clientEvidencePresent = async (client: SetupClient): Promise<boolean> => {
//   for (const path of clientEvidencePaths(client))
//     if (await exists(path)) return true;
//   return false;
// };
//
// const exists = async (path: string | undefined): Promise<boolean> => {
//   if (path === undefined) return false;
//   try {
//     await access(path);
//     return true;
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional registration probing; absence means unregistered.
//     void cause;
//     return false;
//   }
// };
//
// const isMissing = (cause: unknown): boolean =>
//   cause instanceof Error && "code" in cause && cause.code === "ENOENT";
export const _l = 147;
