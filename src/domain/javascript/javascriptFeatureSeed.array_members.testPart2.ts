export const __stub = 1;
//     const cases = [
//       {
//         properties: { [`other_${field}`]: "openProject" },
//         path: `other_${field}`,
//       },
//       { properties: { [`${field}[0]`]: "openProject" }, path: `${field}[0]` },
//       {
//         properties: { [`nested.${field}[0]`]: ["openProject"] },
//         path: `nested.${field}[0][0]`,
//       },
//       {
//         properties: { [field]: { name: "openProject" } },
//         path: `${field}.name`,
//       },
//       {
//         properties: { [field]: [{ name: "openProject" }] },
//         path: `${field}[0].name`,
//       },
//     ];
//     for (const { properties, path } of cases) {
//       const node = memberNode(nodeKind, properties);
//       expect(findApplicationFeatureSeeds([node], seed(kind))).toEqual([]);
//       expect(findApplicationFeatureSeeds([node], seed("string"))).toEqual([
//         propertyMatch(node, path),
//       ]);
//     }
//   });
// });
//
// describe("feature seed selection controls", () => {
//   it.each([
//     { kind: "api", nodeKind: "context-bridge-api", field: "label" },
//     { kind: "api", nodeKind: "context-bridge-api", field: "api_name" },
//     { kind: "api", nodeKind: "context-bridge-api", field: "key" },
//     { kind: "module", nodeKind: "javascript-module", field: "label" },
//     { kind: "module", nodeKind: "javascript-module", field: "module_key" },
//     { kind: "module", nodeKind: "javascript-module", field: "path" },
//     { kind: "module", nodeKind: "javascript-module", field: "source" },
//     { kind: "module", nodeKind: "javascript-module", field: "original_source" },
//     { kind: "native-export", nodeKind: "native-export", field: "label" },
//     { kind: "native-export", nodeKind: "native-export", field: "key" },
//     { kind: "route", nodeKind: "endpoint", field: "value" },
//     { kind: "route", nodeKind: "endpoint", field: "path" },
//     { kind: "channel", nodeKind: "ipc-channel", field: "label" },
//     { kind: "channel", nodeKind: "ipc-channel", field: "channel" },
//     { kind: "channel", nodeKind: "ipc-channel", field: "key" },
//   ] as const)(
//     "keeps $kind / $field scalar-only selection unchanged",
//     ({ kind, nodeKind, field }) => {
//       const scalar = memberNode(nodeKind, {
//         endpoint_kind: "route",
//         [field]: "openProject",
//       });
//       const array = memberNode(nodeKind, {
//         endpoint_kind: "route",
//         [field]: ["openProject"],
//       });
//       expect(findApplicationFeatureSeeds([scalar], seed(kind))).toEqual([
//         propertyMatch(scalar, field),
//       ]);
//       expect(findApplicationFeatureSeeds([array], seed(kind))).toEqual([]);
//       expect(findApplicationFeatureSeeds([array], seed("string"))).toEqual([
//         propertyMatch(array, `${field}[0]`),
//       ]);
//     },
//   );
//
//   it("excludes route labels while preserving generic scalar and array matching", () => {
//     const scalar = memberNode("endpoint", {
//       endpoint_kind: "route",
//       label: "route endpoint",
//     });
//     const array = memberNode("endpoint", {
//       endpoint_kind: "route",
//       label: ["route endpoint"],
//     });
//
//     expect(
//       findApplicationFeatureSeeds([scalar], seed("route", "route endpoint")),
//     ).toEqual([]);
//     expect(
//       findApplicationFeatureSeeds([array], seed("route", "route endpoint")),
//     ).toEqual([]);
//     expect(
//       findApplicationFeatureSeeds([scalar], seed("string", "route endpoint")),
//     ).toEqual([propertyMatch(scalar, "label")]);
//     expect(
//       findApplicationFeatureSeeds([array], seed("string", "route endpoint")),
//     ).toEqual([propertyMatch(array, "label[0]")]);
//   });
//
//   it("keeps generic matching and scalar label and identity selection", () => {
//     const node = memberNode("context-bridge-api", { members: ["openProject"] });
//     expect(findApplicationFeatureSeeds([node], seed("string"))).toEqual([
//       propertyMatch(node, "members[0]"),
//     ]);
//     expect(
//       findApplicationFeatureSeeds([node], seed("api", "desktopApi")),
//     ).toEqual([
//       {
//         node_id: node.node_id,
//         kind: node.kind,
//         basis: "label",
//         field: "observations[0].label",
//       },
//     ]);
//     expect(
//       findApplicationFeatureSeeds([node], seed("node-id", node.node_id)),
//     ).toEqual([
//       {
//         node_id: node.node_id,
//         kind: node.kind,
//         basis: "node-id",
//         field: "node_id",
//       },
//     ]);
//     const module = memberNode("javascript-module", {});
//     expect(
//       findApplicationFeatureSeeds([module], seed("module", "preload.js")),
//     ).toEqual([
//       {
//         node_id: module.node_id,
//         kind: module.kind,
//         basis: "identity",
//         field: "identity.path",
//       },
export const _l = 126;
