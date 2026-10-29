export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { webPageInspectionSchema } from "./browserObservationSchemas.js";
// import { analyzeJavaScriptStaticSource } from "./javascript/javascriptStaticAnalysis.js";
// import { analyzeCapturedWebBundle } from "./webBundleAnalyzer.js";
// import { webBundleAnalysisSchema } from "./webBundleAnalysis.js";
// import { createWebTextArtifact } from "./webContentArtifact.js";
//
// const origin = "https://app.example.test";
//
// it("retains standalone GraphQL Source operations in captured scripts", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//     const source = {
//       body: "query GetUser { user { id } }",
//       locationOffset: { line: 1, column: 1 },
//     };
//   `),
//   );
//   expect(result.observations.endpoints).toEqual([
//     expect.objectContaining({ value: "GetUser", mechanism: "graphql:query" }),
//   ]);
// });
//
// it.each([
//   {
//     kind: "recovered",
//     source: "function legacy(a, a) { return a; } fetch('/partial');",
//     parsed: 2,
//     failures: 0,
//     reason: "recovered",
//     endpoints: ["/partial", "/complete"],
//   },
//   {
//     kind: "failed",
//     source: "function broken( {",
//     parsed: 1,
//     failures: 1,
//     reason: "could not be parsed",
//     endpoints: ["/complete"],
//   },
// ])(
//   "attributes $kind parse uncertainty only to its affected source",
//   ({ source, parsed, failures, reason, endpoints }) => {
//     const captured = inspection(source);
//     const good = inspection("fetch('/complete');").scripts.items[0];
//     if (good === undefined) throw new Error("Missing valid script fixture");
//     captured.scripts.items.push({ ...good, script_key: "valid-script" });
//     captured.scripts.total += 1;
//     const result = analyzeCapturedWebBundle(captured);
//     expect(result.completeness).toMatchObject({
//       status: "partial",
//       parsed_scripts: parsed,
//       parse_failures: failures,
//     });
//     expect(result.unknowns).toContainEqual({
//       dimension: "javascript_ast",
//       reason: expect.stringContaining(reason),
//       affected_script_keys: [captured.scripts.items[0]?.script_key],
//     });
//     expect(result.observations.endpoints.map(({ value }) => value)).toEqual(
//       endpoints,
//     );
//   },
// );
//
// describe("web bundle analyzer", () => {
//   it("extracts graph, route, endpoint, vendor, and WebMCP evidence", () => {
//     const source = `
//       import { createApp } from "./chunk.js?token=secret";
//       const lazy = import("./lazy.js");
//       const routes = [{ path: "/users/:id?token=secret" }];
//       fetch("/api/users?authorization=secret");
//       document.modelContext.registerTool({
//         name: "lookup-user",
//         description: "Untrusted page declaration",
//         inputSchema: {
//           type: "object",
//           properties: {
//             userId: { type: "string" },
//             verbose: { type: "boolean" }
//           }
//         }
//       });
//       const __webpack_require__ = () => createApp(routes, lazy);
//     `;
//     const result = analyzeCapturedWebBundle(inspection(source));
//
//     expect(result.observations.chunks.edges).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           kind: "static_import",
//           specifier: "./chunk.js?token=secret",
//           resolved_url: `${origin}/assets/chunk.js?token=secret`,
//         }),
//         expect.objectContaining({
//           kind: "dynamic_import",
//           specifier: "./lazy.js",
//         }),
//       ]),
//     );
//     expect(result.observations.routes).toEqual([
//       expect.objectContaining({ value: "/users/:id?token=secret" }),
//     ]);
//     expect(result.observations.endpoints).toEqual([
//       expect.objectContaining({
//         value: "/api/users?authorization=secret",
//       }),
//     ]);
//     expect(result.observations.webmcp_declarations).toEqual([
//       expect.objectContaining({
//         name: "lookup-user",
//         trust: "page-declared-untrusted",
//         schema_property_names: ["userId", "verbose"],
//       }),
//     ]);
//     expect(result.inferences).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({ value: "webpack", confidence: "high" }),
//         expect.objectContaining({ value: "Vue" }),
//       ]),
//     );
//     expect(JSON.stringify(result)).toContain("authorization=secret");
//     expect(result.completeness.status).toBe("complete");
//   });
//
//   it("reports parser gaps without imposing a finding cap", () => {
//     const malformed = inspection("function broken( {");
//     const failed = analyzeCapturedWebBundle(malformed);
//     expect(failed.completeness).toMatchObject({
//       status: "partial",
//       parse_failures: 1,
//     });
//     expect(failed.unknowns[0]?.dimension).toBe("javascript_ast");
//
//     const analyzed = analyzeCapturedWebBundle(
//       inspection("fetch('/one'); fetch('/two'); fetch('/three');"),
//     );
//     expect(analyzed.observations.endpoints).toHaveLength(3);
//     expect(analyzed.completeness.status).toBe("complete");
//   });
//
//   it("analyzes AST nodes after the former fixed node ceiling", () => {
//     const source = `${";".repeat(250_001)}fetch('/last');`;
//     const result = analyzeCapturedWebBundle(inspection(source));
//
//     expect(result.observations.endpoints).toContainEqual(
//       expect.objectContaining({ value: "/last" }),
//     );
//     expect(result.completeness.visited_ast_nodes).toBeGreaterThan(250_000);
//     expect(result.completeness.status).toBe("complete");
//   });
//
//   it("retains complete long chunk and WebMCP declaration text", () => {
//     const specifier = `./${"chunk".repeat(1_000)}.js`;
//     const name = "tool".repeat(100);
//     const description = "untrusted declaration ".repeat(150);
//     const propertyName = "property".repeat(100);
//     const result = analyzeCapturedWebBundle(
//       inspection(`
//         import "${specifier}";
//         document.modelContext.registerTool({
//           name: "${name}",
//           description: "${description}",
//           inputSchema: { properties: { "${propertyName}": { type: "string" } } }
//         });
//       `),
//     );
//
//     expect(result.observations.chunks.edges[0]?.specifier).toBe(specifier);
//     expect(result.observations.webmcp_declarations[0]).toMatchObject({
//       name,
//       description,
//       schema_property_names: [propertyName],
//       trust: "page-declared-untrusted",
//     });
//   });
// });
//
// describe("web bundle source-map coverage", () => {
//   it("reports unavailable source maps as partial without dropping requested maps", () => {
//     const analysis = analyzeCapturedWebBundle(inspection("export {};"), {
//       status: "unavailable",
//       requested: 1,
//       processed: 1,
//       items: [
//         {
//           script_key: `scr_${"1".repeat(64)}`,
//           declared_url: "https://app.example.test/app.js.map",
//           effective_url: null,
//           status: "fetch_failed",
//           artifact: null,
//           original_sources: [],
//           original_module_edges: [],
//           mappings: [],
//           limitation: "Source-map fetch failed.",
//         },
//       ],
//     });
//
//     expect(analysis.completeness.status).toBe("partial");
//     expect(analysis.unknowns).toContainEqual({
//       dimension: "source_maps",
//       reason:
//         "One or more requested source maps were unavailable or incomplete",
//       affected_script_keys: [`scr_${"1".repeat(64)}`],
//     });
//   });
//
//   it("keeps map-less captured source complete when no maps were requested", () => {
//     const analysis = analyzeCapturedWebBundle(inspection("export {};"), {
//       status: "not_requested",
//       requested: 0,
//       processed: 0,
//       items: [],
//     });
//
//     expect(analysis.completeness.status).toBe("complete");
//     expect(analysis.unknowns).toEqual([]);
//   });
//
//   it("rejects inconsistent source-map coverage counts", () => {
//     const result = analyzeCapturedWebBundle(inspection("export {};"));
//     expect(
//       webBundleAnalysisSchema.safeParse({
//         ...result,
//         observations: {
//           ...result.observations,
//           source_maps: {
//             ...result.observations.source_maps,
//             requested: 1,
//           },
//         },
//       }).success,
//     ).toBe(false);
//   });
// });
//
// describe("web bundle static-analysis parity", () => {
//   it("recognizes endpoints through nested dynamic receivers like static analysis", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection('window[recv].fetch("/nested-fetch");'),
//     );
//     expect(result.observations.endpoints).toContainEqual(
//       expect.objectContaining({ value: "/nested-fetch" }),
//     );
//   });
//
//   it("reads open endpoints only from XMLHttpRequest method and URL pairs", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection(`
//         xhr.open("GET", "/xhr-get");
//         xhr.open("post", "https://xhr.example.test/submit");
//         dav.open("PROPFIND", "/dav/");
//         fs.open("/tmp/data.txt", "r", done);
//         window.open("https://help.example.test/", "_blank");
//         xhr.open(method, "/dynamic-method");
//         fs.open(path, "r", done);
//         window.open(url, "_blank");
//         window.open(url, "/preview");
//         globalThis.open(url, "./frame");
//         document.open("text/html", "/replace");
//         parent.open("GET", "/parent-xhr");
//         self.open("post", "/self-xhr");
//         top.open("GET", "/top-target");
//         opener.open("GET", "/opener-target");
//         frames.open("GET", "/frames-target");
//         globalThis.open("GET", "/global-target");
//         document.open("GET", "/document-target");
//         const parentWindow = parent;
//         parentWindow.open("GET", "/alias-target");
//         {
//           const parent = new XMLHttpRequest();
//           parent.open(method, "/shadowed-parent-xhr");
//         }
//         xhr.open(method, "api/relative");
//         fs.open(path, "w+", done);
//         popup.open(url, "_TOP");
//       `),
//     );
//     expect(
//       result.observations.endpoints.map(({ value }) => value).sort(),
//     ).toEqual([
//       "/dav/",
//       "/dynamic-method",
//       "/shadowed-parent-xhr",
//       "/xhr-get",
//       "https://xhr.example.test/submit",
//     ]);
//     expect(result.inferences).toContainEqual(
//       expect.objectContaining({
//         kind: "endpoint_candidate",
//         value: "api/relative",
//         confidence: "low",
//       }),
//     );
//   });
// });
//
// describe("web bundle API classification parity", () => {
//   it("reads storage open versions as storage rather than endpoints in both analyzers", () => {
//     const source = `
//       indexedDB.open(databaseName, "2");
//       window.indexedDB.open(databaseName, "/v3");
//       indexedDB.open("APP", "4");
//       indexedDB.open("GET", "/storage-named-xhr");
//     `;
export const _l = 307;
