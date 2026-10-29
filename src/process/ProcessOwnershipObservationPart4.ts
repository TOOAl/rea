export const __stub = 1;
//         if (isExpectedAbort(cause, signal)) throw cause;
//         void cause;
//         return new Map(
//           processes.map(({ pid }) => [
//             pid,
//             { state: "unavailable", reason: "reader_failure" } as const,
//           ]),
//         );
//       }
//     },
//     ...(platform !== "linux" && darwinTokens === undefined
//       ? {}
//       : {
//           processIdentities,
//           captureBaseline,
//           ...(darwinTokens === undefined ? {} : { close: darwinTokens.close }),
//         }),
//     signalGroup(processGroupId, signal) {
//       process.kill(-processGroupId, signal);
//     },
//   };
// };
//
// export const systemProcessOwnershipHost = createSystemProcessOwnershipHost();
//
// /**
//  * Observe a live PID's start identity, optionally binding it to an owned run.
//  * Token validation is bracketed by identity reads so PID reuse cannot supply
//  * the first identity of a different process for an owned launch.
//  */
// export const observeProcessStartIdentity = async (
//   pid: number,
//   host: ProcessOwnershipHost = systemProcessOwnershipHost,
//   expectedRunId?: string,
// ): Promise<ProcessIdentityObservation | undefined> => {
//   const process = (await host.listProcesses()).find(
//     (entry) => entry.pid === pid,
//   );
//   if (process === undefined || liveProcesses([process]).length === 0)
//     return undefined;
//   if (host.processIdentities === undefined)
//     return { state: "unavailable", reason: "process identity is unsupported" };
//   const identity: ProcessIdentityObservation = (
//     await host.processIdentities([process])
//   ).get(pid) ?? {
//     state: "unavailable",
//     reason: "process identity was not returned",
//   };
//   if (expectedRunId === undefined || identity.state !== "readable")
//     return identity;
//   let owned = false;
//   for await (const { observation } of readProcessRunTokens(host, [process])) {
//     if (observation.state === "unavailable")
//       return {
//         state: "unavailable",
//         reason: `process ownership token could not be read for PID ${String(pid)}: ${observation.reason}`,
//       };
//     if (observation.runId !== expectedRunId)
//       return {
//         state: "unavailable",
//         reason: `process ownership token did not match the captured run for PID ${String(pid)}`,
//       };
//     owned = true;
//   }
//   if (!owned)
//     return {
//       state: "unavailable",
//       reason: `process ownership token was not returned for PID ${String(pid)}`,
//     };
//   const confirmed = await observeProcessStartIdentity(pid, host);
//   if (confirmed === undefined || confirmed.state !== "readable")
//     return confirmed;
//   return confirmed.identity === identity.identity
//     ? identity
//     : {
//         state: "unavailable",
//         reason: `process identity changed while validating the captured run token for PID ${String(pid)}`,
//       };
// };
//
// /** Confirm whether the process that held an authenticated bridge has exited. */
// export const observeProcessStartIdentityExit = async (
//   pid: number,
//   expectedIdentity: string,
//   host: ProcessOwnershipHost = systemProcessOwnershipHost,
// ): Promise<"exited" | "present" | "unverified"> => {
//   try {
//     const observed = await observeProcessStartIdentity(pid, host);
//     if (observed === undefined) return "exited";
//     if (observed.state !== "readable") return "unverified";
//     return observed.identity === expectedIdentity ? "present" : "exited";
//   } catch {
//     return "unverified";
//   }
// };
//
// /** Revalidate a launch-time start identity immediately before signaling a PID. */
// export const signalProcessWithStartIdentity = async (
//   pid: number,
//   expectedIdentity: string,
//   signal: NodeJS.Signals,
//   options: {
//     readonly host?: ProcessOwnershipHost;
//     readonly sendSignal?: (pid: number, signal: NodeJS.Signals) => void;
//   } = {},
// ): Promise<"signaled" | "gone" | "identity-changed" | "unverified"> => {
//   const host = options.host ?? systemProcessOwnershipHost;
//   try {
//     const observed = await observeProcessStartIdentity(pid, host);
//     if (observed === undefined) return "gone";
//     if (observed.state !== "readable") return "unverified";
//     if (observed.identity !== expectedIdentity) return "identity-changed";
//     (options.sendSignal ?? process.kill)(pid, signal);
//     return "signaled";
//   } catch {
//     return "unverified";
//   }
// };
//
// /** Prepare native token inspection before REA launches a captured child. */
// export const prepareProcessOwnershipInspection = async (
//   signal?: AbortSignal,
// ): Promise<void> => {
//   await systemProcessOwnershipHost.prepare?.(signal);
// };
//
// const processIsGone = async (
//   host: ProcessOwnershipHost,
//   pid: number,
// ): Promise<boolean> => {
//   try {
//     return !liveProcesses(await host.listProcesses()).some(
//       (process) => process.pid === pid,
//     );
//   } catch (cause: unknown) {
//     // best-effort cleanup: optional liveness probing; failure means not gone.
//     void cause;
//     return false;
//   }
// };
//
// export const errorMessage = (cause: unknown): string =>
//   cause instanceof Error ? cause.message : String(cause);
export const _l = 143;
