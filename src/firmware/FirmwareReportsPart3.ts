export const __stub = 1;
//   ): void => {
//     const names = dependencyNames(reports);
//     if (names === null) return;
//     const key = JSON.stringify([path, chunkId]);
//     const known = chunkMissingDependencies.get(key) ?? {
//       names: new Set<string>(),
//       unnamed: false,
//     };
//     for (const name of names.names) known.names.add(name);
//     known.unnamed ||= names.unnamed;
//     chunkMissingDependencies.set(key, known);
//   };
//   for (const record of records) {
//     const path = logical(record.task.path);
//     if (seen.has(path))
//       throw new AnalysisOutputError(
//         "extract_firmware",
//         `Duplicate analysis task: ${path}`,
//       );
//     seen.add(path);
//     if (record.task.depth >= context.maxDepth) depths.push(path);
//     const metadata = record.reports.find(
//       (r) => r.__typename__ === "StatReport",
//     );
//     if (metadata === undefined)
//       throw new AnalysisOutputError(
//         "extract_firmware",
//         `Missing StatReport: ${path}`,
//       );
//     const parsedStat = stat.parse(metadata);
//     if (parsedStat.path !== record.task.path)
//       throw new AnalysisOutputError(
//         "extract_firmware",
//         `StatReport is bound to another task: ${path}`,
//       );
//     if (path === "$input" && parsedStat.size !== context.length)
//       throw new AnalysisOutputError(
//         "extract_firmware",
//         "Unblob input size disagrees with selected snapshot",
//       );
//     if (
//       path === "$input" &&
//       (!parsedStat.is_file || parsedStat.is_link || parsedStat.is_dir)
//     )
//       throw new AnalysisOutputError(
//         "extract_firmware",
//         "Selected input was not reported as a regular file",
//       );
//     sizes.set(path, parsedStat.size);
//     const hash = record.reports.find((r) => r.__typename__ === "HashReport");
//     const magic = record.reports.find(
//       (r) => r.__typename__ === "FileMagicReport",
//     );
//     if (parsedStat.is_file && !parsedStat.is_link)
//       files.set(path, {
//         sha256: hash === undefined ? null : hashes.parse(hash).sha256,
//         mimeType:
//           magic === undefined
//             ? null
//             : z.object({ mime_type: z.string() }).parse(magic).mime_type,
//         depth: record.task.depth,
//       });
//     for (const item of record.reports) {
//       if (!known.has(item.__typename__))
//         diagnostics.push(
//           jsonValueSchema.parse({ input_path: path, report: item }),
//         );
//       noteMissingDependencies(path, [item]);
//       if (
//         item.__typename__ === "ExtractorExecutionErrorReport" &&
//         !taskFailures.has(path)
//       ) {
//         taskFailures.add(path);
//         failedExtractionStages.push({
//           input_path: path,
//           provider_id: null,
//           handler: null,
//           dependencies: [],
//           kind: "extractor-failure",
//         });
//       }
//       if (
//         item.__typename__ === "ChunkReport" ||
//         item.__typename__ === "UnknownChunkReport"
//       ) {
//         const parsed = region.parse(item);
//         if (
//           parsed.end_offset <= parsed.start_offset ||
//           parsed.end_offset > parsedStat.size ||
//           parsed.size !== parsed.end_offset - parsed.start_offset
//         )
//           throw new AnalysisOutputError(
//             "extract_firmware",
//             `Invalid chunk bounds for ${path}`,
//           );
//         const detail =
//           item.__typename__ === "ChunkReport"
//             ? z
//                 .object({
//                   handler_name: z.string(),
//                   is_encrypted: z.boolean(),
//                   extraction_reports: z.array(jsonValueSchema),
//                 })
//                 .parse(item)
//             : null;
//         const extractionFailed =
//           detail !== null && detail.extraction_reports.length > 0;
//         if (detail !== null)
//           for (const problem of detail.extraction_reports) {
//             diagnostics.push(
//               extractionDiagnostic(
//                 path,
//                 detail.handler_name,
//                 jsonValueSchema.parse(problem),
//               ),
//             );
//             // Nested under one chunk: keep the owning chunk, not the whole task.
//             noteChunkMissingDependencies(path, parsed.id, [problem]);
//           }
//         addBlobOrigin(path, parsed.id, {
//           handler: detail?.handler_name ?? null,
//           range: { offset: parsed.start_offset, length: parsed.size },
//         });
//         chunks.push({
//           input_path: path,
//           provider_id: parsed.id,
//           range: { offset: parsed.start_offset, length: parsed.size },
//           handler: detail?.handler_name ?? null,
//           encrypted: detail?.is_encrypted ?? null,
//           extraction_failed: extractionFailed,
//           root_file_range:
//             path === "$input"
//               ? {
//                   offset: context.offset + parsed.start_offset,
//                   length: parsed.size,
//                 }
//               : null,
//         });
//       }
//       if (item.__typename__ === "MultiFileReport") {
//         const parsed = multiFile.parse(item);
//         addBlobOrigin(path, parsed.id, {
//           handler: parsed.handler_name,
//           range: null,
//         });
//         if (parsed.extraction_reports.length > 0) {
export const _l = 146;
