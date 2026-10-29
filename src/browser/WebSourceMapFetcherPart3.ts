export const __stub = 1;
//       check,
//     });
//     context.budget.expandedBytes =
//       retainedBytesBeforeMap -
//       SOURCE_MAP_FAILURE_ENVELOPE_BYTES +
//       SOURCE_MAP_SUCCESS_ENVELOPE_BYTES;
//     consumeExpandedBytes(
//       context.budget,
//       jsonBytes(text) +
//         artifactMetadataBytes("application/source-map+json", text) -
//         4,
//     );
//     const sourcesByRaw = new Map<string, string>();
//     const resolvedByRoot = new Map<string | null, Map<string, string>>();
//     preflightResolvedSourceBytes(
//       inspected.leaves,
//       fetchedUrl,
//       context.budget,
//       resolvedByRoot,
//       sourcesByRaw,
//       check,
//     );
//     check();
//     const decoded = decodeValidatedSourceMapLeaves(
//       inspected.leaves,
//       fetchedUrl,
//       check,
//     );
//     const sourceJsonBytes = new Map<string, number>();
//     const nameJsonBytes = new Map<string, number>();
//     const originalSources: ParsedSourceMapItem["original_sources"] = [];
//     let declarationIndex = 0;
//     for (const { leaf, resolvedSources } of decoded) {
//       for (const [index, rawSource] of leaf.map.sources.entries()) {
//         if ((index & 255) === 0) check();
//         const resolved =
//           rawSource === null ? null : (resolvedSources[index] ?? null);
//         const sanitized =
//           resolved === null ? null : cachedSanitized(sourcesByRaw, resolved);
//         const content = leaf.map.sourcesContent?.[index] ?? null;
//         consumeExpandedBytes(
//           context.budget,
//           (sanitized === null
//             ? 4
//             : cachedJsonBytes(sourceJsonBytes, sanitized)) +
//             sourceEntryOverheadBytes(index, declarationIndex) +
//             (originalSources.length === 0 ? 0 : 1) +
//             (content === null
//               ? 0
//               : jsonBytes(content) +
//                 artifactMetadataBytes(sourceMediaType(rawSource), content) -
//                 4),
//         );
//         originalSources.push({
//           source_index: index,
//           declaration_index: declarationIndex++,
//           source: sanitized,
//           artifact:
//             content === null
//               ? null
//               : createWebTextArtifact(content, sourceMediaType(rawSource)),
//         });
//       }
//     }
//     const mappings: ParsedSourceMapItem["mappings"] = [];
//     declarationIndex = 0;
//     for (const { leaf, rows, resolvedSources } of decoded) {
//       const declarationBase = declarationIndex;
//       declarationIndex += leaf.map.sources.length;
//       for (const [line, row] of rows.entries()) {
//         if ((line & 255) === 0) check();
//         for (const segment of row) {
//           if (!isBeforeSourceMapLeafStop(leaf, line, segment[0])) continue;
//           if (segment.length === 1) continue;
//           const rawSource = leaf.map.sources[segment[1]];
//           if (rawSource === undefined) continue;
//           const resolved =
//             rawSource === null ? null : (resolvedSources[segment[1]] ?? null);
//           const source =
//             resolved === null ? null : cachedSanitized(sourcesByRaw, resolved);
//           const name =
//             segment.length === 5 ? (leaf.map.names[segment[4]] ?? null) : null;
//           const generatedLine = leaf.offset.line + line + 1;
//           const generatedColumn =
//             segment[0] + (line === 0 ? leaf.offset.column : 0);
//           consumeExpandedBytes(
//             context.budget,
//             (source === null ? 4 : cachedJsonBytes(sourceJsonBytes, source)) +
//               (name === null ? 4 : cachedJsonBytes(nameJsonBytes, name)) +
//               mappingRowBytes(
//                 segment[1],
//                 declarationBase + segment[1],
//                 generatedLine,
//                 generatedColumn,
//                 segment[2] + 1,
//                 segment[3],
//               ) +
//               (mappings.length === 0 ? 0 : 1),
//           );
//           mappings.push({
//             source_index: segment[1],
//             declaration_index: declarationBase + segment[1],
//             generated_line: generatedLine,
//             generated_column: generatedColumn,
//             source,
//             original_line: segment[2] + 1,
//             original_column: segment[3],
//             name,
//           });
//         }
//       }
//     }
//     const modules = originalModuleEdges(originalSources, check, (edge) =>
//       consumeExpandedBytes(
//         context.budget,
//         Buffer.byteLength(JSON.stringify(edge)) + 1,
//       ),
//     );
//     check();
//     if (modules.incomplete.length > 0)
//       consumeExpandedBytes(
//         context.budget,
//         jsonBytes(
//           `Module edges are incomplete: ${modules.incomplete.length} of ${originalSources.filter(({ artifact }) => artifact !== null).length} original sources could not be parsed in full (${modules.incomplete.join(", ")}).`,
//         ) - 4,
//       );
//     const parsed = {
//       ...sourceMapContext(request, fetchedUrl),
//       artifact: createWebTextArtifact(text, "application/source-map+json"),
//       original_sources: originalSources,
//       original_module_edges: modules.edges,
//       mappings,
//     };
//     check();
//     return modules.incomplete.length === 0
//       ? { ...parsed, status: "included", limitation: null }
//       : {
//           ...parsed,
//           status: "partial",
//           limitation: `Module edges are incomplete: ${modules.incomplete.length} of ${originalSources.filter(({ artifact }) => artifact !== null).length} original sources could not be parsed in full (${modules.incomplete.join(", ")}).`,
//         };
//   } catch (cause: unknown) {
//     // Failed maps publish no artifact or mapping rows. Release their output
//     // reservation while keeping cumulative fetch and decoder-work accounting.
//     context.budget.expandedBytes = retainedBytesBeforeMap;
//     if (cause instanceof SourceMapFormatFailure && cause.reason === "limit")
//       return emptySourceMapItem(
//         request,
//         "fetch_failed",
//         cause.message,
//         fetchedUrl,
//       );
//     if (
//       context.signal?.aborted === true ||
//       cause instanceof SourceMapDeadlineError
//     )
//       throw cause;
//     return emptySourceMapItem(
//       request,
//       "invalid",
//       "Source-map JSON mappings could not be decoded safely.",
//       fetchedUrl,
//     );
//   }
// };
//
// interface OriginalModuleEdges {
//   readonly edges: ParsedSourceMapItem["original_module_edges"];
//   /** Original sources whose dependency edges may be incomplete. */
//   readonly incomplete: readonly string[];
// }
//
// const originalModuleEdges = (
//   sources: ParsedSourceMapItem["original_sources"],
//   check: () => void,
//   beforeEdge: (
//     edge: ParsedSourceMapItem["original_module_edges"][number],
//   ) => void,
// ): OriginalModuleEdges => {
//   const edges: ParsedSourceMapItem["original_module_edges"] = [];
//   const seen = new Set<string>();
//   const incomplete: string[] = [];
//   for (const source of sources) {
//     check();
//     if (source.artifact === null) continue;
//     const sourceName = source.source;
//     if (sourceName === null) {
//       incomplete.push(
//         `unnamed source at declaration ${String(source.declaration_index)}`,
//       );
//       continue;
//     }
//     const parsed = parseJavaScriptSource(
//       source.artifact.text,
//       sourceParserPath(sourceName),
//     );
//     check();
//     if (parsed === null) {
//       incomplete.push(sourceName);
//       continue;
//     }
//     // A recovered program still yields the imports it did parse, but nodes
//     // after an unrecoverable point are missing, so the edges are a subset.
//     if (parsed.errors.length > 0) incomplete.push(sourceName);
//     let unboundRequires: ReadonlySet<string> | undefined;
//     traverseJavaScriptAst(parsed, {
//       enter: (node) => {
//         check();
//         const dependency = originalDependency(node);
//         if (dependency === null) return;
//         const { kind, specifier, requireCallee } = dependency;
//         if (requireCallee !== undefined) {
//           unboundRequires ??= new Set(
//             analyzeParsedJavaScriptReferences(parsed, "require")
//               .filter(
//                 ({ role, resolution }) =>
//                   role === "read" && resolution === "unbound",
//               )
//               .map(
//                 ({ location }) =>
//                   `${String(location.start.line)}:${String(location.start.column)}`,
//               ),
//           );
//           const location = requireCallee.loc?.start;
//           if (
//             location === undefined ||
//             !unboundRequires.has(
//               `${String(location.line)}:${String(location.column)}`,
//             )
//           )
//             return;
//         }
//         const key = `${sourceName}\0${kind}\0${specifier}`;
//         if (seen.has(key)) return;
//         seen.add(key);
//         const edge = {
//           from_source: sourceName,
//           kind,
//           specifier,
//           resolved_source: resolveOriginalSource(specifier, sourceName),
//         };
//         beforeEdge(edge);
//         edges.push(edge);
//       },
//     });
//   }
//   return { edges, incomplete };
// };
//
// /** Select parser semantics from the source URL path, excluding query/fragment. */
// const sourceParserPath = (source: string): string => {
//   try {
//     return new URL(source).pathname;
//   } catch (cause: unknown) {
//     // Unresolved source identities can still carry a useful relative path.
//     void cause;
//     return source;
//   }
// };
//
// const checkOperation = (
//   callerSignal: AbortSignal | undefined,
//   operationSignal: AbortSignal | undefined,
//   deadlineAt: number,
// ): void => {
//   if (callerSignal?.aborted === true) throw callerSignal.reason;
//   if (operationSignal?.aborted === true) throw operationSignal.reason;
//   if (performance.now() >= deadlineAt) throw new SourceMapDeadlineError();
// };
//
// const approvedUrl = (
//   value: string,
//   allowedOrigins: readonly string[],
// ): boolean => {
//   try {
//     const parsed = new URL(value);
//     return (
//       (parsed.protocol === "http:" || parsed.protocol === "https:") &&
export const _l = 278;
