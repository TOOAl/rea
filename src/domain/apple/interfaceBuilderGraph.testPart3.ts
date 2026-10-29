export const __stub = 1;
//           documentKind: "nib",
//           raw: {
//             "com.apple.ibtool.document.objects": objects,
//             "com.apple.ibtool.document.hierarchy": hierarchy,
//           },
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse(
//         maxObjects === undefined ? {} : { max_objects: maxObjects },
//       ),
//     });
//   const hierarchyFacet = (result: ReturnType<typeof analyze>) =>
//     result.graph.coverage.find(({ facet }) => facet === "hierarchy:Main.nib");
//
//   it("keeps an identified record after more than 20,000 structural records", () => {
//     const hierarchy: unknown[] = Array.from({ length: 20_001 }, () => ({
//       children: [],
//     }));
//     hierarchy[20_000] = { objectID: "tail", children: [] };
//
//     const result = analyze(hierarchy);
//
//     expect(
//       result.graph.nodes.map(
//         ({ attributes }) => attributes.interface_builder_object_id,
//       ),
//     ).toContain("tail");
//     expect(result.graph.edges).toHaveLength(1);
//     expect(result.graph.truncated).toBe(false);
//     expect(hierarchyFacet(result)).toMatchObject({
//       status: "complete",
//       examined: 1,
//       omitted: 0,
//     });
//   });
//
//   it("counts identified records beyond the object limit as omitted", () => {
//     const result = analyze(
//       ["a", "b", "c", "d"].map((objectID) => ({ objectID, children: [] })),
//       2,
//     );
//
//     expect(result.documents[0]?.hierarchy_complete).toBe(false);
//     expect(result.graph.truncated).toBe(true);
//     expect(hierarchyFacet(result)).toMatchObject({
//       status: "partial",
//       reason: "graph_limit_reached",
//       examined: 2,
//       omitted: 2,
//     });
//   });
//
//   it("stays complete when the identified records exactly reach the object limit", () => {
//     // The root and both objects fill the three graph nodes; the third
//     // hierarchy record reaches the hierarchy limit and has a structural child.
//     const result = analyze(
//       [
//         { objectID: "a", children: [{ objectID: "b", children: [] }] },
//         { objectID: "b", children: [{ children: [] }] },
//       ],
//       3,
//       { a: { class: "UIView" }, b: { class: "UIView" } },
//     );
//
//     expect(result.documents[0]?.hierarchy_complete).toBe(true);
//     expect(result.graph.truncated).toBe(false);
//     expect(hierarchyFacet(result)).toMatchObject({
//       status: "complete",
//       examined: 3,
//       omitted: 0,
//     });
//   });
// });
//
// describe("keyed archive object references", () => {
//   it("keeps referenced objects as stubs so shared and cyclic references stay finite", () => {
//     // Each view references its window, superview, and next key view, so
//     // inlining references would expand the table into an exponential tree.
//     const viewCount = 40;
//     const views = Array.from({ length: viewCount }, (_, index) => ({
//       $class: { UID: 1 },
//       NSWindow: { UID: 2 },
//       NSSuperview: { UID: index === 0 ? 2 : 3 + index - 1 },
//       NSNextKeyView: { UID: 3 + ((index + 1) % viewCount) },
//       NSSubviews: index + 1 < viewCount ? [{ UID: 3 + index + 1 }] : [],
//       NSTitle: { UID: 3 + viewCount },
//     }));
//     const parsed = parseInterfaceBuilderRecords({
//       $archiver: "NSKeyedArchiver",
//       $objects: [
//         "$null",
//         { $classname: "NSView", $classes: ["NSView", "NSObject"] },
//         { $class: { UID: 3 + viewCount + 1 }, NSContentView: { UID: 3 } },
//         ...views,
//         "Title",
//         { $classname: "NSWindow", $classes: ["NSWindow", "NSObject"] },
//       ],
//       $top: { root: { UID: 2 } },
//     });
//
//     expect(parsed.objects).toHaveLength(viewCount + 1);
//     const view = parsed.objects.find(({ id }) => id === "3");
//     expect(view?.name).toBe("NSView");
//     expect(view?.attributes).toEqual({
//       NSWindow: { archiveUID: 2, className: "NSWindow" },
//       NSSuperview: { archiveUID: 2, className: "NSWindow" },
//       NSNextKeyView: { archiveUID: 4, className: "NSView" },
//       NSSubviews: [{ archiveUID: 4, className: "NSView" }],
//       NSTitle: "Title",
//     });
//     expect(parsed.hierarchy).toMatchObject([
//       {
//         objectID: "2",
//         children: [{ objectID: "3", children: [{ objectID: "4" }] }],
//       },
//     ]);
//   });
//
//   it("resolves XML CF$UID references and the archived nil", () => {
//     const parsed = parseInterfaceBuilderRecords({
//       $archiver: "NSKeyedArchiver",
//       $objects: [
//         "$null",
//         {
//           $class: { CF$UID: 3 },
//           NSSource: { CF$UID: 2 },
//           source: { CF$UID: 2 },
//           destination: { CF$UID: 0 },
//           label: { CF$UID: 4 },
//         },
//         { $class: { CF$UID: 5 } },
//         {
//           $classname: "NSNibOutletConnector",
//           $classes: ["NSNibOutletConnector", "NSObject"],
//         },
//         { $class: { CF$UID: 6 }, "NS.string": "delegate" },
//         { $classname: "NSButton", $classes: ["NSButton", "NSObject"] },
//         {
//           $classname: "NSMutableString",
//           $classes: ["NSMutableString", "NSString", "NSObject"],
//         },
//       ],
//       $top: {},
//     });
//
//     expect(parsed.connections).toEqual([
//       expect.objectContaining({
//         kind: "outlet",
//         source_id: "2",
//         destination_id: null,
//         label: "delegate",
//       }),
//     ]);
//     expect(parsed.objects.find(({ id }) => id === "2")).toMatchObject({
//       class_name: "NSButton",
//     });
//   });
// });
//
// describe("AppKit keyed archive connectors", () => {
//   it("reads outlet and control connectors from NS-prefixed keys", () => {
//     const parsed = parseInterfaceBuilderRecords({
//       $archiver: "NSKeyedArchiver",
//       $objects: [
//         "$null",
//         { $class: { UID: 6 } },
//         { $class: { UID: 7 }, identifier: "unrelated-identifier" },
//         {
//           $class: { UID: 8 },
//           NSSource: { UID: 1 },
//           NSDestination: { UID: 2 },
//           NSLabel: { UID: 5 },
//         },
//         {
//           $class: { UID: 9 },
//           NSSource: { UID: 2 },
//           NSDestination: { UID: 1 },
//           NSLabel: { UID: 10 },
//         },
//         "o_button",
//         {
//           $classname: "NSCustomObject",
//           $classes: ["NSCustomObject", "NSObject"],
//         },
//         { $classname: "NSButton", $classes: ["NSButton", "NSObject"] },
//         {
//           $classname: "NSNibOutletConnector",
//           $classes: ["NSNibOutletConnector", "NSNibConnector", "NSObject"],
//         },
//         {
//           $classname: "NSNibControlConnector",
//           $classes: ["NSNibControlConnector", "NSNibConnector", "NSObject"],
//         },
//         "buttonClicked:",
//       ],
//       $top: {},
//     });
//
//     expect(parsed.connections).toEqual([
//       expect.objectContaining({
//         kind: "outlet",
//         source_id: "1",
//         destination_id: "2",
//         label: "o_button",
//       }),
//       expect.objectContaining({
//         kind: "action",
//         source_id: "2",
//         destination_id: "1",
//         label: "buttonClicked:",
//       }),
//     ]);
//   });
//
//   it("projects an AppKit action from the control through the selector to its target", () => {
//     const analysis = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "MainMenu.nib",
//           archiveSha256: hash,
//           documentKind: "nib",
//           raw: {
//             $archiver: "NSKeyedArchiver",
//             $objects: [
//               "$null",
//               { $class: { UID: 4 } },
//               { $class: { UID: 5 } },
//               {
//                 $class: { UID: 6 },
//                 NSSource: { UID: 2 },
//                 NSDestination: { UID: 1 },
//                 NSLabel: "buttonClicked:",
//               },
//               { $classname: "BuildDelegate", $classes: ["NSObject"] },
//               { $classname: "NSButton", $classes: ["NSButton", "NSObject"] },
//               {
//                 $classname: "NSNibControlConnector",
//                 $classes: ["NSNibControlConnector", "NSObject"],
//               },
//             ],
//             $top: {},
//           },
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({}),
//     });
export const _l = 248;
