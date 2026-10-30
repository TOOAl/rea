export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import { TraceMap } from "@jridgewell/trace-mapping";
//
// import {
//   createJavaScriptApplicationGraph,
//   createJavaScriptApplicationNode,
// } from "./javascriptApplicationGraph.js";
// import type { ApplicationNode } from "./javascriptApplicationGraphSchemas.js";
// import { createHistoricalSourceGraph } from "../referenceSourceGraph.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import { compareSourceToBundle } from "./sourceToBundleComparison.js";
// import {
//   SOURCE_TO_BUNDLE_SIGNAL_WEIGHTS,
//   sourceToBundleComparisonResultSchema,
// } from "./sourceToBundleComparisonSchemas.js";
// import {
//   artifactEvidence,
//   sourceMapReference,
// } from "./javascriptApplicationGraph.fixture.js";
//
// const HASH = {
//   artifact: "1".repeat(64),
//   unchanged: "2".repeat(64),
//   modified: "3".repeat(64),
//   removed: "4".repeat(64),
//   split: "5".repeat(64),
//   merged: "6".repeat(64),
//   duplicated: "7".repeat(64),
// } as const;
// const EVIDENCE_ID = `ev_${"a".repeat(64)}`;
//
// describe("historical source to bundle comparison", () => {
//   it("matches an unchanged JSON source artifact by its exact content digest", () => {
//     const path = "src/data.json";
//     const artifact = createJavaScriptApplicationNode({
//       kind: "artifact",
//       identity: {
//         strategy: "content-digest",
//         stability: "global-exact",
//         sha256: HASH.unchanged,
//       },
//       observations: [
//         {
//           label: path,
//           properties: { path, file_kind: "json" },
//           evidence: artifactEvidence(HASH.unchanged, path),
//         },
//       ],
//     });
//     const result = compareSourceToBundle({
//       reference: historicalGraph("complete", [path]),
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph: createJavaScriptApplicationGraph({
//           schema: "JavaScriptApplicationGraph",
//           root_node_ids: [artifact.node_id],
//           nodes: [artifact],
//           edges: [],
//           coverage: {
//             status: "complete",
//             truncated: false,
//             omitted_count: 0,
//             limits: [],
//           },
//           limitations: [],
//         }),
//       },
//     });
//
//     expect(item(result, path)).toMatchObject({
//       status: "unchanged",
//       confidence: "exact",
//       current_node_ids: [artifact.node_id],
//       candidates: [
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({ kind: "exact-source-digest" }),
//           ]),
//         }),
//       ],
//     });
//   });
//
//   it("classifies exact, changed, absent, split, and merged mappings stably", () => {
//     const reference = historicalGraph("complete");
//     const graph = applicationGraph("complete");
//     const input = {
//       reference,
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph,
//       },
//     };
//
//     const first = compareSourceToBundle(input);
//     const second = compareSourceToBundle(input);
//
//     expect(first).toEqual(second);
//     expect(first.summary).toEqual({
//       unchanged: 1,
//       modified: 0,
//       removed: 1,
//       split: 1,
//       merged: 2,
//       duplicated: 1,
//       unknown: 1,
//     });
//     expect(item(first, "src/unchanged.ts")).toMatchObject({
//       status: "unchanged",
//       confidence: "exact",
//       candidates: [
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({
//               kind: "exact-source-digest",
//               weight: 100,
//             }),
//           ]),
//         }),
//       ],
//     });
//     expect(item(first, "src/modified.ts")).toMatchObject({
//       status: "unknown",
//       confidence: "unknown",
//       candidates: [
//         expect.objectContaining({
//           signals: expect.arrayContaining([
//             expect.objectContaining({ kind: "current-path-exact", weight: 60 }),
//           ]),
//         }),
//       ],
//     });
//     expect(item(first, "src/removed.ts")).toMatchObject({
//       status: "removed",
//       current_node_ids: [],
//     });
//     expect(item(first, "src/split.ts")).toMatchObject({
//       status: "split",
//       confidence: "medium",
//       current_node_ids: [expect.any(String), expect.any(String)],
//     });
//     expect(item(first, "src/merged-a.ts").status).toBe("merged");
//     expect(item(first, "src/merged-b.ts").status).toBe("merged");
//     expect(item(first, "src/duplicated.ts")).toMatchObject({
//       status: "duplicated",
//       candidates: [{}, {}],
//       confidence: "exact",
//       current_node_ids: [expect.any(String), expect.any(String)],
//     });
//     expect(first.coverage.status).toBe("complete-within-inputs");
//   });
//
//   it("keeps absence unknown when either inventory is incomplete", () => {
//     const reference = historicalGraph("partial", ["src/removed.ts"]);
//     const graph = applicationGraph("partial");
//     const result = compareSourceToBundle({
//       reference,
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
//         graph,
//       },
//     });
//
//     expect(result.summary).toMatchObject({ removed: 0, unknown: 1 });
//     expect(result.items[0]).toMatchObject({
//       source_path: "src/removed.ts",
//       status: "unknown",
//       confidence: "unknown",
//     });
//     expect(result.coverage.status).toBe("partial");
//   });
// });
//
// describe("source to bundle candidate evaluation", () => {
//   it("evaluates all indexed candidates for each source file", () => {
//     const result = compareSourceToBundle({
//       reference: historicalGraph("complete", ["src/split.ts"]),
//       application: {
//         evidenceId: EVIDENCE_ID,
//         rootArtifactSha256: HASH.artifact,
export const _l = 183;
