export const __stub = 1;
//   (value: JsonValue): JsonValue | undefined => {
//     const observation = singleObservation(
//       value,
//       "ipc-channel",
//       (candidate) => candidate.properties.side === side,
//     );
//     if (observation === undefined) return undefined;
//     const { channel, operation } = observation.properties;
//     const source = observationSource(observation);
//     if (
//       channel === undefined ||
//       operation === undefined ||
//       source === undefined
//     )
//       return undefined;
//     return { channel, operation, source };
//   };
//
// const preload = (value: JsonValue): JsonValue | undefined => {
//   const observation = singleObservation(
//     value,
//     "electron-preload",
//     (candidate) =>
//       candidate.properties.mechanism === "BrowserWindow:webPreferences.preload",
//   );
//   const path = observation?.properties.resolved_path;
//   const resolutionStatus = observation?.properties.resolution_status;
//   if (path === undefined || resolutionStatus === undefined) return undefined;
//   return { path, resolution_status: resolutionStatus };
// };
//
// const headingChange = (value: JsonValue): JsonValue | undefined => {
//   const result = javaScriptExportShapeComparisonResultSchema.safeParse(value);
//   if (!result.success) return undefined;
//   const changes = result.data.changes.filter(
//     (change) => change.path === "/depth",
//   );
//   const change = changes.length === 1 ? changes[0] : undefined;
//   if (change === undefined) return undefined;
//   return {
//     status: change.status,
//     path: change.path,
//     discriminant: change.discriminant,
//     left: change.left,
//     right: change.right,
//   };
// };
//
// const comparisonCoverage = (value: JsonValue): JsonValue | undefined => {
//   const result = javaScriptExportShapeComparisonResultSchema.safeParse(value);
//   if (!result.success) return undefined;
//   return {
//     status: result.data.coverage.status,
//     paired_variants: result.data.coverage.paired_variants,
//     ...result.data.summary,
//   };
// };
//
// const runtimeSemantics = (value: JsonValue): JsonValue | undefined => {
//   const result = javaScriptExportShapeComparisonResultSchema.safeParse(value);
//   return result.success &&
//     result.data.limitations.includes(
//       "Return shapes are inferred from inert syntax and do not prove runtime behavior.",
//     )
//     ? "not_established"
//     : undefined;
// };
//
// const featureModules = (value: JsonValue): JsonValue | undefined => {
//   const result = applicationFeatureTraceResultSchema.safeParse(value);
//   if (!result.success || result.data.graph === null) return undefined;
//   if (
//     result.data.seed.kind !== "channel" ||
//     result.data.seed.value !== "notes:export" ||
//     featureSeedMatchMode(result.data.seed) !== "exact"
//   )
//     return undefined;
//   const paths = result.data.graph.nodes
//     .filter((node) => node.kind === "javascript-module")
//     .flatMap((node) => node.observations)
//     .filter(({ properties }) => properties.semantic_role === "source-module")
//     .map(({ properties }) => properties.path);
//   if (paths.length === 0 || !paths.every((path) => typeof path === "string"))
//     return undefined;
//   return {
//     paths: [...new Set(paths)].sort(compareUnicodeCodePoints),
//     coverage: result.data.coverage.status,
//   };
// };
//
// const semanticBoundary = (value: JsonValue): JsonValue | undefined => {
//   const result = javaScriptSemanticTraceResultSchema.safeParse(value);
//   if (!result.success) return undefined;
//   return {
//     status: result.data.status,
//     coverage: result.data.coverage.status,
//     relevant_unknowns: result.data.summary.relevant_unknowns,
//   };
// };
//
// const notesClaims = (
//   targets: AgentEvaluationFixtureTargets,
// ): readonly FixtureClaimExpectation[] => {
//   const subject = {
//     path: targets.notesElectron,
//     sha256: targets.notesElectronSha256,
//   };
//   const derived = {
//     authority: "analyst-inference",
//     confidence: "inferred",
//     linkedSubjects: [
//       { operation: "analyze_javascript_application", ...subject },
//     ],
//   } satisfies Pick<
//     FixtureClaimExpectation["source"],
//     "authority" | "confidence" | "linkedSubjects"
//   >;
//   // Fixture source establishes bridge/module facts; the semantic claim checks
//   // the bounded static-query contract, not execution or CSV formatter behavior.
//   return [
//     ...bridgeClaims(subject, "notes", ["exportCsv"], "notes:export"),
//     {
//       id: "feature_modules",
//       expectedValue: {
//         paths: ["csv.js", "main.js", "preload.js", "renderer.js"],
//         coverage: "complete-within-source",
//       },
//       source: {
//         ...derived,
//         operation: "trace_application_feature",
//         parameters: {
//           direction: "both",
//         },
//         select: featureModules,
//       },
//     },
//     {
//       id: "semantic_boundary",
//       expectedValue: {
//         status: "ambiguous",
//         coverage: "partial",
//         relevant_unknowns: 1,
export const _l = 142;
