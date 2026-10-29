export const __stub = 1;
//                 encoding: "utf8",
//                 ...(signal === undefined ? {} : { signal }),
//               });
//               const identity = parseLinuxProcessStartTime(stat);
//               return [
//                 pid,
//                 identity === undefined
//                   ? ({
//                       state: "unavailable",
//                       reason: "malformed_proc_stat",
//                     } as const)
//                   : ({
//                       state: "readable",
//                       identity: `linux-starttime:${identity}`,
//                     } as const),
//               ] as const;
//             } catch (cause: unknown) {
//               if (isExpectedAbort(cause, signal)) throw cause;
//               return [
//                 pid,
//                 { state: "unavailable", reason: errorMessage(cause) } as const,
//               ] as const;
//             }
//           }),
//         ),
//       );
//     if (darwinTokens === undefined) return new Map();
//     try {
//       return await darwinTokens.identities(processes, signal);
//     } catch (cause: unknown) {
//       if (isExpectedAbort(cause, signal)) throw cause;
//       const reason = errorMessage(cause);
//       return new Map(
//         processes.map(({ pid }) => [
//           pid,
//           { state: "unavailable", reason } as const,
//         ]),
//       );
//     }
//   };
//   const captureBaseline = async (
//     signal?: AbortSignal,
//   ): Promise<ProcessOwnershipBaseline> => {
//     if (platform !== "linux" && darwinTokens === undefined) return [];
//     const processes = liveProcesses(await listProcesses(signal));
//     let identities = await processIdentities(processes, signal);
//     const unreadable = processes.filter(
//       ({ pid }) => identities.get(pid)?.state !== "readable",
//     );
//     if (unreadable.length > 0) {
//       const stillLive = liveProcesses(await listProcesses(signal)).filter(
//         ({ pid }) => unreadable.some((entry) => entry.pid === pid),
//       );
//       const retried = await processIdentities(stillLive, signal);
//       identities = new Map([...identities, ...retried]);
//       const unresolved = stillLive.filter(
//         ({ pid }) => identities.get(pid)?.state !== "readable",
//       );
//       const liveAfterRetry = liveProcesses(await listProcesses(signal));
//       const stillUnresolved = unresolved.filter(({ pid }) =>
//         liveAfterRetry.some((entry) => entry.pid === pid),
//       );
//       if (stillUnresolved.length > 0)
//         throw new Error(
//           `process identity snapshot is unavailable for ${String(stillUnresolved.length)} live processes`,
//         );
//     }
//     return processes.map(({ pid }) => {
//       const observation = identities.get(pid);
//       return {
//         pid,
//         identity:
//           observation?.state === "readable" ? observation.identity : null,
//       };
//     });
//   };
//   return {
//     platform,
//     prepare: async (signal) => {
//       await darwinTokens?.prepare(signal);
//       if (platform === "linux") {
//         try {
//           const processes = await listProcesses(signal);
//           if (!processes.some(({ pid }) => pid === process.pid))
//             throw new Error("ps did not report REA's current process");
//         } catch (cause: unknown) {
//           if (isExpectedAbort(cause, signal)) throw cause;
//           const reason = `Linux process ownership inspection requires a procps-compatible ps on REA's PATH before launching a child: ${errorMessage(cause)}`;
//           throw new AnalysisCapabilityUnavailableError(
//             "process-ownership",
//             "prepare_owned_process",
//             reason,
//             { cause, userMessage: reason },
//           );
//         }
//       }
//     },
//     listProcesses,
//     async environment(pid, signal) {
//       signal?.throwIfAborted();
//       if (platform === "linux")
//         return parseProcessEnvironment(
//           await readFile(`/proc/${pid}/environ`, { encoding: "utf8", signal }),
//         );
//       if (platform === "darwin") {
//         const process = (await listProcesses(signal)).find(
//           (entry) => entry.pid === pid,
//         );
//         if (process === undefined)
//           throw new Error(`process ${String(pid)} is not live`);
//         const observation = (await darwinTokens?.read([process], signal))?.get(
//           pid,
//         );
//         if (observation === undefined || observation.state === "unavailable")
//           throw new Error(
//             observation?.reason ?? "process run token could not be read",
//           );
//         return observation.runId === undefined
//           ? {}
//           : { REA_PROCESS_RUN_ID: observation.runId };
//       }
//       const { stdout } = await execFileOutput(
//         "ps",
//         ["eww", "-p", String(pid)],
//         {
//           env: hostEnvironment,
//           ...(signal === undefined ? {} : { signal }),
//         },
//       );
//       const observedEnvironment: Record<string, string> = {};
//       for (const match of stdout.matchAll(
//         /(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)=([^\s]*)/gu,
//       )) {
//         const name = match[1];
//         if (name !== undefined) observedEnvironment[name] = match[2] ?? "";
//       }
//       return observedEnvironment;
//     },
//     async runTokens(processes, signal) {
//       signal?.throwIfAborted();
//       if (platform !== "darwin" || processes.length === 0) return new Map();
//       try {
//         return (await darwinTokens?.read(processes, signal)) ?? new Map();
//       } catch (cause: unknown) {
export const _l = 144;
