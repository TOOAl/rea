export const __stub = 1;
// import {
//   pwntoolsDecoderFailure,
//   pwntoolsUnavailable,
//   capturedPwntoolsOutput,
// } from "./PwntoolsFailures.js";
// import { randomUUID } from "node:crypto";
// import { access, stat, writeFile } from "node:fs/promises";
// import { constants } from "node:fs";
// import { isAbsolute, join } from "node:path";
// import { fileURLToPath } from "node:url";
// import { z } from "zod";
// import type { ExecutionOptions } from "../../application/AnalysisProvider.js";
// import type { ProviderIdentity } from "../../application/AnalysisProvider.js";
// import type {
//   AnalysisCapturedOutput,
//   AnalysisPartialObservation,
// } from "../../domain/analysisErrorBase.js";
// import { readStableArtifact } from "../../artifacts/readStableArtifact.js";
// import { ArtifactResourceScope } from "../../artifacts/ArtifactResourceScope.js";
// import { ArtifactReaderFailure } from "../../artifacts/ArtifactReader.js";
// import { AnalysisError } from "../../domain/analysisErrorBase.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisUnsupportedTargetError,
//   AnalysisInputError,
//   AnalysisOutputError,
//   AnalysisResourceConstraintError,
// } from "../../domain/analysisErrorCore.js";
// import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
// import { analysisErrorWithCleanupFailure } from "../../domain/analysisErrorCleanup.js";
// import { ProviderAdapterError } from "../../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../../domain/providerCleanupError.js";
// import { err, ok, type Result } from "../../domain/result.js";
// import {
//   ownedCommandResources,
//   runOwnedCommand,
// } from "../../process/OwnedCommand.js";
// import type {
//   ProviderProcessSupervisor,
//   OwnedProviderProcessSpawnOptions,
//   ProviderProcessSnapshot,
// } from "../../process/ProviderProcess.js";
// import { PendingOperations } from "../../process/PendingOperations.js";
// import {
//   pwntoolsResourceLimitsSchema,
//   readPwntoolsFailureEvidence,
// } from "./PwntoolsResourceLimits.js";
// import { PrivateRuntimeRoot } from "../../process/PrivateRuntimeRoot.js";
// import {
//   PWNTOOLS_PROVIDER_IDENTITY,
//   PWNTOOLS_LIMITS,
// } from "./PwntoolsRelease.js";
// import { pwntoolsInputBytes } from "./PwntoolsInputLimit.js";
//
// const HOST_REQUIREMENT =
//   "The initial real-verified pwntools artifact profile supports Linux x64 only.";
//
// /** Owned launcher seam shared by the offline pwntools artifact adapters. */
// export type PwntoolsLauncher = NonNullable<
//   Parameters<typeof runOwnedCommand>[2]
// >["launcher"];
// /** Owner-bound execution; replies and failure files are stable only after this settles without cleanup uncertainty. */
// export type PwntoolsCommand = (
//   spawn: OwnedProviderProcessSpawnOptions,
//   /** Project the original failure without reading files an unresolved worker may change. */
//   failure: (cause: unknown) => AnalysisError,
// ) => Promise<ProviderProcessSnapshot>;
// type DecoderReport = AnalysisPartialObservation & {
//   readonly diagnostics: AnalysisCapturedOutput;
// };
// /** Adapter-selected semantics around a shared owned pwntools process boundary. */
// export interface PwntoolsDecoderProfile<
//   Input extends { readonly path: string },
//   Payload,
//   Report extends DecoderReport,
// > {
//   readonly identity: ProviderIdentity;
//   readonly operation: string;
//   readonly bridge: URL;
//   readonly payloadSchema: z.ZodType<Payload>;
//   readonly project: (context: {
//     readonly input: Input;
//     readonly payload: Payload;
//     readonly snapshot: { readonly bytes: Buffer; readonly sha256: string };
//     readonly rootPath: string;
//     readonly resources: ArtifactResourceScope;
//     readonly diagnostics: AnalysisCapturedOutput;
//     readonly options: ExecutionOptions | undefined;
//     readonly runCommand: PwntoolsCommand;
//   }) => Report | Promise<Report>;
// }
//
// /** Thin owned-process adapter; all ELF parsing and heuristics come from unchanged upstream code. */
// export class PwntoolsDecoder<
//   Input extends { readonly path: string },
//   Payload,
//   Report extends DecoderReport,
// > {
//   readonly identity: ProviderIdentity;
//   #tail: Promise<void> = Promise.resolve();
//   readonly #admissions = new PendingOperations<
//     symbol,
//     "admitted" | "cancelled"
//   >();
//   readonly #resources = new ArtifactResourceScope();
//   #closing = false;
//   #closePromise: Promise<void> | undefined;
//   #pendingCleanup:
//     | {
//         root: Pick<PrivateRuntimeRoot, "path" | "close"> | undefined;
//         process: ProviderProcessSupervisor | undefined;
//         failure: AnalysisError | undefined;
//         diagnostics: AnalysisCapturedOutput | undefined;
//         observation: AnalysisPartialObservation | undefined;
//       }
//     | undefined;
//   constructor(
//     readonly profile: PwntoolsDecoderProfile<Input, Payload, Report>,
//     readonly environment: Readonly<NodeJS.ProcessEnv>,
//     readonly launcher?: PwntoolsLauncher,
//     readonly createRuntime: () => Promise<
//       Pick<PrivateRuntimeRoot, "path" | "close">
//     > = () => PrivateRuntimeRoot.create({ prefix: "rea-artifact-decoder-" }),
//   ) {
//     this.identity = profile.identity;
//   }
//
//   /** Snapshot one explicit artifact and return complete static observations without launching the selected object as a host process. */
//   inspect(
//     input: Input,
//     options?: ExecutionOptions,
//   ): Promise<Result<Report, AnalysisError>> {
//     return this.#enqueue(() => this.#inspect(input, options), options);
//   }
//
//   /** Finalize an admitted inspection before publishing its outcome; rejected admission acquires nothing and does not close the provider. */
//   inspectAndClose(
//     input: Input,
//     options?: ExecutionOptions,
//   ): Promise<Result<Report, AnalysisError>> {
//     return this.#enqueue(() => {
//       this.#closing = true;
//       return this.#inspect(input, options);
//     }, options);
//   }
//
//   #enqueue(
//     inspect: () => Promise<Result<Report, AnalysisError>>,
//     options?: ExecutionOptions,
//   ): Promise<Result<Report, AnalysisError>> {
//     if (options?.signal?.aborted)
//       return Promise.resolve(
//         err(new AnalysisCancelledError(this.profile.operation)),
//       );
//     if (this.#closing) return Promise.resolve(err(this.#closedError()));
//     const key = Symbol();
//     const admission = this.#admissions.wait(key, {
//       ...(options?.signal === undefined ? {} : { signal: options.signal }),
//       cancelledValue: () => "cancelled",
//     });
//     const operation = this.#tail.then(() => {
//       this.#admissions.settle(key, "admitted");
//       if (options?.signal?.aborted)
//         return err(new AnalysisCancelledError(this.profile.operation));
//       return this.#closing ? err(this.#closedError()) : inspect();
//     });
//     this.#tail = operation.then(
//       () => undefined,
//       () => undefined,
//     );
//     return admission.then((state) =>
export const _l = 172;
