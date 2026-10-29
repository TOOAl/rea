export const __stub = 1;
//     expect(bindings.removedRemote).toEqual([]);
//
//     // A lookup could now select a different device with the same PID. Cleanup
//     // must use the original provider handle, not select the target again.
//     const replacement = new FakeDevice();
//     bindings.getDeviceById = async () => replacement;
//     bindings.addRemoteDevice = async () => replacement;
//     await Promise.all([manager.closeAll(), manager.closeAll()]);
//     expect(bindings.device.resumed).toEqual([512]);
//     expect(replacement.resumed).toEqual([]);
//     expect(bindings.removedRemote).toEqual(["127.0.0.1:27042"]);
//     await manager.closeAll();
//     expect(bindings.device.resumed).toEqual([512]);
//     expect(bindings.removedRemote).toEqual(["127.0.0.1:27042"]);
//   });
//
//   it("retains an acquired session when startup fails before registration", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.session.detached.connect = () => {
//       throw new Error("detached signal registration failed");
//     };
//     bindings.device.session.detachFailureCount = 1;
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//     });
//     if (started.ok)
//       throw new Error("Signal registration unexpectedly succeeded");
//     expect(started.error.cleanupIncomplete).toBe(true);
//     expect(bindings.device.session.isDetached()).toBe(false);
//     expect(bindings.device.resumed).toEqual([]);
//
//     await manager.closeAll();
//     expect(bindings.device.session.isDetached()).toBe(true);
//     expect(bindings.device.resumed).toEqual([512]);
//   });
//
//   it("does not release another session's remote lease when retrying failed startup removal", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.attach = async () => {
//       throw new Error("attach failed");
//     };
//     bindings.removeRemoteFailureCount = 1;
//     const remote = { address: "127.0.0.1:27042" };
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const failed = await manager.startSession({
//       mode: "spawn",
//       remote,
//       program: "/tmp/fixture",
//     });
//     if (failed.ok) throw new Error("Attach unexpectedly succeeded");
//     expect(failed.error.cleanupIncomplete).toBe(true);
//     expect(bindings.device.resumed).toEqual([512]);
//
//     bindings.device.attach = async () => bindings.device.session;
//     const active = await manager.startSession({
//       mode: "attach",
//       remote,
//       pid: 512,
//     });
//     if (!active.ok) throw active.error;
//     const removedWhileSessionAttached: boolean[] = [];
//     const remove = bindings.removeRemoteDevice.bind(bindings);
//     bindings.removeRemoteDevice = async (address) => {
//       removedWhileSessionAttached.push(!bindings.device.session.isDetached());
//       await remove(address);
//     };
//
//     await manager.closeAll();
//     expect(removedWhileSessionAttached).toEqual([false]);
//     expect(bindings.removedRemote).toEqual([remote.address]);
//     expect(bindings.device.resumed).toEqual([512]);
//   });
//
//   it("loads instrumentation before resuming a spawned target", async () => {
//     const bindings = new FakeDeviceManager();
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//
//     const started = await manager.startSession({
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     expect(started.value.state).toBe("paused");
//     expect(bindings.device.resumed).toEqual([]);
//
//     const loaded = await manager.loadScript(started.value.sessionId, {
//       sourceKind: "inline",
//       source: "send({ event: 'loaded' });",
//     });
//     expect(loaded.ok).toBe(true);
//     if (!loaded.ok) return;
//     expect(loaded.value.messages).toContainEqual(
//       expect.objectContaining({
//         type: "send",
//         payload: { event: "loaded" },
//       }),
//     );
//     expect(loaded.value.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);
//     expect(bindings.device.resumed).toEqual([]);
//
//     const resumed = await manager.resumeSession(started.value.sessionId);
//     expect(resumed.ok).toBe(true);
//     expect(bindings.device.resumed).toEqual([512]);
//     expect(manager.status(started.value.sessionId)?.targetResumeObserved).toBe(
//       true,
//     );
//     expect(manager.status(started.value.sessionId)?.state).toBe("running");
//     await manager.closeAll();
//     expect(bindings.device.session.isDetached()).toBe(true);
//   });
//
//   it("removes a remote device after process discovery", async () => {
//     const bindings = new FakeDeviceManager();
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "attach",
//       remote: { address: "127.0.0.1:27042", token: "secret-token" },
//       pid: 512,
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     const listed = await manager.listProcesses({
//       remote: { address: "127.0.0.1:27042", token: "secret-token" },
//     });
//
//     expect(listed.ok).toBe(true);
//     if (listed.ok) {
//       expect(listed.value.processes[0]?.pid).toBe(512);
//       expect(listed.value.cleanupError).toBeNull();
//     }
//     expect(bindings.removedRemote).toEqual([]);
//     await manager.closeSession(started.value.sessionId);
//     expect(bindings.removedRemote).toEqual(["127.0.0.1:27042"]);
//     await manager.closeAll();
//   });
//
//   it("preserves remote discovery facts when cleanup fails and retries cleanup", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.removeRemoteFailureCount = 1;
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const listed = await manager.listProcesses({
//       remote: { address: "127.0.0.1:27042" },
//     });
//     expect(listed.ok).toBe(true);
//     if (listed.ok) {
//       expect(listed.value.processes).toEqual([
//         { pid: 512, name: "fixture", identifier: null },
//       ]);
//       expect(listed.value.cleanupError).toContain(
//         "remote device removal failed",
//       );
//     }
//     await manager.closeAll();
//     expect(bindings.removedRemote).toEqual(["127.0.0.1:27042"]);
//   });
//
//   it("does not expose remote credentials in shutdown cleanup failures", async () => {
//     const token = "synthetic-close-token";
//     const certificate = "synthetic-close-certificate";
//     const bindings = new FakeDeviceManager();
//     bindings.removeRemoteFailureCount = 2;
//     bindings.removeRemoteFailureMessage = `${token} ${certificate}`;
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "attach",
//       remote: { address: "127.0.0.1:27042", token, certificate },
//       pid: 512,
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     let failure = "";
//     try {
//       await manager.closeAll();
//     } catch (cause: unknown) {
//       failure =
//         cause instanceof AggregateError
//           ? cause.errors.map((entry: unknown) => String(entry)).join("; ")
//           : String(cause);
//     }
//     expect(failure).not.toBe("");
//     expect(failure).not.toContain(token);
//     expect(failure).not.toContain(certificate);
//   });
//
//   it("unloads scripts, resumes a paused spawn, and detaches without killing it", async () => {
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
//     const closed = await manager.closeSession(started.value.sessionId);
//     expect(closed.ok).toBe(true);
//     expect(bindings.device.session.scripts[0]?.isDestroyed).toBe(true);
//     expect(bindings.device.resumed).toEqual([512]);
//     expect(bindings.device.session.isDetached()).toBe(true);
//   });
//
//   it("retains a failed script handle until a later cleanup retry releases it", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.session.nextLoadFailure = new Error("script load failed");
//     bindings.device.session.nextUnloadFailureCount = 1;
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "attach",
//       deviceId: "local",
//       pid: 512,
//     });
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//
//     const loaded = await manager.loadScript(started.value.sessionId, {
//       sourceKind: "inline",
//       source: "send('ready');",
//     });
//
//     expect(loaded.ok).toBe(false);
//     if (!loaded.ok) expect(loaded.error.cleanupIncomplete).toBe(true);
//     expect(manager.status(started.value.sessionId)?.scripts).toHaveLength(1);
//     expect(bindings.device.session.scripts[0]?.unloadCalls).toBe(1);
//
//     const closed = await manager.closeSession(started.value.sessionId);
//
//     expect(closed.ok).toBe(true);
//     expect(bindings.device.session.scripts[0]?.unloadCalls).toBe(2);
//     expect(bindings.device.session.scripts[0]?.isDestroyed).toBe(true);
//     expect(manager.status(started.value.sessionId)).toBeUndefined();
//   });
//
//   it("closes a session when its target already destroyed the script", async () => {
//     const { bindings, manager, started } = await startLocalAttachedSession();
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
//     script.isDestroyed = true;
//     bindings.device.session.markDetached();
//
//     const closed = await manager.closeSession(started.value.sessionId);
//
//     expect(closed.ok).toBe(true);
//     expect(script.unloadCalls).toBe(0);
//     expect(manager.status(started.value.sessionId)).toBeUndefined();
//   });
//
//   it("does not resume a paused spawn after its parent session detached", async () => {
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
//     bindings.device.session.markDetachedWithoutSignal();
//
//     const closed = await manager.closeSession(started.value.sessionId);
//
//     expect(closed.ok).toBe(true);
//     expect(bindings.device.resumed).toEqual([]);
//     expect(manager.status(started.value.sessionId)).toBeUndefined();
//   });
//
//   it("uses successful parent-session detach to release a script after unload fails", async () => {
//     const { bindings, manager, started } = await startLocalAttachedSession();
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
//
//     const closed = await manager.closeSession(started.value.sessionId);
//
//     expect(closed.ok).toBe(true);
//     expect(script.isDestroyed).toBe(true);
//     expect(manager.status(started.value.sessionId)).toBeUndefined();
//   });
//
//   it("keeps a paused spawn paused when script unload and session detach fail", async () => {
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
export const _l = 337;
