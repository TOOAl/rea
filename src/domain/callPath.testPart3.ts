export const __stub = 1;
//     });
//     expect(result).toMatchObject({ status: "found", shortest_hops: length });
//     expect(result.paths).toHaveLength(1);
//     expect(result.paths[0]?.nodes).toHaveLength(length + 1);
//     expect(result.paths[0]?.edges).toHaveLength(length);
//     expect(result.paths[0]?.nodes.at(-1)?.address).toBe(address(length + 1));
//   });
//
//   it("returns the sole shortest path alongside a deep merging dead-end graph", () => {
//     const stages = 28;
//     const address = (index: number) => `0x${index.toString(16)}`;
//     const functions = [observe("0x1", ["0x2", "0x1000"])];
//     for (let index = 2; index < stages + 2; index += 1)
//       functions.push(observe(address(index), [address(index + 1)]));
//     for (let index = 0; index < stages; index += 1) {
//       const base = 0x1000 + index * 2;
//       const next = [address(base + 2), address(base + 3)];
//       functions.push(observe(address(base), next));
//       functions.push(observe(address(base + 1), next));
//     }
//     functions.push(observe(address(0x1000 + stages * 2), []));
//     functions.push(observe(address(0x1001 + stages * 2), []));
//     const result = run(functions, {
//       start: { address: "0x1" },
//       goal: { address: address(stages + 2) },
//     });
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: stages + 1,
//       search_scope: { exhaustive: true },
//     });
//     expect(
//       result.paths.map(({ nodes }) => nodes.map(({ address }) => address)),
//     ).toEqual([
//       Array.from({ length: stages + 2 }, (_, index) => address(index + 1)),
//     ]);
//   });
// });
//
// describe("directional call relationship coverage", () => {
//   it.each([
//     {
//       directions: ["callers"] as ["callers"],
//       status: "not_found",
//       exhaustive: true,
//     },
//     {
//       directions: ["callees"] as ["callees"],
//       status: "unknown",
//       exhaustive: false,
//     },
//     {
//       directions: ["callers", "callees"] as ["callers", "callees"],
//       status: "unknown",
//       exhaustive: false,
//     },
//   ])(
//     "uses $directions coverage for the forward search",
//     ({ directions, status, exhaustive }) => {
//       const limitation = "The inventory omitted a reference.";
//       const relationshipCoverage: RelationshipCoverage = {
//         status: "partial",
//         limitations: [limitation],
//         limited_directions: directions,
//       };
//       const result = run([
//         observe("0x1000", ["0x2000"], "rea-workflow", { relationshipCoverage }),
//         observe("0x2000", [], "rea-workflow", { relationshipCoverage }),
//       ]);
//       expect(result).toMatchObject({ status, search_scope: { exhaustive } });
//       expect(result.limitations).toContain(limitation);
//     },
//   );
// });
//
// describe("explicit call relationship coverage", () => {
//   it("accumulates 150,000 partial reasons without argument-stack exhaustion", () => {
//     const result = run([
//       observe("0x1000", [], "rea-workflow", {
//         relationshipCoverage: {
//           status: "partial",
//           limitations: Array<string>(150_000).fill("omitted"),
//         },
//         evidenceLimitations: [],
//         dossierLimitations: [],
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "unknown",
//       search_scope: { exhaustive: false },
//       limitations: ["omitted"],
//     });
//   });
//
//   it("retains contextual limits on a found path without reducing complete coverage", () => {
//     const limitation = "Provider results reflect the current database state.";
//     const result = run([
//       observe("0x1000", ["0x4000"], "rea-workflow", {
//         relationshipCoverage: { status: "complete" },
//         evidenceLimitations: [limitation],
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: 1,
//       search_scope: { exhaustive: true },
//     });
//     expect(result.limitations).toContain(limitation);
//   });
//
//   it("retains a found path while its expanded relationship coverage remains partial", () => {
//     const limitation = "Other callees were omitted by the provider cap.";
//     const result = run([
//       observe("0x1000", ["0x4000"], "rea-workflow", {
//         relationshipCoverage: { status: "partial", limitations: [limitation] },
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: 1,
//       search_scope: { exhaustive: false },
//     });
//     expect(result.limitations).toContain(limitation);
//   });
//
//   it("retains an unknown goal coverage reason without expanding the terminal goal", () => {
//     const reason = "The goal's outgoing relationship coverage is unknown.";
//     const result = run([
//       observe("0x1000", ["0x4000"], "rea-workflow", {
//         relationshipCoverage: { status: "complete" },
//       }),
//       observe("0x4000", ["0x5000"], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "found",
//       search_scope: { exhaustive: true },
//       explored: { nodes: 2 },
//     });
//     expect(result.limitations).toEqual([reason]);
//   });
//
//   it("establishes not_found when only caller coverage is unknown", () => {
//     const reason =
//       "Callers: Upstream xrefs do not establish direct caller relationships.";
//     const result = run([
//       observe("0x1000", ["0x2000"], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
export const _l = 150;
