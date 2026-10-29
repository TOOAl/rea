export const __stub = 1;
//   reason: z.string().nullable(),
//   slices: z.array(machoSliceSchema.omit({ dependencies: true })),
// });
//
// /** Static dyld load-path resolution for every selected process root. */
// export const dylibResolutionResultSchema = z.strictObject({
//   root_path: z.string(),
//   target_sha256: digestSchema,
//   roots: z.array(
//     z.strictObject({ image: z.string(), architecture: z.string() }),
//   ),
//   images: z.array(imageSchema),
//   edges: z.array(edgeSchema),
//   findings: z.array(findingSchema),
//   coverage: z.strictObject({
//     status: z.enum(["complete", "partial"]),
//     unparsed_images: z.array(z.string()),
//     roots_without_architecture: z.array(z.string()),
//   }),
//   limitations: z.array(z.string().min(1)),
// });
//
// export type DylibResolutionResult = z.infer<typeof dylibResolutionResultSchema>;
// type Candidate = z.infer<typeof candidateSchema>;
// export type DylibEdge = z.infer<typeof edgeSchema>;
// export type DylibFinding = z.infer<typeof findingSchema>;
// type Edge = DylibEdge;
//
// /** Result before the adapter adds file digests and the analyzed root. */
// export type DylibTrace = Omit<
//   DylibResolutionResult,
//   "root_path" | "target_sha256" | "images"
// > & {
//   readonly images: readonly (Omit<
//     DylibResolutionResult["images"][number],
//     "sha256"
//   > & { readonly sha256?: never })[];
// };
//
// interface LoadedImage {
//   readonly slice: MachoSlice;
//   /** Images from the process root to this image; the rpath stack, outermost first. */
//   readonly chain: readonly string[];
//   /** Some edge on the chain was conditional: an unknown earlier candidate may load instead. */
//   readonly conditional: boolean;
// }
//
// interface ProcessContext {
//   readonly view: DylibTreeView;
//   readonly root: string;
//   readonly processIdentity: Pick<
//     MachoSlice,
//     "architecture" | "cpu_type" | "cpu_subtype"
//   >;
//   readonly searchOverrides: readonly DyldSearchOverride[];
//   readonly environmentRoots: Set<string>;
//   readonly platforms: readonly number[];
//   readonly executable: string | null;
//   readonly loaded: Map<string, LoadedImage>;
//   readonly byInstallName: Map<string, string>;
//   readonly images: Map<string, MachoImageFacts>;
// }
//
// interface CandidateTemplate {
//   readonly expansion: Expansion;
//   readonly source: Candidate["source"];
//   readonly rpath: string | null;
//   readonly rpathOwner: string | null;
// }
//
// const candidateTemplates = (
//   dependency: MachoDependency,
//   loader: string,
//   context: ProcessContext,
// ): CandidateTemplate[] => {
//   const name = dependency.install_name;
//   if (!name.startsWith("@rpath/")) {
//     const source = name.startsWith("@executable_path")
//       ? "executable_path"
//       : name.startsWith("@loader_path")
//         ? "loader_path"
//         : "literal";
//     return [
//       {
//         expansion: expandPrefix(name, {
//           ownerDirectory: directoryOf(loader),
//           executable: context.executable,
//         }),
//         source,
//         rpath: null,
//         rpathOwner: null,
//       },
//     ];
//   }
//   const rest = name.slice("@rpath/".length);
//   const owners = [...(context.loaded.get(loader)?.chain ?? [loader])].reverse();
//   return owners.flatMap((owner) =>
//     (context.loaded.get(owner)?.slice.rpaths ?? []).map((rpath) => {
//       const base = expandPrefix(rpath, {
//         ownerDirectory: directoryOf(owner),
//         executable: context.executable,
//       });
//       const expansion: Expansion = {
//         scope: base.scope,
//         path:
//           base.scope === "outside"
//             ? `${base.path.replace(/\/+$/u, "")}/${rest}`
//             : `${base.path}${base.path === "" ? "" : "/"}${rest}`,
//       };
//       return { expansion, source: "rpath" as const, rpath, rpathOwner: owner };
//     }),
//   );
// };
//
// const evaluateCandidate = async (
//   template: CandidateTemplate,
//   context: ProcessContext,
// ): Promise<Candidate> => {
//   const base = {
//     path: template.expansion.path,
//     source: template.source,
//     rpath: template.rpath,
//     rpath_owner: template.rpathOwner,
//   };
//   if (template.expansion.scope === "outside")
//     return { ...base, outcome: "outside-target", resolved_path: null };
//   if (template.expansion.scope === "undetermined")
//     return { ...base, outcome: "undetermined", resolved_path: null };
//   const lookup = await resolveTreePath(context.view, template.expansion.path);
//   if (lookup.kind === "escapes")
//     return { ...base, outcome: "escapes-target", resolved_path: null };
//   if (lookup.kind !== "file")
//     return { ...base, outcome: "absent", resolved_path: null };
//   const facts = await imageFacts(context, lookup.path);
//   let outcome: Candidate["outcome"];
//   if (facts.status !== "parsed") outcome = facts.status;
//   else {
//     const slice = compatibleSlice(facts.slices, context.processIdentity);
//     if (slice === undefined) outcome = "architecture-missing";
//     // Dependency commands require a dylib; generic dyld image loadability
//     // also admits main executables and bundles for different operations.
//     else if (slice.file_type_code !== 6) outcome = "not-loadable";
//     else {
//       const platformResult = platformLoadability(
//         context.platforms,
//         slice.platforms,
//         slice.file_type_code,
//         context.processIdentity.architecture,
//       );
//       outcome =
//         platformResult === "compatible"
//           ? "resolved"
//           : platformResult === "incompatible"
//             ? "platform-mismatch"
//             : "undetermined";
//     }
//   }
//   return { ...base, outcome, resolved_path: lookup.path };
// };
//
// type PlatformLoadability = "compatible" | "incompatible" | "unknown";
//
// /** Apply dyld's documented cross-platform load cases and retain uncertain host cases. */
// const platformLoadability = (
//   processPlatforms: readonly number[],
//   imagePlatforms: readonly number[],
//   fileType: number,
//   architecture: string,
// ): PlatformLoadability => {
//   if (processPlatforms.length === 0 || imagePlatforms.length === 0)
//     return "unknown";
//   const outcomes = processPlatforms.map((processPlatform) =>
//     imageLoadabilityForPlatform(
export const _l = 173;
