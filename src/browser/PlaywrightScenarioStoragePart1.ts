export const __stub = 1;
// import { randomUUID } from "node:crypto";
//
// import { z } from "zod";
// import type { BrowserContext, CDPSession, Page } from "playwright-core";
//
// import type { BrowserScenario } from "../domain/browserScenario.js";
// import { BrowserObservationError } from "../domain/browserObservationError.js";
// import type { BrowserScenarioSecrets } from "./BrowserScenarioSecrets.js";
// import { withPlaywrightExecutionBoundary } from "./PlaywrightExecutionBoundary.js";
//
// const breakpointResponse = z.object({ breakpointId: z.string() });
// const scriptIdentifierResponse = z.object({ identifier: z.string() });
// const storageKeyResponse = z.object({ storageKey: z.string() });
// const targetInfoResponse = z.object({
//   targetInfo: z.object({ targetId: z.string() }),
// });
// type StorageEventMethod =
//   | "Runtime.executionContextCreated"
//   | "Runtime.executionContextDestroyed"
//   | "Runtime.executionContextsCleared"
//   | "Debugger.scriptParsed"
//   | "Debugger.paused"
//   | "Target.attachedToTarget"
//   | "Target.detachedFromTarget"
//   | "Target.receivedMessageFromTarget";
// const STORAGE_EVENT_METHODS = new Set<string>([
//   "Runtime.executionContextCreated",
//   "Runtime.executionContextDestroyed",
//   "Runtime.executionContextsCleared",
//   "Debugger.scriptParsed",
//   "Debugger.paused",
//   "Target.attachedToTarget",
//   "Target.detachedFromTarget",
//   "Target.receivedMessageFromTarget",
// ]);
// const attachedTargetEvent = z.object({
//   sessionId: z.string(),
//   targetInfo: z.object({ type: z.string(), targetId: z.string() }),
// });
// const targetSessionEvent = z.object({ sessionId: z.string() });
// const nestedMessageEvent = z.object({
//   sessionId: z.string(),
//   message: z.string(),
// });
// const nestedProtocolMessage = z.object({
//   id: z.number().optional(),
//   method: z.string().optional(),
//   params: z.unknown().optional(),
//   result: z.unknown().optional(),
//   error: z.object({ message: z.string() }).optional(),
// });
// const executionContextEvent = z.object({
//   context: z.object({
//     id: z.number(),
//     origin: z.string(),
//     name: z.string(),
//     auxData: z.object({ frameId: z.string().optional() }).optional(),
//   }),
// });
// const scriptParsedEvent = z.object({
//   scriptId: z.string(),
//   executionContextId: z.number(),
//   url: z.string(),
// });
// const pausedEvent = z.object({
//   callFrames: z.array(
//     z.object({
//       callFrameId: z.string(),
//       location: z.object({ scriptId: z.string() }),
//     }),
//   ),
// });
// const evaluationResponse = z.object({
//   exceptionDetails: z.unknown().optional(),
// });
// const STORAGE_CLEANUP_TIMEOUT_MS = 1_000;
//
// type StorageSeed = {
//   local: [string, string][];
//   session: [string, string][];
// };
//
// interface StorageTarget {
//   readonly parentId: string | undefined;
//   readonly topLevelTargetId: string;
//   readonly send: (
//     method: string,
//     params?: Record<string, unknown>,
//   ) => Promise<unknown>;
//   readonly contexts: Map<
//     number,
//     z.infer<typeof executionContextEvent>["context"]
//   >;
//   readonly scripts: Map<string, number>;
//   ready: Promise<void>;
//   waitingForDebugger: boolean;
// }
//
// type PendingReply = {
//   readonly sessionId: string;
//   readonly resolve: (value: unknown) => void;
//   readonly reject: (error: Error) => void;
// };
// type StorageInstallationOptions = {
//   readonly signal?: AbortSignal;
//   readonly retainCleanup?: (close: () => Promise<unknown>) => void;
// };
// type StoragePage = { readonly context: BrowserContext; readonly page: Page };
// export type PlaywrightScenarioStorageCleanup = {
//   readonly loadingStopped: boolean;
// };
//
// /** Owns pre-script storage seeding and its CDP instrumentation for one scenario. */
// export class PlaywrightScenarioStorage {
//   readonly #seeds = new Map<string, StorageSeed>();
//   readonly #initializedLocal = new Set<string>();
//   readonly #initializedSession = new Set<string>();
//   readonly #targets = new Map<string, StorageTarget>();
//   readonly #replies = new Map<number, PendingReply>();
//   readonly #sourceUrl = `rea-storage-${randomUUID()}`;
//   readonly #listeners: {
//     readonly method: StorageEventMethod;
//     readonly listener: (params: unknown) => void;
//   }[] = [];
//   #sequence = 0;
//   #generation = 0;
//   #closed = false;
//   #cleanupCompleted = false;
//   #loadingStopped = false;
//   #failure: BrowserObservationError | undefined;
//   #closePromise: Promise<PlaywrightScenarioStorageCleanup> | undefined;
//   #detachPromise: Promise<void> | undefined;
//   #rootInitialization: Promise<void> | undefined;
//   #work: Promise<void> = Promise.resolve();
//   #removeListeners: () => void = () => undefined;
//
//   private constructor(
//     private readonly cdp: CDPSession,
//     private readonly signal: AbortSignal | undefined,
//   ) {}
//
//   static async create(
//     storagePage: StoragePage,
//     scenario: BrowserScenario,
//     secrets: BrowserScenarioSecrets,
//     options: StorageInstallationOptions = {},
//   ): Promise<PlaywrightScenarioStorage | undefined> {
//     const { signal, retainCleanup } = options;
//     const { context, page } = storagePage;
//     if (
//       scenario.storage.local_storage.length === 0 &&
//       scenario.storage.session_storage.length === 0
//     )
//       return undefined;
//
//     const connection = context.newCDPSession(page);
//     let cdp: CDPSession;
//     try {
//       cdp = await withPlaywrightExecutionBoundary(
//         () => connection,
//         undefined,
//         signal,
//       );
//     } catch (cause: unknown) {
//       if (signal?.aborted === true) {
//         let detached = false;
//         const lateCleanup = async (): Promise<void> => {
//           let session: CDPSession;
//           try {
//             session = await connection;
//           } catch {
//             return;
//           }
export const _l = 173;
