export const __stub = 1;
//     expect(() =>
//       parseHistoricalSourceGraph({ ...original, root_sha256: HASH_A }),
//     ).toThrow(/root commitment/u);
//
//     for (const mutate of [
//       (input: HistoricalSourceGraphInput) => {
//         input.entries[0] = directoryEntry("partial");
//         input.inventory_state = "partial";
//       },
//       (input: HistoricalSourceGraphInput) => {
//         input.entries[1] = fileEntry({ sha256: "c".repeat(64) });
//       },
//       (input: HistoricalSourceGraphInput) => {
//         input.entries[2] = symlinkEntry({
//           target: "other.json",
//           target_state: "missing",
//         });
//         input.inventory_state = "partial";
//       },
//       (input: HistoricalSourceGraphInput) => {
//         input.exclusions = [
//           {
//             path: "private.env",
//             reason: "configured-secret",
//             pattern: ".env",
//           },
//         ];
//         input.inventory_state = "partial";
//       },
//     ]) {
//       const changed = graphInput();
//       mutate(changed);
//       expect(createHistoricalSourceGraph(changed).root_sha256).not.toBe(
//         original.root_sha256,
//       );
//     }
//   });
//
//   it("commits the matched pattern for each exclusion", () => {
//     const graphWith = (pattern: string) =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         inventory_state: "partial",
//         exclusions: [
//           { path: "private.env", reason: "configured-secret", pattern },
//         ],
//       });
//     expect(graphWith(".env").root_sha256).not.toBe(
//       graphWith("*.env").root_sha256,
//     );
//   });
//
//   it("retains actual external targets and rejects placeholder targets", () => {
//     const input = { ...graphInput(), inventory_state: "partial" as const };
//     input.entries[2] = symlinkEntry({
//       target: "/private/shared/target.js",
//       target_state: "external",
//     });
//     const graph = createHistoricalSourceGraph(input);
//     expect(graph.entries[2]).toMatchObject({
//       kind: "symlink",
//       target: "/private/shared/target.js",
//       target_state: "external",
//     });
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...input,
//         entries: input.entries.map((entry) =>
//           entry.kind === "symlink"
//             ? { ...entry, target: "<outside-root>" }
//             : entry,
//         ),
//       }),
//     ).toThrow(/target path does not match/u);
//   });
//
//   it("derives language and manifest indexes and enforces code-point order", () => {
//     const input = graphInput();
//     input.entries[1] = fileEntry({ classifications: ["source", "test"] });
//     expect(() =>
//       createHistoricalSourceGraph({ ...input, languages: [] }),
//     ).toThrow(/derived/u);
//     expect(() =>
//       createHistoricalSourceGraph({ ...input, manifests: ["src/main.ts"] }),
//     ).toThrow(/derived/u);
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...input,
//         entries: input.entries.toReversed(),
//       }),
//     ).toThrow(/Unicode code point/u);
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...input,
//         entries: input.entries.map((entry) =>
//           entry.path === "src/main.ts"
//             ? { ...entry, classifications: ["test", "source"] }
//             : entry,
//         ),
//       }),
//     ).toThrow(/Unicode code point/u);
//   });
// });
//
// describe("partial historical source graphs", () => {
//   it("keeps unknown-entry diagnostics outside the root commitment", () => {
//     const base = graphInput();
//     base.inventory_state = "partial";
//     base.entries[2] = {
//       path: "src/package.json",
//       kind: "unknown",
//       classifications: ["unknown"],
//       limitations: ["Permission denied at /private/first"],
//     };
//     const graph = createHistoricalSourceGraph(base);
//     const changedMessage = structuredClone(base);
//     changedMessage.entries[2] = {
//       path: "src/package.json",
//       kind: "unknown",
//       classifications: ["unknown"],
//       limitations: ["Permission denied at /private/second"],
//     };
//     const revised = createHistoricalSourceGraph(changedMessage);
//     expect(revised.root_sha256).toBe(graph.root_sha256);
//     expect(computeHistoricalSourceGraphSha256(revised)).not.toBe(
//       computeHistoricalSourceGraphSha256(graph),
//     );
//   });
//
//   it("keeps an unreadable symlink target unknown and out of root identity", () => {
//     const base = graphInput();
//     base.inventory_state = "partial";
//     base.entries[2] = {
//       path: "src/package.json",
//       kind: "symlink",
//       target: null,
//       target_state: "unreadable",
//       classifications: ["manifest"],
//       limitations: ["Target could not be read."],
//     };
//     const graph = createHistoricalSourceGraph(base);
//     expect(graph.entries[2]).toMatchObject({
//       kind: "symlink",
//       target: null,
//       target_state: "unreadable",
//     });
//
//     const changedMessage = structuredClone(base);
//     changedMessage.entries[2] = {
//       path: "src/package.json",
//       kind: "symlink",
//       target: null,
//       target_state: "unreadable",
//       classifications: ["manifest"],
//       limitations: ["A different diagnostic."],
//     };
export const _l = 156;
