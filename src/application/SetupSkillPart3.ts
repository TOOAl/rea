export const __stub = 1;
// ): Promise<readonly CanonicalSkillFile[]> => {
//   const destinations = skillDestinations(
//     home,
//     clientIds,
//     environment,
//     platform,
//   );
//   const admission = await validateCanonicalSkillDirectories(
//     home,
//     clientIds,
//     environment,
//     platform,
//   );
//   if (!admission.ok) throw admission.error;
//   return Promise.all(
//     destinations.flatMap(({ path: root }) =>
//       MANAGED_SKILL_FILES.map(async (relativePath) => {
//         const destination = join(root, relativePath);
//         return {
//           destination,
//           content: await canonicalSkillContent(relativePath),
//           original: await readOptionalSkillState(destination, resources),
//         };
//       }),
//     ),
//   );
// };
//
// interface CanonicalSkillInspection {
//   readonly canonical: boolean;
//   readonly manifest: string | undefined;
//   readonly installedDestination: boolean;
// }
//
// interface SkillInspectionFailure {
//   readonly _tag: "SkillInspectionFailure";
//   readonly issues: readonly SkillPathIssue[];
//   readonly cause: unknown;
//   readonly manifest: string | undefined;
// }
//
// const inspectCanonicalSkill = async (
//   home: string,
//   clientIds: readonly string[] | undefined,
//   environment: Readonly<NodeJS.ProcessEnv>,
//   platform: NodeJS.Platform,
//   resources?: ArtifactResourceScope,
// ): Promise<Result<CanonicalSkillInspection, SkillInspectionFailure>> => {
//   const destinations = skillDestinations(
//     home,
//     clientIds,
//     environment,
//     platform,
//   );
//   const issues =
//     clientIds === undefined
//       ? []
//       : [...(await skillDirectoryIssues(destinations))];
//   if (issues.length > 0)
//     return err({
//       _tag: "SkillInspectionFailure",
//       issues,
//       cause: issues,
//       manifest: undefined,
//     });
//   let canonical = true;
//   let manifest: string | undefined;
//   let failureCause: unknown;
//   let installedDestination = false;
//   for (const destination of destinations) {
//     const { path: root } = destination;
//     const pathIssues =
//       clientIds === undefined ? await skillDirectoryIssues([destination]) : [];
//     if (pathIssues.length > 0) {
//       issues.push(...pathIssues);
//       if (failureCause === undefined) failureCause = pathIssues;
//       installedDestination = true;
//       canonical = false;
//       continue;
//     }
//     let rootCanonical = true;
//     let rootHasFiles = false;
//     const rootIssues: SkillPathIssue[] = [];
//     for (const relativePath of MANAGED_SKILL_FILES) {
//       const destination = join(root, relativePath);
//       let original: SkillFileState | undefined;
//       try {
//         original = await readOptionalSkillState(destination, resources);
//       } catch (cause: unknown) {
//         if (
//           cause instanceof RegularFileCleanupFailure ||
//           cause instanceof ArtifactReaderFailure
//         )
//           throw cause;
//         rootIssues.push({
//           path: destination,
//           kind: "unreadable",
//           detail: causeReason(cause),
//         });
//         if (failureCause === undefined) failureCause = cause;
//         rootCanonical = false;
//         rootHasFiles = true;
//         continue;
//       }
//       if (original !== undefined) rootHasFiles = true;
//       if (relativePath === "SKILL.md" && manifest === undefined)
//         manifest = original?.bytes.toString("utf8");
//       // A mismatch settles freshness, but not coverage of later read failures.
//       if (original === undefined) rootCanonical = false;
//       else if (rootCanonical) {
//         const content = await canonicalSkillContent(relativePath);
//         rootCanonical = original.bytes.equals(Buffer.from(content, "utf8"));
//       }
//     }
//     if (clientIds !== undefined || rootHasFiles || rootIssues.length > 0) {
//       installedDestination = true;
//       canonical = canonical && rootCanonical;
//       issues.push(...rootIssues);
//     }
//   }
//   return issues.length === 0
//     ? ok({ canonical, manifest, installedDestination })
//     : err({
//         _tag: "SkillInspectionFailure",
//         issues,
//         cause: failureCause,
//         manifest,
//       });
// };
//
// /** Report whether setup would change any file in the managed REA skill bundle. */
// export const canonicalSkillNeedsInstall = async (
//   home: string,
//   clientIds: readonly string[] = [],
//   environment: Readonly<NodeJS.ProcessEnv> = {},
//   platform: NodeJS.Platform = process.platform,
//   resources?: ArtifactResourceScope,
// ): Promise<boolean> => {
//   try {
//     const inspection = await inspectCanonicalSkill(
//       home,
//       clientIds,
//       environment,
//       platform,
//       resources,
//     );
//     return !inspection.ok || !inspection.value.canonical;
//   } catch (cause: unknown) {
//     if (
//       cause instanceof RegularFileCleanupFailure ||
//       cause instanceof ArtifactReaderFailure
//     )
//       throw cause;
//     // A copy needs attention; selected-root admission decides whether it may be installed.
//     void cause;
//     return true;
//   }
// };
//
// const causeReason = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
//
// const causePath = (cause: unknown): string | undefined =>
//   cause instanceof Error && "path" in cause && typeof cause.path === "string"
//     ? cause.path
//     : undefined;
export const _l = 166;
