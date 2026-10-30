export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";
//
// const endpoints = (source: string) =>
//   analyzeJavaScriptStaticSource(source).endpoints.map(
//     ({ kind, value, mechanism }) => ({ kind, value, mechanism }),
//   );
//
// const rpcEndpoints = (source: string) =>
//   endpoints(source).filter(
//     ({ mechanism }) =>
//       mechanism.startsWith("trpc:") || mechanism.startsWith("graphql:"),
//   );
//
// describe("RPC object property ownership", () => {
//   it.each([
//     ['url: "/trpc/old", url: "/trpc/live"', "/trpc/live"],
//     ['url: "/trpc/old", url: runtimeUrl', null],
//     ['url: "/trpc/old", ...options', null],
//     ['url: "/trpc/old", [key]: runtimeUrl', null],
//     ['url: "/trpc/old", get url() { return runtimeUrl; }', null],
//     ['url: "/trpc/old", url() {}', null],
//     ['...options, url: "/trpc/live", headers: {}', "/trpc/live"],
//     ['[key]: runtimeUrl, url: "/trpc/live"', "/trpc/live"],
//     ['url: "/trpc/old", ["url"]: "/trpc/live"', "/trpc/live"],
//     ['url: "/trpc/old", [`url`]: "/trpc/live"', "/trpc/live"],
//     ['url: "/trpc/live", [`headers`]: {}', "/trpc/live"],
//     ['url: "/trpc/live", [1n]: {}', "/trpc/live"],
//     ['url: "/trpc/live", [0x1n]: {}', "/trpc/live"],
//     ['url: "/trpc/live", [0b1n]: {}', "/trpc/live"],
//     ['url: "/trpc/live", [-1n]: {}', "/trpc/live"],
//   ] as const)(
//     "reads only the final known link URL from {%s}",
//     (options, value) => {
//       expect(rpcEndpoints(`httpBatchLink({ ${options} });`)).toEqual(
//         value === null
//           ? []
//           : [{ kind: "network", value, mechanism: "trpc:link:httpBatchLink" }],
//       );
//     },
//   );
//
//   it.each([
//     ['operation: "mutation"', "Old", "graphql:mutation"],
//     ['name: { kind: "Name", value: "Current" }', "Current", "graphql:query"],
//     ['kind: "FragmentDefinition"', null, null],
//     ["name: runtimeName", null, null],
//     ["get name() { return runtimeName; }", null, null],
//     ["...options", null, null],
//     ["[key]: runtimeValue", null, null],
//   ] as const)(
//     "honors final GraphQL document properties: %s",
//     (override, value, mechanism) => {
//       const source = `const doc = {
//       kind: "OperationDefinition", operation: "query",
//       name: { kind: "Name", value: "Old" }, ${override}
//     };`;
//       expect(rpcEndpoints(source)).toEqual(
//         value === null ? [] : [{ kind: "network", value, mechanism }],
//       );
//     },
//   );
// });
//
// describe("tRPC procedure recognition", () => {
//   it("recognizes React hook procedures on a renamed proxy root", () => {
//     expect(
//       rpcEndpoints(`
//         const a = n.post.byId.useQuery({ id: 1 });
//         const b = n.post.add.useMutation();
//         n.feed.useInfiniteQuery({ limit: 10 });
//         n.onEvent.useSubscription(undefined, { onData() {} });
//         n.invoice.list.useSuspenseQuery();
//       `),
//     ).toEqual([
//       {
//         kind: "network",
//         value: "post.byId",
//         mechanism: "trpc:procedure:useQuery",
//       },
//       {
//         kind: "network",
//         value: "post.add",
//         mechanism: "trpc:procedure:useMutation",
//       },
//       {
//         kind: "network",
//         value: "feed",
//         mechanism: "trpc:procedure:useInfiniteQuery",
//       },
//       {
//         kind: "network",
//         value: "onEvent",
//         mechanism: "trpc:procedure:useSubscription",
//       },
//       {
//         kind: "network",
//         value: "invoice.list",
//         mechanism: "trpc:procedure:useSuspenseQuery",
//       },
//     ]);
//   });
//
//   it("recognizes TanStack React Query integration option factories", () => {
//     expect(
//       rpcEndpoints(`
//         useQuery(e.invoice.list.queryOptions({ page: 1 }));
//         useMutation(e.invoice.create.mutationOptions());
//         client.invalidateQueries({ queryKey: e.invoice.list.queryKey() });
//       `),
//     ).toEqual([
//       {
//         kind: "network",
//         value: "invoice.list",
//         mechanism: "trpc:procedure:queryOptions",
//       },
//       {
//         kind: "network",
//         value: "invoice.create",
//         mechanism: "trpc:procedure:mutationOptions",
//       },
//     ]);
//   });
//
//   it("recognizes vanilla client calls and link URLs only in sources carrying a tRPC marker", () => {
//     expect(
//       rpcEndpoints(`
//         const client = createTRPCClient({
//           links: [httpBatchLink({ url: "/api/trpc" })],
//         });
//         const bilbo = await client.getUser.query("id_bilbo");
//         await client.post.add.mutate({ title: "x" });
//         client.onPost.subscribe(undefined, { onData() {} });
//       `),
//     ).toEqual([
//       {
//         kind: "network",
//         value: "/api/trpc",
//         mechanism: "trpc:link:httpBatchLink",
//       },
//       { kind: "network", value: "getUser", mechanism: "trpc:procedure:query" },
//       {
//         kind: "network",
//         value: "post.add",
//         mechanism: "trpc:procedure:mutate",
//       },
//       {
//         kind: "network",
//         value: "onPost",
//         mechanism: "trpc:procedure:subscribe",
//       },
//     ]);
//     expect(
//       rpcEndpoints(`
//         const rows = await pool.users.query("select 1");
//         emitter.changes.subscribe(listener);
//         store.cart.mutate(update);
//       `),
//     ).toEqual([]);
//   });
//
//   it("requires corroboration for request methods shared with Apollo, RxJS and stores", () => {
//     // The source carries a tRPC marker, so only the call shape can decide.
//     expect(
//       rpcEndpoints(`
//         class TRPCClientError extends Error {}
//         this.client.query({ query: q });
//         e.queryManager.query(options);
//         this.untypedClient.query("path", input);
//         this.route.params.subscribe((params) => params);
//         t.current.subscribe(listener);
//         r.store.subscribe(() => {});
//         n.cache.mutate(update);
//         o.k.endpoints.getPosts.useQuery();
//         e.api.endpoints.list.useQuery();
//         this.trpc.invoice.list.useQuery();
//       `),
//     ).toEqual([]);
//     expect(
//       rpcEndpoints(`
//         class TRPCClientError extends Error {}
//         e.invoice.list.query({ page: 1 });
//         e.invoice.onChange.subscribe(undefined, { onData() {} });
//       `),
//     ).toEqual([
//       {
export const _l = 187;
