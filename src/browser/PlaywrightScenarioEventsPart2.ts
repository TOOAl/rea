export const __stub = 1;
//       context.on("requestfailed", onFailed);
//       context.on("requestfinished", onFinished);
//       this.stopNetwork = () => {
//         context.off("request", onRequest);
//         context.off("response", onResponse);
//         context.off("requestfailed", onFailed);
//         context.off("requestfinished", onFinished);
//       };
//     }
//     this.observePage(options.page);
//   }
//
//   setStep(index: number): void {
//     this.stepIndex = index;
//   }
//
//   nextSequence(): number {
//     return this.sequence + 1;
//   }
//
//   lastSequence(): number {
//     return this.sequence;
//   }
//
//   /** Drain selected network content and freeze the result before browser teardown. */
//   async finish(): Promise<void> {
//     this.stopNetwork?.();
//     this.stopNetwork = undefined;
//     for (const owner of this.stopListeners.keys()) this.releaseListeners(owner);
//     this.pages = new WeakSet<Page>();
//     try {
//       await this.network?.finish();
//     } finally {
//       this.sealed = true;
//     }
//   }
//
//   /** Report selected popup event families with unrecoverable pre-discovery gaps. */
//   limitations(): readonly string[] {
//     const popupGaps = [...this.incompleteFamilies].map(
//       (family) =>
//         `Popup ${family} events before Page discovery are unavailable; later events are retained.`,
//     );
//     const gaps = [...popupGaps, ...(this.network?.limitations() ?? [])];
//     if (this.dropped > 0)
//       gaps.push(
//         "Browser event collection reached a selected resource budget; per-kind omissions and affected network transaction IDs are listed in events.omissions, and event coverage is incomplete.",
//       );
//     return this.enabled.has("network") && !this.ownsContext
//       ? [
//           "Shared-context network capture excludes requests without a known root or descendant Page frame.",
//           ...gaps,
//         ]
//       : gaps;
//   }
//
//   result(): {
//     readonly retained: number;
//     readonly dropped: number;
//     readonly items: readonly BrowserScenarioEvent[];
//     readonly omissions: BrowserScenarioEventOmissions;
//   } {
//     const omittedKinds = new Map(
//       [...this.omittedKinds].map(
//         ([kind, omission]) =>
//           [
//             kind,
//             { count: omission.count, reasons: new Set(omission.reasons) },
//           ] as const,
//       ),
//     );
//     return {
//       retained: this.items.length,
//       dropped: this.dropped,
//       items: this.items,
//       omissions: {
//         by_kind: [...omittedKinds]
//           .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
//           .map(([kind, omission]) => ({
//             kind,
//             count: omission.count,
//             reasons: [...omission.reasons].sort(),
//           })),
//         network_transactions: [...this.omittedNetwork]
//           .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
//           .map(([transaction_id, omission]) => ({
//             transaction_id,
//             omitted_kinds: [...omission.kinds].sort(),
//             reasons: [...omission.reasons].sort(),
//           })),
//         network_transaction_range:
//           this.network?.omittedTransactionRange() ?? null,
//       },
//     };
//   }
//
//   private push(event: UnindexedEvent): BrowserScenarioEventAdmission {
//     this.sequence += 1;
//     const cost =
//       allocationCost(event, this.limits.max_event_allocation_bytes) + 128;
//     const reason = this.admissionReason(cost);
//     if (this.sealed || reason !== undefined) {
//       const finalReason = reason ?? "max-events";
//       this.omitEvent(event.kind, finalReason);
//       return {
//         status: "omitted",
//         sequence: this.sequence,
//         reason: finalReason,
//       };
//     }
//     this.retainedCost += cost;
//     const parsed = browserScenarioEventSchema.parse({
//       ...event,
//       sequence: this.sequence,
//       step_index: this.stepIndex,
//     });
//     this.items.push(parsed);
//     return { status: "retained", sequence: this.sequence };
//   }
//
//   private admitText(kind: EventKind, ...values: readonly string[]): boolean {
//     return this.admitProducerText(kind, values, false).status === "retained";
//   }
//
//   /** Admit conservative output cost before running redaction or cloning. */
//   private admitProducerText(
//     kind: EventKind,
//     values: Iterable<string>,
//     networkMetadata: boolean,
//   ): BrowserScenarioEventAdmission {
//     let cost = 4096;
//     for (const value of values) {
//       cost += this.secrets.redactionAllocationCost(value.length);
//     }
//     const reason =
//       networkMetadata &&
//       cost > this.limits.max_network_metadata_allocation_bytes
//         ? "max-network-metadata-allocation-bytes"
//         : this.admissionReason(cost);
//     if (reason !== undefined) {
//       this.sequence += 1;
//       this.omitEvent(kind, reason);
//       return { status: "omitted", sequence: this.sequence, reason };
//     }
//     return { status: "retained", sequence: this.sequence + 1 };
//   }
//
//   private admissionReason(
//     cost: number,
//   ): BrowserScenarioEventBudgetReason | undefined {
//     if (this.sealed || this.items.length >= this.limits.max_events)
//       return "max-events";
//     if (cost > this.limits.max_event_allocation_bytes)
//       return "max-event-allocation-bytes";
//     if (cost > this.limits.max_total_event_allocation_bytes - this.retainedCost)
//       return "max-total-event-allocation-bytes";
//     return undefined;
//   }
//
//   private admitContentBody(input: {
//     readonly transactionId: string;
export const _l = 161;
