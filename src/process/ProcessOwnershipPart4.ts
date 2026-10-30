export const __stub = 1;
//       processes = await host.listProcesses();
//     }
//     const live = new Set(liveProcesses(processes).map(({ pid }) => pid));
//     return failures.filter(
//       ({ pid, reason }) => reason === "run-token-mismatch" || live.has(pid),
//     );
//   } catch (cause: unknown) {
//     return failures.map((failure) =>
//       failure.reason === "run-token-mismatch"
//         ? failure
//         : {
//             ...failure,
//             diagnostic: `${failure.diagnostic}; process liveness recheck failed: ${errorMessage(cause)}`,
//           },
//     );
//   }
// };
//
// interface TokenOwnedProcessScan {
//   readonly owned: readonly ProcessTableEntry[];
//   readonly failures: readonly ProcessOwnershipValidationFailure[];
//   readonly unverified: readonly OwnershipSweepUnverifiedProcess[];
//   readonly identities: ReadonlyMap<number, string | null>;
// }
//
// /** One sweep candidate whose run token could not be read. */
// interface UnreadableTokenCandidate {
//   readonly process: ProcessTableEntry;
//   readonly diagnostic: string;
// }
//
// const TOKEN_READ_RETRY_ATTEMPTS = 3;
// const TOKEN_READ_RETRY_DELAY_MS = 40;
//
// /** Darwin reports this when the kernel withholds a platform binary's environment. */
// const PLATFORM_BINARY_ENVIRONMENT_WITHHELD =
//   "platform_binary_environment_withheld";
// /** Darwin reports this when the kernel withholds a restricted process environment. */
// const RESTRICTED_PROCESS_ENVIRONMENT_WITHHELD =
//   "restricted_process_environment_withheld";
//
// const currentProcessUid = (): number | undefined =>
//   typeof process.getuid === "function" ? process.getuid() : undefined;
//
// /**
//  * Whether the operating system provably withheld this candidate's run token:
//  * current macOS omits the environment of Apple platform binaries and
//  * CS_RESTRICT processes from KERN_PROCARGS2, and fails with EINVAL for
//  * processes owned by another account. These classes cannot be token-verified
//  * by this caller. An unrelated candidate is recorded as unverified instead
//  * of failing an otherwise clean capture; every related or otherwise
//  * unreadable candidate stays fail-closed.
//  */
// const environmentWithheldFromInspection = (
//   entry: ProcessTableEntry,
//   diagnostic: string,
// ): boolean => {
//   const uid = currentProcessUid();
//   if (uid !== undefined && entry.uid !== undefined && entry.uid !== uid)
//     return true;
//   return (
//     diagnostic === PLATFORM_BINARY_ENVIRONMENT_WITHHELD ||
//     diagnostic === RESTRICTED_PROCESS_ENVIRONMENT_WITHHELD
//   );
// };
//
// const scanTokenOwnedProcesses = async (
//   processes: readonly ProcessTableEntry[],
//   runId: string,
//   host: ProcessOwnershipHost,
//   captureBaseline?: ProcessOwnershipBaseline,
//   relation?: OwnershipSweepRelation,
// ): Promise<TokenOwnedProcessScan> => {
//   let candidates = processes;
//   let candidateIdentities: ReadonlyMap<number, ProcessIdentityObservation> =
//     new Map();
//   if (host.processIdentities !== undefined) {
//     const current = await host.processIdentities(processes);
//     candidateIdentities = current;
//     if (captureBaseline !== undefined) {
//       const baseline = new Map(
//         captureBaseline.map(({ pid, identity }) => [pid, identity]),
//       );
//       candidates = processes.filter((process) => {
//         const before = baseline.get(process.pid);
//         const now = current.get(process.pid);
//         return !(
//           before !== undefined &&
//           before !== null &&
//           now?.state === "readable" &&
//           now.identity === before
//         );
//       });
//     }
//   }
//   const failures: ProcessOwnershipValidationFailure[] = [];
//   if (captureBaseline !== undefined && host.processIdentities !== undefined) {
//     const stableCandidates: ProcessTableEntry[] = [];
//     const identityFailures: ProcessOwnershipValidationFailure[] = [];
//     for (const process of candidates) {
//       if (candidateIdentities.get(process.pid)?.state === "readable") {
//         stableCandidates.push(process);
//         continue;
//       }
//       identityFailures.push({
//         pid: process.pid,
//         reason: "process-identity-unavailable",
//         diagnostic: "process identity was unavailable during token scan",
//       });
//     }
//     failures.push(...(await recheckOwnershipFailures(identityFailures, host)));
//     candidates = stableCandidates;
//   }
//   const owned: ProcessTableEntry[] = [];
//   const ownedIdentities = new Map<number, string | null>();
//   const recordOwned = (process: ProcessTableEntry): void => {
//     owned.push(process);
//     const identity = candidateIdentities.get(process.pid);
//     ownedIdentities.set(
//       process.pid,
//       identity?.state === "readable" ? identity.identity : null,
//     );
//   };
//   const unreadable: UnreadableTokenCandidate[] = [];
//   for await (const { process, observation } of readProcessRunTokens(
//     host,
//     candidates,
//   )) {
//     if (observation.state === "readable") {
//       if (observation.runId === runId) recordOwned(process);
//     } else unreadable.push({ process, diagnostic: observation.reason });
//   }
//   const remaining = await settleUnreadableTokenCandidates(
//     unreadable,
//     runId,
//     host,
//     recordOwned,
//   );
//   const relatedPids = new Set<number>();
//   const relatedGroupIds = new Set<number>();
//   if (relation !== undefined) {
//     relatedPids.add(relation.leaderPid);
//     for (const descendant of descendantsOf([relation.leaderPid], processes))
//       relatedPids.add(descendant.pid);
//     relatedGroupIds.add(relation.processGroupId);
//     for (const processGroupId of relation.sampledProcessGroupIds ?? [])
//       if (Number.isSafeInteger(processGroupId) && processGroupId > 0)
//         relatedGroupIds.add(processGroupId);
//     for (const process of owned) relatedGroupIds.add(process.processGroupId);
//   }
//   const unverified: OwnershipSweepUnverifiedProcess[] = [];
//   const strict: UnreadableTokenCandidate[] = [];
//   const withheld: UnreadableTokenCandidate[] = [];
//   for (const candidate of remaining) {
//     const isRelated =
//       relation === undefined ||
//       relatedPids.has(candidate.process.pid) ||
//       relatedGroupIds.has(candidate.process.processGroupId);
//     if (
//       !isRelated &&
//       environmentWithheldFromInspection(candidate.process, candidate.diagnostic)
//     ) {
//       withheld.push(candidate);
//       continue;
//     }
//     strict.push(candidate);
//   }
//   let finalLive: ReadonlySet<number> | undefined;
//   try {
//     finalLive = new Set(
//       liveProcesses(await host.listProcesses()).map(({ pid }) => pid),
//     );
//   } catch (cause: unknown) {
//     void cause;
//     finalLive = undefined;
//   }
//   for (const candidate of strict) {
//     if (finalLive !== undefined && !finalLive.has(candidate.process.pid))
//       continue;
//     failures.push({
//       pid: candidate.process.pid,
//       reason: "environment-unreadable",
//       diagnostic: candidate.diagnostic,
//     });
//   }
//   for (const candidate of withheld) {
//     if (finalLive !== undefined && !finalLive.has(candidate.process.pid))
//       continue;
//     unverified.push({
//       pid: candidate.process.pid,
//       diagnostic: candidate.diagnostic,
//     });
//   }
//   if (candidates.length > 0 && host.processIdentities !== undefined) {
//     const afterRead = await host.processIdentities(candidates);
//     const stillOwned: ProcessTableEntry[] = [];
//     const identityFailures: ProcessOwnershipValidationFailure[] = [];
//     const ownedPids = new Set(owned.map(({ pid }) => pid));
//     for (const process of candidates) {
//       const before = candidateIdentities.get(process.pid);
//       const current = afterRead.get(process.pid);
//       if (
//         before?.state === "readable" &&
//         current?.state === "readable" &&
//         current.identity === before.identity
//       ) {
//         if (ownedPids.has(process.pid)) stillOwned.push(process);
//         continue;
//       }
//       identityFailures.push({
//         pid: process.pid,
//         reason: "process-identity-unavailable",
//         diagnostic:
//           "process identity changed or became unavailable during token validation",
//       });
//     }
//     failures.push(...(await recheckOwnershipFailures(identityFailures, host)));
//     return {
//       owned: stillOwned,
//       failures,
//       unverified,
//       identities: ownedIdentities,
//     };
//   }
//   return { owned, failures, unverified, identities: ownedIdentities };
// };
//
// /**
//  * Re-read run tokens for unresolved sweep candidates so transient exec and
//  * exit states settle before classification. Each attempt revalidates
//  * liveness, refreshes the diagnostic, and is bounded by a fixed attempt
//  * budget; a still-unreadable candidate keeps its latest diagnostic.
//  */
// const settleUnreadableTokenCandidates = async (
//   pending: readonly UnreadableTokenCandidate[],
//   runId: string,
//   host: ProcessOwnershipHost,
//   recordOwned: (process: ProcessTableEntry) => void,
// ): Promise<readonly UnreadableTokenCandidate[]> => {
//   let remaining = pending;
//   for (
//     let attempt = 0;
//     attempt < TOKEN_READ_RETRY_ATTEMPTS && remaining.length > 0;
//     attempt += 1
//   ) {
//     await new Promise<void>((resolve) =>
//       setTimeout(resolve, TOKEN_READ_RETRY_DELAY_MS),
//     );
//     let live: ReadonlySet<number> | undefined;
//     try {
//       live = new Set(
//         liveProcesses(await host.listProcesses()).map(({ pid }) => pid),
//       );
//     } catch (cause: unknown) {
//       void cause;
//       live = undefined;
//     }
//     const stillUnreadable: UnreadableTokenCandidate[] = [];
//     const candidates = remaining
//       .map(({ process }) => process)
//       .filter(({ pid }) => live === undefined || live.has(pid));
//     for await (const { process, observation } of readProcessRunTokens(
//       host,
//       candidates,
//     )) {
//       if (observation.state === "readable") {
//         if (observation.runId === runId) recordOwned(process);
//         continue;
//       }
//       stillUnreadable.push({
//         process,
//         diagnostic: observation.reason,
//       });
//     }
//     remaining = stillUnreadable;
//   }
//   return remaining;
// };
export const _l = 278;
