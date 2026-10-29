export const __stub = 1;
// import { createHash, randomUUID } from "node:crypto";
// import { createReadStream } from "node:fs";
// import { stat as statPath } from "node:fs/promises";
// import type { Stats } from "node:fs";
//
// import {
//   AnalysisAccessDeniedError,
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
//   AnalysisResourceConstraintError,
//   AnalysisTimeoutError,
// } from "../../domain/analysisErrorCore.js";
// import type {
//   AnalysisCleanupObservation,
//   AnalysisError,
// } from "../../domain/analysisErrorBase.js";
// import { AnalysisOutputError } from "../../domain/analysisErrorCore.js";
// import { createEvidence, type Evidence } from "../../domain/evidence.js";
// import type { JsonValue } from "../../domain/jsonValue.js";
// import { err, ok, type Result } from "../../domain/result.js";
// import {
//   objdumpInputSchema,
//   rizinInputSchema,
// } from "../../domain/reverseEngineering.js";
// import type {
//   ReverseEngineeringCommandPort,
//   ReverseEngineeringProviderCommand,
// } from "./ReverseEngineeringCommandPort.js";
// import {
//   execFileOutput,
//   execFileOutputFailure,
// } from "../../process/ExecFileOutput.js";
// import {
//   OwnedCommandFailure,
//   runOwnedCommand,
// } from "../../process/OwnedCommand.js";
// import type { ProviderProcessSupervisor } from "../../process/ProviderProcess.js";
// import { absoluteCallerPath } from "../../filesystem/callerPath.js";
//
// export type ReverseEngineeringOperation =
//   | "inspect_with_objdump"
//   | "execute_rizin_command";
//
// const DEFAULT_TIMEOUT_MS = 120_000;
// const MAX_COMBINED_OUTPUT_BYTES = 16 * 1024 * 1024;
// // Eight concurrent captures bound retained provider output to 128 MiB.
// const MAX_CONCURRENT_REVERSE_ENGINEERING_OPERATIONS = 8;
//
// export interface ReverseEngineeringServiceOptions {
//   readonly environment?: Readonly<NodeJS.ProcessEnv>;
//   readonly commands: ReverseEngineeringCommandPort;
//   readonly run?: ReverseEngineeringCommandRunner;
//   readonly runOwned?: typeof runOwnedCommand;
//   readonly digest?: typeof digestFile;
//   readonly stat?: (path: string) => Promise<Stats>;
// }
//
// interface ReverseEngineeringCommandRunner {
//   (
//     command: string,
//     arguments_: readonly string[],
//     options?: Parameters<typeof execFileOutput>[2],
//   ): Promise<{
//     readonly stdout: string;
//     readonly stderr: string;
//     readonly stdoutInvalidUtf8?: boolean;
//     readonly stderrInvalidUtf8?: boolean;
//     readonly stdoutBytes?: number;
//     readonly stderrBytes?: number;
//   }>;
// }
//
// export type ReverseEngineeringServiceRuntimeOptions = Omit<
//   ReverseEngineeringServiceOptions,
//   "commands" | "environment"
// >;
//
// /** Shared application workflow for caller-selected local analysis commands. */
// export class ReverseEngineeringService {
//   readonly #environment: Readonly<NodeJS.ProcessEnv>;
//   readonly #commands: ReverseEngineeringCommandPort;
//   readonly #run: ReverseEngineeringCommandRunner;
//   readonly #digest: typeof digestFile;
//   readonly #stat: (path: string) => Promise<Stats>;
//   readonly #pendingCleanup = new Map<
//     ProviderProcessSupervisor,
//     {
//       readonly observation: AnalysisCleanupObservation;
//       readonly failures: Set<AnalysisError>;
//       readonly retryFailure?: AnalysisError;
//     }
//   >();
//   readonly #activeOperations = new Map<
//     AbortController,
//     Promise<Result<Evidence, AnalysisError>>
//   >();
//   #closing = false;
//   #closePromise: Promise<void> | undefined;
//
//   constructor(options: ReverseEngineeringServiceOptions) {
//     this.#environment = { ...(options.environment ?? process.env) };
//     this.#commands = options.commands;
//     this.#run =
//       options.run ??
//       runOwnedCommandOutput(
//         options.runOwned ?? runOwnedCommand,
//         (owner, cleanup) =>
//           this.#pendingCleanup.set(owner, {
//             observation: cleanup,
//             failures: this.#pendingCleanup.get(owner)?.failures ?? new Set(),
//           }),
//       );
//     this.#digest = options.digest ?? digestFile;
//     this.#stat = options.stat ?? statPath;
//   }
//
//   /** Ask retained process owners to settle cleanup before admitting more work. */
//   async retryCleanup(
//     operation = "reverse_engineering_cleanup",
//   ): Promise<Result<null, AnalysisError>> {
//     let failure: AnalysisError | undefined;
//     for (const [owner, retained] of this.#pendingCleanup) {
//       let stopped: Awaited<ReturnType<ProviderProcessSupervisor["stop"]>>;
//       try {
//         stopped = await owner.stop();
//       } catch (cause) {
//         stopped = {
//           status: "incomplete",
//           reason: cause instanceof Error ? cause.message : String(cause),
//         };
//       }
//       if (stopped.status === "incomplete") {
//         const observation = {
//           reason: stopped.reason,
//           resources: retained.observation.resources,
//         };
//         let retryFailure = retained.retryFailure;
//         if (retryFailure === undefined) {
//           retryFailure = new AnalysisOutputError(
//             operation,
//             "A previous provider process still requires cleanup.",
//             { cleanup: observation },
//           );
//           retained.failures.add(retryFailure);
//         }
//         this.#pendingCleanup.set(owner, {
//           observation,
//           failures: retained.failures,
//           retryFailure,
//         });
//         if (failure === undefined) failure = retryFailure;
//       } else {
//         for (const previous of retained.failures) previous.resolveCleanup();
//         this.#pendingCleanup.delete(owner);
//       }
//     }
//     return failure === undefined ? ok(null) : err(failure);
//   }
//
//   /** Retry cleanup for provider process groups retained after an incomplete stop. */
//   close(): Promise<void> {
//     this.#closing = true;
//     this.#closePromise ??= this.#closeActiveOperationsAndCleanup().catch(
//       (cause: unknown) => {
//         this.#closePromise = undefined;
//         throw cause;
//       },
//     );
//     return this.#closePromise;
//   }
//
//   async #closeActiveOperationsAndCleanup(): Promise<void> {
//     const active = [...this.#activeOperations.entries()];
//     for (const [controller] of active) controller.abort();
//     await Promise.allSettled(active.map(([, operation]) => operation));
//
//     const cleanup = await this.retryCleanup();
//     if (!cleanup.ok) throw cleanup.error;
//   }
//
//   inspectWithObjdump(
//     rawInput: unknown,
//     options: { readonly signal?: AbortSignal } = {},
//   ): Promise<Result<Evidence, AnalysisError>> {
//     const parsed = objdumpInputSchema.safeParse(rawInput);
//     if (!parsed.success)
//       return Promise.resolve(
//         err(new AnalysisInputError("inspect_with_objdump")),
//       );
//     const input = parsed.data;
//     const command = this.#commands.objdump(input);
//     return this.#observe(
//       "inspect_with_objdump",
//       command,
//       input.operation === "architectures" ? undefined : input.path,
//       input,
//       options.signal,
//     );
//   }
//
//   executeRizinCommand(
//     rawInput: unknown,
//     options: { readonly signal?: AbortSignal } = {},
//   ): Promise<Result<Evidence, AnalysisError>> {
//     const parsed = rizinInputSchema.safeParse(rawInput);
//     if (!parsed.success)
//       return Promise.resolve(
//         err(new AnalysisInputError("execute_rizin_command")),
//       );
//     const input = parsed.data;
//     const command = this.#commands.rizin(input);
//     return this.#observe(
//       "execute_rizin_command",
//       command,
//       input.path,
//       input,
//       options.signal,
//     );
//   }
//
//   #observe(
//     operation: ReverseEngineeringOperation,
//     profile: ReverseEngineeringProviderCommand,
//     path: string | undefined,
//     parameters: Readonly<Record<string, JsonValue>>,
//     signal?: AbortSignal,
//   ): Promise<Result<Evidence, AnalysisError>> {
//     if (signal?.aborted)
//       return Promise.resolve(err(new AnalysisCancelledError(operation)));
//     if (this.#closing)
//       return Promise.resolve(
//         err(
//           new AnalysisOutputError(
//             operation,
//             "Reverse-engineering service is closed.",
//           ),
//         ),
export const _l = 238;
