export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import {
//   normalizeBinwalkReport,
//   normalizeUnblobReport,
// } from "./FirmwareReports.js";
//
// const context = {
//   inputPath: "/private/input.bin",
//   outputRoot: "/private/output",
//   sha256: "a".repeat(64),
//   length: 20,
//   offset: 64,
//   maxDepth: 3,
// };
// const root = () => ({
//   task: {
//     path: context.inputPath,
//     depth: 0,
//     blob_id: "",
//     is_multi_file: false,
//   },
//   reports: [
//     {
//       __typename__: "StatReport",
//       path: context.inputPath,
//       size: 20,
//       is_file: true,
//       is_dir: false,
//       is_link: false,
//       link_target: null,
//     },
//     { __typename__: "HashReport", sha256: context.sha256 },
//     {
//       __typename__: "UnknownChunkReport",
//       id: "unknown",
//       start_offset: 0,
//       end_offset: 20,
//       size: 20,
//       randomness: null,
//     },
//   ],
//   subtasks: [],
// });
//
// /** A chunk whose extraction failed on a missing dependency, when asked for it. */
// const nestedDependencyChunk = (id: string, offset: number) => ({
//   __typename__: "ChunkReport",
//   id,
//   start_offset: offset,
//   end_offset: offset + 10,
//   size: 10,
//   handler_name: `handler-${id}`,
//   is_encrypted: false,
//   extraction_reports:
//     id === "gzip-id"
//       ? [
//           {
//             __typename__: "ExtractorDependencyNotFoundReport",
//             severity: "ERROR",
//             dependencies: ["sasquatch"],
//           },
//         ]
//       : [],
// });
//
// describe("firmware producer chunk observations", () => {
//   it("retains unknown chunks and their selected original-file range", () => {
//     const normalized = normalizeUnblobReport([root()], context);
//     expect(normalized.coverage).toBe("partial");
//     expect(normalized.chunks[0]).toMatchObject({
//       handler: null,
//       range: { offset: 0, length: 20 },
//       root_file_range: { offset: 64, length: 20 },
//     });
//     expect(normalized.missing_dependencies).toEqual([]);
//   });
// });
//
// describe("firmware producer dependency ownership", () => {
//   it("derives missing extractor dependencies from chunk and multi-file reports", () => {
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: record.reports.filter(
//             (item) => item.__typename__ !== "UnknownChunkReport",
//           ),
//           subtasks: [
//             {
//               path: `${context.outputRoot}/rootfs`,
//               depth: 1,
//               blob_id: "sq-id",
//               is_multi_file: false,
//             },
//           ],
//         },
//         {
//           task: {
//             path: `${context.outputRoot}/rootfs`,
//             depth: 1,
//             blob_id: "sq-id",
//             is_multi_file: false,
//           },
//           reports: [
//             {
//               __typename__: "StatReport",
//               path: `${context.outputRoot}/rootfs`,
//               size: 0,
//               is_file: false,
//               is_dir: true,
//               is_link: false,
//               link_target: null,
//             },
//             {
//               __typename__: "MultiFileReport",
//               id: "sq-id",
//               handler_name: "squashfs",
//               name: "rootfs",
//               paths: [],
//               extraction_reports: [
//                 {
//                   __typename__: "ExtractorDependencyNotFoundReport",
//                   severity: "ERROR",
//                   dependencies: ["sasquatch"],
//                 },
//               ],
//             },
//           ],
//           subtasks: [],
//         },
//       ],
//       context,
//     );
//     expect(normalized.missing_dependencies).toEqual([]);
//     expect(normalized.failed_extraction_stages).toEqual([
//       {
//         input_path: "$output/rootfs",
//         provider_id: "sq-id",
//         handler: "squashfs",
//         dependencies: ["sasquatch"],
//         kind: "missing-extractor-dependency",
//       },
//     ]);
//     expect(normalized.chunk_missing_dependencies).toEqual([]);
//   });
//   it("orders chunk dependencies totally across provider ids", () => {
//     const record = root();
//     const chunkWithDependency = (id: string, offset: number) => ({
//       __typename__: "ChunkReport",
//       id,
//       start_offset: offset,
//       end_offset: offset + 10,
//       size: 10,
//       handler_name: `handler-${id}`,
//       is_encrypted: false,
//       extraction_reports: [
//         {
//           __typename__: "ExtractorDependencyNotFoundReport",
//           severity: "ERROR",
//           dependencies: [`${id}-tool`],
//         },
//       ],
//     });
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports.filter(
//               (item) => item.__typename__ !== "UnknownChunkReport",
//             ),
//             chunkWithDependency("b-id", 0),
//             chunkWithDependency("a-id", 10),
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.chunk_missing_dependencies).toEqual([
//       {
//         input_path: "$input",
//         provider_id: "a-id",
//         dependencies: ["a-id-tool"],
//       },
//       {
//         input_path: "$input",
//         provider_id: "b-id",
//         dependencies: ["b-id-tool"],
//       },
//     ]);
//   });
//   it("keeps chunk-nested dependency reports bound to their owning chunk", () => {
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports.filter(
//               (item) => item.__typename__ !== "UnknownChunkReport",
//             ),
//             nestedDependencyChunk("gzip-id", 0),
//             nestedDependencyChunk("other-id", 10),
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.missing_dependencies).toEqual([]);
//     expect(normalized.chunk_missing_dependencies).toEqual([
//       {
//         input_path: "$input",
//         provider_id: "gzip-id",
//         dependencies: ["sasquatch"],
//       },
//     ]);
//   });
// });
//
// describe("firmware dependency failures with unavailable identities", () => {
//   it.each([{ dependencies: [] }, { dependencies: ["", ""] }])(
//     "retains unnamed chunk dependency ownership ($dependencies)",
//     ({ dependencies }) => {
//       const record = root();
//       const normalized = normalizeUnblobReport(
//         [
//           {
//             ...record,
//             reports: [
//               ...record.reports.filter(
//                 (item) => item.__typename__ !== "UnknownChunkReport",
//               ),
//               {
//                 ...nestedDependencyChunk("gzip-id", 0),
//                 extraction_reports: [
export const _l = 236;
