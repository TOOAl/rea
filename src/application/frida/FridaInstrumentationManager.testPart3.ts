export const __stub = 1;
//     });
//     expect(loaded.ok).toBe(true);
//     const script = bindings.device.session.scripts[0];
//     expect(script).toBeDefined();
//     if (script === undefined) return;
//     script.unloadFailureCount = 1;
//     bindings.device.session.detachFailureCount = 1;
//
//     const closed = await manager.closeSession(started.value.sessionId);
//
//     expect(closed.ok).toBe(false);
//     expect(bindings.device.resumed).toEqual([]);
//     expect(manager.status(started.value.sessionId)?.scripts).toHaveLength(1);
//   });
//
//   it("retries resuming a spawn after detach succeeded but resume failed", async () => {
//     const bindings = new FakeDeviceManager();
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     const loaded = await manager.loadScript(started.value.sessionId, {
//       sourceKind: "inline",
//       source: "send('ready');",
//     });
//     expect(loaded.ok).toBe(true);
//     bindings.device.resumeFailureCount = 1;
//
//     const firstClose = await manager.closeSession(started.value.sessionId);
//
//     expect(firstClose.ok).toBe(false);
//     expect(bindings.device.session.isDetached()).toBe(true);
//     expect(manager.status(started.value.sessionId)).toBeDefined();
//
//     const retry = await manager.closeSession(started.value.sessionId);
//
//     expect(retry.ok).toBe(true);
//     expect(bindings.device.resumed).toEqual([512]);
//     expect(manager.status(started.value.sessionId)).toBeUndefined();
//   });
//
//   it("keeps a remote device while a spawned target resume is pending", async () => {
//     const bindings = new FakeDeviceManager();
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "spawn",
//       remote: { address: "127.0.0.1:27042" },
//       program: "/tmp/fixture",
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     bindings.device.resumeFailureCount = 1;
//
//     const firstClose = await manager.closeSession(started.value.sessionId);
//
//     expect(firstClose.ok).toBe(false);
//     expect(bindings.removedRemote).toEqual([]);
//
//     const retry = await manager.closeSession(started.value.sessionId);
//
//     expect(retry.ok).toBe(true);
//     expect(bindings.device.resumed).toEqual([512]);
//     expect(bindings.removedRemote).toEqual(["127.0.0.1:27042"]);
//   });
//
//   it("keeps a remote device while script and session cleanup are pending", async () => {
//     const bindings = new FakeDeviceManager();
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "attach",
//       remote: { address: "127.0.0.1:27042" },
//       pid: 512,
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     const loaded = await manager.loadScript(started.value.sessionId, {
//       sourceKind: "inline",
//       source: "send('ready');",
//     });
//     expect(loaded.ok).toBe(true);
//     const script = bindings.device.session.scripts[0];
//     expect(script).toBeDefined();
//     if (script === undefined) return;
//     script.unloadFailureCount = 1;
//     bindings.device.session.detachFailureCount = 1;
//
//     const firstClose = await manager.closeSession(started.value.sessionId);
//
//     expect(firstClose.ok).toBe(false);
//     expect(bindings.removedRemote).toEqual([]);
//
//     const retry = await manager.closeSession(started.value.sessionId);
//
//     expect(retry.ok).toBe(true);
//     expect(script.isDestroyed).toBe(true);
//     expect(bindings.removedRemote).toEqual(["127.0.0.1:27042"]);
//   });
// });
//
// it("does not release a newer remote lease when retrying an older session close", async () => {
//   const bindings = new FakeDeviceManager();
//   bindings.removeRemoteFailureCount = 1;
//   const manager = new FridaInstrumentationManager({ deviceManager: bindings });
//   const remote = { address: "127.0.0.1:27042" };
//   const first = await manager.startSession({
//     mode: "attach",
//     remote,
//     pid: 512,
//   });
//   expect(first.ok).toBe(true);
//   if (!first.ok) return;
//
//   const failedClose = await manager.closeSession(first.value.sessionId);
//   expect(failedClose.ok).toBe(false);
//
//   const second = await manager.startSession({
//     mode: "attach",
//     remote,
//     pid: 512,
//   });
//   expect(second.ok).toBe(true);
//   if (!second.ok) return;
//
//   const retry = await manager.closeSession(first.value.sessionId);
//   expect(retry.ok).toBe(true);
//   expect(bindings.removedRemote).toEqual([]);
//   expect(manager.status(second.value.sessionId)).toBeDefined();
//
//   const secondClose = await manager.closeSession(second.value.sessionId);
//   expect(secondClose.ok).toBe(true);
//   expect(bindings.removedRemote).toEqual([remote.address]);
// });
//
// it("attributes messages to their producing script and returns each load's messages", async () => {
//   const { bindings, manager, started } = await startLocalAttachedSession();
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//
//   bindings.device.session.nextPayload = { tag: "A" };
//   const first = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send({tag: 'A'});",
//   });
//   expect(first.ok).toBe(true);
//   if (!first.ok) return;
//
//   bindings.device.session.nextPayload = { tag: "B" };
//   const second = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send({tag: 'B'});",
//   });
//   expect(second.ok).toBe(true);
//   if (!second.ok) return;
//
//   expect(first.value.messages).toEqual([
//     expect.objectContaining({
//       script_id: first.value.scriptId,
//       payload: { tag: "A" },
//     }),
//   ]);
//   expect(second.value.messages).toEqual([
//     expect.objectContaining({
//       script_id: second.value.scriptId,
//       payload: { tag: "B" },
//     }),
//   ]);
//   expect(manager.status(started.value.sessionId)?.messages).toEqual([
//     expect.objectContaining({ script_id: first.value.scriptId }),
//     expect.objectContaining({ script_id: second.value.scriptId }),
//   ]);
//   await manager.closeAll();
// });
//
// it("retains Frida error source coordinates in script and session evidence", async () => {
//   const { bindings, manager, started } = await startLocalAttachedSession();
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//
//   bindings.device.session.nextMessage = {
//     type: "error",
//     description: "instrumentation failed",
//     stack: "Error: instrumentation failed",
//     fileName: "agent.js",
//     lineNumber: 7,
//     columnNumber: 3,
//   };
//   const loaded = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "throw new Error('instrumentation failed');",
//   });
//   expect(loaded.ok).toBe(true);
//   if (loaded.ok) {
//     expect(loaded.value.messages[0]).toMatchObject({
//       type: "error",
//       file_name: "agent.js",
//       line_number: 7,
//       column_number: 3,
//     });
//   }
//   expect(manager.status(started.value.sessionId)?.messages[0]).toMatchObject({
//     file_name: "agent.js",
//     line_number: 7,
//     column_number: 3,
//   });
//
//   bindings.device.session.nextMessage = {
//     type: "error",
//     description: "location unavailable",
//     stack: "Error: location unavailable",
//   };
//   const withoutLocation = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "throw new Error('location unavailable');",
//   });
//   expect(withoutLocation.ok).toBe(true);
//   if (withoutLocation.ok) {
//     expect(withoutLocation.value.messages[0]).not.toHaveProperty("file_name");
//     expect(withoutLocation.value.messages[0]).not.toHaveProperty("line_number");
//     expect(withoutLocation.value.messages[0]).not.toHaveProperty(
//       "column_number",
//     );
//   }
//   await manager.closeAll();
// });
//
// it("does not carry earlier script truncation into a complete later load", async () => {
//   const { bindings, manager, started } = await startLocalAttachedSession();
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//
//   const first = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send('A');",
//   });
//   expect(first.ok).toBe(true);
//   if (!first.ok) return;
//   const firstScript = bindings.device.session.scripts[0];
//   expect(firstScript).toBeDefined();
//   if (firstScript === undefined) return;
//   for (let index = 0; index < 800; index += 1)
//     firstScript.message.emit(
//       { type: "send", payload: "x".repeat(32_700) },
//       null,
//     );
//
//   bindings.device.session.nextPayload = { tag: "B" };
//   const second = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send('B');",
//   });
//   expect(second.ok).toBe(true);
//   if (second.ok) {
//     expect(second.value.messages).toHaveLength(1);
//     expect(second.value.messagesTruncated).toBe(false);
//   }
//   expect(manager.status(started.value.sessionId)?.messagesTruncated).toBe(true);
//   await manager.closeAll();
// });
//
// it("reports truncation when that script loses its own message", async () => {
//   const { bindings, manager, started } = await startLocalAttachedSession();
//   const session = bindings.device.session;
//   expect(started.ok).toBe(true);
//   if (!started.ok) return;
//
//   session.nextPayload = { tag: "A" };
//   const first = await manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send({tag: 'A'});",
//   });
//   expect(first.ok).toBe(true);
//   if (!first.ok) return;
//
//   let finishSecondLoad: (() => void) | undefined;
//   let markSecondLoadStarted: (() => void) | undefined;
//   const secondLoadGate = new Promise<void>((resolve) => {
//     finishSecondLoad = resolve;
//   });
//   const secondLoadStarted = new Promise<void>((resolve) => {
//     markSecondLoadStarted = resolve;
//   });
//   session.nextPayload = { tag: "B2" };
//   session.scriptLoadGate = secondLoadGate;
//   session.onScriptLoadStarted = () => markSecondLoadStarted?.();
//   const secondLoading = manager.loadScript(started.value.sessionId, {
//     sourceKind: "inline",
//     source: "send({tag: 'B2'});",
//   });
//   await secondLoadStarted;
//   const secondScript = session.scripts[1];
//   expect(secondScript).toBeDefined();
//   if (secondScript === undefined) return;
//   secondScript.message.emit({ type: "send", payload: { tag: "B1" } }, null);
//
//   const firstScript = session.scripts[0];
//   expect(firstScript).toBeDefined();
//   if (firstScript === undefined) return;
//   for (let index = 0; index < 800; index += 1)
//     firstScript.message.emit(
//       { type: "send", payload: "x".repeat(32_700) },
//       null,
//     );
//
//   finishSecondLoad?.();
//   const second = await secondLoading;
//   expect(second.ok).toBe(true);
//   if (second.ok) {
//     expect(second.value.messages).toContainEqual(
//       expect.objectContaining({
//         script_id: second.value.scriptId,
//         payload: { tag: "B2" },
//       }),
//     );
//     expect(second.value.messagesTruncated).toBe(true);
//   }
//   expect(manager.status(started.value.sessionId)?.messagesTruncated).toBe(true);
//   expect(manager.status(started.value.sessionId)?.messages).toContainEqual(
//     expect.objectContaining({
//       script_id: second.ok ? second.value.scriptId : "",
//       payload: { tag: "B2" },
//     }),
//   );
//   await manager.closeAll();
// });
//
// it("retains the newest contiguous messages across repeated budget evictions", async () => {
//   const { bindings, manager, started } = await startLocalAttachedSession();
export const _l = 337;
