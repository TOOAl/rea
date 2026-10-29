export const __stub = 1;
// import type {
//   BrowserContext,
//   ConsoleMessage,
//   Download,
//   Frame,
//   Page,
//   Request,
//   Response,
//   WebSocket,
//   Worker,
// } from "playwright-core";
//
// import type { SanitizedBrowserUrl } from "../domain/browserObservation.js";
// import {
//   browserScenarioEventSchema,
//   type BrowserScenarioEvent,
// } from "../domain/browserScenarioCaptureValues.js";
// import type { BrowserScenarioSecrets } from "./BrowserScenarioSecrets.js";
// import type { BrowserNetworkContentSelection } from "../domain/browserNetworkEvidence.js";
// import type { BrowserNetworkHeaders } from "../domain/browserNetworkEvidence.js";
// import type { BrowserScenarioCaptureLimits } from "../domain/browserScenarioCaptureLimits.js";
// import type {
//   BrowserScenarioEventAdmission,
//   BrowserScenarioEventBudgetReason,
//   BrowserScenarioEventOmissions,
// } from "../domain/browserScenarioCaptureValues.js";
// import { DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS } from "../domain/browserScenarioCaptureLimits.js";
// import { PlaywrightScenarioNetwork } from "./network/PlaywrightScenarioNetwork.js";
//
// type EventName =
//   | "console"
//   | "page-errors"
//   | "network"
//   | "websockets"
//   | "frames"
//   | "workers"
//   | "popups"
//   | "downloads";
//
// type UnindexedEvent = BrowserScenarioEvent extends infer Event
//   ? Event extends BrowserScenarioEvent
//     ? Omit<Event, "sequence" | "step_index">
//     : never
//   : never;
//
// interface EventCaptureOptions {
//   readonly page: Page;
//   readonly context?: BrowserContext;
//   /** A fresh launch context is wholly owned; connected contexts can contain other tabs. */
//   readonly ownsContext?: boolean;
//   readonly enabled: ReadonlySet<EventName>;
//   readonly secrets: BrowserScenarioSecrets;
//   readonly network?: BrowserNetworkContentSelection;
//   readonly limits?: BrowserScenarioCaptureLimits;
//   readonly signal?: AbortSignal;
// }
//
// // Conservative allocation accounting includes UTF-16 storage and worst-case
// // JSON escaping. Check before schema cloning; never serialize to measure.
// const MAX_LISTENER_OWNERS = 2048;
// const allocationCost = (value: unknown, remaining: number): number => {
//   if (typeof value === "string") return value.length * 8 + 2;
//   if (value === null || typeof value !== "object") return 32;
//   let cost = 2;
//   for (const key in value) {
//     if (!Object.hasOwn(value, key)) continue;
//     const item = (value as Record<string, unknown>)[key];
//     cost += key.length * 8 + 4 + allocationCost(item, remaining - cost);
//     if (cost > remaining) break;
//   }
//   return cost;
// };
//
// type EventKind = BrowserScenarioEvent["kind"];
// /** Arrival-ordered Playwright event capture with current-step attribution. */
// export class PlaywrightScenarioEvents {
//   private readonly items: BrowserScenarioEvent[] = [];
//   private retainedCost = 0;
//   private dropped = 0;
//   private readonly omittedKinds = new Map<
//     EventKind,
//     { count: number; reasons: Set<BrowserScenarioEventBudgetReason> }
//   >();
//   private readonly omittedNetwork = new Map<
//     string,
//     {
//       readonly kinds: Set<EventKind>;
//       readonly reasons: Set<BrowserScenarioEventBudgetReason>;
//     }
//   >();
//   private stepIndex = 0;
//   private sequence = 0;
//   private readonly enabled: ReadonlySet<EventName>;
//   private readonly secrets: BrowserScenarioSecrets;
//   private readonly limits: BrowserScenarioCaptureLimits;
//   private readonly ownsContext: boolean;
//   private pages = new WeakSet<Page>();
//   private readonly incompleteFamilies = new Set<EventName>();
//   private readonly network: PlaywrightScenarioNetwork | undefined;
//   private stopNetwork: (() => void) | undefined;
//   private readonly stopListeners = new Map<object, Set<() => void>>();
//   private sealed = false;
//
//   constructor(options: EventCaptureOptions) {
//     const network = options.network ?? {
//       request_body: false,
//       response_body: false,
//       header_values: false,
//     };
//     this.enabled = new Set(options.enabled);
//     if (network.request_body || network.response_body || network.header_values)
//       this.enabled = new Set([...this.enabled, "network"]);
//     this.secrets = options.secrets;
//     this.limits = options.limits ?? DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS;
//     this.ownsContext = options.ownsContext === true;
//     this.pages.add(options.page);
//     if (this.ownsContext && this.enabled.size > 0) {
//       const context = options.context ?? options.page.context();
//       const onPage = (page: Page) => this.popup(page);
//       context.on("page", onPage);
//       this.retainListener(context, () => context.off("page", onPage));
//     }
//     if (this.enabled.has("network")) {
//       const context = options.context ?? options.page.context();
//       const collector = new PlaywrightScenarioNetwork({
//         selection: network,
//         limits: this.limits,
//         secrets: options.secrets,
//         emit: (event) => this.push(event),
//         admitText: (kind, values) => this.admitProducerText(kind, values, true),
//         admitContentBody: (input) => this.admitContentBody(input),
//         omitNetwork: (id, kind, reason) => this.omitNetwork(id, kind, reason),
//         omitEvent: (kind, reason) => this.omitEvent(kind, reason),
//         ...(options.signal === undefined ? {} : { signal: options.signal }),
//       });
//       this.network = collector;
//       const inScope = (request: Request): boolean => {
//         if (this.ownsContext) return true;
//         try {
//           return this.pages.has(request.frame().page());
//         } catch (cause: unknown) {
//           // Initial popup navigations can lack a frame. Never guess ownership
//           // from a URL in a shared context; connect captures are attach-limited.
//           void cause;
//           return false;
//         }
//       };
//       const onRequest = (request: Request) => {
//         if (inScope(request)) collector.request(request);
//       };
//       const onResponse = (response: Response) => {
//         if (inScope(response.request())) collector.response(response);
//       };
//       const onFailed = (request: Request) => {
//         if (inScope(request)) collector.failed(request);
//       };
//       const onFinished = (request: Request) => {
//         if (inScope(request)) collector.finished(request);
//       };
//       context.on("request", onRequest);
//       context.on("response", onResponse);
export const _l = 161;
