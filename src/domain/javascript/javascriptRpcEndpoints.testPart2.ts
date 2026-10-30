export const __stub = 1;
//         kind: "network",
//         value: "invoice.list",
//         mechanism: "trpc:procedure:query",
//       },
//       {
//         kind: "network",
//         value: "invoice.onChange",
//         mechanism: "trpc:procedure:subscribe",
//       },
//     ]);
//   });
//
//   it("never reports browser globals or RTK Query endpoints as procedures", () => {
//     expect(
//       rpcEndpoints(`
//         class TRPCClientError extends Error {}
//         navigator.permissions.query({ name: "geolocation" });
//         window.navigator.permissions.query({ name: "camera" });
//         api.endpoints.getPosts.useQuery();
//         api.useGetPostsQuery();
//         useQuery({ queryKey: ["x"] });
//       `),
//     ).toEqual([]);
//   });
// });
//
// describe("tRPC binding identity and bundled syntax", () => {
//   it("keeps client bindings local to their lexical declaration", () => {
//     expect(
//       rpcEndpoints(`
//       function first() { const c = createTRPCClient({}); c.users.query(); }
//       function unrelated(c) { c.users.query("select 1"); }
//       const c = createTRPCClient({});
//       function closure() { c.posts.query(); }
//       function shadowed() { c.users.query(); var c = pool; }
//       { const c = pool; c.users.query(); }
//       try {} catch (c) { c.users.query(); }
//     `),
//     ).toEqual([
//       { kind: "network", value: "users", mechanism: "trpc:procedure:query" },
//       { kind: "network", value: "posts", mechanism: "trpc:procedure:query" },
//     ]);
//   });
//
//   it("does not corroborate overwritten or destructured client bindings", () => {
//     expect(
//       rpcEndpoints(`
//       let c = createTRPCClient({}); c = pool; c.users.query();
//       const { client } = createTRPCClient({}); client.users.query();
//     `),
//     ).toEqual([]);
//     expect(
//       rpcEndpoints(`
//       var c = createTRPCClient({}); c.users.query();
//     `),
//     ).toEqual([
//       { kind: "network", value: "users", mechanism: "trpc:procedure:query" },
//     ]);
//   });
//
//   it("retains one client initializer across variable redeclarations", () => {
//     expect(
//       rpcEndpoints(`
//       var c;
//       var c = createTRPCClient({});
//       var c;
//       c.users.query();
//
//       var replaced;
//       var replaced = createTRPCClient({});
//       replaced = pool;
//       replaced.posts.query();
//
//       var initializedTwice = createTRPCClient({});
//       var initializedTwice = pool;
//       initializedTwice.comments.query();
//
//       var conditional;
//       if (flag) { var conditional = createTRPCClient({}); }
//       conditional.groups.query();
//     `),
//     ).toEqual([
//       { kind: "network", value: "users", mechanism: "trpc:procedure:query" },
//     ]);
//   });
//
//   it("recognizes surviving factory names inside bundled call wrappers", () => {
//     expect(
//       rpcEndpoints(`
//       const c = (0, t.createTRPCClient)({
//         links: [(0, t.httpBatchLink)({ url: "/api/rpc" })],
//       });
//       c.users.query();
//       const p = (t.createTRPCProxyClient as any)({});
//       p.posts.query();
//       (0, t.httpLink)({ url: "/api/other" });
//     `),
//     ).toEqual([
//       {
//         kind: "network",
//         value: "/api/rpc",
//         mechanism: "trpc:link:httpBatchLink",
//       },
//       { kind: "network", value: "users", mechanism: "trpc:procedure:query" },
//       { kind: "network", value: "posts", mechanism: "trpc:procedure:query" },
//       { kind: "network", value: "/api/other", mechanism: "trpc:link:httpLink" },
//     ]);
//   });
//
//   it("preserves procedure paths beyond the former nesting cutoff", () => {
//     const path = Array.from({ length: 64 }, (_, i) => `router${i}`).join(".");
//     expect(rpcEndpoints(`root.${path}.useQuery();`)).toEqual([
//       { kind: "network", value: path, mechanism: "trpc:procedure:useQuery" },
//     ]);
//   });
// });
//
// describe("GraphQL operation recognition", () => {
//   it("recognizes named operations in tagged templates and string literals", () => {
//     expect(
//       rpcEndpoints(`
//         const GET_USER = gql\`
//           # comment
//           query GetUser($id: ID!) { user(id: $id) { name } }
//         \`;
//         const UPDATE = "mutation UpdateInvoice($input: InvoiceInput!) { updateInvoice(input: $input) { id } }";
//         const ON = \`subscription OnInvoice { invoiceChanged { id } } \${fragment}\`;
//       `),
//     ).toEqual([
//       { kind: "network", value: "GetUser", mechanism: "graphql:query" },
//       {
//         kind: "network",
//         value: "UpdateInvoice",
//         mechanism: "graphql:mutation",
//       },
//       {
//         kind: "network",
//         value: "OnInvoice",
//         mechanism: "graphql:subscription",
//       },
//     ]);
//   });
//
//   it("recognizes operations after leading fragment interpolations only when prior quasis are ignored", () => {
//     expect(
//       rpcEndpoints(`
//         const one = gql\`  \${CORE_FIELDS}
//           query CommentsForPost($postId: ID!) { comments { id } }\`;
//         const two = gql\`\${CORE_FIELDS}
//           # another fragment
//           ,\${MORE_FIELDS}
//           mutation UpdatePost($id: ID!) { updatePost(id: $id) { id } }\`;
//         const prose = gql\`fragment prose before interpolation
//           \${CORE_FIELDS}
//           query NotAnOperation { viewer { id } }\`;
//       `),
//     ).toEqual([
//       { kind: "network", value: "CommentsForPost", mechanism: "graphql:query" },
//       { kind: "network", value: "UpdatePost", mechanism: "graphql:mutation" },
//     ]);
//   });
//
//   it.each([
//     ["query", "query # header\nGetUser { user }"],
//     ["mutation", "mutation,# header\r\nGetUser { user }"],
//     ["subscription", "subscription# header\rGetUser { user }"],
//     ["query", "query GetUser # selection\n{ user }"],
//     ["query", "query GetUser { # field\nuser }"],
//     ["query", "query GetUser( # variable\n$id: ID!) { user }"],
//     ["query", "query GetUser # directive\n@skip(if: false) { user }"],
//     ["query", "query GetUser @ # directive name\nkeep { user }"],
//     [
//       "query",
//       "# prefix\nquery # one\n, # two\nGetUser # three\n{ # four\nuser }",
//     ],
//   ])("recognizes %s header comments in %s", (type, text) => {
//     const expected = [
//       { kind: "network", value: "GetUser", mechanism: `graphql:${type}` },
//     ];
//     expect(rpcEndpoints(`const doc = ${JSON.stringify(text)};`)).toEqual(
//       expected,
//     );
//     expect(rpcEndpoints("const doc = gql`" + text + "`; ")).toEqual(expected);
//   });
//
//   it.each([
//     "query # GetUser { user }",
export const _l = 187;
