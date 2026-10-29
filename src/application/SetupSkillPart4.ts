export const __stub = 1;
//
// const restoreSkillFiles = async (
//   attempted: readonly CanonicalSkillFile[],
//   operations: SkillInstallFileOperations,
// ): Promise<readonly SkillInstallRollbackFailure[]> => {
//   const failures: SkillInstallRollbackFailure[] = [];
//   for (const { destination, original } of [...attempted].reverse()) {
//     try {
//       if (original === undefined) await operations.remove(destination);
//       else await operations.write(destination, original.bytes, original.mode);
//     } catch (cause: unknown) {
//       failures.push({ path: destination, reason: causeReason(cause) });
//     }
//   }
//   return failures;
// };
//
// const preserveCurrentSkillBackup = async (
//   destination: string,
//   original: Buffer,
//   operations: SkillInstallFileOperations,
// ): Promise<string> => {
//   const firstBackupPath = `${destination}.rea.backup`;
//   const selection = await selectCurrentRecoveryBackup(
//     firstBackupPath,
//     original,
//   );
//   if (!selection.ok) throw new Error(selection.error.detail);
//   if (selection.value.present) return selection.value.backupPath;
//
//   await operations.backup(destination, selection.value.backupPath);
//   const verified = await selectCurrentRecoveryBackup(firstBackupPath, original);
//   if (
//     !verified.ok ||
//     verified.value.backupPath !== selection.value.backupPath ||
//     !verified.value.present
//   )
//     throw new Error(
//       `The current file was not preserved at ${selection.value.backupPath}`,
//     );
//   return verified.value.backupPath;
// };
//
// /** Transactionally install the canonical skill bundle and optional references. */
// export const installCanonicalSkill = async (
//   home: string,
//   clientIds: readonly string[] = [],
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
//   operations: SkillInstallFileOperations = systemSkillInstallFileOperations,
//   resources?: ArtifactResourceScope,
// ): Promise<SkillInstallResult> => {
//   let attempted: CanonicalSkillFile[] = [];
//   let stage: "prepare" | "backup" | "write" | "readback" = "prepare";
//   let failingPath = "skill bundle";
//   const recoveryPaths = new Map<string, string>();
//   try {
//     const canonical = await canonicalSkillFiles(
//       home,
//       clientIds,
//       environment,
//       platform,
//       resources,
//     );
//     const changed = canonical.filter(
//       ({ content, original }) =>
//         original?.bytes.equals(Buffer.from(content, "utf8")) !== true,
//     );
//     if (changed.length === 0) return ok("unchanged");
//
//     stage = "backup";
//     for (const { destination, original } of changed) {
//       failingPath = destination;
//       await operations.mkdir(dirname(destination));
//       if (original !== undefined) {
//         recoveryPaths.set(
//           destination,
//           await preserveCurrentSkillBackup(
//             destination,
//             original.bytes,
//             operations,
//           ),
//         );
//       }
//     }
//     stage = "write";
//     for (const file of changed) {
//       failingPath = file.destination;
//       // An atomic writer can publish and then reject; include the target before
//       // entering it so rollback covers that ambiguous outcome.
//       attempted.push(file);
//       await operations.write(
//         file.destination,
//         file.content,
//         file.original?.mode ?? 0o600,
//       );
//     }
//     stage = "readback";
//     for (const { destination, content } of changed) {
//       failingPath = destination;
//       if (
//         !(await readSkillFileState(destination, resources)).bytes.equals(
//           Buffer.from(content, "utf8"),
//         )
//       )
//         throw new Error(`skill readback mismatch: ${destination}`);
//     }
//     return ok("installed");
//   } catch (cause: unknown) {
//     if (stage === "prepare" && cause instanceof SetupSkillInstallError)
//       return err(cause);
//     failingPath = causePath(cause) ?? failingPath;
//     const rollbackFailures = await restoreSkillFiles(attempted, operations);
//     return err(
//       new SetupSkillInstallError({
//         path: failingPath,
//         stage,
//         reason: causeReason(cause),
//         rollbackFailures,
//         recoveryBackupPaths: attempted.flatMap(({ destination, original }) =>
//           original === undefined || recoveryPaths.get(destination) === undefined
//             ? []
//             : [recoveryPaths.get(destination)!],
//         ),
//         cause,
//       }),
//     );
//   }
// };
//
// /** Read installed skill metadata and compare every managed location. */
// export const readInstalledSkillIdentity = async (
//   home: string,
//   clientIds: readonly string[] | undefined,
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
//   resources?: ArtifactResourceScope,
// ): Promise<InstalledSkillIdentity | undefined> => {
//   const inspection = await inspectCanonicalSkill(
//     home,
//     clientIds,
//     environment,
//     platform,
//     resources,
//   );
//   if (inspection.ok && !inspection.value.installedDestination) return undefined;
//   const content = inspection.ok
//     ? inspection.value.manifest
//     : inspection.error.manifest;
//   const issues = inspection.ok ? [] : inspection.error.issues;
//   if (content === undefined && issues.length === 0) return undefined;
//   const toolCount =
//     content === undefined
//       ? undefined
//       : /^\s{2}tool_count:\s*(\d+)\s*$/mu.exec(content)?.[1];
//   return {
//     canonical: inspection.ok && inspection.value.canonical,
//     version:
//       content === undefined
//         ? null
//         : (/^\s{2}version:\s*"([^"]+)"\s*$/mu.exec(content)?.[1] ?? null),
//     toolCount: toolCount === undefined ? null : Number.parseInt(toolCount, 10),
//     ...(issues.length === 0 ? {} : { issues }),
//   };
// };
export const _l = 165;
