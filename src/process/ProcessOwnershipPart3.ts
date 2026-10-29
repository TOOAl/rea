export const __stub = 1;
//   next: ProcessOwnershipValidationFailure,
// ): void => {
//   const index = failures.findIndex(({ pid }) => pid === next.pid);
//   if (index < 0) {
//     failures.push(next);
//     return;
//   }
//   const previous = failures[index];
//   if (
//     previous !== undefined &&
//     ownershipFailurePriority(next.reason) >=
//       ownershipFailurePriority(previous.reason)
//   )
//     failures[index] = next;
// };
//
// const ownershipFailurePriority = (
//   reason: ProcessOwnershipValidationFailure["reason"],
// ): number =>
//   reason === "run-token-mismatch"
//     ? 3
//     : reason === "process-identity-unavailable"
//       ? 2
//       : reason === "environment-unreadable"
//         ? 1
//         : 0;
//
// const revalidateOwnedProcessGroup = async (
//   processGroupId: number,
//   ownership: OwnedProcessGroup,
//   host: ProcessOwnershipHost,
//   expectedIdentities: ReadonlyMap<number, string | null>,
// ): Promise<{ readonly empty: boolean } | ProcessCleanupResult> => {
//   let members: readonly ProcessTableEntry[];
//   try {
//     const processes = await settleLauncherExit(
//       ownership,
//       liveProcesses(await host.listProcesses()),
//       host,
//     );
//     if ("cleaned" in processes) return processes;
//     members = processes.filter(
//       ({ processGroupId: observedGroupId }) =>
//         observedGroupId === processGroupId,
//     );
//   } catch (cause: unknown) {
//     return {
//       cleaned: false,
//       reason: `process ownership could not be revalidated: ${errorMessage(cause)}`,
//     };
//   }
//   const failures = await processOwnershipFailures(
//     members,
//     ownership.runId,
//     host,
//     expectedIdentities,
//   );
//   if (failures.length > 0) return cleanupValidationFailure(failures);
//   if (
//     processGroupId !== ownership.processGroupId &&
//     members.length > 0 &&
//     !members.some(({ pid }) => pid === processGroupId) &&
//     ownership.sweepTokenOwnedProcesses !== true
//   )
//     return {
//       cleaned: false,
//       reason:
//         "descendant process-group leader identity could not be revalidated",
//     };
//   return { empty: members.length === 0 };
// };
//
// const cleanupValidationFailure = (
//   failures: readonly ProcessOwnershipValidationFailure[],
//   unverified: readonly OwnershipSweepUnverifiedProcess[] = [],
// ): ProcessCleanupResult => {
//   const unverifiedEntry = unverified.length === 0 ? {} : { unverified };
//   const unreadable = failures.filter(
//     ({ reason }) => reason === "environment-unreadable",
//   );
//   if (failures.some(({ reason }) => reason === "run-token-mismatch"))
//     return {
//       cleaned: false,
//       reason: `process ownership token mismatch for PID(s): ${[
//         ...new Set(
//           failures
//             .filter(({ reason }) => reason === "run-token-mismatch")
//             .map(({ pid }) => pid),
//         ),
//       ]
//         .sort((left, right) => left - right)
//         .join(", ")}`,
//       failures,
//       ...unverifiedEntry,
//     };
//   if (failures.some(({ reason }) => reason === "process-identity-unavailable"))
//     return {
//       cleaned: false,
//       reason: "process identity could not be revalidated",
//       failures,
//       ...unverifiedEntry,
//     };
//   if (unreadable.length > 0) {
//     const counts = new Map<string, number>();
//     for (const { diagnostic } of unreadable) {
//       const category = sanitizedTokenReadFailure(diagnostic);
//       counts.set(category, (counts.get(category) ?? 0) + 1);
//     }
//     const breakdown = [...counts]
//       .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
//       .map(([category, count]) => `${category}=${String(count)}`)
//       .join(", ");
//     const candidates = unreadable
//       .map(
//         ({ pid, diagnostic }) =>
//           `${String(pid)}=${sanitizedTokenReadFailure(diagnostic)}`,
//       )
//       .sort((left, right) => compareUnicodeCodePoints(left, right));
//     return {
//       cleaned: false,
//       reason: `process ownership token could not be read for ${String(unreadable.length)} live process(es): ${breakdown}; live candidates ${candidates.join(", ")}`,
//       failures,
//       ...unverifiedEntry,
//     };
//   }
//   return {
//     cleaned: false,
//     reason: "process ownership could not be revalidated",
//     failures,
//     ...unverifiedEntry,
//   };
// };
//
// const sanitizedTokenReadFailure = (diagnostic: string | undefined): string => {
//   if (diagnostic === "environment_unavailable") return diagnostic;
//   if (diagnostic === "platform_binary_environment_withheld") return diagnostic;
//   if (diagnostic === "restricted_process_environment_withheld")
//     return diagnostic;
//   const environmentErrno = /^(EACCES|EPERM|ENOENT|ESRCH):/u.exec(
//     diagnostic ?? "",
//   );
//   if (environmentErrno?.[1] !== undefined)
//     return `environment_errno_${environmentErrno[1]}`;
//   if (diagnostic === "apple_vector_unavailable") return diagnostic;
//   if (diagnostic === "ambiguous_environment_boundary") return diagnostic;
//   if (diagnostic === "malformed_procargs") return diagnostic;
//   if (diagnostic === "process_identity_changed_during_token_read")
//     return diagnostic;
//   if (diagnostic === "process_not_in_snapshot") return diagnostic;
//   const processTableFailure = /^process_table_failed_(\d+)$/u.exec(
//     diagnostic ?? "",
//   );
//   if (processTableFailure?.[1] !== undefined)
//     return `process_table_errno_${processTableFailure[1]}`;
//   const sysctlFailure = /^sysctl_failed_(\d+)$/u.exec(diagnostic ?? "");
//   if (sysctlFailure?.[1] !== undefined)
//     return `sysctl_errno_${sysctlFailure[1]}`;
//   if (diagnostic === "reader_failure") return diagnostic;
//   if (diagnostic === "duplicate_run_token") return diagnostic;
//   if (diagnostic === "invalid_run_token_encoding") return diagnostic;
//   return "other_unavailable";
// };
//
// const processOwnershipFailures = async (
//   members: readonly ProcessTableEntry[],
//   runId: string,
//   host: ProcessOwnershipHost,
//   expectedIdentities: ReadonlyMap<number, string | null> = new Map(),
// ): Promise<readonly ProcessOwnershipValidationFailure[]> => {
//   const failures: ProcessOwnershipValidationFailure[] = [];
//   if (expectedIdentities.size > 0 && host.processIdentities !== undefined) {
//     const expectedMembers = members.filter(({ pid }) =>
//       expectedIdentities.has(pid),
//     );
//     const observed = await host.processIdentities(expectedMembers);
//     const identityFailures: ProcessOwnershipValidationFailure[] = [];
//     for (const member of expectedMembers) {
//       const expected = expectedIdentities.get(member.pid);
//       const current = observed.get(member.pid);
//       if (
//         expected === null ||
//         current?.state !== "readable" ||
//         current.identity !== expected
//       ) {
//         identityFailures.push({
//           pid: member.pid,
//           reason: "process-identity-unavailable",
//           diagnostic:
//             "process identity changed or became unavailable before signal",
//         });
//       }
//     }
//     failures.push(...(await recheckOwnershipFailures(identityFailures, host)));
//   }
//   failures.push(...(await processRunTokenFailures(members, runId, host)));
//   if (
//     failures.length === 0 &&
//     expectedIdentities.size > 0 &&
//     host.processIdentities !== undefined
//   ) {
//     const expectedMembers = members.filter(({ pid }) =>
//       expectedIdentities.has(pid),
//     );
//     const observed = await host.processIdentities(expectedMembers);
//     const identityFailures: ProcessOwnershipValidationFailure[] = [];
//     for (const member of expectedMembers) {
//       const expected = expectedIdentities.get(member.pid);
//       const current = observed.get(member.pid);
//       if (
//         expected !== null &&
//         current?.state === "readable" &&
//         current.identity === expected
//       )
//         continue;
//       identityFailures.push({
//         pid: member.pid,
//         reason: "process-identity-unavailable",
//         diagnostic:
//           "process identity changed or became unavailable during token validation",
//       });
//     }
//     failures.push(...(await recheckOwnershipFailures(identityFailures, host)));
//   }
//   return failures;
// };
//
// const processRunTokenFailures = async (
//   members: readonly ProcessTableEntry[],
//   runId: string,
//   host: ProcessOwnershipHost,
// ): Promise<readonly ProcessOwnershipValidationFailure[]> => {
//   const failures: ProcessOwnershipValidationFailure[] = [];
//   for await (const { process: member, observation } of readProcessRunTokens(
//     host,
//     members,
//   )) {
//     if (observation.state === "readable") {
//       if (observation.runId !== runId)
//         failures.push({ pid: member.pid, reason: "run-token-mismatch" });
//       continue;
//     }
//     failures.push({
//       pid: member.pid,
//       reason: "environment-unreadable",
//       diagnostic: observation.reason,
//     });
//   }
//   return recheckOwnershipFailures(failures, host);
// };
//
// /**
//  * Take a fresh liveness snapshot after each ownership-read phase. Only an
//  * absent PID resolves an unreadable observation; a readable token mismatch
//  * remains a failure. Never reuse this snapshot across identity/token reads.
//  */
// const recheckOwnershipFailures = async (
//   failures: readonly ProcessOwnershipValidationFailure[],
//   host: ProcessOwnershipHost,
// ): Promise<readonly ProcessOwnershipValidationFailure[]> => {
//   if (!failures.some(({ reason }) => reason !== "run-token-mismatch"))
//     return failures;
//   try {
//     let processes = await host.listProcesses();
//     const isDarwin = (host.platform ?? process.platform) === "darwin";
//     for (
//       let attempt = 0;
//       isDarwin &&
//       attempt < TOKEN_READ_RETRY_ATTEMPTS &&
//       processes.some(
//         ({ pid, state }) =>
//           failures.some(
//             (failure) =>
//               failure.pid === pid && failure.reason !== "run-token-mismatch",
//           ) && state.slice(1).includes("E"),
//       );
//       attempt += 1
//     ) {
//       await new Promise<void>((resolve) =>
//         setTimeout(resolve, TOKEN_READ_RETRY_DELAY_MS),
//       );
export const _l = 280;
