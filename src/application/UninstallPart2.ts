export const __stub = 1;
//                 {
//                   ...client,
//                   configPath: client.zcodeFallbackPath,
//                   format: "zcode_fallback" as const,
//                 },
//               ]),
//         ]),
//       );
//     },
//     inspectClient: async (client) => {
//       const read = await readClientConfiguration(client, fileSystem);
//       if (read.kind === "item")
//         return read.item.status === "failed" ? read.item : undefined;
//       const removal = clientRegistrationRemoval(read.parsed, client);
//       if (!removal.removeNative && removal.legacyPath === undefined)
//         return undefined;
//       // A removal the running package would revert, or redirect into its
//       // private storage, would leave the registration in place.
//       const blocker = clientWriteBlocker(client);
//       return blocker === undefined
//         ? undefined
//         : item(client.name, "failed", blocker);
//     },
//     removeClient: (client) =>
//       removeClient(client, fileSystem, () => clientWriteBlocker(client)),
//     inspectSkill: async () => {
//       for (const destination of skillDestinations(
//         home,
//         undefined,
//         environment,
//         platform,
//       )) {
//         const inspected = await inspectManagedSkill(
//           destination.path,
//           destination.client,
//           fileSystem,
//         );
//         if (inspected?.status === "failed") return inspected;
//         if (inspected !== undefined) continue;
//         const blocker = skillWriteBlocker(destination.path);
//         if (blocker !== undefined) return item("skill", "failed", blocker);
//       }
//       return undefined;
//     },
//     removeSkill: () =>
//       removeManagedSkills(
//         home,
//         fileSystem,
//         environment,
//         platform,
//         skillWriteBlocker,
//       ),
//     purgeData: () => purgeManagedData(join(home, ".rea"), fileSystem),
//     close: async () => {
//       try {
//         await resources.close();
//         return undefined;
//       } catch (cause: unknown) {
//         return `Uninstall resource cleanup failed: ${cause instanceof Error ? cause.message : String(cause)}`;
//       }
//     },
//   };
// };
//
// /**
//  * Every user file that can hold REA's registration for one client. An MSIX
//  * package can read either its private copy or the AppData file, and earlier
//  * setups wrote the AppData file, so both lose REA's entry.
//  */
// const uninstallConfigPaths = (client: SetupClient): readonly string[] => [
//   ...new Set([
//     ...(client.configPaths ?? [client.configPath]),
//     ...(client.msixPackage === undefined
//       ? []
//       : [
//           client.msixPackage.privateConfigPath,
//           client.msixPackage.appDataConfigPath,
//         ]),
//   ]),
// ];
//
// /** Whether removal would change this configuration. */
// const registrationPresent = (parsed: ClientConfigurationDocument): boolean => {
//   const name = PRODUCT_IDENTITY.mcpServerKey;
//   return (
//     Object.hasOwn(parsed.servers, name) ||
//     // Beside a native OpenCode V2 table, OpenCode also loads a V1 `mcp.rea`.
//     legacyClientServerPath(parsed, name) !== undefined ||
//     // Harness ownership is the stable entry id. A stale or malformed launcher
//     // still belongs to that id, and so does a direct patch that projects no row.
//     (parsed.dialect === "dsh" && dshDocument(parsed.document).carriesEntry)
//   );
// };
//
// type ClientConfigurationRead =
//   | { readonly kind: "item"; readonly item: UninstallItem }
//   | {
//       readonly kind: "configuration";
//       readonly transactionPath: string;
//       readonly original: string;
//       readonly parsed: ClientConfigurationDocument;
//     };
//
// const readClientConfiguration = async (
//   client: SetupClient,
//   fileSystem: UninstallFileSystem,
// ): Promise<ClientConfigurationRead> => {
//   if (client.configPathError !== undefined)
//     return itemRead(item(client.name, "failed", client.configPathError));
//   if (client.format === "unsupported")
//     return itemRead(
//       item(
//         client.name,
//         "skipped",
//         manualRegistrationRemediation(client.name) ??
//           "This client has no documented local MCP configuration boundary.",
//       ),
//     );
//   const resolved = await resolveUninstallConfigPath(client, fileSystem);
//   if (typeof resolved !== "string") return itemRead(resolved);
//   const transactionPath = resolved;
//   let original: string;
//   try {
//     original = await fileSystem.readText(transactionPath);
//   } catch (cause: unknown) {
//     const readFailure =
//       cause instanceof RegularFileCleanupFailure ? cause.cause : cause;
//     return itemRead(
//       isMissing(cause)
//         ? item(client.name, "skipped", "Configuration does not exist.")
//         : item(
//             client.name,
//             "failed",
//             readFailure instanceof InvalidUtf8FileError
//               ? "Configuration is not valid UTF-8 and was not changed. Repair it, then rerun uninstall."
//               : "Configuration could not be read. Check file permissions, then rerun uninstall.",
//           ),
//     );
//   }
//   try {
//     const parsed = parseClientConfiguration(original, client.format);
//     return { kind: "configuration", transactionPath, original, parsed };
//   } catch (cause: unknown) {
//     return itemRead(
//       item(
//         client.name,
//         "failed",
//         cause instanceof ClientConfigurationShapeError
//           ? `Configuration was not changed: ${cause.message}. Repair it, then rerun uninstall.`
//           : `Configuration is not valid ${client.format === "toml" || client.format === "grok" ? "TOML" : client.format === "opencode" ? "JSONC" : client.format === "hermes" || client.format === "dsh" ? "YAML" : "JSON"} and was not changed. Repair it, then rerun uninstall.`,
//       ),
//     );
//   }
// };
//
// const itemRead = (result: UninstallItem): ClientConfigurationRead => ({
//   kind: "item",
//   item: result,
// });
//
// /**
//  * Share the exact ownership and applicability decision with preflight. A
//  * removable legacy entry carries its document path, so removal edits exactly
//  * the entry this decision admitted.
//  */
// const clientRegistrationRemoval = (
//   parsed: ClientConfigurationDocument,
//   client: SetupClient,
// ): {
//   readonly removeNative: boolean;
//   readonly legacyPath: readonly string[] | undefined;
// } => {
//   const name = PRODUCT_IDENTITY.mcpServerKey;
//   if (
//     parsed.dialect === "dsh" &&
//     dshDocument(parsed.document).hasUnknownStructure
//   )
//     return { removeNative: false, legacyPath: undefined };
//   const legacyPath = legacyClientServerPath(parsed, name);
//   return {
//     removeNative:
//       (parsed.dialect === "dsh" && dshDocument(parsed.document).carriesEntry) ||
//       (Object.hasOwn(parsed.servers, name) &&
//         isOwnedRegistration(parsed.servers[name], client)),
//     legacyPath:
//       legacyPath !== undefined &&
//       isOwnedRegistration(parsed.legacyServers[name], client)
//         ? legacyPath
//         : undefined,
//   };
// };
//
// const removeClient = async (
//   client: SetupClient,
//   fileSystem: UninstallFileSystem,
//   writeBlocker?: () => string | undefined,
// ): Promise<UninstallItem> => {
//   const read = await readClientConfiguration(client, fileSystem);
//   if (read.kind === "item") return read.item;
//   const { transactionPath, original, parsed } = read;
//   const name = PRODUCT_IDENTITY.mcpServerKey;
//   if (
//     parsed.dialect === "dsh" &&
//     dshDocument(parsed.document).hasUnknownStructure
//   )
//     return item(
//       client.name,
//       "retained",
//       "A Cordis expression may produce registration rows, so the patch was retained without changes.",
//     );
//   if (!registrationPresent(parsed))
//     return item(client.name, "skipped", "REA registration is absent.");
//   const { removeNative, legacyPath } = clientRegistrationRemoval(
//     parsed,
//     client,
//   );
//   const removeLegacy = legacyPath !== undefined;
//   if (!removeNative && !removeLegacy)
//     return item(
//       client.name,
//       "retained",
//       "The rea-named registration is not REA-owned.",
//     );
//   const blocker = writeBlocker?.();
//   if (blocker !== undefined) return item(client.name, "failed", blocker);
//   const remaining = { ...parsed.servers };
//   if (removeNative) delete remaining[name];
//   const document = withClientServers(
//     parsed,
//     remaining,
//     removeLegacy ? name : undefined,
//   );
//   const editedPaths = [
//     ...(removeNative ? [clientServerPath(parsed, name)] : []),
//     ...(legacyPath === undefined ? [] : [legacyPath]),
//   ];
//   const backupPath = `${client.configPath}.rea.backup`;
//   try {
//     await fileSystem.copy(transactionPath, backupPath);
//   } catch (cause: unknown) {
//     if (!(cause instanceof Error && "code" in cause && cause.code === "EEXIST"))
//       return item(
export const _l = 242;
