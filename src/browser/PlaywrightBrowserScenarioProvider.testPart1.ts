export const __stub = 1;
// // Fake-backed composition coverage; real browser verification lives in
// // `npm run verify:browser`.
// import { describe, expect, it, vi } from "vitest";
//
// import type { BrowserScenarioSessionPort } from "./BrowserScenarioSessionPort.js";
// import { PlaywrightBrowserScenarioProvider } from "./PlaywrightBrowserScenarioProvider.js";
// import { sanitizeBrowserUrl } from "../domain/browserObservation.js";
// import { PlaywrightScenarioBrowserCleanupOwner } from "./PlaywrightScenarioBrowser.js";
// import {
//   browserScenarioSchema,
//   type BrowserScenario,
// } from "../domain/browserScenario.js";
// import type { BrowserScenarioAction } from "../domain/browserScenarioValues.js";
// import {
//   browserStepArtifactsSchema,
//   type BrowserScenarioEvent,
//   type BrowserScenarioEventFamily,
//   type BrowserStepArtifacts,
// } from "../domain/browserScenarioCaptureValues.js";
// import { PLAYWRIGHT_RESPONSE_BODY_PROVENANCE_LIMITATION } from "../domain/browserNetworkEvidence.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { compareBrowserScenarios } from "../domain/browserScenarioDiff.js";
// import { compareBrowserScenariosInputSchema } from "../domain/browserScenarioDiffValues.js";
// import {
//   AnalysisCancelledError,
//   AnalysisOutputError,
//   AnalysisTimeoutError,
// } from "../domain/analysisErrorCore.js";
//
// const scenario = (
//   options: {
//     readonly mode?: "launch" | "connect";
//     readonly captures?: readonly (
//       | "screenshot"
//       | "dom"
//       | "accessibility"
//       | "url"
//       | "history"
//       | "storage"
//     )[];
//     readonly events?: readonly (
//       | "console"
//       | "page-errors"
//       | "network"
//       | "websockets"
//       | "frames"
//       | "workers"
//       | "popups"
//       | "downloads"
//     )[];
//     readonly actions?: number;
//   } = {},
// ): BrowserScenario =>
//   browserScenarioSchema.parse({
//     browser:
//       options.mode === "connect"
//         ? {
//             mode: "connect",
//             cdp_endpoint: "http://127.0.0.1:9222",
//             target_id: "page-1",
//           }
//         : {
//             mode: "launch",
//             executable_path: "/opt/chromium",
//           },
//     start_url: { url: "https://app.example.test/" },
//     actions: Array.from({ length: options.actions ?? 1 }, (_, index) => ({
//       step_id: `wait_${index}`,
//       action: "wait_for_timeout",
//       duration_ms: 1,
//     })),
//     storage: {},
//     secrets: [],
//     capture: {
//       after_each_step: options.captures ?? ["url"],
//       at_end: [],
//       events: options.events ?? [],
//     },
//   });
//
// type SnapshotKind = BrowserScenario["capture"]["after_each_step"][number];
//
// interface FakeSessionFailures {
//   readonly incomplete?: boolean;
//   readonly action?: Error;
//   readonly capture?: { readonly call: number; readonly error: Error };
//   readonly close?: Error;
// }
//
// const artifactState = (
//   kind: SnapshotKind,
//   requested: ReadonlySet<SnapshotKind>,
//   incomplete: boolean,
// ) => {
//   if (!requested.has(kind)) return { state: "not_requested" as const };
//   if (kind === "url")
//     return {
//       state: "captured" as const,
//       value: sanitizeBrowserUrl("https://app.example.test/current"),
//     };
//   if (incomplete && kind === "screenshot")
//     return {
//       state: "truncated" as const,
//       observed: 2_048,
//       retained: 0,
//       reason: "fixture limit",
//     };
//   return { state: "missing" as const, reason: "fixture unavailable" };
// };
//
// class FakeSession implements BrowserScenarioSessionPort {
//   readonly product = "Fake Chromium";
//   readonly version = "1";
//   readonly initialUrl = "about:blank";
//   readonly processOwnership: "provider-owned" | "external";
//   closeCalls = 0;
//   performCalls = 0;
//   captureCalls = 0;
//   onPerform: (() => void) | undefined;
//   eventGaps: readonly string[] = [];
//   eventItems: readonly BrowserScenarioEvent[] = [];
//
//   constructor(
//     readonly mode: "launch" | "connect",
//     private readonly failures: FakeSessionFailures = {},
//   ) {
//     this.processOwnership = mode === "launch" ? "provider-owned" : "external";
//   }
//
//   currentUrl() {
//     return "https://app.example.test/current";
//   }
//
//   sanitizeUrl(value: string) {
//     return sanitizeBrowserUrl(value);
//   }
//
//   setStep(_index: number) {}
//
//   nextEventSequence() {
//     return 1;
//   }
//
//   lastEventSequence() {
//     return 0;
//   }
//
//   events(): ReturnType<BrowserScenarioSessionPort["events"]> {
//     return {
//       retained: this.eventItems.length,
//       dropped: 0,
//       items: this.eventItems,
//       omissions: {
//         by_kind: [],
//         network_transactions: [],
//         network_transaction_range: null,
//       },
//     };
//   }
//
//   eventLimitations(): readonly string[] {
//     return this.eventGaps;
//   }
//
//   async perform(_action: BrowserScenarioAction, signal?: AbortSignal) {
//     this.performCalls += 1;
//     this.onPerform?.();
//     if (signal?.aborted === true) throw new Error("request cancelled");
//     if (this.failures.action !== undefined) throw this.failures.action;
//   }
//
//   capture(
//     requested: ReadonlySet<SnapshotKind>,
//     _signal?: AbortSignal,
//   ): Promise<BrowserStepArtifacts> {
//     this.captureCalls += 1;
//     if (this.failures.capture?.call === this.captureCalls)
//       return Promise.reject(this.failures.capture.error);
//     return Promise.resolve(
//       browserStepArtifactsSchema.parse({
//         screenshot: artifactState(
//           "screenshot",
//           requested,
//           this.failures.incomplete === true,
//         ),
//         dom: artifactState("dom", requested, this.failures.incomplete === true),
//         accessibility: artifactState(
//           "accessibility",
//           requested,
//           this.failures.incomplete === true,
//         ),
//         url: artifactState("url", requested, this.failures.incomplete === true),
//         history: artifactState(
//           "history",
//           requested,
export const _l = 195;
