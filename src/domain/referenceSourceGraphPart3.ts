export const __stub = 1;
// ): void => {
//   const files = new Set(
//     graph.entries.flatMap((entry) =>
//       entry.kind === "file" ? [entry.path] : [],
//     ),
//   );
//   for (const [index, relationship] of graph.relationships.entries()) {
//     if (!files.has(relationship.from_path))
//       context.addIssue({
//         code: "custom",
//         message: "Relationship source must name an inventoried file",
//         path: ["relationships", index, "from_path"],
//       });
//     if (relationship.resolution !== "internal") continue;
//     const parsed = relativePathSchema.safeParse(relationship.to);
//     if (!parsed.success || !paths.has(parsed.data))
//       context.addIssue({
//         code: "custom",
//         message:
//           "Internal relationship target must be normalized and inventoried",
//         path: ["relationships", index, "to"],
//       });
//   }
// };
//
// const checkSymlinks = (
//   graph: GraphStructure,
//   paths: ReadonlySet<string>,
//   context: z.RefinementCtx,
// ): void => {
//   const lookupPath = createReferenceSourcePathLookup(paths);
//   const excludedPaths = createReferenceSourcePathLookup(
//     graph.exclusions.map(({ path }) => path),
//   );
//   const excludedKinds = new Map<
//     string,
//     Set<"file" | "directory" | "symlink" | "other" | "unknown" | undefined>
//   >();
//   for (const { path, entry_kind } of graph.exclusions) {
//     const kinds = excludedKinds.get(path) ?? new Set();
//     kinds.add(entry_kind);
//     excludedKinds.set(path, kinds);
//   }
//   for (const [index, entry] of graph.entries.entries()) {
//     if (entry.kind !== "symlink") continue;
//     if (entry.target === null) continue;
//     const resolved = posix.normalize(
//       posix.join(posix.dirname(entry.path), entry.target),
//     );
//     const escapesRoot = resolved.startsWith("../") || resolved === "..";
//     // The root is implicit; every other internal target needs an exact or
//     // uniquely Unicode-equivalent recorded inventory identity.
//     const inventoried =
//       resolved === "." || lookupPath.resolve(resolved) !== undefined;
//     const exactExcluded = excludedPaths.resolve(resolved);
//     let excluded = exactExcluded !== undefined;
//     for (
//       let candidate = posix.dirname(resolved);
//       candidate !== "." && candidate !== "/";
//       candidate = posix.dirname(candidate)
//     ) {
//       const excludedAncestor = excludedPaths.resolve(candidate);
//       if (excludedAncestor === undefined) continue;
//       const kinds = excludedKinds.get(excludedAncestor);
//       if (kinds?.size !== 1 || !kinds.has("directory")) {
//         excluded = false;
//         break;
//       }
//       excluded = true;
//     }
//     const ownedRelativeTarget =
//       !entry.target.startsWith("/") && !escapesRoot && inventoried;
//     const absolute =
//       isPortableAbsoluteReferenceTarget(entry.target) &&
//       !(entry.target_state === "internal" && ownedRelativeTarget);
//     if (
//       (entry.target_state === "external" && !absolute) ||
//       (entry.target_state === "internal" && absolute)
//     )
//       context.addIssue({
//         code: "custom",
//         message: "Symlink target path does not match its target state",
//         path: ["entries", index, "target"],
//       });
//     if (entry.target_state !== "internal") continue;
//     if (escapesRoot || (!inventoried && !excluded))
//       context.addIssue({
//         code: "custom",
//         message:
//           "Internal symlink target must resolve to an inventoried entry or a recorded exclusion",
//         path: ["entries", index, "target"],
//       });
//   }
// };
//
// const checkCompleteInventory = (
//   graph: GraphStructure,
//   context: z.RefinementCtx,
// ): void => {
//   if (graph.inventory_state !== "complete") return;
//   const partialEntry = graph.entries.some(
//     (entry) =>
//       entry.limitations.length > 0 ||
//       (entry.kind === "file" && entry.content_state !== "hashed") ||
//       (entry.kind === "directory" && entry.tree_state !== "enumerated") ||
//       (entry.kind === "symlink" && entry.target_state !== "internal") ||
//       entry.kind === "unknown",
//   );
//   const partialRelationship = graph.relationships.some(
//     ({ parse_state, resolution }) =>
//       parse_state !== "parsed" ||
//       ["unresolved", "unknown"].includes(resolution),
//   );
//   if (
//     !partialEntry &&
//     !partialRelationship &&
//     graph.parse_failures.length === 0 &&
//     graph.exclusions.length === 0 &&
//     graph.limitations.length === 0
//   )
//     return;
//   context.addIssue({
//     code: "custom",
//     message:
//       "Complete inventory cannot contain partial states, exclusions, failures, or limitations",
//     path: ["inventory_state"],
//   });
// };
//
// function checkGraphInvariants(
//   graph: GraphStructure,
//   context: z.RefinementCtx,
// ): void {
//   checkSortedUnique(
//     graph.entries.map(({ path }) => path),
//     "entries",
//     context,
//   );
//   for (const [index, entry] of graph.entries.entries())
//     checkSortedUnique(
//       entry.classifications,
//       `entries.${index}.classifications`,
//       context,
//     );
//   checkSortedUnique(graph.languages, "languages", context);
//   checkSortedUnique(graph.manifests, "manifests", context);
//   checkSortedUnique(
//     graph.relationships.map(relationshipKey),
//     "relationships",
//     context,
export const _l = 150;
