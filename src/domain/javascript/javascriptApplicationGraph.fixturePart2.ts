export const __stub = 1;
// export const fixtureNode = (
//   ...[kind, identity, label, properties, evidence]: FixtureNodeArguments
// ): FixtureNode =>
//   createJavaScriptApplicationNode({
//     kind,
//     identity,
//     observations: [{ label, properties, evidence }],
//   });
//
// const buildArtifactNodes = (): FixtureNode[] => [
//   fixtureNode(
//     "package",
//     {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: APPLICATION_GRAPH_DIGESTS.package,
//     },
//     "Synthetic desktop package",
//     { format: "directory" },
//     artifactEvidence(APPLICATION_GRAPH_DIGESTS.package, "package.json"),
//   ),
//   fixtureNode(
//     "artifact",
//     {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: APPLICATION_GRAPH_DIGESTS.asar,
//     },
//     "resources/app.asar",
//     { format: "asar" },
//     artifactEvidence(APPLICATION_GRAPH_DIGESTS.asar, "resources/app.asar"),
//   ),
//   fixtureNode(
//     "electron-preload",
//     {
//       strategy: "canonical-path",
//       stability: "artifact-version",
//       artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//       path: "dist/preload.js",
//     },
//     "desktop preload",
//     { sandboxed: true },
//     artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/preload.js",
//       "ast-static-analysis",
//     ),
//   ),
// ];
//
// const buildInteractionNodes = (): FixtureNode[] => [
//   fixtureNode(
//     "context-bridge-api",
//     {
//       strategy: "artifact-local-key",
//       stability: "artifact-version",
//       artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//       namespace: "contextBridge",
//       key: "desktopApi",
//     },
//     "desktopApi",
//     { methods: ["openProject"] },
//     artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/preload.js",
//       "ast-static-analysis",
//     ),
//   ),
//   fixtureNode(
//     "ipc-channel",
//     {
//       strategy: "artifact-local-key",
//       stability: "artifact-version",
//       artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//       namespace: "electron-ipc",
//       key: "project:open",
//     },
//     "project:open",
//     { mode: "invoke" },
//     artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/preload.js",
//       "ast-static-analysis",
//     ),
//   ),
//   fixtureNode(
//     "ipc-handler",
//     {
//       strategy: "artifact-local-key",
//       stability: "artifact-version",
//       artifact_sha256: APPLICATION_GRAPH_DIGESTS.asar,
//       namespace: "ipcMain.handle",
//       key: "project:open",
//     },
//     "project open handler",
//     { process: "main" },
//     artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.asar,
//       "dist/main.js",
//       "ast-static-analysis",
//     ),
//   ),
// ];
//
// const buildNativeRuntimeNodes = (): FixtureNode[] => [
//   fixtureNode(
//     "native-addon",
//     {
//       strategy: "content-digest",
//       stability: "global-exact",
//       sha256: APPLICATION_GRAPH_DIGESTS.nativeAddon,
//     },
//     "synthetic.node",
//     { abi: "napi" },
//     artifactEvidence(
//       APPLICATION_GRAPH_DIGESTS.nativeAddon,
//       "native/synthetic.node",
//       "native-analysis-provider",
//     ),
//   ),
//   fixtureNode(
//     "native-export",
//     {
//       strategy: "artifact-local-key",
//       stability: "artifact-version",
//       artifact_sha256: APPLICATION_GRAPH_DIGESTS.nativeAddon,
export const _l = 126;
