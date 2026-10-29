export const __stub = 1;
//   return (
//     (name === "fileURLToPath" || name.endsWith(".fileURLToPath")) &&
//     isFileIdentity(argumentNode(node.arguments[0]))
//   );
// };
//
// const XHR_METHODS = new Set([
//   "CONNECT",
//   "DELETE",
//   "GET",
//   "HEAD",
//   "OPTIONS",
//   "PATCH",
//   "POST",
//   "PUT",
//   "TRACE",
// ]);
//
// /** Legacy URL/path shapes that bypass the overloaded lookup exclusions. */
// const isRequestUrlOrPathLiteral = (value: string): boolean =>
//   /^(?:https?|wss?):\/\//iu.test(value) ||
//   value.startsWith("/") ||
//   value.startsWith("./") ||
//   value.startsWith("../");
//
// /** Explicit request references, classified after receiver-specific exclusions. */
// const isRequestUrlReference = (value: string): boolean => {
//   if (
//     isRequestUrlOrPathLiteral(value) ||
//     value.startsWith("?") ||
//     value.startsWith("#")
//   )
//     return true;
//   // WHATWG accepts HTTP/WS scheme forms without authority slashes. Parse
//   // without a base so bare keys stay ambiguous, and keep the source spelling.
//   if (!/^(?:https?|wss?):/iu.test(value)) return false;
//   return URL.parse(value) !== null;
// };
//
// /**
//  * Browsing-context and document `open` take a URL or type first and a target
//  * name second. The name is only a spelling, since `parent` or `self` may be a
//  * local XHR binding, so it never overrides a literal HTTP method.
//  */
// const WINDOW_OPEN_CALL =
//   /(?:^|\.)(?:window|self|globalThis|top|parent|opener|frames|document)\.open$/u;
//
// /** Node `fs.open` flag strings, which are never request URLs. */
// const FS_OPEN_FLAGS = new Set([
//   "a",
//   "a+",
//   "as",
//   "as+",
//   "ax",
//   "ax+",
//   "r",
//   "r+",
//   "rs",
//   "rs+",
//   "sa",
//   "sa+",
//   "sr",
//   "sr+",
//   "w",
//   "w+",
//   "wx",
//   "wx+",
//   "xa",
//   "xa+",
//   "xw",
//   "xw+",
// ]);
//
// /** Reserved browsing-context names (ASCII case-insensitive). */
// const BROWSING_CONTEXT_KEYWORDS = new Set([
//   "_blank",
//   "_parent",
//   "_self",
//   "_top",
// ]);
//
// /**
//  * Read `XMLHttpRequest.open(method, url)`. `fs.open(path, "r")` and
//  * `window.open(url, "_blank")` share the callee name. A literal method must
//  * be an HTTP method; with a computed method, the second literal is a URL
//  * unless it is provably an fs flag or a browsing-context keyword, or the
//  * receiver is spelled as a browsing context or storage. XHR normalizes the standard
//  * methods' case; extension methods such as WebDAV `PROPFIND` are
//  * conventionally uppercase tokens.
//  */
// const xhrOpenUrl = (
//   name: string,
//   methodNode: t.Node | null | undefined,
//   urlNode: t.Node | null | undefined,
//   receiverFact?: JavaScriptOpenReceiverFact,
// ): string | undefined => {
//   const url = stringValue(urlNode);
//   if (url === undefined) return undefined;
//   // A lexical fact is stronger than the receiver's spelling. In particular,
//   // browser Window and Document globals overload `open` with URL/content APIs.
//   if (receiverFact === "window") return undefined;
//   const method = stringValue(methodNode);
//   // IndexedDB and Cache Storage `open` take a name and a version, so a
//   // receiver spelled as storage needs a standard HTTP method literal.
//   const storage =
//     receiverFact === "local-indexed-db" ||
//     receiverFact === "local-cache-storage" ||
//     receiverFact === "indexed-db" ||
//     receiverFact === "cache-storage" ||
//     storageKind(name) !== undefined;
//   if (method === undefined)
//     return storage ||
//       (receiverFact === undefined && WINDOW_OPEN_CALL.test(name)) ||
//       FS_OPEN_FLAGS.has(url) ||
//       BROWSING_CONTEXT_KEYWORDS.has(url.toLowerCase())
//       ? undefined
//       : url;
//   return XHR_METHODS.has(method.toUpperCase()) ||
//     ((!storage ||
//       receiverFact === "local-indexed-db" ||
//       receiverFact === "local-cache-storage") &&
//       /^[A-Z][A-Z-]*$/u.test(method))
//     ? url
//     : undefined;
// };
//
// const KEYED_COLLECTION_CONSTRUCTORS = new Set([
//   "FormData",
//   "Headers",
//   "Map",
//   "Set",
//   "URLSearchParams",
//   "WeakMap",
//   "WeakSet",
// ]);
//
// /**
//  * Whether a get/delete receiver is spelled as a keyed collection: a
//  * constructed Map, Set, Headers, FormData, or URLSearchParams, or a
//  * `headers`/`searchParams` property. Spelling alone does not prove the
//  * binding, so callers keep URL and path literals as requests.
//  */
// const isKeyedCollectionReceiver = (callee: t.Node): boolean => {
//   callee = unwrapJavaScriptExpression(callee).node;
//   if (!t.isMemberExpression(callee) && !t.isOptionalMemberExpression(callee))
//     return false;
//   const receiver = unwrapJavaScriptExpression(callee.object).node;
//   if (t.isNewExpression(receiver)) {
//     const constructor = unwrapJavaScriptExpression(receiver.callee).node;
//     return (
//       t.isIdentifier(constructor) &&
//       KEYED_COLLECTION_CONSTRUCTORS.has(constructor.name)
//     );
//   }
//   if (
//     !t.isMemberExpression(receiver) &&
//     !t.isOptionalMemberExpression(receiver)
//   )
//     return false;
//   const property = semanticStaticPropertyName(
//     receiver.property,
//     receiver.computed,
//   );
//   return (
//     property === "headers" ||
//     property === "headersList" ||
//     property === "searchParams"
//   );
// };
//
// /** A literal endpoint shape or an ambiguous argument of an HTTP-method-named call. */
// export interface JavaScriptEndpointArgument {
//   readonly kind: "endpoint" | "candidate";
//   readonly value: string;
// }
//
// /** Classify one literal without treating a generic method name as network identity. */
// export const endpointArgument = (
//   name: string,
//   args: readonly (
//     | t.Expression
//     | t.SpreadElement
//     | t.JSXNamespacedName
//     | t.ArgumentPlaceholder
//   )[],
//   callee: t.Node,
//   receiverFact?: JavaScriptOpenReceiverFact,
// ): JavaScriptEndpointArgument | undefined => {
//   const literal = (
//     value: string | undefined,
//   ): JavaScriptEndpointArgument | undefined =>
//     value === undefined ? undefined : { kind: "endpoint", value };
//   if (receiverFact === "window") return undefined;
//   if (
//     name === "fetch" ||
//     name.endsWith(".fetch") ||
//     name === "WebSocket" ||
//     name === "EventSource" ||
//     name.endsWith(".EventSource")
//   )
//     return literal(stringValue(args[0]));
//   if (name.endsWith(".open")) {
//     const value = xhrOpenUrl(name, args[0], args[1], receiverFact);
//     if (value === undefined) return undefined;
//     return {
//       kind:
//         stringValue(args[0]) !== undefined || isRequestUrlReference(value)
//           ? "endpoint"
//           : "candidate",
//       value,
//     };
//   }
//   const method = ["get", "post", "put", "patch", "delete", "request"].find(
export const _l = 213;
