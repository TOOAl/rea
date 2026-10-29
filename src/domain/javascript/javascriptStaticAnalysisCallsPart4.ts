export const __stub = 1;
//       node,
//       kind: "route",
//       value,
//       mechanism: `property:${key}`,
//     });
// };
//
// export const inspectRoleProperty = (
//   node: t.ObjectProperty,
//   context: FindingContext,
// ): void => {
//   if (semanticStaticPropertyName(node.key, node.computed) !== "preload") return;
//   if (context.accumulator.mediaElementPreloads.has(node)) return;
//   const path = staticPath(node.value);
//   if (path === undefined) return;
//   addLocatedFinding(context, {
//     collection: context.accumulator.roles,
//     key: `role\0preload\0${path}`,
//     node,
//     value: {
//       role: "preload",
//       path,
//       resolution_context: staticPathResolutionContext(node.value),
//       mechanism: "property:preload",
//       module_key: null,
//       location: range(node),
//     },
//   });
// };
//
// const inspectStorageCall = (
//   node: JavaScriptCallLike,
//   name: string,
//   first: string | undefined,
//   context: FindingContext,
// ): void => {
//   const receiverFact = context.openReceiverFacts?.get(node.start ?? -1);
//   const storage =
//     receiverFact === "local" ||
//     receiverFact === "local-indexed-db" ||
//     receiverFact === "local-cache-storage"
//       ? undefined
//       : receiverFact === "indexed-db"
//         ? "indexed-db"
//         : receiverFact === "cache-storage"
//           ? "cache-storage"
//           : storageKind(name);
//   if (storage === undefined) return;
//   addLocatedFinding(context, {
//     collection: context.accumulator.storage,
//     key: `storage\0${storage}\0${first ?? ""}`,
//     node,
//     value: {
//       kind: storage,
//       name: first ?? null,
//       mechanism: `call:${name}`,
//       module_key: null,
//       location: range(node),
//     },
//   });
// };
//
// export const addReference = (
//   context: FindingContext,
//   input: ReferenceInput,
// ): void => {
//   const specifier = input.specifier ?? null;
//   const reference =
//     specifier === null
//       ? {
//           specifier: null,
//           expression: sourceSlice(context.source, input.node),
//         }
//       : { specifier, expression: null };
//   addLocatedFinding(context, {
//     collection: context.accumulator.references,
//     key: `reference\0${input.kind}\0${reference.specifier ?? reference.expression}`,
//     node: input.node,
//     value: {
//       kind: input.kind,
//       ...reference,
//       module_key: null,
//       location: range(input.node),
//     },
//   });
// };
//
// const addEndpoint = (context: FindingContext, input: EndpointInput): void =>
//   addLocatedFinding(context, {
//     collection: context.accumulator.endpoints,
//     key: `endpoint\0${input.kind}\0${input.interpretation ?? "literal"}\0${input.value}`,
//     node: input.node,
//     value: {
//       kind: input.kind,
//       value: sanitizeEndpointCandidate(input.value),
//       mechanism: input.mechanism,
//       ...(input.interpretation === undefined
//         ? {}
//         : { interpretation: input.interpretation }),
//       module_key: null,
//       location: range(input.node),
//     },
//   });
//
// export const addSourceMapDirectives = (
//   source: string,
//   comments: readonly t.Comment[],
//   accumulator: AnalysisAccumulator,
// ): void => {
//   // Read real comment tokens only; quoted text can contain identical markers.
//   // Keep both current/legacy line annotations and minifier block annotations.
//   for (const comment of comments) {
//     const start = comment.start;
//     const end = comment.end;
//     if (
//       start === undefined ||
//       start === null ||
//       end === undefined ||
//       end === null
//     )
//       continue;
//     // The parser owns comment boundaries. Exclude only the closing block
//     // delimiter; an asterisk elsewhere remains part of the declared URL.
//     const commentSource = source.slice(
//       start,
//       comment.type === "CommentBlock" ? end - 2 : end,
//     );
//     if (
//       !(commentSource.startsWith("//") || commentSource.startsWith("/*")) ||
//       !(commentSource[2] === "#" || commentSource[2] === "@")
//     )
//       continue;
//     // Single-class searches avoid regex backtracking over unbounded whitespace
//     // or inline URLs, which can exhaust the engine stack on two-byte strings.
//     const nameOffset = commentSource.slice(3).search(/\S/u);
//     if (nameOffset === -1) continue;
//     const nameStart = 3 + nameOffset;
//     if (!commentSource.startsWith("sourceMappingURL", nameStart)) continue;
//     const nameEnd = nameStart + "sourceMappingURL".length;
//     const equalsOffset = commentSource.slice(nameEnd).search(/\S/u);
//     if (equalsOffset === -1) continue;
//     const equalsStart = nameEnd + equalsOffset;
//     if (!commentSource.startsWith("=", equalsStart)) continue;
//     const urlOffset = commentSource.slice(equalsStart + 1).search(/\S/u);
//     if (urlOffset === -1) continue;
//     const declaredStart = equalsStart + 1 + urlOffset;
//     const terminator = commentSource.slice(declaredStart).search(/\s/u);
//     const declaredEnd =
//       terminator === -1 ? commentSource.length : declaredStart + terminator;
//     if (declaredEnd === declaredStart) continue;
//     const declared = commentSource.slice(declaredStart, declaredEnd);
//     const location = rangeForOffsets(source, start, start + declaredEnd);
//     addFindingOnce(accumulator, `source-map\0${declared}`, () =>
//       accumulator.sourceMaps.push({ declared_url: declared, location }),
//     );
//   }
// };
export const _l = 157;
