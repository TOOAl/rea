export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import { describe, expect, it } from "vitest";
//
// import { projectAppleApplication } from "./appleApplication.js";
// import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
// import { digestCanonicalValue } from "../canonicalDigest.js";
// import { createEvidence, type Evidence } from "../evidence.js";
// import { jsonValueSchema } from "../jsonValue.js";
//
// type EntryKind = "file" | "directory" | "symlink";
// type RootFormat = "ipa" | "zip" | "dmg" | "directory" | "asar";
//
// interface FixtureEntry {
//   readonly path: string;
//   readonly kind?: EntryKind;
//   readonly format?: string;
// }
//
// const sha = (text: string): string =>
//   createHash("sha256").update(text).digest("hex");
// const artifactId = (sha256: string): string =>
//   `art_${digestCanonicalValue({ sha256 }, "Artifact inventory")}`;
//
// /** Build one complete, content-addressed inventory page for pure projection tests. */
// const inventoryEvidence = (
//   rootFormat: RootFormat,
//   subjectName: string,
//   entries: readonly FixtureEntry[],
// ): Evidence => {
//   const rootSha = sha(`${rootFormat}:${subjectName}`);
//   const rootId = artifactId(rootSha);
//   const node = (sha256: string, format: string) => ({
//     artifact_id: artifactId(sha256),
//     format: [
//       "directory",
//       "mach-o",
//       "mach-o-universal",
//       "elf",
//       "pe",
//       "plist",
//     ].includes(format)
//       ? format
//       : "file",
//     sha256,
//     size: 1,
//     media_type: null,
//     architecture: null,
//     content_state: "materialized",
//     limitations: [],
//   });
//   const occurrence = (
//     path: string,
//     kind: EntryKind,
//     id: string | null,
//     format = "file",
//   ) => ({
//     occurrence_id:
//       path === "."
//         ? `occ_${digestCanonicalValue({ root: rootId }, "Artifact inventory")}`
//         : `occ_${digestCanonicalValue(
//             { root_artifact_id: rootId, logical_path: path, entry_kind: kind },
//             "Artifact inventory",
//           )}`,
//     artifact_id: id,
//     parent_occurrence_id: null,
//     logical_path: path,
//     entry_kind: kind,
//     artifact_kind: "resource",
//     artifact_format: format,
//     declared_size: null,
//     compressed_size: null,
//     executable: false,
//     encrypted: false,
//     hash_status: "verified",
//     source_location: null,
//     limitations: [],
//   });
//   const nodes = new Map([[rootId, node(rootSha, rootFormat)]]);
//   const occurrences = [occurrence(".", "file", rootId, rootFormat)];
//   for (const { path, kind = "file", format = "file" } of entries) {
//     if (kind === "symlink") {
//       occurrences.push(occurrence(path, kind, null));
//       continue;
//     }
//     const contentSha = sha(`${kind}:${path}`);
//     const id = artifactId(contentSha);
//     nodes.set(
//       id,
//       node(contentSha, kind === "directory" ? "directory" : format),
//     );
//     occurrences.push(
//       occurrence(path, kind, id, kind === "directory" ? "directory" : format),
//     );
//   }
//   const sortedNodes = [...nodes.values()].sort((left, right) =>
//     left.artifact_id.localeCompare(right.artifact_id),
//   );
//   const sortedOccurrences = occurrences.sort((left, right) =>
//     compareUnicodeCodePoints(left.logical_path, right.logical_path),
//   );
//   const graphSha256 = digestCanonicalValue(
//     {
//       nodes: sortedNodes,
//       occurrences: sortedOccurrences,
//       edges: [],
//       integrity_contradictions: [],
//     },
//     "Artifact inventory",
//   );
//   return createEvidence(
//     {
//       path: `/fixtures/${subjectName}`,
//       sha256: rootSha,
//       format: rootFormat,
//     },
//     { id: "rea-artifact-graph", name: "fixture", version: "1" },
//     {
//       operation: "inventory_artifact",
//       parameters: {},
//       confidence: "observed",
//       authority: "shipped-artifact",
//       result: jsonValueSchema.parse({
//         manifest: {
//           manifest_id: `agm_${digestCanonicalValue(
//             { root_artifact_id: rootId, graph_sha256: graphSha256 },
//             "Artifact inventory",
//           )}`,
//           root_artifact_id: rootId,
//           root_sha256: rootSha,
//           root_format: rootFormat,
//           graph_sha256: graphSha256,
//           node_count: sortedNodes.length,
//           occurrence_count: sortedOccurrences.length,
//           edge_count: 0,
//         },
//         nodes: sortedNodes,
//         occurrences: sortedOccurrences,
//         edges: [],
//         provenance: [],
//         integrity_contradictions: [],
//         coverage: { scope: "container-entries", status: "complete" },
//         limitations: [],
//       }),
//     },
//   );
// };
//
// const project = (evidence: Evidence) =>
//   projectAppleApplication({ inventory_evidence: [evidence] });
//
// const macho = (path: string): FixtureEntry => ({ path, format: "mach-o" });
//
// describe("macOS application roots and bundle roles", () => {
//   it("treats an inventoried .app directory as its own application root", () => {
//     const result = project(
//       inventoryEvidence("directory", "Fixture.app", [
//         { path: "Contents/Info.plist" },
//         macho("Contents/MacOS/Fixture"),
//         { path: "Contents/_CodeSignature/CodeResources" },
//         { path: "Contents/embedded.provisionprofile" },
//         macho("Contents/Library/LaunchServices/com.example.helper"),
//         { path: "Contents/Library/LaunchDaemons/com.example.helper.plist" },
//         { path: "Contents/Library/LaunchAgents/com.example.agent.plist" },
//         macho("Contents/Helpers/tool"),
//         macho("Contents/Helpers/Assistant.app/Contents/MacOS/Assistant"),
//         macho(
//           "Contents/Library/SystemExtensions/com.example.filter.systemextension/Contents/MacOS/com.example.filter",
//         ),
//         macho(
//           "Contents/Library/SystemExtensions/com.example.driver.dext/driver",
//         ),
//         { path: "Contents/PlugIns/Preview.qlgenerator", kind: "directory" },
//         macho("Contents/PlugIns/Bridge.bundle/Contents/MacOS/Bridge"),
//         { path: "Contents/Resources/Strings.bundle/Info.plist" },
//         { path: "Contents/SharedSupport/Data.bundle", kind: "directory" },
//         macho("Contents/Resources/Embedded.app/Contents/MacOS/Embedded"),
//       ]),
//     );
//     expect(result).toMatchObject({
//       root_format: "directory",
//       platforms: ["macos"],
//       application_roots: ["."],
//     });
//     expect(
export const _l = 185;
