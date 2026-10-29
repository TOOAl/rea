export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import { buildBinary, parseBinary } from "plist";
//
// import {
//   buildInterfaceBuilderAnalysis,
//   interfaceBuilderLimitsSchema,
// } from "./interfaceBuilderGraph.js";
// import { parseInterfaceBuilderRecords } from "./interfaceBuilderKeyedArchive.js";
//
// const hash = "a".repeat(64);
//
// describe("compiled Interface Builder graph projection", () => {
//   it("normalizes object, hierarchy, action, outlet, and segue facts", () => {
//     const raw = {
//       "com.apple.ibtool.document.objects": {
//         controller: { customClass: "StoreViewController", label: "Store" },
//         button: { class: "UIButton", title: "Build" },
//         next: { customClass: "BuildViewController" },
//       },
//       "com.apple.ibtool.document.connections": {
//         button: [
//           {
//             type: "action",
//             label: "buildTapped:",
//             destinationId: "controller",
//           },
//           { type: "segue", identifier: "showBuild", destinationId: "next" },
//         ],
//         controller: [
//           { type: "outlet", label: "buildButton", destinationId: "button" },
//         ],
//       },
//       "com.apple.ibtool.document.hierarchy": [
//         { objectID: "controller", children: [{ objectID: "button" }] },
//       ],
//       "com.apple.ibtool.document.classes": { StoreViewController: {} },
//     };
//     const decoded = parseInterfaceBuilderRecords(raw);
//     expect(decoded.objects).toHaveLength(3);
//     expect(decoded.connections.map(({ kind }) => kind)).toEqual([
//       "action",
//       "segue",
//       "outlet",
//     ]);
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "Views/Main.storyboardc/scene.nib/objects.nib",
//           archiveSha256: hash,
//           documentKind: "storyboard_scene",
//           raw,
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({}),
//     });
//     expect(result.graph.nodes.some(({ name }) => name === "buildTapped:")).toBe(
//       true,
//     );
//     expect(result.graph.nodes[0]?.evidence[0]).toMatchObject({
//       artifact_path: "Views/Main.storyboardc/scene.nib/objects.nib",
//       artifact_sha256: hash,
//     });
//     expect(result.graph.edges).toContainEqual(
//       expect.objectContaining({
//         relation: "segue_to",
//         resolution: "observed",
//       }),
//     );
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "hierarchy:Views/Main.storyboardc/scene.nib/objects.nib",
//         status: "complete",
//       }),
//     );
//   });
//
//   it("keeps missing external destinations as unresolved evidence", () => {
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "Legacy.nib",
//           archiveSha256: hash,
//           documentKind: "nib",
//           raw: {
//             "com.apple.ibtool.document.objects": {
//               button: { class: "UIButton" },
//             },
//             "com.apple.ibtool.document.connections": {
//               button: [
//                 { type: "action", label: "save:", destinationId: "external" },
//               ],
//             },
//           },
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({ max_objects: 3 }),
//     });
//     expect(result.graph.edges).toContainEqual(
//       expect.objectContaining({
//         relation: "target_action",
//         resolution: "unresolved",
//         reason: "endpoint_omitted_by_object_limit",
//         evidence: [
//           expect.objectContaining({
//             kind: "interface_builder_resource",
//             artifact_path: "Legacy.nib",
//             artifact_sha256: hash,
//           }),
//         ],
//       }),
//     );
//     const retainedNodes = new Set(result.graph.nodes.map(({ id }) => id));
//     expect(
//       result.graph.edges.every(
//         ({ from, to }) =>
//           retainedNodes.has(from) && (to === null || retainedNodes.has(to)),
//       ),
//     ).toBe(true);
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "graph_nodes",
//         status: "partial",
//         reason: "max_objects_reached",
//       }),
//     );
//     expect(result.graph.truncated).toBe(true);
//   });
//
//   it("reads recognized objects from a compiled NSKeyedArchiver object table", () => {
//     const bytes = buildBinary({
//       $archiver: "NSKeyedArchiver",
//       $version: 100000,
//       $objects: [
//         "$null",
//         { $class: { UID: 2 }, title: "Build", identifier: "build-button" },
//         {
//           $classname: "UIButton",
//           $classes: ["UIButton", "UIControl", "UIView", "NSObject"],
//         },
//       ],
//       $top: { root: { UID: 1 } },
//     });
//     const parsed = parseInterfaceBuilderRecords(parseBinary(bytes));
//     expect(parsed.objects).toMatchObject([
//       {
//         id: "1",
//         kind: "control",
//         class_name: "UIButton",
//         name: "Build",
//       },
//     ]);
//   });
// });
//
// describe("keyed archive objects with unresolved classes", () => {
//   it("keeps an archived object whose class reference cannot be resolved", () => {
//     const parsed = parseInterfaceBuilderRecords({
//       $archiver: "NSKeyedArchiver",
//       $version: 100000,
//       $objects: [
//         "$null",
//         { $class: { UID: 99 }, label: "Unresolved object" },
//         { $classname: "UIView", $classes: ["UIView", "NSObject"] },
//         { $class: { UID: 2 }, "NS.string": "ok" },
//         "plain scalar",
//       ],
//       $top: { root: { UID: 3 } },
//     });
//     // The class descriptor and the scalar are not archived objects.
//     expect(parsed.objects).toMatchObject([
//       {
//         id: "1",
//         kind: "other",
//         class_name: null,
//         name: "Unresolved object",
//         attributes: { label: "Unresolved object", $class: { UID: 99 } },
//       },
//       { id: "3", kind: "view", class_name: "UIView" },
//     ]);
//     expect(parsed.objects[1]?.attributes).not.toHaveProperty("$class");
//     expect(parsed.objectCount).toBe(2);
//   });
//
//   it("keeps an unresolved hierarchy root's label and coverage in the graph", () => {
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "Main.nib",
//           archiveSha256: hash,
//           documentKind: "nib",
//           raw: {
//             $archiver: "NSKeyedArchiver",
//             $version: 100000,
//             $objects: [
//               "$null",
//               { $class: { UID: 99 }, label: "Unresolved object" },
//               { $classname: "UIView", $classes: ["UIView", "NSObject"] },
//               { $class: { UID: 2 }, "NS.string": "ok" },
//             ],
//             $top: { root: { UID: 1 } },
//           },
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({}),
//     });
//     const objectNodes = result.graph.nodes.filter(
//       ({ attributes }) => attributes.interface_builder_object_id !== undefined,
//     );
//     expect(objectNodes).toMatchObject([
//       {
//         kind: "unknown",
//         name: "Unresolved object",
//         attributes: { interface_builder_object_id: "1", class_name: null },
//       },
//       { kind: "view", attributes: { interface_builder_object_id: "3" } },
//     ]);
//     expect(result.documents[0]?.object_count).toBe(2);
//     expect(
//       result.graph.edges.some(
//         ({ relation, to, resolution }) =>
//           relation === "contains" &&
//           to === objectNodes[0]?.id &&
//           resolution === "observed",
//       ),
//     ).toBe(true);
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "objects:Main.nib",
//         status: "complete",
//         examined: 2,
//         omitted: 0,
//       }),
//     );
//   });
// });
//
// describe("Interface Builder parser bounds", () => {
//   it("reports connections discarded by the parser's hard ceiling", () => {
//     const connections = Array.from({ length: 40_001 }, (_, index) => ({
//       type: "custom-connection",
//       label: `action${String(index)}:`,
//     }));
export const _l = 248;
