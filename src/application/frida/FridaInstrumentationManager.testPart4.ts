export const __stub = 1;
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//   bindings.device.session.nextPayload = { index: -1 };
//   const loaded = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send({index: -1});",
//   });
//   expect(loaded.ok).toBe(true);
//   const script = bindings.device.session.scripts[0];
//   expect(script).toBeDefined();
//   if (script === undefined) return;
//
//   // About 500 of these fit the 16 MiB budget, so 2,000 sends evict and
//   // compact the queue several times.
//   const filler = "x".repeat(32_000);
//   for (let index = 0; index < 2_000; index += 1)
//     script.message.emit({ type: "send", payload: { index, filler } }, null);
//
//   const status = manager.status(started.value.sessionId);
//   expect(status?.messagesTruncated).toBe(true);
//   const indexes = (status?.messages ?? []).map(
//     (message) => (message as { payload: { index: number } }).payload.index,
//   );
//   expect(indexes.length).toBeGreaterThan(400);
//   expect(indexes.at(-1)).toBe(1_999);
//   expect(indexes).toEqual(
//     Array.from(
//       { length: indexes.length },
//       (_, offset) => 2_000 - indexes.length + offset,
//     ),
//   );
//   await manager.closeAll();
// });
//
// it("serializes a final remote release against a new same-endpoint session", async () => {
//   const bindings = new FakeDeviceManager();
//   let enteredRemoval: (() => void) | undefined;
//   const removalEntered = new Promise<void>((resolve) => {
//     enteredRemoval = resolve;
//   });
//   let finishRemoval: (() => void) | undefined;
//   const removalGate = new Promise<void>((resolve) => {
//     finishRemoval = resolve;
//   });
//   bindings.removeRemoteDevice = async (address) => {
//     enteredRemoval?.();
//     await removalGate;
//     bindings.removedRemote.push(address);
//   };
//   const manager = new FridaInstrumentationManager({
//     deviceManager: bindings,
//   });
//   const remote = { address: "127.0.0.1:27042", token: "same-token" };
//   const first = await manager.startSession({
//     mode: "attach",
//     remote,
//     pid: 512,
//   });
//   expect(first.ok).toBe(true);
//   if (!first.ok) return;
//
//   const closing = manager.closeSession(first.value.sessionId);
//   await removalEntered;
//   let secondStarted = false;
//   const secondPromise = manager
//     .startSession({ mode: "attach", remote, pid: 512 })
//     .then((result) => {
//       secondStarted = true;
//       return result;
//     });
//   await Promise.resolve();
//   expect(secondStarted).toBe(false);
//   finishRemoval?.();
//   expect((await closing).ok).toBe(true);
//   const second = await secondPromise;
//   expect(second.ok).toBe(true);
//   if (second.ok) await manager.closeSession(second.value.sessionId);
//   expect(bindings.removedRemote).toEqual([
//     "127.0.0.1:27042",
//     "127.0.0.1:27042",
//   ]);
// });
//
// it("redacts remote credentials and maps a missing optional binding", async () => {
//   const secret = "synthetic-secret-token";
//   const remoteManager = new FakeDeviceManager();
//   remoteManager.addRemoteDevice = async () => {
//     throw new Error(`authorization rejected: ${secret}`);
//   };
//   const remote = new FridaInstrumentationManager({
//     deviceManager: remoteManager,
//   });
//   const failed = await remote.listProcesses({
//     remote: {
//       address: "wss://host/path?token=synthetic-url-token",
//       token: secret,
//     },
//   });
//   expect(failed.ok).toBe(false);
//   if (!failed.ok) {
//     expect(failed.error.message).not.toContain(secret);
//     expect(failed.error.message).not.toContain("synthetic-url-token");
//   }
//
//   const missing = new FridaInstrumentationManager({
//     deviceManagerLoader: async () => {
//       throw new Error("Cannot find package 'frida'");
//     },
//   });
//   const unavailable = await missing.listDevices();
//   expect(unavailable.ok).toBe(false);
//   if (!unavailable.ok)
//     expect(unavailable.error.message).toContain("Cannot find package 'frida'");
// });
//
// it("clears current binding failure after recovery", async () => {
//   const bindings = new FakeDeviceManager();
//   let attempts = 0;
//   const manager = new FridaInstrumentationManager({
//     deviceManagerLoader: async () => {
//       attempts += 1;
//       if (attempts === 1) throw new Error("transient binding load failure");
//       return bindings;
//     },
//   });
//
//   const failed = await manager.listDevices();
//   expect(failed.ok).toBe(false);
//   if (!failed.ok)
//     expect(failed.error.message).toContain("transient binding load failure");
//   expect(manager.availabilityFailure()?.reason).toBe(
//     "transient binding load failure",
//   );
//
//   const recovered = await manager.listDevices();
//   expect(recovered.ok).toBe(true);
//   expect(manager.availabilityFailure()).toBeUndefined();
// });
//
// it("keeps remote option conflicts as actionable invalid input", async () => {
//   const manager = new FridaInstrumentationManager({
//     deviceManager: new FakeDeviceManager(),
//   });
//   const retained = await manager.startSession({
//     mode: "attach",
//     remote: { address: "127.0.0.1:27042", token: "first-token" },
//     pid: 512,
//   });
//   expect(retained.ok).toBe(true);
//   if (!retained.ok) return;
//
//   const conflicting = [
//     await manager.listDevices({
//       address: "127.0.0.1:27042",
//       token: "other-token",
//     }),
//     await manager.listProcesses({
//       remote: { address: "127.0.0.1:27042", token: "other-token" },
//     }),
//     await manager.startSession({
//       mode: "attach",
//       remote: { address: "127.0.0.1:27042", token: "other-token" },
//       pid: 512,
//     }),
//   ];
//   for (const result of conflicting) {
//     expect(result.ok).toBe(false);
//     if (result.ok) continue;
//     if (!(result.error instanceof AnalysisInputError)) throw result.error;
//     expect(result.error.operation).not.toBe("frida_remote_connection");
//     expect(result.error.issues).toContainEqual(
//       expect.objectContaining({
//         path: ["remote"],
//         reason: "invalid_value",
//         message: expect.stringContaining("different connection options"),
//       }),
//     );
//     expect(result.error.message).not.toContain("other-token");
//   }
//   await manager.closeAll();
// });
//
// it("redacts remote credentials echoed by a target script", async () => {
//   const token = "synthetic-token-from-auth";
//   const certificate = "synthetic-certificate-from-auth";
//   const bindings = new FakeDeviceManager();
//   bindings.device.session.nextPayload = { token, certificate };
//   const manager = new FridaInstrumentationManager({ deviceManager: bindings });
//   const started = await manager.startSession({
//     mode: "attach",
//     remote: { address: "127.0.0.1:27042", token, certificate },
//     pid: 512,
//   });
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//   const loaded = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send('credential payload');",
//   });
//   expect(loaded.ok).toBe(true);
//   if (loaded.ok) {
//     const serialized = JSON.stringify(loaded.value.messages);
//     expect(serialized).not.toContain(token);
//     expect(serialized).not.toContain(certificate);
//     expect(serialized).toContain("[redacted]");
//   }
//   await manager.closeAll();
// });
//
// it("bounds oversized Frida message metadata before retaining it", async () => {
//   const bindings = new FakeDeviceManager();
//   bindings.device.session.nextDescription = "d".repeat(1_000_000);
//   bindings.device.session.nextStack = "s".repeat(1_000_000);
//   const manager = new FridaInstrumentationManager({ deviceManager: bindings });
//   const started = await manager.startSession({
//     mode: "attach",
//     deviceId: "local",
//     pid: 512,
//   });
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//   const loaded = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send('metadata');",
//   });
//   expect(loaded.ok).toBe(true);
//   if (loaded.ok) {
//     expect(loaded.value.messagesTruncated).toBe(true);
//     const message = loaded.value.messages[0];
//     expect(message).toMatchObject({
//       description_truncated: true,
//       stack_truncated: true,
//     });
//     expect(JSON.stringify(message).length).toBeLessThan(100_000);
//   }
//   await manager.closeAll();
// });
//
// it("serializes script loading against concurrent close and unloads the loaded script", async () => {
//   const bindings = new FakeDeviceManager();
//   let finishScriptLoad: (() => void) | undefined;
//   const scriptLoadGate = new Promise<void>((resolve) => {
//     finishScriptLoad = resolve;
//   });
//   let markScriptLoadStarted: (() => void) | undefined;
//   const scriptLoadStarted = new Promise<void>((resolve) => {
//     markScriptLoadStarted = resolve;
//   });
//   bindings.device.session.scriptLoadGate = scriptLoadGate;
//   bindings.device.session.onScriptLoadStarted = () => markScriptLoadStarted?.();
//   const manager = new FridaInstrumentationManager({ deviceManager: bindings });
//   const started = await manager.startSession({
//     mode: "attach",
//     deviceId: "local",
//     pid: 512,
//   });
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//
//   const loading = manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send('loaded');",
//   });
//   await scriptLoadStarted;
//   let closed = false;
//   const closing = manager.closeSession(started.value.sessionId);
//   void closing.then(() => {
//     closed = true;
//   });
//   expect(manager.closeSession(started.value.sessionId)).toBe(closing);
//   await Promise.resolve();
//   expect(closed).toBe(false);
//   finishScriptLoad?.();
//   expect((await loading).ok).toBe(true);
//   expect((await closing).ok).toBe(true);
//   expect(bindings.device.session.scripts[0]?.isDestroyed).toBe(true);
//   expect(bindings.device.session.isDetached()).toBe(true);
// });
//
// it("drains startup when the provider loader initiates shutdown", async () => {
//   const bindings = new FakeDeviceManager();
//   let closing: Promise<void> | undefined;
//   const manager = new FridaInstrumentationManager({
//     deviceManagerLoader: async () => {
//       closing = manager.closeAll();
//       return bindings;
//     },
//   });
//   const started = await manager.startSession({
//     mode: "spawn",
//     deviceId: "local",
//     program: "/tmp/fixture",
//   });
//   if (!started.ok) throw started.error;
//   expect(closing).toBeDefined();
//   await closing;
//   expect(bindings.device.session.isDetached()).toBe(true);
//   expect(bindings.device.resumed).toEqual([512]);
//   expect(manager.status(started.value.sessionId)).toBeUndefined();
// });
//
// it("names the unknown session or script ID it rejects", async () => {
//   const { manager, started } = await startLocalAttachedSession();
//   if (!started.ok) throw started.error;
//   const missing = "00000000-0000-4000-8000-000000000009";
//   const sessionIssue = {
//     path: ["session_id"],
//     reason: "invalid_value",
//     message: `No open Frida session ${missing}; start one with start_frida_session.`,
//   };
//   for (const result of [
//     await manager.closeSession(missing),
//     await manager.resumeSession(missing),
//     await manager.loadScript(missing, { sourceKind: "inline", source: "" }),
//     await manager.unloadScript(missing, missing),
//   ])
//     expect(result).toMatchObject({
//       ok: false,
//       error: { _tag: "AnalysisInputError", issues: [sessionIssue] },
//     });
//   expect(
//     await manager.unloadScript(started.value.sessionId, missing),
//   ).toMatchObject({
//     ok: false,
//     error: {
//       issues: [
//         {
//           path: ["script_id"],
//           reason: "invalid_value",
//           message: `No loaded Frida script ${missing} in this session.`,
//         },
//       ],
//     },
//   });
//   await manager.closeAll();
// });
export const _l = 336;
