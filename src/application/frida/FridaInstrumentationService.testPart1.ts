export const __stub = 1;
// import { tmpdir } from "node:os";
// import { join } from "node:path";
//
// import { expect, it } from "vitest";
//
// import { FridaScriptLoadCancelledError } from "./FridaInstrumentationPort.js";
// import type { FridaInstrumentationPort } from "./FridaInstrumentationPort.js";
// import { FridaInstrumentationService } from "./FridaInstrumentationService.js";
// import {
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
// } from "../../domain/analysisErrorCore.js";
//
// const createSession = () => ({
//   sessionId: "00000000-0000-4000-8000-000000000001",
//   deviceId: "local",
//   target: "fixture",
//   pid: 10,
//   mode: "spawn" as const,
//   state: "paused" as const,
// });
//
// const createScriptObservation = () => ({
//   scriptId: "00000000-0000-4000-8000-000000000002",
//   sourceKind: "inline" as const,
//   sourcePath: null,
//   sourceSha256: "a".repeat(64),
//   messages: [],
//   messagesTruncated: false,
// });
//
// const createProvider = (
//   overrides: Partial<FridaInstrumentationPort> = {},
// ): FridaInstrumentationPort => ({
//   async listDevices() {
//     return { ok: true, value: { devices: [], cleanupError: null } };
//   },
//   async listProcesses() {
//     return {
//       ok: true,
//       value: { deviceId: "local", processes: [], cleanupError: null },
//     };
//   },
//   async startSession() {
//     return { ok: true, value: createSession() };
//   },
//   async loadScript() {
//     return { ok: true, value: createScriptObservation() };
//   },
//   async resumeSession() {
//     return { ok: true, value: null };
//   },
//   async unloadScript() {
//     return { ok: true, value: null };
//   },
//   status() {
//     return undefined;
//   },
//   async closeSession() {
//     return { ok: true, value: { targetResumeObserved: false } };
//   },
//   async closeAll() {},
//   ...overrides,
// });
//
// it.each(["startSession", "instrument"] as const)(
//   "does not start Frida when %s receives an already-cancelled signal",
//   async (method) => {
//     let starts = 0;
//     let loads = 0;
//     const provider = createProvider({
//       async startSession() {
//         starts += 1;
//         return { ok: true, value: createSession() };
//       },
//       async loadScript() {
//         loads += 1;
//         return { ok: true, value: createScriptObservation() };
//       },
//     });
//     const service = new FridaInstrumentationService(provider);
//     const controller = new AbortController();
//     controller.abort(new Error("cancelled before call"));
//
//     const result =
//       method === "startSession"
//         ? await service.startSession(
//             { mode: "spawn", deviceId: "local", program: "/tmp/fixture" },
//             controller.signal,
//           )
//         : await service.instrument(
//             {
//               mode: "spawn",
//               deviceId: "local",
//               program: "/tmp/fixture",
//               source: { sourceKind: "inline", source: "send('ready');" },
//               durationMs: 1,
//             },
//             controller.signal,
//           );
//
//     expect(result.ok).toBe(false);
//     if (!result.ok) expect(result.error._tag).toBe("AnalysisCancelledError");
//     expect(starts).toBe(0);
//     expect(loads).toBe(0);
//   },
// );
//
// it.each([
//   [join(tmpdir(), "rea-missing-frida-script.js"), "no file exists there"],
//   [tmpdir(), "it is not a regular file"],
// ])(
//   "rejects the unreadable script file %s before starting Frida",
//   async (path, reason) => {
//     let starts = 0;
//     const provider = createProvider({
//       async startSession() {
//         starts += 1;
//         return { ok: true, value: createSession() };
//       },
//     });
//     const service = new FridaInstrumentationService(provider);
//
//     const result = await service.instrument({
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//       source: { sourceKind: "file", path },
//       durationMs: 1,
//     });
//
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     expect(result.error).toBeInstanceOf(AnalysisInputError);
//     expect((result.error as AnalysisInputError).issues).toEqual([
//       {
//         path: ["path"],
//         reason: "invalid_value",
//         message: `Cannot read Frida script file ${path}: ${reason}.`,
//       },
//     ]);
//     expect(starts).toBe(0);
//   },
// );
//
// it("reports cancellation before checking a file script source", async () => {
//   const service = new FridaInstrumentationService(createProvider());
//   const controller = new AbortController();
//   controller.abort(new Error("cancelled before call"));
//
//   const result = await service.instrument(
//     {
//       mode: "spawn",
//       deviceId: "local",
//       program: "/tmp/fixture",
//       source: {
//         sourceKind: "file",
//         path: join(tmpdir(), "rea-missing-frida-script.js"),
//       },
//       durationMs: 1,
//     },
export const _l = 161;
