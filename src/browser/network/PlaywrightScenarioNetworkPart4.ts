export const __stub = 1;
//       yield* this.retainedMetadataStrings(
//         extra.source,
//         extra.source.headers(),
//         extra.url,
//       );
//   }
//
//   private *retainedMetadataStrings(
//     source: NetworkHeadersSource,
//     headers: Readonly<Record<string, string>>,
//     url?: string,
//   ): Generator<string> {
//     if (url !== undefined) yield url;
//     for (const name in headers) {
//       if (!Object.hasOwn(headers, name)) continue;
//       yield name;
//       // Names are always retained in metadata. Values are retained only in
//       // selected header-value content; do not charge discarded values.
//       if (this.options.selection.header_values) yield headers[name]!;
//     }
//     if ("method" in source) {
//       const request = source as ScenarioNetworkRequest;
//       yield request.method();
//       yield request.url();
//       yield request.resourceType();
//     }
//   }
//
//   private headerNames(source: NetworkHeadersSource): string[] {
//     return Object.keys(source.headers())
//       .map((name) => this.options.secrets.redact(name))
//       .sort();
//   }
//
//   private metadata(request: ScenarioNetworkRequest, transaction: Transaction) {
//     return {
//       transaction_id: transaction.id,
//       redirected_from_transaction_id: transaction.redirectedFrom,
//       ...(transaction.redirectedFromState === undefined
//         ? {}
//         : {
//             redirected_from_transaction_state: transaction.redirectedFromState,
//           }),
//       method: this.options.secrets.redact(request.method()),
//       url: this.options.secrets.sanitizeUrl(request.url()),
//       resource_type: this.options.secrets.redact(request.resourceType()),
//       header_names: this.headerNames(request),
//     };
//   }
//
//   private responseContent(
//     transaction: Transaction,
//     unavailable?: BrowserNetworkBody,
//   ): void {
//     const response = transaction.response;
//     if (
//       response === undefined ||
//       transaction.responseScheduled ||
//       (!this.options.selection.response_body &&
//         !this.options.selection.header_values)
//     )
//       return;
//     transaction.responseScheduled = true;
//     this.collect(
//       transaction,
//       response.sequence,
//       "response",
//       response.source,
//       (headers) =>
//         this.options.selection.response_body
//           ? unavailable === undefined
//             ? captureNetworkBody(
//                 () => response.source.body(),
//                 "response",
//                 response.source,
//                 this.options.secrets,
//                 this.readOptions,
//                 (body) =>
//                   this.options.admitContentBody({
//                     transactionId: transaction.id,
//                     sourceEventSequence: response.sequence,
//                     phase: "response",
//                     headers,
//                     observedBytes: body.observedBytes,
//                     allocationBytes: body.allocationBytes,
//                     mediaType: body.mediaType,
//                   }),
//               )
//             : Promise.resolve(unavailable)
//           : Promise.resolve({ state: "not_requested" }),
//       this.options.selection.header_values,
//     );
//   }
//
//   private collect(
//     transaction: Transaction,
//     sequence: number,
//     phase: "request" | "response",
//     source: NetworkHeadersSource,
//     body: (headers: BrowserNetworkHeaders) => Promise<NetworkBodyCapture>,
//     includeHeaders: boolean,
//   ): void {
//     const collect = async (): Promise<void> => {
//       const retainedHeaders = includeHeaders
//         ? await captureNetworkHeaders(
//             source,
//             this.options.secrets,
//             this.readOptions,
//           )
//         : { state: "not_requested" as const };
//       const retainedBody = await body(retainedHeaders);
//       if (retainedBody.state === "omitted") {
//         this.options.omitNetwork(
//           transaction.id,
//           "network-content",
//           retainedBody.reason,
//         );
//         return;
//       }
//       if (
//         retainedHeaders.state === "unavailable" ||
//         retainedBody.state === "unavailable" ||
//         retainedBody.state === "not_exposed"
//       )
//         this.gaps.add(
//           "Some selected network content was unavailable; per-transaction content states retain the reason.",
//         );
//       const admission = this.options.emit({
//         kind: "network-content",
//         transaction_id: transaction.id,
//         source_event_sequence: sequence,
//         phase,
//         headers: retainedHeaders,
//         body: retainedBody,
//       });
//       if (admission.status === "omitted")
//         this.options.omitNetwork(
//           transaction.id,
//           "network-content",
//           admission.reason,
//         );
//     };
//     this.pending.push(
//       new Promise<void>((resolve, reject) => {
//         this.queuedReads.push({ run: collect, resolve, reject });
//         this.pumpContentReads();
//       }),
//     );
//   }
//
//   private pumpContentReads(): void {
//     while (this.activeReads < 16 && this.queuedReads.length > 0) {
//       const job = this.queuedReads.shift();
//       if (job === undefined) return;
//       this.activeReads += 1;
//       void job
//         .run()
//         .then(job.resolve, job.reject)
//         .finally(() => {
//           this.activeReads -= 1;
//           this.pumpContentReads();
//         });
//     }
//   }
// }
export const _l = 165;
