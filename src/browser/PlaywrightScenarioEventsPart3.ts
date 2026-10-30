export const __stub = 1;
//     readonly sourceEventSequence: number;
//     readonly phase: "request" | "response";
//     readonly headers: BrowserNetworkHeaders;
//     readonly observedBytes: number;
//     readonly allocationBytes: number;
//     readonly mediaType: string | undefined;
//   }): BrowserScenarioEventAdmission {
//     const kind = "network-content";
//     const eventCost =
//       allocationCost(
//         {
//           kind,
//           sequence: this.sequence + 1,
//           step_index: this.stepIndex,
//           transaction_id: input.transactionId,
//           source_event_sequence: input.sourceEventSequence,
//           phase: input.phase,
//           headers: input.headers,
//           body: {
//             state: "captured",
//             representation:
//               input.phase === "request"
//                 ? "browser-exposed-request-bytes"
//                 : "playwright-response-body-bytes",
//             encoding: "base64",
//             content: null,
//             bytes: input.observedBytes,
//             sha256: "0".repeat(64),
//             media_type: null,
//             redacted: false,
//           },
//         },
//         this.limits.max_event_allocation_bytes,
//       ) -
//       64 +
//       input.allocationBytes +
//       (input.mediaType === undefined
//         ? 0
//         : Math.max(
//             input.mediaType.length * 8 + 2,
//             this.secrets.redactionAllocationCost(input.mediaType.length),
//           )) +
//       128;
//     const reason = this.admissionReason(eventCost);
//     if (reason !== undefined) {
//       this.sequence += 1;
//       this.omitEvent(kind, reason);
//       return { status: "omitted", sequence: this.sequence, reason };
//     }
//     return { status: "retained", sequence: this.sequence + 1 };
//   }
//
//   private omitEvent(
//     kind: EventKind,
//     reason: BrowserScenarioEventBudgetReason,
//   ): void {
//     this.dropped += 1;
//     let omission = this.omittedKinds.get(kind);
//     if (omission === undefined) {
//       omission = { count: 0, reasons: new Set() };
//       this.omittedKinds.set(kind, omission);
//     }
//     omission.count += 1;
//     omission.reasons.add(reason);
//   }
//
//   private omitNetwork(
//     transactionId: string,
//     kind: EventKind,
//     reason: BrowserScenarioEventBudgetReason,
//   ): void {
//     let omission = this.omittedNetwork.get(transactionId);
//     if (omission === undefined) {
//       omission = { kinds: new Set(), reasons: new Set() };
//       this.omittedNetwork.set(transactionId, omission);
//     }
//     omission.kinds.add(kind);
//     omission.reasons.add(reason);
//   }
//
//   private admitOwner(kind: EventKind): boolean {
//     if (this.stopListeners.size < MAX_LISTENER_OWNERS) return true;
//     this.sequence += 1;
//     this.omitEvent(kind, "max-listener-owners");
//     return false;
//   }
//
//   private retainListener(owner: object, stop: () => void): void {
//     let stops = this.stopListeners.get(owner);
//     if (stops === undefined) {
//       stops = new Set();
//       this.stopListeners.set(owner, stops);
//     }
//     stops.add(stop);
//   }
//
//   private releaseListeners(owner: object): void {
//     const stops = this.stopListeners.get(owner);
//     this.stopListeners.delete(owner);
//     for (const stop of stops ?? []) stop();
//   }
//
//   private observePage(page: Page): void {
//     if (this.enabled.size > 0) {
//       const onClose = () => {
//         this.releaseListeners(page);
//       };
//       page.on("close", onClose);
//       this.retainListener(page, () => page.off("close", onClose));
//     }
//
//     if (this.enabled.has("console")) {
//       const onConsole = (message: ConsoleMessage) => this.console(message);
//       page.on("console", onConsole);
//       this.retainListener(page, () => page.off("console", onConsole));
//     }
//     if (this.enabled.has("page-errors")) {
//       const onError = (error: Error) => {
//         if (!this.admitText("page-error", error.message, error.stack ?? ""))
//           return;
//         this.push({
//           kind: "page-error",
//           message: this.secrets.redact(error.message),
//           stack:
//             error.stack === undefined ? null : this.secrets.redact(error.stack),
//         });
//       };
//       page.on("pageerror", onError);
//       this.retainListener(page, () => page.off("pageerror", onError));
//     }
//     if (this.enabled.has("websockets")) {
//       const onWebSocket = (socket: WebSocket) => this.webSocket(socket);
//       page.on("websocket", onWebSocket);
//       this.retainListener(page, () => page.off("websocket", onWebSocket));
//     }
//     if (this.enabled.has("frames")) {
//       const onAttached = (frame: Frame) => this.frame("frame-attached", frame);
//       const onDetached = (frame: Frame) => this.frame("frame-detached", frame);
//       const onNavigated = (frame: Frame) =>
//         this.frame("frame-navigated", frame);
//       page.on("frameattached", onAttached);
//       page.on("framedetached", onDetached);
//       page.on("framenavigated", onNavigated);
//       this.retainListener(page, () => page.off("frameattached", onAttached));
//       this.retainListener(page, () => page.off("framedetached", onDetached));
//       this.retainListener(page, () => page.off("framenavigated", onNavigated));
//     }
//     if (this.enabled.has("workers")) {
//       const onWorker = (worker: Worker) => this.worker(worker);
//       page.on("worker", onWorker);
//       this.retainListener(page, () => page.off("worker", onWorker));
//     }
//     // Any selected family needs descendant discovery in shared contexts.
//     // Popup lifecycle records remain gated on their own selector below.
//     if (this.enabled.size > 0) {
//       const onPopup = (popup: Page) => this.popup(popup);
//       page.on("popup", onPopup);
//       this.retainListener(page, () => page.off("popup", onPopup));
//     }
//     if (this.enabled.has("downloads")) {
//       const onDownload = (download: Download) => this.download(download);
export const _l = 161;
