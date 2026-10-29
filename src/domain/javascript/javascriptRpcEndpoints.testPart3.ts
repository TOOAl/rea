export const __stub = 1;
//     "query GetUser # { user }",
//     "query GetUser { # user }",
//     "query # anonymous\n{ user }",
//     "query GetUser # prose\nparameters",
//     "query Get# split name\nUser { user }",
//     "query GetUser @ # missing directive name",
//     "query GetUser { # fragment\n...UserFields }",
//     "query\u00a0GetUser { user }",
//     "query\vGetUser { user }",
//   ])("keeps incomplete or unsupported header text unknown: %s", (text) => {
//     expect(rpcEndpoints(`const doc = ${JSON.stringify(text)};`)).toEqual([]);
//   });
//
//   it("retains operations after long ignored prefixes and long headers", () => {
//     const name = "Operation" + "x".repeat(512);
//     const text =
//       "#" +
//       "comment".repeat(700) +
//       "\nquery " +
//       name +
//       " ".repeat(600) +
//       "{ users { id } }";
//     expect(rpcEndpoints(`const doc = ${JSON.stringify(text)};`)).toEqual([
//       { kind: "network", value: name, mechanism: "graphql:query" },
//     ]);
//   });
// });
//
// describe("GraphQL document ownership", () => {
//   it("retains the only operation in a standalone Source object", () => {
//     expect(
//       rpcEndpoints(`const source = {
//         body: "query GetUser { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       };`),
//     ).toEqual([
//       { kind: "network", value: "GetUser", mechanism: "graphql:query" },
//     ]);
//   });
//
//   it("does not deduplicate an unrelated Source against the same operation name", () => {
//     expect(
//       rpcEndpoints(`
//         const source = {
//           body: "query GetUser { user { id } }",
//           locationOffset: { line: 1, column: 1 },
//         };
//         const operation = {
//           kind: "OperationDefinition", operation: "query",
//           name: { kind: "Name", value: "GetUser" },
//         };
//       `),
//     ).toEqual([
//       { kind: "network", value: "GetUser", mechanism: "graphql:query" },
//       { kind: "network", value: "GetUser", mechanism: "graphql:query" },
//     ]);
//   });
//
//   it.each(["referenced", "inline"])(
//     "deduplicates a proven %s source reference",
//     (representation) => {
//       const source = `{
//         body: "query GetUser { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       }`;
//       const document = `export {}; const doc = { kind: "Document", definitions: [{
//         kind: "OperationDefinition", operation: "query",
//         name: { kind: "Name", value: "GetUser" },
//       }], loc: { source: ${representation === "referenced" ? "source" : source} } };`;
//       expect(
//         rpcEndpoints(
//           representation === "referenced"
//             ? `const source = ${source};` + document
//             : document,
//         ),
//       ).toEqual([
//         { kind: "network", value: "GetUser", mechanism: "graphql:query" },
//       ]);
//     },
//   );
//
//   it("retains source text that differs from its document operation", () => {
//     const actual = rpcEndpoints(`
//         const source = {
//           body: "query SourceUser { user { id } }",
//           locationOffset: { line: 1, column: 1 },
//         };
//         const operation = {
//           kind: "OperationDefinition", operation: "mutation",
//           name: { kind: "Name", value: "UpdateUser" }, loc: { source },
//         };
//       `);
//     expect(actual).toHaveLength(2);
//     expect(actual).toEqual(
//       expect.arrayContaining([
//         { kind: "network", value: "SourceUser", mechanism: "graphql:query" },
//         { kind: "network", value: "UpdateUser", mechanism: "graphql:mutation" },
//       ]),
//     );
//   });
//
//   it("selects only the final known standalone Source body", () => {
//     expect(
//       rpcEndpoints(`const source = {
//         body: "query Old { user { id } }",
//         body: "query Current { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       };`),
//     ).toEqual([
//       { kind: "network", value: "Current", mechanism: "graphql:query" },
//     ]);
//   });
//
//   it("does not prove source ownership from an uninitialized reference", () => {
//     const actual = rpcEndpoints(`
//       const operation = {
//         kind: "OperationDefinition", operation: "query",
//         name: { kind: "Name", value: "GetUser" }, loc: { source },
//       };
//       const source = {
//         body: "query GetUser { user { id } }",
//         locationOffset: { line: 1, column: 1 },
//       };
//     `);
//     expect(actual).toHaveLength(2);
//     expect(actual.every(({ value }) => value === "GetUser")).toBe(true);
//   });
// });
//
// describe("GraphQL document container ownership", () => {
//   it.each([
//     ["", "", 2],
//     ["export {};", "", 1],
//     ["function inspect() {", "}", 1],
//   ] as const)(
//     "distinguishes global script bindings from private lexical objects: %s",
//     (prefix, suffix, count) => {
//       expect(
//         rpcEndpoints(`
//           ${prefix}
//           const source={body:"query GetUser { user { id } }",locationOffset:{line:1,column:1}};
//           const doc={kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetUser"},loc:{source}};
//           ${suffix}
//         `),
//       ).toHaveLength(count);
//     },
//   );
//
//   it("does not prove a copy when a caller supplies direct eval", () => {
//     expect(
//       rpcEndpoints(`
//         function inspect(eval) {
//           const source={body:"query GetUser { user { id } }",locationOffset:{line:1,column:1}};
//           const doc={kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetUser"},loc:{source}};
//           eval("doc.loc.source={}");
//         }
//       `),
//     ).toHaveLength(2);
//   });
//
//   it.each([
//     ["export {}; ", "", 1],
//     ["export {}; ", "holder.docs[0].loc.source = {};", 2],
//     ["export ", "", 2],
//   ] as const)(
//     "checks containing object and array ownership: %s %s",
//     (prefix, effect, count) => {
//       expect(
//         rpcEndpoints(`
//           ${prefix}const holder = {docs:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetUser"},loc:{source:{body:"query GetUser { user { id } }",locationOffset:{line:1,column:1}}}}]};
//           ${effect}
//         `),
//       ).toHaveLength(count);
//     },
//   );
//
//   it.each([
//     ["", 'const indirect=globalThis; indirect.eval("loc.source={}");', 2],
//     ["export {};", 'globalThis.eval("loc.source={}");', 1],
//     ["export {};", 'eval("loc.source={}");', 2],
//   ] as const)(
//     "respects lexical exposure for indirect evaluation: %s %s",
//     (prefix, effect, count) => {
//       expect(
//         rpcEndpoints(`
//           ${prefix}
//           const source={body:"query GetUser { user { id } }",locationOffset:{line:1,column:1}};
export const _l = 187;
