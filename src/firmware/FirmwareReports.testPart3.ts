export const __stub = 1;
//     expect(normalized.chunk_missing_dependencies).toEqual([
//       {
//         input_path: "$input",
//         provider_id: "gzip-id",
//         dependencies: ["sasquatch"],
//       },
//       { input_path: "$input", provider_id: "gzip-id", dependencies: [] },
//     ]);
//   });
//   it("preserves unfamiliar report types as explicit diagnostics", () => {
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports,
//             { __typename__: "FutureError", reason: "new producer facet" },
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.diagnostics).toEqual([
//       {
//         input_path: "$input",
//         report: { __typename__: "FutureError", reason: "new producer facet" },
//       },
//     ]);
//     expect(normalized.coverage).toBe("partial");
//   });
// });
//
// describe("Unblob multi-file extraction diagnostics", () => {
//   it("names a missing extractor dependency and stage while retaining the raw report", () => {
//     const dependencyFailure = {
//       __typename__: "ExtractorDependencyNotFoundReport",
//       severity: "ERROR",
//       dependencies: ["sasquatch"],
//     };
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports.filter(
//               (item) => item.__typename__ !== "UnknownChunkReport",
//             ),
//             {
//               __typename__: "ChunkReport",
//               id: "gzip-id",
//               start_offset: 0,
//               end_offset: 20,
//               size: 20,
//               handler_name: "gzip",
//               is_encrypted: false,
//               extraction_reports: [dependencyFailure],
//             },
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.coverage).toBe("partial");
//     expect(normalized.diagnostics).toEqual([
//       {
//         input_path: "$input",
//         stage: "gzip",
//         missing_dependencies: ["sasquatch"],
//         report: dependencyFailure,
//       },
//     ]);
//   });
// });
//
// describe("Unblob task derivation identities", () => {
//   it("joins chunk and MultiFile derivations to their producer blob reports", () => {
//     const outputPath = `${context.outputRoot}/multi`;
//     const chunkPath = `${context.outputRoot}/chunk-child`;
//     const childTask = {
//       path: outputPath,
//       depth: 1,
//       blob_id: "multi-id",
//       is_multi_file: false,
//     };
//     const extractionFailure = {
//       __typename__: "ExtractorDependencyNotFoundReport",
//       severity: "ERROR",
//       dependencies: ["sasquatch"],
//     };
//     const multiFileReport = {
//       __typename__: "MultiFileReport",
//       id: "multi-id",
//       handler_name: "multipart-firmware",
//       name: "rootfs",
//       paths: [`${outputPath}/part-a`, `${outputPath}/part-b`],
//       extraction_reports: [extractionFailure],
//     };
//     const parent = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...parent,
//           reports: [
//             ...parent.reports.filter(
//               (item) => item.__typename__ !== "UnknownChunkReport",
//             ),
//             {
//               __typename__: "ChunkReport",
//               id: "chunk-id",
//               start_offset: 4,
//               end_offset: 10,
//               size: 6,
//               handler_name: "gzip",
//               is_encrypted: false,
//               extraction_reports: [],
//             },
//             multiFileReport,
//           ],
//           subtasks: [
//             {
//               path: chunkPath,
//               depth: 1,
//               blob_id: "chunk-id",
//               is_multi_file: false,
//             },
//             childTask,
//           ],
//         },
//         {
//           task: {
//             path: chunkPath,
//             depth: 1,
//             blob_id: "chunk-id",
//             is_multi_file: false,
//           },
//           reports: [
//             {
//               __typename__: "StatReport",
//               path: chunkPath,
//               size: 4,
//               is_file: true,
//               is_dir: false,
//               is_link: false,
//               link_target: null,
//             },
//           ],
//           subtasks: [],
//         },
//         {
//           task: childTask,
//           reports: [
//             {
//               __typename__: "StatReport",
//               path: outputPath,
//               size: 0,
//               is_dir: true,
//               is_file: false,
//               is_link: false,
//               link_target: null,
//             },
//           ],
//           subtasks: [],
//         },
//       ],
//       context,
//     );
//
//     expect(normalized.coverage).toBe("partial");
//     expect(normalized.derivations).toEqual([
//       {
//         parent_path: "$input",
//         child_path: "$output/chunk-child",
//         provider_blob_id: "chunk-id",
//         handler: "gzip",
//         parent_file_range: { offset: 4, length: 6 },
//       },
//       {
//         parent_path: "$input",
//         child_path: "$output/multi",
//         provider_blob_id: "multi-id",
//         handler: "multipart-firmware",
//         parent_file_range: null,
//       },
//     ]);
//     expect(normalized.diagnostics).toEqual([
//       {
//         input_path: "$input",
//         stage: "multipart-firmware",
//         missing_dependencies: ["sasquatch"],
//         report: multiFileReport,
//       },
//     ]);
//     expect(normalized.failed_extraction_stages).toEqual([
//       {
//         input_path: "$input",
//         provider_id: "multi-id",
//         handler: "multipart-firmware",
//         dependencies: ["sasquatch"],
//         kind: "missing-extractor-dependency",
//       },
//     ]);
//   });
// });
//
// describe("failed multi-file extraction stages", () => {
//   it("records a failed multi-file stage for a recovery row without chunks", () => {
//     const outputPath = `${context.outputRoot}/multi`;
//     const childTask = {
//       path: outputPath,
//       depth: 1,
//       blob_id: "multi-id",
//       is_multi_file: true,
//     };
//     const stageFailure = {
//       __typename__: "ExtractorExecutionErrorReport",
//       severity: "ERROR",
//       handler: "multipart-firmware",
//     };
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...root(),
//           reports: root().reports.filter(
//             (item) => item.__typename__ !== "UnknownChunkReport",
//           ),
//           subtasks: [childTask],
//         },
//         {
//           task: childTask,
//           reports: [
//             {
//               __typename__: "StatReport",
//               path: outputPath,
//               size: 0,
export const _l = 236;
