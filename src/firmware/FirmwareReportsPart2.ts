export const __stub = 1;
//       "inspect_firmware_regions",
//       "Expected one inspection-only report for the selected immutable input",
//     );
//   return analysis.file_map.map((hit) => {
//     if (hit.offset >= size || hit.size > size - hit.offset)
//       throw new AnalysisOutputError(
//         "inspect_firmware_regions",
//         "Reported region lies outside the selected file",
//       );
//     return {
//       provider_id: hit.id,
//       offset: hit.offset,
//       reported_size: hit.size,
//       signature: hit.name,
//       description: hit.description,
//       reported_confidence: hit.confidence,
//       size_basis: "provider_reported_validation_unknown" as const,
//     };
//   });
// };
//
// /** Normalize Unblob's unordered task graph, retaining unknown and failed analyses. */
// export const normalizeUnblobReport = (
//   raw: unknown,
//   context: {
//     inputPath: string;
//     outputRoot: string;
//     sha256: string;
//     length: number;
//     offset: number;
//     maxDepth: number;
//   },
// ) => {
//   const records = extraction.parse(raw);
//   const logical = (path: string) =>
//     firmwareLogicalPath(path, context.inputPath, context.outputRoot);
//   const roots = records.filter(
//     ({ task: item }) => item.path === context.inputPath && item.depth === 0,
//   );
//   if (roots.length !== 1)
//     throw new AnalysisOutputError(
//       "extract_firmware",
//       "Expected exactly one selected input task",
//     );
//   const rootHash = roots[0]?.reports.find(
//     (r) => r.__typename__ === "HashReport",
//   );
//   if (
//     rootHash === undefined ||
//     hashes.parse(rootHash).sha256 !== context.sha256
//   )
//     throw new AnalysisOutputError(
//       "extract_firmware",
//       "Unblob input hash disagrees with selected snapshot",
//     );
//   const files = new Map<
//     string,
//     { sha256: string | null; mimeType: string | null; depth: number }
//   >();
//   const sizes = new Map<string, number>();
//   const depths: string[] = [];
//   const failedExtractionStages: {
//     input_path: string;
//     provider_id: string | null;
//     handler: string | null;
//     dependencies: readonly string[];
//     kind: "missing-extractor-dependency" | "extractor-failure";
//   }[] = [];
//   const diagnostics: JsonValue[] = [];
//   const blobOrigins = new Map<string, BlobOrigin>();
//   const addBlobOrigin = (
//     parentPath: string,
//     id: string,
//     origin: BlobOrigin,
//   ) => {
//     const key = JSON.stringify([parentPath, id]);
//     if (blobOrigins.has(key))
//       throw new AnalysisOutputError(
//         "extract_firmware",
//         `Duplicate blob identity in parent task: ${parentPath} (${id})`,
//       );
//     blobOrigins.set(key, origin);
//   };
//   const chunks: {
//     input_path: string;
//     provider_id: string;
//     range: { offset: number; length: number };
//     handler: string | null;
//     encrypted: boolean | null;
//     root_file_range: { offset: number; length: number } | null;
//     extraction_failed: boolean;
//   }[] = [];
//   const seen = new Set<string>();
//   const taskFailures = new Set<string>();
//   type DependencyFacts = { readonly names: Set<string>; unnamed: boolean };
//   const missingDependencies = new Map<string, DependencyFacts>();
//   /** Dependencies reported by one chunk's extraction, keyed with its chunk id. */
//   const chunkMissingDependencies = new Map<string, DependencyFacts>();
//   const dependencyNames = (
//     reports: readonly unknown[],
//   ): DependencyFacts | null => {
//     const names = new Set<string>();
//     let unnamed = false;
//     let reported = false;
//     for (const item of reports) {
//       const parsed = missingDependency.safeParse(item);
//       if (!parsed.success) continue;
//       reported = true;
//       if (
//         parsed.data.dependencies.length === 0 ||
//         parsed.data.dependencies.includes("")
//       )
//         unnamed = true;
//       for (const name of parsed.data.dependencies)
//         if (name !== "") names.add(name);
//     }
//     return reported ? { names, unnamed } : null;
//   };
//   const dependencyRows = (
//     facts: DependencyFacts,
//   ): readonly { dependencies: readonly string[] }[] => [
//     ...(facts.names.size > 0
//       ? [{ dependencies: uniqueSorted([...facts.names]) }]
//       : []),
//     ...(facts.unnamed ? [{ dependencies: [] }] : []),
//   ];
//   const noteMissingDependencies = (
//     path: string,
//     reports: readonly unknown[],
//   ): void => {
//     const names = dependencyNames(reports);
//     // null means no accepted failure; [] means a definite dependency failure
//     // whose executable identity the producer left unavailable.
//     if (names === null) return;
//     const known = missingDependencies.get(path) ?? {
//       names: new Set<string>(),
//       unnamed: false,
//     };
//     for (const name of names.names) known.names.add(name);
//     known.unnamed ||= names.unnamed;
//     missingDependencies.set(path, known);
//   };
//   const noteChunkMissingDependencies = (
//     path: string,
//     chunkId: string,
//     reports: readonly unknown[],
export const _l = 146;
