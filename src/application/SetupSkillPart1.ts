export const __stub = 1;
// import { copyFile, lstat, mkdir, readFile, rm } from "node:fs/promises";
// import { constants as fsConstants } from "node:fs";
// import { dirname, join } from "node:path";
// import writeFileAtomic from "write-file-atomic";
// import { err, ok, type Result } from "../domain/result.js";
// import { readBoundedFileBytes } from "../process/BoundedFileBytes.js";
// import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
// import { ArtifactReaderFailure } from "../artifacts/ArtifactReader.js";
//
// import { PRODUCT_IDENTITY } from "../identity.js";
// import {
//   NonRegularFileReadError,
//   RegularFileChangedError,
// } from "../filesystem/RegularFile.js";
// import {
//   RegularFileCleanupFailure,
//   withRegularFile,
// } from "./RegularFileRead.js";
// import { clientSkillDirectories } from "./SupportedClients.js";
// import { selectCurrentRecoveryBackup } from "./SetupRecoveryBackup.js";
//
// export const MANAGED_SKILL_FILES = [
//   "SKILL.md",
//   "references/connection-and-recovery.md",
//   "references/native-and-artifacts.md",
//   "references/javascript-applications.md",
//   "references/android-applications.md",
//   "references/runtime-observation.md",
//   "references/evidence-workflows.md",
// ] as const;
//
// export const isManagedSkillManifest = (content: string): boolean =>
//   content.startsWith(`---\nname: ${PRODUCT_IDENTITY.skillName}\n`) ||
//   content.startsWith(`---\r\nname: ${PRODUCT_IDENTITY.skillName}\r\n`);
//
// export const readSkillFile = (
//   path: string,
//   resources?: ArtifactResourceScope,
// ): Promise<string> =>
//   readSkillFileState(path, resources).then(({ bytes }) =>
//     bytes.toString("utf8"),
//   );
//
// interface SkillFileState {
//   readonly bytes: Buffer;
//   readonly mode: number;
// }
//
// const readSkillFileState = async (
//   path: string,
//   resources?: ArtifactResourceScope,
// ): Promise<SkillFileState> =>
//   withRegularFile(
//     path,
//     async (handle, stats) => {
//       const bytes = await readBoundedFileBytes(
//         handle,
//         stats.size,
//         undefined,
//         stats.size,
//       );
//       if (bytes === undefined || bytes.length !== stats.size)
//         throw new RegularFileChangedError(path);
//       return { bytes, mode: stats.mode & 0o7777 };
//     },
//     {
//       symlinks: "reject",
//       ...(resources === undefined ? {} : { resources }),
//     },
//   );
//
// interface CanonicalSkillFile {
//   readonly content: string;
//   readonly destination: string;
//   readonly original: SkillFileState | undefined;
// }
//
// const canonicalSkillContent = (relativePath: string): Promise<string> =>
//   readFile(
//     new URL(
//       `../../skills/${PRODUCT_IDENTITY.skillName}/${relativePath}`,
//       import.meta.url,
//     ),
//     "utf8",
//   );
//
// export interface SkillInstallFileOperations {
//   readonly mkdir: (path: string) => Promise<void>;
//   readonly backup: (source: string, destination: string) => Promise<void>;
//   readonly write: (
//     path: string,
//     content: string | Buffer,
//     mode: number,
//   ) => Promise<void>;
//   readonly remove: (path: string) => Promise<void>;
// }
//
// export interface SkillInstallRollbackFailure {
//   readonly path: string;
//   readonly reason: string;
// }
//
// /** Expected failure while replacing a managed skill bundle. */
// export class SetupSkillInstallError extends Error {
//   readonly _tag = "SetupSkillInstallError";
//   readonly path: string;
//   readonly stage: "prepare" | "backup" | "write" | "readback";
//   readonly reason: string;
//   readonly rollbackFailures: readonly SkillInstallRollbackFailure[];
//   readonly recoveryBackupPaths: readonly string[];
//
//   constructor(input: {
//     readonly path: string;
//     readonly stage: "prepare" | "backup" | "write" | "readback";
//     readonly reason: string;
//     readonly rollbackFailures: readonly SkillInstallRollbackFailure[];
//     readonly recoveryBackupPaths: readonly string[];
//     readonly cause: unknown;
//   }) {
//     const message = [
//       `REA skill ${input.stage} failed at ${input.path}: ${input.reason}.`,
//       ...(input.rollbackFailures.length === 0
//         ? []
//         : [
//             `Rollback also failed for ${input.rollbackFailures.map(({ path, reason }) => `${path} (${reason})`).join(", ")}.`,
//             ...(input.recoveryBackupPaths.length === 0
//               ? []
//               : [
//                   `Existing-file backups remain at ${input.recoveryBackupPaths.join(", ")}.`,
//                 ]),
//           ]),
//     ].join(" ");
//     super(message, { cause: input.cause });
//     this.path = input.path;
//     this.stage = input.stage;
//     this.reason = input.reason;
//     this.rollbackFailures = input.rollbackFailures;
//     this.recoveryBackupPaths = input.recoveryBackupPaths;
//   }
//
//   get remediation(): string {
//     return `${this.message} Check permissions and rerun setup.`;
//   }
// }
//
// export type SkillInstallValue = "installed" | "unchanged";
// export type SkillInstallResult = Result<
//   SkillInstallValue,
//   SetupSkillInstallError
// >;
//
// const systemSkillInstallFileOperations: SkillInstallFileOperations = {
//   mkdir: async (path) => {
//     await mkdir(path, { recursive: true });
//   },
//   backup: async (source, destination) => {
//     try {
//       await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
//     } catch (cause: unknown) {
//       if (cause instanceof Error && "code" in cause && cause.code === "EEXIST")
//         return;
//       throw cause;
//     }
//   },
//   write: (path, content, mode) =>
//     writeFileAtomic(path, content, { encoding: "utf8", mode }),
export const _l = 166;
