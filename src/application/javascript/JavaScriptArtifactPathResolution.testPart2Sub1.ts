export const __stub = 1;
//     },
//   );
// });
//
// describe("logical path identity", () => {
//   it("resolves an NFD relative import to the NFC inventory path and rejects a root escape", () => {
//     const nfc = "caf\u00e9".normalize("NFC");
//     const nfd = nfc.normalize("NFD");
//     const files = fileMap([
//       file("dir/index.js", "root"),
//       file(`dir/${nfc}.js`, "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: `./${nfd}.js`,
//         sourcePath: "dir/index.js",
//         context: "module-specifier",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: `dir/${nfc}.js`,
//     });
//     expect(
//       resolve({
//         declaredPath: "../escape.js",
//         sourcePath: "index.js",
//         context: "module-specifier",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "rejected", resolved_path: null });
//   });
// });
//
// describe("contextual JavaScript artifact path resolution", () => {
//   it.each([
//     ["main.js", "app/main.js"],
//     ["./main.js", "app/main.js"],
//     ["src/main", "app/src/main.cjs"],
//     ["entry", "app/entry/start.mjs"],
//     ["fallback", "app/fallback/index.ts"],
//   ])("resolves package entrypoint %s", (declaredPath, expected) => {
//     const files = fileMap([
//       file("app/package.json", "root"),
//       file("app/main.js", "root"),
//       file("app/src/main.cjs", "root"),
//       file("app/entry/package.json", "root", '{"main":"start"}'),
//       file("app/entry/start.mjs", "root"),
//       file("app/fallback/index.ts", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath,
//         sourcePath: "app/package.json",
//         context: "package-entrypoint",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_context: "package-entrypoint",
//       resolution_status: "resolved",
//       resolved_path: expected,
//       limitations: [],
//     });
//   });
//
//   it("resolves dirname-derived bare paths but keeps bare module specifiers external", () => {
//     const files = fileMap([
//       file("app/main.js", "root"),
//       file("app/preload.js", "root"),
//     ]);
//     const base = {
//       declaredPath: "preload.js",
//       sourcePath: "app/main.js",
//       files,
//     } as const;
//
//     expect(
//       resolve({ ...base, context: "filesystem-expression" }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/preload.js",
//     });
//     expect(resolve({ ...base, context: "module-specifier" })).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//   });
//
//   it("applies document and base-href semantics to HTML references", () => {
//     const files = fileMap([
//       file("renderer/index.html", "root"),
//       file("assets/app.js", "root"),
//       file("renderer/local.js", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "app.js?v=1",
//         sourcePath: "renderer/index.html",
//         context: "html-reference",
//         htmlBaseHref: "/assets/",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "assets/app.js",
//     });
//     expect(
//       resolve({
//         declaredPath: "./local.js",
//         sourcePath: "renderer/index.html",
//         context: "html-reference",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "renderer/local.js",
//     });
//   });
//
//   it.each(["node:fs", "electron", "../../escape.js", "%2e%2e/escape.js"])(
//     "fails closed for unsafe or external module declaration %s",
//     (declaredPath) => {
//       const result = resolve({
//         declaredPath,
//         sourcePath: "app/main.js",
//         context: "module-specifier",
//         files: fileMap([file("app/main.js", "root")]),
//       });
//       expect(result.resolved_path).toBeNull();
//       expect(["external", "rejected"]).toContain(result.resolution_status);
//       expect(result.limitations.length).toBeGreaterThan(0);
//     },
//   );
//
//   it("does not cross nested ASAR container identities", () => {
//     const files = fileMap([
//       file("app.asar/main.js", "asar-a"),
//       file("app.asar/preload.js", "asar-b"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "preload.js",
//         sourcePath: "app.asar/main.js",
//         context: "filesystem-expression",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//   });
//
//   it("resolves inventoried paths longer than the former character ceiling", () => {
//     const declaredPath = `./${"a".repeat(5_000)}.js`;
//     const expectedPath = `app/${declaredPath.slice(2)}`;
//     const files = fileMap([
//       file("app/consumer.js", "root"),
//       file(expectedPath, "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath,
//         sourcePath: "app/consumer.js",
//         context: "module-specifier",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: expectedPath,
//       limitations: [],
//     });
//   });
// });
//
// describe("ESM module URL path decoding", () => {
//   it.each([
//     ["./a%2eb.mjs", "app/esm/a.b.mjs"],
//     ["./sub/%2e%2e/x.mjs", "app/esm/x.mjs"],
//   ])(
//     "decodes confined URL path %s before artifact lookup",
//     (declaredPath, target) => {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "app/esm/entry.mjs",
//           context: "module-specifier",
//           moduleKind: "import",
//           files: fileMap([
//             file("app/esm/entry.mjs", "root"),
//             file("app/esm/a.b.mjs", "root"),
//             file("app/esm/x.mjs", "root"),
//           ]),
//         }),
//       ).toMatchObject({
//         resolved_path: target,
//         resolution_status: "resolved",
//       });
//     },
//   );
//
//   it("rejects encoded separators and paths escaping the artifact root", () => {
//     const files = fileMap([
//       file("app/esm/entry.mjs", "root"),
//       file("app/esm/x.mjs", "root"),
//     ]);
//     for (const declaredPath of ["./sub%2fx.mjs", "../../../escape.mjs"]) {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "app/esm/entry.mjs",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({
//         resolved_path: null,
//         resolution_status: "rejected",
//       });
//     }
//   });
// });
//
// describe("JavaScript file URL resolution", () => {
//   it("resolves file URL paths without interpreting query bytes as path syntax", () => {
//     const files = fileMap([file("assets/app.js", "root")]);
//     for (const declaredPath of [
//       "file:///assets/app.js#entry",
//       "FILE:///assets/app.js?token=%2F#entry",
//     ]) {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "main.js",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({
//         declared_path: declaredPath,
//         resolution_status: "resolved",
//         resolved_path: "assets/app.js",
//       });
//     }
//
//     for (const declaredPath of [
//       "file:///assets%2Fapp.js",
//       "file:///assets%2\nFapp.js",
//     ]) {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "main.js",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "rejected", resolved_path: null });
//     }
//
//     expect(
//       resolve({
//         declaredPath: "file:/assets/app.js",
//         sourcePath: "main.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "external", resolved_path: null });
//   });
// });
//
// describe("contextual JavaScript package path resolution", () => {
//   it("follows package entrypoints beyond the former recursion ceiling", () => {
//     const files = fileMap([
//       file("app/consumer.js", "root"),
//       file(
//         "app/node_modules/pkg-1/package.json",
//         "root",
//         '{"main":"../pkg-2"}',
//       ),
//       file(
//         "app/node_modules/pkg-2/package.json",
//         "root",
//         '{"main":"../pkg-3"}',
//       ),
//       file(
//         "app/node_modules/pkg-3/package.json",
//         "root",
//         '{"main":"../pkg-4"}',
//       ),
//       file(
//         "app/node_modules/pkg-4/package.json",
//         "root",
//         '{"main":"../pkg-5"}',
//       ),
//       file(
//         "app/node_modules/pkg-5/package.json",
//         "root",
//         '{"main":"../pkg-6"}',
//       ),
//       file(
//         "app/node_modules/pkg-6/package.json",
//         "root",
//         '{"main":"entry.js"}',
//       ),
//       file("app/node_modules/pkg-6/entry.js", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "pkg-1",
//         sourcePath: "app/consumer.js",
//         context: "module-specifier",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/pkg-6/entry.js",
//       limitations: [],
//     });
//   });
//
//   it("keeps an inventoried but unreadable directory package unavailable", () => {
//     const files = fileMap([
//       file("app/package.json", "root"),
//       file("app/entry/package.json", "root", null),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "entry",
//         sourcePath: "app/package.json",
//         context: "package-entrypoint",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       limitations: [expect.stringContaining("text is unavailable")],
//     });
//   });
//
//   it("resolves nearest inventoried bare packages with import/require conditions", () => {
//     const files = fileMap([
//       file("app/src/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         JSON.stringify({
//           exports: {
//             ".": {
//               import: "./esm.mjs",
//               require: "./cjs.cjs",
//               default: "./fallback.js",
//             },
//           },
//         }),
//       ),
//       file("app/node_modules/fixture/esm.mjs", "root"),
//       file("app/node_modules/fixture/cjs.cjs", "root"),
//       file("app/node_modules/fixture/fallback.js", "root"),
//       file("app/node_modules/fixture/hidden.js", "root"),
//       file("app/node_modules/fs/index.js", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "app/src/consumer.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/node_modules/fixture/esm.mjs",
//     });
//     expect(
export const _l = 379;
