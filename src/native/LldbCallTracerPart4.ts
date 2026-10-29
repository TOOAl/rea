export const __stub = 1;
//     } satisfies CapturedOutput;
//     await handle.close();
//     handle = undefined;
//     return ok(captured);
//   } catch (cause: unknown) {
//     const failure = cause instanceof Error ? cause.message : String(cause);
//     if (handle !== undefined) {
//       try {
//         await handle.close();
//       } catch (closeCause: unknown) {
//         return err(
//           `${failure}; closing capture file failed: ${closeCause instanceof Error ? closeCause.message : String(closeCause)}`,
//         );
//       }
//     }
//     return err(failure);
//   }
// };
//
// interface RetainedLldbResources {
//   readonly root: PrivateRuntimeRoot;
//   readonly supervisor: ProviderProcessSupervisor | undefined;
//   readonly pidPath: string;
//   readonly targetIdentity: string | undefined;
//   processStopped: boolean;
//   targetStopped: boolean;
// }
//
// type LldbOutcome =
//   | {
//       readonly kind: "exited";
//       readonly exitCode: number | null;
//       readonly output: string;
//     }
//   | { readonly kind: "cancelled" }
//   | { readonly kind: "timeout" };
//
// type LldbExit = LldbOutcome & {
//   /** False proves LLDB never started and could not have created a target. */
//   readonly targetLaunched: boolean;
//   readonly targetIdentity: string | undefined;
//   readonly cleanupFailure: string | undefined;
//   readonly cleanupOwner?: ProviderProcessSupervisor;
// };
//
// const lldbCleanupResources = async (
//   owner: RetainedLldbResources,
// ): Promise<string[]> => [
//   ...(owner.processStopped ? [] : ["lldb-process-group"]),
//   ...(owner.targetStopped
//     ? []
//     : [
//         `native-target:${String((await readTargetPid(owner.pidPath)) ?? "unknown")}`,
//       ]),
//   owner.root.path,
// ];
//
// /** Supervise LLDB as an owned process group while observing its target PID identity. */
// const runLldb = async (
//   executable: string,
//   arguments_: readonly string[],
//   options: {
//     readonly signal?: AbortSignal;
//     readonly deadlineMs: number;
//     readonly pidPath: string;
//     readonly identityAckPath: string;
//     readonly environment: Readonly<NodeJS.ProcessEnv>;
//   },
// ): Promise<LldbExit> => {
//   if (options.signal?.aborted === true)
//     return {
//       kind: "cancelled",
//       targetLaunched: false,
//       targetIdentity: undefined,
//       cleanupFailure: undefined,
//     };
//   const deadline = new ProviderStartupDeadline(
//     options.deadlineMs,
//     options.signal,
//   );
//   let targetIdentity: string | undefined;
//   let supervisor: ProviderProcessSupervisor | undefined;
//   let retained = false;
//   const finish = async (outcome: LldbOutcome): Promise<LldbExit> => {
//     const stopped = await supervisor?.stop();
//     retained = stopped?.status === "incomplete";
//     return {
//       ...(deadline.interruption === undefined
//         ? outcome
//         : { kind: deadline.interruption }),
//       targetLaunched: supervisor !== undefined,
//       targetIdentity,
//       cleanupFailure:
//         stopped?.status === "incomplete" ? stopped.reason : undefined,
//       ...(retained && supervisor !== undefined
//         ? { cleanupOwner: supervisor }
//         : {}),
//     };
//   };
//   try {
//     const launched = await spawnOwnedProviderProcess({
//       command: executable,
//       arguments: arguments_,
//       runId: randomUUID(),
//       expectedCommand: executable,
//       signal: deadline.signal,
//       hostEnvironment: options.environment,
//     });
//     supervisor = new ProviderProcessSupervisor(
//       {
//         ...launched,
//         ownsProcessLifetime: true,
//         cleanup: () => cleanupOwnedProcessGroup(launched.ownership),
//       },
//       { maxDiagnosticBytes: DIAGNOSTIC_BYTES },
//     );
//     let identityAckWritten = false;
//     while (!(await supervisor.waitForOutputClose(20))) {
//       const pid = await readTargetPid(options.pidPath);
//       if (pid !== undefined && !identityAckWritten) {
//         let observation: ProcessIdentityObservation | undefined;
//         try {
//           observation = await observeProcessStartIdentity(pid);
//         } catch {
//           observation = undefined;
//         }
//         if (observation?.state === "readable")
//           targetIdentity = observation.identity;
//         await writeFile(
//           options.identityAckPath,
//           observation?.state === "readable" ? "readable" : "unavailable",
//           { mode: 0o600 },
//         );
//         identityAckWritten = true;
//       }
//       const interruption = deadline.interruption;
//       if (interruption !== undefined)
//         return await finish({ kind: interruption });
//       await waitForAbortableDelay(20, deadline.signal);
//     }
//     const snapshot = supervisor.snapshot();
//     const interruption = deadline.interruption;
//     return await finish(
//       interruption === undefined
//         ? {
//             kind: "exited",
//             exitCode: snapshot.exitCode ?? null,
//             output: `${snapshot.stdout.text}${snapshot.stderr.text}`.slice(
//               -DIAGNOSTIC_BYTES,
//             ),
//           }
//         : { kind: interruption },
//     );
//   } catch (cause: unknown) {
//     const interruption = deadline.interruption;
//     return await finish(
//       interruption === undefined
//         ? {
//             kind: "exited",
//             exitCode: null,
//             output: cause instanceof Error ? cause.message : String(cause),
//           }
//         : { kind: interruption },
//     );
//   } finally {
//     if (!retained) supervisor?.dispose();
//     deadline.dispose();
//   }
// };
//
// /**
//  * Confirm target exit, and signal a survivor only when its OS start identity
//  * still matches the one captured while it was stopped at entry.
//  */
// const readTargetPid = async (pidPath: string): Promise<number | undefined> => {
//   try {
//     const contents = (await readFile(pidPath, "utf8")).trim();
//     if (!/^[1-9]\d*$/u.test(contents)) return undefined;
//     const pid = Number(contents);
//     return Number.isSafeInteger(pid) ? pid : undefined;
//   } catch {
//     return undefined;
//   }
// };
//
// type TargetTermination =
//   | "terminated"
//   | "identity-unavailable"
//   | "identity-changed"
//   | "signal-did-not-stop";
//
// /** Only signal a surviving target when its captured OS start identity still matches. */
// const ensureTerminated = async (
//   pidPath: string,
//   identity: string | undefined,
//   missingPidIsUnknown: boolean,
// ): Promise<TargetTermination> => {
//   const pid = await readTargetPid(pidPath);
//   if (pid === undefined)
//     return missingPidIsUnknown ? "identity-unavailable" : "terminated";
//   if (!Number.isSafeInteger(pid) || pid <= 0) return "identity-unavailable";
//   let signalDisposition: Exclude<TargetTermination, "terminated"> | undefined;
//   for (let attempt = 0; attempt < 20; attempt++) {
//     if (!alive(pid)) return "terminated";
//     if (attempt === 10) {
//       if (identity === undefined) signalDisposition = "identity-unavailable";
//       else {
//         const result = await signalProcessWithStartIdentity(
//           pid,
//           identity,
//           "SIGKILL",
//         );
//         if (result === "gone") return "terminated";
//         if (result === "identity-changed")
//           signalDisposition = "identity-changed";
//         else if (result === "unverified")
//           signalDisposition = "identity-unavailable";
//         else if (result === "signaled")
//           signalDisposition = "signal-did-not-stop";
//       }
//     }
//     await new Promise((resolve) => setTimeout(resolve, 100));
//   }
//   return !alive(pid)
//     ? "terminated"
//     : (signalDisposition ?? "identity-unavailable");
// };
//
// const targetTerminationReason = (termination: TargetTermination): string => {
//   switch (termination) {
//     case "terminated":
//       return "target process terminated";
//     case "identity-unavailable":
//       return "target process start identity was unavailable; survivor was left untouched";
//     case "identity-changed":
//       return "target PID start identity changed; replacement process was left untouched";
//     case "signal-did-not-stop":
//       return "verified target did not exit after SIGKILL";
//   }
// };
//
// const alive = (pid: number): boolean => {
//   try {
//     process.kill(pid, 0);
//     return true;
//   } catch (cause: unknown) {
//     return !(
//       cause instanceof Error &&
//       "code" in cause &&
//       cause.code === "ESRCH"
//     );
//   }
// };
export const _l = 253;
