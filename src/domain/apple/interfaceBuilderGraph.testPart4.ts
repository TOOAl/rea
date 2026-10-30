export const __stub = 1;
//     const byId = new Map(analysis.graph.nodes.map((node) => [node.id, node]));
//     const action = analysis.graph.nodes.find(({ kind }) => kind === "action");
//     const from = analysis.graph.edges
//       .filter(
//         ({ to, relation }) => relation === "target_action" && to === action?.id,
//       )
//       .map(({ from: id }) => byId.get(id)?.name);
//     const to = analysis.graph.edges
//       .filter(
//         ({ from: id, relation }) =>
//           relation === "target_action" && id === action?.id,
//       )
//       .map(({ to: id }) => (id === null ? null : byId.get(id)?.kind));
//     expect(from).toEqual(["NSButton"]);
//     expect(to).toEqual(expect.arrayContaining(["objc_selector", "unknown"]));
//   });
// });
//
// describe("keyed archive unresolved connectors", () => {
//   const rootedOutletArchive = (
//     connection: Record<string, unknown>,
//     connectionClass = "UIRuntimeOutletConnection",
//     label = "view",
//   ) => ({
//     $archiver: "NSKeyedArchiver",
//     $version: 100000,
//     $objects: [
//       "$null",
//       { $class: { CF$UID: 4 } },
//       { $class: { CF$UID: 5 } },
//       { $class: { CF$UID: 6 }, ...connection },
//       {
//         $classname: "UIViewController",
//         $classes: ["UIViewController", "UIResponder", "NSObject"],
//       },
//       { $classname: "UIView", $classes: ["UIView", "UIResponder", "NSObject"] },
//       {
//         $classname: connectionClass,
//         $classes: [connectionClass, "UIRuntimeConnection", "NSObject"],
//       },
//       label,
//       {
//         $class: { CF$UID: 11 },
//         "NS.objects": [{ CF$UID: 1 }, { CF$UID: 2 }, { CF$UID: 3 }],
//       },
//       { $class: { CF$UID: 11 }, "NS.objects": [{ CF$UID: 3 }] },
//       {
//         $class: { CF$UID: 11 },
//         "NS.objects": [{ CF$UID: 1 }, { CF$UID: 2 }],
//       },
//       { $classname: "NSArray", $classes: ["NSArray", "NSObject"] },
//     ],
//     $top: {
//       root: { CF$UID: 8 },
//       UINibConnectionsKey: { CF$UID: 9 },
//       UINibObjectsKey: { CF$UID: 10 },
//       UINibTopLevelObjectsKey: { CF$UID: 10 },
//     },
//   });
//
//   const project = (raw: unknown) =>
//     buildInterfaceBuilderAnalysis({
//       targetSha256: hash,
//       toolVersion: "test",
//       documents: [
//         {
//           relativePath: "Main.nib",
//           archiveSha256: hash,
//           documentKind: "nib",
//           raw,
//         },
//       ],
//       limits: interfaceBuilderLimitsSchema.parse({}),
//     });
//
//   it("covers a resolvable connector as a complete examined connection", () => {
//     const raw = rootedOutletArchive({
//       UISource: { CF$UID: 1 },
//       UIDestination: { CF$UID: 2 },
//       UILabel: { CF$UID: 7 },
//     });
//     expect(parseInterfaceBuilderRecords(raw).unresolvedConnections).toBe(0);
//     expect(project(raw).graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "connections:Main.nib",
//         status: "complete",
//         examined: 1,
//         omitted: 0,
//       }),
//     );
//   });
//   it("projects keyed UIKit event connections as actions and retains the mask", () => {
//     const raw = rootedOutletArchive(
//       {
//         UISource: { CF$UID: 1 },
//         UIDestination: { CF$UID: 2 },
//         UILabel: { CF$UID: 7 },
//         UIEventMask: 64,
//       },
//       "UIRuntimeEventConnection",
//       "tapped:",
//     );
//     expect(parseInterfaceBuilderRecords(raw).connections[0]).toMatchObject({
//       kind: "action",
//       source_id: "1",
//       destination_id: "2",
//       label: "tapped:",
//       attributes: { UIEventMask: 64 },
//     });
//     const analysis = project(raw);
//     expect(analysis.graph.nodes).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ kind: "action", name: "tapped:" }),
//         expect.objectContaining({ kind: "objc_selector", name: "tapped:" }),
//       ]),
//     );
//     expect(analysis.graph.edges).toContainEqual(
//       expect.objectContaining({ relation: "target_action" }),
//     );
//     expect(analysis.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "connections:Main.nib",
//         status: "complete",
//         examined: 1,
//         omitted: 0,
//       }),
//     );
//   });
//
//   it("reports a recognized connector with no resolvable owner as unresolved", () => {
//     const raw = rootedOutletArchive({
//       UIDestination: { CF$UID: 2 },
//       UILabel: { CF$UID: 7 },
//     });
//     expect(parseInterfaceBuilderRecords(raw).unresolvedConnections).toBe(1);
//
//     const analysis = project(raw);
//     expect(analysis.graph.nodes.some(({ kind }) => kind === "outlet")).toBe(
//       false,
//     );
//     expect(analysis.graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "connections:Main.nib",
//         status: "partial",
//         reason: "connection_unresolved",
//         examined: 0,
//         omitted: 1,
//       }),
//     );
//     expect(analysis.graph.truncated).toBe(true);
//
//     const eventWithoutSource = rootedOutletArchive(
//       {
//         UIDestination: { CF$UID: 2 },
//         UILabel: { CF$UID: 7 },
//         UIEventMask: 64,
//       },
//       "UIRuntimeEventConnection",
//       "tapped:",
//     );
//     expect(
//       parseInterfaceBuilderRecords(eventWithoutSource).unresolvedConnections,
//     ).toBe(1);
//     expect(project(eventWithoutSource).graph.coverage).toContainEqual(
//       expect.objectContaining({
//         facet: "connections:Main.nib",
//         status: "partial",
//         reason: "connection_unresolved",
//         omitted: 1,
//       }),
//     );
//   });
// });
//
// it("names the archive once per evidence record", () => {
//   const relativePath = "Views/Main.storyboardc/scene.nib/objects.nib";
//   const result = buildInterfaceBuilderAnalysis({
//     targetSha256: hash,
//     toolVersion: "test",
//     documents: [
//       {
//         relativePath,
//         archiveSha256: hash,
//         documentKind: "storyboard_scene",
//         raw: {
//           "com.apple.ibtool.document.objects": {
//             controller: { customClass: "StoreViewController" },
//             next: { customClass: "BuildViewController" },
//           },
//           "com.apple.ibtool.document.connections": {
//             controller: [
//               { type: "segue", identifier: "showBuild", destinationId: "next" },
//             ],
//           },
//         },
//       },
//     ],
//     limits: interfaceBuilderLimitsSchema.parse({}),
//   });
//   const evidence = [...result.graph.nodes, ...result.graph.edges].flatMap(
//     (item) => item.evidence,
//   );
//   expect(new Set(evidence.map(({ artifact_path }) => artifact_path))).toEqual(
//     new Set([relativePath]),
//   );
//   expect(evidence.map(({ description }) => description)).toEqual(
//     expect.arrayContaining([
//       "compiled document",
//       "object controller",
//       "segue showBuild",
//     ]),
//   );
//   expect(
//     evidence.filter(({ description }) => description.includes(relativePath)),
//   ).toEqual([]);
// });
//
// it("states each object's class, label, and ID once", () => {
//   const { objects } = parseInterfaceBuilderRecords({
//     "com.apple.ibtool.document.objects": {
//       "7": {
//         customClass: "NSButton",
//         label: "Start",
//         objectID: "7",
//         nibValues: { NSContents: "Start" },
//       },
//       button: { class: "UIButton", title: "Build", objectID: "authored" },
//     },
//   });
//   expect(objects).toEqual([
//     expect.objectContaining({
//       id: "7",
//       class_name: "NSButton",
//       name: "Start",
//       attributes: { nibValues: { NSContents: "Start" } },
//     }),
//     expect.objectContaining({
//       id: "button",
//       class_name: "UIButton",
//       name: "Build",
//       // Values that differ from the canonical fields stay as authored.
//       attributes: { class: "UIButton", title: "Build", objectID: "authored" },
//     }),
//   ]);
// });
export const _l = 245;
