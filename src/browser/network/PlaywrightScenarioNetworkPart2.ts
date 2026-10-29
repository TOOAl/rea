export const __stub = 1;
//     const sequence = admission.sequence;
//     if (
//       this.options.selection.request_body ||
//       this.options.selection.header_values
//     )
//       this.collect(
//         transaction,
//         sequence,
//         "request",
//         request,
//         (headers) =>
//           this.options.selection.request_body
//             ? captureNetworkBody(
//                 async () => request.postDataBuffer(),
//                 "request",
//                 request,
//                 this.options.secrets,
//                 this.readOptions,
//                 (body) =>
//                   this.options.admitContentBody({
//                     transactionId: transaction.id,
//                     sourceEventSequence: sequence,
//                     phase: "request",
//                     headers,
//                     observedBytes: body.observedBytes,
//                     allocationBytes: body.allocationBytes,
//                     mediaType: body.mediaType,
//                   }),
//               )
//             : Promise.resolve({ state: "not_requested" }),
//         this.options.selection.header_values,
//       );
//   }
//
//   /** Observe response metadata without starting a potentially unfinished body read. */
//   response(response: ScenarioNetworkResponse): void {
//     if (!this.accepting) return;
//     const request = response.request();
//     const transaction = this.transaction(request);
//     if (transaction === undefined) {
//       this.omitOmittedTransactionPhase(request, "response");
//       this.observeOmittedTransactionPhase(request, "response");
//       return;
//     }
//     if (
//       !this.admitMetadata(
//         transaction,
//         "response",
//         request,
//         undefined,
//         [],
//         [{ source: response, url: response.url() }],
//       )
//     )
//       return;
//     const admission = this.options.emit({
//       ...this.metadata(request, transaction),
//       kind: "response",
//       url: this.options.secrets.sanitizeUrl(response.url()),
//       status: response.status(),
//       header_names: this.headerNames(response),
//       failure: null,
//     });
//     if (admission.status === "omitted") {
//       this.options.omitNetwork(transaction.id, "response", admission.reason);
//       return;
//     }
//     const sequence = admission.sequence;
//     transaction.response = { source: response, sequence };
//   }
//
//   /** Record completion and read selected content through the response API. */
//   finished(request: ScenarioNetworkRequest): void {
//     if (!this.accepting) return;
//     const transaction = this.transaction(request);
//     if (transaction === undefined) {
//       this.omitOmittedTransactionPhase(request, "request-finished");
//       const observed = this.omittedPhases.get(request);
//       if (
//         observed?.has("response") &&
//         (this.options.selection.response_body ||
//           this.options.selection.header_values)
//       )
//         this.omitOmittedTransactionContent(request, "response");
//       return;
//     }
//     if (!this.admitMetadata(transaction, "request-finished", request)) return;
//     transaction.terminal = "finished";
//     const admission = this.options.emit({
//       ...this.metadata(request, transaction),
//       kind: "request-finished",
//       status: null,
//       failure: null,
//     });
//     if (admission.status === "omitted") {
//       this.options.omitNetwork(
//         transaction.id,
//         "request-finished",
//         admission.reason,
//       );
//       transaction.responseScheduled = true;
//       return;
//     }
//     this.responseContent(transaction);
//   }
//
//   /** Preserve request failure separately from missing or unreadable response content. */
//   failed(request: ScenarioNetworkRequest): void {
//     if (!this.accepting) return;
//     const transaction = this.transaction(request);
//     if (transaction === undefined) {
//       this.omitOmittedTransactionPhase(request, "request-failed");
//       return;
//     }
//     transaction.terminal = "failed";
//     const failure = request.failure()?.errorText || "Unknown request failure";
//     if (
//       !this.admitMetadata(transaction, "request-failed", request, undefined, [
//         failure,
//       ])
//     )
//       return;
//     const message = this.options.secrets.redact(failure);
//     const admission = this.options.emit({
//       ...this.metadata(request, transaction),
//       kind: "request-failed",
//       status: null,
//       failure: message,
//     });
//     if (admission.status === "omitted") {
//       this.options.omitNetwork(
//         transaction.id,
//         "request-failed",
//         admission.reason,
//       );
//       transaction.responseScheduled = true;
//       return;
//     }
//     this.responseContent(transaction, {
//       state: "unavailable",
//       reason: "request-failed",
//       message,
//     });
//   }
//
//   /** Stop observing, mark unfinished transactions, and drain admitted content reads. */
//   async finish(): Promise<void> {
//     if (!this.accepting) {
//       await this.settlePendingReads();
//       return;
//     }
//     this.accepting = false;
//     for (const [request, transaction] of this.transactions) {
//       if (transaction.terminal === undefined) {
//         if (!this.admitMetadata(transaction, "request-unfinished", request))
//           continue;
//         this.gaps.add(
//           "Some network requests had not completed when capture ended; later activity is unknown.",
//         );
//         const admission = this.options.emit({
//           ...this.metadata(request, transaction),
//           kind: "request-unfinished",
//           status: null,
//           failure: null,
//           reason:
//             this.options.signal?.aborted === true
//               ? "cancelled"
//               : "capture-ended",
//         });
export const _l = 169;
