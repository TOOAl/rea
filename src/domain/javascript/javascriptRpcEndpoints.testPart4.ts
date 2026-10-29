export const __stub = 1;
//           const loc={source};
//           const doc={kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetUser"},loc};
//           ${effect}
//         `),
//       ).toHaveLength(count);
//     },
//   );
//
//   it.each([
//     "doc.loc.source = {};",
//     "mutate(doc);",
//     "export { doc };",
//     'globalThis.eval("source.body = replacement");',
//   ])("retains sources exposed through their document: %s", (effect) => {
//     const actual = rpcEndpoints(`
//       const source = {body:"query GetUser { user { id } }",locationOffset:{line:1,column:1}};
//       const doc = {kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetUser"},loc:{source}};
//       ${effect}
//     `);
//     expect(actual).toHaveLength(2);
//   });
//
//   it.each(["doc.loc.source = {};", "mutate(doc);", "export { doc };"])(
//     "retains inline sources when the document escapes: %s",
//     (effect) => {
//       const actual = rpcEndpoints(`
//       const doc = {kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetUser"},loc:{source:{body:"query GetUser { user { id } }",locationOffset:{line:1,column:1}}}};
//       ${effect}
//     `);
//       expect(actual).toHaveLength(2);
//     },
//   );
// });
//
// describe("GraphQL source alias effects", () => {
//   it.each([
//     'source.body = "query Changed { user { id } }";',
//     "mutate(source);",
//     'eval("source.body = replacement");',
//   ])(
//     "retains Source observations after an unproven member effect: %s",
//     (effect) => {
//       const actual = rpcEndpoints(`
//       const source = {
//         body: "query GetUser { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       };
//       ${effect}
//       const operation = {
//         kind: "OperationDefinition", operation: "query",
//         name: { kind: "Name", value: "GetUser" }, loc: { source },
//       };
//     `);
//       expect(actual.filter(({ value }) => value === "GetUser")).toHaveLength(2);
//     },
//   );
//
//   it("does not prove source ownership through a changed location alias", () => {
//     const actual = rpcEndpoints(`
//       const source = {
//         body: "query GetUser { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       };
//       const loc = { source };
//       loc.source = {};
//       const operation = {
//         kind: "OperationDefinition", operation: "query",
//         name: { kind: "Name", value: "GetUser" }, loc,
//       };
//     `);
//     expect(actual).toHaveLength(2);
//   });
//
//   it.each(["inline", "specifier"])(
//     "retains separately exported sources: %s",
//     (form) => {
//       const actual = rpcEndpoints(`
//       ${form === "inline" ? "export" : ""} const source = {
//         body: "query GetUser { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       };
//       ${form === "specifier" ? "export { source };" : ""}
//       const doc = { kind: "OperationDefinition", operation: "query",
//         name: { kind: "Name", value: "GetUser" }, loc: { source } };
//     `);
//       expect(actual).toHaveLength(2);
//     },
//   );
// });
//
// describe("GraphQL document recognition", () => {
//   it("recognizes precompiled GraphQL document objects", () => {
//     expect(
//       rpcEndpoints(`
//         const doc = { kind: "Document", definitions: [{
//           kind: "OperationDefinition",
//           operation: "query",
//           name: { kind: "Name", value: "ListInvoices" },
//           selectionSet: { kind: "SelectionSet", selections: [] },
//         }] };
//       `),
//     ).toEqual([
//       { kind: "network", value: "ListInvoices", mechanism: "graphql:query" },
//     ]);
//   });
//
//   it("ignores anonymous operations and ordinary prose", () => {
//     expect(
//       rpcEndpoints(`
//         const a = "query { viewer { id } }";
//         const b = "query string parameters";
//         const c = "mutation observer started";
//         const d = { kind: "OperationDefinition", operation: "query" };
//         const e = "mutation Observer {";
//         const f = "query Search(";
//         const g = "subscription Plan (monthly)";
//       `),
//     ).toEqual([]);
//   });
//
//   it("reports a private precompiled document once, not again from loc.source.body", () => {
//     expect(
//       rpcEndpoints(`
//         export {};
//         const doc = { kind: "Document", definitions: [{
//           kind: "OperationDefinition",
//           operation: "query",
//           name: { kind: "Name", value: "GetUser" },
//           selectionSet: { kind: "SelectionSet", selections: [] },
//         }], loc: { start: 0, end: 40, source: {
//           body: "query GetUser($id: ID!) { user(id: $id) { name } }",
//           name: "GraphQL request",
//           locationOffset: { line: 1, column: 1 },
//         } } };
//       `),
//     ).toEqual([
//       { kind: "network", value: "GetUser", mechanism: "graphql:query" },
//     ]);
//   });
//
//   it.each([
//     `body: "query Old { user }", body: "query Current { user }", locationOffset: { line: 1, column: 1 }`,
//     `body: "query Old { user }", locationOffset: { line: 1, column: 1 }, ...sourceOptions`,
//     `body: "query Old { user }", locationOffset: { line: 1, column: 1 }, ...{ body: "query Current { user }" }`,
//     `...{ body: "query Old { user }" }, ...runtimeOptions, locationOffset: { line: 1, column: 1 }`,
//   ])(
//     "does not report overwritten or uncertain GraphQL source bodies: %s",
//     (sourceFields) => {
//       expect(
//         rpcEndpoints(`
//           export {};
//           const source = { ${sourceFields} };
//           const operation = {
//             kind: "OperationDefinition",
//             operation: "query",
//             name: { kind: "Name", value: "Current" },
//             loc: { source },
//           };
//         `),
//       ).toEqual([
//         { kind: "network", value: "Current", mechanism: "graphql:query" },
//       ]);
//     },
//   );
//
//   it("keeps ordinary GraphQL string scans outside Source-shaped objects", () => {
//     expect(rpcEndpoints('const text = "query Standalone { user }";')).toEqual([
//       { kind: "network", value: "Standalone", mechanism: "graphql:query" },
//     ]);
//   });
// });
//
// it("keeps existing network endpoint recognition unchanged", () => {
//   expect(
//     endpoints(`fetch("/api/invoices"); n.invoice.list.useQuery();`),
//   ).toEqual([
//     { kind: "network", value: "/api/invoices", mechanism: "call:fetch" },
//     {
//       kind: "network",
//       value: "invoice.list",
//       mechanism: "trpc:procedure:useQuery",
//     },
//   ]);
// });
export const _l = 184;
