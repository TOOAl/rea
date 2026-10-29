export const __stub = 1;
//   }
// };
//
// /** Read one loopback CDP discovery document without redirects. */
// export const readCdpJson = async (
//   url: URL,
//   operation: BrowserObservationOperation,
//   signal?: AbortSignal,
//   limits: CdpDiscoveryResponseLimits = CDP_DISCOVERY_RESPONSE_LIMITS,
// ): Promise<unknown> =>
//   await new Promise((resolve, reject) => {
//     if (signal?.aborted === true) {
//       reject(new AnalysisCancelledError(operation));
//       return;
//     }
//     let response: IncomingMessage | undefined;
//     let request_: ClientRequest | undefined;
//     let timer: NodeJS.Timeout | undefined;
//     let settled = false;
//     const removeAbort = (): void =>
//       signal?.removeEventListener("abort", onAbort);
//     const finish = (error?: Error, value?: unknown): void => {
//       if (settled) return;
//       settled = true;
//       if (timer !== undefined) clearTimeout(timer);
//       removeAbort();
//       if (error !== undefined) {
//         reject(error);
//         response?.destroy();
//         request_?.destroy();
//       } else resolve(value);
//     };
//     const onAbort = (): void => {
//       if (signal?.aborted === true)
//         finish(new AnalysisCancelledError(operation));
//     };
//     request_ = request(
//       url,
//       { method: "GET", headers: { Accept: "application/json" } },
//       (received) => {
//         response = received;
//         if (settled) {
//           received.destroy();
//           return;
//         }
//         if (received.statusCode !== 200) {
//           finish(
//             new BrowserObservationError(operation, "invalid_endpoint_response"),
//           );
//           return;
//         }
//         const chunks: Buffer[] = [];
//         let bytes = 0;
//         received.on("data", (chunk: Buffer) => {
//           if (settled) return;
//           bytes += chunk.byteLength;
//           if (bytes > limits.bytes) {
//             finish(
//               new BrowserObservationError(operation, "payload_limit", {
//                 detail: `CDP discovery response exceeds its ${String(limits.bytes)} byte limit.`,
//               }),
//             );
//             return;
//           }
//           chunks.push(chunk);
//         });
//         received.on("end", () => {
//           if (settled) return;
//           const parsed = safeParseJson(
//             Buffer.concat(chunks, bytes).toString("utf8"),
//           );
//           if (!parsed.ok) {
//             finish(
//               new BrowserObservationError(
//                 operation,
//                 "invalid_endpoint_response",
//                 { cause: parsed.cause },
//               ),
//             );
//             return;
//           }
//           finish(undefined, parsed.value);
//         });
//         received.on("aborted", () =>
//           finish(
//             new BrowserObservationError(operation, "invalid_endpoint_response"),
//           ),
//         );
//         received.on("close", () => {
//           if (!settled && !received.complete)
//             finish(
//               new BrowserObservationError(
//                 operation,
//                 "invalid_endpoint_response",
//               ),
//             );
//         });
//         received.on("error", (cause: unknown) =>
//           finish(endpointFailure(cause, operation, signal)),
//         );
//       },
//     );
//     request_.on("error", (cause: unknown) =>
//       finish(endpointFailure(cause, operation, signal)),
//     );
//     signal?.addEventListener("abort", onAbort, { once: true });
//     onAbort();
//     if (settled) return;
//     timer = setTimeout(
//       () =>
//         finish(
//           new BrowserObservationError(operation, "timeout", {
//             detail: `CDP discovery response exceeded its ${String(limits.timeoutMs)} ms deadline.`,
//           }),
//         ),
//       limits.timeoutMs,
//     );
//     request_.end();
//   });
//
// const endpointFailure = (
//   cause: unknown,
//   operation: BrowserObservationOperation,
//   signal?: AbortSignal,
// ): AnalysisError => {
//   if (cause instanceof AnalysisError) return cause;
//   if (signal?.aborted === true) return new AnalysisCancelledError(operation);
//   return new BrowserObservationError(operation, "endpoint_unreachable", {
//     cause,
//   });
// };
export const _l = 131;
