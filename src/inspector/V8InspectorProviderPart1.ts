export const __stub = 1;
// import type {
//   ExecutionOptions,
//   ProviderIdentity,
// } from "../application/AnalysisProvider.js";
// import type { JavaScriptRuntimeObservationPort } from "../application/javascript/JavaScriptRuntimeObservationPort.js";
// import {
//   javascriptRuntimeObservationSchema,
//   javascriptRuntimeTargetListSchema,
//   type JavaScriptRuntimeObservation,
//   type JavaScriptRuntimeTargetList,
//   type ListJavaScriptRuntimeTargetsInput,
//   type ObserveJavaScriptRuntimeInput,
// } from "../domain/javascript/javascriptRuntimeObservation.js";
// import { AnalysisError } from "../domain/analysisErrorBase.js";
// import { BrowserObservationError } from "../domain/browserObservationError.js";
// import type { AnalysisPartialObservation } from "../domain/analysisErrorBase.js";
// import { ProviderAdapterError } from "../domain/providerAdapterError.js";
// import type { BrowserObservationOperation } from "../domain/browserObservationErrors.js";
// import { err, ok, type Result } from "../domain/result.js";
// import {
//   numberValue,
//   recordValue,
//   cdpStringValue,
//   scriptMetadataValues,
//   delayWithCancellation,
// } from "../browser/CdpCaptureValues.js";
// import { CdpConnection, type CdpEvent } from "../browser/CdpConnection.js";
// import {
//   authorizeRuntimeTargetLocation,
//   inspectorExclusionKey,
// } from "./JavaScriptRuntimeScope.js";
// import {
//   createInspectorExclusionCounts,
//   describeInspectorTargetLimitations,
//   finalizeInspectorCapture,
// } from "./V8InspectorCaptureProjection.js";
// import {
//   discoverV8Inspector,
//   type AuthorizedV8InspectorTarget,
//   type V8InspectorTarget,
// } from "./V8InspectorEndpoint.js";
//
// import { V8_INSPECTOR_PROVIDER_IDENTITY } from "./providerIdentity.js";
//
// /** Maximum decoded CDP message accepted while observing one Inspector target. */
// export const INSPECTOR_MAX_PAYLOAD_BYTES = 16 * 1024 * 1024;
// /** Aggregate retained metadata budget, including an estimate of JS object overhead. */
// export const INSPECTOR_MAX_RETAINED_METADATA_BYTES = 8 * 1024 * 1024;
// const RETAINED_OBJECT_OVERHEAD_BYTES = 512;
//
// export interface ScriptDraft {
//   readonly rawUrl: string;
//   readonly executionContextKey: string | null;
//   readonly cdpHash: string | null;
//   readonly length: number | null;
//   readonly isModule: boolean | null;
// }
//
// export interface ContextDraft {
//   readonly contextKey: string;
//   state: "created" | "destroyed" | "cleared";
//   readonly name: string | null;
//   readonly origin: string | null;
// }
//
// export interface CaptureState {
//   readonly scripts: ScriptDraft[];
//   readonly contexts: Map<string, ContextDraft>;
//   eventsObserved: number;
//   eventsRetained: number;
//   eventsDropped: number;
//   metadataBytes: number;
//   scriptsObserved: number;
//   invalidScripts: number;
//   truncated: boolean;
//   readonly truncationReasons: Set<string>;
// }
//
// /** Attach-only provider; sends only Runtime.enable and Debugger.enable. */
// export class V8InspectorProvider implements JavaScriptRuntimeObservationPort {
//   identity(): ProviderIdentity {
//     return V8_INSPECTOR_PROVIDER_IDENTITY;
//   }
//
//   async listTargets(
//     input: ListJavaScriptRuntimeTargetsInput,
//     options: ExecutionOptions = {},
//   ): Promise<Result<JavaScriptRuntimeTargetList, AnalysisError>> {
//     try {
//       const discovery = await discoverV8Inspector(
//         input.inspector_endpoint,
//         "list_javascript_runtime_targets",
//         options.signal,
//       );
//       const allowed: AuthorizedV8InspectorTarget[] = [];
//       const excluded = createInspectorExclusionCounts();
//       let unconnectable = 0;
//       for (const target of discovery.targets) {
//         const decision = await authorizeRuntimeTargetLocation(target.url, {
//           type: target.type,
//           product: discovery.runtime.product,
//         });
//         if (!decision.allowed) {
//           excluded[inspectorExclusionKey(decision.reason)] += 1;
//           continue;
//         }
//         if (decision.location.kind === "builtin") {
//           excluded.unsupported_location += 1;
//           continue;
//         }
//         if (target.webSocketUrl === null) {
//           unconnectable += 1;
//           continue;
//         }
//         allowed.push({
//           id: target.id,
//           type: target.type,
//           url: target.url,
//           attached: target.attached,
//           webSocketUrl: target.webSocketUrl,
//           location: decision.location,
//         });
//       }
//       allowed.sort((left, right) =>
//         left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
//       );
//       return ok(
//         javascriptRuntimeTargetListSchema.parse({
//           runtime: discovery.runtime,
//           targets: allowed.map(projectTarget),
//           excluded: { ...excluded, unconnectable },
//           limitations: describeInspectorTargetLimitations(
//             allowed.some((target) => target.attached === null),
//           ),
//         }),
//       );
//     } catch (cause: unknown) {
//       return err(providerError(cause, "list_javascript_runtime_targets"));
//     }
//   }
//
//   async observe(
//     input: ObserveJavaScriptRuntimeInput,
//     options: ExecutionOptions = {},
//   ): Promise<Result<JavaScriptRuntimeObservation, AnalysisError>> {
//     let connection: CdpConnection | undefined;
//     let discovery: Awaited<ReturnType<typeof discoverV8Inspector>> | undefined;
//     let target: AuthorizedV8InspectorTarget | undefined;
//     let state: CaptureState | undefined;
//     let primaryFailure: unknown;
//     let failed = false;
//     let cleanupFailure: unknown;
//     let cleanupFailed = false;
export const _l = 153;
