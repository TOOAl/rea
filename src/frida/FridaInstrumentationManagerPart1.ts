export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import { readFile } from "node:fs/promises";
//
// import type {
//   Device,
//   DeviceManager,
//   FridaMessage,
//   RemoteDeviceOptions,
//   Script,
//   Session,
// } from "frida";
//
// import type {
//   FridaDeviceObservation,
//   FridaDeviceSelector,
//   FridaInstrumentationPort,
//   FridaProcessObservation,
//   FridaRemoteConnection,
//   FridaScriptObservation,
//   FridaScriptSource,
//   FridaSessionObservation,
//   FridaSessionStatus,
//   StartFridaSessionInput,
// } from "../application/frida/FridaInstrumentationPort.js";
// import { FridaScriptLoadCancelledError } from "../application/frida/FridaInstrumentationPort.js";
// import type { OptionalProviderLoadFailure } from "../application/OptionalObservationProviders.js";
// import {
//   AnalysisAccessDeniedError,
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
// } from "../domain/analysisErrorCore.js";
// import type { AnalysisError } from "../domain/analysisErrorBase.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   unknownFridaScript,
//   unknownFridaSession,
// } from "../application/frida/fridaInputErrors.js";
//
// const MAX_SESSION_CAPTURE_BYTES = 16 * 1024 * 1024;
// const MAX_MESSAGE_METADATA_BYTES = 128 * 1024;
// const MAX_MESSAGE_TYPE_BYTES = 4 * 1024;
// const MAX_MESSAGE_TEXT_BYTES = 32 * 1024;
// // Bound the in-memory object graph as well as its serialized JSON byte size.
// const MAX_CAPTURE_JSON_NODES = 250_000;
// const MAX_BINARY_MESSAGE_BYTES = Math.floor(
//   ((MAX_SESSION_CAPTURE_BYTES - 1024 * 1024) * 3) / 4,
// );
// const DEVICE_LOOKUP_TIMEOUT_MS = 1_000;
//
// export const FRIDA_PROVIDER_IDENTITY = {
//   id: "frida",
//   name: "Frida",
//   version: null,
// } as const;
//
// interface ManagedScript {
//   readonly id: string;
//   readonly name: string;
//   readonly script: Script;
//   readonly onMessage: (message: FridaMessage, data: Buffer | null) => void;
//   state: "active" | "cleanup-pending" | "released";
// }
//
// interface ManagedRemoteConnection {
//   readonly deviceManager: DeviceManager;
//   readonly remote: FridaRemoteConnection | undefined;
//   remoteReferenceHeld: boolean;
//   remoteRemovalPending: boolean;
// }
//
// interface PendingStartupCleanup extends ManagedRemoteConnection {
//   readonly id: string;
//   readonly device: Device;
//   spawnedPid: number | undefined;
//   session: Session | undefined;
// }
//
// interface ManagedSession extends ManagedRemoteConnection {
//   readonly id: string;
//   readonly device: Device;
//   readonly session: Session;
//   readonly target: string;
//   readonly pid: number;
//   readonly mode: "attach" | "spawn";
//   readonly scripts: Map<string, ManagedScript>;
//   readonly messages: MessageFifo<CapturedMessage>;
//   readonly messagesByScript: Map<string, MessageFifo<JsonValue>>;
//   state: "paused" | "running" | "detached";
//   targetResumeObserved: boolean;
//   resumeAfterDetachPending: boolean;
//   capturedBytes: number;
//   messagesTruncated: boolean;
//   readonly truncatedScripts: Set<string>;
// }
//
// export interface FridaInstrumentationManagerOptions {
//   readonly deviceManager?: DeviceManager;
//   readonly deviceManagerLoader?: () => Promise<DeviceManager>;
// }
//
// /** Owns Frida sessions and their scripts without owning target process lifetime. */
// export class FridaInstrumentationManager implements FridaInstrumentationPort {
//   readonly #sessions = new Map<string, ManagedSession>();
//   readonly #pendingStartups = new Set<PendingStartupCleanup>();
//   readonly #sessionQueues = new Map<string, Promise<void>>();
//   readonly #sessionClosures = new Map<
//     string,
//     Promise<Result<{ readonly targetResumeObserved: boolean }, AnalysisError>>
//   >();
//   readonly #remoteDevices = new Map<
//     string,
//     { references: number; optionsDigest: string; device: Promise<Device> }
//   >();
//   readonly #remoteQueues = new Map<string, Promise<void>>();
//   readonly #deviceManagerLoader: () => Promise<DeviceManager>;
//   #deviceManager: DeviceManager | undefined;
//   #deviceManagerLoading: Promise<DeviceManager> | undefined;
//   #availabilityFailure: OptionalProviderLoadFailure | undefined;
//   readonly #operations = new Set<Promise<unknown>>();
//   #closing = false;
//   #closeAllPromise: Promise<void> | undefined;
//
//   constructor(options: FridaInstrumentationManagerOptions = {}) {
//     this.#deviceManager = options.deviceManager;
//     this.#deviceManagerLoader =
//       options.deviceManagerLoader ??
//       (async () => (await import("frida")).getDeviceManager());
//   }
//
//   availabilityFailure(): OptionalProviderLoadFailure | undefined {
//     return this.#availabilityFailure;
//   }
//
//   listDevices(remote?: FridaRemoteConnection) {
//     return this.#withOperation("list_frida_devices", () =>
//       this.#listDevices(remote),
//     );
//   }
//
//   async #listDevices(remote?: FridaRemoteConnection): Promise<
//     Result<
//       {
//         readonly devices: readonly FridaDeviceObservation[];
//         readonly cleanupError: string | null;
//       },
//       AnalysisError
//     >
//   > {
//     let manager: DeviceManager | undefined;
//     let remoteHeld = false;
//     try {
//       manager = await this.#getDeviceManager();
//       if (remote !== undefined) {
//         await this.#retainRemote(manager, remote);
//         remoteHeld = true;
//       }
//       const devices = await manager.enumerateDevices();
//       let cleanupError: string | null = null;
//       if (manager !== undefined && remoteHeld && remote !== undefined) {
//         try {
//           await this.#releaseRemote(manager, remote.address);
//           remoteHeld = false;
//         } catch (cause: unknown) {
//           cleanupError = sanitizeError(cause, remote);
//         }
//       }
//       return ok({
//         devices: devices.map((device) => ({
//           deviceId: device.id,
//           name: device.name,
//           type: device.type,
//         })),
//         cleanupError,
//       });
//     } catch (cause: unknown) {
//       let cleanupError: string | undefined;
//       if (manager !== undefined && remoteHeld && remote !== undefined) {
//         try {
//           await this.#releaseRemote(manager, remote.address);
//         } catch (cleanupCause: unknown) {
//           cleanupError = sanitizeError(cleanupCause, remote);
//         }
//       }
//       return err(
//         providerError("list_frida_devices", cause, remote, cleanupError),
//       );
//     }
//   }
//
//   listProcesses(selector: FridaDeviceSelector) {
//     return this.#withOperation("list_frida_processes", () =>
//       this.#listProcesses(selector),
//     );
//   }
//
//   async #listProcesses(selector: FridaDeviceSelector): Promise<
//     Result<
//       {
//         readonly deviceId: string;
//         readonly processes: readonly FridaProcessObservation[];
//         readonly cleanupError: string | null;
//       },
//       AnalysisError
//     >
//   > {
//     let manager: DeviceManager | undefined;
//     let remoteHeld = false;
//     try {
//       manager = await this.#getDeviceManager();
//       const device = await this.#selectDevice(manager, selector);
//       remoteHeld = selector.remote !== undefined;
//       const processes = await device.enumerateProcesses();
//       let cleanupError: string | null = null;
//       if (remoteHeld && selector.remote !== undefined) {
//         try {
//           await this.#releaseRemote(manager, selector.remote.address);
//           remoteHeld = false;
//         } catch (cause: unknown) {
//           cleanupError = sanitizeError(cause, selector.remote);
//         }
//       }
//       return ok({
//         deviceId: device.id,
//         processes: processes.map((process) => ({
//           pid: process.pid,
//           name: process.name,
//           identifier: null,
//         })),
//         cleanupError,
//       });
//     } catch (cause: unknown) {
//       let cleanupError: string | undefined;
//       if (
//         manager !== undefined &&
//         remoteHeld &&
//         selector.remote !== undefined
//       ) {
//         try {
//           await this.#releaseRemote(manager, selector.remote.address);
//         } catch (cleanupCause: unknown) {
//           cleanupError = sanitizeError(cleanupCause, selector.remote);
//         }
//       }
//       return err(
//         providerError(
//           "list_frida_processes",
//           cause,
//           selector.remote,
//           cleanupError,
//         ),
//       );
//     }
//   }
//
//   startSession(input: StartFridaSessionInput) {
//     return this.#withOperation("start_frida_session", () =>
//       this.#startSession(input),
//     );
//   }
//
//   async #startSession(
//     input: StartFridaSessionInput,
//   ): Promise<Result<FridaSessionObservation, AnalysisError>> {
//     let manager: DeviceManager | undefined;
//     let device: Device | undefined;
//     let remoteHeld = false;
//     let spawnedPid: number | undefined;
//     let session: Session | undefined;
//     try {
//       manager = await this.#getDeviceManager();
//       device = await this.#selectDevice(manager, input);
//       remoteHeld = input.remote !== undefined;
//       let pid: number;
//       let target: string;
//       if (input.mode === "attach") {
//         pid = input.pid;
//         target = `pid ${pid}`;
//         try {
//           const process = await device.getProcessByPid(pid);
//           target = `${process.name} (pid ${pid})`;
//         } catch {
//           // Frida can attach to processes absent from its enumeration snapshot.
//         }
//       } else {
//         pid = await device.spawn(
//           input.program,
//           input.argv === undefined
//             ? undefined
//             : { argv: [input.program, ...input.argv] },
//         );
//         spawnedPid = pid;
//         target = input.program;
//       }
//       session = await device.attach(pid);
//       const id = randomUUID();
//       const managed: ManagedSession = {
//         id,
//         device,
//         deviceManager: manager,
//         remote: input.remote,
//         remoteReferenceHeld: remoteHeld,
//         remoteRemovalPending: false,
//         session,
//         target,
//         pid,
//         mode: input.mode,
//         scripts: new Map(),
//         messages: new MessageFifo(),
//         messagesByScript: new Map(),
//         state: input.mode === "spawn" ? "paused" : "running",
//         targetResumeObserved: false,
//         resumeAfterDetachPending: false,
//         capturedBytes: 0,
//         messagesTruncated: false,
//         truncatedScripts: new Set(),
//       };
//       session.detached.connect(() => {
//         managed.state = "detached";
//       });
//       // A target can exit while metadata lookup/attach is pending, before
//       // Frida installs this listener. Subscribe first, then reconcile the
//       // current provider state so an already-emitted detach is not lost.
//       if (session.isDetached()) managed.state = "detached";
//       this.#sessions.set(id, managed);
//       return ok(sessionObservation(managed));
//     } catch (cause: unknown) {
//       let cleanupFailures: readonly string[] = [];
//       if (
//         manager !== undefined &&
//         device !== undefined &&
//         (spawnedPid !== undefined || session !== undefined || remoteHeld)
//       ) {
//         const pending: PendingStartupCleanup = {
//           id: randomUUID(),
//           device,
//           deviceManager: manager,
//           remote: input.remote,
//           remoteReferenceHeld: remoteHeld,
//           remoteRemovalPending: false,
//           spawnedPid,
//           session,
//         };
//         // Keep the original provider handles until every acquired resource is
//         // released, including failures before a session can be registered.
//         this.#pendingStartups.add(pending);
//         cleanupFailures = await this.#cleanupStartup(pending);
//       }
//       return err(
//         providerError(
//           "start_frida_session",
//           cause,
//           input.remote,
//           cleanupFailures.join("; ") || undefined,
//         ),
//       );
//     }
//   }
//
//   loadScript(
//     sessionId: string,
//     source: FridaScriptSource,
//     signal?: AbortSignal,
//   ): Promise<Result<FridaScriptObservation, AnalysisError>> {
//     return this.#withOperation(
//       "load_frida_script",
//       () =>
//         this.#withSessionLock(sessionId, () =>
//           this.#loadScript(sessionId, source, signal),
//         ),
//       signal,
//     );
//   }
//
//   async #loadScript(
//     sessionId: string,
export const _l = 377;
