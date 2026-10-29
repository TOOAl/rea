export const __stub = 1;
//           owned: true,
//           backend: "worker",
//         };
//       return undefined;
//     };
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     expect(result).toMatchObject(reportsSessions(LIVE_PEER));
//   });
//
//   it("reports a blocking GUI session by its backend", async () => {
//     const { producer, client } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const sessionId = producer.database;
//     producer.overrideCall = (name) => {
//       if (name === "idb_close")
//         return { error: `Session not found: ${sessionId}` };
//       if (name === "idb_list")
//         return {
//           sessions: [
//             {
//               session_id: "",
//               input_path: producer.inputPath,
//               owned: false,
//               backend: "gui",
//               is_active: true,
//             },
//           ],
//         };
//       return undefined;
//     };
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     expect(result).toMatchObject(
//       reportsSessions({ session_id: "", backend: "gui", owned: false }),
//     );
//   });
// });
//
// /** A completed open response is not proof that its private Worker was ever released. */
// describe("headless IDA unresolved successful-open ownership", () => {
//   it.each(["matching", "foreign-input", "malformed"] as const)(
//     "retains the private input after %s success with incomplete initial discovery",
//     async (kind) => {
//       const { producer, client, root } = await fixture("headless");
//       let hidden = true;
//       let ownedId: string | undefined;
//       let privateInput: string | undefined;
//       producer.beforeCall = async (name, args) => {
//         if (name !== "idb_open") return;
//         ownedId = z.string().parse(args.preferred_session_id);
//         privateInput = z.string().parse(args.input_path);
//         producer.database = ownedId;
//         producer.inputPath = privateInput;
//       };
//       producer.overrideCall = (name) => {
//         if (name === "idb_open") {
//           const originalId = z.string().parse(ownedId);
//           const originalInput = z.string().parse(privateInput);
//           if (kind === "foreign-input")
//             return {
//               success: true,
//               session: {
//                 session_id: "foreign-session",
//                 input_path: "/foreign/input",
//               },
//             };
//           if (kind === "malformed")
//             return { success: true, session: { session_id: originalId } };
//           return {
//             success: true,
//             session: { session_id: originalId, input_path: originalInput },
//           };
//         }
//         if (name === "idb_list" && hidden) return { sessions: [] };
//         return undefined;
//       };
//
//       expect((await client.execute("health", {})).ok).toBe(false);
//       const incomplete = await client.close();
//       expect(incomplete.ok).toBe(false);
//       if (!incomplete.ok) expect(incomplete.error.cleanupIncomplete).toBe(true);
//       expect(producer.closes).toBe(0);
//       expect(producer.database).toBe(ownedId);
//       expect(
//         (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//       ).toBe(true);
//       expect(producer.calls.some(({ name }) => name === "idb_close")).toBe(
//         false,
//       );
//
//       // A later positive private ownership record permits ordinary save=false
//       // cleanup, without ever adopting the foreign open-response identity.
//       hidden = false;
//       expect((await client.close()).ok).toBe(true);
//       expect(producer.calls.filter(({ name }) => name === "idb_close")).toEqual(
//         [{ name: "idb_close", args: { database: ownedId, save: false } }],
//       );
//       expect(producer.closes).toBe(1);
//       expect(await readdir(root)).toEqual(["target.elf"]);
//     },
//   );
//
//   it("preserves cleanup after a completed, explicit idb_open rejection", async () => {
//     const { producer, client, root } = await fixture("headless");
//     producer.overrideCall = (name) =>
//       name === "idb_open"
//         ? { error: "Input was rejected before creating a session" }
//         : undefined;
//
//     expect((await client.execute("health", {})).ok).toBe(false);
//     expect((await client.close()).ok).toBe(true);
//     expect(producer.calls.some(({ name }) => name === "idb_close")).toBe(false);
//     expect(producer.closes).toBe(1);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//   });
//
//   it("retains cleanup when a rejected open leaves the requested ID on another input", async () => {
//     const { producer, client, requested } = await rejectedOpenFixture();
//     producer.overrideCall = (name) =>
//       name === "idb_list"
//         ? {
//             sessions: [
//               {
//                 session_id: requested,
//                 input_path: "/different/input",
//                 owned: false,
//                 backend: "worker",
//                 is_active: true,
//               },
//             ],
//           }
//         : undefined;
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     if (!result.ok) expect(result.error.cleanupIncomplete).toBe(true);
//     expect(producer.closes).toBe(0);
//   });
// });
//
// describe("headless IDA cleanup verification", () => {
//   it("retries failed worker release through the retained connection before removing its workspace", async () => {
//     const { producer, client, root } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     producer.failClose = true;
//     expect((await client.close()).ok).toBe(false);
//     expect(producer.closes).toBe(0);
//     expect(
//       (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//     ).toBe(true);
//     producer.failClose = false;
//     expect((await client.close()).ok).toBe(true);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_close"),
//     ).toHaveLength(2);
//     expect(producer.closes).toBe(1);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//   });
//   it("retries post-close inventory verification without closing an already released database again", async () => {
//     const { producer, client, root } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     let inventoryFails = true;
//     producer.beforeCall = async (name) => {
//       if (
//         name === "idb_list" &&
//         producer.database === undefined &&
//         inventoryFails
//       )
//         throw new Error(
//           "Worker inventory unavailable after acknowledged close",
//         );
//     };
//     expect((await client.close()).ok).toBe(false);
//     expect(producer.closes).toBe(0);
//     expect(
//       (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//     ).toBe(true);
//     inventoryFails = false;
//     expect((await client.close()).ok).toBe(true);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_close"),
//     ).toHaveLength(1);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//   });
//   it("releases a privately owned worker after malformed open output using verified session inventory", async () => {
//     const { producer, client, root } = await fixture("headless");
//     producer.beforeCall = async (name, args) => {
//       if (name === "idb_open") {
//         producer.database = z.string().parse(args.preferred_session_id);
//         producer.inputPath = z.string().parse(args.input_path);
//       }
//     };
//     producer.overrideCall = (name) =>
//       name === "idb_open"
//         ? jsonValueSchema.parse({
//             success: true,
//             session: { session_id: producer.database },
//           })
//         : undefined;
//     expect((await client.execute("health", {})).ok).toBe(false);
//     expect((await client.close()).ok).toBe(true);
//     expect(
//       producer.calls.find(({ name }) => name === "idb_close")?.args.database,
//     ).toMatch(/^rea-/u);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//   });
// });
//
// it("retains a conflicting requested session ID during pre-close recovery", async () => {
//   const { producer, client, root } = await fixture("headless");
//   producer.overrideCall = (name) =>
//     name === "idb_list"
//       ? {
//           sessions: [
//             {
//               session_id: String(producer.database),
//               input_path: "/conflicting/input",
//               owned: true,
//               backend: "worker",
//               is_active: false,
//             },
//           ],
//         }
//       : undefined;
//   expect((await client.execute("health", {})).ok).toBe(false);
//   const requested = String(producer.database);
//   const result = await client.close();
//   expect(result).toMatchObject(
//     reportsSessions({
//       session_id: requested,
//       input_path: "/conflicting/input",
//       owned: true,
//       backend: "worker",
//       is_active: false,
//     }),
//   );
//   expect(producer.calls.some(({ name }) => name === "idb_close")).toBe(false);
//   expect(
//     (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//   ).toBe(true);
// });
//
// it.each(["unavailable", "malformed"] as const)(
//   "does not invent a worker after explicit rejection and %s inventory",
//   async (kind) => {
//     const { producer, client } = await fixture("headless");
//     producer.overrideCall = (name) =>
//       name === "idb_open"
//         ? { error: "rejected before worker creation" }
//         : name === "idb_list" && kind === "malformed"
//           ? {}
//           : undefined;
//     expect((await client.execute("health", {})).ok).toBe(false);
//     producer.beforeCall = async (name) => {
//       if (name === "idb_list" && kind === "unavailable")
//         throw new Error("inventory unavailable");
//     };
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     if (result.ok) throw new Error("Expected retained cleanup");
//     expect(result.error).not.toHaveProperty("diagnostics.upstream_sessions");
//   },
// );
//
// it.each(["idb_close", "idb_list", "connection_close"])(
//   "preserves transport stderr through cleanup at %s",
//   async (stage) => {
//     const { producer, client } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const failure = new ProviderAdapterError("ida", "transport", {
//       diagnostics: {
//         reason: "upstream transport closed",
//       },
//       capturedOutput: {
//         stdout: "",
//         stderr: "IDA shutdown diagnostic",
//         truncated: false,
//       },
//     });
//     const originalClose = producer.close.bind(producer);
//     producer.beforeCall = async (name) => {
//       if (name === stage) throw failure;
//     };
//     if (stage === "connection_close")
//       producer.close = async () => {
//         throw failure;
//       };
//     try {
//       const result = await client.close();
//       if (result.ok) throw new Error("expected cleanup failure");
//       expect(result.error.capturedOutput?.stderr).toBe(
//         "IDA shutdown diagnostic",
//       );
//       expect(result.error.diagnostics).toMatchObject({
//         failure_reason: "upstream transport closed",
//       });
//       expect(result.error.cleanupIncomplete).toBe(true);
//     } finally {
//       delete producer.beforeCall;
//       producer.close = originalClose;
//       await client.close();
//     }
//   },
// );
//
// it("binds retained transport diagnostics to the requested operation and recovery", async () => {
//   const { producer, client } = await fixture("attached");
//   await client.execute("health", {});
//   producer.beforeCall = async (name) => {
//     if (name === "list_functions")
//       throw new ProviderAdapterError("ida", "transport", {
//         diagnostics: { reason: "upstream closed" },
//         capturedOutput: {
//           stdout: "",
//           stderr: "IDA diagnostic",
//           truncated: false,
//         },
//       });
//   };
//   const result = await client.execute("list_procedures", {});
//   if (result.ok) throw new Error("expected upstream failure");
//   expect(projectAnalysisError(result.error)).toMatchObject({
//     details: {
//       operation: "list_procedures",
//       diagnostics: {
//         reason: "upstream closed",
//         recovery: expect.stringContaining("docs/ida-provider.md"),
//       },
//       captured_output: { stderr: "IDA diagnostic" },
//     },
//   });
//   await client.close();
// });
//
// describe("attached IDA legacy string inventory", () => {
//   it("fetches legacy strings and literal searches in single upstream calls", async () => {
//     const { producer, client } = await fixture();
//     const all = Array.from({ length: 250 }, (_, i) => ({
//       address: `0x${(0x3000 + i).toString(16)}`,
//       length: 5,
//       string: `hello-${i}`,
//     }));
//     producer.overrideCall = (name, args) => {
//       if (name !== "list_strings") return undefined;
//       const offset = Number(args.offset ?? 0);
//       const count = Number(args.count ?? 100);
//       const data = count === 0 ? all : all.slice(offset, offset + count);
//       return {
//         data,
//         next_offset:
//           count === 0 || offset + count >= all.length ? null : offset + count,
//       };
//     };
//     const listed = await client.execute("list_strings", {});
//     expect(listed.ok && listed.value.result).toHaveLength(250);
//     expect(
//       producer.calls.filter(({ name }) => name === "list_strings")[0]?.args
//         .count,
//     ).toBe(0);
//     expect(
//       producer.calls.filter(({ name }) => name === "list_strings"),
//     ).toHaveLength(1);
//     await client.close();
//   });
// });
//
// it("retains transport diagnostics on a cancellation regardless of stderr", async () => {
//   const { producer, client } = await fixture("attached");
//   await client.execute("health", {});
//   const controller = new AbortController();
//   producer.beforeCall = async (name) => {
//     if (name === "list_functions") {
//       controller.abort();
//       throw new ProviderAdapterError("ida", "transport", {
//         diagnostics: { reason: "upstream closed after cancellation" },
//         capturedOutput: {
//           stdout: "",
//           stderr: "shutdown diagnostic",
//           truncated: false,
//         },
//       });
//     }
//   };
//   const result = await client.execute(
//     "list_procedures",
//     {},
//     { signal: controller.signal },
//   );
//   if (result.ok) throw new Error("expected cancellation");
//   expect(projectAnalysisError(result.error)).toMatchObject({
//     code: "cancelled",
//     details: {
//       diagnostics: { reason: "upstream closed after cancellation" },
//       captured_output: { stderr: "shutdown diagnostic" },
//     },
//   });
//   await client.close();
// });
export const _l = 401;
