export const __stub = 1;
//     const loader = pending.pop() ?? "";
//     const current = context.loaded.get(loader);
//     if (current === undefined) continue;
//     const created: string[] = [];
//     for (const dependency of current.slice.dependencies) {
//       const edge = await resolveDependency(dependency, loader, context);
//       edges.push(edge);
//       // dyld loads LC_LAZY_LOAD_DYLIB images on first use, not at launch.
//       if (dependency.command === "LC_LAZY_LOAD_DYLIB") continue;
//       const image = edge.resolution.image;
//       if (image === null || context.loaded.has(image)) continue;
//       const facts = context.images.get(image);
//       const slice =
//         facts?.status === "parsed"
//           ? compatibleSlice(facts.slices, context.processIdentity)
//           : undefined;
//       if (slice === undefined) continue;
//       context.loaded.set(image, {
//         slice,
//         chain: [...current.chain, image],
//         // dyld may load an unknown earlier candidate instead of this fallback.
//         conditional:
//           current.conditional || edge.resolution.status === "conditional",
//       });
//       if (
//         slice.install_name !== null &&
//         slice.install_name.startsWith("@rpath/") &&
//         !context.byInstallName.has(slice.install_name)
//       )
//         context.byInstallName.set(slice.install_name, image);
//       created.push(image);
//     }
//     pending.push(...created.reverse());
//   }
//   return edges;
// };
//
// /** Trace dyld load paths from each process root through the analyzed root. */
// export const traceDylibLoading = async (
//   view: DylibTreeView,
//   request: {
//     readonly roots: readonly string[];
//     /** Mach-O files whose root role could not be classified because they did not parse. */
//     readonly unclassified?: readonly string[];
//     readonly architecture?: string;
//     readonly signal?: AbortSignal;
//   },
// ): Promise<DylibTrace> => {
//   const images = new Map<string, MachoImageFacts>();
//   for (const path of request.unclassified ?? [])
//     images.set(path, await view.image(path));
//   const roots: DylibTrace["roots"][number][] = [];
//   const rootSlices: TracedRootSlice[] = [];
//   const edges: Edge[] = [];
//   const withoutArchitecture: string[] = [];
//   const environmentRoots = new Set<string>();
//   for (const root of request.roots) {
//     const facts = await view.image(root);
//     images.set(root, facts);
//     if (facts.status !== "parsed") continue;
//     const slices = facts.slices.filter(
//       ({ architecture }) =>
//         request.architecture === undefined ||
//         architecture === request.architecture,
//     );
//     if (slices.length === 0) withoutArchitecture.push(root);
//     for (const slice of slices) {
//       const executable = slice.file_type === "execute" ? root : null;
//       // Only the main executable supplies the process's embedded environment.
//       const searchOverrides =
//         executable === null
//           ? []
//           : embeddedDyldOverrides(slice.dyld_environment, slice.platforms);
//       // Inserted libraries introduce unexamined images even without dependencies.
//       if (
//         searchOverrides.some(
//           ({ variable, value }) =>
//             variable === "DYLD_INSERT_LIBRARIES" && value !== "",
//         )
//       )
//         environmentRoots.add(root);
//       roots.push({ image: root, architecture: slice.architecture });
//       rootSlices.push({ image: root, slice });
//       edges.push(
//         ...(await traceProcess(
//           {
//             view,
//             root,
//             processIdentity: {
//               architecture: slice.architecture,
//               cpu_type: slice.cpu_type,
//               cpu_subtype: slice.cpu_subtype,
//             },
//             searchOverrides,
//             environmentRoots,
//             platforms: slice.platforms,
//             executable,
//             loaded: new Map(),
//             byInstallName: new Map(),
//             images,
//           },
//           slice,
//           request.signal,
//         )),
//       );
//     }
//   }
//   const reported = [...images.entries()]
//     .filter(([, facts]) => facts.status !== "not-mach-o")
//     .sort(([left], [right]) => compare(left, right));
//   const unparsed = reported
//     .filter(([, facts]) => facts.status !== "parsed")
//     .map(([path]) => path);
//   return {
//     roots,
//     images: reported.map(([path, facts]) => ({
//       path,
//       parse_status:
//         facts.status === "not-mach-o" ? "unsupported" : facts.status,
//       reason:
//         facts.status === "parsed" || facts.status === "not-mach-o"
//           ? null
//           : facts.reason,
//       slices:
//         facts.status === "parsed" ? facts.slices.map(withoutDependencies) : [],
//     })),
//     edges,
//     findings: deriveFindings(edges, rootSlices),
//     coverage: {
//       status:
//         unparsed.length === 0 &&
//         withoutArchitecture.length === 0 &&
//         environmentRoots.size === 0
//           ? "complete"
//           : "partial",
//       unparsed_images: unparsed,
//       roots_without_architecture: withoutArchitecture,
//     },
//     limitations: [
//       ...DYLIB_RESOLUTION_LIMITATIONS,
//       ...(environmentRoots.size === 0
//         ? []
//         : [
//             `Roots ${[...environmentRoots].join(", ")} request applicable image-selection inputs through LC_DYLD_ENVIRONMENT that are not modeled; affected dependencies or inserted images remain uncertain.`,
//           ]),
//     ],
//   };
// };
//
// const withoutDependencies = (
//   slice: MachoSlice,
// ): Omit<MachoSlice, "dependencies"> => ({
//   architecture: slice.architecture,
//   slice_offset: slice.slice_offset,
//   slice_size: slice.slice_size,
//   cpu_type: slice.cpu_type,
//   cpu_subtype: slice.cpu_subtype,
//   fat_cpu_type: slice.fat_cpu_type,
//   fat_cpu_subtype: slice.fat_cpu_subtype,
//   fat_alignment_exponent: slice.fat_alignment_exponent,
//   file_type: slice.file_type,
//   file_type_code: slice.file_type_code,
//   platform: slice.platform,
//   platforms: slice.platforms,
//   install_name: slice.install_name,
//   rpaths: slice.rpaths,
//   dyld_environment: slice.dyld_environment,
//   code_signature_present: slice.code_signature_present,
// });
//
// const compare = (left: string, right: string): number =>
//   left < right ? -1 : left > right ? 1 : 0;
export const _l = 172;
