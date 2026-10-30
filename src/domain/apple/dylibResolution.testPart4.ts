export const __stub = 1;
//     "partial",
//   ],
//   [
//     "DYLD_FALLBACK_FRAMEWORK_PATH=/fallback",
//     "@loader_path/Foo.framework/Foo",
//     "resolved",
//     "complete",
//   ],
//   [
//     "DYLD_FALLBACK_FRAMEWORK_PATH=/fallback",
//     "@loader_path/child.dylib",
//     "resolved",
//     "complete",
//   ],
// ] as const)(
//   "scopes %s to the image kind and reached search phase of %s",
//   async (setting, install_name, status, coverage) => {
//     const child = install_name.replace("@loader_path", "Contents/MacOS");
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dyld_environment: [setting],
//           dependencies: [dependency(install_name)],
//         }),
//         [child]: parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]?.resolution).toEqual({ status, image: child });
//     expect(trace.coverage.status).toBe(coverage);
//   },
// );
//
// it.each([
//   [
//     "DYLD_FALLBACK_LIBRARY_PATH=/fallback",
//     "@loader_path/missing.dylib",
//     "undetermined",
//     "partial",
//   ],
//   [
//     "DYLD_FALLBACK_FRAMEWORK_PATH=/fallback",
//     "@loader_path/Foo.framework/Foo",
//     "undetermined",
//     "partial",
//   ],
//   [
//     "DYLD_FALLBACK_FRAMEWORK_PATH=/fallback",
//     "@loader_path/missing.dylib",
//     "unresolved",
//     "complete",
//   ],
//   [
//     "DYLD_FALLBACK_LIBRARY_PATH=/fallback",
//     "@loader_path/Foo.framework/Foo",
//     "unresolved",
//     "complete",
//   ],
// ] as const)(
//   "retains the applicable fallback uncertainty for %s and %s",
//   async (setting, install_name, status, coverage) => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dyld_environment: [setting],
//           dependencies: [dependency(install_name)],
//         }),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]?.resolution).toEqual({ status, image: null });
//     expect(trace.coverage.status).toBe(coverage);
//   },
// );
//
// it.each([
//   ["DYLD_ROOT_PATH=/root", [1], "@loader_path/child.dylib"],
//   ["DYLD_ROOT_PATH=/root", [7], "@loader_path/child.dylib"],
//   ["DYLD_ROOT_PATH=/root", [8], "@executable_path/child.dylib"],
//   ["DYLD_ROOT_PATH=/root", [9], "@rpath/child.dylib"],
//   ["DYLD_ROOT_PATH=/root", [12], "@rpath/child.dylib"],
//   ["DYLD_OVERLAY_PATH=/overlay", [1], "@rpath/child.dylib"],
//   ["DYLD_OVERLAY_PATH=/overlay", [7], "@loader_path/child.dylib"],
//   ["DYLD_ROOT_PATH=", [7], "@loader_path/child.dylib"],
//   ["DYLD_OVERLAY_PATH=", [1], "@loader_path/child.dylib"],
// ] as const)(
//   "limits prefix setting %s on platforms %j for %s",
//   async (setting, platforms, install_name) => {
//     const child = "Contents/MacOS/child.dylib";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           platforms: [...platforms],
//           dyld_environment: [setting],
//           rpaths: ["@executable_path"],
//           dependencies: [dependency(install_name)],
//         }),
//         [child]: parsed(slice({ platforms: [...platforms] })),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]?.resolution.status).toBe("resolved");
//     expect(trace.coverage.status).toBe("complete");
//     expect(
//       trace.images.find(({ path }) => path === MAIN)?.slices[0]
//         ?.dyld_environment,
//     ).toEqual([setting]);
//   },
// );
//
// it.each([
//   ["DYLD_ROOT_PATH=/root", [1], "complete"],
//   ["DYLD_ROOT_PATH=/root", [2], "complete"],
//   ["DYLD_ROOT_PATH=/root", [6], "complete"],
//   ["DYLD_ROOT_PATH=/root", [7], "partial"],
//   ["DYLD_ROOT_PATH=/root", [8], "partial"],
//   ["DYLD_ROOT_PATH=/root", [9], "partial"],
//   ["DYLD_ROOT_PATH=/root", [12], "partial"],
//   ["DYLD_ROOT_PATH=/root", [], "partial"],
//   ["DYLD_ROOT_PATH=/root", [99], "partial"],
//   ["DYLD_OVERLAY_PATH=/overlay", [1], "partial"],
// ] as const)(
//   "retains only possible absolute-path prefix uncertainty for %s on %j",
//   async (setting, platforms, coverage) => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           platforms: [...platforms],
//           dyld_environment: [setting],
//           dependencies: [dependency("/usr/lib/child.dylib")],
//         }),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(trace.edges[0]?.resolution.status).toBe("undetermined");
//     expect(trace.coverage.status).toBe(coverage);
//   },
// );
//
// it.each(["dylib", "bundle", "other"] as const)(
//   "ignores embedded process settings from a %s root while retaining load findings",
//   async (file_type) => {
//     const root = "Contents/MacOS/root";
//     const child = "Contents/MacOS/child.dylib";
//     const settings = [
//       "DYLD_LIBRARY_PATH=/external",
//       "DYLD_INSERT_LIBRARIES=/external/injected.dylib",
//     ];
//     const trace = await traceDylibLoading(
//       memoryView({
//         [root]: parsed(
//           slice({
//             file_type,
//             dyld_environment: settings,
//             dependencies: [
//               dependency("@loader_path/child.dylib"),
//               dependency("@loader_path/missing.dylib"),
//               dependency("@loader_path/lazy.dylib", {
//                 command: "LC_LAZY_LOAD_DYLIB",
//               }),
//             ],
//           }),
//         ),
//         [child]: parsed(
//           slice({
//             dependencies: [dependency("@loader_path/descendant.dylib")],
//           }),
//         ),
//       }),
//       { roots: [root] },
//     );
//     expect(trace.edges.map(({ resolution }) => resolution.status)).toEqual([
//       "resolved",
//       "unresolved",
//       "unresolved",
//       "unresolved",
//     ]);
//     expect(
//       trace.edges.every(({ loader_conditional }) => !loader_conditional),
//     ).toBe(true);
//     expect(trace.coverage.status).toBe("complete");
//     expect(
//       trace.findings.filter(({ kind }) => kind === "required-load-unresolved"),
//     ).toHaveLength(2);
//     expect(
//       trace.findings.find(({ kind }) => kind === "required-load-unresolved")
//         ?.explanation,
//     ).toContain("load this required dependency");
//     expect(
//       trace.findings.filter(({ kind }) => kind === "lazy-load-unresolved"),
//     ).toHaveLength(1);
//     expect(
//       trace.images.find(({ path }) => path === root)?.slices[0]
//         ?.dyld_environment,
//     ).toEqual(settings);
//     expect(
//       trace.findings.find(({ kind }) => kind === "dyld-environment-present")
//         ?.explanation,
//     ).toContain("entries in this non-executable root are observations");
//   },
// );
//
// it("keeps inserted-library uncertainty scoped to the executable's process", async () => {
//   const library = "Contents/MacOS/library.dylib";
//   const trace = await traceDylibLoading(
//     memoryView({
//       [MAIN]: executable({
//         dyld_environment: ["DYLD_INSERT_LIBRARIES=/external/injected.dylib"],
//       }),
//       [library]: parsed(
//         slice({
//           dyld_environment: ["DYLD_INSERT_LIBRARIES=/external/ignored.dylib"],
//         }),
//       ),
//     }),
//     { roots: [library, MAIN] },
//   );
//   expect(trace.coverage.status).toBe("partial");
//   const limitation = trace.limitations.find((value) =>
//     value.includes("LC_DYLD_ENVIRONMENT"),
//   );
//   expect(limitation).toContain(MAIN);
//   expect(limitation).not.toContain(library);
// });
//
// it.each([
//   [
//     "DYLD_LIBRARY_PATH=",
//     "@loader_path/child.dylib",
//     "conditional",
//     "undetermined",
//   ],
//   [
//     "DYLD_LIBRARY_PATH=: ",
//     "@loader_path/child.dylib",
//     "conditional",
//     "undetermined",
//   ],
//   [
//     "DYLD_FRAMEWORK_PATH=",
//     "@loader_path/Foo.framework/Foo",
//     "conditional",
//     "undetermined",
//   ],
//   [
//     "DYLD_FALLBACK_LIBRARY_PATH=",
//     "@loader_path/child.dylib",
//     "resolved",
//     "undetermined",
//   ],
//   [
//     "DYLD_FALLBACK_LIBRARY_PATH=:",
//     "@loader_path/child.dylib",
//     "resolved",
//     "undetermined",
//   ],
//   [
//     "DYLD_FALLBACK_FRAMEWORK_PATH=",
//     "@loader_path/Foo.framework/Foo",
//     "resolved",
//     "undetermined",
//   ],
//   [
//     "DYLD_VERSIONED_LIBRARY_PATH=",
//     "@loader_path/child.dylib",
//     "resolved",
//     "unresolved",
//   ],
//   [
//     "DYLD_VERSIONED_LIBRARY_PATH=:",
//     "@loader_path/child.dylib",
//     "resolved",
//     "unresolved",
//   ],
//   [
//     "DYLD_VERSIONED_FRAMEWORK_PATH=",
//     "@loader_path/Foo.framework/Foo",
//     "resolved",
//     "unresolved",
//   ],
//   [
//     "DYLD_VERSIONED_FRAMEWORK_PATH=::",
//     "@loader_path/Foo.framework/Foo",
//     "resolved",
//     "unresolved",
//   ],
//   [
//     "DYLD_VERSIONED_LIBRARY_PATH= ",
//     "@loader_path/child.dylib",
//     "conditional",
//     "undetermined",
//   ],
//   ["DYLD_IMAGE_SUFFIX=:", "@loader_path/child.dylib", "resolved", "unresolved"],
//   [
//     "DYLD_IMAGE_SUFFIX=::",
//     "@loader_path/Foo.framework/Foo",
//     "resolved",
//     "unresolved",
//   ],
//   [
//     "DYLD_IMAGE_SUFFIX=:_debug:",
//     "@loader_path/child.dylib",
//     "conditional",
//     "undetermined",
//   ],
//   [
//     "DYLD_INSERT_LIBRARIES=",
//     "@loader_path/child.dylib",
//     "resolved",
//     "unresolved",
//   ],
//   [
//     "DYLD_INSERT_LIBRARIES=:",
//     "@loader_path/child.dylib",
//     "conditional",
//     "undetermined",
//   ],
// ] as const)(
//   "interprets the empty components of %s according to their consumer for %s",
//   async (setting, installName, foundStatus, missingStatus) => {
//     const child = installName.replace("@loader_path", "Contents/MacOS");
//     for (const [exists, status] of [
//       [true, foundStatus],
//       [false, missingStatus],
//     ] as const) {
//       const trace = await traceDylibLoading(
//         memoryView({
//           [MAIN]: executable({
//             dyld_environment: [setting],
//             dependencies: [dependency(installName)],
//           }),
//           ...(exists ? { [child]: parsed(slice()) } : {}),
//         }),
//         { roots: [MAIN] },
//       );
//       expect(trace.edges[0]?.resolution.status).toBe(status);
//       expect(trace.coverage.status).toBe(
//         status === "conditional" || status === "undetermined"
//           ? "partial"
//           : "complete",
//       );
//       expect(
//         trace.images.find(({ path }) => path === MAIN)?.slices[0]
//           ?.dyld_environment,
//       ).toEqual([setting]);
//       expect(
//         trace.findings.some(({ kind }) => kind === "required-load-unresolved"),
//       ).toBe(status === "unresolved");
//     }
//   },
// );
export const _l = 351;
