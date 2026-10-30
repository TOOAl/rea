export const __stub = 1;
//     const changed = await client.execute("procedure_pseudo_code", {
//       procedure: "main",
//     });
//     expect(changed.ok).toBe(false);
//     if (!changed.ok) expect(changed.error.message).toContain("changed");
//     await client.close();
//   });
//   it("rejects malformed producer data, non-advancing cursors, unsupported mutation, and missing explicit addresses", async () => {
//     const { producer, client } = await fixture();
//     expect(
//       (
//         await client.execute("set_address_name", {
//           address: "0x1000",
//           name: "changed",
//         })
//       ).ok,
//     ).toBe(false);
//     expect(producer.connects).toBe(0);
//     expect((await client.execute("xrefs", {})).ok).toBe(false);
//     const invalidAddress = await client.execute("xrefs", {
//       address: "not-an-address",
//     });
//     expect(invalidAddress.ok).toBe(false);
//     if (!invalidAddress.ok)
//       expect(invalidAddress.error._tag).toBe("AnalysisInputError");
//     expect(producer.connects).toBe(0);
//     producer.overrideCall = (name) =>
//       name === "list_functions" ? { data: [], next_offset: 0 } : undefined;
//     expect((await client.execute("list_procedures", {})).ok).toBe(false);
//     producer.overrideCall = (name) =>
//       name === "decompile_function" ? { unexpected: true } : undefined;
//     const malformed = await client.execute("procedure_pseudo_code", {
//       procedure: "main",
//     });
//     expect(malformed.ok).toBe(false);
//     if (!malformed.ok) expect(malformed.error._tag).toBe("AnalysisOutputError");
//     await client.close();
//   });
//   it("drains in-flight read-only work on cancellation before closing its proxy", async () => {
//     const { producer, client } = await fixture();
//     await client.execute("health", {});
//     let release: (() => void) | undefined;
//     let notify: (() => void) | undefined;
//     const started = new Promise<void>((resolve) => {
//       notify = resolve;
//     });
//     producer.beforeCall = async (name) => {
//       if (name === "decompile_function") {
//         notify?.();
//         await new Promise<void>((resolve) => {
//           release = resolve;
//         });
//       }
//     };
//     const controller = new AbortController();
//     const call = client.execute(
//       "procedure_pseudo_code",
//       { procedure: "main" },
//       { signal: controller.signal },
//     );
//     await started;
//     controller.abort();
//     const close = client.close();
//     expect(producer.closes).toBe(0);
//     release?.();
//     const result = await call;
//     expect(result.ok).toBe(false);
//     if (!result.ok) expect(result.error._tag).toBe("AnalysisCancelledError");
//     expect((await close).ok).toBe(true);
//     expect(producer.closes).toBe(1);
//   });
// });
//
// const busyHealth = (busyTool?: JsonValue): JsonValue => ({
//   status: "busy",
//   uptime_sec: 1.041,
//   ...(busyTool === undefined ? {} : { busy_tool: busyTool }),
//   busy_sec: 0,
//   queued_calls: 0,
// });
// const healthCalls = (producer: { calls: { name: string }[] }) =>
//   producer.calls.filter(({ name }) => name === "server_health").length;
//
// const expectCleanClose = async (
//   producer: { closes: number },
//   client: { close: () => Promise<{ ok: boolean }> },
// ): Promise<void> => {
//   expect((await client.close()).ok, "the owned worker is released").toBe(true);
//   expect(producer.closes, "the upstream connection is closed once").toBe(1);
// };
//
// describe("headless IDA transient busy health", () => {
//   it("re-reads server_health until the worker reports ok", async () => {
//     const { producer, client } = await fixture("headless");
//     let busyReads = 2;
//     producer.overrideCall = (name) =>
//       name === "server_health" && busyReads-- > 0
//         ? busyHealth("config_json_get")
//         : undefined;
//
//     const result = await client.execute("health", {});
//
//     expect(result.ok, "a transient busy worker is waited out").toBe(true);
//     expect(
//       healthCalls(producer),
//       "two busy reads and the ok read that settles the identity",
//     ).toBe(3);
//     await expectCleanClose(producer, client);
//   });
//
//   it("returns a retryable timeout naming the busy tool at the registration deadline", async () => {
//     const { producer, client } = await fixture("headless", 300);
//     const busy = busyHealth("config_json_get");
//     producer.overrideCall = (name) =>
//       name === "server_health" ? busy : undefined;
//     const started = Date.now();
//
//     const result = await client.execute("health", {});
//     const elapsed = Date.now() - started;
//
//     if (result.ok) throw new Error("expected a busy timeout");
//     expect(result.error._tag, "the neutral timeout class is used").toBe(
//       "AnalysisTimeoutError",
//     );
//     const projected = projectAnalysisError(result.error);
//     expect(projected.code, "the outcome is a provider timeout").toBe(
//       "provider_timeout",
//     );
//     expect(projected.retryable, "the caller may retry").toBe(true);
//     expect(
//       projected.details,
//       "the observed busy tool is named exactly in the operation",
//     ).toMatchObject({
//       operation: "server_health: headless worker still busy in config_json_get",
//       timeout_ms: 300,
//     });
//     expect(
//       result.error.message,
//       "the error message names the busy tool",
//     ).toContain("config_json_get");
//     expect(
//       `${result.error.message} ${projected.message}`,
//       "no Hopper wording leaks in",
//     ).not.toContain("Hopper");
//     expect(result.error.cause, "the raw busy payload is the cause").toEqual(
//       busy,
//     );
//     expect(
//       elapsed,
//       "the wait runs to the deadline, not less",
//     ).toBeGreaterThanOrEqual(290);
//     expect(
//       healthCalls(producer),
//       "reads are spaced by the retry delay, not a tight loop",
//     ).toBeLessThanOrEqual(6);
//     await expectCleanClose(producer, client);
//   });
//
//   it("never invents a busy tool the worker did not report", async () => {
//     const { producer, client } = await fixture("headless", 300);
//     producer.overrideCall = (name) =>
//       name === "server_health" ? busyHealth() : undefined;
//
//     const result = await client.execute("health", {});
//
//     if (result.ok) throw new Error("expected a busy timeout");
//     expect(
//       projectAnalysisError(result.error).details,
//       "an omitted busy_tool is reported as exactly unknown",
//     ).toMatchObject({
//       operation: "server_health: headless worker still busy in unknown",
//     });
//     await expectCleanClose(producer, client);
//   });
//
//   it.each([
//     ["free-form text", "token=abc123 /private<home> secret"],
//     ["an over-long name", "x".repeat(200)],
//   ])(
//     "reports %s from the worker as unknown instead of echoing it",
//     async (_label, tool) => {
//       const { producer, client } = await fixture("headless", 300);
//       producer.overrideCall = (name) =>
//         name === "server_health" ? busyHealth(tool) : undefined;
//
//       const result = await client.execute("health", {});
//
//       if (result.ok) throw new Error("expected a busy timeout");
//       expect(
//         projectAnalysisError(result.error).details,
//         "only a tool-name-shaped value is repeated",
//       ).toMatchObject({
//         operation: "server_health: headless worker still busy in unknown",
//       });
//       expect(
//         result.error.message,
//         "the producer text never reaches the error message",
//       ).not.toContain(tool);
//       await expectCleanClose(producer, client);
//     },
//   );
//
//   it("ends the wait at once when the caller aborts", async () => {
//     const { producer, client } = await fixture("headless", 30_000);
//     producer.overrideCall = (name) =>
//       name === "server_health" ? busyHealth("config_json_get") : undefined;
//     const controller = new AbortController();
//     const started = Date.now();
//     const call = client.execute("health", {}, { signal: controller.signal });
//     while (healthCalls(producer) < 2) {
//       if (Date.now() - started > 5_000) throw new Error("never polled");
//       await new Promise((resolve) => setTimeout(resolve, 10));
//     }
//
//     controller.abort();
//     const result = await call;
//
//     if (result.ok) throw new Error("expected cancellation");
//     expect(result.error._tag, "cancellation keeps today's outcome").toBe(
//       "AnalysisCancelledError",
//     );
//     expect(
//       Date.now() - started,
//       "the wait does not run to the registration deadline",
//     ).toBeLessThan(5_000);
//     await expectCleanClose(producer, client);
//   });
// });
//
// describe("headless IDA busy health after an operation", () => {
//   const withInventory = (
//     producer: RecordingIdaMcp,
//     afterObservation: (read: number) => JsonValue | undefined,
//   ) => {
//     let health = 0;
//     producer.overrideCall = (name) => {
//       if (name === "list_funcs")
//         return [
//           {
//             data: [{ addr: "0x1000", name: "main", size: "0x20" }],
//             next_offset: null,
//           },
//         ];
//       if (name !== "server_health") return undefined;
//       health += 1;
//       return health < 2 ? undefined : afterObservation(health);
//     };
//   };
//
//   it("waits out a busy observation taken after the operation", async () => {
//     const { producer, client } = await fixture("headless");
//     withInventory(producer, (read) =>
//       read === 2 ? busyHealth("config_json_get") : undefined,
//     );
//
//     const result = await client.execute("list_procedures", {});
//
//     expect(result.ok, "the operation succeeds once the worker settles").toBe(
//       true,
//     );
//     expect(healthCalls(producer), "before, busy after, ok after").toBe(3);
//     await expectCleanClose(producer, client);
//   });
//
//   it("maps a cancellation during that wait to cancelled", async () => {
//     const { producer, client } = await fixture("headless", 30_000);
//     withInventory(producer, () => busyHealth("config_json_get"));
//     const controller = new AbortController();
//     const call = client.execute(
//       "list_procedures",
//       {},
//       { signal: controller.signal },
//     );
//     const started = Date.now();
//     while (healthCalls(producer) < 3) {
//       if (Date.now() - started > 5_000) throw new Error("never polled");
//       await new Promise((resolve) => setTimeout(resolve, 10));
//     }
//
//     controller.abort();
//     const result = await call;
//
//     if (result.ok) throw new Error("expected cancellation");
//     expect(result.error._tag, "the after-observation wait is cancellable").toBe(
//       "AnalysisCancelledError",
//     );
//     await expectCleanClose(producer, client);
//   });
// });
//
// describe("headless IDA non-busy health payloads", () => {
//   it.each([
//     ["an unknown status", { status: "starting" }],
//     ["a non-string busy_tool", busyHealth(5)],
//     ["a payload without a status", { uptime_sec: 1 }],
//   ])(
//     "keeps %s as unreadable output without waiting",
//     async (_label, payload) => {
//       const { producer, client } = await fixture("headless");
//       producer.overrideCall = (name) =>
//         name === "server_health" ? jsonValueSchema.parse(payload) : undefined;
//
//       const result = await client.execute("health", {});
//
//       if (result.ok) throw new Error("expected unreadable output");
//       expect(
//         projectAnalysisError(result.error).code,
//         "only the narrow busy shape enters the wait",
//       ).toBe("unreadable_output");
//       expect(healthCalls(producer), "no re-read happened").toBe(1);
//       await expectCleanClose(producer, client);
//     },
//   );
//
//   it("keeps the busy-shape reason when a busy payload is invalid", async () => {
//     const { producer, client } = await fixture("headless");
//     producer.overrideCall = (name) =>
//       name === "server_health" ? busyHealth(5) : undefined;
//
//     const result = await client.execute("health", {});
//
//     if (result.ok) throw new Error("expected unreadable output");
//     expect(
//       projectAnalysisError(result.error).details,
//       "the diagnostic names the invalid busy_tool, not the ok-schema fields",
//     ).toMatchObject({ reason: expect.stringContaining("busy_tool") });
//     expect(
//       JSON.stringify(projectAnalysisError(result.error).details),
//       "the generic ok-schema field errors are not reported for a busy payload",
//     ).not.toContain("input_path");
//     await expectCleanClose(producer, client);
//   });
//
//   it("stops waiting as soon as a later read is malformed", async () => {
//     const { producer, client } = await fixture("headless");
//     let reads = 0;
//     producer.overrideCall = (name) =>
//       name === "server_health"
//         ? reads++ === 0
//           ? busyHealth("config_json_get")
//           : busyHealth(5)
//         : undefined;
//
//     const result = await client.execute("health", {});
//
//     if (result.ok) throw new Error("expected unreadable output");
//     expect(
//       projectAnalysisError(result.error).code,
//       "a malformed re-read is not treated as busy",
//     ).toBe("unreadable_output");
//     expect(
//       healthCalls(producer),
//       "exactly the busy read and the bad read",
//     ).toBe(2);
//     await expectCleanClose(producer, client);
//   });
// });
//
// describe("IDA compatibility profile mismatch", () => {
//   it("reports the native profile for an incompatible catalog", async () => {
//     const { producer, client } = await fixture("attached", 1000, "native");
//     producer.tools = [];
//     const result = await client.execute("health", {});
//     expect(result.ok).toBe(false);
//     if (result.ok) throw new Error("Expected incompatible native catalog");
//     expect(projectAnalysisError(result.error).details).toMatchObject({
//       diagnostics: {
//         mode: "attached",
//         expected_profile: "native",
//         missing_tools: expect.arrayContaining(["decompile"]),
//       },
//     });
//     expect(producer.calls).toEqual([]);
//     expect((await client.close()).ok).toBe(true);
//   });
//
//   it("names every missing tool so the caller can identify the upstream profile", async () => {
//     const { producer, client } = await fixture("headless");
//     producer.tools = [
//       "idb_open",
//       "idb_list",
//       "server_health",
//       "list_funcs",
//       "lookup_funcs",
//       "find_regex",
//       "decompile",
//       "disasm",
//       "callees",
//       "xrefs_to",
//     ];
//     const result = await client.execute("health", {});
//     expect(result.ok, "an incomplete profile cannot serve analysis").toBe(
//       false,
//     );
//     if (result.ok) return;
//     const projected = projectAnalysisError(result.error);
//     expect(
//       projected.details,
//       "the absent tool and the expected profile are both reported",
//     ).toMatchObject({
//       provider_id: "ida",
//       diagnostics: {
export const _l = 402;
