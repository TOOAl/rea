export const __stub = 1;
//       usage_bytes: null,
//       quota_bytes: null,
//       local_storage_keys: [],
//       session_storage_keys: [],
//       indexed_db_names: [],
//       cache_names: [],
//       values_redacted: true,
//     },
//     limitations: [],
//   });
//
// it("recognizes expression-free template literals as route properties", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//       const routes = [
//         { path: \`score-board\`, component: ScoreBoard },
//         { route: \`administration\`, component: Admin },
//         { path: \`/user/\${name}\`, component: Dynamic },
//       ];
//     `),
//   );
//
//   expect(result.observations.routes.map(({ value }) => value)).toEqual([
//     "score-board",
//     "administration",
//   ]);
// });
//
// it("uses the shared parser for decorated captured scripts", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`@sealed class Widget {} fetch('/decorated');`),
//   );
//
//   expect(result.completeness).toMatchObject({
//     status: "complete",
//     parsed_scripts: 1,
//     parse_failures: 0,
//   });
//   expect(result.observations.endpoints).toEqual([
//     expect.objectContaining({ value: "/decorated" }),
//   ]);
// });
//
// it("keeps bare module locations unresolved without inventing URL-relative paths", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//     import "package-name";
//     import("@scope/package");
//     require("package-name");
//     import "./actual.js";
//     importScripts("worker.js");
//   `),
//   );
//   for (const specifier of ["package-name", "@scope/package"])
//     expect(
//       result.observations.chunks.edges
//         .filter((edge) => edge.specifier === specifier)
//         .every((edge) => edge.resolved_url === null),
//     ).toBe(true);
//   expect(
//     result.observations.chunks.edges.find(
//       (edge) => edge.specifier === "./actual.js",
//     )?.resolved_url,
//   ).toBe(`${origin}/assets/actual.js`);
//   expect(
//     result.observations.chunks.edges.find(
//       (edge) => edge.specifier === "worker.js",
//     )?.resolved_url,
//   ).toBe(`${origin}/assets/worker.js`);
// });
//
// it("retains each literal importScripts argument in source order", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(
//       'importScripts("first.js", dynamicValue, "second.js", "first.js");',
//     ),
//   );
//   expect(
//     result.observations.chunks.edges
//       .filter(({ kind }) => kind === "worker_import")
//       .map(({ specifier }) => specifier),
//   ).toEqual(["first.js", "second.js"]);
// });
//
// describe("web metadata key semantics", () => {
//   it("keeps computed metadata keys and overwrite order conservative", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection(`
//       const path = "description";
//       const routes = [{ [path]: "/not-a-route" }, { ["path"]: "/real" }];
//       document.modelContext.registerTool({
//         name: "old", name: "new",
//         inputSchema: { properties: { [name]: {}, literal: {} } }
//       });
//       document.modelContext.registerTool({ name: "old", ...dynamic });
//       document.modelContext.registerTool({ name: "old", [name]: "dynamic" });
//       document.modelContext.registerTool({ name: "old", get name() {} });
//       document.modelContext.registerTool({ ...dynamic, ["name"]: "restored" });
//       document.modelContext.registerTool({ name: "valid", [""]: 0 });
//     `),
//     );
//
//     expect(result.observations.routes.map(({ value }) => value)).toEqual([
//       "/real",
//     ]);
//     expect(result.observations.webmcp_declarations).toEqual([
//       expect.objectContaining({
//         name: "new",
//         schema_property_names: ["literal"],
//       }),
//       expect.objectContaining({ name: null }),
//       expect.objectContaining({ name: "restored" }),
//       expect.objectContaining({ name: "valid" }),
//     ]);
//   });
// });
//
// it("retains WebMCP declarations through optional member and call chaining", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//       document.modelContext?.registerTool({ name: "optional member" });
//       document.modelContext.registerTool?.({ name: "optional call" });
//     `),
//   );
//
//   expect(result.observations.webmcp_declarations).toEqual([
//     expect.objectContaining({
//       name: "optional member",
//       trust: "page-declared-untrusted",
//     }),
//     expect.objectContaining({
//       name: "optional call",
//       trust: "page-declared-untrusted",
//     }),
//   ]);
// });
//
// it("reads expression-free template dynamic imports as chunk edges", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//         import(\`./lazy.js\`);
//         import("./quoted.js");
//         import(\`./\${name}.js\`);
//       `),
//   );
//
//   expect(result.observations.chunks.edges).toEqual([
//     expect.objectContaining({
//       kind: "dynamic_import",
//       specifier: "./lazy.js",
//       resolved_url: `${origin}/assets/lazy.js`,
//     }),
//     expect.objectContaining({
//       kind: "dynamic_import",
//       specifier: "./quoted.js",
//     }),
//   ]);
// });
//
// it("does not infer call names from dynamic computed identifiers", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//         const fetch = "render";
//         const require = "render";
//         const registerTool = "render";
//         window[fetch]("/render-only");
//         window[require]("./not-a-module.js");
//         document.modelContext[registerTool]({ name: "not-a-tool" });
//       `),
//   );
//
//   expect(result.observations.endpoints).toEqual([]);
//   expect(result.observations.chunks.edges).toEqual([]);
//   expect(result.observations.webmcp_declarations).toEqual([]);
// });
//
// it("retains direct and literal computed call names", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//         window.fetch("/direct");
//         window["fetch"]("/literal");
//     window[receiver].fetch("/nested-receiver");
//         window.require("./direct.js");
//         window["require"]("./literal.js");
//         document.modelContext["registerTool"]({ name: "literal-tool" });
//       `),
//   );
//
//   expect(result.observations.endpoints.map(({ value }) => value)).toEqual([
//     "/direct",
//     "/literal",
//     "/nested-receiver",
//   ]);
//   expect(
//     result.observations.chunks.edges.map(({ specifier }) => specifier),
//   ).toEqual(["./direct.js", "./literal.js"]);
//   expect(result.observations.webmcp_declarations).toEqual([
//     expect.objectContaining({ name: "literal-tool" }),
//   ]);
// });
//
// it("recognizes tRPC procedures and named GraphQL operations in captured scripts", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//       const n = createTRPCClient({ links: [httpBatchLink({ url: "/api/trpc" })] });
//       e.invoice.list.useQuery({ competencia: "2026-09" });
//       n.empresa.byCnpj.query("00000000000191");
//       const q = "query ListarNotas($competencia: String!) { notas { id } }";
//       this.client.query({ query: q });
//     `),
//   );
//   expect(
//     result.observations.endpoints.map(({ value, mechanism }) => ({
//       value,
//       mechanism,
//     })),
//   ).toEqual([
//     { value: "/api/trpc", mechanism: "trpc:link:httpBatchLink" },
//     { value: "invoice.list", mechanism: "trpc:procedure:useQuery" },
//     { value: "empresa.byCnpj", mechanism: "trpc:procedure:query" },
//     { value: "ListarNotas", mechanism: "graphql:query" },
//   ]);
// });
//
// it("keeps RPC lexical identity and bundled factory recognition in captured scripts", () => {
//   const longOperation = "Operation" + "x".repeat(512);
//   const document =
//     "#" +
//     "comment".repeat(700) +
//     "\nquery " +
//     longOperation +
//     " { users { id } }";
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//     function first() { const c = createTRPCClient({}); }
//     function unrelated(c) { c.users.query("select 1"); }
//     const c = (0, t.createTRPCClient)({ links: [(0, t.httpBatchLink)({ url: "/api/rpc" })] });
//     c.posts.query();
//     const doc = ${JSON.stringify(document)};
//   `),
//   );
//   expect(
//     result.observations.endpoints.map(({ value, mechanism }) => ({
//       value,
//       mechanism,
//     })),
//   ).toEqual([
//     { value: "/api/rpc", mechanism: "trpc:link:httpBatchLink" },
//     { value: "posts", mechanism: "trpc:procedure:query" },
//     { value: longOperation, mechanism: "graphql:query" },
//   ]);
//   expect(result.completeness.status).toBe("complete");
// });
//
// it("retains distinct WebMCP descriptions and names while deduplicating equivalent properties", () => {
//   const result = analyzeCapturedWebBundle(
//     inspection(`
//       document.modelContext.registerTool({ name: "lookup", description: "first", inputSchema: { properties: { alpha: {} } } });
//       document.modelContext.registerTool({ name: "lookup", description: "second", inputSchema: { properties: { alpha: {} } } });
//       document.modelContext.registerTool({ name: "equivalent", inputSchema: { properties: { alpha: {}, beta: {} } } });
//       document.modelContext.registerTool({ name: "equivalent", inputSchema: { properties: { beta: {}, alpha: {}, alpha: {} } } });
//       document.modelContext.registerTool({ description: "unnamed" });
//       document.modelContext.registerTool({ name: "", description: "unnamed" });
//     `),
//   );
//
//   expect(
//     result.observations.webmcp_declarations.map(
//       ({ name, description, schema_property_names }) => ({
//         name,
//         description,
//         schema_property_names,
//       }),
//     ),
//   ).toEqual([
//     {
//       name: "lookup",
//       description: "first",
//       schema_property_names: ["alpha"],
//     },
//     {
//       name: "lookup",
//       description: "second",
//       schema_property_names: ["alpha"],
//     },
//     {
//       name: "equivalent",
//       description: null,
//       schema_property_names: ["alpha", "beta"],
//     },
//     { name: null, description: "unnamed", schema_property_names: [] },
//     { name: "", description: "unnamed", schema_property_names: [] },
//   ]);
//   expect(result.observations.webmcp_declarations[2]?.location).toEqual({
//     script_key: `scr_${"1".repeat(64)}`,
//     line: 4,
//     column: 6,
//   });
//   expect(
//     result.observations.webmcp_declarations.every(
//       ({ trust }) => trust === "page-declared-untrusted",
//     ),
//   ).toBe(true);
// });
export const _l = 304;
