export const __stub = 1;
//         });
//         const details = z
//           .object({
//             diagnostics: z.object({ reason: z.string() }),
//             partial_observation: z.object({
//               normalized_result: z.object({
//                 target_binding: z.object({ reason: z.string() }),
//               }),
//             }),
//           })
//           .parse(projected.details);
//         const bindingReason =
//           details.partial_observation.normalized_result.target_binding.reason;
//         for (const credential of forbiddenInBinding)
//           expect.soft(bindingReason).not.toContain(credential);
//         expect.soft(bindingReason).toContain(marker);
//         expect(bindingReason).toContain(callerPath);
//         expect.soft(details.diagnostics.reason).toBe(safeReason);
//       } finally {
//         expect((await client.close()).ok).toBe(true);
//         expect(
//           producer.calls.filter(({ name }) => name === "idb_close"),
//         ).toHaveLength(1);
//         await expect(stat(dirname(producer.inputPath))).rejects.toMatchObject({
//           code: "ENOENT",
//         });
//       }
//     },
//   );
// });
//
// describe("headless IDA partial operation evidence", () => {
//   it("retains completed rows when post-operation target identity changes", async () => {
//     const { root, target } = await createIdaTarget();
//     roots.push(root);
//     const producer = new RecordingIdaMcp(target, "headless");
//     let healthReads = 0;
//     producer.overrideCall = (name) => {
//       if (name !== "server_health") return undefined;
//       healthReads += 1;
//       return healthReads === 2
//         ? {
//             status: "ok",
//             input_path: "/different/target.elf",
//             idb_path: "/different/target.elf.i64",
//             module: "target.elf",
//             imagebase: "0x1000",
//             auto_analysis_ready: true,
//           }
//         : undefined;
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
//       const result = await client.execute("list_procedures", {});
//       expect(result.ok).toBe(false);
//       if (!result.ok) {
//         expect(result.error.message).toContain("identity changed");
//         expect(result.error.partialObservation).toMatchObject({
//           normalized_result: {
//             status: "partial",
//             observations: [expect.objectContaining({ tool: "list_funcs" })],
//             target_binding: {
//               status: "not_verified",
//               reason: expect.stringContaining("identity changed"),
//             },
//             metadata_after: {
//               input_path: "/different/target.elf",
//               idb_path: "/different/target.elf.i64",
//             },
//           },
//           raw_result: {
//             post_operation_identity_check: "started",
//             metadata_after: {
//               input_path: "/different/target.elf",
//               idb_path: "/different/target.elf.i64",
//             },
//           },
//         });
//       }
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
//
//   it("retains completed replies when cancellation arrives after a reply", async () => {
//     const { root, target } = await createIdaTarget();
//     roots.push(root);
//     const producer = new RecordingIdaMcp(target, "headless");
//     const controller = new AbortController();
//     producer.beforeCall = async (name) => {
//       if (name === "list_funcs") controller.abort();
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
//       const result = await client.execute(
//         "list_procedures",
//         {},
//         { signal: controller.signal },
//       );
//       expect(result.ok).toBe(false);
//       if (!result.ok) {
//         expect(result.error._tag).toBe("AnalysisCancelledError");
//         expect(result.error.partialObservation).toMatchObject({
//           normalized_result: {
//             status: "partial",
//             observations: [expect.objectContaining({ tool: "list_funcs" })],
//           },
//         });
//       }
//     } finally {
//       expect((await client.close()).ok).toBe(true);
//     }
//   });
// });
//
// describe("headless IDA operation failures", () => {
//   it.each<{
//     tool: string;
//     operation: AnalysisOperation;
//     parameters: Readonly<Record<string, JsonValue>>;
//     response: JsonValue;
//   }>([
//     {
//       tool: "decompile",
//       operation: "procedure_pseudo_code",
//       parameters: { procedure: "main" },
//       response: { code: "partial pseudocode", cursor: { done: true } },
//     },
//     {
//       tool: "xrefs_to",
//       operation: "xrefs",
//       parameters: { address: "0x1000" },
//       response: [{ xrefs: [], more: false }],
//     },
//     {
//       tool: "callees",
//       operation: "procedure_callees",
//       parameters: { procedure: "main" },
//       response: [{ callees: [], more: false }],
//     },
//     {
//       tool: "decompile",
//       operation: "analyze_function",
//       parameters: { procedure: "main" },
//       response: { code: "partial pseudocode", cursor: { done: true } },
//     },
//     {
//       tool: "callees",
//       operation: "analyze_function",
//       parameters: { procedure: "main" },
//       response: [{ callees: [], more: false }],
//     },
//   ])(
//     "preserves $tool failure through $operation when the producer also supplies preview data",
//     async ({ tool, operation, parameters, response }) => {
//       const { root, target } = await createIdaTarget();
export const _l = 178;
