export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   traceDylibLoading,
//   type DylibTreeEntry,
//   type DylibTreeView,
//   type MachoDependency,
//   type MachoImageFacts,
//   type MachoSlice,
// } from "./dylibResolution.js";
//
// const slice = (overrides: Partial<MachoSlice> = {}): MachoSlice => ({
//   architecture: "arm64",
//   slice_offset: 0,
//   slice_size: 32,
//   cpu_type: 0x0100000c,
//   cpu_subtype: 0,
//   fat_cpu_type: null,
//   fat_cpu_subtype: null,
//   fat_alignment_exponent: null,
//   file_type: overrides.file_type ?? "dylib",
//   file_type_code:
//     overrides.file_type_code ??
//     { execute: 2, dylib: 6, bundle: 8, other: 1 }[
//       overrides.file_type ?? "dylib"
//     ],
//   platform: overrides.platform ?? 1,
//   platforms:
//     overrides.platforms ??
//     (overrides.platform === null ? [] : [overrides.platform ?? 1]),
//   install_name: null,
//   dependencies: [],
//   rpaths: [],
//   dyld_environment: [],
//   code_signature_present: true,
//   ...overrides,
// });
//
// const dependency = (
//   installName: string,
//   overrides: Partial<MachoDependency> = {},
// ): MachoDependency => ({
//   command: "LC_LOAD_DYLIB",
//   encoding: "dylib_command",
//   install_name: installName,
//   weak: false,
//   upward: false,
//   reexport: false,
//   delayed_init: false,
//   current_version: "1.0.0",
//   compatibility_version: "1.0.0",
//   ...overrides,
// });
//
// const parsed = (...slices: MachoSlice[]): MachoImageFacts => ({
//   status: "parsed",
//   slices,
// });
//
// const executable = (overrides: Partial<MachoSlice> = {}): MachoImageFacts =>
//   parsed(slice({ file_type: "execute", ...overrides }));
//
// /** In-memory tree: files are images (or "data"), symlinks map to targets. */
// const memoryView = (
//   files: Readonly<Record<string, MachoImageFacts | "data">>,
//   symlinks: Readonly<Record<string, string>> = {},
// ): DylibTreeView => {
//   const entries = new Map<string, DylibTreeEntry>();
//   const addParents = (path: string): void => {
//     const segments = path.split("/");
//     for (let length = 1; length < segments.length; length++)
//       entries.set(segments.slice(0, length).join("/"), { kind: "directory" });
//   };
//   for (const path of Object.keys(files)) {
//     addParents(path);
//     entries.set(path, { kind: "file" });
//   }
//   for (const [path, target] of Object.entries(symlinks)) {
//     addParents(path);
//     entries.set(path, { kind: "symlink", target });
//   }
//   return {
//     entry: (path) => Promise.resolve(entries.get(path)),
//     image: (path) => {
//       const facts = files[path];
//       return Promise.resolve(
//         facts === undefined || facts === "data"
//           ? { status: "not-mach-o" as const }
//           : facts,
//       );
//     },
//   };
// };
//
// const MAIN = "Contents/MacOS/App";
//
// const edgeFor = (
//   trace: Awaited<ReturnType<typeof traceDylibLoading>>,
//   loader: string,
//   installName: string,
// ) => {
//   const edge = trace.edges.find(
//     (candidate) =>
//       candidate.loader === loader && candidate.install_name === installName,
//   );
//   if (edge === undefined)
//     throw new Error(`missing ${loader} -> ${installName}`);
//   return edge;
// };
//
// describe("dyld path expansion", () => {
//   it("searches the loading image's rpaths before its loaders'", async () => {
//     const core = "Contents/Frameworks/Core.framework/Versions/A/Core";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["@executable_path/../Frameworks"],
//           dependencies: [dependency("@rpath/Core.framework/Versions/A/Core")],
//         }),
//         [core]: parsed(
//           slice({
//             rpaths: ["@loader_path/Libraries"],
//             dependencies: [dependency("@rpath/libchain.dylib")],
//           }),
//         ),
//         "Contents/Frameworks/libchain.dylib": parsed(slice()),
//         "Contents/Frameworks/Core.framework/Versions/A/Libraries/libchain.dylib":
//           parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     const chain = edgeFor(trace, core, "@rpath/libchain.dylib");
//     expect(chain.via).toEqual([MAIN, core]);
//     expect(chain.candidates).toEqual([
//       expect.objectContaining({
//         source: "rpath",
//         rpath: "@loader_path/Libraries",
//         rpath_owner: core,
//         outcome: "resolved",
//       }),
//     ]);
//     expect(chain.resolution).toEqual({
//       status: "resolved",
//       image:
//         "Contents/Frameworks/Core.framework/Versions/A/Libraries/libchain.dylib",
//     });
//   });
//
//   it("expands @loader_path in an rpath relative to the image that owns it", async () => {
//     const plugin = "Contents/PlugIns/Tool.bundle/Contents/MacOS/Tool";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["@loader_path/../Shared"],
//           dependencies: [
//             dependency(
//               `@executable_path/../PlugIns/Tool.bundle/Contents/MacOS/Tool`,
//             ),
//           ],
//         }),
//         [plugin]: parsed(
//           slice({
//             file_type: "dylib",
//             dependencies: [dependency("@rpath/libshared.dylib")],
//           }),
//         ),
//         "Contents/Shared/libshared.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(edgeFor(trace, plugin, "@rpath/libshared.dylib").candidates).toEqual(
//       [
//         expect.objectContaining({
//           path: "Contents/MacOS/../Shared/libshared.dylib",
//           rpath_owner: MAIN,
//           outcome: "resolved",
//           resolved_path: "Contents/Shared/libshared.dylib",
//         }),
//       ],
//     );
//   });
//
//   it("gives each executable root its own @executable_path", async () => {
//     const service = "Contents/XPCServices/Fetch.xpc/Contents/MacOS/Fetch";
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           dependencies: [dependency("@executable_path/libhere.dylib")],
//         }),
//         [service]: executable({
//           dependencies: [dependency("@executable_path/libhere.dylib")],
//         }),
//         "Contents/MacOS/libhere.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN, service] },
//     );
//     expect(
//       edgeFor(trace, MAIN, "@executable_path/libhere.dylib").resolution.status,
//     ).toBe("resolved");
//     expect(
//       edgeFor(trace, service, "@executable_path/libhere.dylib"),
//     ).toMatchObject({
//       candidates: [
//         {
//           path: "Contents/XPCServices/Fetch.xpc/Contents/MacOS/libhere.dylib",
//           outcome: "absent",
//         },
//       ],
//       resolution: { status: "unresolved", image: null },
//     });
//   });
//
//   it("follows Versions/Current inside the root and stops at escaping links", async () => {
//     const trace = await traceDylibLoading(
//       memoryView(
//         {
//           [MAIN]: executable({
//             rpaths: ["@executable_path/../Frameworks"],
//             dependencies: [
//               dependency("@rpath/Core.framework/Core"),
//               dependency("@rpath/Escape.framework/Escape"),
//               dependency("@executable_path/../../../outside.dylib"),
//             ],
//           }),
//           "Contents/Frameworks/Core.framework/Versions/A/Core": parsed(slice()),
//         },
//         {
//           "Contents/Frameworks/Core.framework/Versions/Current": "A",
//           "Contents/Frameworks/Core.framework/Core": "Versions/Current/Core",
//           "Contents/Frameworks/Escape.framework":
//             "/Library/Frameworks/Escape.framework",
//         },
//       ),
//       { roots: [MAIN] },
//     );
//     expect(
//       edgeFor(trace, MAIN, "@rpath/Core.framework/Core").resolution,
//     ).toEqual({
//       status: "resolved",
//       image: "Contents/Frameworks/Core.framework/Versions/A/Core",
//     });
//     for (const name of [
//       "@rpath/Escape.framework/Escape",
//       "@executable_path/../../../outside.dylib",
//     ])
//       expect(edgeFor(trace, MAIN, name)).toMatchObject({
//         candidates: [{ outcome: "escapes-target" }],
//         resolution: { status: "undetermined", image: null },
//       });
//   });
// });
//
// it("keeps directory requirements in symlink targets", async () => {
//   const names = [
//     "@loader_path/alias-slash",
//     "@loader_path/alias-dot",
//     "@loader_path/alias-directory/lib.dylib",
//   ];
//   const trace = await traceDylibLoading(
//     memoryView(
//       {
//         [MAIN]: executable({
//           dependencies: names.map((name) => dependency(name)),
//         }),
//         "Contents/MacOS/lib.dylib": parsed(slice()),
//       },
//       {
//         "Contents/MacOS/alias-slash": "lib.dylib/",
//         "Contents/MacOS/alias-dot": "lib.dylib/.",
//         "Contents/MacOS/alias-directory": "./",
//       },
//     ),
//     { roots: [MAIN] },
//   );
//   expect(
//     trace.edges.map(({ install_name, candidates, resolution }) => ({
//       install_name,
//       outcome: candidates[0]?.outcome,
//       resolution,
//     })),
//   ).toEqual(
//     names.map((name, index) => ({
//       install_name: name,
//       outcome: index < 2 ? "absent" : "resolved",
//       resolution:
//         index < 2
//           ? { status: "unresolved", image: null }
//           : { status: "resolved", image: "Contents/MacOS/lib.dylib" },
//     })),
//   );
//   expect(
//     trace.findings.map(({ kind, edge_index }) => [kind, edge_index]),
//   ).toEqual([0, 1].map((index) => ["required-load-unresolved", index]));
// });
//
// describe("dyld resolution outcomes: deriving path and weak-load outcomes", () => {
//   it("keeps paths outside the root undetermined and in-root fallbacks conditional", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: ["/usr/lib/swift", "@executable_path/../Frameworks"],
//           dependencies: [
//             dependency("/usr/lib/libSystem.B.dylib"),
//             dependency("@rpath/libswiftCore.dylib"),
//             dependency("libleaf.dylib"),
//           ],
//         }),
//         "Contents/Frameworks/libswiftCore.dylib": parsed(slice()),
//       }),
//       { roots: [MAIN] },
//     );
//     expect(edgeFor(trace, MAIN, "/usr/lib/libSystem.B.dylib")).toMatchObject({
//       candidates: [
//         { outcome: "outside-target", path: "/usr/lib/libSystem.B.dylib" },
//       ],
//       resolution: { status: "undetermined", image: null },
//     });
//     expect(edgeFor(trace, MAIN, "@rpath/libswiftCore.dylib")).toMatchObject({
//       candidates: [
//         {
//           outcome: "outside-target",
//           path: "/usr/lib/swift/libswiftCore.dylib",
//         },
//         { outcome: "resolved" },
//       ],
//       resolution: {
//         status: "conditional",
//         image: "Contents/Frameworks/libswiftCore.dylib",
//       },
//     });
//     expect(edgeFor(trace, MAIN, "libleaf.dylib").resolution.status).toBe(
//       "undetermined",
//     );
//   });
//
//   it("derives unresolved and earlier-candidate findings separately for weak loads", async () => {
//     const trace = await traceDylibLoading(
//       memoryView({
//         [MAIN]: executable({
//           rpaths: [
//             "@executable_path/../Overrides",
//             "@executable_path/../Frameworks",
//           ],
//           dependencies: [
//             dependency("@rpath/libfound.dylib"),
//             dependency("@rpath/libgone.dylib", {
//               command: "LC_LOAD_WEAK_DYLIB",
//               weak: true,
//             }),
//             dependency("@rpath/libmissing.dylib"),
//           ],
//           dyld_environment: ["DYLD_LIBRARY_PATH=/tmp"],
export const _l = 352;
