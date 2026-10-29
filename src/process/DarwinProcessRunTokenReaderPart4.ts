export const __stub = 1;
//       try {
//         return await waitForCompilation(operation.promise, signal);
//       } finally {
//         operation.waiters -= 1;
//         if (
//           operation.waiters === 0 &&
//           !operation.settled &&
//           !operation.aborting
//         ) {
//           operation.aborting = true;
//           operation.controller.abort();
//           await operation.promise.catch(() => undefined);
//         }
//       }
//     }
//   };
//
//   const read = async (
//     processes: readonly ProcessTableEntry[],
//     signal?: AbortSignal,
//   ): Promise<ReadonlyMap<number, ProcessRunTokenObservation>> => {
//     signal?.throwIfAborted();
//     if (processes.length === 0) return new Map();
//     const binary = await compile(signal);
//     const pids = processes.map(({ pid }) => String(pid));
//     const { stdout } = await execFileOutput(binary, pids, {
//       timeout: 15_000,
//       ...(signal === undefined ? {} : { signal }),
//     });
//     signal?.throwIfAborted();
//     const decoded = safeParseJson(stdout);
//     if (!decoded.ok)
//       throw new Error(
//         `macOS process token helper returned invalid JSON: ${decoded.error}`,
//         { cause: decoded.cause },
//       );
//     const parsed = responseSchema.safeParse(decoded.value);
//     if (!parsed.success)
//       throw new Error(
//         "macOS process token helper returned an invalid response",
//         {
//           cause: parsed.error,
//         },
//       );
//     const requested = new Set(processes.map(({ pid }) => pid));
//     const observations = new Map<number, ProcessRunTokenObservation>();
//     for (const result of parsed.data.results) {
//       if (!requested.has(result.pid) || observations.has(result.pid))
//         throw new Error(
//           "macOS process token helper returned an unexpected PID set",
//         );
//       observations.set(
//         result.pid,
//         result.state === "readable"
//           ? { state: "readable", runId: result.run_id }
//           : {
//               state: "unavailable",
//               reason:
//                 result.reason ?? "process token observation is unavailable",
//             },
//       );
//     }
//     if (observations.size !== requested.size)
//       throw new Error(
//         "macOS process token helper returned an incomplete PID set",
//       );
//     return observations;
//   };
//
//   const identities = async (
//     processes: readonly ProcessTableEntry[],
//     signal?: AbortSignal,
//   ): Promise<ReadonlyMap<number, ProcessIdentityObservation>> => {
//     if (processes.length === 0) return new Map();
//     const binary = await compile(signal);
//     const pids = processes.map(({ pid }) => String(pid));
//     const { stdout } = await execFileOutput(binary, ["--identities", ...pids], {
//       timeout: 15_000,
//       ...(signal === undefined ? {} : { signal }),
//     });
//     const decoded = safeParseJson(stdout);
//     if (!decoded.ok)
//       throw new Error(
//         `macOS process identity helper returned invalid JSON: ${decoded.error}`,
//         { cause: decoded.cause },
//       );
//     const parsed = identityResponseSchema.safeParse(decoded.value);
//     if (!parsed.success)
//       throw new Error(
//         "macOS process identity helper returned an invalid response",
//         {
//           cause: parsed.error,
//         },
//       );
//     const requested = new Set(processes.map(({ pid }) => pid));
//     const observations = new Map<number, ProcessIdentityObservation>();
//     for (const result of parsed.data.results) {
//       if (!requested.has(result.pid) || observations.has(result.pid))
//         throw new Error(
//           "macOS process identity helper returned an unexpected PID set",
//         );
//       observations.set(
//         result.pid,
//         result.state === "readable"
//           ? { state: "readable", identity: result.identity }
//           : { state: "unavailable", reason: result.reason },
//       );
//     }
//     if (observations.size !== requested.size)
//       throw new Error(
//         "macOS process identity helper returned an incomplete PID set",
//       );
//     return observations;
//   };
//
//   const close = (): Promise<void> => {
//     if (closePromise !== undefined) return closePromise;
//     closed = true;
//     const pendingClose = (async () => {
//       const operation = compilation;
//       if (operation !== undefined && !operation.settled) {
//         operation.aborting = true;
//         operation.controller.abort();
//         await operation.promise.catch(() => undefined);
//       }
//       await cleanupRoot();
//     })().catch((cause: unknown) => {
//       if (closePromise === pendingClose) closePromise = undefined;
//       throw cause;
//     });
//     closePromise = pendingClose;
//     return closePromise;
//   };
//
//   return { read, identities, prepare: compile, close };
// };
export const _l = 136;
