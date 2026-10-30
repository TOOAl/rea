export const __stub = 1;
//         if (admission.status === "omitted") {
//           this.options.omitNetwork(
//             transaction.id,
//             "request-unfinished",
//             admission.reason,
//           );
//           transaction.responseScheduled = true;
//           continue;
//         }
//         this.responseContent(transaction, {
//           state: "unavailable",
//           reason:
//             this.options.signal?.aborted === true
//               ? "cancelled"
//               : "response-unfinished",
//           message:
//             "The response had not finished at the capture cutoff; no body read or refetch was attempted.",
//         });
//       }
//     }
//     await this.settlePendingReads();
//   }
//
//   private async settlePendingReads(): Promise<void> {
//     const results = await Promise.allSettled(this.pending);
//     const failed = results.find(
//       (result): result is PromiseRejectedResult => result.status === "rejected",
//     );
//     if (failed !== undefined) throw failed.reason;
//   }
//
//   /** Missing selected content contributes to aggregate completeness. */
//   limitations(): readonly string[] {
//     return [...this.gaps];
//   }
//
//   omittedTransactionRange(): {
//     readonly first_transaction_id: string;
//     readonly last_transaction_id: string;
//     readonly count: number;
//     readonly reason: "max-network-transactions";
//   } | null {
//     return this.omittedTransactionCount === 0
//       ? null
//       : {
//           first_transaction_id: `request-${String(this.firstOmittedTransaction)}`,
//           last_transaction_id: `request-${String(this.lastOmittedTransaction)}`,
//           count: this.omittedTransactionCount,
//           reason: "max-network-transactions",
//         };
//   }
//
//   private transaction(
//     request: ScenarioNetworkRequest,
//   ): Transaction | undefined {
//     const known = this.transactions.get(request);
//     if (known !== undefined) return known;
//     if (this.omittedRequests.has(request)) return undefined;
//     this.totalTransactions += 1;
//     const id = `request-${String(this.totalTransactions)}`;
//     if (this.transactions.size >= this.limits.max_network_transactions) {
//       this.omittedRequests.add(request);
//       if (this.omittedTransactionCount === 0)
//         this.firstOmittedTransaction = this.totalTransactions;
//       this.lastOmittedTransaction = this.totalTransactions;
//       this.omittedTransactionCount += 1;
//       this.gaps.add(
//         `Network collection reached its ${String(this.limits.max_network_transactions)}-transaction resource budget; omitted transaction IDs are listed in events.omissions.network_transaction_range.`,
//       );
//       return undefined;
//     }
//     const predecessor = request.redirectedFrom();
//     const predecessorTransaction =
//       predecessor === null ? undefined : this.transactions.get(predecessor);
//     const transaction: Transaction = {
//       id,
//       redirectedFrom: predecessorTransaction?.id ?? null,
//       redirectedFromState:
//         predecessor === null
//           ? "root"
//           : predecessorTransaction === undefined
//             ? "unknown"
//             : undefined,
//       responseScheduled: false,
//       requestObserved: false,
//     };
//     this.transactions.set(request, transaction);
//     return transaction;
//   }
//
//   private admitProducerStrings(
//     transaction: Transaction,
//     kind: UnindexedNetworkEvent["kind"],
//     values: Iterable<string>,
//   ): boolean {
//     const admission = this.options.admitText(kind, values);
//     if (admission.status === "retained") return true;
//     this.options.omitNetwork(transaction.id, kind, admission.reason);
//     this.gaps.add(
//       `Network ${kind} metadata was omitted for ${transaction.id} because ${admission.reason} was reached; network coverage is incomplete.`,
//     );
//     return false;
//   }
//
//   private omitOmittedTransactionPhase(
//     request: ScenarioNetworkRequest,
//     kind: UnindexedNetworkEvent["kind"],
//   ): void {
//     if (!this.omittedRequests.has(request)) return;
//     if (!this.observeOmittedTransactionPhase(request, kind)) return;
//     this.options.omitEvent(kind, "max-network-transactions");
//   }
//
//   private observeOmittedTransactionPhase(
//     request: ScenarioNetworkRequest,
//     phase: string,
//   ): boolean {
//     let observed = this.omittedPhases.get(request);
//     if (observed === undefined) {
//       observed = new Set();
//       this.omittedPhases.set(request, observed);
//     }
//     if (observed.has(phase)) return false;
//     observed.add(phase);
//     return true;
//   }
//
//   private omitOmittedTransactionContent(
//     request: ScenarioNetworkRequest,
//     phase: "request" | "response",
//   ): void {
//     if (!this.omittedRequests.has(request)) return;
//     if (
//       !this.observeOmittedTransactionPhase(request, `network-content:${phase}`)
//     )
//       return;
//     this.options.omitEvent("network-content", "max-network-transactions");
//   }
//
//   private admitMetadata(
//     transaction: Transaction,
//     kind: UnindexedNetworkEvent["kind"],
//     source: NetworkHeadersSource,
//     url?: string,
//     additionalStrings: readonly string[] = [],
//     additionalSources: readonly {
//       source: NetworkHeadersSource;
//       url?: string;
//     }[] = [],
//   ): boolean {
//     return this.admitProducerStrings(
//       transaction,
//       kind,
//       this.metadataStrings(source, url, additionalStrings, additionalSources),
//     );
//   }
//
//   private *metadataStrings(
//     source: NetworkHeadersSource,
//     url: string | undefined,
//     additionalStrings: readonly string[],
//     additionalSources: readonly {
//       source: NetworkHeadersSource;
//       url?: string;
//     }[],
//   ): Generator<string> {
//     yield* this.retainedMetadataStrings(source, source.headers(), url);
//     yield* additionalStrings;
//     for (const extra of additionalSources)
export const _l = 169;
