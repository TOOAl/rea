export const __stub = 1;
// import { randomUUID } from "node:crypto";
//
// import type { BinaryTarget } from "../../domain/binaryTargetTypes.js";
// import {
//   analysisProfilesEqual,
//   type AnalysisProfileCommitment,
// } from "../../domain/analysisProfile.js";
// import {
//   AnalysisCancelledError,
//   AnalysisOutputError,
// } from "../../domain/analysisErrorCore.js";
// import type { AnalysisError } from "../../domain/analysisErrorBase.js";
// import { err, ok, type Result } from "../../domain/result.js";
// import type { JsonValue } from "../../domain/jsonValue.js";
// import { createEvidence } from "../../domain/evidence.js";
// import type {
//   AnalysisClient,
//   AnalysisExecution,
//   ExecutionOptions,
//   AnalysisOperationPort,
//   ProviderIdentity,
// } from "../AnalysisProvider.js";
// import type { AnalysisOperation } from "../AnalysisProvider.js";
// import { OFFICIAL_TOOL_CONTRACTS } from "../../contracts/officialToolContracts.js";
// import { ENHANCED_TOOL_CONTRACTS } from "../../contracts/enhancedToolContracts.js";
// import type {
//   BinarySessionPort,
//   SavedAnalysisSnapshot,
// } from "./BinarySessionPort.js";
// import {
//   SessionProviderRouter,
//   type SessionProviderRoute,
// } from "./SessionProviderRouter.js";
// import { InvestigationRecords } from "../investigation/InvestigationRecords.js";
// import { BinarySessionRecords } from "./BinarySessionRecords.js";
// import { binarySessionStatus } from "./BinarySessionStatus.js";
// import {
//   resolveSessionOpen,
//   resolveSessionTarget,
//   validateResolvedSessionTarget,
//   type BinarySessionOpenOptions,
//   type ResolvedSessionOpen,
// } from "./BinarySessionOpen.js";
// import {
//   bindExecutionTarget,
//   commitExecutionProfile,
//   prepareSessionExecution,
// } from "./BinarySessionExecution.js";
// import { closeAnalysisClient } from "./AnalysisClientCleanup.js";
// import { analysisErrorWithCleanupFailure } from "../../domain/analysisErrorCleanup.js";
// const OFFICIAL_OPERATIONS: ReadonlySet<string> = new Set(
//   OFFICIAL_TOOL_CONTRACTS.map(({ name }) => name),
// );
// const ENHANCED_OPERATIONS: ReadonlySet<string> = new Set(
//   ENHANCED_TOOL_CONTRACTS.map(({ name }) => name),
// );
//
// interface SessionBinding {
//   readonly target: BinaryTarget;
//   readonly client: AnalysisClient;
//   readonly profile: AnalysisProfileCommitment | null;
//   readonly route: SessionProviderRoute;
//   readonly runId: string;
//   nativeSourceAdmitted: boolean;
// }
//
// /**
//  * Owns the single active target shared by CLI and MCP adapters.
//  *
//  * Target transitions are serialized because switching targets tears down the
//  * active provider client. A failed switch recreates the previous target instead
//  * of retaining a client whose resources were already shut down.
//  */
// export class BinarySession
//   extends BinarySessionRecords
//   implements BinarySessionPort
// {
//   #active: SessionBinding | undefined;
//   #externalMutationCleanupFailure: AnalysisError | undefined;
//   #pendingCleanup:
//     | {
//         readonly client: AnalysisClient;
//         readonly providerId: string;
//         readonly retainDocument: boolean;
//       }
//     | undefined;
//   #transition: Promise<void> = Promise.resolve();
//   #transitionGeneration = 0;
//   #transitionPending = 0;
//   readonly #calls = new Map<Promise<unknown>, number>();
//   readonly #promptCompletionControllers = new Set<AbortController>();
//   readonly #providerRouter: SessionProviderRouter;
//   readonly #runtimeUnavailability = new Map<
//     string,
//     { readonly reason: string }
//   >();
//   readonly #availabilityListeners = new Set<() => void | Promise<void>>();
//
//   constructor(
//     providerRouter: SessionProviderRouter,
//     records: InvestigationRecords = new InvestigationRecords(),
//   ) {
//     super(records);
//     this.#providerRouter = providerRouter;
//   }
//
//   /**
//    * Fast-path liveness gate (#1719): short-circuit only when the retained
//    * client is genuinely alive. The probe reads the child's operation health
//    * rather than the composite's unconditionally-ok `health`, so a dead child
//    * falls through and a real client is started; an aborted caller leaves the
//    * session untouched. Returns the fast-path result, or undefined to fall
//    * through to the slow path.
//    */
//   async #tryRetainedFastPath(
//     retained: SessionBinding,
//     target: BinaryTarget,
//     options: Pick<BinarySessionOpenOptions, "signal" | "snapshot">,
//   ): Promise<Result<BinaryTarget, AnalysisError> | undefined> {
//     const live = await this.#retainedClientLive(retained.client, options);
//     if (isAborted(options.signal))
//       return err(new AnalysisCancelledError("open_binary"));
//     if (!live) return undefined;
//     if (options.snapshot !== undefined) {
//       const imported = this.importAnalysisSnapshot(options.snapshot);
//       if (!imported.ok) return imported;
//     }
//     return ok(target);
//   }
//
//   /** Identify the provider producing evidence for this session. */
//   providerIdentity(operation?: AnalysisOperation): ProviderIdentity {
//     const route = this.#currentRoute();
//     let selected = route.binding?.identity ?? route.identity;
//     if (operation !== undefined) {
//       const exact = route.capabilities.get(operation)?.provider;
//       if (exact !== undefined) selected = exact;
//       else if (ENHANCED_OPERATIONS.has(operation)) {
//         const providers = new Map<string, ProviderIdentity>();
//         for (const descriptor of route.capabilities.values())
//           if (
//             descriptor.available &&
//             OFFICIAL_OPERATIONS.has(descriptor.operation)
//           )
//             providers.set(descriptor.provider.id, descriptor.provider);
//         if (providers.size === 1) {
//           const provider = providers.values().next().value;
//           if (provider !== undefined) selected = provider;
//         }
//       }
//     }
//     return structuredClone(selected);
//   }
//
//   /** External live state cannot be replayed by a direct or composed CLI workflow. */
//   allowsSnapshotReplay(operation: AnalysisOperation): boolean {
//     const capabilities = this.#active?.route.capabilities;
//     const descriptor = capabilities?.get(operation);
//     if (descriptor !== undefined) return descriptor.cachePolicy !== "live";
//     return ![...(capabilities?.values() ?? [])].some(
//       ({ cachePolicy }) => cachePolicy === "live",
//     );
//   }
//
//   invalidateSnapshotForExternalMutation(): void {
//     this.invalidateSnapshot();
//   }
//
//   /** Return the selected immutable profile, optionally scoped to an operation. */
//   analysisProfile(
//     operation?: AnalysisOperation,
//   ): AnalysisProfileCommitment | undefined {
//     const profile = this.#active?.profile;
//     if (profile === null || profile === undefined) return undefined;
//     if (
//       operation !== undefined &&
//       this.providerIdentity(operation).id !== profile.provider.id
//     )
//       return undefined;
//     return structuredClone(profile);
//   }
//
//   /** Observe runtime provider-health changes that affect discovery metadata. */
//   onAvailabilityChanged(listener: () => void | Promise<void>): () => void {
//     this.#availabilityListeners.add(listener);
//     return () => this.#availabilityListeners.delete(listener);
//   }
//
//   /** Resolve a target and provider profile without creating a provider client. */
//   previewTarget(
//     target: BinaryTarget,
//     options: BinarySessionOpenOptions = {},
//   ): Promise<Result<ResolvedSessionOpen, AnalysisError>> {
//     if (isAborted(options.signal))
//       return Promise.resolve(err(new AnalysisCancelledError("open_binary")));
//     return resolveSessionTarget({
//       router: this.#providerRouter,
//       current: this.#active,
//       target,
//       options,
//       stagedSnapshotMatches: (target, profile) =>
//         this.matchesSnapshot(target, profile),
//     }).then((resolved) =>
//       isAborted(options.signal)
//         ? err(new AnalysisCancelledError("open_binary"))
//         : resolved,
//     );
//   }
//
//   /**
//    * Open or switch targets after draining calls against the current target.
//    * Returns the switch failure even if best-effort restoration also fails.
//    */
//   open(
//     path: string,
//     options: BinarySessionOpenOptions = {},
//   ): Promise<Result<BinaryTarget, AnalysisError>> {
//     return this.#open(
//       (admitted) =>
//         resolveSessionOpen({
//           router: this.#providerRouter,
//           current: this.#active,
//           path,
//           options: admitted,
//           stagedSnapshotMatches: (target, profile) =>
//             this.matchesSnapshot(target, profile),
//         }),
//       options,
//     );
//   }
//
//   /** Open a previewed target without repeating parsing or provider profile discovery. */
//   openResolvedTarget(
//     resolved: Pick<ResolvedSessionOpen, "target" | "route">,
//     options: Pick<BinarySessionOpenOptions, "signal" | "snapshot"> = {},
//   ): Promise<Result<BinaryTarget, AnalysisError>> {
//     return this.#open(
//       () =>
//         Promise.resolve(
//           validateResolvedSessionTarget({
//             ...resolved,
//             current: this.#active,
//             options,
//             stagedSnapshotMatches: (target, profile) =>
//               this.matchesSnapshot(target, profile),
//           }),
//         ),
//       options,
//     );
//   }
//
//   #open(
//     resolve: (
export const _l = 253;
