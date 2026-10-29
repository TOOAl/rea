export const __stub = 1;
//   remove: (path) => rm(path, { force: true }),
// };
//
// /** Managed skill location selected for a client family. */
// export interface SkillDestination {
//   readonly client: string;
//   readonly path: string;
// }
//
// /** Metadata and byte alignment observed in selected skill installations. */
// export interface InstalledSkillIdentity {
//   readonly version: string | null;
//   readonly toolCount: number | null;
//   readonly canonical: boolean;
//   readonly issues?: readonly SkillPathIssue[];
// }
//
// /** Known management blockers and unresolved filesystem observations. */
// export interface SkillPathIssue {
//   readonly path: string;
//   readonly kind: "symbolic_link" | "not_directory" | "unreadable";
//   readonly detail: string;
// }
//
// /** Resolve the skill roots required by a client selection, or all owned roots. */
// export const skillDestinations = (
//   home: string,
//   clientIds: readonly string[] | undefined,
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
// ): readonly SkillDestination[] =>
//   clientSkillDirectories(home, clientIds, environment, platform).map(
//     ({ client, directory }) => ({
//       client,
//       path: join(directory, PRODUCT_IDENTITY.skillName),
//     }),
//   );
//
// /** Resolve existing REA-owned skill roots using setup's canonical destinations. */
// export const existingSkillDestinations = async (
//   home: string,
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
//   resources?: ArtifactResourceScope,
// ): Promise<readonly SkillDestination[]> => {
//   const existing: SkillDestination[] = [];
//   for (const destination of skillDestinations(
//     home,
//     undefined,
//     environment,
//     platform,
//   )) {
//     try {
//       const issues = await skillDirectoryIssues([destination]);
//       if (issues.some(({ kind }) => kind === "unreadable"))
//         throw skillDirectoryFailure(issues);
//       if (issues.length > 0) continue;
//       const manifest = join(destination.path, "SKILL.md");
//       const content = await readSkillFile(manifest, resources);
//       if (isManagedSkillManifest(content)) existing.push(destination);
//     } catch (cause: unknown) {
//       if (cause instanceof Error && "code" in cause && cause.code === "ENOENT")
//         continue;
//       if (
//         cause instanceof RegularFileCleanupFailure ||
//         cause instanceof ArtifactReaderFailure
//       )
//         throw cause;
//       if (cause instanceof NonRegularFileReadError) continue;
//       throw cause;
//     }
//   }
//   return existing;
// };
//
// const readOptionalSkillState = async (
//   path: string,
//   resources?: ArtifactResourceScope,
// ): Promise<SkillFileState | undefined> => {
//   try {
//     return await readSkillFileState(path, resources);
//   } catch (cause: unknown) {
//     if (cause instanceof Error && "code" in cause && cause.code === "ENOENT")
//       return undefined;
//     throw cause;
//   }
// };
//
// const inspectSkillDirectory = async (
//   path: string,
// ): Promise<Result<void, SkillPathIssue>> => {
//   try {
//     const directory = await lstat(path);
//     if (directory.isSymbolicLink())
//       return err({
//         path,
//         kind: "symbolic_link",
//         detail: "Skill directory is a symbolic link.",
//       });
//     if (!directory.isDirectory())
//       return err({
//         path,
//         kind: "not_directory",
//         detail: "Skill path is not a directory.",
//       });
//     return ok(undefined);
//   } catch (cause: unknown) {
//     if (cause instanceof Error && "code" in cause && cause.code === "ENOENT")
//       return ok(undefined);
//     return err({
//       path,
//       kind: "unreadable",
//       detail: cause instanceof Error ? cause.message : String(cause),
//     });
//   }
// };
//
// const skillDirectoryIssues = async (
//   destinations: readonly SkillDestination[],
// ): Promise<readonly SkillPathIssue[]> => {
//   const issues: SkillPathIssue[] = [];
//   for (const { path } of destinations) {
//     const root = await inspectSkillDirectory(path);
//     if (!root.ok) {
//       issues.push(root.error);
//       continue;
//     }
//     const references = await inspectSkillDirectory(join(path, "references"));
//     if (!references.ok) issues.push(references.error);
//   }
//   return issues;
// };
//
// const skillDirectoryFailure = (
//   issues: readonly SkillPathIssue[],
// ): SetupSkillInstallError =>
//   new SetupSkillInstallError({
//     path: issues[0]?.path ?? "skill bundle",
//     stage: "prepare",
//     reason: `${issues.map(({ path, detail }) => `${detail} (${path})`).join(" ")} Use a regular skill directory, or run setup with --skill=false to configure the client without installing the skill`,
//     rollbackFailures: [],
//     recoveryBackupPaths: [],
//     cause: issues,
//   });
//
// /** Validate only final selected roots; permission to install is separate from freshness. */
// export const validateCanonicalSkillDirectories = async (
//   home: string,
//   clientIds: readonly string[],
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
// ): Promise<Result<void, SetupSkillInstallError>> => {
//   const issues = await skillDirectoryIssues(
//     skillDestinations(home, clientIds, environment, platform),
//   );
//   return issues.length === 0
//     ? ok(undefined)
//     : err(skillDirectoryFailure(issues));
// };
//
// const canonicalSkillFiles = async (
//   home: string,
//   clientIds: readonly string[],
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
//   resources?: ArtifactResourceScope,
export const _l = 166;
