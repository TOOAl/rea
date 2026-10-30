export const __stub = 1;
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/cjs.cjs",
//     });
//     expect(
//       resolve({
//         declaredPath: "fs",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "external", resolved_path: null });
//     expect(
//       resolve({
//         declaredPath: "fixture/hidden.js",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//       limitations: [
//         expect.stringContaining("declares no exports target for subpath"),
//       ],
//     });
//   });
// });
//
// describe("package exports subpath resolution", () => {
//   it("resolves exact subpath keys through import and require conditions", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: {
//             ".": "./index.cjs",
//             "./parser": {
//               import: "./parser.mjs",
//               require: "./parser.cjs",
//               default: "./fallback.js",
//             },
//           },
//         }),
//       ),
//       file("app/node_modules/fixture/index.cjs", "root"),
//       file("app/node_modules/fixture/parser.mjs", "root"),
//       file("app/node_modules/fixture/parser.cjs", "root"),
//       file("app/node_modules/fixture/fallback.js", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/parser.mjs",
//     });
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/parser.cjs",
//     });
//   });
//
//   it("resolves array subpath targets at their first string entry", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: {
//             "./parser": [{ import: "./parser.mjs" }, "./parser.cjs"],
//           },
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
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/parser.cjs",
//     });
//   });
//
//   it("resolves subpaths of scoped packages", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/@scope/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: { "./parser": "./parser.cjs" },
//         }),
//       ),
//       file("app/node_modules/@scope/fixture/parser.cjs", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "@scope/fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/@scope/fixture/parser.cjs",
//     });
//   });
// });
//
// describe("package exports subpath encapsulation", () => {
//   it("keeps subpaths encapsulated when only a root target is exported", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({ exports: "./index.cjs" }),
//       ),
//       file("app/node_modules/fixture/index.cjs", "root"),
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
//       resolution_status: "external",
//       resolved_path: null,
//       limitations: [expect.stringContaining("a root target only")],
//     });
//   });
//
//   it("blocks subpaths with an explicit null target", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: { ".": "./index.cjs", "./parser": null },
//         }),
//       ),
//       file("app/node_modules/fixture/index.cjs", "root"),
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
//       resolution_status: "external",
//       resolved_path: null,
//       limitations: [expect.stringContaining("explicit null exports target")],
//     });
//   });
//
//   it("reports a missing selected subpath target without index fallback", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: { "./parser": "./parser.cjs" },
//         }),
//       ),
//       file("app/node_modules/fixture/parser/index.js", "root"),
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
//       resolution_status: "not-found",
//       resolved_path: null,
//       limitations: [expect.stringContaining("exports targets are exact files")],
//     });
//   });
// });
//
// describe("package subpath directory ownership", () => {
//   it.each(["root", "other"])(
//     "selects metadata-less package directories only in the %s container",
//     (container) => {
//       const files = fileMap([
//         file("app/src/consumer.js", "root"),
//         file("app/src/node_modules/fixture/parser.js", container),
//         file("app/node_modules/fixture/package.json", "root", "{}"),
//         file("app/node_modules/fixture/parser.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture/parser",
//           sourcePath: "app/src/consumer.js",
//           context: "module-specifier",
//           moduleKind: "require",
//           files,
//         }),
//       ).toMatchObject({
//         declared_path: "fixture/parser",
//         resolution_context: "module-specifier",
//         resolution_status: "resolved",
//         resolved_path:
//           container === "root"
//             ? "app/src/node_modules/fixture/parser.js"
//             : "app/node_modules/fixture/parser.js",
//       });
//     },
//   );
//
//   it("does not mistake a package-name file or sibling prefix for a nearer directory", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file("app/src/node_modules/fixture.js", "root"),
//       file("app/src/node_modules/fixture-extra/parser.js", "root"),
//       file("app/node_modules/fixture/parser.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolved_path: "app/node_modules/fixture/parser.js",
//       resolution_status: "resolved",
//     });
//   });
//
//   it.each([
//     ["malformed", "{", "not valid package JSON"],
//     ["unavailable", null, "text is unavailable"],
//   ])("preserves %s nested directory failures", (_name, text, reason) => {
//     const files = fileMap([
//       file("app/consumer.js", "root"),
//       file("app/node_modules/fixture/package.json", "root", "{}"),
//       file("app/node_modules/fixture/parser/package.json", "root", text),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       declared_path: "fixture/parser",
//       resolution_context: "module-specifier",
//       resolved_path: null,
//       resolution_status: "unavailable",
//       limitations: [expect.stringContaining(reason)],
//     });
//   });
//
//   it("does not recurse through a cyclic nested main during CommonJS lookup", () => {
//     const files = fileMap([
//       file("app/consumer.js", "root"),
//       file("app/node_modules/fixture/package.json", "root", "{}"),
//       file(
//         "app/node_modules/fixture/parser/package.json",
//         "root",
//         '{"main":"."}',
//       ),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture/parser",
//         sourcePath: "app/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "not-found",
//       resolved_path: null,
//     });
//   });
// });
//
// describe("package subpath legacy lookup and metadata failures", () => {
//   it("resolves CommonJS legacy subpath files and indexes without exports", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         '{"main":"./index.cjs"}',
//       ),
//       file("app/node_modules/fixture/direct.js", "root"),
//       file("app/node_modules/fixture/explicit.cjs", "root"),
//       file("app/node_modules/fixture/folder/index.js", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "fixture/direct",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/direct.js",
//     });
//     expect(
//       resolve({
//         declaredPath: "fixture/explicit.cjs",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/explicit.cjs",
//     });
//     expect(
//       resolve({
//         declaredPath: "fixture/folder",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
export const _l = 379;
