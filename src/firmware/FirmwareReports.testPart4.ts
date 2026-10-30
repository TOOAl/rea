export const __stub = 1;
//               is_dir: true,
//               is_file: false,
//               is_link: false,
//               link_target: null,
//             },
//             {
//               __typename__: "MultiFileReport",
//               id: "multi-id",
//               handler_name: "multipart-firmware",
//               name: "rootfs",
//               paths: [`${outputPath}/part-a`],
//               extraction_reports: [stageFailure],
//             },
//           ],
//           subtasks: [],
//         },
//       ],
//       context,
//     );
//     expect(normalized.failed_extraction_stages).toEqual([
//       {
//         input_path: "$output/multi",
//         provider_id: "multi-id",
//         handler: "multipart-firmware",
//         dependencies: [],
//         kind: "extractor-failure",
//       },
//     ]);
//     expect(normalized.missing_dependencies).toEqual([]);
//   });
// });
//
// describe("Unblob blob identity validation", () => {
//   it("joins reports within each parent, allows missing provenance and rejects local duplicates", () => {
//     const rootChild = {
//       path: `${context.outputRoot}/root-child`,
//       depth: 1,
//       blob_id: "shared-id",
//       is_multi_file: false,
//     };
//     const containerTask = {
//       path: `${context.outputRoot}/container`,
//       depth: 1,
//       blob_id: "container-id",
//       is_multi_file: false,
//     };
//     const nestedChild = {
//       path: `${context.outputRoot}/container/nested-child`,
//       depth: 2,
//       blob_id: "shared-id",
//       is_multi_file: false,
//     };
//     const fileRecord = <T extends { path: string }>(task: T) => ({
//       task,
//       reports: [
//         {
//           __typename__: "StatReport",
//           path: task.path,
//           size: 1,
//           is_file: true,
//           is_dir: false,
//           is_link: false,
//           link_target: null,
//         },
//       ],
//       subtasks: [],
//     });
//     const chunk = (
//       id: string,
//       handler: string,
//       start: number,
//       end: number,
//     ) => ({
//       __typename__: "ChunkReport",
//       id,
//       start_offset: start,
//       end_offset: end,
//       size: end - start,
//       handler_name: handler,
//       is_encrypted: false,
//       extraction_reports: [],
//     });
//     const base = root();
//     const rootReports = [
//       ...base.reports.filter(
//         (report) => report.__typename__ !== "UnknownChunkReport",
//       ),
//       chunk("shared-id", "root-handler", 0, 4),
//       chunk("container-id", "container-handler", 4, 10),
//     ];
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...base,
//           reports: rootReports,
//           subtasks: [rootChild, containerTask],
//         },
//         fileRecord(rootChild),
//         {
//           task: containerTask,
//           reports: [
//             {
//               __typename__: "StatReport",
//               path: containerTask.path,
//               size: 10,
//               is_file: true,
//               is_dir: false,
//               is_link: false,
//               link_target: null,
//             },
//             chunk("shared-id", "nested-handler", 2, 5),
//           ],
//           subtasks: [nestedChild],
//         },
//         fileRecord(nestedChild),
//       ],
//       context,
//     );
//
//     expect(normalized.derivations).toMatchObject([
//       { handler: "root-handler", parent_file_range: { offset: 0, length: 4 } },
//       {
//         handler: "container-handler",
//         parent_file_range: { offset: 4, length: 6 },
//       },
//       {
//         handler: "nested-handler",
//         parent_file_range: { offset: 2, length: 3 },
//       },
//     ]);
//
//     const noOrigin = {
//       ...base,
//       reports: base.reports.filter(
//         (report) => report.__typename__ !== "UnknownChunkReport",
//       ),
//       subtasks: [rootChild],
//     };
//     expect(
//       normalizeUnblobReport([noOrigin, fileRecord(rootChild)], context)
//         .derivations[0],
//     ).toMatchObject({ handler: null, parent_file_range: null });
//
//     expect(() =>
//       normalizeUnblobReport(
//         [
//           {
//             ...base,
//             reports: [...rootReports, chunk("shared-id", "duplicate", 10, 12)],
//             subtasks: [rootChild],
//           },
//           fileRecord(rootChild),
//         ],
//         context,
//       ),
//     ).toThrow("Duplicate blob identity in parent task");
//   });
// });
//
// describe("firmware producer boundaries", () => {
//   it("rejects unknown tasks outside the owned output and disconnected task graphs", () => {
//     const record = root();
//     for (const path of [
//       "/private/output/../escaped",
//       "/private/output/unconnected",
//     ]) {
//       const child = { ...record, task: { ...record.task, path, depth: 1 } };
//       expect(() => normalizeUnblobReport([record, child], context)).toThrow();
//     }
//   });
//   it("rejects absent root identity, inconsistent chunk bounds and duplicate tasks", () => {
//     const record = root();
//     expect(() => normalizeUnblobReport([], context)).toThrow("exactly one");
//     expect(() =>
//       normalizeUnblobReport(
//         [
//           {
//             ...record,
//             reports: record.reports.filter(
//               (report) => report.__typename__ !== "HashReport",
//             ),
//           },
//         ],
//         context,
//       ),
//     ).toThrow("hash");
//     expect(() =>
//       normalizeUnblobReport(
//         [
//           {
//             ...record,
//             reports: [
//               ...record.reports,
//               {
//                 __typename__: "UnknownChunkReport",
//                 id: "bad",
//                 start_offset: 10,
//                 end_offset: 21,
//                 size: 11,
//               },
//             ],
//           },
//         ],
//         context,
//       ),
//     ).toThrow("bounds");
//     expect(() => normalizeUnblobReport([record, record], context)).toThrow(
//       "exactly one",
//     );
//   });
//   it("rejects empty, combined and extracting Binwalk reports", () => {
//     const record = {
//       Analysis: { file_path: context.inputPath, file_map: [], extractions: {} },
//     };
//     expect(normalizeBinwalkReport([record], context.inputPath, 20)).toEqual([]);
//     for (const report of [
//       [],
//       [record, record],
//       [
//         {
//           Analysis: {
//             ...record.Analysis,
//             extractions: { hit: { status: "success" } },
//           },
//         },
//       ],
//     ])
//       expect(() =>
//         normalizeBinwalkReport(report, context.inputPath, 20),
//       ).toThrow();
//   });
// });
export const _l = 232;
