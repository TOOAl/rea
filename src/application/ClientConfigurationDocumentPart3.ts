export const __stub = 1;
//     }
//     const kept = emitted ? pair.leading : commasOutsideComments(pair.leading);
//     parts.push(separatorPending ? commasOutsideComments(kept) : kept);
//     if (emitted && !separatorPending && !pair.leading.includes(","))
//       parts.push(", ");
//     separatorPending = false;
//     parts.push(pair.text);
//     emitted = true;
//   }
//   if (insertion !== undefined) {
//     if (!(emitted && separatorPending)) parts.push(emitted ? ", " : " ");
//     parts.push(insertion);
//     emitted = true;
//   }
//   if (!emitted) {
//     const retained = `${parts.slice(1).join("")}${commasOutsideComments(trailing)}`;
//     return retained.includes("#")
//       ? `${open}${retained}${close}`
//       : `${open}${close}`;
//   }
//   const tail = commasOutsideComments(trailing);
//   parts.push(tail);
//   if (tail === "" && open === "{") parts.push(" ");
//   parts.push(close);
//   return parts.join("");
// };
//
// /**
//  * Decoded TOML string, or undefined when the token is not a string.
//  * The document parser accepts multiline basic and literal strings.
//  */
// const tomlStringValue = (text: string): string | undefined => {
//   try {
//     const value = parseToml(`value = ${text}`)["value"];
//     return typeof value === "string" ? value : undefined;
//   } catch (cause: unknown) {
//     void cause;
//     return undefined;
//   }
// };
//
// /**
//  * Array text with `serverKey` removed. `""` means the assignment itself can
//  * be deleted. Undefined when the array cannot be edited safely.
//  */
// const tomlArrayWithoutString = (
//   array: string,
//   serverKey: string,
// ): string | undefined => {
//   if (!array.startsWith("[")) return undefined;
//   const end = endOfContainer(array, 0);
//   if (end !== array.length || array[end - 1] !== "]") return undefined;
//   const pairs: InlinePair[] = [];
//   let index = 1;
//   let trailing = "";
//   while (index < end - 1) {
//     const trivia = readTrivia(array, index, end - 1);
//     if (trivia.next >= end - 1) {
//       trailing = trivia.text;
//       break;
//     }
//     const valueEnd = endOfTomlValue(array, trivia.next);
//     if (valueEnd > end - 1) return undefined;
//     const text = array.slice(trivia.next, valueEnd);
//     pairs.push({
//       leading: trivia.text,
//       text,
//       drop: tomlStringValue(text) === serverKey,
//     });
//     index = valueEnd;
//   }
//   if (pairs.every((pair) => !pair.drop)) return array;
//   const rebuilt = rebuildDelimitedEntries(pairs, trailing, undefined, "[", "]");
//   return rebuilt === "[]" ? "" : rebuilt;
// };
//
// type DisabledServerListEdit =
//   | { readonly kind: "ignore" }
//   | { readonly kind: "keep" }
//   | { readonly kind: "delete"; readonly comment: string | undefined }
//   | { readonly kind: "replace"; readonly text: string };
//
// interface DisabledServerListInput {
//   readonly text: string;
//   readonly lineStart: number;
//   readonly valueOffset: number;
//   readonly valueEnd: number;
//   readonly statementEnd: number;
//   readonly tablePath: readonly string[];
//   readonly segments: readonly string[];
//   readonly serverKey: string;
//   readonly entry: unknown;
// }
//
// /** Drop `serverKey` from a root `disabled_mcp_servers` array while installing. */
// const disabledServerListEdit = (
//   input: DisabledServerListInput,
// ): DisabledServerListEdit => {
//   if (
//     input.entry === undefined ||
//     input.tablePath.length !== 0 ||
//     input.segments.length !== 1 ||
//     input.segments[0] !== "disabled_mcp_servers"
//   )
//     return { kind: "ignore" };
//   const open = skipWsAndComments(input.text, input.valueOffset);
//   if (input.text[open] !== "[") return { kind: "ignore" };
//   const arrayText = input.text.slice(open, input.valueEnd);
//   const edited = tomlArrayWithoutString(arrayText, input.serverKey);
//   if (edited === undefined || edited === arrayText) return { kind: "keep" };
//   if (edited === "") {
//     const suffix = input.text.slice(input.valueEnd, input.statementEnd);
//     const hash = suffix.indexOf("#");
//     return {
//       kind: "delete",
//       comment: hash < 0 ? undefined : suffix.slice(hash),
//     };
//   }
//   return {
//     kind: "replace",
//     text: `${input.text.slice(input.lineStart, open)}${edited}${input.text.slice(input.valueEnd, input.statementEnd)}`,
//   };
// };
//
// /** Lines that replace a disabled-server assignment, or undefined to leave it. */
// const disabledServerListLines = (
//   edit: DisabledServerListEdit,
//   lines: readonly string[],
//   lineIndex: number,
//   endLine: number,
// ): readonly string[] | undefined => {
//   switch (edit.kind) {
//     case "ignore":
//       return undefined;
//     case "keep":
//       return lines.slice(lineIndex, endLine + 1);
//     case "replace":
//       return edit.text.split("\n");
//     case "delete":
//       return edit.comment === undefined ? [] : [edit.comment];
//     default: {
//       const unreachable: never = edit;
//       return unreachable;
//     }
//   }
// };
//
// /**
//  * Replace REA's TOML server tables and assignments. Comments that introduce a
//  * following table stay. Codex also retains comments around REA's own table.
//  * Text inside strings is not treated as a header. Only Grok Build reads the
//  * root `disabled_mcp_servers` list that registration also edits.
//  */
// const upsertTomlServerSection = (
//   originalText: string,
//   serverKey: string,
//   entry: unknown,
//   format: "toml" | "grok",
// ): string => {
//   // smol-toml accepts a leading BOM. Leave it in place or the first header is missed.
//   const bom = originalText.startsWith("\uFEFF");
//   const source = bom ? originalText.slice(1) : originalText;
//   // Keep a preceding \r on each line. Rewriting \r\n in the whole file would
//   // change string values. A file whose every break is CRLF gets a CRLF section.
//   const crlf =
//     source.includes("\r\n") && !source.replaceAll("\r\n", "").includes("\n");
//   const text = source;
//   const lines = text.split("\n");
//   const lineStarts: number[] = [];
//   let cursor = 0;
//   for (const line of lines) {
//     lineStarts.push(cursor);
//     cursor += line.length + 1;
//   }
//   const kept: string[] = [];
//   const pending: string[] = [];
//   let skipping = false;
//   let inlineServerTable = false;
//   let mode: TomlStringMode = "none";
//   let tablePath: readonly string[] = [];
//   const discardPending = (): void => {
//     pending.length = 0;
//   };
//   const flushPending = (): void => {
//     kept.push(...pending);
//     pending.length = 0;
//   };
//   const lineIndexAt = (offset: number): number => {
//     let line = 0;
//     for (let index = 0; index < lineStarts.length; index += 1)
//       if ((lineStarts[index] ?? 0) <= offset) line = index;
//     return line;
//   };
//   let lineIndex = 0;
//   while (lineIndex < lines.length) {
//     const physical = lines[lineIndex] ?? "";
//     const line = physical.endsWith("\r") ? physical.slice(0, -1) : physical;
//     if (mode !== "none") {
//       mode = tomlStringModeAfter(line, mode);
//       if (skipping) discardPending();
//       else kept.push(physical);
//       lineIndex += 1;
//       continue;
//     }
//     const header = parseTomlTableHeader(line);
//     if (header !== undefined) {
//       tablePath = header.path;
//       if (isTomlServerTable(header.path, serverKey)) {
//         discardPending();
//         skipping = true;
//         lineIndex += 1;
//         continue;
//       }
//       skipping = false;
//       flushPending();
//       kept.push(physical);
//       lineIndex += 1;
//       continue;
//     }
//     const assignment = parseAssignment(line);
//     if (assignment !== undefined) {
//       const lineStart = lineStarts[lineIndex] ?? 0;
//       const valueOffset = lineStart + assignment.equals + 1;
//       const valueEnd = endOfTomlValue(text, valueOffset);
//       let statementEnd = valueEnd;
//       while (statementEnd < text.length && text[statementEnd] !== "\n")
//         statementEnd += 1;
//       const endLine = lineIndexAt(Math.max(statementEnd - 1, lineStart));
//       if (skipping) {
//         discardPending();
//         lineIndex = endLine + 1;
//         mode = "none";
//         continue;
//       }
//       const disabledLines =
//         format === "grok"
//           ? disabledServerListLines(
//               disabledServerListEdit({
//                 text,
//                 lineStart,
//                 valueOffset,
//                 valueEnd,
//                 statementEnd,
//                 tablePath,
//                 segments: assignment.segments,
//                 serverKey,
//                 entry,
//               }),
//               lines,
//               lineIndex,
//               endLine,
//             )
//           : undefined;
//       if (disabledLines !== undefined) {
//         flushPending();
//         kept.push(...disabledLines);
//         lineIndex = endLine + 1;
//         mode = "none";
//         continue;
//       }
//       const absolute = [...tablePath, ...assignment.segments];
//       const open = skipWsAndComments(text, valueOffset);
//       const closesServerTable =
//         absolute.length === 1 &&
//         absolute[0] === "mcp_servers" &&
//         text[open] === "{";
//       if (closesServerTable || isTomlServerTable(absolute, serverKey)) {
//         if (closesServerTable) {
//           flushPending();
//           const edited = editInlineServerTable(
//             text.slice(open, valueEnd),
//             serverKey,
//             entry,
//           );
//           const prefix = text.slice(lineStart, open);
//           const suffix = text.slice(valueEnd, statementEnd);
//           const replacement =
//             edited === undefined
//               ? text.slice(lineStart, statementEnd)
//               : `${prefix}${edited}${suffix}`;
//           kept.push(...replacement.split("\n"));
//           inlineServerTable = true;
//         } else discardPending();
//       } else {
//         flushPending();
//         for (let index = lineIndex; index <= endLine; index += 1)
//           kept.push(lines[index] ?? "");
//       }
//       lineIndex = endLine + 1;
//       mode = "none";
//       continue;
//     }
//     if (isBlankOrComment(line)) {
//       if (format === "toml" && line.trimStart().startsWith("#")) {
//         flushPending();
//         kept.push(physical);
//       } else pending.push(physical);
//       lineIndex += 1;
//       continue;
//     }
//     mode = tomlStringModeAfter(line, "none");
//     if (skipping) {
//       if (looksLikeTomlHeader(line)) {
//         flushPending();
//         skipping = false;
//         tablePath = ["\0"];
//         kept.push(physical);
//       } else discardPending();
//     } else {
//       flushPending();
//       kept.push(physical);
//     }
//     lineIndex += 1;
//   }
//   if (!skipping) flushPending();
//   let body = kept.join("\n");
//   // The last kept CRLF line has no following LF from the join.
//   if (body.endsWith("\r")) body += "\n";
//   if (entry !== undefined && !inlineServerTable) {
//     let fragment = stringifyToml({
//       mcp_servers: { [serverKey]: entry },
//     }).replace(/\n+$/u, "");
//     if (crlf) fragment = fragment.replaceAll("\n", "\r\n");
//     const nl = crlf ? "\r\n" : "\n";
//     const endedWithNewline = body.endsWith("\n");
//     const base = body.replace(/\n+$/u, "");
//     const trimmed =
//       endedWithNewline && base.endsWith("\r") ? base.slice(0, -1) : base;
//     body =
//       trimmed.length === 0
//         ? `${fragment}${nl}`
//         : `${trimmed}${nl}${nl}${fragment}${nl}`;
//   }
//   return bom ? `\uFEFF${body}` : body;
// };
//
// const tomlServerEntry = (
//   document: Record<string, unknown>,
//   serverKey: string,
// ): unknown => {
//   const servers = objectSchema.safeParse(document.mcp_servers);
//   if (!servers.success || !Object.hasOwn(servers.data, serverKey))
//     return undefined;
//   return servers.data[serverKey];
// };
//
// /** Whether Grok Build's root disable list names `serverKey`. */
// export const grokServerListedDisabled = (
//   document: Record<string, unknown>,
//   serverKey: string,
// ): boolean =>
//   Array.isArray(document.disabled_mcp_servers) &&
//   document.disabled_mcp_servers.includes(serverKey);
//
// /**
//  * OMP's user `disabledServers` denylist hides a server by name regardless of
//  * its entry, so a listed REA registration is not loaded.
//  */
// export const OMP_DISABLED_SERVERS_KEY = "disabledServers";
//
// /** Whether OMP's root `disabledServers` denylist names `serverKey`. */
// export const ompServerListedDisabled = (
//   document: Record<string, unknown>,
//   serverKey: string,
// ): boolean => {
//   const listed = document[OMP_DISABLED_SERVERS_KEY];
//   return Array.isArray(listed) && listed.includes(serverKey);
// };
//
// /** OMP's user `enabledServers` allowlist overrides an entry's `enabled: false`. */
// const OMP_ENABLED_SERVERS_KEY = "enabledServers";
//
// /**
//  * Whether OMP's allowlist forces `serverKey` on despite its entry's
//  * `enabled: false`. The `disabledServers` denylist still wins over it.
//  */
// export const clientServerForcedEnabled = (
//   parsed: ClientConfigurationDocument,
//   serverKey: string,
// ): boolean => {
//   if (parsed.dialect !== "omp") return false;
//   const listed = parsed.document[OMP_ENABLED_SERVERS_KEY];
//   return Array.isArray(listed) && listed.includes(serverKey);
// };
//
// /** Whether a client's own disable list suppresses `serverKey`. */
// export const clientServerListedDisabled = (
//   parsed: ClientConfigurationDocument,
//   serverKey: string,
// ): boolean =>
//   (parsed.dialect === "grok" &&
//     grokServerListedDisabled(parsed.document, serverKey)) ||
export const _l = 392;
