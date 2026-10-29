export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { buildCallPath } from "./callPath.js";
// import { combineFunctionRelationshipCoverage } from "./functionCallCoverage.js";
// import { callPathResultSchema, type CallPathInput } from "./callPathSchemas.js";
// import { createEvidence, type Evidence } from "./evidence.js";
// import type { JsonValue } from "./jsonValue.js";
// import type { RelationshipCoverage } from "./relationshipCoverage.js";
//
// const observe = (
//   address: string,
//   callees: readonly string[],
//   provider = "rea-workflow",
//   options: {
//     readonly evidenceLimitations?: readonly string[];
//     readonly dossierLimitations?: readonly string[];
//     readonly relationshipCoverage?: RelationshipCoverage;
//     readonly calleeUnavailable?: string;
//   } = {},
// ): Evidence => {
//   const value = {
//     procedure: {
//       address,
//       name: `fn_${address.slice(2)}`,
//       classification: null,
//       body: {
//         available: false,
//         reason:
//           "Hopper's public Python API does not expose complete function body ranges",
//       },
//       signature: null,
//       locals: [],
//     },
//     pseudocode: "",
//     assembly: [],
//     comments: [],
//     callers: [],
//     callees: callees.map((callee) => ({
//       address: callee,
//       name: `fn_${callee.slice(2)}`,
//       classification: null,
//       body: {
//         available: false,
//         reason:
//           "Hopper's public Python API does not expose complete function body ranges",
//       },
//     })),
//     incoming_references: [],
//     outgoing_references: [],
//     referenced_strings: [],
//     referenced_names: [],
//     native_api: null,
//     native_value_flow: null,
//     basic_blocks: [],
//     limitations: [...(options.dossierLimitations ?? [])],
//     ...(options.calleeUnavailable === undefined
//       ? {}
//       : {
//           facet_availability: {
//             callees: { available: false, reason: options.calleeUnavailable },
//           },
//         }),
//   } satisfies JsonValue;
//   return createEvidence(
//     { path: "/tmp/a", sha256: "a".repeat(64), format: "mach-o" },
//     { id: provider, name: provider, version: "1" },
//     {
//       operation: "analyze_function",
//       parameters: { procedure: address },
//       result: value,
//       confidence: "derived",
//       authority: "shipped-artifact",
//       ...(options.evidenceLimitations === undefined
//         ? {}
//         : { limitations: options.evidenceLimitations }),
//       ...(options.relationshipCoverage === undefined
//         ? {}
//         : { relationshipCoverage: options.relationshipCoverage }),
//     },
//   );
// };
//
// const run = (
//   functions: Evidence[],
//   overrides: Partial<Pick<CallPathInput, "start" | "goal">> = {},
// ) =>
//   buildCallPath({
//     functions,
//     start: { address: "0x1000" },
//     goal: { address: "0x4000" },
//     ...overrides,
//   });
//
// describe("call path reconstruction", () => {
//   it("returns deterministic shortest-first cited paths", () => {
//     const result = run([
//       observe("0x1000", ["0x3000", "0x2000"]),
//       observe("0x2000", ["0x4000"]),
//       observe("0x3000", ["0x5000"]),
//       observe("0x5000", ["0x6000"]),
//       observe("0x6000", ["0x4000"]),
//     ]);
//     expect(callPathResultSchema.parse(result)).toEqual(result);
//     expect(result.status).toBe("found");
//     expect(result.shortest_hops).toBe(2);
//     expect(
//       callPathResultSchema.safeParse({ ...result, shortest_hops: null })
//         .success,
//     ).toBe(false);
//     expect(
//       callPathResultSchema.safeParse({ ...result, paths: [] }).success,
//     ).toBe(false);
//     expect(
//       result.paths.map((path) => path.nodes.map(({ address }) => address)),
//     ).toEqual([["0x1000", "0x2000", "0x4000"]]);
//     expect(
//       result.paths[0]?.edges.every((edge) => edge.evidence_links.length > 0),
//     ).toBe(true);
//   });
//
//   it("accepts a direct cited edge without a goal dossier", () => {
//     const result = run([observe("0x1000", ["0x4000"])]);
//     expect(result).toMatchObject({ status: "found", shortest_hops: 1 });
//     expect(result.paths[0]?.nodes[1]).toMatchObject({
//       address: "0x4000",
//       name: null,
//     });
//   });
//
//   it("only reports not_found for exhaustive closure", () => {
//     const notFound = run([observe("0x1000", []), observe("0x4000", [])]);
//     expect(notFound.status).toBe("not_found");
//     expect(
//       callPathResultSchema.safeParse({
//         ...notFound,
//         search_scope: { ...notFound.search_scope, exhaustive: false },
//       }).success,
//     ).toBe(false);
//     const unknown = run([observe("0x1000", ["0x2000"])]);
//     expect(unknown.status).toBe("unknown");
//     expect(unknown.limitations).toContain(
//       "No analyze_function Evidence covers reachable function 0x2000",
//     );
//
//     const limitedEmpty = run([
//       observe("0x1000", [], "rea-workflow", {
//         dossierLimitations: ["Call relationships are incomplete."],
//       }),
//       observe("0x4000", []),
//     ]);
export const _l = 150;
