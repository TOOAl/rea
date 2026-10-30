export const __stub = 1;
//       failures.push(cause);
//     }
//     for (const owner of this.commands.keys()) {
//       try {
//         const result = await owner.stop();
//         if (result.status === "incomplete") failures.push(result.reason);
//         else if (result.status === "not-owned")
//           failures.push("Command ownership remains unresolved");
//         else this.commands.delete(owner);
//       } catch (cause) {
//         failures.push(cause);
//       }
//     }
//     for (const snapshot of this.snapshots) {
//       const failure = await this.discard(snapshot);
//       if (failure !== undefined) failures.push(failure);
//     }
//     if (failures.length > 0)
//       throw new ProviderCleanupError(
//         "pcap",
//         [...this.snapshots]
//           .map((snapshot) => snapshot.path)
//           .concat(
//             [...this.commands.values()].flatMap((command) => command.resources),
//           ),
//         { reason: "Owned process or snapshot cleanup failed" },
//         { operation: "pcap.close", cause: new AggregateError(failures) },
//       );
//   }
//
//   async execute(
//     request: PcapRequest,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     return this.#resources.run(
//       () => this.executeAdmitted(request, options),
//       options?.signal,
//     );
//   }
//
//   private async executeAdmitted(
//     request: PcapRequest,
//     options?: ExecutionOptions,
//   ): Promise<Result<AnalysisExecution, AnalysisError>> {
//     const signal = options?.signal;
//     let snapshot: PcapSnapshot | undefined;
//     let result: Result<AnalysisExecution, AnalysisError>;
//     try {
//       signal?.throwIfAborted();
//       const { selection, client } = await this.client(
//         request.operation,
//         signal,
//       );
//       const provider = {
//         ...PCAP_PROVIDER_IDENTITY,
//         version: client.tshark_version,
//       };
//       if (request.operation === "inspect_pcap_client")
//         result = ok(
//           createAnalysisExecution(
//             pcapResultSchemas.inspect_pcap_client.parse({ client }),
//             provider,
//           ),
//         );
//       else {
//         await this.prepareCaptureBound();
//         snapshot = await PcapSnapshot.create();
//         this.snapshots.add(snapshot);
//         const identity = await snapshot.capture(request.input.path, signal);
//         const captured = await this.inspectCapture(
//           selection,
//           snapshot,
//           request.input.path,
//           identity,
//           signal,
//           request,
//           provider,
//           client,
//         );
//         const data = pcapResultSchemas.inspect_pcap_capture.parse({
//           client,
//           ...captured.result,
//         });
//         result = ok(
//           createAnalysisExecution(data, provider, {
//             subject: {
//               path: request.input.path,
//               format: "file",
//               sha256: identity.sha256,
//             },
//             limitations: captured.limitations,
//           }),
//         );
//       }
//     } catch (cause) {
//       result = err(
//         cause instanceof AnalysisError
//           ? cause
//           : signal?.aborted
//             ? new AnalysisCancelledError(request.operation, { cause })
//             : cause instanceof PcapConfigurationFailure
//               ? pcapToolUnavailable(request.operation, cause.message, {
//                   cause,
//                 })
//               : new AnalysisProtocolError(
//                   `Packet-capture analysis failed: ${cause instanceof Error ? cause.message : String(cause)}`,
//                   { cause },
//                 ),
//       );
//     }
//     if (signal?.aborted && result.ok)
//       result = err(
//         new AnalysisCancelledError(request.operation, {
//           cause: signal.reason,
//           partialObservation: createPcapEvidence(request, result.value),
//         }),
//       );
//     const pendingCommand =
//       snapshot === undefined
//         ? undefined
//         : [...this.commands.values()].find(
//             (command) => command.snapshot === snapshot,
//           );
//     if (snapshot !== undefined && pendingCommand === undefined) {
//       const cleanup = await this.discard(snapshot);
//       if (signal?.aborted && result.ok)
//         result = err(
//           new AnalysisCancelledError(request.operation, {
//             cause: signal.reason,
//             partialObservation: createPcapEvidence(request, result.value),
//           }),
//         );
//       if (cleanup !== undefined)
//         result = result.ok
//           ? err(
//               cleanup.retainPartialObservation(
//                 createPcapEvidence(request, result.value),
//               ),
//             )
//           : err(
//               analysisErrorWithCleanupFailure(
//                 result.error,
//                 cleanup,
//                 request.operation,
//               ),
//             );
//     }
//     if (
//       snapshot !== undefined &&
//       pendingCommand !== undefined &&
//       (result.ok || !(result.error instanceof ProviderCleanupError))
//     ) {
//       const partialObservation = result.ok
//         ? createPcapEvidence(request, result.value)
//         : result.error.partialObservation;
//       const capturedOutput = result.ok
//         ? undefined
//         : result.error.capturedOutput;
//       result = err(
//         new ProviderCleanupError(
//           "pcap",
//           [...new Set([snapshot.path, ...pendingCommand.resources])],
//           {
//             reason: pendingCommand.reason,
//             previous_error: result.ok
//               ? null
//               : projectAnalysisError(result.error),
//             ...(capturedOutput === undefined &&
//             pendingCommand.capturedOutput.stdout === "" &&
//             pendingCommand.capturedOutput.stderr === ""
//               ? {}
//               : {
export const _l = 172;
