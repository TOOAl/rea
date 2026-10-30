export const __stub = 1;
//   it("does not add an extension or index to a selected import target", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./config" },
//       }),
//       "main.js": "",
//       "config.cjs": "",
//       "config/index.js": "",
//     });
//     const outcome = resolve({
//       declaredPath: "#config",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     expect(outcome).toMatchObject({
//       resolution_status: "not-found",
//       resolved_path: null,
//     });
//     expect(outcome.limitations.join(" ")).toContain(
//       "import targets are exact files",
//     );
//   });
// });
//
// describe("package import alias refusals", () => {
//   it("reports a missing exact alias without looking in another package", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./config.cjs" },
//       }),
//       "main.js": "",
//       "config.cjs": "",
//     });
//     const outcome = resolve({
//       declaredPath: "#other",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     expect(outcome).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(outcome.limitations.join(" ")).toContain("#other");
//     expect(outcome.limitations.join(" ")).toContain("#config");
//   });
//
//   it("reports an explicit null import target as blocked", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": null },
//       }),
//       "main.js": "",
//       "config.cjs": "",
//     });
//     const outcome = resolve({
//       declaredPath: "#config",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     expect(outcome).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(outcome.limitations.join(" ")).toContain("explicit null");
//   });
//
//   it("leaves wildcard import aliases unresolved", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#internal/*": "./src/*.js" },
//       }),
//       "main.js": "",
//       "src/util.js": "",
//     });
//     const outcome = resolve({
//       declaredPath: "#internal/util",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "import",
//       files,
//     });
//     expect(outcome).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(outcome.limitations.join(" ")).toMatch(/wildcard/i);
//   });
//
//   it("leaves recursive and external-package import targets unresolved", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#loop": "#config", "#dep": "fixture" },
//       }),
//       "main.js": "",
//       "node_modules/fixture/index.js": "",
//     });
//     const recursive = resolve({
//       declaredPath: "#loop",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     const external = resolve({
//       declaredPath: "#dep",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     expect(recursive).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(recursive.limitations.join(" ")).toMatch(/recursive/i);
//     expect(external).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(external.limitations.join(" ")).toMatch(/external-package/i);
//   });
//
//   it("rejects reserved hash specifiers", () => {
//     const files = aliasFiles({
//       "package.json": JSON.stringify({
//         imports: { "#config": "./config.cjs" },
//       }),
//       "main.js": "",
//       "config.cjs": "",
//     });
//     expect(
//       resolve({
//         declaredPath: "#",
//         sourcePath: "main.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "rejected", resolved_path: null });
//   });
//
//   it("does not use a foreign-container enclosing package.json", () => {
//     const files = fileMap([
//       file(
//         "package.json",
//         "other",
//         JSON.stringify({ imports: { "#config": "./config.cjs" } }),
//       ),
//       file("main.js", "root"),
//       file("config.cjs", "root"),
//     ]);
//     const outcome = resolve({
//       declaredPath: "#config",
//       sourcePath: "main.js",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//     });
//     expect(outcome).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(outcome.limitations.join(" ")).toContain("package scopes");
//   });
// });
//
// describe("directory package entrypoint precedence", () => {
//   it.each([
//     ["require", '{"main":"actual.cjs"}', "actual.cjs"],
//     ["require", '{"exports":{"require":"./actual.cjs"}}', "actual.cjs"],
//     ["import", '{"exports":{"import":"./actual.mjs"}}', "actual.mjs"],
//   ] as const)(
//     "prefers declared %s entrypoints over index files",
//     (moduleKind, metadata, entry) => {
//       const files = fileMap([
//         file("app/consumer.js", "root"),
//         file("app/node_modules/fixture/package.json", "root", metadata),
//         file(`app/node_modules/fixture/${entry}`, "root"),
//         file("app/node_modules/fixture/index.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath: "app/consumer.js",
//           context: "module-specifier",
//           moduleKind,
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: `app/node_modules/fixture/${entry}`,
//       });
//     },
//   );
//
//   it.each(["{}", '{"main":"."}'])(
//     "preserves index fallback for package metadata %s",
//     (metadata) => {
//       const files = fileMap([
//         file("app/consumer.js", "root"),
//         file("app/entry/package.json", "root", metadata),
//         file("app/entry/index.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "./entry",
//           sourcePath: "app/consumer.js",
//           context: "module-specifier",
//           moduleKind: "require",
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "resolved",
//         resolved_path: "app/entry/index.js",
//       });
//     },
//   );
//
//   it.each([null, "{"])(
//     "keeps unreadable or invalid metadata explicit even when an index exists",
//     (metadata) => {
//       const files = fileMap([
//         file("app/consumer.js", "root"),
//         file("app/entry/package.json", "root", metadata),
//         file("app/entry/index.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "./entry",
//           sourcePath: "app/consumer.js",
//           context: "module-specifier",
//           moduleKind: "require",
//           files,
//         }),
//       ).toMatchObject({
//         resolution_status: "unavailable",
//         resolved_path: null,
//       });
//     },
//   );
//
//   it("does not replace a missing exports target with an index", () => {
//     const files = fileMap([
//       file("app/consumer.js", "root"),
//       file(
//         "app/node_modules/fixture/package.json",
//         "root",
//         '{"exports":"./missing.js"}',
//       ),
//       file("app/node_modules/fixture/index.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture",
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
//
//   it("keeps direct files ahead of a relative directory package", () => {
//     const files = fileMap([
//       file("app/consumer.js", "root"),
//       file("app/entry.js", "root"),
//       file("app/entry/package.json", "root", '{"main":"actual.js"}'),
//       file("app/entry/actual.js", "root"),
//       file("app/entry/index.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./entry",
//         sourcePath: "app/consumer.js",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/entry.js",
//     });
//   });
//
//   it("retains cycle diagnostics for generic package-entrypoint inference", () => {
//     const files = fileMap([
//       file("app/package.json", "root"),
//       file("app/a/package.json", "root", '{"main":"../b"}'),
//       file("app/b/package.json", "root", '{"main":"../a"}'),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./a",
//         sourcePath: "app/package.json",
//         context: "package-entrypoint",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       limitations: [expect.stringContaining("cycle")],
//     });
//   });
// });
//
// describe("contextual JavaScript module identity", () => {
//   it("retains CommonJS and ESM file-base identity during inert extraction", () => {
//     const analysis = analyzeJavaScriptStaticSource(
//       `
//         import { BrowserWindow } from "electron";
//         new BrowserWindow({ webPreferences: {
//           preload: path.resolve("ignored", __dirname, "preload.cjs")
//         }});
//         new BrowserWindow({ webPreferences: {
//           preload: fileURLToPath(new URL("./preload.mjs", import.meta.url))
//         }});
//         new BrowserWindow({ webPreferences: {
//           preload: path.join(path.dirname(__filename), "legacy-preload.js")
//         }});
//         new BrowserWindow({ webPreferences: {
//           preload: path.posix.resolve("/ignored", dirname(fileURLToPath(import.meta.url)), "esm-preload.js")
//         }});
//         new BrowserWindow({ webPreferences: {
//           preload: path.posix.resolve(__dirname, "/shared", "absolute-preload.js/")
//         }});
//         new BrowserWindow({ webPreferences: {
//           preload: path.posix.resolve(\`/templates\`, "template-preload.js")
//         }});
//         new BrowserWindow({ webPreferences: {
//           preload: new URL("./remote-base.js", location.href)
//         }});
//         window.loadURL("file:///renderer/index.html");
//       `,
//     );
//
//     expect(analysis.role_paths).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           path: "preload.cjs",
//           resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           path: "./preload.mjs",
//           resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           path: "legacy-preload.js",
//           resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           path: "esm-preload.js",
//           resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           path: "/shared/absolute-preload.js",
//           resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           path: "/templates/template-preload.js",
//           resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           path: "file:///renderer/index.html",
//           resolution_context: "module-specifier",
//         }),
//       ]),
//     );
//     expect(analysis.electron.browser_windows).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
export const _l = 379;
