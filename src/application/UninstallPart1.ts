export const __stub = 1;
// import {
//   ClientConfigurationShapeError,
//   parseClientConfiguration,
//   serializeClientConfiguration,
//   clientServerPath,
//   legacyClientServerPath,
//   withClientServers,
//   type ClientConfigurationDocument,
// } from "./ClientConfigurationDocument.js";
// import { copyFile, lstat, realpath, rm, rmdir } from "node:fs/promises";
// import { constants as fsConstants } from "node:fs";
// import { homeDirectoryFromEnvironment } from "../config/homeDirectory.js";
// import { join } from "node:path";
//
// import writeFileAtomic from "write-file-atomic";
// import { z } from "zod";
//
// import { PRODUCT_IDENTITY } from "../identity.js";
// import {
//   isManagedSkillManifest,
//   MANAGED_SKILL_FILES,
//   readSkillFile,
//   skillDestinations,
// } from "./SetupSkill.js";
// import { isOwnedClientRegistrationCommand } from "./ClientRegistrationIdentity.js";
// import { CURRENT_ENTRYPOINT_PATH } from "../process/CurrentEntrypointPath.js";
// import { dshDocument } from "./DshCordisPatch.js";
// import { resolveClientConfigTransactionPath } from "./ClientConfigPath.js";
// import {
//   InvalidUtf8FileError,
//   RegularFileCleanupFailure,
//   readRegularFileText,
// } from "./RegularFileRead.js";
// import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
// import {
//   appDataRedirection,
//   manualRegistrationRemediation,
//   registrationWriteBlocker,
//   supportedClients,
//   type SetupClient,
// } from "./SupportedClients.js";
// import {
//   redirectedWriteBlocker,
//   type MsixPackageView,
// } from "./MsixPackageStorage.js";
// export { isUninstallFailure } from "./UninstallFailure.js";
//
// interface ManagedPathStats {
//   readonly uid?: number;
//   isFile?(): boolean;
//   isDirectory?(): boolean;
//   isSymbolicLink(): boolean;
// }
//
// /** Injectable filesystem operations used to prove uninstall failure recovery. */
// export interface UninstallFileSystem {
//   readText(path: string): Promise<string>;
//   readRegularText?(path: string): Promise<string>;
//   /** Preserve the first backup; reject an existing destination with EEXIST. */
//   copy(source: string, destination: string): Promise<void>;
//   writeText(path: string, contents: string): Promise<void>;
//   stat(path: string): Promise<ManagedPathStats>;
//   realpath?(path: string): Promise<string>;
//   remove(path: string, recursive?: boolean): Promise<void>;
//   /** Remove a directory only if it is empty; a non-empty one is kept. */
//   removeEmptyDirectory?(path: string): Promise<void>;
// }
//
// const systemFileSystem = (
//   resources: ArtifactResourceScope,
// ): UninstallFileSystem => ({
//   readText: (path) => readRegularFileText(path, { resources }),
//   readRegularText: (path) => readSkillFile(path, resources),
//   copy: (source, destination) =>
//     copyFile(source, destination, fsConstants.COPYFILE_EXCL),
//   writeText: (path, contents) =>
//     writeFileAtomic(path, contents, { encoding: "utf8" }),
//   stat: (path) => lstat(path),
//   realpath: (path) => realpath(path),
//   remove: (path, recursive = true) => rm(path, { recursive }),
//   removeEmptyDirectory: (path) => rmdir(path),
// });
//
// /** One explicitly classified uninstall action. */
// export interface UninstallItem {
//   readonly name: string;
//   readonly status: "removed" | "retained" | "skipped" | "failed";
//   readonly detail: string;
// }
//
// /** Structured, idempotent result of removing REA-owned state. */
// export interface UninstallResult {
//   readonly status: "complete" | "failed";
//   readonly items: readonly UninstallItem[];
// }
//
// /** Filesystem boundary used by the contained uninstall workflow. */
// export interface UninstallHost {
//   clients(): Promise<readonly SetupClient[]>;
//   /** Report a configuration that cannot be read safely, before any removal. */
//   inspectClient(client: SetupClient): Promise<UninstallItem | undefined>;
//   removeClient(client: SetupClient): Promise<UninstallItem>;
//   inspectSkill?(): Promise<UninstallItem | undefined>;
//   removeSkill(): Promise<UninstallItem>;
//   purgeData(): Promise<readonly UninstallItem[]>;
//   close?(): Promise<string | undefined>;
// }
//
// /**
//  * Remove only REA-owned registrations and managed files, optionally including
//  * local state. A client configuration that cannot be read safely stops the
//  * operation before anything is removed; one that fails during removal stops
//  * the remaining removals.
//  */
// export const runUninstall = async (
//   purgeData: boolean,
//   host: UninstallHost = systemUninstallHost(),
// ): Promise<UninstallResult> => {
//   let result: UninstallResult | undefined;
//   let primaryFailure: unknown;
//   let failed = false;
//   try {
//     const clients = await host.clients();
//     const blocked: UninstallItem[] = [];
//     for (const client of clients) {
//       const blocking = await host.inspectClient(client);
//       if (blocking !== undefined) blocked.push(blocking);
//     }
//     const skillBlocker = await host.inspectSkill?.();
//     if (skillBlocker !== undefined) blocked.push(skillBlocker);
//     const items: UninstallItem[] =
//       blocked.length > 0
//         ? [
//             ...blocked,
//             item(
//               "uninstall",
//               "skipped",
//               "No REA registration, skill, or data was removed. Repair each failed configuration, then rerun uninstall.",
//             ),
//           ]
//         : await removeAll(clients, purgeData, host);
//     items.push({
//       name: "analysis_engine",
//       status: "retained",
//       detail: "Hopper is not owned by REA uninstall.",
//     });
//     const reported = collapseUninstallItems(items);
//     result = {
//       status: reported.some(({ status }) => status === "failed")
//         ? "failed"
//         : "complete",
//       items: reported,
//     };
//   } catch (cause: unknown) {
//     failed = true;
//     primaryFailure = cause;
//   }
//   let cleanupFailure: string | undefined;
//   try {
//     cleanupFailure = await host.close?.();
//   } catch (cause: unknown) {
//     cleanupFailure = `Uninstall resource cleanup failed: ${cause instanceof Error ? cause.message : String(cause)}`;
//   }
//   if (failed) {
//     if (cleanupFailure !== undefined)
//       throw new AggregateError(
//         [primaryFailure, new Error(cleanupFailure)],
//         "Uninstall failed and its resource cleanup remains incomplete.",
//         { cause: primaryFailure },
//       );
//     throw primaryFailure;
//   }
//   if (result === undefined)
//     throw new Error("Uninstall result was not produced.");
//   if (cleanupFailure === undefined) return result;
//   const items = collapseUninstallItems([
//     ...result.items,
//     item("uninstall_cleanup", "failed", cleanupFailure),
//   ]);
//   return { status: "failed", items };
// };
//
// /**
//  * Each client is reread when it is edited, so a concurrent change is never
//  * overwritten. A client that fails then still stops the remaining removals.
//  */
// const removeAll = async (
//   clients: readonly SetupClient[],
//   purgeData: boolean,
//   host: UninstallHost,
// ): Promise<UninstallItem[]> => {
//   const items: UninstallItem[] = [];
//   for (const client of clients) {
//     const removed = await host.removeClient(client);
//     items.push(removed);
//     if (removed.status === "failed")
//       return [
//         ...items,
//         item(
//           "uninstall",
//           "skipped",
//           "Uninstall stopped at this failure; the items above report what changed. Repair the failed configuration, then rerun uninstall.",
//         ),
//       ];
//   }
//   items.push(await host.removeSkill());
//   if (purgeData) items.push(...(await host.purgeData()));
//   return items;
// };
//
// /** Create uninstall effects contained to detected client configs and REA-owned paths. */
// export const systemUninstallHost = (
//   selectedHome: string | undefined = undefined,
//   selectedFileSystem: UninstallFileSystem | undefined = undefined,
//   environment: Readonly<NodeJS.ProcessEnv> = process.env,
//   platform: NodeJS.Platform = process.platform,
// ): UninstallHost => {
//   const home =
//     selectedHome ?? homeDirectoryFromEnvironment(environment, platform);
//   const resources = new ArtifactResourceScope();
//   const fileSystem = selectedFileSystem ?? systemFileSystem(resources);
//   // Set with the client list: the package view that redirects this
//   // process's AppData writes, if any.
//   let redirection: MsixPackageView | undefined;
//   const clientWriteBlocker = (client: SetupClient): string | undefined =>
//     registrationWriteBlocker(client, "uninstall") ??
//     redirectedWriteBlocker(redirection, [client.configPath], "uninstall");
//   const skillWriteBlocker = (path: string): string | undefined =>
//     redirectedWriteBlocker(redirection, [path], "uninstall");
//   return {
//     clients: () => {
//       const clients = supportedClients(home, platform, environment);
//       redirection = appDataRedirection(clients);
//       return Promise.resolve(
//         clients.flatMap((client) => [
//           ...uninstallConfigPaths(client).map((configPath) => ({
//             ...client,
//             configPath,
//           })),
//           ...(client.zcodeFallbackPath === undefined
//             ? []
//             : [
export const _l = 242;
