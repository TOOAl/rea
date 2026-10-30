export const __stub = 1;
//     const raw = {
//       "com.apple.ibtool.document.objects": {
//         button: { class: "UIButton" },
//       },
//       "com.apple.ibtool.document.connections": { button: connections },
//     };
//     const parsed = parseInterfaceBuilderRecords(raw);
//     expect(parsed.connections).toHaveLength(40_000);
//     expect(parsed.omittedConnections).toBe(1);
//
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "Main.storyboardc/scene.nib",
//           archiveSha256: hash,
//           documentKind: "storyboard_scene",
//           raw,
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({}),
//     });
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "connections:Main.storyboardc/scene.nib",
//         status: "partial",
//         omitted: 1,
//       }),
//     );
//   });
// });
//
// describe("keyed archive identity decoding", () => {
//   it("preserves keyed archive UID identities, arrays, and control actions", () => {
//     const parsed = parseInterfaceBuilderRecords({
//       $archiver: "NSKeyedArchiver",
//       $version: 100000,
//       $objects: [
//         "$null",
//         {
//           subviews: [{ UID: 2 }],
//           $class: { UID: 5 },
//         },
//         { $class: { UID: 6 } },
//         { $class: { UID: 7 } },
//         {
//           source: { UID: 3 },
//           destination: { UID: 2 },
//           label: "runAction:",
//           $class: { UID: 8 },
//         },
//         { $classname: "UIView", $classes: ["UIView", "NSObject"] },
//         { $classname: "UIButton", $classes: ["UIButton", "UIView"] },
//         {
//           $classname: "ViewController",
//           $classes: ["ViewController", "NSObject"],
//         },
//         {
//           $classname: "NSNibControlConnector",
//           $classes: ["NSNibControlConnector", "NSObject"],
//         },
//         [{ UID: 1 }],
//       ],
//       $top: { root: { UID: 9 } },
//     });
//
//     expect(parsed.objects.map(({ id }) => id)).toContain("2");
//     expect(parsed.hierarchy).toMatchObject([
//       {
//         objectID: "1",
//         children: [{ objectID: "2" }],
//       },
//     ]);
//     expect(parsed.connections).toContainEqual(
//       expect.objectContaining({
//         kind: "action",
//         source_id: "2",
//         destination_id: "3",
//         label: "runAction:",
//       }),
//     );
//   });
// });
//
// describe("Interface Builder graph limits", () => {
//   it("reports records omitted by the parser's hard object ceiling", () => {
//     const objects = Object.fromEntries(
//       Array.from({ length: 20_001 }, (_, index) => [
//         `object-${index}`,
//         { class: "UIView" },
//       ]),
//     );
//     const parsed = parseInterfaceBuilderRecords({
//       "com.apple.ibtool.document.objects": objects,
//     });
//
//     expect(parsed.objects).toHaveLength(20_000);
//     expect(parsed.objectCount).toBe(20_001);
//     expect(parsed.omittedObjects).toBe(1);
//   });
//
//   it("keeps hierarchy edges out of the connection edge budget", () => {
//     const relativePath = "Main.nib";
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath,
//           archiveSha256: hash,
//           documentKind: "nib",
//           raw: {
//             "com.apple.ibtool.document.objects": {
//               button: { class: "UIButton" },
//               controller: { customClass: "MainViewController" },
//               parent: { class: "UIView" },
//               child: { class: "UIView" },
//             },
//             "com.apple.ibtool.document.connections": {
//               button: [
//                 {
//                   type: "action",
//                   label: "run:",
//                   destinationId: "controller",
//                 },
//               ],
//             },
//             "com.apple.ibtool.document.hierarchy": [
//               {
//                 objectID: "parent",
//                 children: [
//                   { objectID: "child", children: [{ objectID: "button" }] },
//                 ],
//               },
//             ],
//           },
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({
//         max_objects: 20,
//         max_connections: 1,
//       }),
//     });
//
//     expect(
//       result.graph.edges.filter(({ relation }) => relation === "target_action"),
//     ).toHaveLength(3);
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: `connections:${relativePath}`,
//         status: "complete",
//         omitted: 0,
//       }),
//     );
//   });
//
//   it("keeps a later document complete when an earlier hierarchy hits the limit", () => {
//     const document = (
//       relativePath: string,
//       objectId: string,
//       references: number,
//     ) => ({
//       relativePath,
//       archiveSha256: hash,
//       documentKind: "nib" as const,
//       raw: {
//         "com.apple.ibtool.document.objects": {
//           [objectId]: { class: "UIView" },
//         },
//         "com.apple.ibtool.document.hierarchy": Array.from(
//           { length: references },
//           () => ({ objectID: objectId }),
//         ),
//       },
//     });
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         document("First.nib", "first", 5),
//         document("Second.nib", "second", 1),
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({ max_objects: 4 }),
//     });
//
//     expect(
//       result.documents.map(({ hierarchy_complete }) => hierarchy_complete),
//     ).toEqual([false, true]);
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "hierarchy:Second.nib",
//         status: "complete",
//       }),
//     );
//   });
// });
//
// describe("Interface Builder hierarchy completeness", () => {
//   it("marks only the later document incomplete when its hierarchy root is omitted", () => {
//     const document = (relativePath: string, objectId: string) => ({
//       relativePath,
//       archiveSha256: hash,
//       documentKind: "nib" as const,
//       raw: {
//         "com.apple.ibtool.document.objects": {
//           [objectId]: { class: "UIView" },
//         },
//         "com.apple.ibtool.document.hierarchy": [{ objectID: objectId }],
//       },
//     });
//     const result = buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         document("First.nib", "first"),
//         document("Second.nib", "second"),
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({ max_objects: 2 }),
//     });
//
//     expect(
//       result.documents.map(({ hierarchy_complete }) => hierarchy_complete),
//     ).toEqual([true, false]);
//     expect(result.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "hierarchy:Second.nib",
//         status: "partial",
//         reason: "graph_limit_reached",
//         omitted: 1,
//       }),
//     );
//   });
// });
//
// describe("Interface Builder hierarchy record limits", () => {
//   const analyze = (
//     hierarchy: unknown[],
//     maxObjects?: number,
//     objects: Record<string, unknown> = {},
//   ) =>
//     buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "Main.nib",
//           archiveSha256: hash,
export const _l = 248;
