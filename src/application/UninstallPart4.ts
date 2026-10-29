export const __stub = 1;
//
// const removeManagedSkill = async (
//   path: string,
//   name: string,
//   fileSystem: UninstallFileSystem,
//   writeBlocker?: (path: string) => string | undefined,
// ): Promise<UninstallItem> => {
//   const inspection = await inspectManagedSkill(path, name, fileSystem);
//   if (inspection !== undefined) return inspection;
//   const blocker = writeBlocker?.(path);
//   if (blocker !== undefined) return item(name, "failed", blocker);
//
//   const manifestName = "SKILL.md";
//   const otherFiles = MANAGED_SKILL_FILES.filter(
//     (relativePath) => relativePath !== manifestName,
//   );
//   const results: UninstallItem[] = [];
//   for (const relativePath of otherFiles)
//     results.push(
//       await removeManagedSkillFile(path, relativePath, name, fileSystem),
//     );
//   if (
//     results.some(({ status }) => status === "failed" || status === "retained")
//   )
//     results.push(
//       item(
//         name,
//         "retained",
//         "REA ownership manifest was retained because a managed file could not be safely removed.",
//       ),
//     );
//   else {
//     const manifest = await removeManagedSkillFile(
//       path,
//       manifestName,
//       name,
//       fileSystem,
//     );
//     results.push(manifest);
//     const directories =
//       manifest.status === "removed"
//         ? await removeEmptyManagedDirectories(path, name, fileSystem)
//         : undefined;
//     if (directories !== undefined) results.push(directories);
//   }
//   const failed = results.find(({ status }) => status === "failed");
//   if (failed !== undefined)
//     return item(name, "failed", results.map(({ detail }) => detail).join(" "));
//   if (results.some(({ status }) => status === "retained"))
//     return item(
//       name,
//       "retained",
//       [...new Set(results.map(({ detail }) => detail))].join(" "),
//     );
//   const removed = results.some(({ status }) => status === "removed");
//   return item(
//     name,
//     removed ? "removed" : "skipped",
//     "REA-managed skill files were removed; other files were preserved.",
//   );
// };
//
// /** Directories setup creates for managed files, deepest first, then the root. */
// const MANAGED_SKILL_DIRECTORIES = [
//   ...new Set(
//     MANAGED_SKILL_FILES.map((relativePath) =>
//       relativePath.split("/").slice(0, -1).join("/"),
//     ).filter((directory) => directory.length > 0),
//   ),
// ].sort((left, right) => right.split("/").length - left.split("/").length);
//
// /** Remove managed directories left empty; any remaining user file keeps them. */
// const removeEmptyManagedDirectories = async (
//   root: string,
//   name: string,
//   fileSystem: UninstallFileSystem,
// ): Promise<UninstallItem | undefined> => {
//   if (fileSystem.removeEmptyDirectory === undefined) return undefined;
//   for (const directory of [
//     ...MANAGED_SKILL_DIRECTORIES.map((relative) => join(root, relative)),
//     root,
//   ]) {
//     try {
//       await fileSystem.removeEmptyDirectory(directory);
//     } catch (cause: unknown) {
//       // User files, an absent directory, or a non-directory keep it as is.
//       if (!isKeptDirectory(cause))
//         return item(
//           name,
//           "failed",
//           `Managed skill directory could not be removed: ${directory}.`,
//         );
//     }
//   }
//   return undefined;
// };
//
// const isKeptDirectory = (cause: unknown): boolean =>
//   cause instanceof Error &&
//   "code" in cause &&
//   ["ENOTEMPTY", "EEXIST", "ENOENT", "ENOTDIR"].includes(String(cause.code));
//
// const removeManagedSkillFile = async (
//   root: string,
//   relativePath: string,
//   name: string,
//   fileSystem: UninstallFileSystem,
// ): Promise<UninstallItem> => {
//   const segments = relativePath.split(/[\\/]/u);
//   let parent = root;
//   for (const segment of segments.slice(0, -1)) {
//     parent = join(parent, segment);
//     try {
//       const stats = await fileSystem.stat(parent);
//       if (stats.isSymbolicLink() || stats.isDirectory?.() !== true)
//         return item(
//           name,
//           "retained",
//           `Managed path parent was retained: ${parent}.`,
//         );
//     } catch (cause: unknown) {
//       return isMissing(cause)
//         ? item(
//             name,
//             "skipped",
//             `${join(parent, segments.at(-1) ?? "")} does not exist.`,
//           )
//         : item(
//             name,
//             "failed",
//             `Managed path parent could not be inspected: ${parent}.`,
//           );
//     }
//   }
//
//   const target = join(root, relativePath);
//   let stats: ManagedPathStats;
//   try {
//     stats = await fileSystem.stat(target);
//   } catch (cause: unknown) {
//     return isMissing(cause)
//       ? item(name, "skipped", `${target} does not exist.`)
//       : item(name, "failed", `Managed file could not be inspected: ${target}.`);
//   }
//   if (stats.isSymbolicLink())
//     return item(
//       name,
//       "retained",
//       `Managed file is a symbolic link: ${target}.`,
//     );
//   if (stats.isFile?.() !== true)
//     return item(
//       name,
//       "retained",
//       `Managed path is not a regular file: ${target}.`,
//     );
//   try {
//     await fileSystem.remove(target, false);
//     return item(name, "removed", `Removed ${target}.`);
//   } catch (cause: unknown) {
//     return isMissing(cause)
//       ? item(name, "skipped", `${target} does not exist.`)
//       : item(name, "failed", `Managed file could not be removed: ${target}.`);
//   }
// };
//
// const item = (
//   name: string,
//   status: UninstallItem["status"],
//   detail: string,
// ): UninstallItem => ({ name, status, detail });
//
// /**
//  * Layered clients are removed file by file, but callers look up one status by
//  * client name. A missing earlier file must not hide a later removal.
//  */
// const collapseUninstallItems = (
//   items: readonly UninstallItem[],
// ): UninstallItem[] => {
//   const collapsed: UninstallItem[] = [];
//   for (const next of items) {
//     const index = collapsed.findIndex(({ name }) => name === next.name);
//     const current = collapsed[index];
//     if (current === undefined) {
//       collapsed.push(next);
//       continue;
//     }
//     collapsed[index] = mergeUninstallItems(current, next);
//   }
//   return collapsed;
// };
//
// const mergeUninstallItems = (
//   current: UninstallItem,
//   next: UninstallItem,
// ): UninstallItem => {
//   const status = preferredUninstallStatus(current.status, next.status);
//   const details = [current, next]
//     .filter(
//       (entry) =>
//         entry.status === status ||
//         (status === "removed" && entry.status === "retained"),
//     )
//     .map(({ detail }) => detail);
//   return item(current.name, status, [...new Set(details)].join(" "));
// };
//
// const preferredUninstallStatus = (
//   current: UninstallItem["status"],
//   next: UninstallItem["status"],
// ): UninstallItem["status"] =>
//   uninstallStatusPriority(next) > uninstallStatusPriority(current)
//     ? next
//     : current;
//
// const uninstallStatusPriority = (status: UninstallItem["status"]): number => {
//   switch (status) {
//     case "failed":
//       return 3;
//     case "removed":
//       return 2;
//     case "retained":
//       return 1;
//     case "skipped":
//       return 0;
//     default: {
//       const exhaustive: never = status;
//       throw new TypeError(
//         `Unhandled uninstall item status: ${String(exhaustive)}`,
//       );
//     }
//   }
// };
// const registrationSchema = z
//   .object({ command: z.string(), args: z.array(z.string()) })
//   .passthrough();
// const isMissing = (cause: unknown): boolean =>
//   cause instanceof Error && "code" in cause && cause.code === "ENOENT";
export const _l = 238;
