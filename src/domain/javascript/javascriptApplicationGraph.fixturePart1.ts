export const __stub = 1;
// import {
//   createJavaScriptApplicationEdge,
//   createJavaScriptApplicationGraph,
//   createJavaScriptApplicationNode,
//   type JavaScriptApplicationGraph,
// } from "./javascriptApplicationGraph.js";
// import type { ApplicationNode } from "./javascriptApplicationGraphSchemas.js";
// import type { ApplicationGraphEvidence } from "./javascriptApplicationEvidenceSchemas.js";
// import { resolveJavaScriptSourceMapReferences } from "./javascriptSourceMapPaths.js";
//
// export const APPLICATION_GRAPH_DIGESTS = {
//   package: "1".repeat(64),
//   asar: "2".repeat(64),
//   nativeAddon: "3".repeat(64),
//   capture: "4".repeat(64),
// } as const;
//
// /** Coverage block asserting nothing was truncated or omitted. */
// export const completeCoverage = {
//   status: "complete",
//   truncated: false,
//   omitted_count: 0,
//   limits: [],
// } satisfies ApplicationGraphEvidence["coverage"];
//
// export const sourceMapReference = (
//   sourceName: string,
//   sourceRoot: string | null,
//   mapPath: string,
// ) => {
//   const reference = resolveJavaScriptSourceMapReferences(
//     [sourceName],
//     sourceRoot,
//     mapPath,
//   )[0];
//   if (reference == null) throw new TypeError("Expected a source-map reference");
//   return reference;
// };
//
// const extractor = (operation: string) => ({
//   name: "rea-test-fixture",
//   version: "1.0.0",
//   operation,
//   executable_sha256: null,
// });
//
// export const artifactEvidence = (
//   sha256: string,
//   path: string,
//   authority:
//     | "artifact-bytes"
//     | "ast-static-analysis"
//     | "native-analysis-provider" = "artifact-bytes",
// ): ApplicationGraphEvidence => ({
//   authority,
//   state: "observed",
//   confidence: "exact",
//   artifact: {
//     available: true,
//     artifact_id: `art_${sha256}`,
//     sha256,
//   },
//   location: { available: true, value: { kind: "artifact-path", path } },
//   extractor: extractor(`observe-${authority}`),
//   coverage: completeCoverage,
//   limitations: [],
//   evidence_ids: [],
// });
//
// export const inferredArtifactEvidence = (
//   sha256: string,
//   path: string,
// ): ApplicationGraphEvidence => ({
//   authority: "static-relationship-inference",
//   state: "inferred",
//   confidence: "high",
//   artifact: {
//     available: true,
//     artifact_id: `art_${sha256}`,
//     sha256,
//   },
//   location: { available: true, value: { kind: "artifact-path", path } },
//   extractor: extractor("infer-static-relationship"),
//   coverage: completeCoverage,
//   limitations: ["Relationship is inferred from static syntax."],
//   evidence_ids: [],
// });
//
// export const runtimeEvidence = (
//   runtimeKey: string,
// ): ApplicationGraphEvidence => ({
//   authority: "passive-cdp-runtime",
//   state: "observed",
//   confidence: "exact",
//   artifact: {
//     available: false,
//     reason: "not-observed",
//     detail: "Passive CDP metadata did not expose backing artifact bytes.",
//   },
//   location: {
//     available: true,
//     value: {
//       kind: "runtime",
//       capture_sha256: APPLICATION_GRAPH_DIGESTS.capture,
//       target_key: "target-main",
//       frame_key: "frame-main",
//       script_key: runtimeKey,
//     },
//   },
//   extractor: extractor("observe-passive-cdp"),
//   coverage: completeCoverage,
//   limitations: ["Only passive CDP metadata was observed."],
//   evidence_ids: [],
// });
//
// type FixtureNode = ReturnType<typeof createJavaScriptApplicationNode>;
// type NodeProperties = FixtureNode["observations"][number]["properties"];
//
// type FixtureNodeArguments = [
//   kind: FixtureNode["kind"],
//   identity: FixtureNode["identity"],
//   label: string,
//   properties: NodeProperties,
//   evidence: ApplicationGraphEvidence,
// ];
//
export const _l = 126;
