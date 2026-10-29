export const __stub = 1;
//         ? value.result
//         : value,
//     );
//   }
//   if (blocks.length !== 1)
//     throw new AnalysisProtocolError(
//       "IDA MCP omitted a single structured or text result; unsupported content cannot establish an empty observation.",
//     );
//   const values = blocks.map((text): JsonValue => {
//     try {
//       return jsonValueSchema.parse(JSON.parse(text));
//     } catch {
//       return text;
//     }
//   });
//   return values[0] ?? null;
// };
//
// // Retain only producer-sanitized JSON diagnostics, never a native parser cause.
// class IdaHttpJsonError extends Error {
//   constructor(text: string, redactor: IdaDiagnosticRedactor) {
//     super(
//       redactor.message(
//         "IDA MCP returned malformed HTTP JSON. Response body: ",
//         text,
//       ),
//     );
//   }
// }
//
// type IdaDiagnosticRedactor = ReturnType<typeof createIdaDiagnosticRedactor>;
//
// type IdaContentType = Readonly<{
//   essence: string;
//   subtype: string;
//   charset: string | undefined;
//   parameters: ReadonlyMap<string, string>;
// }>;
//
// const httpQuotedOctet = (code: number): boolean =>
//   code === 9 ||
//   code === 32 ||
//   (code >= 33 && code <= 126) ||
//   (code >= 128 && code <= 255);
//
// /** Consume one complete RFC 9110 media type; never discard a malformed parameter. */
// const parseIdaContentType = (
//   text: string,
// ): Result<IdaContentType, "malformed" | "ambiguous"> => {
//   let cursor = 0;
//   const token = new RegExp("[!#$%&'*+.^_`|~0-9A-Za-z-]+", "y");
//   const readToken = (): string | undefined => {
//     token.lastIndex = cursor;
//     const match = token.exec(text);
//     if (match === null) return undefined;
//     cursor = token.lastIndex;
//     return match[0];
//   };
//   const readOws = (): void => {
//     while (text[cursor] === " " || text[cursor] === "\t") cursor++;
//   };
//   const readQuoted = (): string | undefined => {
//     cursor++;
//     let value = "";
//     while (cursor < text.length) {
//       let code = text.charCodeAt(cursor++);
//       if (code === 34) return value;
//       if (code === 92) {
//         code = text.charCodeAt(cursor++);
//         if (!httpQuotedOctet(code)) return undefined;
//       } else if (!httpQuotedOctet(code)) return undefined;
//       value += String.fromCharCode(code);
//     }
//     return undefined;
//   };
//   readOws();
//   const type = readToken()?.toLowerCase();
//   if (type === undefined || text[cursor++] !== "/") return err("malformed");
//   const subtype = readToken()?.toLowerCase();
//   if (subtype === undefined) return err("malformed");
//   const parameters = new Map<string, string>();
//   let ambiguous = false;
//   while (true) {
//     readOws();
//     if (cursor === text.length) break;
//     if (text[cursor++] !== ";") return err("malformed");
//     readOws();
//     // RFC 9110 parameters admit an empty item after a semicolon.
//     if (cursor === text.length || text[cursor] === ";") continue;
//     const name = readToken()?.toLowerCase();
//     if (name === undefined || text[cursor++] !== "=") return err("malformed");
//     const value = text[cursor] === '"' ? readQuoted() : readToken();
//     if (value === undefined) return err("malformed");
//     // Repetition is ambiguous for this owner, even if both values agree.
//     // Keep parsing so syntax errors anywhere in the field cannot be discarded.
//     if (parameters.has(name)) ambiguous = true;
//     else parameters.set(name, value);
//   }
//   return ambiguous
//     ? err("ambiguous")
//     : ok({
//         essence: type + "/" + subtype,
//         subtype,
//         charset: parameters.get("charset"),
//         parameters,
//       });
// };
// const httpErrorBody = (
//   response: Response,
//   text: string,
//   redactor: IdaDiagnosticRedactor,
// ): string => {
//   const omitted = redactor.text(
//     "IDA MCP response body omitted: unsupported or unknown format or character encoding.",
//   );
//   const contentType = response.headers.get("content-type");
//   if (contentType === null) return omitted;
//   const mediaType = parseIdaContentType(contentType);
//   if (!mediaType.ok) return omitted;
//   const charset = mediaType.value.charset?.toLowerCase();
//   if (
//     charset !== undefined &&
//     !["utf-8", "utf8", "us-ascii", "ascii"].includes(charset)
//   )
//     return omitted;
//   if (
//     mediaType.value.subtype === "json" ||
//     mediaType.value.subtype.endsWith("+json")
export const _l = 128;
