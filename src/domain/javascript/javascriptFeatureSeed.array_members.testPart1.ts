export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   createJavaScriptApplicationGraph,
//   createJavaScriptApplicationNode,
// } from "./javascriptApplicationGraph.js";
// import type { ApplicationNode } from "./javascriptApplicationGraphSchemas.js";
// import {
//   artifactEvidence,
//   completeCoverage,
// } from "./javascriptApplicationGraph.fixture.js";
// import { findApplicationFeatureSeeds } from "./javascriptFeatureSeed.js";
// import { traceApplicationFeature } from "./javascriptFeatureTrace.js";
// import {
//   applicationFeatureSeedSchema,
//   type ApplicationFeatureSeed,
// } from "./javascriptFeatureTraceSchemas.js";
// import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";
// import type { JsonValue } from "../jsonValue.js";
//
// const memberFields = [
//   { kind: "api", nodeKind: "context-bridge-api", field: "members" },
//   { kind: "api", nodeKind: "context-bridge-api", field: "methods" },
//   { kind: "module", nodeKind: "javascript-asset", field: "exports" },
//   { kind: "module", nodeKind: "javascript-module", field: "exports" },
//   { kind: "module", nodeKind: "source-module", field: "exports" },
//   {
//     kind: "native-export",
//     nodeKind: "native-export",
//     field: "requested_members",
//   },
//   { kind: "native-export", nodeKind: "native-export", field: "members" },
// ] as const;
//
// const matchingModes = [
//   { value: "openProject", match: null, case_sensitive: true },
//   { value: "openProject", match: "exact", case_sensitive: true },
//   { value: "openProj", match: "contains", case_sensitive: true },
//   { value: "OPENPROJECT", match: "exact", case_sensitive: false },
//   { value: "OPENPROJ", match: "contains", case_sensitive: false },
// ] as const;
//
// describe.each(memberFields)(
//   "$kind seeds for $nodeKind / $field",
//   ({ kind, nodeKind, field }) => {
//     it("retains scalar and array member locations", () => {
//       const values: readonly [JsonValue, string][] = [
//         ["openProject", ""],
//         [["closeProject", "openProject"], "[1]"],
//       ];
//       for (const [value, suffix] of values) {
//         const node = memberNode(nodeKind, { [field]: value });
//         expect(findApplicationFeatureSeeds([node], seed(kind))).toEqual([
//           propertyMatch(node, `${field}${suffix}`),
//         ]);
//       }
//     });
//   },
// );
//
// describe("shared array-member matching semantics", () => {
//   const kind = "api";
//   const nodeKind = "context-bridge-api";
//   const field = "members";
//
//   it.each(matchingModes)(
//     "matches $match / $value / case-sensitive $case_sensitive",
//     (mode) => {
//       const node = memberNode(nodeKind, {
//         members: ["closeProject", "openProject"],
//       });
//       expect(findApplicationFeatureSeeds([node], { kind, ...mode })).toEqual([
//         propertyMatch(node, "members[1]"),
//       ]);
//     },
//   );
//
//   it("keeps exact, case-sensitive, and non-string exclusions", () => {
//     const node = memberNode(nodeKind, {
//       [field]: [null, 42, true, "openProject"],
//     });
//     for (const value of ["Project", "OPENPROJECT", "42", "true", "null"])
//       expect(findApplicationFeatureSeeds([node], seed(kind, value))).toEqual(
//         [],
//       );
//     expect(
//       findApplicationFeatureSeeds([node], {
//         ...seed(kind, "Project"),
//         match: null,
//       }),
//     ).toEqual([]);
//   });
//
//   it("retains actual indexes through nested arrays and object properties", () => {
//     const properties = {
//       nested: [{ [field]: [null, 42, false, [["openProject"]]] }],
//     };
//     const node = memberNode(nodeKind, properties);
//     const before = structuredClone(node);
//
//     expect(findApplicationFeatureSeeds([node], seed(kind))).toEqual([
//       propertyMatch(node, `nested[0].${field}[3][0][0]`),
//     ]);
//     expect(node).toEqual(before);
//     expect(properties.nested[0]?.[field]).toEqual([
//       null,
//       42,
//       false,
//       [["openProject"]],
//     ]);
//   });
//
//   it("preserves literal dotted-field suffixes for scalars and arrays", () => {
//     const values: readonly [JsonValue, string][] = [
//       ["openProject", ""],
//       [["openProject"], "[0]"],
//     ];
//     for (const [value, suffix] of values) {
//       const node = memberNode(nodeKind, { [`nested.${field}`]: value });
//       expect(findApplicationFeatureSeeds([node], seed(kind))).toEqual([
//         propertyMatch(node, `nested.${field}${suffix}`),
//       ]);
//     }
//   });
//
//   it("does not select near-fields, literal bracket keys, or object descendants", () => {
export const _l = 126;
