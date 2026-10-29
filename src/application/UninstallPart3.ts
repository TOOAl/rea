export const __stub = 1;
//         client.name,
//         "failed",
//         "Configuration could not be backed up, so no change was made. Check file permissions, then rerun uninstall.",
//       );
//   }
//   try {
//     await fileSystem.writeText(
//       transactionPath,
//       serializeClientConfiguration(
//         document,
//         client.format,
//         original,
//         editedPaths,
//       ),
//     );
//     const readback = parseClientConfiguration(
//       await fileSystem.readText(transactionPath),
//       client.format,
//     );
//     if (
//       (removeNative && Object.hasOwn(readback.servers, name)) ||
//       (readback.dialect === "dsh" &&
//         dshDocument(readback.document).carriesEntry) ||
//       (removeLegacy && Object.hasOwn(readback.legacyServers, name))
//     )
//       throw new Error("registration readback mismatch");
//     return item(
//       client.name,
//       "removed",
//       `Removed registration from ${client.configPath}.`,
//     );
//   } catch (cause: unknown) {
//     // Update failure attempts a restore before reporting; cause is preserved below.
//     void cause;
//     try {
//       await fileSystem.writeText(transactionPath, original);
//     } catch (restoreCause: unknown) {
//       void restoreCause;
//       return item(
//         client.name,
//         "failed",
//         "Configuration could not be updated or restored. Restore its `.rea.backup` manually, then rerun uninstall.",
//       );
//     }
//     return item(
//       client.name,
//       "failed",
//       "Configuration could not be updated. The original was restored and its `.rea.backup` was retained. Repair the configuration or restore the backup, then rerun uninstall.",
//     );
//   }
// };
//
// const resolveUninstallConfigPath = async (
//   client: SetupClient,
//   fileSystem: UninstallFileSystem,
// ): Promise<string | UninstallItem> => {
//   const path = await resolveClientConfigTransactionPath(
//     client.configPath,
//     fileSystem.realpath === undefined
//       ? { lstat: fileSystem.stat }
//       : { lstat: fileSystem.stat, realpath: fileSystem.realpath },
//   );
//   return (
//     path ??
//     item(
//       client.name,
//       "failed",
//       "Configuration path could not be safely verified. Check its permissions and, if it is a symbolic link, verify that the link resolves to a regular file owned by the current user, then rerun uninstall.",
//     )
//   );
// };
//
// /** Ownership rule for persistent MCP registrations created by REA setup. */
// const isOwnedRegistration = (value: unknown, client: SetupClient): boolean => {
//   if (client.format === "opencode") {
//     const parsed = z
//       .object({ type: z.literal("local"), command: z.array(z.string()).min(1) })
//       .passthrough()
//       .safeParse(value);
//     if (!parsed.success) return false;
//     const command = parsed.data.command;
//     return isOwnedClientRegistrationCommand(command, CURRENT_ENTRYPOINT_PATH);
//   }
//   const parsed = registrationSchema.safeParse(value);
//   if (!parsed.success) return false;
//   const { command, args } = parsed.data;
//   return isOwnedClientRegistrationCommand(
//     [command, ...args],
//     CURRENT_ENTRYPOINT_PATH,
//   );
// };
//
// const purgeManagedData = async (
//   root: string,
//   fileSystem: UninstallFileSystem,
// ): Promise<readonly UninstallItem[]> => {
//   const names = ["cache", "state"];
//   try {
//     const stats = await fileSystem.stat(root);
//     const linked = stats.isSymbolicLink();
//     if (linked || stats.isDirectory?.() !== true)
//       return names.map((name) =>
//         item(
//           name,
//           "retained",
//           `REA did not remove this item because its managed data root ${root} is ${linked ? "a symbolic link" : "not a directory"}. Verify the root before removing its data manually.`,
//         ),
//       );
//   } catch (cause: unknown) {
//     return names.map((name) =>
//       isMissing(cause)
//         ? item(name, "skipped", `${join(root, name)} does not exist.`)
//         : item(
//             name,
//             "failed",
//             `The managed data root ${root} could not be verified. Check its permissions, then rerun uninstall.`,
//           ),
//     );
//   }
//   const items: UninstallItem[] = [];
//   for (const name of names)
//     items.push(await removeManagedPath(join(root, name), name, fileSystem));
//   return items;
// };
//
// const removeManagedPath = async (
//   path: string,
//   name: string,
//   fileSystem: UninstallFileSystem,
// ): Promise<UninstallItem> => {
//   try {
//     const stats = await fileSystem.stat(path);
//     if (stats.isSymbolicLink())
//       return item(
//         name,
//         "retained",
//         "REA did not remove this item because its managed path is a symbolic link. Verify the link target before removing it manually.",
//       );
//     await fileSystem.remove(path);
//     return item(name, "removed", `Removed ${path}.`);
//   } catch (cause: unknown) {
//     return isMissing(cause)
//       ? item(name, "skipped", `${path} does not exist.`)
//       : item(
//           name,
//           "failed",
//           "This item could not be removed. Check file permissions, then rerun uninstall.",
//         );
//   }
// };
//
// const removeManagedSkills = async (
//   home: string,
//   fileSystem: UninstallFileSystem,
//   environment: Readonly<NodeJS.ProcessEnv>,
//   platform: NodeJS.Platform,
//   writeBlocker?: (path: string) => string | undefined,
// ): Promise<UninstallItem> => {
//   // Every destination shares one summary item; preserve both client and path.
//   const results = await Promise.all(
//     skillDestinations(home, undefined, environment, platform).map(
//       ({ client, path }) =>
//         removeManagedSkill(
//           path,
//           `${client} (${path})`,
//           fileSystem,
//           writeBlocker,
//         ),
//     ),
//   );
//   const failed = results.find(({ status }) => status === "failed");
//   if (failed !== undefined)
//     return item(
//       "skill",
//       "failed",
//       results
//         .map(({ name, status, detail }) => `${name}: ${status} (${detail})`)
//         .join(" "),
//     );
//   const status = results.some(
//     ({ status: resultStatus }) => resultStatus === "removed",
//   )
//     ? "removed"
//     : results.some(({ status: resultStatus }) => resultStatus === "retained")
//       ? "retained"
//       : "skipped";
//   return item(
//     "skill",
//     status,
//     results
//       .map(
//         ({ name, status: resultStatus, detail }) =>
//           `${name}: ${resultStatus} (${detail})`,
//       )
//       .join(" "),
//   );
// };
//
// const inspectManagedSkill = async (
//   path: string,
//   name: string,
//   fileSystem: UninstallFileSystem,
// ): Promise<UninstallItem | undefined> => {
//   let root: ManagedPathStats;
//   try {
//     root = await fileSystem.stat(path);
//   } catch (cause: unknown) {
//     return isMissing(cause)
//       ? item(name, "skipped", "Skill directory does not exist.")
//       : item(name, "failed", "Skill directory could not be inspected.");
//   }
//   if (root.isSymbolicLink())
//     return item(name, "retained", "Skill directory is a symbolic link.");
//   if (root.isDirectory?.() !== true)
//     return item(name, "retained", "Skill path is not a directory.");
//
//   const manifestPath = join(path, "SKILL.md");
//   try {
//     const manifest = await fileSystem.stat(manifestPath);
//     if (manifest.isSymbolicLink())
//       return item(name, "retained", "Skill manifest is a symbolic link.");
//     if (manifest.isFile?.() !== true)
//       return item(name, "retained", "Skill manifest is not a regular file.");
//   } catch (cause: unknown) {
//     return isMissing(cause)
//       ? item(name, "retained", "Skill ownership could not be established.")
//       : item(name, "failed", "Skill manifest could not be inspected.");
//   }
//   let content: string;
//   try {
//     content = await (fileSystem.readRegularText?.(manifestPath) ??
//       fileSystem.readText(manifestPath));
//   } catch (cause: unknown) {
//     return isMissing(cause)
//       ? item(name, "retained", "Skill ownership could not be established.")
//       : item(name, "failed", "Skill manifest could not be read.");
//   }
//   if (!isManagedSkillManifest(content))
//     return item(name, "retained", "Skill manifest is not REA-owned.");
//
//   return undefined;
// };
export const _l = 242;
