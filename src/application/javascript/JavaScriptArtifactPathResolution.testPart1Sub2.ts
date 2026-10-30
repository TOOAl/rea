export const __stub = 1;
//           unanalyzedFiles: lookup,
//         }),
//       ).toMatchObject({
//         resolution_status: "unavailable",
//         resolved_path: null,
//         limitations: ["unpacked exports manifest is missing"],
//       });
//
//     const restoredFiles = fileMap([
//       ...files.values(),
//       file(
//         manifest.path,
//         "root",
//         '{"exports":{"import":"./import.js","require":"./require.js"}}',
//       ),
//     ]);
//     for (const [sourcePath, moduleKind, target] of [
//       ["app/main.cjs", "require", "app/node_modules/fixture/require.js"],
//       ["app/main.mjs", "import", "app/node_modules/fixture/import.js"],
//     ] as const)
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath,
//           context: "module-specifier",
//           moduleKind,
//           files: restoredFiles,
//           unanalyzedFiles: lookup,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: target,
//       });
//   });
// });
//
// describe("bare package root file lookup", () => {
//   it("uses loader-specific bare package roots when only a sibling .js file exists", () => {
//     const absentDirectory = fileMap([
//       file("app/entry.mjs", "root"),
//       file("app/node_modules/fixture.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files: absentDirectory,
//       }),
//     ).toMatchObject({ resolution_status: "external", resolved_path: null });
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files: absentDirectory,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture.js",
//     });
//
//     const packageDirectory = fileMap([
//       file("app/entry.mjs", "root"),
//       file("app/node_modules/fixture.js", "root"),
//       file("app/node_modules/fixture/package.json", "root", "{}"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files: packageDirectory,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files: packageDirectory,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture.js",
//     });
//   });
// });
//
// describe("legacy package main lookup", () => {
//   it("treats an empty package main as absent and resolves the root index", () => {
//     const files = fileMap([
//       file("app/src/entry.cjs", "root"),
//       file("app/node_modules/fixture/package.json", "root", '{"main":""}'),
//       file("app/node_modules/fixture/index.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/src/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/index.js",
//     });
//   });
//
//   it.each(["import", "require"] as const)(
//     "limits %s package-main probes to Node's file extensions",
//     (moduleKind) => {
//       const files = fileMap([
//         file("app/src/entry.js", "root"),
//         file(
//           "app/node_modules/fixture/package.json",
//           "root",
//           '{"main":"main"}',
//         ),
//         file("app/node_modules/fixture/main.cjs", "root"),
//         file("app/node_modules/fixture/index.mjs", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/src/entry.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//     },
//   );
//
//   it("retains inventoried directories during legacy ESM main finalization", () => {
//     const files = fileMap([
//       file("app/src/entry.mjs", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         '{"main":"./lib/"}',
//       ),
//       file("app/node_modules/fixture/lib.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/src/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//         directoryPaths: new Set(["app/node_modules/fixture/lib/.js"]),
//       }),
//     ).toMatchObject({
//       resolution_status: "rejected",
//       resolved_path: null,
//       candidate_path: "app/node_modules/fixture/lib/.js",
//     });
//   });
//
//   it.each(["import", "require"] as const)(
//     "does not recursively resolve a nested package from a %s package main",
//     (moduleKind) => {
//       const files = fileMap([
//         file("app/src/entry.js", "root"),
//         file("app/node_modules/fixture/package.json", "root", '{"main":"sub"}'),
//         file(
//           "app/node_modules/fixture/sub/package.json",
//           "root",
//           '{"main":"other"}',
//         ),
//         file("app/node_modules/fixture/sub/other.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/src/entry.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//     },
//   );
// });
//
// describe("legacy package main metadata validation and fallback", () => {
//   it("still rejects non-string package main metadata", () => {
//     expect(
//       resolve({
//         declaredPath: "./package",
//         sourcePath: "app/entry.js",
//         context: "filesystem-expression",
//         files: fileMap([
//           file("app/entry.js", "root"),
//           file("app/package/package.json", "root", '{"main":false}'),
//           file("app/package/index.js", "root"),
//         ]),
//       }),
//     ).toMatchObject({ resolution_status: "unavailable", resolved_path: null });
//   });
//
//   it.each(["import", "require"] as const)(
//     "uses Node's index fallback for a non-string %s package main",
//     (moduleKind) => {
//       const files = fileMap([
//         file("app/src/entry.js", "root"),
//         file("app/node_modules/fixture/package.json", "root", '{"main":42}'),
//         file("app/node_modules/fixture/index.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/src/entry.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: "app/node_modules/fixture/index.js",
//       });
//     },
//   );
//
//   it.each(["import", "require"] as const)(
//     "does not treat a root-pointing %s package main as a dotfile module",
//     (moduleKind) => {
//       const files = fileMap([
//         file("src/entry.js", "root"),
//         file("node_modules/fixture/package.json", "root", '{"main":"../.."}'),
//         file("index.js", "root"),
//         file(".js", "root"),
//         file(".json", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "src/entry.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: "index.js",
//       });
//     },
//   );
// });
//
// describe("CommonJS bare package ancestor lookup", () => {
//   it.each([
//     ["absent metadata", undefined, true],
//     ["empty metadata", "{}", true],
//     ["empty main", '{"main":""}', true],
//     ["truthy missing main", '{"main":"missing"}', false],
//   ] as const)(
//     "handles %s before an ancestor package for both loaders",
//     (_name, packageJson, commonJsUsesAncestor) => {
//       const files = fileMap([
//         file("app/src/entry.js", "root"),
//         file("app/src/node_modules/fixture/placeholder.js", "root"),
//         ...(packageJson === undefined
//           ? []
//           : [
//               file(
//                 "app/src/node_modules/fixture/package.json",
//                 "root",
//                 packageJson,
//               ),
//             ]),
//         file("app/node_modules/fixture/index.js", "root"),
//       ]);
//       for (const moduleKind of ["import", "require"] as const) {
//         const resolution = resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/src/entry.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         });
//         if (moduleKind === "require" && commonJsUsesAncestor) {
//           expect(resolution).toMatchObject({
//             resolution_status: "resolved",
//             resolved_path: "app/node_modules/fixture/index.js",
//           });
//         } else {
//           expect(resolution).toMatchObject({
//             resolution_status: "not-found",
//             resolved_path: null,
//           });
//         }
//       }
//     },
//   );
// });
//
// describe("CommonJS bare package subpath ancestor lookup", () => {
//   it.each([
//     ["absent subpath", undefined, true],
//     ["empty subpath metadata", "{}", true],
//     ["truthy missing subpath main", '{"main":"missing"}', false],
//   ] as const)(
//     "handles %s before an ancestor package for both loaders",
//     (_name, packageJson, commonJsUsesAncestor) => {
//       const files = fileMap([
//         file("app/src/entry.js", "root"),
//         file("app/src/node_modules/fixture/placeholder.js", "root"),
//         ...(packageJson === undefined
//           ? []
//           : [
//               file(
//                 "app/src/node_modules/fixture/parser/package.json",
//                 "root",
//                 packageJson,
//               ),
//               file(
//                 "app/src/node_modules/fixture/parser/placeholder.js",
//                 "root",
//               ),
//             ]),
//         file("app/node_modules/fixture/parser.js", "root"),
//       ]);
//       const commonJsResolution = resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/entry.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       });
//       expect(commonJsResolution).toMatchObject({
//         resolved_path: commonJsUsesAncestor
//           ? "app/node_modules/fixture/parser.js"
//           : null,
//       });
//       const esmResolution = resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/entry.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       });
//       expect(esmResolution.resolved_path).toBeNull();
//     },
//   );
// });
//
// describe("CommonJS bare package exhausted lookup", () => {
//   it.each([
//     ["empty main", "fixture", '{"main":""}', "app/src/node_modules/fixture"],
//     [
//       "missing subpath",
//       "fixture/parser",
//       "{}",
//       "app/src/node_modules/fixture/parser",
//     ],
//   ] as const)(
//     "preserves not-found for an exhausted %s lookup",
//     (_name, declaredPath, packageJson, packageDirectory) => {
//       const files = fileMap([
//         file("app/src/entry.js", "root"),
//         file("app/src/node_modules/fixture/package.json", "root", packageJson),
//         file(`${packageDirectory}/placeholder.js`, "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "app/src/entry.js",
//           context: "module-specifier",
//           moduleKind: "require",
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
export const _l = 379;
