export const __stub = 1;
//       },
//       source: {
//         ...derived,
//         operation: "trace_javascript_semantics",
//         parameters: {
//           query: {
//             seed: { kind: "property", name: "invoke" },
//             direction: "forward-influence",
//             include_ambiguous_dynamic_edges: false,
//             expected: null,
//           },
//         },
//         select: semanticBoundary,
//       },
//     },
//   ];
// };
//
// const bridgeClaims = (
//   subject: { readonly path: string; readonly sha256: string },
//   key: string,
//   members: readonly string[],
//   channel: string,
// ): readonly FixtureClaimExpectation[] => {
//   const source = {
//     operation: "analyze_javascript_application",
//     authority: "shipped-artifact",
//     confidence: "derived",
//     subject,
//   } satisfies Omit<FixtureClaimExpectation["source"], "select">;
//   return [
//     {
//       id: "renderer_api",
//       expectedValue: {
//         key,
//         members: [...members],
//         world: "main",
//         source: "preload.js",
//       },
//       source: { ...source, select: rendererApi },
//     },
//     {
//       id: "renderer_ipc",
//       expectedValue: {
//         channel,
//         operation: "invoke",
//         source: "preload.js",
//       },
//       source: { ...source, select: ipcOperation("renderer") },
//     },
//     {
//       id: "main_ipc",
//       expectedValue: {
//         channel,
//         operation: "handle",
//         source: "main.js",
//       },
//       source: { ...source, select: ipcOperation("main") },
//     },
//     {
//       id: "preload",
//       expectedValue: { path: "preload.js", resolution_status: "resolved" },
//       source: { ...source, select: preload },
//     },
//   ];
// };
//
// const asarClaims = (
//   targets: AgentEvaluationFixtureTargets,
// ): readonly FixtureClaimExpectation[] =>
//   bridgeClaims(
//     { path: targets.javascript, sha256: targets.javascriptSha256 },
//     "profileApi",
//     ["read"],
//     "profile:read",
//   );
//
// const parserClaims = (
//   targets: AgentEvaluationFixtureTargets,
// ): readonly FixtureClaimExpectation[] => {
//   const source = {
//     operation: "compare_javascript_export_shapes",
//     authority: "analyst-inference",
//     confidence: "inferred",
//     parameters: {
//       left_module_path: "parser.mjs",
//       left_export_name: "default",
//       right_module_path: "parser.mjs",
//       right_export_name: "default",
//     },
//     linkedSubjects: [
//       {
//         operation: "analyze_javascript_application",
//         path: targets.javascriptShapeLeft,
//       },
//       {
//         operation: "analyze_javascript_application",
//         path: targets.javascriptShapeRight,
//       },
//     ],
//   } satisfies Omit<FixtureClaimExpectation["source"], "select">;
//   return [
//     {
//       id: "heading_change",
//       expectedValue: {
//         status: "added",
//         path: "/depth",
//         discriminant: { path: "/type", value: "heading" },
//         left: { availability: "absent" },
//         right: { availability: "literal", value: 1 },
//       },
//       source: { ...source, select: headingChange },
//     },
//     {
//       id: "comparison_coverage",
//       expectedValue: {
//         status: "complete-within-inputs",
//         paired_variants: 3,
//         added: 1,
//         removed: 0,
//         changed: 0,
//         unknown: 0,
//       },
//       source: { ...source, select: comparisonCoverage },
//     },
//     {
//       id: "runtime_semantics",
//       expectedValue: "not_established",
//       source: { ...source, select: runtimeSemantics },
//     },
//   ];
// };
//
// const managedMembers = ({ evidence }: FixtureClaimContext) => {
//   const { result } = parseManagedInspectionEvidence(
//     evidence,
//     "inspect_managed_members",
//     managedMemberInspectionSchema,
//   );
//   if (
//     result.coverage.state !== "complete" ||
//     result.metadata.status !== "complete" ||
export const _l = 142;
