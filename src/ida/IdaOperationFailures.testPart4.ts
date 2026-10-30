export const __stub = 1;
//       "a successful answer for a different query",
//       lookup("helper", knownFunction, null),
//     ],
//   ])("keeps %s as unreadable output", async (_label, answer) => {
//     const client = await missingProcedureFixture(() => answer);
//     try {
//       const result = await client.execute("procedure_pseudo_code", {
//         procedure: "main",
//       });
//
//       if (result.ok) throw new Error("expected unreadable output");
//       expect(result.error._tag, "a producer fault, not caller input").toBe(
//         "AnalysisProtocolError",
//       );
//       expect(
//         projectAnalysisError(result.error).code,
//         "unknown beats a wrong fact about the caller's input",
//       ).toBe("unreadable_output");
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("keeps an unresolvable callee reported by IDA itself as unreadable output", async () => {
//     const { root, target } = await createIdaTarget();
//     roots.push(root);
//     const producer = new RecordingIdaMcp(target, "headless");
//     producer.overrideCall = (name, args) => {
//       if (name === "callees")
//         return [
//           {
//             callees: [{ addr: "0x2000", name: "sub_2000", type: "internal" }],
//             more: false,
//           },
//         ];
//       if (name !== "lookup_funcs") return undefined;
//       const queries = args.queries;
//       const query = Array.isArray(queries) ? String(queries[0]) : "";
//       return query === "0x2000"
//         ? lookup(query, null, "Not a function")
//         : lookup(query, knownFunction, null);
//     };
//     const client = new IdaSessionClient(
//       {
//         command: "fixture",
//         args: [],
//         env: {},
//         mode: "headless",
//         timeoutMs: 1000,
//         workspaceRoot: root,
//       },
//       target,
//       producer,
//     );
//     try {
//       const result = await client.execute("procedure_callees", {
//         procedure: "main",
//       });
//
//       if (result.ok) throw new Error("expected unreadable output");
//       expect(
//         projectAnalysisError(result.error).code,
//         "an address IDA itself reported is not the caller's mistake",
//       ).toBe("unreadable_output");
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
//
// describe("provider-derived procedure selectors", () => {
//   it.each(["Not found", "Not a function"])(
//     "reports a derived selector answered %s as a producer fault",
//     async (upstream) => {
//       const client = await missingProcedureFixture((query) =>
//         lookup(query, null, upstream),
//       );
//       try {
//         const result = await client.execute(
//           "procedure_callees",
//           { procedure: "0x2000" },
//           { selectorOrigin: "provider" },
//         );
//
//         if (result.ok) throw new Error("expected a producer fault");
//         expect(result.error._tag, "not the caller's mistake").toBe(
//           "AnalysisProtocolError",
//         );
//         expect(
//           projectAnalysisError(result.error).code,
//           "projected as on main",
//         ).toBe("unreadable_output");
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//       }
//     },
//   );
// });
//
// describe("attached IDA procedure lookup failures", () => {
//   it("leaves a failed legacy lookup as unreadable output", async () => {
//     const { root, target } = await createIdaTarget();
//     roots.push(root);
//     const producer = new RecordingIdaMcp(target, "attached");
//     producer.overrideCall = (name) =>
//       name === "get_function_by_name" ? null : undefined;
//     const client = new IdaSessionClient(
//       {
//         command: "fixture",
//         args: [],
//         env: {},
//         mode: "attached",
//         timeoutMs: 1000,
//         workspaceRoot: root,
//       },
//       target,
//       producer,
//     );
//     try {
//       const result = await client.execute("procedure_pseudo_code", {
//         procedure: "main",
//       });
//
//       if (result.ok) throw new Error("expected unreadable output");
//       expect(
//         projectAnalysisError(result.error).code,
//         "the legacy profile keeps its pre-existing classification",
//       ).toBe("unreadable_output");
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("leaves an MCP error reply for an unknown legacy name as unreadable output", async () => {
//     const { root, target } = await createIdaTarget();
//     roots.push(root);
//     const producer = new RecordingIdaMcp(target, "attached");
//     producer.beforeCall = async (name) => {
//       if (name === "get_function_by_name")
//         decodeIdaToolResult({
//           content: [{ type: "text", text: "Function not found: main" }],
//           isError: true,
//         });
//     };
//     const client = new IdaSessionClient(
//       {
//         command: "fixture",
//         args: [],
//         env: {},
//         mode: "attached",
//         timeoutMs: 1000,
//         workspaceRoot: root,
//       },
//       target,
//       producer,
//     );
//     try {
//       const result = await client.execute("procedure_pseudo_code", {
//         procedure: "main",
//       });
//
//       if (result.ok) throw new Error("expected unreadable output");
//       expect(
//         result.error._tag,
//         "a producer error reply, not caller input",
//       ).toBe("AnalysisProtocolError");
//       expect(
//         projectAnalysisError(result.error).code,
//         "the legacy profile keeps its existing classification",
//       ).toBe("unreadable_output");
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
export const _l = 175;
