export const __stub = 1;
//           preload_path: "preload.cjs",
//           preload_resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           preload_path: "./preload.mjs",
//           preload_resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           preload_path: "esm-preload.js",
//           preload_resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           preload_path: "/shared/absolute-preload.js",
//           preload_resolution_context: "filesystem-expression",
//         }),
//         expect.objectContaining({
//           preload_path: "/templates/template-preload.js",
//           preload_resolution_context: "filesystem-expression",
//         }),
//       ]),
//     );
//     expect(analysis.role_paths).not.toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ path: "./remote-base.js" }),
//       ]),
//     );
//   });
// });
//
// describe("TypeScript NodeNext emitted-extension resolution", () => {
//   const container = "container";
//
//   it.each([
//     ["./dep.js", "src/dep.ts"],
//     ["./ui/Button.js", "src/ui/Button.tsx"],
//     ["./cfg.mjs", "src/cfg.mts"],
//     ["./legacy.cjs", "src/legacy.cts"],
//   ] as const)(
//     "resolves %s to its TypeScript source counterpart",
//     (specifier, target) => {
//       const files = fileMap([
//         file("src/main.ts", container),
//         file(target, container, "export const value = 1;"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: specifier,
//           sourcePath: "src/main.ts",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "resolved", resolved_path: target });
//     },
//   );
// });
//
// describe("TypeScript declaration fallback ownership", () => {
//   const container = "container";
//
//   it.each([
//     ["./dep.js", "src/dep.d.ts"],
//     ["./cfg.mjs", "src/cfg.d.mts"],
//     ["./legacy.cjs", "src/legacy.d.cts"],
//   ] as const)(
//     "retains %s as compile-time evidence without inventing a runtime target",
//     (specifier, target) => {
//       const files = fileMap([
//         file("src/main.ts", container),
//         file(target, container, "export const value = 1;"),
//       ]);
//       for (const moduleKind of ["import", "require"] as const) {
//         expect(
//           resolve({
//             declaredPath: specifier,
//             sourcePath: "src/main.ts",
//             context: "module-specifier",
//             moduleKind,
//             files,
//           }),
//         ).toMatchObject({
//           resolution_status: "unavailable",
//           resolved_path: null,
//           candidate_path: target,
//         });
//       }
//       expect(
//         resolve({
//           declaredPath: "./" + target.slice(4),
//           sourcePath: "src/main.ts",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "resolved", resolved_path: target });
//     },
//   );
//
//   it("prefers a present runtime file and keeps the fallback off for JS callers", () => {
//     const files = fileMap([
//       file("src/main.ts", container),
//       file("src/dep.js", container),
//       file("src/dep.ts", container),
//       file("src/js-main.js", container),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./dep.js",
//         sourcePath: "src/main.ts",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "src/dep.js",
//     });
//     expect(
//       resolve({
//         declaredPath: "./dep.js",
//         sourcePath: "src/js-main.js",
//         context: "module-specifier",
//         moduleKind: "import",
//         files: fileMap([
//           file("src/js-main.js", container),
//           file("src/dep.ts", container),
//         ]),
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//   });
//
//   it("does not apply the mapping to URL resources or package export targets", () => {
//     const urlFiles = fileMap([
//       file("src/main.ts", container),
//       file("src/asset.ts", container),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "asset.js",
//         sourcePath: "src/main.ts",
//         context: "url-reference",
//         files: urlFiles,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//
//     const packageFiles = fileMap([
//       file("src/main.ts", container),
//       file(
//         "src/node_modules/fixture/package.json",
//         container,
//         '{"exports":"./dep.js"}',
//       ),
//       file("src/node_modules/fixture/dep.ts", container),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "fixture",
//         sourcePath: "src/main.ts",
//         context: "module-specifier",
//         moduleKind: "import",
//         files: packageFiles,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//   });
//
//   it("does not substitute source counterparts for directory or index resolution", () => {
//     const files = fileMap([
//       file("src/main.ts", container),
//       file("src/lib/index.ts", container),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./lib.js",
//         sourcePath: "src/main.ts",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//   });
//
//   it("resolves an emitted dotfile name within its own directory", () => {
//     const files = fileMap([
//       file("src/main.ts", container),
//       file("src/.ts", container),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./.js",
//         sourcePath: "src/main.ts",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "src/.ts",
//     });
//   });
// });
//
// describe("url-reference directory and empty-segment semantics", () => {
//   it.each([
//     "./worker.js/.",
//     "./worker.js/child/..",
//     "./worker.js/",
//     "/dist/worker.js/.",
//     "./worker.js/.?cache=1#entry",
//   ])("keeps directory-form URLs distinct from files: %s", (declaredPath) => {
//     expect(
//       resolve({
//         declaredPath,
//         sourcePath: "dist/app.mjs",
//         context: "url-reference",
//         files: fileMap([file("dist/worker.js", "root")]),
//       }),
//     ).toMatchObject({
//       declared_path: declaredPath,
//       resolution_status: "not-found",
//       resolved_path: null,
//     });
//   });
//
//   it.each([
//     ["./nested//worker.js", null],
//     ["./nested//../worker.js", "dist/nested/worker.js"],
//   ])(
//     "keeps empty URL path segments significant: %s",
//     (declaredPath, resolvedPath) => {
//       // A dot segment removes the preceding empty segment, never `nested`.
//       expect(new URL(declaredPath, "file:///root/dist/app.mjs").pathname).toBe(
//         resolvedPath === null
//           ? "/root/dist/nested//worker.js"
//           : `/root/${resolvedPath}`,
//       );
//       for (const context of ["url-reference", "html-reference"] as const)
//         expect(
//           resolve({
//             declaredPath,
//             sourcePath: "dist/app.mjs",
//             context,
//             files: fileMap([
//               file("dist/worker.js", "root"),
//               file("dist/nested/worker.js", "root"),
//             ]),
//           }),
//           context,
//         ).toMatchObject({ resolved_path: resolvedPath });
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "dist/app.mjs",
//           context: "module-specifier",
//           moduleKind: "import",
//           files: fileMap([
//             file("dist/worker.js", "root"),
//             file("dist/nested/worker.js", "root"),
//           ]),
//         }),
//       ).toMatchObject({ resolved_path: resolvedPath });
//       // CommonJS keeps filesystem path semantics.
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "dist/app.mjs",
//           context: "module-specifier",
//           moduleKind: "require",
//           files: fileMap([
//             file("dist/worker.js", "root"),
//             file("dist/nested/worker.js", "root"),
//           ]),
//         }),
//       ).toMatchObject({
//         resolved_path:
//           declaredPath === "./nested//worker.js"
//             ? "dist/nested/worker.js"
//             : "dist/worker.js",
//       });
//     },
//   );
//
//   it.each([
//     ["./nested/.././worker.js?cache=1#entry", "dist/worker.js"],
//     ["./.worker.js", "dist/.worker.js"],
//   ])("resolves exact file URLs with dots: %s", (declaredPath, resolvedPath) => {
//     expect(
//       resolve({
//         declaredPath,
//         sourcePath: "dist/app.mjs",
//         context: "url-reference",
//         files: fileMap([file(resolvedPath, "root")]),
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: resolvedPath,
//     });
//   });
// });
//
// describe("suffix-only non-runtime URL references", () => {
//   it.each(["", "?cache=1", "#worker"])(
//     "rejects URL reference %s without a path or known base document",
//     (declaredPath) => {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "dist/app.mjs",
//           context: "url-reference",
//           files: fileMap([file("dist/app.mjs", "root")]),
//         }),
//       ).toMatchObject({
//         declared_path: declaredPath,
//         resolution_status: "rejected",
//         resolved_path: null,
//       });
//     },
//   );
// });
//
// describe("url-reference JavaScript artifact path resolution", () => {
//   it.each([
//     ["C|?cache=1#entry", "dist/C|"],
//     ["/c:/worker.js", "c:/worker.js"],
//     ["/./c|/worker.js", "c|/worker.js"],
//     ["../c|/worker.js", "c|/worker.js"],
//     ["/nested/../c|/worker.js", "c|/worker.js"],
//     ["c|/../worker.js", "dist/worker.js"],
//   ])("leaves drive-letter URL paths unresolved: %s", (declaredPath, decoy) => {
//     const resolution = resolve({
//       declaredPath,
//       sourcePath: "dist/app.mjs",
//       context: "url-reference",
//       files: fileMap([file(decoy, "root")]),
//     });
//     expect(resolution).toMatchObject({
//       declared_path: declaredPath,
//       resolution_status: "unavailable",
//       resolved_path: null,
//     });
//     expect(resolution.limitations.length).toBeGreaterThan(0);
//   });
//
//   it.each([
//     ["./c|/worker.js", "dist/c|/worker.js"],
//     ["c|name/worker.js", "dist/c|name/worker.js"],
//     ["/%63|/worker.js", "c|/worker.js"],
//     ["/c%3A/worker.js", "c:/worker.js"],
//   ])(
//     "retains non-drive URL path identities: %s",
//     (declaredPath, resolvedPath) => {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "dist/app.mjs",
//           context: "url-reference",
//           files: fileMap([file(resolvedPath, "root")]),
//         }),
//       ).toMatchObject({
//         declared_path: declaredPath,
//         resolution_status: "resolved",
//         resolved_path: resolvedPath,
//       });
//     },
//   );
//
//   it.each(["?value=", "#value="])(
//     "admits the pathname independently of its %s suffix",
//     (suffix) => {
//       for (const value of ["%2F", "%2E", "%5C", "%00", "%FF", "\\", "\0"]) {
//         const declaredPath = `./worker.js${suffix}${value}`;
//         expect(
//           resolve({
//             declaredPath,
//             sourcePath: "dist/app.js",
//             context: "url-reference",
//             files: fileMap([file("dist/worker.js", "root")]),
//           }),
//           declaredPath,
export const _l = 378;
