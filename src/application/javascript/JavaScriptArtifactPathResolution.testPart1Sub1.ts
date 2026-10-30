export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import {
//   resolveArtifactPathByContext,
//   type ResolveArtifactPathInput,
// } from "./JavaScriptArtifactPathResolution.js";
// import type { JavaScriptArtifactFile } from "../../domain/javascript/javascriptArtifactFiles.js";
// import { artifactLocalIdentity } from "./JavaScriptArtifactGraphContext.js";
// import { applicationNodeIdentitySchema } from "../../domain/javascript/javascriptApplicationEvidenceSchemas.js";
// import { analyzeJavaScriptStaticSource } from "../../domain/javascript/javascriptStaticAnalysis.js";
//
// describe("artifact URI scheme classification", () => {
//   it.each(["html-reference", "module-specifier", "url-reference"] as const)(
//     "keeps digit-bearing schemes external in %s even when a local file matches",
//     (context) => {
//       const files = fileMap([
//         file("index.html", "root"),
//         file("web3:app.js", "root"),
//       ]);
//       expect(
//         resolve({
//           declaredPath: "web3:app.js",
//           sourcePath: "index.html",
//           context,
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "external", resolved_path: null });
//     },
//   );
//
//   it("keeps references under a digit-bearing external base href external", () => {
//     const files = fileMap([
//       file("index.html", "root"),
//       file("web3:assets/app.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "app.js",
//         sourcePath: "index.html",
//         context: "html-reference",
//         htmlBaseHref: "web3:assets/",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "external", resolved_path: null });
//   });
// });
//
// describe("artifact-local graph identity", () => {
//   it("preserves complete long namespace and key values", () => {
//     const digest = "a".repeat(64);
//     const namespacePrefix = "n".repeat(512);
//     const keyPrefix = "k".repeat(4_096);
//     const first = artifactLocalIdentity(
//       digest,
//       `${namespacePrefix}a`,
//       `${keyPrefix}a`,
//     );
//     const second = artifactLocalIdentity(
//       digest,
//       `${namespacePrefix}b`,
//       `${keyPrefix}b`,
//     );
//
//     expect(applicationNodeIdentitySchema.parse(first)).toEqual(first);
//     expect(applicationNodeIdentitySchema.parse(second)).toEqual(second);
//     expect(first).not.toEqual(second);
//   });
// });
//
// describe("loader-owned path lookup", () => {
//   it("applies URL whitespace handling only to ESM lookup and retains declarations", () => {
//     const tab = "\t";
//     const files = fileMap([
//       file("app/entry.mjs", "root"),
//       file("app/feature.js", "root"),
//       file(`app/tab${tab}name.js`, "root"),
//     ]);
//     for (const whitespace of ["\t", "\n", "\r"]) {
//       const raw = `./fea${whitespace}ture.js`;
//       expect(
//         resolve({
//           declaredPath: raw,
//           sourcePath: "app/entry.mjs",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({ declared_path: raw, resolved_path: "app/feature.js" });
//     }
//     expect(
//       resolve({
//         declaredPath: `./tab${tab}name.js`,
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({ resolved_path: null });
//     expect(
//       resolve({
//         declaredPath: `./tab${tab}name.js`,
//         sourcePath: "app/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({ resolved_path: "app/tab\tname.js" });
//     expect(
//       resolve({
//         declaredPath: "./tab%09name.js",
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({ resolved_path: "app/tab\tname.js" });
//   });
// });
//
// describe("loader-specific module suffix lookup", () => {
//   it("keeps relative ESM imports exact", () => {
//     const files = fileMap([
//       file("app/entry.mjs", "root"),
//       file("app/feature.js", "root"),
//       file("app/directory/index.js", "root"),
//       file("app/feature.js.js", "root"),
//     ]);
//     for (const declaredPath of ["./feature", "./directory"]) {
//       expect(
//         resolve({
//           declaredPath,
//           sourcePath: "app/entry.mjs",
//           context: "module-specifier",
//           moduleKind: "import",
//           files,
//         }),
//       ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//     }
//     expect(
//       resolve({
//         declaredPath: "./feature.js",
//         sourcePath: "app/entry.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//       }),
//     ).toMatchObject({ resolved_path: "app/feature.js" });
//   });
//
//   it("does not use .cjs as an extensionless CommonJS probe", () => {
//     const files = fileMap([
//       file("app/entry.cjs", "root"),
//       file("app/feature.cjs", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./feature",
//         sourcePath: "app/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//     expect(
//       resolve({
//         declaredPath: "./feature.cjs",
//         sourcePath: "app/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//       }),
//     ).toMatchObject({ resolved_path: "app/feature.cjs" });
//   });
//
//   it("keeps present opaque inventory files distinct from missing module targets", () => {
//     const opaque = new Map([
//       [
//         "app/core.jsc",
//         {
//           path: "app/core.jsc",
//           container_sha256: file("app/entry.cjs", "root").container_sha256,
//           sha256: "a".repeat(64),
//           bytes: 7,
//           inventory_artifact_id: "opaque-core",
//         },
//       ],
//     ]);
//     const files = fileMap([file("app/entry.cjs", "root")]);
//     const unanalyzedFiles = {
//       get: (path: string) => opaque.get(path),
//       hasDirectory: () => false,
//     };
//     expect(
//       resolve({
//         declaredPath: "./core.jsc",
//         sourcePath: "app/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//         unanalyzedFiles,
//       }),
//     ).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       candidate_path: "app/core.jsc",
//       limitations: [
//         expect.stringContaining(`sha256 ${"a".repeat(64)}, 7 bytes`),
//       ],
//     });
//     expect(
//       resolve({
//         declaredPath: "./missing.jsc",
//         sourcePath: "app/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//         unanalyzedFiles,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//     expect(
//       resolve({
//         declaredPath: "./core.jsc",
//         sourcePath: "app/entry.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files,
//         unanalyzedFiles: {
//           ...unanalyzedFiles,
//           get: () => ({
//             ...opaque.get("app/core.jsc")!,
//             container_sha256: "b".repeat(64),
//           }),
//         },
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//   });
// });
//
// describe("unavailable inventoried native add-ons", () => {
//   it("retains an inventoried native add-on whose bytes are unavailable", () => {
//     const unavailable = {
//       path: "app/addon.node",
//       container_sha256: file("app/entry.cjs", "root").container_sha256,
//       sha256: null,
//       bytes: 8192,
//       inventory_artifact_id: null,
//       inventory_occurrence_id: "missing-addon-occurrence",
//       kind: "native-addon" as const,
//       hash_status: "unavailable" as const,
//       limitations: ["unpacked companion is missing"],
//     };
//     const result = resolve({
//       declaredPath: "./addon.node",
//       sourcePath: "app/entry.cjs",
//       context: "module-specifier",
//       moduleKind: "require",
//       files: fileMap([file("app/entry.cjs", "root")]),
//       unanalyzedFiles: {
//         get: (path) => (path === unavailable.path ? unavailable : undefined),
//         hasDirectory: () => false,
//       },
//     });
//     expect(result).toMatchObject({
//       declared_path: "./addon.node",
//       resolution_status: "unavailable",
//       candidate_path: "app/addon.node",
//       limitations: [
//         "unpacked companion is missing",
//         expect.stringContaining("inventoried native-addon file"),
//       ],
//     });
//   });
// });
//
// describe("unavailable package metadata", () => {
//   it("blocks directory fallback until same-container manifests are readable", () => {
//     const manifest = {
//       path: "app/relative/package.json",
//       container_sha256: file("app/main.cjs", "root").container_sha256,
//       sha256: null,
//       bytes: 28,
//       inventory_artifact_id: null,
//       inventory_occurrence_id: "missing-relative-manifest",
//       kind: "package-json" as const,
//       hash_status: "unavailable" as const,
//       limitations: ["unpacked manifest companion is missing"],
//     };
//     const files = fileMap([
//       file("app/main.cjs", "root"),
//       file("app/main.mjs", "root"),
//       file("app/relative/index.js", "root"),
//     ]);
//     const requestedPaths: string[] = [];
//     const lookup = {
//       get: (path: string) => {
//         requestedPaths.push(path);
//         return path === manifest.path ? manifest : undefined;
//       },
//       hasDirectory: () => false,
//     };
//     const relativeRequire = resolve({
//       declaredPath: "./relative",
//       sourcePath: "app/main.cjs",
//       context: "module-specifier",
//       moduleKind: "require",
//       files,
//       unanalyzedFiles: lookup,
//     });
//     expect(requestedPaths).toContain(manifest.path);
//     expect(relativeRequire).toMatchObject({
//       resolution_status: "unavailable",
//       resolved_path: null,
//       limitations: ["unpacked manifest companion is missing"],
//     });
//     expect(
//       resolve({
//         declaredPath: "./relative",
//         sourcePath: "app/main.mjs",
//         context: "module-specifier",
//         moduleKind: "import",
//         files,
//         unanalyzedFiles: lookup,
//       }),
//     ).toMatchObject({ resolution_status: "not-found", resolved_path: null });
//
//     const restoredFiles = fileMap([
//       ...files.values(),
//       file("app/relative/package.json", "root", '{"main":"public.js"}'),
//       file("app/relative/public.js", "root"),
//     ]);
//     expect(
//       resolve({
//         declaredPath: "./relative",
//         sourcePath: "app/main.cjs",
//         context: "module-specifier",
//         moduleKind: "require",
//         files: restoredFiles,
//         unanalyzedFiles: lookup,
//       }),
//     ).toMatchObject({
//       resolution_status: "resolved",
//       resolved_path: "app/relative/public.js",
//     });
//   });
//
//   it("keeps bare package exports unknown while its manifest is unavailable", () => {
//     const containerSha256 = file("app/main.mjs", "root").container_sha256;
//     const manifest = {
//       path: "app/node_modules/fixture/package.json",
//       container_sha256: containerSha256,
//       sha256: null,
//       bytes: 47,
//       inventory_artifact_id: null,
//       kind: "package-json" as const,
//       hash_status: "unavailable" as const,
//       limitations: ["unpacked exports manifest is missing"],
//     };
//     const files = fileMap([
//       file("app/main.cjs", "root"),
//       file("app/main.mjs", "root"),
//       file("app/node_modules/fixture/index.js", "root"),
//       file("app/node_modules/fixture/import.js", "root"),
//       file("app/node_modules/fixture/require.js", "root"),
//     ]);
//     const lookup = {
//       get: (path: string) => (path === manifest.path ? manifest : undefined),
//       hasDirectory: () => false,
//     };
//     for (const [sourcePath, moduleKind] of [
//       ["app/main.cjs", "require"],
//       ["app/main.mjs", "import"],
//     ] as const)
//       expect(
//         resolve({
//           declaredPath: "fixture",
//           sourcePath,
//           context: "module-specifier",
//           moduleKind,
//           files,
export const _l = 379;
