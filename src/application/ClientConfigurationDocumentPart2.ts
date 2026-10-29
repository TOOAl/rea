export const __stub = 1;
//  * is not the dotted path `mcp_servers.rea.env`.
//  */
// const parseTomlTableHeader = (line: string): TomlTableHeader | undefined => {
//   let index = skipHorizontalSpace(line, 0);
//   const array = line.startsWith("[[", index);
//   if (!array && line[index] !== "[") return undefined;
//   index += array ? 2 : 1;
//   const path: string[] = [];
//   for (;;) {
//     index = skipHorizontalSpace(line, index);
//     const key =
//       line[index] === '"' || line[index] === "'"
//         ? parseQuotedKey(line, index)
//         : parseBareKey(line, index);
//     if (key === undefined) return undefined;
//     path.push(key.value);
//     index = skipHorizontalSpace(line, key.next);
//     if (line[index] !== ".") break;
//     index += 1;
//   }
//   const close = array ? "]]" : "]";
//   if (!line.startsWith(close, index)) return undefined;
//   index = skipHorizontalSpace(line, index + close.length);
//   if (index < line.length && line[index] !== "#") return undefined;
//   return { path };
// };
//
// /**
//  * String state after one physical line, starting at `start`. A multiline
//  * closer does not end the scan: `""", """` closes one string and opens another.
//  */
// const tomlStringModeAfter = (
//   line: string,
//   mode: TomlStringMode,
//   start = 0,
// ): TomlStringMode => {
//   if (mode === "ml-basic" || mode === "ml-literal") {
//     const delimiter = mode === "ml-basic" ? '"""' : "'''";
//     const closed = closeMultiline(line, start, delimiter, mode === "ml-basic");
//     if (closed === undefined) return mode;
//     return tomlStringModeAfter(line, "none", closed);
//   }
//   let index = start;
//   while (index < line.length) {
//     if (line[index] === "#") return "none";
//     if (line.startsWith('"""', index)) {
//       const closed = closeMultiline(line, index + 3, '"""', true);
//       if (closed === undefined) return "ml-basic";
//       index = closed;
//       continue;
//     }
//     if (line.startsWith("'''", index)) {
//       const closed = closeMultiline(line, index + 3, "'''", false);
//       if (closed === undefined) return "ml-literal";
//       index = closed;
//       continue;
//     }
//     const quote = line[index];
//     if (quote === '"' || quote === "'") {
//       const quoted = parseQuotedKey(line, index);
//       if (quoted === undefined) return "none";
//       index = quoted.next;
//       continue;
//     }
//     index += 1;
//   }
//   return "none";
// };
//
// /** Index after a multiline delimiter, or undefined when this line does not close it. */
// const closeMultiline = (
//   line: string,
//   start: number,
//   delimiter: '"""' | "'''",
//   escapes: boolean,
// ): number | undefined => {
//   let index = start;
//   while (index < line.length) {
//     if (escapes && line[index] === "\\") {
//       if (line[index + 1] === undefined) return undefined;
//       index += 2;
//       continue;
//     }
//     if (line.startsWith(delimiter, index)) {
//       // One or two quotes before the closer belong to the string: """keep""""
//       let end = index + delimiter.length;
//       const quote = delimiter[0];
//       let extra = 0;
//       while (extra < 2 && line[end] === quote) {
//         extra += 1;
//         end += 1;
//       }
//       return end;
//     }
//     index += 1;
//   }
//   return undefined;
// };
//
// const isBlankOrComment = (line: string): boolean => {
//   const trimmed = line.trimStart();
//   return trimmed === "" || trimmed.startsWith("#");
// };
//
// const looksLikeTomlHeader = (line: string): boolean =>
//   line.trimStart().startsWith("[");
//
// /** `mcp_servers.<server>` and tables nested under it, compared by key segment. */
// const isTomlServerTable = (
//   path: readonly string[],
//   serverKey: string,
// ): boolean => path[0] === "mcp_servers" && path[1] === serverKey;
//
// const parseKeyPath = (
//   text: string,
//   start: number,
// ):
//   | { readonly segments: readonly string[]; readonly next: number }
//   | undefined => {
//   const segments: string[] = [];
//   let index = start;
//   for (;;) {
//     index = skipHorizontalSpace(text, index);
//     const current = text[index];
//     if (current === undefined || current === "\n" || current === "\r")
//       return undefined;
//     const key =
//       current === '"' || current === "'"
//         ? parseQuotedKey(text, index)
//         : parseBareKey(text, index);
//     if (key === undefined) return undefined;
//     segments.push(key.value);
//     index = skipHorizontalSpace(text, key.next);
//     if (text[index] !== ".") return { segments, next: index };
//     index += 1;
//   }
// };
//
// const parseAssignment = (
//   line: string,
// ):
//   | { readonly segments: readonly string[]; readonly equals: number }
//   | undefined => {
//   const key = parseKeyPath(line, 0);
//   if (key === undefined) return undefined;
//   const equals = skipHorizontalSpace(line, key.next);
//   if (line[equals] !== "=") return undefined;
//   return { segments: key.segments, equals };
// };
//
// const skipWsAndComments = (text: string, start: number): number => {
//   let index = start;
//   while (index < text.length) {
//     const char = text[index];
//     if (char === " " || char === "\t" || char === "\n" || char === "\r") {
//       index += 1;
//       continue;
//     }
//     if (char === "#") {
//       while (index < text.length && text[index] !== "\n") index += 1;
//       continue;
//     }
//     return index;
//   }
//   return index;
// };
//
// /** Index after one TOML value. Containers and multiline strings may cross lines. */
// const endOfTomlValue = (text: string, start: number): number => {
//   const index = skipWsAndComments(text, start);
//   if (index >= text.length) return index;
//   if (text.startsWith('"""', index)) {
//     const closed = closeMultiline(text, index + 3, '"""', true);
//     return closed ?? text.length;
//   }
//   if (text.startsWith("'''", index)) {
//     const closed = closeMultiline(text, index + 3, "'''", false);
//     return closed ?? text.length;
//   }
//   const quote = text[index];
//   if (quote === '"' || quote === "'") {
//     const quoted = parseQuotedKey(text, index);
//     return quoted === undefined ? text.length : quoted.next;
//   }
//   if (quote === "{" || quote === "[") return endOfContainer(text, index);
//   let cursor = index;
//   while (cursor < text.length) {
//     const char = text[cursor];
//     if (
//       char === "\n" ||
//       char === "#" ||
//       char === "," ||
//       char === "}" ||
//       char === "]"
//     )
//       break;
//     cursor += 1;
//   }
//   return cursor;
// };
//
// const endOfContainer = (text: string, open: number): number => {
//   const closers: string[] = [text[open] === "{" ? "}" : "]"];
//   let index = open + 1;
//   while (index < text.length && closers.length > 0) {
//     if (text.startsWith('"""', index)) {
//       const closed = closeMultiline(text, index + 3, '"""', true);
//       if (closed === undefined) return text.length;
//       index = closed;
//       continue;
//     }
//     if (text.startsWith("'''", index)) {
//       const closed = closeMultiline(text, index + 3, "'''", false);
//       if (closed === undefined) return text.length;
//       index = closed;
//       continue;
//     }
//     const quote = text[index];
//     if (quote === '"' || quote === "'") {
//       const quoted = parseQuotedKey(text, index);
//       if (quoted === undefined) return text.length;
//       index = quoted.next;
//       continue;
//     }
//     if (quote === "#") {
//       while (index < text.length && text[index] !== "\n") index += 1;
//       continue;
//     }
//     if (quote === "{" || quote === "[") {
//       closers.push(quote === "{" ? "}" : "]");
//       index += 1;
//       continue;
//     }
//     if (quote === closers[closers.length - 1]) {
//       closers.pop();
//       index += 1;
//       continue;
//     }
//     index += 1;
//   }
//   return index;
// };
//
// /** TOML basic string. JSON leaves U+007F raw, which TOML rejects. */
// const tomlBasicString = (value: string): string =>
//   JSON.stringify(value).replaceAll("\u007f", "\\u007f");
//
// const tomlInlineKey = (key: string): string =>
//   /^[A-Za-z0-9_-]+$/u.test(key) ? key : tomlBasicString(key);
//
// const tomlInlineValue = (value: unknown): string => {
//   if (typeof value === "string") return tomlBasicString(value);
//   if (typeof value === "boolean") return value ? "true" : "false";
//   if (typeof value === "number" && Number.isFinite(value)) return String(value);
//   if (Array.isArray(value))
//     return `[${value.map((item) => tomlInlineValue(item)).join(", ")}]`;
//   if (typeof value === "object" && value !== null) {
//     const body = Object.entries(value)
//       .map(
//         ([key, nested]) => `${tomlInlineKey(key)} = ${tomlInlineValue(nested)}`,
//       )
//       .join(", ");
//     return `{ ${body} }`;
//   }
//   return '""';
// };
//
// interface InlinePair {
//   readonly leading: string;
//   readonly text: string;
//   readonly drop: boolean;
// }
//
// const readTrivia = (
//   text: string,
//   start: number,
//   limit: number,
// ): { readonly text: string; readonly next: number } => {
//   let index = start;
//   while (index < limit) {
//     const char = text[index];
//     if (
//       char === " " ||
//       char === "\t" ||
//       char === "\n" ||
//       char === "\r" ||
//       char === ","
//     ) {
//       index += 1;
//       continue;
//     }
//     if (char === "#") {
//       while (index < limit && text[index] !== "\n") index += 1;
//       continue;
//     }
//     break;
//   }
//   return { text: text.slice(start, index), next: index };
// };
//
// const commasOutsideComments = (trivia: string): string =>
//   trivia
//     .split("\n")
//     .map((part) => {
//       const comment = part.indexOf("#");
//       if (comment < 0) return part.replaceAll(",", "");
//       return `${part.slice(0, comment).replaceAll(",", "")}${part.slice(comment)}`;
//     })
//     .join("\n");
//
// const hasSeparatorComma = (trivia: string): boolean =>
//   trivia.split("\n").some((part) => {
//     const comment = part.indexOf("#");
//     const code = comment < 0 ? part : part.slice(0, comment);
//     return code.includes(",");
//   });
//
// /**
//  * Replace or remove `serverKey` inside one `{ ... }` table. A closed inline
//  * table cannot later grow a `[mcp_servers.rea]` header.
//  */
// const editInlineServerTable = (
//   table: string,
//   serverKey: string,
//   entry: unknown,
// ): string | undefined => {
//   if (!table.startsWith("{")) return undefined;
//   const end = endOfContainer(table, 0);
//   if (table[end - 1] !== "}") return undefined;
//   const pairs: InlinePair[] = [];
//   let index = 1;
//   let trailing = "";
//   while (index < end - 1) {
//     const trivia = readTrivia(table, index, end - 1);
//     if (trivia.next >= end - 1) {
//       trailing = trivia.text;
//       break;
//     }
//     const key = parseKeyPath(table, trivia.next);
//     if (key === undefined) return undefined;
//     const equals = skipWsAndComments(table, key.next);
//     if (table[equals] !== "=") return undefined;
//     const valueEnd = endOfTomlValue(table, equals + 1);
//     if (valueEnd > end - 1) return undefined;
//     pairs.push({
//       leading: trivia.text,
//       text: table.slice(trivia.next, valueEnd),
//       drop: key.segments[0] === serverKey,
//     });
//     index = valueEnd;
//   }
//   const insertion =
//     entry === undefined
//       ? undefined
//       : `${tomlInlineKey(serverKey)} = ${tomlInlineValue(entry)}`;
//   if (insertion === undefined && pairs.every((pair) => !pair.drop))
//     return table;
//   return rebuildInlineTable(pairs, trailing, insertion);
// };
//
// const rebuildInlineTable = (
//   pairs: readonly InlinePair[],
//   trailing: string,
//   insertion: string | undefined,
// ): string => rebuildDelimitedEntries(pairs, trailing, insertion, "{", "}");
//
// /**
//  * Rebuild `{ ... }` or `[ ... ]` after dropping entries. An empty container
//  * keeps comment trivia; a table with no comments stays `{}`.
//  */
// const rebuildDelimitedEntries = (
//   pairs: readonly InlinePair[],
//   trailing: string,
//   insertion: string | undefined,
//   open: "{" | "[",
//   close: "}" | "]",
// ): string => {
//   const parts: string[] = [open];
//   let emitted = false;
//   // A comma already emitted in a dropped pair's comment trivia.
//   let separatorPending = false;
//   for (const pair of pairs) {
//     if (pair.drop) {
//       if (!pair.leading.includes("#")) continue;
//       // A separator already emitted must not be repeated for the next field.
//       const dropped: string =
//         !emitted || separatorPending
//           ? commasOutsideComments(pair.leading)
//           : pair.leading;
//       parts.push(dropped);
//       separatorPending = separatorPending || hasSeparatorComma(dropped);
//       continue;
export const _l = 392;
