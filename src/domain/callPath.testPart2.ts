export const __stub = 1;
//     expect(limitedEmpty).toMatchObject({
//       status: "unknown",
//       search_scope: { exhaustive: false },
//       shortest_hops: null,
//       paths: [],
//     });
//     expect(limitedEmpty.limitations).toContain(
//       "Call relationships are incomplete.",
//     );
//   });
//
//   it("searches the complete supplied graph", () => {
//     expect(
//       run([observe("0x1000", ["0x2000"]), observe("0x2000", [])]).status,
//     ).toBe("not_found");
//   });
//
//   it("returns all shortest paths inline without paging", () => {
//     const result = run([
//       observe("0x1000", ["0x2000", "0x3000"]),
//       observe("0x2000", ["0x4000"]),
//       observe("0x3000", ["0x4000"]),
//     ]);
//     expect(result.paths.map((path) => path.nodes[1]?.address)).toEqual([
//       "0x2000",
//       "0x3000",
//     ]);
//   });
// });
//
// describe("call path topology and capacity", () => {
//   it("retains every distinct generic limitation beyond the push argument limit", () => {
//     const limitations = Array.from(
//       { length: 150_000 },
//       (_, index) => `context-${index.toString().padStart(7, "0")}`,
//     );
//     const result = run([
//       observe("0x1000", [], "rea-workflow", {
//         evidenceLimitations: [...limitations].reverse(),
//       }),
//     ]);
//     expect(result.status).toBe("unknown");
//     expect(result.search_scope.exhaustive).toBe(false);
//     expect(result.limitations).toEqual(limitations);
//   }, 30_000);
//
//   it("retains every shortest path through merging branches and cycles", () => {
//     const result = run([
//       observe("0x1000", ["0x3000", "0x2000", "0x1000"]),
//       observe("0x2000", ["0x3000", "0x5000", "0x6000"]),
//       observe("0x3000", ["0x6000", "0x5000"]),
//       observe("0x5000", ["0x4000", "0x1000"]),
//       observe("0x6000", ["0x4000"]),
//     ]);
//     expect(
//       result.paths.map(({ nodes }) => nodes.map(({ address }) => address)),
//     ).toEqual([
//       ["0x1000", "0x2000", "0x5000", "0x4000"],
//       ["0x1000", "0x2000", "0x6000", "0x4000"],
//       ["0x1000", "0x3000", "0x5000", "0x4000"],
//       ["0x1000", "0x3000", "0x6000", "0x4000"],
//     ]);
//   });
//
//   it("keeps uncovered dead ends in search limitations when a path is found", () => {
//     const result = run([
//       observe("0x1000", ["0x2000", "0x5000"]),
//       observe("0x2000", ["0x4000"]),
//     ]);
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: 2,
//       search_scope: { exhaustive: false },
//       explored: { nodes: 4, edges: 3, depth_reached: 2 },
//     });
//     expect(result.limitations).toContain(
//       "No analyze_function Evidence covers reachable function 0x5000",
//     );
//   });
//
//   it("keeps reached function limitations and marks expanded coverage incomplete", () => {
//     const evidenceLimitation = "Call graph output was truncated.";
//     const dossierLimitation = "One call target could not be resolved.";
//     const result = run([
//       observe("0x1000", ["0x4000"], "rea-workflow", {
//         evidenceLimitations: [evidenceLimitation],
//         dossierLimitations: [dossierLimitation],
//       }),
//       observe("0x4000", []),
//     ]);
//
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: 1,
//       search_scope: { exhaustive: false },
//       paths: [
//         {
//           nodes: [{ address: "0x1000" }, { address: "0x4000" }],
//         },
//       ],
//     });
//     expect(result.limitations).toEqual(
//       expect.arrayContaining([evidenceLimitation, dossierLimitation]),
//     );
//   });
//
//   it("retains goal dossier limitations without expanding the goal", () => {
//     const goalLimitation = "The goal dossier has partial outgoing references.";
//     const result = run([
//       observe("0x1000", ["0x4000"]),
//       observe("0x4000", ["0x5000"], "rea-workflow", {
//         dossierLimitations: [goalLimitation],
//       }),
//     ]);
//
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: 1,
//       search_scope: { exhaustive: true },
//     });
//     expect(result.limitations).toContain(goalLimitation);
//     expect(result.explored.nodes).toBe(2);
//     expect(result.limitations).not.toContain(
//       "No analyze_function Evidence covers reachable function 0x5000",
//     );
//   });
//
//   it("returns a zero-hop path when start and goal are the same function", () => {
//     const result = run([observe("0x1000", ["0x2000"])], {
//       goal: { address: "0x1000" },
//     });
//     expect(result).toMatchObject({
//       status: "found",
//       shortest_hops: 0,
//       search_scope: { exhaustive: true },
//     });
//     expect(
//       result.paths.map(({ nodes }) => nodes.map(({ address }) => address)),
//     ).toEqual([["0x1000"]]);
//   });
//
//   it("reconstructs a deep function chain without exhausting the call stack", () => {
//     const length = 20_000;
//     const address = (index: number) => `0x${index.toString(16)}`;
//     const functions = Array.from({ length }, (_, index) =>
//       observe(address(index + 1), [address(index + 2)]),
//     );
//     const result = run(functions, {
//       start: { address: address(1) },
//       goal: { address: address(length + 1) },
export const _l = 150;
