export const __stub = 1;
//       registrationCurrent(
//         parsed,
//         clientConfigurationDesired(
//           client,
//           providerEnvironment,
//           command,
//           parsed,
//           files.value,
//           resolveProviderRequestBudget,
//         ),
//       )
//     );
//   } catch (cause: unknown) {
//     if (cause instanceof RegularFileCleanupFailure) throw cause;
//     // Unreadable configuration is treated as not aligned so setup repairs it.
//     void cause;
//     return false;
//   }
// };
//
// /** Preflight one client configuration before setup presents any mutations. */
// export const inspectClientConfiguration = async (
//   client: SetupClient,
//   providerEnvironment: SetupProviderEnvironment,
//   command: readonly string[],
//   resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
// ): Promise<ClientConfigurationInspection> => {
//   const inspection = await inspectClientDocument(
//     client,
//     providerEnvironment,
//     command,
//     resolveProviderRequestBudget,
//   );
//   if (inspection.status !== "create" && inspection.status !== "update")
//     return inspection;
//   // A change the running client would overwrite is not a persisted registration.
//   const blocker = registrationWriteBlocker(client, "setup");
//   return blocker === undefined
//     ? inspection
//     : { status: "invalid", remediation: blocker };
// };
//
// const inspectClientDocument = async (
//   client: SetupClient,
//   providerEnvironment: SetupProviderEnvironment,
//   command: readonly string[],
//   resolveProviderRequestBudget?: ProviderRequestBudgetResolver,
// ): Promise<ClientConfigurationInspection> => {
//   if (client.configPathError !== undefined)
//     return { status: "invalid", remediation: client.configPathError };
//   if (client.format === "unsupported") return { status: "already_current" };
//   const files = await readClientConfigurationFiles(client);
//   if (!files.ok) {
//     throwCleanupFailure(files.error);
//     return {
//       status: "invalid",
//       remediation: files.error.detail,
//     };
//   }
//   const existing = files.value.find(
//     ({ sourcePath }) => sourcePath === client.configPath,
//   );
//   const editabilityError =
//     existing?.dialect === "dsh"
//       ? dshDocument(existing.document).editabilityError
//       : undefined;
//   if (editabilityError !== undefined)
//     return {
//       status: "invalid",
//       remediation: editabilityError.message,
//     };
//   const policy = await readClientPolicyBlock(
//     client,
//     undefined,
//     clientConfigurationDesired(
//       client,
//       providerEnvironment,
//       command,
//       existing,
//       files.value,
//       resolveProviderRequestBudget,
//     ),
//   );
//   if (!policy.ok) {
//     throwCleanupFailure(policy.error);
//     return {
//       status: "invalid",
//       remediation: policy.error.detail,
//     };
//   }
//   if (policy.value !== undefined)
//     return { status: "invalid", remediation: policy.value };
//   const transactionPath = await resolveClientConfigTransactionPath(
//     client.configPath,
//   );
//   if (transactionPath === undefined)
//     return {
//       status: "invalid",
//       remediation:
//         "The configuration path is unsafe or unresolved. Check ownership and symbolic links before rerunning setup.",
//     };
//   let original: string;
//   try {
//     original = await readRegularFileText(transactionPath);
//   } catch (cause: unknown) {
//     if (cause instanceof RegularFileCleanupFailure) throw cause;
//     if (isMissing(cause)) {
//       const fallback = await readZcodeFallbackServers(client);
//       if (!fallback.ok) {
//         throwCleanupFailure(fallback.error);
//         return { status: "invalid", remediation: fallback.error.detail };
//       }
//       return { status: "create" };
//     }
//     return {
//       status: "invalid",
//       remediation: `The configuration file could not be read. Check its permissions before rerunning setup. ${cause instanceof Error ? cause.message : String(cause)}`,
//     };
//   }
//   try {
//     const parsed = parseClientConfiguration(original, client.format);
//     const policy = await readClientPolicyBlock(
//       client,
//       parsed,
//       clientConfigurationDesired(
//         client,
//         providerEnvironment,
//         command,
//         parsed,
//         files.value,
//         resolveProviderRequestBudget,
//       ),
//     );
//     if (!policy.ok) {
//       throwCleanupFailure(policy.error);
//       return {
//         status: "invalid",
//         remediation: policy.error.detail,
//       };
//     }
//     if (policy.value !== undefined)
//       return { status: "invalid", remediation: policy.value };
//     const desired = clientConfigurationDesired(
//       client,
//       providerEnvironment,
//       command,
//       parsed,
//       files.value,
//       resolveProviderRequestBudget,
//     );
//     if (registrationCurrent(parsed, desired))
//       return { status: "already_current" };
//     const fallback = await readZcodeFallbackServers(client, parsed);
//     if (!fallback.ok) {
//       throwCleanupFailure(fallback.error);
//       return { status: "invalid", remediation: fallback.error.detail };
//     }
//   } catch (cause: unknown) {
//     if (cause instanceof RegularFileCleanupFailure) throw cause;
//     if (cause instanceof ConfigurationError)
//       return { status: "invalid", remediation: cause.message };
//     // Malformed configuration is reported with the invalid remediation.
//     void cause;
//     return {
//       status: "invalid",
//       remediation:
//         "The existing configuration is malformed. Repair it before setup applies any other changes.",
//     };
//   }
//   const backupSelection = await selectCurrentRecoveryBackup(
//     `${client.configPath}.rea.backup`,
//     original,
//   );
//   if (!backupSelection.ok)
//     return {
//       status: "invalid",
//       remediation: backupSelection.error.detail,
//     };
//   return {
//     status: "update",
//     backupPath: backupSelection.value.backupPath,
//   };
// };
//
// const isMissing = (cause: unknown): boolean =>
//   cause instanceof Error && "code" in cause && cause.code === "ENOENT";
//
// const throwCleanupFailure = (error: ClientConfigurationFileError): void => {
//   if (error.cleanupFailure !== undefined) throw error.cleanupFailure;
// };
//
// /** Admit the fallback only when the first native ZCode server would suppress it. */
// const readZcodeFallbackServers = async (
//   client: SetupClient,
//   parsed?: ClientConfigurationDocument,
// ): Promise<
//   Result<Readonly<Record<string, unknown>>, ClientConfigurationFileError>
// > => {
export const _l = 198;
