export const __stub = 1;
//     ).toMatchObject({
//       resolution: { status: "resolved", image: helperA },
//       candidates: [
//         expect.objectContaining({
//           source: "loader_path",
//           outcome: "resolved",
//           resolved_path: helperA,
//         }),
//       ],
//     });
//     expect(
//       edgeFor(trace, pluginB, "@loader_path/libhelper.dylib"),
//     ).toMatchObject({
//       resolution: { status: "resolved", image: helperB },
//       candidates: [
//         expect.objectContaining({
//           source: "loader_path",
//           outcome: "resolved",
//           resolved_path: helperB,
//         }),
//       ],
//     });
//   });
// });
//
// describe("dyld slice compatibility and coverage", () => {
//   it("lets an x86_64h process load generic x86_64 but not arm64e load arm64", async () => {
//     const files = {
//       [MAIN]: parsed(
//         slice({
//           architecture: "x86_64h",
//           file_type: "execute",
//           dependencies: [dependency("@executable_path/libgeneric.dylib")],
//         }),
//         slice({
//           architecture: "arm64e",
//           file_type: "execute",
//           dependencies: [dependency("@executable_path/libgeneric.dylib")],
//         }),
//       ),
//       "Contents/MacOS/libgeneric.dylib": parsed(
//         slice({ architecture: "x86_64" }),
//         slice({ architecture: "arm64" }),
//       ),
//     };
//     const trace = await traceDylibLoading(memoryView(files), { roots: [MAIN] });
//     expect(
//       trace.edges.map(({ architecture, candidates, resolution }) => [
//         architecture,
//         candidates[0]?.outcome,
//         resolution.status,
//       ]),
//     ).toEqual([
//       ["x86_64h", "resolved", "resolved"],
//       ["arm64e", "architecture-missing", "unresolved"],
//     ]);
//   });
//
//   it("keeps unsupported candidates undeterminable rather than malformed", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dependencies: [dependency("@executable_path/libbig.dylib")],
//         }),
//         "Contents/MacOS/libbig.dylib": {
//           status: "unsupported",
//           reason: "big-endian Mach-O images are not supported",
//         },
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]).toMatchObject({
//       candidates: [{ outcome: "unsupported" }],
//       resolution: { status: "undetermined", image: null },
//     });
//     expect(
//       trace.images.find(({ path }) => path.endsWith("libbig.dylib")),
//     ).toMatchObject({
//       parse_status: "unsupported",
//     });
//   });
//
//   it("reports unclassified Mach-O files as partial coverage", async () => {
//     const broken = "Contents/Helpers/broken";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable(),
//         [broken]: {
//           status: "malformed",
//           reason: "load command 0 has invalid cmdsize 0",
//         },
//       }),
//       { roots: [MAIN], unclassified: [broken] },
//     );
//     expect(trace.coverage).toEqual({
//       status: "partial",
//       unparsed_images: [broken],
//       roots_without_architecture: [],
//     });
//     expect(trace.images.find(({ path }) => path === broken)?.reason).toBe(
//       "load command 0 has invalid cmdsize 0",
//     );
//   });
// });
//
// describe("lazily loaded dependencies", () => {
//   it("resolves lazy loads without traversing them or reporting launch failure", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["@executable_path/../Frameworks"],
//           dependencies: [
//             dependency("@rpath/liblazy.dylib", {
//               command: "LC_LAZY_LOAD_DYLIB",
//             }),
//             dependency("@rpath/libmissing.dylib", {
//               command: "LC_LAZY_LOAD_DYLIB",
//             }),
//           ],
//         }),
//         "Contents/Frameworks/liblazy.dylib": parsed(
//           slice({ dependencies: [dependency("@rpath/libdeep.dylib")] }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges.map(({ loader }) => loader)).toEqual([MAIN, MAIN]);
//     expect(trace.edges[0]?.resolution.status).toBe("resolved");
//     expect(trace.findings.map(({ kind }) => kind)).toEqual([
//       "lazy-load-unresolved",
//     ]);
//   });
// });
//
// describe("conditional loads", () => {
//   it("carries a conditional fallback's uncertainty to its dependents and reuses", async () => {
//     const VENDOR = "Contents/Frameworks/libvendor.dylib";
//     const OTHER = "Contents/Frameworks/libother.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["/opt/vendor/lib", "@executable_path/../Frameworks"],
//           dependencies: [
//             dependency("@rpath/libvendor.dylib"),
//             dependency("@executable_path/../Frameworks/libother.dylib"),
//           ],
//         }),
//         [VENDOR]: parsed(
//           slice({
//             install_name: "@rpath/libvendor.dylib",
//             dependencies: [
//               dependency("@loader_path/libgone.dylib"),
//               dependency("@loader_path/libweak.dylib", { weak: true }),
//               dependency("@loader_path/liblazy.dylib", {
//                 command: "LC_LAZY_LOAD_DYLIB",
//               }),
//             ],
//           }),
//         ),
//         [OTHER]: parsed(
//           slice({ dependencies: [dependency("@rpath/libvendor.dylib")] }),
//         ),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(edgeFor(trace, MAIN, "@rpath/libvendor.dylib")).toMatchObject({
//       resolution: { status: "conditional", image: VENDOR },
//       loader_conditional: false,
//     });
//     expect(edgeFor(trace, VENDOR, "@loader_path/libgone.dylib")).toMatchObject({
//       resolution: { status: "unresolved" },
//       loader_conditional: true,
//     });
//     expect(edgeFor(trace, OTHER, "@rpath/libvendor.dylib")).toMatchObject({
//       candidates: [{ source: "already-loaded" }],
//       resolution: { status: "conditional", image: VENDOR },
//       loader_conditional: false,
//     });
//     // Required, weak and lazy findings below the fallback are all qualified.
//     for (const kind of [
//       "required-load-unresolved",
//       "weak-load-unresolved",
//       "lazy-load-unresolved",
//     ])
//       expect(
//         trace.findings.find((finding) => finding.kind === kind)?.explanation,
//       ).toContain(`${VENDOR} loads only conditionally; if it loads,`);
//   });
// });
//
// it("propagates embedded search-path uncertainty through found, missing, lazy and descendant edges", async () => {
//   const child = "Contents/MacOS/child.dylib";
//   const trace = await traceDylibLoading(
//     memoryView({
//       [MAIN]: executable({
//         dyld_environment: ["DYLD_LIBRARY_PATH=/tmp"],
//         dependencies: [
//           dependency("@executable_path/child.dylib"),
//           dependency("@executable_path/missing.dylib"),
//           dependency("@executable_path/lazy.dylib", {
//             command: "LC_LAZY_LOAD_DYLIB",
//           }),
//         ],
//       }),
//       [child]: parsed(
//         slice({ dependencies: [dependency("@loader_path/gone.dylib")] }),
//       ),
//     }),
//     { roots: [MAIN] },
//   );
//   expect(trace.edges.map(({ resolution }) => resolution.status)).toEqual([
//     "conditional",
//     "undetermined",
//     "undetermined",
//     "undetermined",
//   ]);
//   expect(trace.edges.at(-1)?.loader_conditional).toBe(true);
//   expect(trace.findings.map(({ kind }) => kind)).toEqual([
//     "dyld-environment-present",
//   ]);
// });
//
// it.each([
//   "DYLD_PRINT_LIBRARIES=1",
//   "DYLD_PRINT_RPATHS=1",
//   "DYLD_LIBRARY_PATH_LOG=/tmp",
//   "DYLD_LIBRARY_PATH",
//   "DYLD_IMAGE_SUFFIX=",
//   "DYLD_INSERT_LIBRARIES=",
// ])(
//   "retains %s as an observation without adding path uncertainty",
//   async (setting) => {
//     const child = "Contents/MacOS/child.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dyld_environment: [setting],
//           dependencies: [dependency("@executable_path/child.dylib")],
//         }),
//         [child]: parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]?.resolution.status).toBe("resolved");
//     expect(trace.coverage.status).toBe("complete");
//     expect(
//       trace.images.find(({ path }) => path === MAIN)?.slices[0]
//         ?.dyld_environment,
//     ).toEqual([setting]);
//     expect(trace.findings.map(({ kind }) => kind)).toContain(
//       "dyld-environment-present",
//     );
//   },
// );
//
// it.each(["execute", "bundle", "other"] as const)(
//   "does not resolve a %s image as a dylib dependency",
//   async (file_type) => {
//     const child = "Contents/MacOS/child.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dependencies: [dependency("@executable_path/child.dylib")],
//         }),
//         [child]: parsed(slice({ file_type })),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]).toMatchObject({
//       candidates: [{ outcome: "not-loadable" }],
//       resolution: { status: "unresolved", image: null },
//     });
//     expect(trace.edges).toHaveLength(1);
//   },
// );
//
// it.each([
//   "@loader_path/child.dylib",
//   "@executable_path/child.dylib",
//   "@rpath/child.dylib",
// ])(
//   "keeps a found %s definitive under library fallback paths",
//   async (install_name) => {
//     const child = "Contents/MacOS/child.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dyld_environment: ["DYLD_FALLBACK_LIBRARY_PATH=/fallback"],
//           rpaths: ["@executable_path"],
//           dependencies: [dependency(install_name)],
//         }),
//         [child]: parsed(
//           slice({
//             dependencies: [dependency("@loader_path/grandchild.dylib")],
//           }),
//         ),
//         "Contents/MacOS/grandchild.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges.map(({ resolution }) => resolution.status)).toEqual([
//       "resolved",
//       "resolved",
//     ]);
//     expect(
//       trace.edges.every(({ loader_conditional }) => !loader_conditional),
//     ).toBe(true);
//     expect(trace.coverage.status).toBe("complete");
//   },
// );
//
// it.each([
//   [
//     "DYLD_FRAMEWORK_PATH=/override",
//     "@loader_path/child.dylib",
//     "resolved",
//     "complete",
//   ],
//   [
//     "DYLD_FRAMEWORK_PATH=/override",
//     "@loader_path/Foo.framework/Libraries/child.dylib",
//     "resolved",
//     "complete",
//   ],
//   [
//     "DYLD_FRAMEWORK_PATH=/override",
//     "@loader_path/Foo.framework/Bar",
//     "resolved",
//     "complete",
//   ],
//   [
//     "DYLD_FRAMEWORK_PATH=/override",
//     "@loader_path/Foo.framework/Foo",
//     "conditional",
//     "partial",
//   ],
//   [
//     "DYLD_FRAMEWORK_PATH=/override",
//     "@loader_path/Foo.framework/Versions/A/Foo",
//     "conditional",
//     "partial",
//   ],
//   [
//     "DYLD_LIBRARY_PATH=/override",
//     "@loader_path/Foo.framework/Foo",
//     "resolved",
//     "complete",
//   ],
//   [
//     "DYLD_LIBRARY_PATH=/override",
//     "@loader_path/Foo.framework/Libraries/child.dylib",
//     "conditional",
export const _l = 352;
