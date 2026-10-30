export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import type {
//   Device,
//   DeviceManager,
//   FridaMessage,
//   Process,
//   Script,
//   Session,
//   Signal,
// } from "frida";
// import { AnalysisInputError } from "../../domain/analysisErrorCore.js";
// import { FridaInstrumentationManager } from "../../frida/FridaInstrumentationManager.js";
//
// const signal = <Handler extends (...args: never[]) => void>() => {
//   let connected: Handler | undefined;
//   const value: Signal<Handler> & {
//     emit: (...args: Parameters<Handler>) => void;
//   } = {
//     connect: (handler) => {
//       connected = handler;
//     },
//     disconnect: (handler) => {
//       if (connected === handler) connected = undefined;
//     },
//     emit: (...args) => connected?.(...args),
//   };
//   return value;
// };
//
// class FakeScript implements Script {
//   readonly message =
//     signal<(message: FridaMessage, data: Buffer | null) => void>();
//   isDestroyed = false;
//   loadFailure: Error | undefined;
//   unloadFailureCount = 0;
//   unloadCalls = 0;
//
//   constructor(
//     readonly payload: unknown = { event: "loaded" },
//     readonly beforeLoad: () => Promise<void> = async () => {},
//     readonly description = "script loaded",
//     readonly stack = "",
//     readonly messageValue?: FridaMessage,
//   ) {}
//
//   async load(): Promise<void> {
//     await this.beforeLoad();
//     if (this.loadFailure !== undefined) throw this.loadFailure;
//     this.message.emit(
//       this.messageValue ?? {
//         type: "send",
//         payload: this.payload,
//         description: this.description,
//         stack: this.stack,
//       },
//       null,
//     );
//   }
//
//   async unload(): Promise<void> {
//     this.unloadCalls += 1;
//     if (this.unloadFailureCount > 0) {
//       this.unloadFailureCount -= 1;
//       throw new Error("script unload failed");
//     }
//     if (this.isDestroyed) throw new Error("Script is destroyed");
//     this.isDestroyed = true;
//   }
// }
//
// class FakeSession implements Session {
//   readonly detached = signal<() => void>();
//   readonly scripts: FakeScript[] = [];
//   nextPayload: unknown = { event: "loaded" };
//   nextDescription = "script loaded";
//   nextStack = "";
//   nextMessage: FridaMessage | undefined;
//   nextLoadFailure: Error | undefined;
//   nextUnloadFailureCount = 0;
//   detachFailureCount = 0;
//   scriptLoadGate: Promise<void> | undefined;
//   onScriptLoadStarted: (() => void) | undefined;
//   private detachedState = false;
//   readonly pid = 512;
//
//   isDetached(): boolean {
//     return this.detachedState;
//   }
//
//   async createScript(): Promise<Script> {
//     const script = new FakeScript(
//       this.nextPayload,
//       async () => {
//         this.onScriptLoadStarted?.();
//         await this.scriptLoadGate;
//       },
//       this.nextDescription,
//       this.nextStack,
//       this.nextMessage,
//     );
//     script.loadFailure = this.nextLoadFailure;
//     script.unloadFailureCount = this.nextUnloadFailureCount;
//     this.nextPayload = { event: "loaded" };
//     this.nextDescription = "script loaded";
//     this.nextStack = "";
//     this.nextMessage = undefined;
//     this.nextLoadFailure = undefined;
//     this.nextUnloadFailureCount = 0;
//     this.scripts.push(script);
//     return script;
//   }
//
//   async detach(): Promise<void> {
//     if (this.detachFailureCount > 0) {
//       this.detachFailureCount -= 1;
//       throw new Error("session detach failed");
//     }
//     for (const script of this.scripts) script.isDestroyed = true;
//     this.markDetached();
//   }
//
//   markDetached(): void {
//     this.detachedState = true;
//     this.detached.emit();
//   }
//
//   markDetachedWithoutSignal(): void {
//     this.detachedState = true;
//   }
// }
//
// class FakeDevice implements Device {
//   readonly id = "local";
//   readonly name = "Local System";
//   readonly type = "local";
//   readonly process = { pid: 512, name: "fixture" } satisfies Process;
//   readonly session = new FakeSession();
//   resumed: number[] = [];
//   attachedTargets: Array<number | string> = [];
//   resumeFailureCount = 0;
//   readonly spawned: string[] = [];
//
//   async enumerateProcesses(): Promise<Process[]> {
//     return [this.process];
//   }
//
//   async getProcessByPid(): Promise<Process> {
//     return this.process;
//   }
//
//   async spawn(program: string): Promise<number> {
//     this.spawned.push(program);
//     return this.process.pid;
//   }
//
//   async resume(pid: number): Promise<void> {
//     if (this.resumeFailureCount > 0) {
//       this.resumeFailureCount -= 1;
//       throw new Error("target resume failed");
//     }
//     this.resumed.push(pid);
//   }
//
//   async attach(target: number | string): Promise<Session> {
//     this.attachedTargets.push(target);
//     return this.session;
//   }
// }
//
// class FakeDeviceManager implements DeviceManager {
//   readonly device = new FakeDevice();
//   removedRemote: string[] = [];
//   removeRemoteFailureCount = 0;
//   removeRemoteFailureMessage = "remote device removal failed";
//
//   async enumerateDevices(): Promise<Device[]> {
//     return [this.device];
//   }
//
//   async getDeviceById(): Promise<Device> {
//     return this.device;
//   }
//
//   async addRemoteDevice(): Promise<Device> {
//     return this.device;
//   }
//
//   async removeRemoteDevice(address: string): Promise<void> {
//     if (this.removeRemoteFailureCount > 0) {
//       this.removeRemoteFailureCount -= 1;
//       throw new Error(this.removeRemoteFailureMessage);
//     }
//     this.removedRemote.push(address);
//   }
// }
//
// const startLocalAttachedSession = async (
//   bindings = new FakeDeviceManager(),
// ) => {
//   const manager = new FridaInstrumentationManager({ deviceManager: bindings });
//   const started = await manager.startSession({
//     mode: "attach",
//     deviceId: "local",
//     pid: 512,
//   });
//   return { bindings, manager, started };
// };
//
// // eslint-disable-next-line max-lines-per-function -- related manager lifecycle cases share the same focused fake provider.
// describe("FridaInstrumentationManager", () => {
//   it("attaches by PID when Frida omits the target from process lookup", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.getProcessByPid = async () => {
//       throw new Error("Process not found");
//     };
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
//     expect(started.value.pid).toBe(512);
//     expect(bindings.device.attachedTargets).toEqual([512]);
//     expect(started.value.target).toBe("pid 512");
//     expect(bindings.device.session.isDetached()).toBe(false);
//     await manager.closeAll();
//     expect(bindings.device.session.isDetached()).toBe(true);
//   });
//
//   it("keeps the caller PID when Frida resolves a different process", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.getProcessByPid = async () => ({
//       ...bindings.device.process,
//       pid: 513,
//     });
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
//     expect(started.value.pid).toBe(512);
//     expect(started.value.target).toBe("fixture (pid 512)");
//     expect(bindings.device.attachedTargets).toEqual([512]);
//     await manager.closeSession(started.value.sessionId);
//   });
//
//   it("records a session already detached during process metadata lookup", async () => {
//     const bindings = new FakeDeviceManager();
//     let lookupStarted!: () => void;
//     const lookupEntered = new Promise<void>((resolve) => {
//       lookupStarted = resolve;
//     });
//     let finishLookup!: () => void;
//     const lookupGate = new Promise<void>((resolve) => {
//       finishLookup = resolve;
//     });
//     bindings.device.getProcessByPid = async () => {
//       lookupStarted();
//       await lookupGate;
//       return bindings.device.process;
//     };
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const starting = manager.startSession({
//       mode: "attach",
//       deviceId: "local",
//       pid: 512,
//     });
//     await lookupEntered;
//     bindings.device.session.markDetached();
//     finishLookup();
//
//     const started = await starting;
//     expect(started.ok).toBe(true);
//     if (!started.ok) return;
//     expect(started.value.pid).toBe(512);
//     expect(bindings.device.attachedTargets).toEqual([512]);
//     expect(started.value.state).toBe("detached");
//     expect(manager.status(started.value.sessionId)?.state).toBe("detached");
//     await manager.closeSession(started.value.sessionId);
//   });
//
//   it("still reports a real attach failure when process lookup is unavailable", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.getProcessByPid = async () => {
//       throw new Error("Process not found");
//     };
//     bindings.device.attach = async () => {
//       throw new Error("attach denied");
//     };
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//     const started = await manager.startSession({
//       mode: "attach",
//       deviceId: "local",
//       pid: 512,
//     });
//     expect(started.ok).toBe(false);
//     if (started.ok) return;
//     expect(JSON.stringify(started.error)).toContain("attach denied");
//     await manager.closeAll();
//   });
//
//   it("retains a failed startup's spawn and remote lease until cleanup succeeds", async () => {
//     const bindings = new FakeDeviceManager();
//     bindings.device.attach = async () => {
//       throw new Error("attach failed after spawn");
//     };
//     bindings.device.resumeFailureCount = 2;
//     const manager = new FridaInstrumentationManager({
//       deviceManager: bindings,
//     });
//
//     const started = await manager.startSession({
//       mode: "spawn",
//       remote: { address: "127.0.0.1:27042" },
//       program: "/tmp/fixture",
//     });
//     if (started.ok) throw new Error("Attach unexpectedly succeeded");
//     expect(started.error.cleanupIncomplete).toBe(true);
//     expect(bindings.device.resumed).toEqual([]);
//     expect(bindings.removedRemote).toEqual([]);
//
//     await expect(manager.closeAll()).rejects.toThrow("cleanup was incomplete");
//     expect(bindings.device.resumed).toEqual([]);
export const _l = 337;
