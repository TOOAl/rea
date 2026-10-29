export const __stub = 1;
//   (parsed.dialect === "omp" &&
//     ompServerListedDisabled(parsed.document, serverKey));
//
// /** Keep an existing Grok document intact aside from the REA server tables. */
// const serializeGrokConfiguration = (
//   document: Record<string, unknown>,
//   originalText: string | undefined,
// ): string => {
//   const entry = tomlServerEntry(document, PRODUCT_IDENTITY.mcpServerKey);
//   if (originalText === undefined) return stringifyToml(document);
//   return upsertTomlServerSection(
//     originalText,
//     PRODUCT_IDENTITY.mcpServerKey,
//     entry,
//     "grok",
//   );
// };
//
// /** Removing the last server leaves an empty table, which equals an absent one. */
// const withoutEmptyServerTable = (
//   document: Record<string, unknown>,
// ): Record<string, unknown> => {
//   const servers = objectSchema.safeParse(document.mcp_servers);
//   if (!servers.success || Object.keys(servers.data).length > 0) return document;
//   const { mcp_servers: empty, ...rest } = document;
//   void empty;
//   return rest;
// };
//
// /**
//  * Keep an existing Codex document intact aside from the REA server tables.
//  * An edit that would change any other parsed value falls back to a full
//  * rewrite, which keeps every value but not comments or spelling.
//  */
// const serializeCodexConfiguration = (
//   document: Record<string, unknown>,
//   originalText: string | undefined,
// ): string => {
//   if (
//     originalText === undefined ||
//     isEmptyClientConfigurationText(originalText)
//   )
//     return stringifyToml(document);
//   const upserted = upsertTomlServerSection(
//     originalText,
//     PRODUCT_IDENTITY.mcpServerKey,
//     tomlServerEntry(document, PRODUCT_IDENTITY.mcpServerKey),
//     "toml",
//   );
//   // Removing a final table also drops the file's last line break.
//   const edited =
//     originalText.endsWith("\n") && !upserted.endsWith("\n")
//       ? `${upserted}${originalText.endsWith("\r\n") ? "\r\n" : "\n"}`
//       : upserted;
//   return tomlTextHolds(edited, document) ? edited : stringifyToml(document);
// };
//
// const tomlTextHolds = (
//   text: string,
//   document: Record<string, unknown>,
// ): boolean => {
//   try {
//     return clientConfigurationValuesEqual(
//       withoutEmptyServerTable(objectSchema.parse(parseToml(text))),
//       withoutEmptyServerTable(document),
//     );
//   } catch (cause: unknown) {
//     // An unparsable edit is rejected in favor of the full rewrite.
//     void cause;
//     return false;
//   }
// };
//
// /** Comments in the trivia between two properties. `undefined` when there are none. */
// const commentsBetweenProperties = (gap: string): string | undefined => {
//   const pieces: string[] = [];
//   let index = 0;
//   while (index < gap.length) {
//     const line = gap.indexOf("//", index);
//     const block = gap.indexOf("/*", index);
//     if (line < 0 && block < 0) break;
//     const start = line < 0 ? block : block < 0 ? line : Math.min(line, block);
//     const lineComment = start === line;
//     const close = lineComment
//       ? gap.indexOf("\n", start)
//       : gap.indexOf("*/", start + 2);
//     if (!lineComment && close < 0) return undefined;
//     const end = lineComment ? (close < 0 ? gap.length : close) : close + 2;
//     const comment = gap.slice(start, end);
//     const lineBreak = gap.lastIndexOf("\n", start - 1);
//     if (lineBreak < 0) pieces.push(` ${comment}`);
//     else {
//       const prefix = gap.slice(lineBreak + 1, start);
//       let indentEnd = 0;
//       while (prefix[indentEnd] === " " || prefix[indentEnd] === "\t")
//         indentEnd += 1;
//       const newline =
//         lineBreak > 0 && gap[lineBreak - 1] === "\r" ? "\r\n" : "\n";
//       pieces.push(`${newline}${prefix.slice(0, indentEnd)}${comment}`);
//     }
//     index = end;
//   }
//   return pieces.length === 0 ? undefined : pieces.join("");
// };
//
// /**
//  * Delete an object property without taking a comment from the gap before it.
//  * jsonc-parser's removal span includes that gap, so a trailing comment on the
//  * previous property would disappear. Returns `undefined` to keep the stock edit.
//  */
// const deleteJsonPropertyPreservingComments = (
//   text: string,
//   path: readonly string[],
// ): string | undefined => {
//   const root = parseTree(text, [], { allowTrailingComma: true });
//   const value =
//     root === undefined ? undefined : findNodeAtLocation(root, [...path]);
//   const property = value?.parent;
//   const parent = property?.parent;
//   if (
//     property === undefined ||
//     parent?.type !== "object" ||
//     property.type !== "property" ||
//     parent.children === undefined
//   )
//     return undefined;
//   const propertyIndex = parent.children.indexOf(property);
//   const previous = parent.children[propertyIndex - 1];
//   if (propertyIndex <= 0 || previous === undefined) return undefined;
//   const comments = commentsBetweenProperties(
//     text.slice(previous.offset + previous.length, property.offset),
//   );
//   if (comments === undefined) return undefined;
//   let removeEnd = property.offset + property.length;
//   const hasNext = parent.children[propertyIndex + 1] !== undefined;
//   if (hasNext) {
//     let comma = removeEnd;
//     while (comma < text.length) {
//       const char = text[comma];
//       if (char === " " || char === "\t" || char === "\r" || char === "\n") {
//         comma += 1;
//         continue;
//       }
//       if (text.startsWith("/*", comma)) {
//         const close = text.indexOf("*/", comma + 2);
//         if (close < 0) return undefined;
//         comma = close + 2;
//         continue;
//       }
//       if (text.startsWith("//", comma)) {
//         while (
//           comma < text.length &&
//           text[comma] !== "\n" &&
//           text[comma] !== "\r"
//         )
//           comma += 1;
//         continue;
//       }
//       break;
//     }
//     if (text[comma] !== ",") return undefined;
//     removeEnd = comma + 1;
//   }
//   // A line comment runs to the next break. Keep the following token outside it.
//   const remainder = text.slice(removeEnd);
//   let suffix = `${hasNext ? "," : ""}${comments}`;
//   if (
//     suffix.includes("//") &&
//     !suffix.endsWith("\n") &&
//     !suffix.endsWith("\r") &&
//     !remainder.startsWith("\n") &&
//     !remainder.startsWith("\r")
//   )
//     suffix += "\n";
//   return `${text.slice(0, previous.offset + previous.length)}${suffix}${remainder}`;
// };
//
// /** Serialize a validated client document, retaining JSONC and TOML comments. */
// export const serializeClientConfiguration = (
//   document: Record<string, unknown>,
//   format: ClientConfigurationFormat | undefined,
//   originalText?: string,
//   editedPaths?: readonly (readonly string[])[],
// ): string => {
//   if (format === undefined || format === "unsupported")
//     throw new TypeError("client does not have a supported MCP config format");
//   if (format === "toml")
//     return serializeCodexConfiguration(document, originalText);
//   if (format === "grok")
//     return serializeGrokConfiguration(document, originalText);
//   if (format === "hermes")
//     return serializeHermesConfiguration(document, originalText);
//   if (format === "dsh") return serializeDshDocument(document);
//   // An empty original holds no comments or settings to preserve. Writing a
//   // fresh document also keeps a lone BOM from shifting past the closing brace.
//   if (
//     originalText !== undefined &&
//     !isEmptyClientConfigurationText(originalText) &&
//     editedPaths !== undefined
//   )
//     return editedPaths.reduce((text, path) => {
//       const value = valueAt(document, path);
//       if (value === undefined) {
//         const preserved = deleteJsonPropertyPreservingComments(text, path);
//         if (preserved !== undefined) return preserved;
//       }
//       return applyEdits(
//         text,
//         modify(text, [...path], value, {
//           formattingOptions: { insertSpaces: true, tabSize: 2, eol: "\n" },
//         }),
//       );
//     }, originalText);
//   return `${JSON.stringify(document, null, 2)}\n`;
// };
//
// /** Key path of a named registration in the server table. */
// export const clientServerPath = (
//   parsed: ClientConfigurationDocument,
//   name: string,
// ): string[] => [...parsed.serversPath, name];
//
// /** Key path of a present OpenCode V1 entry beside a native V2 table. */
// export const legacyClientServerPath = (
//   parsed: ClientConfigurationDocument,
//   name: string,
// ): string[] | undefined =>
//   Object.hasOwn(parsed.legacyServers, name)
//     ? [parsed.serversPath[0] ?? "mcp", name]
//     : undefined;
//
// /**
//  * Keep an existing Hermes `config.yaml` intact aside from the REA server entry.
//  * Hermes config files carry user comments and unrelated settings, so the rea
//  * entry is upserted into the parsed YAML document (which retains formatting and
//  * comments) rather than re-serializing the whole object.
//  */
// const serializeHermesConfiguration = (
//   document: Record<string, unknown>,
//   originalText: string | undefined,
// ): string => {
//   if (
//     originalText === undefined ||
//     isEmptyClientConfigurationText(originalText)
//   )
//     return stringifyHermesConfigurationYaml(document);
//   const serversKey = clientConfigurationServersKey("hermes");
//   const servers = document[serversKey];
//   const entry =
//     typeof servers === "object" && servers !== null
//       ? (servers as Record<string, unknown>)[PRODUCT_IDENTITY.mcpServerKey]
//       : undefined;
//   return editHermesConfigurationYaml(
//     originalText,
//     [serversKey, PRODUCT_IDENTITY.mcpServerKey],
//     entry,
//   );
// };
//
// /** Build the stdio entry shape expected by one client's configuration dialect. */
// export const clientRegistrationEntry = (
//   format: ClientRegistrationDialect,
//   command: readonly string[],
//   environment: Readonly<Record<string, string>>,
// ): Record<string, unknown> => {
//   const [executable = "rea", ...args] = command;
//   switch (format) {
//     case "opencode":
//       return {
//         type: "local",
//         command: [...command],
//         enabled: true,
//         ...(Object.keys(environment).length === 0
//           ? {}
//           : { environment: { ...environment } }),
//       };
//     case "kimi":
//       // Kimi infers stdio from command; it uses `transport`, not `type`.
//       return {
//         command: executable,
//         args,
//         ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
//       };
//     case "opencode_v2":
//       // V2 connects servers unless `disabled` is true.
//       return {
//         type: "local",
//         command: [...command],
//         ...(Object.keys(environment).length === 0
//           ? {}
//           : { environment: { ...environment } }),
//       };
//     case "vscode":
//     case "omp":
//     case "pi":
//       return {
//         type: "stdio",
//         command: executable,
//         args,
//         ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
//       };
//     case "copilot_cli":
//       return {
//         type: "stdio",
//         command: executable,
//         args,
//         tools: ["*"],
//         ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
//       };
//     case "commandcode":
//       return {
//         transport: "stdio",
//         enabled: true,
//         command: executable,
//         args,
//         ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
//       };
//     case "dsh":
//       return dshClientRegistrationEntry(command, environment);
//     case "hermes":
//       // Hermes reads stdio servers from `mcp_servers.<name>` and connects them
//       // unless `enabled` is false, so the entry states it explicitly.
//       return {
//         command: executable,
//         args,
//         ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
//         enabled: true,
//       };
//     default:
//       return {
//         command: executable,
//         args,
//         ...(Object.keys(environment).length === 0 ? {} : { env: environment }),
//       };
//   }
// };
//
// /** Parse one Gemini policy at its source boundary before consolidating scopes. */
// export const parseGeminiMcpPolicy = (parsed: ClientConfigurationDocument) =>
//   z
//     .object({
//       allowed: z.array(z.string()).optional(),
//       excluded: z.array(z.string()).optional(),
//     })
//     .passthrough()
//     .parse(parsed.document.mcp ?? {});
//
// /** One server-name comparison for the exclusion, intersection and membership rules below. */
// const normalizeGeminiServerName = (name: string): string =>
//   name.toLowerCase().trim();
//
// /** Gemini consolidates excludes by union and allowlists by normalized intersection. */
// export const geminiServerPolicyBlock = (
//   policies: readonly ReturnType<typeof parseGeminiMcpPolicy>[],
//   serverKey: string,
// ): string | undefined => {
//   // Hand-authored settings cannot be assumed to spell the product key exactly,
//   // so every rule compares normalized names. Testing the consolidated list
//   // against the raw key instead would make the outcome depend on which policy
//   // supplied the spelling that survived the intersection.
//   const key = normalizeGeminiServerName(serverKey);
//   if (
//     policies.some(({ excluded }) =>
//       excluded?.some((name) => normalizeGeminiServerName(name) === key),
//     )
//   )
//     return `Gemini mcp.excluded blocks ${serverKey}. Review the selected settings policies before rerunning setup.`;
//   const allowlists = policies.flatMap(({ allowed }) =>
//     allowed === undefined ? [] : [allowed],
//   );
//   const allowed = allowlists.reduce<string[] | undefined>(
//     (previous, current) => {
//       if (previous === undefined) return current;
//       const normalized = new Set(current.map(normalizeGeminiServerName));
//       return previous.filter((name) =>
//         normalized.has(normalizeGeminiServerName(name)),
//       );
//     },
//     undefined,
//   );
//   // Gemini's manager applies the consolidated allowlist only when nonempty.
//   if (
//     allowed !== undefined &&
//     allowed.length > 0 &&
//     !allowed.some((name) => normalizeGeminiServerName(name) === key)
//   )
//     return `Gemini mcp.allowed does not include ${serverKey}. Review the selected settings policies before rerunning setup.`;
//   return undefined;
// };
export const _l = 389;
