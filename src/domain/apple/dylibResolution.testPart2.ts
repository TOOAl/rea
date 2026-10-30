export const __stub = 1;
//         }),
//         "Contents/Frameworks/libfound.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(
//       trace.findings.map(({ kind, edge_index: index }) => [kind, index]),
//     ).toEqual([
//       ["earlier-rpath-candidate-absent", 0],
//       ["dyld-environment-present", null],
//     ]);
//     expect(trace.findings[0]?.explanation).toContain(
//       "Contents/MacOS/../Overrides/libfound.dylib",
//     );
//     expect(trace.findings[0]?.explanation).toContain(
//       "Unmodeled environment overrides",
//     );
//     expect(trace.coverage.status).toBe("partial");
//   });
// });
//
// describe("dyld resolution outcomes: checking candidate format and compatibility", () => {
//   it("reports non-Mach-O, malformed and wrong-architecture candidates", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: [
//             "@executable_path/a",
//             "@executable_path/b",
//             "@executable_path/c",
//           ],
//           dependencies: [dependency("@rpath/lib.dylib")],
//         }),
//         "Contents/MacOS/a/lib.dylib": "data",
//         "Contents/MacOS/b/lib.dylib": {
//           status: "malformed",
//           reason: "load command 0 has invalid cmdsize 0",
//         },
//         "Contents/MacOS/c/lib.dylib": parsed(slice({ architecture: "x86_64" })),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(
//       edgeFor(trace, MAIN, "@rpath/lib.dylib").candidates.map(
//         ({ outcome }) => outcome,
//       ),
//     ).toEqual(["not-mach-o", "malformed", "architecture-missing"]);
//     expect(trace.coverage).toEqual({
//       status: "partial",
//       unparsed_images: ["Contents/MacOS/b/lib.dylib"],
//       roots_without_architecture: [],
//     });
//     expect(trace.images.map(({ path }) => path)).toEqual([
//       MAIN,
//       "Contents/MacOS/b/lib.dylib",
//       "Contents/MacOS/c/lib.dylib",
//     ]);
//   });
//
//   it("skips non-loadable and wrong-platform rpath candidates", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: [
//             "@executable_path/a",
//             "@executable_path/b",
//             "@executable_path/c",
//           ],
//           dependencies: [dependency("@rpath/lib.dylib")],
//         }),
//         "Contents/MacOS/a/lib.dylib": parsed(
//           slice({ file_type: "other", file_type_code: 1 }),
//         ),
//         "Contents/MacOS/b/lib.dylib": parsed(slice({ platform: 7 })),
//         "Contents/MacOS/c/lib.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     const edge = edgeFor(trace, MAIN, "@rpath/lib.dylib");
//     expect(edge.candidates.map(({ outcome }) => outcome)).toEqual([
//       "not-loadable",
//       "platform-mismatch",
//       "resolved",
//     ]);
//     expect(edge.resolution).toEqual({
//       status: "resolved",
//       image: "Contents/MacOS/c/lib.dylib",
//     });
//   });
//
//   it("preserves unknown platform compatibility before a later known candidate", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["@executable_path/a", "@executable_path/b"],
//           dependencies: [dependency("@rpath/lib.dylib")],
//         }),
//         "Contents/MacOS/a/lib.dylib": parsed(slice({ platform: null })),
//         "Contents/MacOS/b/lib.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     const edge = edgeFor(trace, MAIN, "@rpath/lib.dylib");
//     expect(edge.candidates.map(({ outcome }) => outcome)).toEqual([
//       "undetermined",
//       "resolved",
//     ]);
//     expect(edge.resolution.status).toBe("conditional");
//   });
//
//   it("applies dyld Catalyst and zippered platform compatibility", async () => {
//     const catalystProcess = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           platform: 6,
//           platforms: [6],
//           rpaths: ["@executable_path/catalyst"],
//           dependencies: [dependency("@rpath/lib.dylib")],
//         }),
//         "Contents/MacOS/catalyst/lib.dylib": parsed(
//           slice({ platform: 1, platforms: [1] }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(
//       edgeFor(catalystProcess, MAIN, "@rpath/lib.dylib").resolution,
//     ).toEqual({
//       status: "resolved",
//       image: "Contents/MacOS/catalyst/lib.dylib",
//     });
//
//     const zipperedImage = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           platform: 1,
//           platforms: [1],
//           rpaths: ["@executable_path/zippered"],
//           dependencies: [dependency("@rpath/lib.dylib")],
//         }),
//         "Contents/MacOS/zippered/lib.dylib": parsed(
//           slice({ platform: null, platforms: [1, 6] }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(
//       edgeFor(zipperedImage, MAIN, "@rpath/lib.dylib").resolution,
//     ).toMatchObject({
//       status: "resolved",
//       image: "Contents/MacOS/zippered/lib.dylib",
//     });
//   });
// });
//
// describe("dyld load order", () => {
//   it("loads each image once per process and reuses matching install names", async () => {
//     const a = "Contents/Frameworks/libA.dylib";
//     const b = "Contents/Frameworks/libB.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["@executable_path/../Frameworks"],
//           dependencies: [
//             dependency("@rpath/libA.dylib"),
//             dependency("@rpath/libB.dylib"),
//           ],
//         }),
//         [a]: parsed(
//           slice({
//             install_name: "@rpath/libA.dylib",
//             dependencies: [
//               dependency("@rpath/libB.dylib"),
//               dependency("@rpath/libA.dylib"),
//             ],
//           }),
//         ),
//         [b]: parsed(
//           slice({
//             install_name: "@rpath/libB.dylib",
//             dependencies: [dependency("@rpath/libA.dylib")],
//           }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(
//       trace.edges.map(
//         ({ loader, install_name: name }) =>
//           `${loader.split("/").at(-1)}>${name}`,
//       ),
//     ).toEqual([
//       "App>@rpath/libA.dylib",
//       "App>@rpath/libB.dylib",
//       "libA.dylib>@rpath/libB.dylib",
//       "libA.dylib>@rpath/libA.dylib",
//       "libB.dylib>@rpath/libA.dylib",
//     ]);
//     expect(edgeFor(trace, b, "@rpath/libA.dylib").candidates).toEqual([
//       expect.objectContaining({ source: "already-loaded", resolved_path: a }),
//     ]);
//     expect(edgeFor(trace, a, "@rpath/libA.dylib").install_name_matches).toBe(
//       true,
//     );
//   });
//
//   it("leaves @executable_path undetermined for a library root and filters architectures", async () => {
//     const library = "Contents/Frameworks/libroot.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [library]: parsed(
//           slice({ dependencies: [dependency("@executable_path/x.dylib")] }),
//         ),
//         [MAIN]: executable(),
//       }),
//       { roots: [library, MAIN], architecture: "x86_64" },
//     );
//     expect(trace.roots).toEqual([]);
//     expect(trace.coverage.roots_without_architecture).toEqual([library, MAIN]);
//     const arm = await traceDylibLoading(
//       memoryView({
//         [library]: parsed(
//           slice({ dependencies: [dependency("@executable_path/x.dylib")] }),
//         ),
//       }),
//       { roots: [library] },
//     );
//     expect(arm.edges[0]?.candidates).toEqual([
//       expect.objectContaining({
//         source: "executable_path",
//         outcome: "undetermined",
//       }),
//     ]);
//   });
//
//   it("stops when cancelled", async () => {
//     const controller = new AbortController();
//     controller.abort();
//     await expect(
//       traceDylibLoading(memoryView({ [MAIN]: executable() }), {
//         roots: [MAIN],
//         signal: controller.signal,
//       }),
//     ).rejects.toThrow();
//   });
// });
//
// describe("loader-relative dylib resolution", () => {
//   it("does not reuse already loaded images by install name for @loader_path dependencies", async () => {
//     const pluginA = "Contents/PlugIns/A/pluginA.dylib";
//     const helperA = "Contents/PlugIns/A/libhelper.dylib";
//     const pluginB = "Contents/PlugIns/B/pluginB.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dependencies: [
//             dependency("@executable_path/../PlugIns/A/pluginA.dylib"),
//             dependency("@executable_path/../PlugIns/B/pluginB.dylib"),
//           ],
//         }),
//         [pluginA]: parsed(
//           slice({
//             dependencies: [dependency("@loader_path/libhelper.dylib")],
//           }),
//         ),
//         [helperA]: parsed(
//           slice({
//             install_name: "@loader_path/libhelper.dylib",
//           }),
//         ),
//         [pluginB]: parsed(
//           slice({
//             dependencies: [dependency("@loader_path/libhelper.dylib")],
//           }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//
//     const edgeA = edgeFor(trace, pluginA, "@loader_path/libhelper.dylib");
//     expect(edgeA.resolution).toEqual({
//       status: "resolved",
//       image: helperA,
//     });
//     expect(edgeA.candidates).toEqual([
//       expect.objectContaining({
//         source: "loader_path",
//         outcome: "resolved",
//         resolved_path: helperA,
//       }),
//     ]);
//
//     const edgeB = edgeFor(trace, pluginB, "@loader_path/libhelper.dylib");
//     expect(edgeB.resolution).toEqual({
//       status: "unresolved",
//       image: null,
//     });
//     expect(edgeB.candidates).toEqual([
//       expect.objectContaining({
//         path: "Contents/PlugIns/B/libhelper.dylib",
//         source: "loader_path",
//         outcome: "absent",
//         resolved_path: null,
//       }),
//     ]);
//     expect(trace.findings).toContainEqual(
//       expect.objectContaining({
//         kind: "required-load-unresolved",
//         image: pluginB,
//       }),
//     );
//   });
//
//   it("resolves @loader_path dependencies to the loader's own directory when multiple helpers exist", async () => {
//     const pluginA = "Contents/PlugIns/A/pluginA.dylib";
//     const helperA = "Contents/PlugIns/A/libhelper.dylib";
//     const pluginB = "Contents/PlugIns/B/pluginB.dylib";
//     const helperB = "Contents/PlugIns/B/libhelper.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dependencies: [
//             dependency("@executable_path/../PlugIns/A/pluginA.dylib"),
//             dependency("@executable_path/../PlugIns/B/pluginB.dylib"),
//           ],
//         }),
//         [pluginA]: parsed(
//           slice({
//             dependencies: [dependency("@loader_path/libhelper.dylib")],
//           }),
//         ),
//         [helperA]: parsed(
//           slice({
//             install_name: "@loader_path/libhelper.dylib",
//           }),
//         ),
//         [pluginB]: parsed(
//           slice({
//             dependencies: [dependency("@loader_path/libhelper.dylib")],
//           }),
//         ),
//         [helperB]: parsed(
//           slice({
//             install_name: "@loader_path/libhelper.dylib",
//           }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//
//     expect(
//       edgeFor(trace, pluginA, "@loader_path/libhelper.dylib"),
export const _l = 352;
