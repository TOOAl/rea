export const __stub = 1;
//       processPlatform,
//       imagePlatforms,
//       fileType,
//       architecture,
//     ),
//   );
//   if (outcomes.every((outcome) => outcome === "compatible"))
//     return "compatible";
//   if (outcomes.every((outcome) => outcome === "incompatible"))
//     return "incompatible";
//   return "unknown";
// };
//
// const imageLoadabilityForPlatform = (
//   processPlatform: number,
//   imagePlatforms: readonly number[],
//   fileType: number,
//   architecture: string,
// ): PlatformLoadability => {
//   if (imagePlatforms.includes(processPlatform)) return "compatible";
//
//   // These are explicit dyld loadableIntoProcess cross-platform cases.
//   if (processPlatform === 6 && imagePlatforms.includes(1)) return "compatible"; // macOS dylibs in Mac Catalyst processes
//   if (processPlatform === 2 && imagePlatforms.includes(6)) return "compatible"; // Catalyst dylibs in iOS processes
//   if (processPlatform === 2 && imagePlatforms.includes(11)) return "compatible"; // visionOS dylibs in iOS processes
//   if (processPlatform === 7 && imagePlatforms.includes(12)) return "compatible"; // visionOS simulator dylibs in iOS simulator processes
//   if (processPlatform === 1 && fileType === 2 && imagePlatforms.includes(6))
//     return "compatible"; // Catalyst main executables run on macOS
//
//   // dyld's remaining exceptions depend on host architecture or a special path.
//   if (
//     (processPlatform === 2 &&
//       imagePlatforms.includes(1) &&
//       architecture.startsWith("arm64")) ||
//     ([7, 8, 9].includes(processPlatform) && imagePlatforms.includes(1))
//   )
//     return "unknown";
//
//   if (isKnownPlatform(processPlatform) && imagePlatforms.every(isKnownPlatform))
//     return "incompatible";
//   return "unknown";
// };
//
// const isKnownPlatform = (platform: number): boolean =>
//   platform >= 1 && platform <= 12;
//
// const imageFacts = async (
//   context: ProcessContext,
//   path: string,
// ): Promise<MachoImageFacts> => {
//   const known = context.images.get(path);
//   if (known !== undefined) return known;
//   const facts = await context.view.image(path);
//   context.images.set(path, facts);
//   return facts;
// };
//
// const resolution = (candidates: readonly Candidate[]): Edge["resolution"] => {
//   let external = false;
//   for (const candidate of candidates) {
//     if (candidate.outcome === "resolved")
//       return {
//         status: external ? "conditional" : "resolved",
//         image: candidate.resolved_path,
//       };
//     // dyld might load these; REA cannot decide them from the analyzed root.
//     if (
//       candidate.outcome === "outside-target" ||
//       candidate.outcome === "escapes-target" ||
//       candidate.outcome === "unsupported" ||
//       candidate.outcome === "undetermined"
//     )
//       external = true;
//   }
//   return { status: external ? "undetermined" : "unresolved", image: null };
// };
//
// const resolveDependency = async (
//   dependency: MachoDependency,
//   loader: string,
//   context: ProcessContext,
// ): Promise<Edge> => {
//   const current = context.loaded.get(loader);
//   const chain = current?.chain ?? [loader];
//   const loaded = dependency.install_name.startsWith("@rpath/")
//     ? context.byInstallName.get(dependency.install_name)
//     : undefined;
//   const candidates: Candidate[] = [];
//   if (loaded !== undefined)
//     candidates.push({
//       path: dependency.install_name,
//       source: "already-loaded",
//       rpath: null,
//       rpath_owner: null,
//       outcome: "resolved",
//       resolved_path: loaded,
//     });
//   else
//     for (const template of candidateTemplates(dependency, loader, context)) {
//       const candidate = await evaluateCandidate(template, context);
//       candidates.push(candidate);
//       // dyld stops at the first loadable candidate.
//       if (candidate.outcome === "resolved") break;
//     }
//   const modeled = resolution(candidates);
//   const searchUnknown =
//     loaded === undefined &&
//     hasApplicableDyldOverrides(
//       context.searchOverrides,
//       dependency.install_name,
//       modeled.image !== null,
//     );
//   if (searchUnknown) context.environmentRoots.add(context.root);
//   // Fallbacks cannot preempt a modeled hit, and framework paths do not
//   // override ordinary dylibs. Reuse inherits uncertainty from the first load.
//   const searched: Edge["resolution"] = searchUnknown
//     ? {
//         ...modeled,
//         status: modeled.image === null ? "undetermined" : "conditional",
//       }
//     : modeled;
//   // Reusing an image that itself loads only conditionally is conditional too.
//   const resolved: Edge["resolution"] =
//     loaded !== undefined &&
//     context.loaded.get(loaded)?.conditional === true &&
//     searched.status === "resolved"
//       ? { ...searched, status: "conditional" }
//       : searched;
//   const image =
//     resolved.image === null ? undefined : context.images.get(resolved.image);
//   const slice =
//     image?.status === "parsed"
//       ? compatibleSlice(image.slices, context.processIdentity)
//       : undefined;
//   return {
//     root: context.root,
//     architecture: context.processIdentity.architecture,
//     loader,
//     via: [...chain],
//     ...dependency,
//     candidates,
//     resolution: resolved,
//     install_name_matches:
//       slice === undefined || slice.install_name === null
//         ? null
//         : slice.install_name === dependency.install_name,
//     loader_conditional: current?.conditional ?? false,
//   };
// };
//
// /**
//  * Follow dyld4's dependents-first order: resolve every dependency of one
//  * image, then recurse into the images it newly loaded, in load-command order.
//  */
// const traceProcess = async (
//   context: ProcessContext,
//   rootSlice: MachoSlice,
//   signal?: AbortSignal,
// ): Promise<Edge[]> => {
//   const edges: Edge[] = [];
//   context.loaded.set(context.root, {
//     slice: rootSlice,
//     chain: [context.root],
//     conditional: false,
//   });
//   if (
//     rootSlice.install_name !== null &&
//     rootSlice.install_name.startsWith("@rpath/")
//   )
//     context.byInstallName.set(rootSlice.install_name, context.root);
//   const pending = [context.root];
//   while (pending.length > 0) {
//     signal?.throwIfAborted();
export const _l = 173;
