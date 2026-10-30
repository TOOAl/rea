export const __stub = 1;
//       observe("0x2000", [], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "not_found",
//       search_scope: { exhaustive: true },
//     });
//     expect(result.limitations).toContain(reason);
//   });
//
//   it("stays unknown when callee coverage is unknown", () => {
//     const reason =
//       "Callees: Upstream callees capped results at 500; additional callees remain unknown.";
//     const result = run([
//       observe("0x1000", ["0x2000"], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//       observe("0x2000", [], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "unknown",
//       search_scope: { exhaustive: false },
//     });
//     expect(result.limitations).toContain(reason);
//   });
//
//   it("stays unknown when both caller and callee coverage are unknown", () => {
//     const reason =
//       "Callers: Upstream xrefs do not establish direct caller relationships. Callees: Upstream callees are not observed.";
//     const result = run([
//       observe("0x1000", ["0x2000"], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//       observe("0x2000", [], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "unknown",
//       search_scope: { exhaustive: false },
//     });
//     expect(result.limitations).toContain(reason);
//   });
//
//   it("ignores incomplete relationship coverage outside the reachable search closure", () => {
//     const reason = "An unrelated function's callees were not observed.";
//     const result = run([
//       observe("0x1000", [], "rea-workflow", {
//         relationshipCoverage: { status: "complete" },
//       }),
//       observe("0x2000", ["0x5000"], "rea-workflow", {
//         relationshipCoverage: { status: "unknown", reason },
//       }),
//     ]);
//     expect(result).toMatchObject({
//       status: "not_found",
//       search_scope: { exhaustive: true },
//       explored: { nodes: 1 },
//     });
//     expect(result.limitations).toEqual([]);
//   });
// });
//
// describe("IDA-capped callee coverage beside unknown callers", () => {
//   it("keeps the search non-exhaustive for the combined coverage value", () => {
//     const combined = combineFunctionRelationshipCoverage(
//       {
//         status: "unknown",
//         reason: "Upstream xrefs do not establish direct caller relationships.",
//       },
//       {
//         status: "partial",
//         limitations: [
//           "Upstream callees capped results at 500; additional callees remain unknown.",
//         ],
//       },
//     );
//     expect(combined.status).toBe("unknown");
//     const result = run([
//       observe("0x1000", [], "rea-workflow", { relationshipCoverage: combined }),
//       observe("0x4000", []),
//     ]);
//     expect(result).toMatchObject({
//       status: "unknown",
//       search_scope: { exhaustive: false },
//       shortest_hops: null,
//       paths: [],
//     });
//   });
// });
//
// describe("call path evidence admission", () => {
//   it("normalizes hex addresses and rejects duplicates and mixed providers", () => {
//     expect(
//       run([observe("0x001000", [])], {
//         start: { address: "0X00001000" },
//       }),
//     ).toMatchObject({ status: "not_found", start: "0x1000" });
//     expect(() =>
//       run([observe("0x1000", [])], { start: { address: "1000" } }),
//     ).toThrow();
//     const one = observe("0x1000", []);
//     expect(() => run([one, one])).toThrow(/Duplicate/u);
//     expect(() => run([one, observe("0x2000", [], "other")])).toThrow(
//       /providers/u,
//     );
//   });
//
//   it("preserves address spaces and encoded names when normalizing offsets", () => {
//     const result = run(
//       [
//         observe("0x1000", ["EXTERNAL:0x001000"]),
//         observe("EXTERNAL:0x1000", ["overlay%3Atext:0x00004000"]),
//       ],
//       {
//         goal: { address: "overlay%3Atext:0X004000" },
//       },
//     );
//     expect(
//       result.paths.map((path) => path.nodes.map(({ address }) => address)),
//     ).toEqual([["0x1000", "EXTERNAL:0x1000", "overlay%3Atext:0x4000"]]);
//     expect(() =>
//       run([observe("0x1000", [])], {
//         goal: { address: "overlay%ZZ:0x4000" },
//       }),
//     ).toThrow();
//   });
//
//   it("requires an observed start function", () => {
//     expect(() => run([observe("0x2000", [])])).toThrow(
//       /supplied for start 0x1000/u,
//     );
//   });
// });
//
// it("keeps an absent path unknown when only callee facet availability is declared", () => {
//   const result = run([
//     observe("0x1000", [], "rea-workflow", {
//       calleeUnavailable: "Graph callees unavailable",
//     }),
//   ]);
//   expect(result.status).toBe("unknown");
//   expect(result.limitations).toContain("Graph callees unavailable");
// });
export const _l = 147;
