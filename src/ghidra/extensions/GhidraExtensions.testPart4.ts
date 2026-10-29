export const __stub = 1;
//           {
//             address: "0x402000",
//             type: "/NativeAOT/MethodTables/Class_00402000_MT",
//           },
//         ],
//         derived_memory: {
//           address: "0x402000",
//           size_bytes: 64,
//           sha256: "a".repeat(64),
//           file_offset: null,
//         },
//         coverage: {
//           frozen_object_candidates: 1,
//           frozen_objects_annotated: 1,
//           basis: "rehydrated-pointer-candidates-and-committed-instance-types",
//         },
//       },
//     };
//     expect(validateGhidraExtensionResults([extension], [positive])).toBeNull();
//     const incomplete = {
//       ...positive,
//       result: {
//         ...positive.result,
//         coverage: {
//           frozen_object_candidates: 2,
//           frozen_objects_annotated: 1,
//           basis: "rehydrated-pointer-candidates-and-committed-instance-types",
//         },
//       },
//     };
//     expect(validateGhidraExtensionResults([extension], [incomplete])).toBe(
//       "NativeAOT recovery coverage contradicts its reported completion status.",
//     );
//     expect(
//       validateGhidraExtensionResults(
//         [extension],
//         [
//           {
//             ...incomplete,
//             status: "partial",
//             result: { ...incomplete.result, status: "partial" },
//           },
//         ],
//       ),
//     ).toBeNull();
//     expect(
//       validateGhidraExtensionResults(
//         [extension],
//         [{ ...positive, result: { ...positive.result, discovery: null } }],
//       ),
//     ).toBe(
//       "NativeAOT extension returned a malformed or inconsistent producer report.",
//     );
//   });
//   it("preserves real loader failures without requiring a successful analyzer report", async () => {
//     const { extension } = await artifact();
//     const reason = "Extension loading/analysis failed: ClassNotFoundException";
//     expect(
//       validateGhidraExtensionResults(
//         [extension],
//         [
//           {
//             id: "nativeaot",
//             sha256: extension.sha256,
//             status: "failed",
//             reason,
//             result: { loader_failure: reason },
//           },
//         ],
//       ),
//     ).toBeNull();
//   });
//   it("does not accept complete recovery without format and byte identities", async () => {
//     const { extension } = await artifact();
//     const incomplete = result(extension.sha256);
//     incomplete.result.status = "complete";
//     incomplete.result.reason = null;
//     expect(
//       validateGhidraExtensionResults(
//         [extension],
//         [{ ...incomplete, status: "complete", reason: null }],
//       ),
//     ).toBe(
//       "NativeAOT recovery omitted its supported format, method-table inventory or derived-memory identity.",
//     );
//   });
//   it.each(["not_applicable", "unsupported", "failed"] as const)(
//     "rejects contradictory %s reports without discarding discovery context",
//     async (status) => {
//       const { extension } = await artifact();
//       const unavailable = result(extension.sha256);
//       const report = {
//         ...unavailable,
//         status,
//         result: {
//           ...unavailable.result,
//           status,
//           header_address: "0x401000",
//           discovery: "signature-heuristic",
//           format_major: 9,
//           format_minor: 1,
//         },
//       } satisfies GhidraExtensionResult;
//       expect(validateGhidraExtensionResults([extension], [report])).toBeNull();
//       expect(
//         validateGhidraExtensionResults(
//           [extension],
//           [{ ...report, result: { ...report.result, method_tables: 1 } }],
//         ),
//       ).toBe("NativeAOT non-recovery status carries recovered metadata.");
//       for (const reason of [null, "", " "] as const)
//         expect(
//           validateGhidraExtensionResults(
//             [extension],
//             [
//               {
//                 ...report,
//                 reason,
//                 result: { ...report.result, reason },
//               },
//             ],
//           ),
//         ).toBe("NativeAOT non-recovery status omits its required reason.");
//     },
//   );
// });
export const _l = 126;
