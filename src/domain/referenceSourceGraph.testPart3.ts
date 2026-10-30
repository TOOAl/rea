export const __stub = 1;
//     const revised = createHistoricalSourceGraph(changedMessage);
//     expect(revised.root_sha256).toBe(graph.root_sha256);
//     expect(computeHistoricalSourceGraphSha256(revised)).not.toBe(
//       computeHistoricalSourceGraphSha256(graph),
//     );
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...base,
//         entries: base.entries.map((entry) =>
//           entry.kind === "symlink"
//             ? { ...entry, target: "<unreadable>" }
//             : entry,
//         ),
//       }),
//     ).toThrow();
//   });
//
//   it("preserves partial observations but rejects every partial complete graph", () => {
//     const partial = graphInput();
//     partial.inventory_state = "partial";
//     partial.entries[1] = unavailableFileEntry();
//     partial.parse_failures = [
//       { path: "src/main.ts", parser: "typescript", reason: "Malformed input" },
//     ];
//     expect(createHistoricalSourceGraph(partial).inventory_state).toBe(
//       "partial",
//     );
//
//     for (const change of [
//       { entries: partial.entries },
//       { parse_failures: partial.parse_failures },
//       {
//         exclusions: [
//           {
//             path: "secret",
//             reason: "configured-secret" as const,
//             pattern: "secret",
//           },
//         ],
//       },
//       { limitations: ["Incomplete"] },
//       {
//         relationships: [
//           {
//             ...graphInput().relationships[0]!,
//             parse_state: "partial" as const,
//           },
//         ],
//       },
//     ])
//       expect(() =>
//         createHistoricalSourceGraph({ ...graphInput(), ...change }),
//       ).toThrow(/Complete inventory/u);
//   });
//
//   it("keeps distinct parse failure reasons for the same path and parser", () => {
//     const input = graphInput();
//     const malformed = {
//       path: "src/main.ts",
//       parser: "typescript",
//       reason: "Malformed input",
//     };
//     const unexpected = {
//       path: "src/main.ts",
//       parser: "typescript",
//       reason: "Unexpected token",
//     };
//     input.inventory_state = "partial";
//     input.parse_failures = [malformed, unexpected];
//
//     expect(createHistoricalSourceGraph(input).parse_failures).toEqual(
//       input.parse_failures,
//     );
//     expect(historicalSourceParseFailureKey(malformed)).not.toBe(
//       historicalSourceParseFailureKey(unexpected),
//     );
//   });
// });
//
// describe("historical source graph validation", () => {
//   it("rejects strict unknown fields, invalid VCS, dangling internal edges, and false manifests", () => {
//     expect(() =>
//       createHistoricalSourceGraph({ ...graphInput(), surprise: true }),
//     ).toThrow();
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         vcs: { kind: "git", head: "main", dirty: false },
//       }),
//     ).toThrow();
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         relationships: [
//           { ...graphInput().relationships[1]!, to: "missing.ts" },
//         ],
//       }),
//     ).toThrow(/normalized and inventoried/u);
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         inventory_state: "partial",
//         entries: graphInput().entries.map((entry) =>
//           entry.kind === "symlink"
//             ? { ...entry, target: "/etc/passwd", target_state: "external" }
//             : entry,
//         ),
//       }),
//     ).not.toThrow();
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         inventory_state: "partial",
//         entries: graphInput().entries.map((entry) =>
//           entry.kind === "symlink"
//             ? {
//                 ...entry,
//                 target: "<outside-root>",
//                 target_state: "external",
//               }
//             : entry,
//         ),
//       }),
//     ).toThrow(/target path does not match/u);
//     expect(() =>
//       createHistoricalSourceGraph({
//         ...graphInput(),
//         relationships: [
//           { ...graphInput().relationships[1]!, to: "../escape.ts" },
//         ],
//       }),
//     ).toThrow(/normalized and inventoried/u);
//     expect(() =>
//       historicalSourceGraphSchema.parse({
//         ...createHistoricalSourceGraph(graphInput()),
//         extra: true,
//       }),
//     ).toThrow();
//
//     const manifest = createHistoricalSourceManifest(
//       createHistoricalSourceGraph(graphInput()),
//     );
//     expect(() =>
//       parseHistoricalSourceManifest({ ...manifest, entry_count: 999 }),
//     ).toThrow(/identifier does not match/u);
//   });
// });
//
// describe("historical source graph excluded symlink targets", () => {
//   it("retains internal symlinks into excluded trees without accepting sibling prefixes", () => {
//     const input = { ...graphInput(), inventory_state: "partial" as const };
//     input.exclusions = [
//       {
//         path: "dist",
//         entry_kind: "directory",
//         reason: "caller-excluded",
export const _l = 156;
