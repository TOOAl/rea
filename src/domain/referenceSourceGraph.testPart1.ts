export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   computeHistoricalSourceGraphSha256,
//   createHistoricalSourceGraph,
//   createHistoricalSourceManifest,
//   historicalSourceGraphSchema,
//   historicalSourceParseFailureKey,
//   parseHistoricalSourceGraph,
//   parseHistoricalSourceManifest,
//   type HistoricalSourceGraphInput,
// } from "./referenceSourceGraph.js";
//
// const HASH_A = "a".repeat(64);
// const HASH_B = "b".repeat(64);
// type Entry = HistoricalSourceGraphInput["entries"][number];
// type DirectoryEntry = Extract<Entry, { kind: "directory" }>;
// type FileEntry = Extract<Entry, { kind: "file" }>;
// type HashedFileEntry = Extract<FileEntry, { content_state: "hashed" }>;
// type UnavailableFileEntry = Exclude<FileEntry, HashedFileEntry>;
// type SymlinkEntry = Extract<Entry, { kind: "symlink" }>;
//
// const directoryEntry = (
//   treeState: DirectoryEntry["tree_state"] = "enumerated",
// ): DirectoryEntry => ({
//   path: "src",
//   kind: "directory",
//   classifications: ["source"],
//   tree_state: treeState,
//   limitations: [],
// });
//
// const fileEntry = (
//   overrides: Partial<HashedFileEntry> = {},
// ): HashedFileEntry => ({
//   path: "src/main.ts",
//   kind: "file",
//   sha256: HASH_B,
//   size: 20,
//   language: "TypeScript",
//   classifications: ["source"],
//   content_state: "hashed",
//   limitations: [],
//   ...overrides,
// });
//
// const unavailableFileEntry = (
//   overrides: Partial<UnavailableFileEntry> = {},
// ): UnavailableFileEntry => ({
//   path: "src/main.ts",
//   kind: "file",
//   sha256: null,
//   size: null,
//   language: "TypeScript",
//   classifications: ["source"],
//   content_state: "unreadable",
//   limitations: ["Permission denied"],
//   ...overrides,
// });
//
// type KnownTargetSymlinkEntry = Extract<SymlinkEntry, { target: string }>;
//
// const symlinkEntry = (
//   overrides: Partial<KnownTargetSymlinkEntry> = {},
// ): KnownTargetSymlinkEntry => ({
//   path: "src/package.json",
//   kind: "symlink",
//   target: "main.ts",
//   target_state: "internal",
//   classifications: ["manifest"],
//   limitations: [],
//   ...overrides,
// });
//
// const graphInput = (): HistoricalSourceGraphInput => ({
//   schema: "HistoricalSourceGraph",
//   authority: "historical-reference",
//   root_alias: "$REFERENCE_ROOT",
//   inventory_state: "complete",
//   entries: [directoryEntry(), fileEntry(), symlinkEntry()],
//   relationships: [
//     {
//       from_path: "src/main.ts",
//       to: "node:fs",
//       kind: "imports",
//       resolution: "external",
//       parse_state: "parsed",
//     },
//     {
//       from_path: "src/main.ts",
//       to: "src",
//       kind: "references",
//       resolution: "internal",
//       parse_state: "parsed",
//     },
//   ],
//   parse_failures: [],
//   exclusions: [],
//   languages: ["TypeScript"],
//   manifests: [],
//   vcs: { kind: "git", head: HASH_A, dirty: false },
//   provenance: { importer: "rea", importer_version: "1", caller: "test" },
//   limitations: [],
// });
//
// describe("historical source graph", () => {
//   it("validates supplementary paths and derived indexes by code point", () => {
//     const paths = ["a", "aa", "\uE000", "\u{10000}"];
//     const input: HistoricalSourceGraphInput = {
//       ...graphInput(),
//       entries: paths.map((path) =>
//         fileEntry({
//           path,
//           language: path,
//           classifications: ["manifest"],
//         }),
//       ),
//       relationships: [],
//       languages: paths,
//       manifests: paths,
//     };
//     const graph = createHistoricalSourceGraph(input);
//     expect(parseHistoricalSourceGraph(graph)).toEqual(graph);
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...input,
//         entries: [...input.entries].sort((left, right) =>
//           left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
//         ),
//       }),
//     ).toThrow(/Unicode code point/u);
//   });
//
//   it("builds and verifies internal root and manifest commitments", () => {
//     const graph = createHistoricalSourceGraph(graphInput());
//     const first = createHistoricalSourceManifest(graph);
//     const second = createHistoricalSourceManifest(structuredClone(graph));
//
//     expect(first).toEqual(second);
//     expect(parseHistoricalSourceGraph(graph)).toEqual(graph);
//     expect(parseHistoricalSourceManifest(first)).toEqual(first);
//     expect(first.graph_sha256).toBe(computeHistoricalSourceGraphSha256(graph));
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         entries: [
//           directoryEntry(),
//           { ...fileEntry(), content_state: "unreadable" },
//           symlinkEntry(),
//         ],
//       }),
//     ).toThrow();
//   });
//
//   it("rejects stale roots and commits file, directory, and symlink semantics", () => {
//     const original = createHistoricalSourceGraph(graphInput());
export const _l = 156;
