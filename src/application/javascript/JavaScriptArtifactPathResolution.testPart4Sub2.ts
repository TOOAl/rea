export const __stub = 1;
//         ).toMatchObject({
//           declared_path: declaredPath,
//           resolution_status: "resolved",
//           resolved_path: "dist/worker.js",
//         });
//       }
//     },
//   );
//
//   it.each([
//     "app\0.js.map?valid=1",
//     "nested\\worker.js#valid",
//     "app%00.js.map",
//     "app%FF.js.map",
//     "app%C0%AF.js.map",
//     "app%2ejs.map",
//     "nested%2fworker.js",
//     "nested%5cworker.js",
//     "h\nttp://[",
//     "../../outside.js.map",
//     "../../outside/.",
//   ])("rejects an inadmissible URL path: %s", (declaredPath) => {
//     const resolution = resolve({
//       declaredPath,
//       sourcePath: "dist/app.js",
//       context: "url-reference",
//       files: fileMap([
//         file("dist/app.js.map", "root"),
//         file("dist/nested/worker.js", "root"),
//       ]),
//     });
//     expect(resolution).toMatchObject({
//       declared_path: declaredPath,
//       resolution_context: "url-reference",
//       resolution_status: "rejected",
//       resolved_path: null,
//     });
//     expect(resolution.limitations.length).toBeGreaterThan(0);
//   });
//
//   it("resolves sibling paths and rejects external URL forms", () => {
//     const files = fileMap([
//       file("dist/app.js", "root"),
//       file("dist/app.js.map", "root"),
//       file("dist/worker.js", "root"),
//     ]);
//
//     expect(
//       resolve({
//         declaredPath: "app.js.map",
//         sourcePath: "dist/app.js",
//         context: "url-reference",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "dist/app.js.map",
//     });
//     expect(
//       resolve({
//         declaredPath: "app.js.map?v=1#section",
//         sourcePath: "dist/app.js",
//         context: "url-reference",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "dist/app.js.map",
//     });
//     expect(
//       resolve({
//         declaredPath: "//cdn.example.com/app.js.map",
//         sourcePath: "dist/app.js",
//         context: "url-reference",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//     expect(
//       resolve({
//         declaredPath: "https://cdn.example.com/app.js.map",
//         sourcePath: "dist/app.js",
//         context: "url-reference",
//         files,
//       }),
//     ).toMatchObject({
//       resolution_status: "external",
//       resolved_path: null,
//     });
//   });
// });
//
// const resolve = (input: ResolveArtifactPathInput) =>
//   resolveArtifactPathByContext(input);
//
// const fileMap = (files: readonly JavaScriptArtifactFile[]) =>
//   new Map(files.map((value) => [value.path, value]));
//
// const file = (
//   path: string,
//   container: string,
//   text: string | null = "",
// ): JavaScriptArtifactFile => ({
//   path,
//   container_sha256: container.padEnd(64, "0").slice(0, 64),
//   sha256: path.padEnd(64, "0").slice(0, 64),
//   bytes: text?.length ?? 0,
//   inventory_artifact_id: `artifact-${path}`,
//   kind: path.endsWith("package.json") ? "package-json" : "javascript",
//   unpacked: false,
//   text:
//     text === null
//       ? { included: false, reason: "invalid-utf8" }
//       : { included: true, value: text },
// });
//
// const aliasFiles = (
//   entries: Readonly<Record<string, string | null>>,
// ): ReturnType<typeof fileMap> =>
//   fileMap(
//     Object.entries(entries).map(([path, text]) =>
//       file(path, "root", text ?? ""),
//     ),
//   );
//
// describe("exact HTML resource resolution", () => {
//   it.each([
//     ["extension", ["app.js"]],
//     ["directory index", ["app/index.js"]],
//     ["directory package", ["app/package.json", "app/entry.js"]],
//   ] as const)("does not infer a file from %s fallback", (_name, paths) => {
//     const files = fileMap([
//       file("index.html", "root"),
//       ...paths.map((path) =>
//         file(
//           path,
//           "root",
//           path.endsWith("package.json") ? '{"main":"entry.js"}' : "",
//         ),
//       ),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./app",
//         sourcePath: "index.html",
//         context: "html-reference",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//   });
//
//   it("prefers an exact extensionless resource and retains URL suffix handling", () => {
//     const files = fileMap([
//       file("renderer/index.html", "root"),
//       file("assets/app", "root"),
//       file("assets/app.js", "root"),
//       file("assets/app/index.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./app?cache=1#v2",
//         sourcePath: "renderer/index.html",
//         context: "html-reference",
//         htmlBaseHref: "/assets/",
//         files,
//       }),
//     ).toMatchObject({
//       declared_path: "./app?cache=1#v2",
//       resolution_status: "resolved",
//       resolved_path: "assets/app",
//     });
//   });
// });
//
// it.each(["require", "import"] as const)(
//   "rejects a literal trailing backslash package main before %s probing",
//   (moduleKind) => {
//     const files = fileMap([
//       file("entry.js", "root"),
//       file(
//         "node_modules/p/package.json",
//         "root",
//         JSON.stringify({ main: "lib\\" }),
//       ),
//       file("node_modules/p/lib", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "p",
//         sourcePath: "entry.js",
//         context: "module-specifier",
//         moduleKind,
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "rejected", resolved_path: null });
//   },
// );
//
// describe("exact Electron runtime entrypoint resolution", () => {
//   it("requires a protocol for Electron URL resources", () => {
//     const files = fileMap([
//       file("app/main.cjs", "root"),
//       file("app/renderer", "root"),
//       file("app/renderer.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./renderer",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "url-resource",
//       }),
//     ).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       limitations: [expect.stringContaining("requires a URL protocol")],
//     });
//     expect(
//       resolve({
//         declaredPath: "file:///app/renderer",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "url-resource",
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/renderer",
//     });
//   });
//
//   it("checks local paths exactly while preserving bare package lookup", () => {
//     const files = fileMap([
//       file("app/main.cjs", "root"),
//       file("app/worker.js", "root"),
//       file("app/worker", "root"),
//       file("app/worker#v1.js", "root"),
//       file(
//         "node_modules/exported/package.json",
//         "root",
//         '{"exports":{"./parser":"./parser.cjs"}}',
//       ),
//       file("node_modules/exported/parser.cjs", "root"),
//       file("app/fallback/index.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./worker.js",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/worker.js",
//     });
//     expect(
//       resolve({
//         declaredPath: "exported/parser",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "node_modules/exported/parser.cjs",
//     });
//     expect(
//       resolve({
//         declaredPath: "./worker#v1.js",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/worker#v1.js",
//     });
//     expect(
//       resolve({
//         declaredPath: "./fallback",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "not-found",
//       resolved_path: null,
//     });
//   });
//
//   it("accepts an exact extensionless file but not a directory index", () => {
//     const files = fileMap([
//       file("app/main.cjs", "root"),
//       file("app/preload", "root"),
//       file("app/preload.js", "root"),
//       file("app/fallback/index.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./preload",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/preload",
//     });
//     expect(
//       resolve({
//         declaredPath: "./fallback",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "exact-file",
//       }),
//     ).toMatchObject({
//       resolution_status: "not-found",
//       resolved_path: null,
//     });
//   });
// });
//
// it.each(["#home", "?theme=dark", ""])(
//   "does not invent a document base for runtime URL %s",
//   (declaredPath) => {
//     expect(
//       resolve({
//         declaredPath,
//         sourcePath: "main.cjs",
//         context: "url-reference",
//         runtimePathKind: "url-resource",
//         files: fileMap([file("main.cjs", "root")]),
//       }),
//     ).toMatchObject({
//       declared_path: declaredPath,
//       resolution_status: "unavailable",
//       resolved_path: null,
//     });
//   },
// );
//
// it("resolves Node runtime entrypoints without substituting emitted TypeScript sources", () => {
//   const files = fileMap([
//     file("main.ts", "root"),
//     file("worker.ts", "root"),
//     file("worker.js", "other-container"),
//     file("runtime.js", "root"),
//     file("directory/index.js", "root"),
//   ]);
//   for (const [declaredPath, status, path, candidatePath] of [
//     ["./worker.js", "not-found", null, "worker.js"],
//     ["./runtime", "resolved", "runtime.js", undefined],
//     ["./directory", "resolved", "directory/index.js", undefined],
//   ] as const)
//     expect(
//       resolve({
//         declaredPath,
//         sourcePath: "main.ts",
//         context: "module-specifier",
//         files,
//         runtimePathKind: "node-entrypoint",
//       }),
//     ).toMatchObject({
//       resolution_status: status,
//       resolved_path: path,
//       ...(candidatePath === undefined ? {} : { candidate_path: candidatePath }),
//     });
// });
export const _l = 378;
