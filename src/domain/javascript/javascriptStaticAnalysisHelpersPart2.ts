export const __stub = 1;
//   return text.startsWith("/") ? posix.join(".", text) : undefined;
// };
//
// const staticCallPath = (
//   node: t.CallExpression | t.NewExpression,
// ): string | undefined => {
//   const name = calleeName(node.callee);
//   if (name === "URL" || name.endsWith(".URL"))
//     return isFileIdentity(argumentNode(node.arguments[1]))
//       ? stringValue(node.arguments[0])
//       : undefined;
//   if (name === "fileURLToPath" || name.endsWith(".fileURLToPath")) {
//     return staticFileUrlPath(node);
//   }
//   if (name.endsWith(".resolve"))
//     return name === "win32.resolve" || name.endsWith(".win32.resolve")
//       ? undefined
//       : staticResolvedPath(node);
//   if (!name.endsWith(".join") && name !== "join") return undefined;
//   const parts: string[] = [];
//   for (const argument of node.arguments) {
//     if (isDirectoryIdentity(argumentNode(argument))) {
//       // join never resets at an absolute segment, so `/preload.js` after the
//       // source directory stays inside it.
//       parts.push(".");
//       continue;
//     }
//     const value = t.isNode(argument) ? staticPath(argument) : undefined;
//     if (value === undefined) return undefined;
//     parts.push(value);
//   }
//   return parts.length === 0 ? undefined : posix.join(...parts);
// };
//
// const staticFileUrlPath = (
//   node: t.CallExpression | t.NewExpression,
// ): string | undefined => {
//   if (node.arguments.length !== 1) return undefined;
//   const rawArgument = argumentNode(node.arguments[0]);
//   if (rawArgument === undefined) return undefined;
//   const argument = unwrapJavaScriptExpression(rawArgument).node;
//   if (isSourceFileUrl(argument)) return sourceRelativeFileUrlPath(argument);
//   const value = staticPath(argument);
//   const rawPath = value?.split(/[?#]/u, 1)[0] ?? "";
//   if (
//     value === undefined ||
//     !/^file:/iu.test(value) ||
//     value !== value.trim() ||
//     value.includes("\\") ||
//     [...value].some((character) => character.charCodeAt(0) < 32) ||
//     /%(?:2f|5c)/iu.test(rawPath)
//   )
//     return undefined;
//   try {
//     const url = new URL(value);
//     if (url.protocol !== "file:") return undefined;
//     // Canonical analysis paths use POSIX spelling so results do not depend on
//     // the analyzer host. Drive and UNC paths need an explicit target platform.
//     const path = fileURLToPath(url, { windows: false });
//     return /^\/[a-z]:/iu.test(path) ? undefined : path;
//   } catch (cause: unknown) {
//     void cause;
//     return undefined;
//   }
// };
//
// /** Project a known source-relative URL through the actual file URL decoder. */
// const sourceRelativeFileUrlPath = (
//   node: t.CallExpression | t.NewExpression,
// ): string | undefined => {
//   const value = stringValue(node.arguments[0]);
//   if (
//     value === undefined ||
//     (value.split(/[?#]/u, 1)[0] ?? "") === "" ||
//     value !== value.trim() ||
//     value.includes("\\") ||
//     [...value].some((character) => character.charCodeAt(0) < 32) ||
//     /^[a-z][a-z0-9+.-]*:/iu.test(value) ||
//     value.startsWith("//") ||
//     /%(?:2e|2f|5c)/iu.test(value.split(/[?#]/u, 1)[0] ?? "")
//   )
//     return undefined;
//   // A sufficiently deep inert anchor preserves any leading parent segments
//   // without using this host's cwd or inventing the application's directory.
//   const directory = `/${"source/".repeat(value.split("/").length + 1)}`;
//   try {
//     const resolved = new URL(value, `file://${directory}entry.js`);
//     const path = fileURLToPath(resolved, { windows: false });
//     if (value.startsWith("/")) return path;
//     const relative = posix.relative(directory, path) || ".";
//     // Keep the established explicit source-directory observation spelling.
//     return value.startsWith("./") &&
//       relative !== "." &&
//       !relative.startsWith("../")
//       ? `./${relative}`
//       : relative;
//   } catch (cause: unknown) {
//     // Malformed escapes and non-file URL forms remain unknown.
//     void cause;
//     return undefined;
//   }
// };
//
// const isSourceFileUrl = (
//   node: t.Node,
// ): node is t.CallExpression | t.NewExpression =>
//   (t.isCallExpression(node) || t.isNewExpression(node)) &&
//   (calleeName(node.callee) === "URL" ||
//     calleeName(node.callee).endsWith(".URL")) &&
//   isFileIdentity(argumentNode(node.arguments[1]));
//
// const staticResolvedPath = (
//   node: t.CallExpression | t.NewExpression,
// ): string | undefined => {
//   const parts: (string | null)[] = [];
//   for (const argument of node.arguments) {
//     if (isDirectoryIdentity(argumentNode(argument))) {
//       parts.push(null);
//       continue;
//     }
//     const value = t.isNode(argument) ? staticPath(argument) : undefined;
//     // Validate every argument, including those before the last anchor.
//     if (value === undefined) return undefined;
//     parts.push(value);
//   }
//   const anchor = parts.findLastIndex(
//     (part) => part === null || posix.isAbsolute(part),
//   );
//   // Relative-only calls depend on the target process cwd, which is unknown.
//   if (anchor === -1) return undefined;
//   // A null anchor is the source directory; preserve its relative projection.
//   const path = posix.join(
//     ...parts.slice(anchor).filter((part) => part !== null),
//   );
//   return path === "/" ? path : path.replace(/\/$/u, "");
// };
//
// const isFilesystemPathExpression = (node: t.Node): boolean => {
//   node = unwrapJavaScriptExpression(node).node;
//   const value = stringValue(node);
//   if (value !== undefined) return value.startsWith("/");
//   if (isFileIdentity(node) || isDirectoryIdentity(node)) return true;
//   if (t.isBinaryExpression(node, { operator: "+" }))
//     return (
//       isFilesystemPathExpression(node.left) ||
//       isFilesystemPathExpression(node.right)
//     );
//   if (t.isCallExpression(node) || t.isNewExpression(node)) {
//     const name = calleeName(node.callee);
//     if (name.endsWith(".resolve") && staticCallPath(node) !== undefined)
//       return true;
//     if (name === "URL" || name.endsWith(".URL"))
//       return isFileIdentity(argumentNode(node.arguments[1]));
//     if (name === "fileURLToPath" || name.endsWith(".fileURLToPath"))
//       return (
//         staticFileUrlPath(node) !== undefined ||
//         node.arguments.some((argument) => {
//           const value = argumentNode(argument);
//           return value !== undefined && isFilesystemPathExpression(value);
//         })
//       );
//     return node.arguments.some((argument) => {
//       const value = argumentNode(argument);
//       return value !== undefined && isFilesystemPathExpression(value);
//     });
//   }
//   return false;
// };
//
// const isDirectoryIdentity = (node: t.Node | undefined): boolean => {
//   if (node !== undefined) node = unwrapJavaScriptExpression(node).node;
//   if (isDirectoryPath(node)) return true;
//   if (!t.isCallExpression(node) && !t.isNewExpression(node)) return false;
//   const name = calleeName(node.callee);
//   return (
//     (name === "URL" || name.endsWith(".URL")) &&
//     isFileIdentity(argumentNode(node.arguments[1]))
//   );
// };
//
// /** `__dirname` or the dirname of the source file, as a string. */
// const isDirectoryPath = (node: t.Node | undefined): boolean => {
//   if (node !== undefined) node = unwrapJavaScriptExpression(node).node;
//   if (t.isIdentifier(node, { name: "__dirname" })) return true;
//   if (!t.isCallExpression(node)) return false;
//   const name = calleeName(node.callee);
//   return (
//     (name === "dirname" || name.endsWith(".dirname")) &&
//     isFileIdentity(argumentNode(node.arguments[0]))
//   );
// };
//
// /** Whether the expression denotes the current module's URL. */
// export const isImportMetaUrl = (node: t.Node | undefined): boolean => {
//   if (node === undefined) return false;
//   const expression = unwrapJavaScriptExpression(node).node;
//   if (!t.isMemberExpression(expression)) return false;
//   const object = unwrapJavaScriptExpression(expression.object).node;
//   return (
//     t.isMetaProperty(object) &&
//     object.meta.name === "import" &&
//     object.property.name === "meta" &&
//     semanticStaticPropertyName(expression.property, expression.computed) ===
//       "url"
//   );
// };
//
// const isFileIdentity = (node: t.Node | undefined): boolean => {
//   if (node !== undefined) node = unwrapJavaScriptExpression(node).node;
//   if (t.isIdentifier(node, { name: "__filename" }) || isImportMetaUrl(node))
//     return true;
//   if (!t.isCallExpression(node)) return false;
//   const name = calleeName(node.callee);
export const _l = 213;
