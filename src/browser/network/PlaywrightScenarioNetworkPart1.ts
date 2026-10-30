export const __stub = 1;
// import type {
//   BrowserNetworkBody,
//   BrowserNetworkHeaders,
//   BrowserNetworkContentSelection,
// } from "../../domain/browserNetworkEvidence.js";
// import type { BrowserScenarioCaptureLimits } from "../../domain/browserScenarioCaptureLimits.js";
// import type {
//   BrowserScenarioEventAdmission,
//   BrowserScenarioEventBudgetReason,
// } from "../../domain/browserScenarioCaptureValues.js";
// import type { BrowserScenarioEvent } from "../../domain/browserScenarioCaptureValues.js";
// import type { BrowserScenarioSecrets } from "../BrowserScenarioSecrets.js";
// import {
//   captureNetworkBody,
//   captureNetworkHeaders,
//   type NetworkBodyCapture,
//   type NetworkHeadersSource,
//   type NetworkReadOptions,
// } from "./PlaywrightNetworkContent.js";
//
// /** Request object identity is the association key, never URL or receipt adjacency. */
// export interface ScenarioNetworkRequest extends NetworkHeadersSource {
//   method(): string;
//   url(): string;
//   resourceType(): string;
//   postDataBuffer(): Buffer | null;
//   redirectedFrom(): ScenarioNetworkRequest | null;
//   failure(): { errorText: string } | null;
// }
//
// /** A response's body becomes eligible for reading only after requestfinished. */
// export interface ScenarioNetworkResponse extends NetworkHeadersSource {
//   request(): ScenarioNetworkRequest;
//   url(): string;
//   status(): number;
//   body(): Promise<Buffer>;
// }
//
// type UnindexedNetworkEvent = BrowserScenarioEvent extends infer Event
//   ? Event extends BrowserScenarioEvent
//     ? Event["kind"] extends
//         | "request"
//         | "response"
//         | "request-finished"
//         | "request-failed"
//         | "request-unfinished"
//         | "network-content"
//       ? Omit<Event, "sequence" | "step_index">
//       : never
//     : never
//   : never;
//
// interface Transaction {
//   readonly id: string;
//   readonly redirectedFrom: string | null;
//   readonly redirectedFromState: "root" | "unknown" | undefined;
//   response?: {
//     readonly source: ScenarioNetworkResponse;
//     readonly sequence: number;
//   };
//   terminal?: "finished" | "failed";
//   responseScheduled: boolean;
//   requestObserved: boolean;
// }
//
// interface QueuedContentRead {
//   readonly run: () => Promise<void>;
//   readonly resolve: () => void;
//   readonly reject: (cause: unknown) => void;
// }
//
// interface NetworkCaptureOptions {
//   readonly selection: BrowserNetworkContentSelection;
//   readonly limits: BrowserScenarioCaptureLimits;
//   readonly secrets: BrowserScenarioSecrets;
//   readonly emit: (
//     event: UnindexedNetworkEvent,
//   ) => BrowserScenarioEventAdmission;
//   /** Check aggregate event capacity before redacting producer-owned metadata. */
//   readonly admitText: (
//     kind: UnindexedNetworkEvent["kind"],
//     values: Iterable<string>,
//   ) => BrowserScenarioEventAdmission;
//   readonly admitContentBody: (input: {
//     readonly transactionId: string;
//     readonly sourceEventSequence: number;
//     readonly phase: "request" | "response";
//     readonly headers: BrowserNetworkHeaders;
//     readonly observedBytes: number;
//     readonly allocationBytes: number;
//     readonly mediaType: string | undefined;
//   }) => BrowserScenarioEventAdmission;
//   readonly omitNetwork: (
//     transactionId: string,
//     kind: UnindexedNetworkEvent["kind"],
//     reason: BrowserScenarioEventBudgetReason,
//   ) => void;
//   readonly omitEvent: (
//     kind: UnindexedNetworkEvent["kind"],
//     reason: BrowserScenarioEventBudgetReason,
//   ) => void;
//   readonly signal?: AbortSignal;
//   /** Production uses 5s; a fixture can supply its own bounded-read clock. */
//   readonly readTimeoutMs?: number;
// }
//
// /** Captures correlated network phases and drains selected content before browser cleanup. */
// export class PlaywrightScenarioNetwork {
//   private readonly transactions = new Map<
//     ScenarioNetworkRequest,
//     Transaction
//   >();
//   private readonly omittedRequests = new WeakSet<ScenarioNetworkRequest>();
//   private readonly omittedPhases = new WeakMap<
//     ScenarioNetworkRequest,
//     Set<string>
//   >();
//   private totalTransactions = 0;
//   private omittedTransactionCount = 0;
//   private firstOmittedTransaction = 0;
//   private lastOmittedTransaction = 0;
//   /** One request and one response-content job at most per admitted transaction. */
//   private readonly pending: Promise<void>[] = [];
//   private readonly queuedReads: QueuedContentRead[] = [];
//   private readonly gaps = new Set<string>();
//   private accepting = true;
//   private activeReads = 0;
//   private readonly readOptions: NetworkReadOptions;
//   private readonly limits: BrowserScenarioCaptureLimits;
//
//   constructor(private readonly options: NetworkCaptureOptions) {
//     this.limits = options.limits;
//     this.readOptions = {
//       timeoutMs: options.readTimeoutMs ?? 5_000,
//       maxBodyBytes: this.limits.max_network_body_bytes,
//       maxBodyAllocationBytes: this.limits.max_network_body_allocation_bytes,
//       maxHeaderAllocationBytes: this.limits.max_network_header_allocation_bytes,
//       maxMetadataAllocationBytes:
//         this.limits.max_network_metadata_allocation_bytes,
//       ...(options.signal === undefined ? {} : { signal: options.signal }),
//     };
//   }
//
//   /** Observe a request start, retaining the producer's redirect relationship when known. */
//   request(request: ScenarioNetworkRequest): void {
//     if (!this.accepting) return;
//     const transaction = this.transaction(request);
//     if (transaction === undefined) {
//       this.omitOmittedTransactionPhase(request, "request");
//       if (
//         this.options.selection.request_body ||
//         this.options.selection.header_values
//       )
//         this.omitOmittedTransactionContent(request, "request");
//       return;
//     }
//     if (transaction.requestObserved) return;
//     if (!this.admitMetadata(transaction, "request", request)) return;
//     transaction.requestObserved = true;
//     const admission = this.options.emit({
//       ...this.metadata(request, transaction),
//       kind: "request",
//       status: null,
//       failure: null,
//     });
//     if (admission.status === "omitted") {
//       this.options.omitNetwork(transaction.id, "request", admission.reason);
//       return;
//     }
export const _l = 169;
