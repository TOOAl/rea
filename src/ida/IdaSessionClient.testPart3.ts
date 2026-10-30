export const __stub = 1;
//         mode: "headless",
//         expected_profile: "database-supervisor",
//         missing_tools: ["idb_close"],
//       },
//     });
//   });
//
//   it("reports the legacy profile when an attached producer serves modern tools", async () => {
//     const { producer, client } = await fixture("attached");
//     producer.tools = ["server_health", "lookup_funcs", "decompile", "disasm"];
//     const result = await client.execute("health", {});
//     expect(result.ok, "an incomplete profile cannot serve analysis").toBe(
//       false,
//     );
//     if (result.ok) return;
//     expect(
//       projectAnalysisError(result.error).details,
//       "attached mode names the legacy profile it expected",
//     ).toMatchObject({
//       diagnostics: { mode: "attached", expected_profile: "legacy-1.4" },
//     });
//   });
// });
//
// describe("headless IDA lifecycle boundaries", () => {
//   it("never closes an unowned worker even when open echoes the requested private identity", async () => {
//     const { producer, client } = await fixture("headless");
//     producer.owned = false;
//     expect((await client.execute("health", {})).ok).toBe(false);
//     const closed = await client.close();
//     expect(closed.ok).toBe(false);
//     if (!closed.ok) expect(closed.error.cleanupIncomplete).toBe(true);
//     expect(producer.calls.some(({ name }) => name === "idb_close")).toBe(false);
//   });
// });
//
// describe("headless IDA session ownership and cleanup", () => {
//   it("shares an in-flight close across concurrent cleanup callers", async () => {
//     const { producer, client } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//
//     let release: (() => void) | undefined;
//     let notify: (() => void) | undefined;
//     const closeStarted = new Promise<void>((resolve) => {
//       notify = resolve;
//     });
//     producer.beforeCall = async (name) => {
//       if (name !== "idb_close") return;
//       notify?.();
//       await new Promise<void>((resolve) => {
//         release = resolve;
//       });
//     };
//
//     const first = client.close();
//     await closeStarted;
//     const second = client.close();
//     release?.();
//     const results = await Promise.all([first, second]);
//
//     expect(results.every((result) => result.ok)).toBe(true);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_close"),
//     ).toHaveLength(1);
//     expect(producer.closes).toBe(1);
//   });
//
//   it("retains the workspace after an unconfirmed open, even when inventory is empty, and never retries startup implicitly", async () => {
//     const { producer, client, root } = await fixture("headless");
//     producer.beforeCall = async (name) => {
//       if (name === "idb_open")
//         throw new Error("Timed out while the worker may still be opening");
//     };
//     expect((await client.execute("health", {})).ok).toBe(false);
//     expect((await client.execute("health", {})).ok).toBe(false);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_open"),
//     ).toHaveLength(1);
//     const closed = await client.close();
//     expect(closed.ok).toBe(false);
//     if (!closed.ok) expect(closed.error.cleanupIncomplete).toBe(true);
//     expect(
//       (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//     ).toBe(true);
//     expect(producer.closes).toBe(0);
//   });
//   it("opens a private digest-verified copy, scopes requests, closes without saving, and removes only its workspace", async () => {
//     const { producer, client, root, target } = await fixture("headless");
//     const original = await readFile(target.path);
//     const result = await client.execute("analyze_function", {
//       procedure: "main",
//     });
//     if (!result.ok) throw result.error;
//     expect(producer.inputPath).not.toBe(target.path);
//     expect(await readFile(producer.inputPath)).toEqual(original);
//     expect(
//       functionDossierSchema
//         .parse(result.value.result)
//         .limitations.some((value) => value.includes("Direct callers")),
//     ).toBe(true);
//     const open = producer.calls.find(({ name }) => name === "idb_open");
//     expect(open?.args).toMatchObject({
//       mode: "force_headless",
//       run_auto_analysis: true,
//     });
//     for (const call of producer.calls.filter(
//       ({ name }) => !["idb_open", "idb_list"].includes(name),
//     ))
//       expect(call.args.database).toBe(producer.database);
//     expect((await client.close()).ok).toBe(true);
//     expect(
//       producer.calls.find(({ name }) => name === "idb_close")?.args.save,
//     ).toBe(false);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//     expect(await readFile(target.path)).toEqual(original);
//   });
//   it("retains the private workspace and reports cleanup failure when worker release is unverified", async () => {
//     const { producer, client, root } = await fixture("headless");
//     await client.execute("health", {});
//     const sessionId = producer.database;
//     producer.failClose = true;
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     if (!result.ok) expect(result.error.cleanupIncomplete).toBe(true);
//     expect(result).toMatchObject(
//       reportsSessions({
//         session_id: sessionId,
//         backend: "worker",
//         owned: true,
//         input_path: producer.inputPath,
//       }),
//     );
//     expect(
//       (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//     ).toBe(true);
//   });
// });
//
// describe("headless IDA reaped worker cleanup", () => {
//   it("recovers a reaped worker only after inventory confirms its session and private input are absent", async () => {
//     const { producer, client, root } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const sessionId = producer.database;
//     producer.beforeCall = async (name) => {
//       if (name === "idb_close") producer.database = undefined;
//     };
//     producer.overrideCall = (name) =>
//       name === "idb_close"
//         ? { error: `Session not found: ${sessionId}` }
//         : undefined;
//
//     expect((await client.close()).ok).toBe(true);
//     expect(producer.calls.map(({ name }) => name).slice(-2)).toEqual([
//       "idb_close",
//       "idb_list",
//     ]);
//     expect(producer.closes).toBe(1);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//   });
//
//   it("retains resources when an absent-session close is followed by a live private-input peer", async () => {
//     const { producer, client, root } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const sessionId = producer.database;
//     producer.beforeCall = async (name) => {
//       if (name === "idb_close") producer.database = undefined;
//       if (name === "idb_list" && producer.database === undefined) {
//         producer.database = "unrelated-live-peer";
//         producer.owned = false;
//       }
//     };
//     producer.overrideCall = (name) =>
//       name === "idb_close"
//         ? { error: `Session not found: ${sessionId}` }
//         : undefined;
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     if (!result.ok) expect(result.error.cleanupIncomplete).toBe(true);
//     // The released session must not be named as the remaining worker.
//     expect(result).toMatchObject(reportsSessions(LIVE_PEER));
//     expect(producer.closes).toBe(0);
//     expect(
//       (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//     ).toBe(true);
//
//     // A retry whose inventory is unavailable keeps the observed blocker.
//     producer.beforeCall = async (name) => {
//       if (name === "idb_list") throw new Error("inventory unavailable");
//     };
//     const retried = await client.close();
//     expect(retried.ok).toBe(false);
//     expect(retried).toMatchObject(reportsSessions(LIVE_PEER));
//   });
//
//   it("retries independent inventory verification after an absent-session response", async () => {
//     const { producer, client, root } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const sessionId = producer.database;
//     let inventoryUnavailable = true;
//     producer.beforeCall = async (name) => {
//       if (name === "idb_close") producer.database = undefined;
//       if (name === "idb_list" && inventoryUnavailable) {
//         inventoryUnavailable = false;
//         throw new Error("Inventory temporarily unavailable");
//       }
//     };
//     producer.overrideCall = (name) =>
//       name === "idb_close"
//         ? { error: `Session not found: ${sessionId}` }
//         : undefined;
//
//     expect((await client.close()).ok).toBe(false);
//     expect(producer.closes).toBe(0);
//     expect((await client.close()).ok).toBe(true);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_close"),
//     ).toHaveLength(1);
//     expect(producer.closes).toBe(1);
//     expect(await readdir(root)).toEqual(["target.elf"]);
//   });
//
//   it("does not treat a different missing session identity as proof of release", async () => {
//     const { producer, client, root } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     producer.beforeCall = async (name) => {
//       if (name === "idb_close") producer.database = undefined;
//     };
//     producer.overrideCall = (name) =>
//       name === "idb_close"
//         ? { error: "Session not found: another-session" }
//         : undefined;
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     expect(
//       producer.calls.filter(({ name }) => name === "idb_list"),
//     ).toHaveLength(1);
//     expect(producer.closes).toBe(0);
//     expect(
//       (await readdir(root)).some((name) => name.startsWith("rea-ida-")),
//     ).toBe(true);
//   });
// });
//
// /** A rejected open response, with helpers for separately inventoried workers. */
// const rejectedOpenFixture = async () => {
//   const { producer, client } = await fixture("headless");
//   producer.overrideCall = (name) =>
//     name === "idb_open" ? { error: "open did not complete" } : undefined;
//   expect((await client.execute("health", {})).ok).toBe(false);
//   const open = producer.calls.find(({ name }) => name === "idb_open")?.args;
//   const entry = (session_id: string, owned: boolean) => ({
//     session_id,
//     input_path: String(open?.input_path),
//     owned,
//     backend: "worker",
//     is_active: true,
//   });
//   return {
//     producer,
//     client,
//     requested: String(open?.preferred_session_id),
//     entry,
//   };
// };
//
// describe("headless IDA cleanup diagnostics", () => {
//   it("does not name a worker whose close was confirmed when inventory then fails", async () => {
//     const { producer, client } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     producer.beforeCall = async (name) => {
//       if (name === "idb_list") throw new Error("inventory unavailable");
//     };
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     expect(producer.calls.map(({ name }) => name)).toContain("idb_close");
//     expect(result).toMatchObject(reportsSessions());
//   });
//
//   it("retains peers and confirmed ownership from successful startup when close fails", async () => {
//     const { producer, client } = await fixture("headless");
//     producer.overrideCall = (name) => {
//       if (name === "idb_list")
//         return {
//           sessions: [
//             {
//               session_id: String(producer.database),
//               input_path: producer.inputPath,
//               owned: true,
//               backend: "worker",
//               is_active: true,
//             },
//             {
//               session_id: "startup-peer",
//               input_path: producer.inputPath,
//               owned: false,
//               backend: "worker",
//               is_active: false,
//             },
//           ],
//         };
//       if (name === "idb_close") return { error: "close rejected" };
//       return undefined;
//     };
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const result = await client.close();
//     expect(result).toMatchObject(
//       reportsSessions(
//         {
//           session_id: producer.database,
//           backend: "worker",
//           owned: true,
//           input_path: producer.inputPath,
//         },
//         {
//           session_id: "startup-peer",
//           backend: "worker",
//           owned: false,
//           input_path: producer.inputPath,
//           is_active: false,
//         },
//       ),
//     );
//   });
//
//   it("preserves an observed conflicting input binding after close", async () => {
//     const { producer, client } = await fixture("headless");
//     expect((await client.execute("health", {})).ok).toBe(true);
//     const requested = String(producer.database);
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
//     const result = await client.close();
//     expect(result).toMatchObject(
//       reportsSessions({
//         session_id: requested,
//         backend: "worker",
//         owned: false,
//         input_path: "/different/input",
//       }),
//     );
//   });
//
//   it("keeps peers seen beside the requested worker when its close fails", async () => {
//     const { producer, client, requested, entry } = await rejectedOpenFixture();
//     producer.overrideCall = (name) => {
//       if (name === "idb_list")
//         return {
//           sessions: [
//             entry(requested, true),
//             entry("unrelated-live-peer", false),
//           ],
//         };
//       if (name === "idb_close") return { error: "close rejected" };
//       return undefined;
//     };
//
//     const result = await client.close();
//     expect(result.ok).toBe(false);
//     expect(result).toMatchObject(
//       reportsSessions(
//         { session_id: requested, backend: "worker", owned: true },
//         LIVE_PEER,
//       ),
//     );
//   });
// });
//
// describe("headless IDA cleanup diagnostics for observed peers", () => {
//   it("drops the requested worker from blockers once its close is confirmed", async () => {
//     const { producer, client, requested, entry } = await rejectedOpenFixture();
//     let inventories = 0;
//     producer.beforeCall = async (name) => {
//       if (name === "idb_list" && ++inventories > 1)
//         throw new Error("inventory unavailable");
//     };
//     producer.overrideCall = (name) => {
//       if (name === "idb_list")
//         return {
//           sessions: [
//             entry(requested, true),
//             entry("unrelated-live-peer", false),
//           ],
//         };
//       if (name === "idb_close")
//         return {
//           success: true,
//           session_id: requested,
//           saved: false,
export const _l = 402;
