export const __stub = 1;
// import { EventEmitter } from "node:events";
//
// import { beforeEach, expect, it, vi } from "vitest";
//
// const mocks = vi.hoisted(() => ({
//   openBrowser: vi.fn(),
//   storage: undefined as
//     | {
//         initialize: ReturnType<typeof vi.fn>;
//         settle: ReturnType<typeof vi.fn>;
//         close: ReturnType<typeof vi.fn>;
//       }
//     | undefined,
//   finishEvents: vi.fn(),
//   policySend: vi.fn(),
//   policyTransportClose: vi.fn(),
//   policyEvent: undefined as
//     | ((event: { method: string; params: unknown; sessionId?: string }) => void)
//     | undefined,
// }));
//
// vi.mock("./CdpTargetSession.js", () => ({
//   openCdpEndpoint: async () => ({
//     discovery: { targets: [{ id: "target" }] },
//     connection: {
//       send: mocks.policySend,
//       onEvent: (listener: typeof mocks.policyEvent) => {
//         mocks.policyEvent = listener;
//         return () => undefined;
//       },
//       close: mocks.policyTransportClose,
//     },
//   }),
//   attachCdpTargetSession: async (connection: unknown) => ({
//     connection,
//     sessionId: "policy-session",
//   }),
// }));
//
// vi.mock("./PlaywrightScenarioBrowser.js", () => ({
//   openPlaywrightScenarioBrowser: mocks.openBrowser,
//   failBrowserScenarioOperation: async (
//     cleanup: () => Promise<void>,
//     cause: unknown,
//   ) => {
//     try {
//       await cleanup();
//     } catch (cleanupCause: unknown) {
//       throw new AggregateError([cause, cleanupCause]);
//     }
//     throw cause;
//   },
// }));
//
// vi.mock("./PlaywrightScenarioStorage.js", () => ({
//   PlaywrightScenarioStorage: {
//     create: vi.fn(async () => mocks.storage),
//   },
// }));
//
// vi.mock("./PlaywrightScenarioEvents.js", () => ({
//   PlaywrightScenarioEvents: class {
//     finish() {
//       mocks.finishEvents();
//     }
//
//     result() {
//       return {
//         retained: 0,
//         dropped: 0,
//         items: [],
//         omissions: {
//           by_kind: [],
//           network_transactions: [],
//           network_transaction_range: null,
//         },
//       };
//     }
//
//     limitations() {
//       return [];
//     }
//
//     setStep() {}
//
//     nextSequence() {
//       return 1;
//     }
//
//     lastSequence() {
//       return 0;
//     }
//   },
// }));
//
// import { browserScenarioSchema } from "../domain/browserScenario.js";
// import { PlaywrightScenarioSession } from "./PlaywrightScenarioSession.js";
//
// const scenario = browserScenarioSchema.parse({
//   browser: { mode: "launch", executable_path: process.execPath },
//   start_url: { url: "https://storage.example.test/" },
//   actions: [{ step_id: "wait", action: "wait_for_timeout", duration_ms: 1 }],
//   storage: {
//     local_storage: [
//       {
//         origin: "https://storage.example.test",
//         entries: [{ name: "seed", value: { source: "literal", value: "v" } }],
//       },
//     ],
//   },
// });
//
// const fixture = () => {
//   const page = Object.assign(new EventEmitter(), {
//     url: () => "about:blank",
//     goto: vi.fn(async () => undefined),
//     evaluate: vi.fn(async (_script: unknown): Promise<unknown> => null),
//     addInitScript: vi.fn(async (_script: unknown) => undefined),
//     context: () => context,
//     frames: () => [page],
//     mainFrame: () => page,
//     isDetached: () => false,
//     isClosed: (): boolean => false,
//     waitForLoadState: vi.fn(async () => undefined),
//   });
//   const context = Object.assign(new EventEmitter(), {
//     setDefaultTimeout: vi.fn(),
//     setDefaultNavigationTimeout: vi.fn(),
//     addCookies: vi.fn(async () => undefined),
//     browser: () => browser,
//   });
//   const browser = Object.assign(new EventEmitter(), {
//     version: () => "Chrome 154",
//   });
//   let browserClosed = false;
//   const close = vi.fn(async (finishEvents?: () => Promise<void>) => {
//     await finishEvents?.();
//     browserClosed = true;
//   });
//   const cleanup = {
//     close,
//     get browserClosed() {
//       return browserClosed;
//     },
//   };
//   mocks.openBrowser.mockResolvedValue({
//     page,
//     context,
//     browser,
//     cleanup,
//     profilePath: "/tmp/profile",
//   });
//   mocks.storage = {
//     initialize: vi.fn(async () => undefined),
//     settle: vi.fn(async () => undefined),
//     close: vi.fn(async (stopLoading = false) => ({
//       loadingStopped: stopLoading,
//     })),
//   };
//   return { cleanup, page, storage: mocks.storage };
// };
//
// const policyResponse = (method: string): unknown =>
//   method === "Page.addScriptToEvaluateOnNewDocument"
//     ? { identifier: "owned-policy-script" }
//     : method === "Runtime.evaluate"
//       ? { result: { value: null } }
//       : {};
//
// beforeEach(() => {
//   vi.clearAllMocks();
//   mocks.policySend.mockReset();
//   mocks.policyTransportClose.mockReset();
//   mocks.policyEvent = undefined;
//   mocks.policySend.mockImplementation(async (method: string) =>
//     policyResponse(method),
//   );
//   mocks.policyTransportClose.mockResolvedValue(undefined);
// });
//
// it("stops attached navigation without storage and retries rejected policy cleanup", async () => {
//   const { cleanup } = fixture();
//   mocks.storage = undefined;
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//     storage: {},
//   });
//   const session = await PlaywrightScenarioSession.open(attached, {}, {});
//   const failure = new Error("stopLoading rejected");
//   mocks.policySend.mockRejectedValueOnce(failure);
//   await expect(session.close(true)).rejects.toBe(failure);
//   expect(cleanup.close).not.toHaveBeenCalled();
//   await expect(session.close(true)).resolves.toBe("disconnected-external");
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Page.stopLoading",
//     ),
//   ).toHaveLength(2);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("assigns attached navigation stopping to the storage owner once", async () => {
//   const { cleanup, storage } = fixture();
//   const attached = browserScenarioSchema.parse({
//     ...scenario,
//     browser: {
//       mode: "connect",
//       cdp_endpoint: "http://127.0.0.1:9222",
//       target_id: "target",
//     },
//     environment: { service_workers: "block" },
//   });
//   const session = await PlaywrightScenarioSession.open(attached, {}, {});
//
//   await expect(session.close(true)).resolves.toBe("disconnected-external");
//   expect(storage?.close).toHaveBeenCalledWith(true);
//   expect(
//     mocks.policySend.mock.calls.filter(
//       ([method]) => method === "Page.stopLoading",
//     ),
//   ).toHaveLength(0);
//   expect(cleanup.close).toHaveBeenCalledTimes(1);
// });
//
// it("transfers attached navigation stopping after storage cleanup fails", async () => {
//   const { cleanup, storage } = fixture();
//   const storageFailure = new Error("storage stop unconfirmed");
//   storage?.close.mockRejectedValueOnce(storageFailure);
//   const policyFailure = new Error("policy stop unconfirmed");
//   const attached = browserScenarioSchema.parse({
export const _l = 236;
