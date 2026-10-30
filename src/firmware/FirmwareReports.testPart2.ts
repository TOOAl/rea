export const __stub = 1;
//                   {
//                     __typename__: "ExtractorDependencyNotFoundReport",
//                     severity: "ERROR",
//                     dependencies,
//                   },
//                 ],
//               },
//             ],
//           },
//         ],
//         context,
//       );
//       expect(normalized.missing_dependencies).toEqual([]);
//       expect(normalized.chunk_missing_dependencies).toEqual([
//         {
//           input_path: "$input",
//           provider_id: "gzip-id",
//           dependencies: [],
//         },
//       ]);
//     },
//   );
//   it("retains the missing-dependency reason on an unnamed multi-file stage", () => {
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports,
//             {
//               __typename__: "MultiFileReport",
//               id: "multi-id",
//               handler_name: "multipart-firmware",
//               name: "parts",
//               paths: [],
//               extraction_reports: [
//                 {
//                   __typename__: "ExtractorDependencyNotFoundReport",
//                   severity: "ERROR",
//                   dependencies: [],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.failed_extraction_stages).toEqual([
//       {
//         input_path: "$input",
//         provider_id: "multi-id",
//         handler: "multipart-firmware",
//         dependencies: [],
//         kind: "missing-extractor-dependency",
//       },
//     ]);
//   });
//   it("retains named and unnamed dependency reports on one multi-file stage", () => {
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports,
//             {
//               __typename__: "MultiFileReport",
//               id: "multi-id",
//               handler_name: "multipart-firmware",
//               name: "parts",
//               paths: [],
//               extraction_reports: [
//                 {
//                   __typename__: "ExtractorDependencyNotFoundReport",
//                   severity: "ERROR",
//                   dependencies: ["sasquatch"],
//                 },
//                 {
//                   __typename__: "ExtractorDependencyNotFoundReport",
//                   severity: "ERROR",
//                   dependencies: [],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.failed_extraction_stages).toEqual([
//       {
//         input_path: "$input",
//         provider_id: "multi-id",
//         handler: "multipart-firmware",
//         dependencies: ["sasquatch"],
//         kind: "missing-extractor-dependency",
//       },
//       {
//         input_path: "$input",
//         provider_id: "multi-id",
//         handler: "multipart-firmware",
//         dependencies: [],
//         kind: "missing-extractor-dependency",
//       },
//     ]);
//   });
// });
//
// describe("firmware producer chunk failures", () => {
//   it("marks chunks whose extraction reported problems", () => {
//     const record = root();
//     const failing = {
//       __typename__: "ChunkReport",
//       id: "zip-id",
//       start_offset: 0,
//       end_offset: 20,
//       size: 20,
//       handler_name: "zip",
//       is_encrypted: false,
//       extraction_reports: [
//         { __typename__: "SomeProducerFailure", severity: "ERROR" },
//       ],
//     };
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports.filter(
//               (item) => item.__typename__ !== "UnknownChunkReport",
//             ),
//             failing,
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.chunks).toHaveLength(1);
//     expect(normalized.chunks[0]).toMatchObject({
//       handler: "zip",
//       extraction_failed: true,
//     });
//     expect(normalized.coverage).toBe("partial");
//   });
// });
//
// describe("firmware task dependency failures", () => {
//   it.each([{ dependencies: [] }, { dependencies: ["", ""] }])(
//     "retains unnamed dependency failures ($dependencies)",
//     ({ dependencies }) => {
//       const record = root();
//       const normalized = normalizeUnblobReport(
//         [
//           {
//             ...record,
//             reports: [
//               ...record.reports,
//               {
//                 __typename__: "ExtractorDependencyNotFoundReport",
//                 severity: "ERROR",
//                 dependencies,
//               },
//             ],
//           },
//         ],
//         context,
//       );
//       expect(normalized.missing_dependencies).toEqual([
//         { input_path: "$input", dependencies: [] },
//       ]);
//       expect(normalized.diagnostics).toHaveLength(1);
//     },
//   );
//   it("retains named and unnamed task dependency reports together", () => {
//     const record = root();
//     const normalized = normalizeUnblobReport(
//       [
//         {
//           ...record,
//           reports: [
//             ...record.reports,
//             {
//               __typename__: "ExtractorDependencyNotFoundReport",
//               severity: "ERROR",
//               dependencies: ["sasquatch"],
//             },
//             {
//               __typename__: "ExtractorDependencyNotFoundReport",
//               severity: "ERROR",
//               dependencies: [],
//             },
//           ],
//         },
//       ],
//       context,
//     );
//     expect(normalized.missing_dependencies).toEqual([
//       { input_path: "$input", dependencies: ["sasquatch"] },
//       { input_path: "$input", dependencies: [] },
//     ]);
//   });
// });
//
// describe("firmware chunk dependency failures", () => {
//   it("retains named and unnamed dependency reports on one chunk", () => {
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
//               ...nestedDependencyChunk("gzip-id", 0),
//               extraction_reports: [
//                 {
//                   __typename__: "ExtractorDependencyNotFoundReport",
//                   severity: "ERROR",
//                   dependencies: ["sasquatch"],
//                 },
//                 {
//                   __typename__: "ExtractorDependencyNotFoundReport",
//                   severity: "ERROR",
//                   dependencies: [],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//       context,
//     );
export const _l = 236;
