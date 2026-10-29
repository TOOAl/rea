export const __stub = 1;
// import { z } from "zod";
//
// import {
//   createAnalysisExecution,
//   type AnalysisClient,
//   type AnalysisExecution,
//   type AnalysisOperation,
//   type ExecutionOptions,
// } from "../application/AnalysisProvider.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import {
//   AnalysisCancelledError,
//   AnalysisCapabilityUnavailableError,
//   AnalysisInputError,
//   AnalysisResourceConstraintError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
// import type { AnalysisProfileCommitment } from "../domain/analysisProfile.js";
// import {
//   analysisSearchPredicate,
//   analysisSearchQuerySchema,
// } from "../domain/analysisSearch.js";
// import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
// import type { EvidenceLocation } from "../domain/evidence.js";
// import { combineFunctionRelationshipCoverage } from "../domain/functionCallCoverage.js";
// import { functionDossierSchema } from "../domain/hopperValues.js";
// import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";
// import type { JsonValue } from "../domain/jsonValue.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import type { RelationshipCoverage } from "../domain/relationshipCoverage.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import { ProviderCleanupError } from "../domain/providerCleanupError.js";
// import { err, ok, type Result } from "../domain/result.js";
// import { ABORTED, waitForAbortable } from "../process/AbortablePromise.js";
// import {
//   KUNA_INVENTORY_OUTPUT_BYTES,
//   type KunaProcessLauncher,
// } from "./KunaCommand.js";
// import {
//   inspectKunaInstallation,
//   type KunaInstallation,
// } from "./KunaInstallation.js";
// import {
//   kunaProjectKey,
//   type KunaProject,
//   type KunaProjectCache,
// } from "./KunaProjectCache.js";
// import type { KunaExportStatus } from "./KunaProjectExport.js";
// import {
//   parseKunaInventory,
//   type KunaInventoryFunction,
// } from "./KunaProjectFiles.js";
// import {
//   isKunaOperation,
//   KUNA_RELATIONSHIP_LIMITATION,
//   KUNA_SINGLE_FUNCTION_LIMITATION,
//   kunaLimitations,
//   type KunaOperation,
// } from "./KunaProviderCapabilities.js";
// import { KUNA_PROVIDER_ID } from "./KunaRelease.js";
// import { KunaTargetCommands } from "./KunaTargetCommands.js";
// import { KunaReferenceQueries } from "./KunaReferenceQueries.js";
// import { KunaQueryWork } from "./KunaQueryWork.js";
// import { KunaStringQueries } from "./KunaStringQueries.js";
// import { normalizeKunaAddress } from "./KunaAddress.js";
// import { KUNA_FUNCTION_TEXT_BYTES } from "./KunaLimits.js";
// import type { KunaRunRelease, KunaRunSlots } from "./KunaRunSlots.js";
// import {
//   KunaProjectReader,
//   type KunaProjectFileSpan,
// } from "./KunaProjectReader.js";
// import { kunaUnavailable } from "./KunaUnavailable.js";
//
// /** How often a request waiting on the project export reports that it still waits. */
// const WAIT_PROGRESS_INTERVAL_MS = 10_000;
//
// /** Where one answer's text came from, recorded in its raw result. */
// type AnswerSource =
//   | { readonly kind: "project-export"; readonly project: KunaProject }
//   | { readonly kind: "single-function" };
//
// interface InventoryIndex {
//   readonly inventory: readonly KunaInventoryFunction[];
//   readonly byAddress: ReadonlyMap<string, KunaInventoryFunction>;
//   readonly byName: ReadonlyMap<string, readonly KunaInventoryFunction[]>;
// }
//
// /** A queued single-function request found the export finished first. */
// const EXPORT_READY = Symbol("kuna-export-ready");
//
// type SingleFunctionOutcome =
//   | Result<string, AnalysisError>
//   | typeof EXPORT_READY;
//
// /** One single-function run that every request for its address shares. */
// interface SingleFunctionRun {
//   readonly outcome: Promise<SingleFunctionOutcome>;
//   /** Stops the run once every waiter has left. */
//   readonly controller: AbortController;
//   waiters: number;
// }
//
// /**
//  * Completed single-function texts a session keeps while it has no export
//  * reader. Each repeat would otherwise analyze the whole image again; after a
//  * failed export that holds for the rest of the session.
//  */
// const SINGLE_FUNCTION_TEXT_CACHE_BYTES = 16 * 1024 * 1024;
// /** Charged per kept text beside its UTF-8 bytes. */
// const SINGLE_FUNCTION_TEXT_ENTRY_BYTES = 256;
//
// interface SingleFunctionText {
//   readonly text: string;
//   readonly bytes: number;
// }
//
// interface Answer {
//   readonly result: JsonValue;
//   readonly source: AnswerSource | null;
//   readonly files?: readonly KunaProjectFileSpan[];
//   readonly locations: readonly EvidenceLocation[];
//   readonly limitations: readonly string[];
//   readonly referenceSource?: JsonValue;
//   readonly stringSource?: JsonValue;
//   readonly relationshipCoverage?: RelationshipCoverage;
// }
//
// /**
//  * Wait for work this session owns, stopping only this caller's wait when its
//  * signal aborts; the work itself continues for other callers.
//  */
// const waitFor = async <T>(
//   work: Promise<Result<T, AnalysisError>>,
//   signal: AbortSignal | undefined,
//   operation: string,
// ): Promise<Result<T, AnalysisError>> => {
//   const result = await waitForAbortable(work, signal);
//   return result === ABORTED
//     ? err(new AnalysisCancelledError(operation))
//     : result;
// };
//
// /** A file the adopted export named is gone, e.g. evicted by another REA process. */
// const isMissing = (cause: unknown): boolean =>
//   cause instanceof Error &&
//   "code" in cause &&
//   (cause.code === "ENOENT" || cause.code === "ENOTDIR");
//
// /** Read through a call so a check before an await does not narrow later ones. */
// const cancelled = (signal: AbortSignal | undefined): boolean =>
//   signal?.aborted === true;
//
// const message = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
//
// const failure = (operation: string, cause: unknown): AnalysisError =>
//   cause instanceof AnalysisError
//     ? cause
//     : new ProviderAdapterError(KUNA_PROVIDER_ID, operation, {
//         cause,
//         userMessage: `Kuna ${operation} failed: ${message(cause)}`,
//       });
//
// /**
//  * How a request that needs the export reports the export's failure. A session
//  * never rebuilds a failed export, so repeating the request cannot succeed; the
//  * error says what to change before reopening the target. Kuna settings are read
//  * when REA starts, so changing one also needs a restart. Cancellation and
//  * unproven cleanup keep their own errors, which callers must still observe.
//  */
// const exportUnavailable = (
//   operation: string,
//   failure: AnalysisError,
// ): AnalysisError => {
//   if (failure instanceof AnalysisCancelledError || failure.cleanupIncomplete)
//     return failure;
//   const reason = failure.userMessage ?? failure.message;
//   const exported = projectAnalysisError(failure);
//   const restart =
//     "REA reads Kuna settings when it starts, so restart REA, then reopen the target.";
//   const next =
//     failure instanceof AnalysisTimeoutError
//       ? `To retry, set REA_KUNA_PROJECT_TIMEOUT_MS above ${String(failure.timeoutMs)} ms or raise REA_KUNA_JOBS in the environment that starts REA. ${restart}`
//       : failure instanceof AnalysisResourceConstraintError &&
//           failure.remediationAction !== undefined
//         ? // A fixed buffer (`memory`) is no setting, so a restart cannot help.
//           `${failure.remediationAction.replace(/\.?$/u, ".")}${failure.resource === "memory" ? "" : ` ${restart}`}`
//         : "To retry, resolve the reported failure, then reopen the target.";
//   return new AnalysisCapabilityUnavailableError(
//     KUNA_PROVIDER_ID,
//     operation,
//     reason,
//     {
//       cause: failure,
//       // Callers see only the top-level projection, so the export failure's
//       // own projected code and details (its limits, target path, captured
//       // output and diagnostics) travel whole rather than field by field.
//       diagnostics: {
//         export_error: failure._tag,
//         export_code: exported.code,
//         ...(exported.details === undefined
//           ? {}
//           : { export_details: exported.details }),
//       },
//       userMessage: `Kuna's project export failed, so ${operation} is unavailable in this session: ${reason.replace(/\.?$/u, ".")} ${next}`,
//     },
//   );
// };
//
// /** Kuna names a procedure by its inventory entry or by an exact entry address. */
// const procedureSelectorSchema = z.string().min(1);
//
// /**
//  * One Kuna analysis session for one target.
//  *
//  * Reads come from the verified project export in REA's cache. Until that
//  * export exists, listings use the inventory the export takes first and
//  * pseudocode a single-function `kuna decompile`, while the export builds in
//  * the background; assembly waits for it. Kuna always runs on a private copy
//  * whose digest matches the selected target.
//  */
// export class KunaSessionClient implements AnalysisClient {
//   readonly #target: BinaryTarget;
//   readonly #profile: AnalysisProfileCommitment | undefined;
//   readonly #cache: KunaProjectCache;
//   readonly #environment: Readonly<NodeJS.ProcessEnv>;
//   readonly #runSlots: KunaRunSlots;
//   /** Single-function runs in flight, by entry address. */
//   readonly #singleFunctionRuns = new Map<string, SingleFunctionRun>();
//   /** Completed single-function texts by address, least recently used first. */
//   readonly #singleFunctionTexts = new Map<string, SingleFunctionText>();
//   #singleFunctionTextBytes = 0;
//   /** Owns background work: aborting it cancels this session's export interest. */
//   readonly #session = new AbortController();
//   /** Requests and shared readers retain their resources until their work settles. */
//   readonly #active = new Set<Promise<unknown>>();
//   readonly #commands: KunaTargetCommands;
//   readonly #queryWork: KunaQueryWork;
//   readonly #references: KunaReferenceQueries;
//   readonly #strings: KunaStringQueries;
//   #installation: Promise<Result<KunaInstallation, AnalysisError>> | undefined;
//   #inventory:
//     | Promise<Result<readonly KunaInventoryFunction[], AnalysisError>>
//     | undefined;
//   #project: Promise<Result<KunaProject, AnalysisError>> | undefined;
//   /** The cache lookup that decides #project, shared by concurrent first requests. */
//   #starting: Promise<void> | undefined;
//   /** The building export's inventory; undefined when it settles without one. */
//   #exportInventory:
//     | Promise<readonly KunaInventoryFunction[] | undefined>
//     | undefined;
//   #reader: KunaProjectReader | undefined;
//   #inventoryIndex: InventoryIndex | undefined;
//   #status: KunaExportStatus | undefined;
//   #key: string | undefined;
//   #exportFailure: string | undefined;
//   #releasePin: (() => void) | undefined;
//   /** Set once close starts; new requests are refused from then on. */
//   #closing = false;
//   /** Set only when close has released every owned resource. */
//   #closed = false;
//
//   constructor(
//     target: BinaryTarget,
//     profile: AnalysisProfileCommitment | undefined,
//     dependencies: {
//       readonly cache: KunaProjectCache;
//       readonly runSlots: KunaRunSlots;
//       readonly environment: Readonly<NodeJS.ProcessEnv>;
//       readonly launcher?: KunaProcessLauncher;
//     },
//   ) {
//     this.#target = target;
//     this.#profile = profile;
//     this.#cache = dependencies.cache;
//     this.#runSlots = dependencies.runSlots;
//     this.#environment = dependencies.environment;
//     this.#commands = new KunaTargetCommands(target, {
//       signal: this.#session.signal,
//       ...(dependencies.launcher === undefined
//         ? {}
//         : { launcher: dependencies.launcher }),
//     });
//     this.#queryWork = new KunaQueryWork(this.#commands, {
//       signal: this.#session.signal,
//       own: (work) => this.#own(work),
//       runSlots: dependencies.runSlots,
//     });
//     this.#references = new KunaReferenceQueries(this.#queryWork);
//     this.#strings = new KunaStringQueries(this.#queryWork);
//   }
//
//   async execute(
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options: ExecutionOptions = {},
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     if (this.#closing)
//       return err(kunaUnavailable(operation, "This Kuna session is closed."));
//     return this.#own(
//       this.#execute(operation, parameters, {
//         ...options,
//         signal:
//           options.signal === undefined
//             ? this.#session.signal
//             : AbortSignal.any([this.#session.signal, options.signal]),
//       }),
//     );
//   }
//
//   #own<T>(work: Promise<T>): Promise<T> {
//     this.#active.add(work);
//     const release = () => this.#active.delete(work);
//     void work.then(release, release);
//     return work;
//   }
//
//   async #execute(
//     operation: AnalysisOperation,
//     parameters: Readonly<Record<string, JsonValue>>,
//     options: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     if (cancelled(options.signal))
//       return err(new AnalysisCancelledError(operation));
//     if (operation !== "health" && !isKunaOperation(operation))
//       return err(
//         kunaUnavailable(
//           operation,
//           "Kuna answers procedure and string queries, pseudocode, assembly and references; this operation needs another provider.",
//         ),
//       );
//     const document = parameters.document;
//     if (document !== undefined && document !== this.#target.path)
//       return err(
//         new AnalysisInputError(
//           operation,
//           {
//             userMessage:
//               "A Kuna session analyzes one program; omit document or pass the selected target path.",
//           },
//           [
//             {
//               path: ["document"],
//               reason: "invalid_value",
//               expected: this.#target.path,
//             },
//           ],
//         ),
//       );
//     const installation = await this.#ensureInstallation();
//     if (!installation.ok) return installation;
//     try {
//       if (operation === "health")
//         return ok(
//           this.#execution([], installation.value, {
//             result: {
//               ready: true,
//               kuna: {
//                 version: installation.value.version,
//                 verified: installation.value.verified,
//                 sha256: installation.value.sha256,
//               },
//             },
//             source: null,
//             locations: [],
//             limitations: [],
//           }),
//         );
//       if (
//         operation === "procedure_pseudo_code" ||
//         operation === "procedure_assembly" ||
//         operation === "analyze_function"
//       )
export const _l = 373;
