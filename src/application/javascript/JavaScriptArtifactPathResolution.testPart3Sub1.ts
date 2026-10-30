export const __stub = 1;
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/folder/index.js",
//     });
//   });
//
//   it("rejects subpath metadata that mixes subpath and condition keys", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: { "./parser": "./parser.cjs", node: "./index.cjs" },
//         }),
//       ),
//       file("app/node_modules/fixture/parser.cjs", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "rejected",
//       resolved_path: null,
//       limitations: [expect.stringContaining("mixes subpath keys")],
//     });
//   });
//
//   it("reports malformed subpath package metadata as unavailable", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file("app/node_modules/fixture/package.json", "root", "{"),
//       file("app/node_modules/fixture/parser.cjs", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       limitations: [expect.stringContaining("not valid package JSON")],
//     });
//   });
//
//   it("reports unavailable metadata text for subpath resolution", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file("app/node_modules/fixture/package.json", "root", null),
//       file("app/node_modules/fixture/parser.cjs", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       limitations: [expect.stringContaining("text is unavailable")],
//     });
//   });
// });
//
// describe("generic package entry heuristics", () => {
//   it.each([
//     ['{"main":"actual.cjs","module":"bundler.mjs"}', "actual.cjs"],
//     ['{"module":"bundler.mjs"}', "bundler.mjs"],
//   ])(
//     "preserves generic entry heuristics without a module kind for %s",
//     (metadata, entry) => {
//       const files = fileMap([
//         file("app/consumer.js", "root"),
//         file("app/node_modules/fixture/package.json", "root", metadata),
//         file("app/node_modules/fixture/actual.cjs", "root"),
//         file("app/node_modules/fixture/bundler.mjs", "root"),
//         file("app/node_modules/fixture/index.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/consumer.js",
//           context: "module-specifier",
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: `app/node_modules/fixture/${entry}`,
//       });
//     },
//   );
// });
//
// describe("package exports exact targets", () => {
//   it.each([
//     ["./file", "app/node_modules/fixture/file.js"],
//     ["./folder", "app/node_modules/fixture/folder/index.js"],
//   ])(
//     "resolves exports target %s only to that exact file",
//     (target, nearMiss) => {
//       const files = fileMap([
//         file("app/consumer.js", "root"),
//         file(
//           "app/node_modules/fixture/package.json",
//           "root",
//           JSON.stringify({ exports: target }),
//         ),
//         file(nearMiss, "root"),
//       ]);
//       for (const moduleKind of ["import", "require"] as const) {
//         const resolution = resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/consumer.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         });
//         expect(resolution).toMatchObject({
//           resolution_status: "not-found",
//           resolved_path: null,
//         });
//         expect(resolution.limitations.join(" ")).toContain(
//           "exports targets are exact files",
//         );
//       }
//     },
//   );
//
//   it("keeps extension and index fallbacks for a legacy main entry", () => {
//     for (const [main, target] of [
//       ["./file", "app/node_modules/fixture/file.js"],
//       ["./folder", "app/node_modules/fixture/folder/index.js"],
//     ] as const) {
//       const files = fileMap([
//         file("app/consumer.js", "root"),
//         file(
//           "app/node_modules/fixture/package.json",
//           "root",
//           JSON.stringify({ main }),
//         ),
//         file(target, "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/consumer.js",
//           context: "module-specifier",
//           moduleKind: "require",
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "resolved", resolved_path: target });
//     }
//   });
// });
//
// describe("package import alias resolution", () => {
//   it.each(["import", "require"] as const)(
//     "resolves an exact #%s alias from the enclosing package imports map",
//     (moduleKind) => {
//       const files = aliasFiles({
//         "package.json": JSON.stringify({
//           imports: { "#config": "./config.cjs" },
//         }),
//         "main.js": "",
//         "config.cjs": "",
//       });
//       expect(
//         resolve({
//           declaredPath: "#config",
//           sourcePath: "main.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: "config.cjs",
//         declared_path: "#config",
//       });
//     },
//   );
//
//   it("resolves an alias from a nested file through the enclosing package root", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./config.cjs" },
//       }),
//       "src/main.js": "",
//       "config.cjs": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#config",
//         sourcePath: "src/main.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "config.cjs",
//     });
//   });
//
//   it("keeps package import aliases available for runtime entrypoints", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#worker": "./worker.js" },
//       }),
//       "main.cjs": "",
//       "worker.js": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#worker",
//         sourcePath: "main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "worker.js",
//       declared_path: "#worker",
//     });
//   });
//
//   it("uses a nested package imports map rather than the application root", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./root.cjs" },
//       }),
//       "root.cjs": "",
//       "node_modules/fixture/package.json": JSON.stringify({
//         imports: { "#config": "./local.cjs" },
//       }),
//       "node_modules/fixture/index.js": "",
//       "node_modules/fixture/local.cjs": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#config",
//         sourcePath: "node_modules/fixture/index.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "node_modules/fixture/local.cjs",
//     });
//   });
//
//   it("does not inherit an ancestor imports map across a nested package.json", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./root.cjs" },
//       }),
//       "root.cjs": "",
//       "node_modules/fixture/package.json": "{}",
//       "node_modules/fixture/index.js": "",
//     });
//     const outcome = resolve({
//       declaredPath: "#config",
//       sourcePath: "node_modules/fixture/index.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     expect(outcome).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(outcome.limitations.join(" ")).toContain(
//       "node_modules/fixture/package.json",
//     );
//     expect(outcome.limitations.join(" ")).not.toContain("root.cjs");
//   });
//
//   it("does not apply a nested package map to the application root importer", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./root.cjs" },
//       }),
//       "main.js": "",
//       "root.cjs": "",
//       "node_modules/fixture/package.json": JSON.stringify({
//         imports: { "#config": "./local.cjs" },
//       }),
//       "node_modules/fixture/local.cjs": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#config",
//         sourcePath: "main.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "root.cjs",
//     });
//   });
// });
//
// describe("package import alias target selection", () => {
//   it("selects import and require conditions from an imports target", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: {
//           "#config": {
//             import: "./config.mjs",
//             require: "./config.cjs",
//             default: "./fallback.js",
//           },
//         },
//       }),
//       "main.js": "",
//       "config.mjs": "",
//       "config.cjs": "",
//       "fallback.js": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#config",
//         sourcePath: "main.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }).resolved_path,
//     ).toBe("config.mjs");
//     expect(
//       resolve({
//         declaredPath: "#config",
//         sourcePath: "main.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }).resolved_path,
//     ).toBe("config.cjs");
//   });
//
//   it("resolves array import targets at their first string entry", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": [{ import: "./missing.mjs" }, "./config.cjs"] },
//       }),
//       "main.js": "",
//       "config.cjs": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#config",
//         sourcePath: "main.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "config.cjs",
//     });
//   });
//
export const _l = 379;
