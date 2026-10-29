export const __stub = 1;
//       parsed.username === "" &&
//       parsed.password === "" &&
//       allowedOrigins.includes(parsed.origin)
//     );
//   } catch (cause: unknown) {
//     // Non-URL input is not an approved source-map URL.
//     void cause;
//     return false;
//   }
// };
//
// const sourceMapContext = (
//   request: WebSourceMapRequest,
//   effectiveUrl: string | null = null,
// ) => ({
//   script_key: request.scriptKey,
//   declared_url: request.declaredUrl,
//   effective_url: effectiveUrl,
// });
//
// const emptySourceMapItem = (
//   request: WebSourceMapRequest,
//   status: Extract<SourceMapItem, { readonly artifact: null }>["status"],
//   limitation: string,
//   effectiveUrl: string | null = null,
// ): Extract<SourceMapItem, { readonly artifact: null }> => ({
//   ...sourceMapContext(request, effectiveUrl),
//   status,
//   artifact: null,
//   original_sources: [],
//   original_module_edges: [],
//   mappings: [],
//   limitation,
// });
//
// const sanitizeSource = (value: string): string => {
//   try {
//     return sanitizeBrowserUrl(new URL(value).href).url;
//   } catch (cause: unknown) {
//     // Non-URL sources are preserved verbatim.
//     void cause;
//     return value;
//   }
// };
//
// const preflightResolvedSourceBytes = (
//   leaves: readonly SourceMapLeaf[],
//   mapUrl: string,
//   budget: { readonly expandedBytes: number; resolvedSourceBytes: number },
//   resolvedByRoot: Map<string | null, Map<string, string>>,
//   sanitizedByResolved: Map<string, string>,
//   check: () => void,
// ): void => {
//   let estimate = budget.expandedBytes;
//   let resolvedBytes = budget.resolvedSourceBytes;
//   for (const { map } of leaves) {
//     let sourcesForRoot = resolvedByRoot.get(map.sourceRoot ?? null);
//     if (sourcesForRoot === undefined) {
//       sourcesForRoot = new Map();
//       resolvedByRoot.set(map.sourceRoot ?? null, sourcesForRoot);
//     }
//     for (const source of map.sources) {
//       check();
//       if (source === null) continue;
//       const sourceKey = source;
//       let resolved = sourcesForRoot.get(sourceKey);
//       if (resolved === undefined)
//         resolved = resolveJavaScriptSourceMapUrl(
//           source,
//           map.sourceRoot,
//           mapUrl,
//         );
//       const bytes = Buffer.byteLength(resolved, "utf8");
//       if (bytes > SOURCE_MAP_RESPONSE_BYTES - resolvedBytes)
//         throw resolvedSourceLimitFailure();
//       resolvedBytes += bytes;
//       sourcesForRoot.set(sourceKey, resolved);
//       const sanitized = cachedSanitized(sanitizedByResolved, resolved);
//       estimate += jsonBytes(sanitized);
//       if (estimate > WEB_SOURCE_MAP_LIMITS.outputBytes)
//         throw expandedOutputFailure();
//     }
//   }
//   budget.resolvedSourceBytes = resolvedBytes;
// };
//
// const consumeExpandedBytes = (
//   budget: { expandedBytes: number },
//   bytes: number,
// ): void => {
//   if (bytes > WEB_SOURCE_MAP_LIMITS.outputBytes - budget.expandedBytes)
//     throw expandedOutputFailure();
//   budget.expandedBytes += bytes;
// };
//
// const expandedOutputFailure = (): SourceMapFormatFailure =>
//   new SourceMapFormatFailure(
//     "limit",
//     `Expanded source-map evidence exceeds the ${WEB_SOURCE_MAP_LIMITS.outputBytes / (1024 * 1024)} MiB public representation budget.`,
//   );
//
// const sourceMapOutputError = (
//   cause: SourceMapFormatFailure,
//   options?: AnalysisErrorOptions,
// ): AnalysisResourceConstraintError =>
//   new AnalysisResourceConstraintError(
//     "analyze_web_bundle",
//     "transport",
//     cause.message,
//     { maximum_source_map_output_bytes: SOURCE_MAP_OUTPUT_BYTES },
//     { cause, ...options },
//   );
//
// const resolvedSourceLimitFailure = (): SourceMapFormatFailure =>
//   new SourceMapFormatFailure(
//     "limit",
//     `Resolved source-map identities exceed the ${SOURCE_MAP_RESPONSE_BYTES / (1024 * 1024)} MiB decoder representation budget.`,
//   );
//
// const jsonBytes = (value: string): number => {
//   let bytes = 0;
//   for (const part of jsonParts(value)) bytes += Buffer.byteLength(part, "utf8");
//   return bytes;
// };
//
// const artifactMetadataBytes = (mediaType: string, text: string): number =>
//   Buffer.byteLength(
//     JSON.stringify({
//       sha256: "0".repeat(64),
//       bytes: Buffer.byteLength(text),
//       media_type: mediaType,
//       charset: "utf-8",
//       text: "",
//     }),
//   ) - 2;
//
// // Price invariant envelopes once using the producer's representation. Dynamic
// // identities keep their own charges when the map's envelope changes.
// const EMPTY_SOURCE_MAP_FAILURE = emptySourceMapItem(
//   { scriptKey: "", declaredUrl: "", fetchUrl: "" },
//   "fetch_failed",
//   "x".repeat(SOURCE_MAP_FAILURE_LIMITATION_RESERVE),
// );
// const SOURCE_MAP_FAILURE_ENVELOPE_BYTES =
//   Buffer.byteLength(JSON.stringify(EMPTY_SOURCE_MAP_FAILURE)) - 4;
// const SOURCE_MAP_SUCCESS_ENVELOPE_BYTES =
//   Buffer.byteLength(
//     JSON.stringify({
//       ...EMPTY_SOURCE_MAP_FAILURE,
//       status: "included",
//       limitation: null,
//     }),
//   ) - 4;
//
// const sourceMapFailureReservation = (
//   request: WebSourceMapRequest,
//   effectiveUrl: string | null = null,
//   limitation?: string,
//   status: Extract<
//     SourceMapItem,
//     { readonly artifact: null }
//   >["status"] = "fetch_failed",
// ): number =>
//   SOURCE_MAP_FAILURE_ENVELOPE_BYTES +
//   jsonBytes(request.declaredUrl) +
//   jsonBytes(request.scriptKey) +
//   (effectiveUrl === null ? 0 : jsonBytes(effectiveUrl) - 4) +
//   Math.max(
//     0,
//     (limitation === undefined ? 0 : jsonBytes(limitation)) -
//       SOURCE_MAP_FAILURE_LIMITATION_RESERVE -
//       2,
//   ) +
//   jsonBytes(status) -
//   jsonBytes("fetch_failed");
//
// const sourceEntryOverheadBytes = (
//   sourceIndex: number,
//   declarationIndex: number,
// ): number =>
//   Buffer.byteLength(
//     `{"source_index":${String(sourceIndex)},"declaration_index":${String(declarationIndex)},"source":,"artifact":null}`,
//   );
//
// const cachedJsonBytes = (cache: Map<string, number>, value: string): number => {
//   const cached = cache.get(value);
//   if (cached !== undefined) return cached;
//   const bytes = jsonBytes(value);
//   cache.set(value, bytes);
//   return bytes;
// };
//
// const cachedSanitized = (cache: Map<string, string>, value: string): string => {
//   const cached = cache.get(value);
//   if (cached !== undefined) return cached;
//   const sanitized = sanitizeSource(value);
//   cache.set(value, sanitized);
//   return sanitized;
// };
//
// const mappingRowBytes = (
//   sourceIndex: number,
//   declarationIndex: number,
//   generatedLine: number,
//   generatedColumn: number,
//   originalLine: number,
//   originalColumn: number,
// ): number =>
//   Buffer.byteLength(
//     `{"source_index":${String(sourceIndex)},"declaration_index":${String(declarationIndex)},"generated_line":${String(generatedLine)},"generated_column":${String(generatedColumn)},"source":,"original_line":${String(originalLine)},"original_column":${String(originalColumn)},"name":}`,
//   );
//
// const resolveOriginalSource = (
//   specifier: string,
//   base: string,
// ): string | null => {
//   if (!isUrlLikeModuleSpecifier(specifier)) return null;
//   try {
//     return sanitizeSource(new URL(specifier, base).href);
//   } catch (cause: unknown) {
//     // Unresolvable source specifiers are represented by null.
//     void cause;
//     return null;
//   }
// };
//
// const sourceMediaType = (source: string | null): string =>
//   source?.endsWith(".ts") ||
//   source?.endsWith(".tsx") ||
//   source?.endsWith(".mts") ||
//   source?.endsWith(".cts")
//     ? "text/typescript"
//     : "text/javascript";
//
// const originalDependency = (
//   node: t.Node,
// ): {
//   readonly kind: ParsedSourceMapItem["original_module_edges"][number]["kind"];
//   readonly specifier: string;
//   readonly requireCallee?: t.Identifier;
// } | null => {
//   if (
//     t.isImportDeclaration(node) ||
//     t.isExportAllDeclaration(node) ||
//     t.isExportNamedDeclaration(node)
//   )
//     return node.source === null ||
//       node.source === undefined ||
//       (t.isImportDeclaration(node)
//         ? isTypeOnlyImportDeclaration(node)
//         : isTypeOnlyExportDeclaration(node))
//       ? null
//       : { kind: "static_import", specifier: node.source.value };
//   if (t.isImportExpression(node)) {
//     const specifier = stringValue(node.source);
//     return specifier === undefined
//       ? null
//       : { kind: "dynamic_import", specifier };
//   }
//   if (
//     (t.isCallExpression(node) || t.isOptionalCallExpression(node)) &&
//     t.isIdentifier(node.callee, { name: "require" })
//   ) {
//     const specifier = stringValue(node.arguments[0]);
//     return specifier === undefined
//       ? null
//       : { kind: "require", specifier, requireCallee: node.callee };
//   }
//   // `import x = require("m")` is only legal at module top level and always
//   // refers to the host loader, so it needs no unbound-`require` check. An
//   // entity-name alias or an erased `import type` declares no dependency.
//   if (t.isTSImportEqualsDeclaration(node)) {
//     const specifier = semanticImportEqualsSpecifier(node);
//     return specifier === null ? null : { kind: "require", specifier };
//   }
//   return null;
// };
export const _l = 277;
