export const __stub = 1;
// import * as t from "@babel/types";
// import {
//   decodeValidatedSourceMapLeaves,
//   isBeforeSourceMapLeafStop,
// } from "../javascript/sourceMaps/DecodedSourceMap.js";
//
// import { sanitizeBrowserUrl } from "../domain/browserObservation.js";
// import { AnalysisResourceConstraintError } from "../domain/analysisErrorCore.js";
// import type { AnalysisErrorOptions } from "../domain/analysisErrorBase.js";
// import { isUrlLikeModuleSpecifier } from "../domain/webBundleAnalyzerAst.js";
// import { analyzeParsedJavaScriptReferences } from "../domain/javascript/javascriptSemanticAnalysis.js";
// import { traverseJavaScriptAst } from "../domain/javascript/javascriptSemanticTraversal.js";
// import { parseJavaScriptSource } from "../domain/javascript/javascriptSourceParser.js";
// import {
//   isTypeOnlyExportDeclaration,
//   isTypeOnlyImportDeclaration,
//   semanticImportEqualsSpecifier,
// } from "../domain/javascript/javascriptModuleDeclaration.js";
// import { stringValue } from "../domain/javascript/javascriptStaticAnalysisHelpers.js";
// import type {
//   AnalyzeWebBundleInput,
//   WebSourceMapItem,
//   WebSourceMaps,
// } from "../domain/webBundleAnalysis.js";
// import { webSourceMapsSchema } from "../domain/webBundleAnalysis.js";
// import { createWebTextArtifact } from "../domain/webContentArtifact.js";
// import { safeParseJson } from "../domain/safeJson.js";
// import { sourceMapJsonText } from "../domain/sourceMapEnvelope.js";
// import { resolveJavaScriptSourceMapUrl } from "../domain/javascript/javascriptSourceMapPaths.js";
// import { jsonParts } from "../domain/jsonSerialization.js";
// import {
//   inspectSourceMapValue,
//   SourceMapFormatFailure,
//   type SourceMapLeaf,
// } from "../javascript/sourceMaps/SourceMapFormat.js";
// import { WEB_SOURCE_MAP_LIMITS } from "../domain/webSourceLocation.js";
//
// export interface WebSourceMapRequest {
//   readonly scriptKey: string;
//   readonly declaredUrl: string;
//   readonly fetchUrl: string;
// }
//
// interface SourceMapFetchHost {
//   readonly fetch: typeof fetch;
//   /** Fetch-operation deadline; injectable so boundary regressions stay fast. */
//   readonly timeoutMs?: number;
//   /** Maximum response bytes retained across this operation. */
//   readonly maxResponseBytes?: number;
// }
//
// // Source maps are normally fetched as a small part of a larger inspection.
// // Bound a stalled server to 30 seconds and bound raw map input retained for
// // parsing to 64 MiB per inspection. Both limits apply at the network boundary;
// // hitting either produces an explicit fetch_failed item, never truncated data.
// const SOURCE_MAP_FETCH_TIMEOUT_MS = 30_000;
// const SOURCE_MAP_RESPONSE_BYTES = 64 * 1024 * 1024;
// const SOURCE_MAP_OUTPUT_BYTES = WEB_SOURCE_MAP_LIMITS.outputBytes;
// const SOURCE_MAP_FAILURE_LIMITATION_RESERVE = 512;
// const SOURCE_MAP_COLLECTION_ENVELOPE_RESERVE = 1_024;
//
// type SourceMaps = WebSourceMaps;
// type SourceMapItem = WebSourceMapItem;
// type ParsedSourceMapItem = Extract<
//   SourceMapItem,
//   { status: "included" | "partial" }
// >;
// interface SourceMapDecodeContext {
//   readonly signal: AbortSignal | undefined;
//   readonly deadlineAt: number;
//   readonly budget: {
//     records: number;
//     expandedBytes: number;
//     resolvedSourceBytes: number;
//   };
// }
//
// /** Fetch and validate approved source maps without browser credentials. */
// export const fetchWebSourceMaps = async (
//   requests: readonly WebSourceMapRequest[],
//   input: AnalyzeWebBundleInput,
//   signal?: AbortSignal,
//   host: SourceMapFetchHost = { fetch: globalThis.fetch },
// ): Promise<SourceMaps> => {
//   throwIfAborted(signal);
//   if (requests.length === 0)
//     return webSourceMapsSchema.parse({
//       status: "not_requested",
//       requested: 0,
//       processed: 0,
//       items: [],
//     });
//   const items: SourceMapItem[] = [];
//   const operationController = new AbortController();
//   const timeout = setTimeout(
//     () => operationController.abort(new SourceMapDeadlineError()),
//     host.timeoutMs ?? SOURCE_MAP_FETCH_TIMEOUT_MS,
//   );
//   const abortFromCaller = (): void => operationController.abort(signal?.reason);
//   signal?.addEventListener("abort", abortFromCaller, { once: true });
//   const operationSignal = operationController.signal;
//   const deadlineAt =
//     performance.now() + (host.timeoutMs ?? SOURCE_MAP_FETCH_TIMEOUT_MS);
//   const budget = {
//     retainedBytes: 0,
//     deadlineAt,
//     decodedRecords: {
//       records: 0,
//       expandedBytes: SOURCE_MAP_COLLECTION_ENVELOPE_RESERVE,
//       resolvedSourceBytes: 0,
//     },
//   };
//   let limitation: string | undefined;
//   try {
//     for (const request of requests) {
//       if (signal?.aborted === true) throw signal.reason;
//       const reservation = sourceMapFailureReservation(request) + 1;
//       if (
//         reservation >
//         SOURCE_MAP_OUTPUT_BYTES - budget.decodedRecords.expandedBytes
//       ) {
//         limitation = sourceMapOutputLimitation(requests.length - items.length);
//         break;
//       }
//       const expandedBytesBeforeItem = budget.decodedRecords.expandedBytes;
//       budget.decodedRecords.expandedBytes += reservation;
//       if (operationSignal.aborted || performance.now() >= deadlineAt) {
//         items.push(
//           emptySourceMapItem(
//             request,
//             "fetch_failed",
//             "Source-map fetching exceeded its operation deadline.",
//           ),
//         );
//         continue;
//       }
//       const item = await fetchOne(
//         request,
//         input,
//         operationSignal,
//         host,
//         budget,
//       );
//       if (item.artifact === null) {
//         const failureBytes =
//           sourceMapFailureReservation(
//             request,
//             item.effective_url ?? null,
//             item.limitation,
//             item.status,
//           ) + 1;
//         if (failureBytes > SOURCE_MAP_OUTPUT_BYTES - expandedBytesBeforeItem) {
//           limitation = sourceMapOutputLimitation(
//             requests.length - items.length,
//           );
//           break;
//         }
//         budget.decodedRecords.expandedBytes =
//           expandedBytesBeforeItem + failureBytes;
//       }
//       items.push(item);
//     }
//   } catch (cause: unknown) {
//     if (signal?.aborted === true) throw cause;
//     if (cause instanceof SourceMapFormatFailure && cause.reason === "limit")
//       limitation = sourceMapOutputLimitation(requests.length - items.length);
//     else throw cause;
//   } finally {
//     clearTimeout(timeout);
//     signal?.removeEventListener("abort", abortFromCaller);
//   }
//   if (signal?.aborted === true) throw signal.reason;
//   return webSourceMapsSchema.parse({
//     status: sourceMapsStatus(items, limitation !== undefined),
//     requested: requests.length,
//     processed: items.length,
//     items,
//     ...(limitation === undefined ? {} : { limitation }),
//   });
// };
//
// const throwIfAborted = (signal?: AbortSignal): void => {
//   if (signal?.aborted === true) throw signal.reason;
// };
//
// const sourceMapOutputLimitation = (unprocessed: number): string =>
//   `source-map output budget could not retain results for ${String(unprocessed)} requested map${unprocessed === 1 ? "" : "s"}. their results are unknown.`;
//
// const sourceMapsStatus = (
//   items: readonly SourceMapItem[],
//   omitted: boolean,
// ): SourceMaps["status"] => {
//   const retained = items.filter(
//     ({ status }) => status === "included" || status === "partial",
//   ).length;
//   if (items.length === 0 || retained === 0) return "unavailable";
//   if (omitted) return "partial";
//   return retained === items.length &&
//     !items.some(({ status }) => status === "partial")
//     ? "included"
//     : "partial";
// };
//
// class SourceMapDeadlineError extends Error {
//   constructor() {
//     super("Source-map fetching exceeded its operation deadline.");
//     this.name = "SourceMapDeadlineError";
//   }
// }
//
// class SourceMapSizeLimitError extends Error {
//   constructor() {
//     super("Source-map response exceeded the retained-byte budget.");
//     this.name = "SourceMapSizeLimitError";
//   }
// }
//
// class SourceMapEncodingError extends Error {
//   constructor() {
//     super("Source-map response is not valid UTF-8.");
//     this.name = "SourceMapEncodingError";
//   }
// }
//
// class SourceMapRedirectLocationError extends Error {
//   constructor(url: string, location: string) {
//     super(
//       `Source-map redirect from ${JSON.stringify(url)} supplied an invalid Location URL: ${JSON.stringify(location)}.`,
//     );
//     this.name = "SourceMapRedirectLocationError";
//   }
// }
//
// const fetchOne = async (
//   request: WebSourceMapRequest,
//   input: AnalyzeWebBundleInput,
//   signal: AbortSignal | undefined,
//   host: SourceMapFetchHost,
//   budget: {
//     retainedBytes: number;
//     deadlineAt: number;
//     decodedRecords: {
//       records: number;
//       expandedBytes: number;
//       resolvedSourceBytes: number;
//     };
//   },
// ): Promise<SourceMapItem> => {
//   if (!approvedUrl(request.fetchUrl, input.allowed_origins))
//     return emptySourceMapItem(
//       request,
//       "policy_filtered",
//       "Declared source-map URL is outside the approved exact origins.",
//     );
//   let effectiveUrl: string | null = null;
//   try {
//     const fetched = await fetchFollowingApprovedRedirects(
//       request.fetchUrl,
//       input.allowed_origins,
//       signal,
//       host,
//       (url) => {
//         effectiveUrl = url;
//       },
//     );
//     if (fetched === undefined)
//       return emptySourceMapItem(
//         request,
//         "policy_filtered",
//         "A source-map redirect left the approved exact origins.",
//         effectiveUrl,
//       );
//     const { response, fetchedUrl } = fetched;
//     try {
//       // Admit the resolution identity before reading or retaining its body.
//       consumeExpandedBytes(budget.decodedRecords, jsonBytes(fetchedUrl) - 4);
//     } catch (cause: unknown) {
//       try {
export const _l = 278;
