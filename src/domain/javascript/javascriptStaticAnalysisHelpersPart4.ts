export const __stub = 1;
//     (candidate) => name === candidate || name.endsWith(`.${candidate}`),
//   );
//   if (method !== undefined) {
//     const value = stringValue(args[0]);
//     // Only get and delete also belong to the keyed-collection APIs, whose
//     // keys are header, field, and parameter names rather than URLs or paths.
//     // Configuration `get` reads setting keys.
//     if (value === undefined) return undefined;
//     if (
//       (method === "get" || method === "delete") &&
//       !isRequestUrlOrPathLiteral(value) &&
//       (isKeyedCollectionReceiver(callee) ||
//         (method === "get" &&
//           (receiverFact === "configuration" ||
//             receiverFact === "extension-state")))
//     )
//       return undefined;
//     return {
//       kind: isRequestUrlReference(value) ? "endpoint" : "candidate",
//       value,
//     };
//   }
//   // Beacon URLs are endpoint observations, retaining the upstream API support.
//   if (name === "sendBeacon" || name.endsWith(".sendBeacon"))
//     return literal(stringValue(args[0]));
//   if (name === "loadURL" || name.endsWith(".loadURL"))
//     return literal(stringValue(args[0]));
//   return undefined;
// };
//
// /** Classify a recognized storage API call name. */
// export const storageKind = (
//   name: string,
// ): JavaScriptStaticStorage["kind"] | undefined => {
//   if (name.includes("localStorage.")) return "local-storage";
//   if (name.includes("sessionStorage.")) return "session-storage";
//   if (name.endsWith("indexedDB.open")) return "indexed-db";
//   if (name.endsWith("caches.open")) return "cache-storage";
//   if (name === "Database" || name.endsWith(".Database")) return "sqlite";
//   return undefined;
// };
//
// /** Produce a dotted callee name through type-erased expression wrappers. */
// export const calleeName = (node: t.Node): string => {
//   node = unwrapJavaScriptExpression(node).node;
//   const segments: string[] = [];
//   while (t.isMemberExpression(node) || t.isOptionalMemberExpression(node)) {
//     // Dynamic keys retain their syntax identity instead of inventing a name.
//     segments.push(memberPropertyName(node));
//     if (!t.isNode(node.object)) break;
//     node = unwrapJavaScriptExpression(node.object).node;
//   }
//   const base = t.isIdentifier(node)
//     ? node.name
//     : t.isImport(node)
//       ? "import"
//       : "";
//   segments.push(base);
//   segments.reverse();
//   const first = segments.findIndex((segment) => segment !== "");
//   return first === -1 ? "" : segments.slice(first).join(".");
// };
//
// /** Read a member property only when its syntax commits an exact name. */
// const memberPropertyName = (
//   node: t.MemberExpression | t.OptionalMemberExpression,
// ): string =>
//   semanticStaticPropertyKey(node.property, node.computed) ??
//   (node.computed ? `[computed@${String(node.property.start ?? -1)}]` : "");
//
// /**
//  * Return a string literal value without evaluating an expression. A template
//  * literal without substitutions denotes the same exact string.
//  */
// export const stringValue = (
//   node: t.Node | null | undefined,
// ): string | undefined => {
//   if (node === null || node === undefined) return undefined;
//   const literal = readExactJavaScriptLiteral(node);
//   return literal.found && typeof literal.value === "string"
//     ? literal.value
//     : undefined;
// };
//
// /** Return a string or numeric argument literal. */
// export const argumentValue = (
//   node: t.Node | null | undefined,
// ): string | undefined =>
//   t.isNumericLiteral(node) ? String(node.value) : stringValue(node);
//
// /** Prefix a static argument value when one is available. */
// export const prefixedArgument = (
//   prefix: string,
//   node: t.Node | null | undefined,
// ): string | undefined => {
//   const value = argumentValue(node);
//   return value === undefined ? undefined : `${prefix}${value}`;
// };
//
// /** Retain the exact source span represented by an AST node. */
// export const sourceSlice = (source: string, node: t.Node): string =>
//   typeof node.start !== "number" || typeof node.end !== "number"
//     ? ""
//     : source.slice(node.start, node.end);
//
// /** Convert Babel locations into the stable graph source-range shape. */
// export const range = (node: t.Node): JavaScriptSourceRange => ({
//   start: {
//     line: node.loc?.start.line ?? 1,
//     column: node.loc?.start.column ?? 0,
//   },
//   end: {
//     line: node.loc?.end.line ?? node.loc?.start.line ?? 1,
//     column: node.loc?.end.column ?? node.loc?.start.column ?? 0,
//   },
// });
//
// /** Convert exact text offsets into a source range. */
// export const rangeForOffsets = (
//   source: string,
//   start: number,
//   end: number,
// ): JavaScriptSourceRange => ({
//   start: pointForOffset(source, start),
//   end: pointForOffset(source, end),
// });
//
// /** Compare two exact source ranges. */
// export const sourceRangesEqual = (
//   left: JavaScriptSourceRange | null,
//   right: JavaScriptSourceRange,
// ): boolean =>
//   left !== null &&
//   left.start.line === right.start.line &&
//   left.start.column === right.start.column &&
//   left.end.line === right.end.line &&
//   left.end.column === right.end.column;
//
// const pointForOffset = (source: string, offset: number) => {
//   const before = source.slice(0, offset);
//   // Match JavaScript line terminators, treating CRLF as a single newline.
//   const lines = before.split(/\r\n|[\n\r\u2028\u2029]/u);
//   return { line: lines.length, column: lines.at(-1)?.length ?? 0 };
// };
//
// /** Observe known bundler/framework marker strings without claiming dependency use. */
// export const detectVendors = (source: string): string[] =>
//   vendorPatterns.flatMap(({ name, patterns }) =>
//     patterns.some((pattern) => source.includes(pattern)) ? [name] : [],
//   );
//
// /** Commit the static semantic content used to deduplicate registrations. */
// export const registrationKey = (
//   registration: JavaScriptBundlerRegistration,
// ): string =>
//   // Collision-free tuple: chunk/module keys are variable-length source-derived
//   // lists, so NUL-joins would collapse ["a\0b"] with ["a", "b"].
//   compositeKey([
//     registration.runtime,
//     registration.chunk_keys,
//     String(registration.unknown_chunk_keys),
//     // Equal factory tables can be registered with different runtime callbacks.
//     // Both early collection and finalization must retain those recovered facts.
//     registration.runtime_require_name,
//     registration.runtime_module_cache_status,
//     registration.entry_module_keys,
//     String(registration.unknown_entry_module_keys),
//     registration.async_chunk_keys,
//     String(registration.unknown_async_chunk_keys),
//     registration.modules.map(({ module_key: key, source_sha256: digest }) => [
//       key,
//       digest,
//     ]),
//   ]);
//
// /** Sort values by a deterministic unique semantic key. */
// export const sortedUnique = <Value>(
//   values: readonly Value[],
//   key: (value: Value) => string,
// ): Value[] =>
//   [...new Map(values.map((value) => [key(value), value])).values()].sort(
//     (left, right) => compareUnicodeCodePoints(key(left), key(right)),
//   );
//
// /** Hash exact UTF-8 source text. */
// export const sha256Text = (value: string): string =>
//   createHash("sha256").update(value).digest("hex");
//
// /** Recognized route-construction call suffixes. */
// export const STATIC_ROUTE_CALL_NAMES = [
//   "route",
//   "addRoute",
//   "useRoutes",
//   "createBrowserRouter",
//   "createHashRouter",
// ] as const;
//
// const vendorPatterns = [
//   { name: "webpack", patterns: ["__webpack_require__", "webpackChunk"] },
//   { name: "Rspack", patterns: ["__webpack_require__.f", "rspackChunk"] },
//   { name: "Vite", patterns: ["__vite__", "import.meta.hot"] },
//   { name: "Rollup", patterns: ["ROLLUP_FILE_URL", "import.meta.ROLLUP"] },
//   { name: "esbuild", patterns: ["__commonJS", "__esm"] },
//   { name: "React", patterns: ["React.createElement", "react/jsx-runtime"] },
//   { name: "Vue", patterns: ["__VUE__", "createApp("] },
//   { name: "Next.js", patterns: ["__NEXT_DATA__", "/_next/"] },
//   { name: "Angular", patterns: ["ɵɵdefineComponent"] },
//   { name: "Svelte", patterns: ["svelte/internal"] },
// ] as const;
export const _l = 209;
