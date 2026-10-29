export const __stub = 1;
//   "modal",
//   "multiline",
//   "multiselectable",
//   "orientation",
//   "pressed",
//   "readonly",
//   "required",
//   "selected",
//   "valuemax",
//   "valuemin",
// ]);
//
// const accessibilityStates = (
//   value: unknown,
// ): WebPageInspection["accessibility"]["nodes"][number]["states"] => {
//   const states = new Map<string, boolean | number | string>();
//   for (const property of recordsValue(value)) {
//     const name = cdpStringValue(property.name);
//     if (name === undefined || !ACCESSIBILITY_STATE_NAMES.has(name)) continue;
//     const raw = recordValue(property.value)?.value;
//     const state =
//       typeof raw === "boolean"
//         ? raw
//         : typeof raw === "number"
//           ? numberValue(raw)
//           : typeof raw === "string"
//             ? raw
//             : undefined;
//     if (state !== undefined) states.set(name, state);
//   }
//   return [...states]
//     .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
//     .map(([name, state]) => ({ name, value: state }));
// };
//
// const axText = (value: unknown): string | null =>
//   cdpStringValue(recordValue(value)?.value) ?? null;
//
// const uniqueAttributeNames = (
//   attributeIndexes: readonly number[],
//   strings: readonly (string | undefined)[],
// ): string[] => {
//   const names: string[] = [];
//   const seen = new Set<string>();
//   for (let index = 0; index < attributeIndexes.length; index += 2) {
//     const name = cdpSnapshotString(strings, attributeIndexes[index]);
//     if (name === undefined) continue;
//     if (seen.has(name)) continue;
//     seen.add(name);
//     names.push(name);
//   }
//   return names;
// };
//
// const numberArray = (
//   value: unknown,
// ): readonly (number | undefined)[] | undefined => {
//   if (!Array.isArray(value)) return undefined;
//   return value.map((item) => {
//     const number = numberValue(item);
//     return number !== undefined && Number.isSafeInteger(number)
//       ? number
//       : undefined;
//   });
// };
//
// interface DomMetadataOptions {
//   readonly strings: readonly (string | undefined)[];
//   readonly attributes: readonly number[];
//   readonly baseUrl: string;
//   readonly documentUrl: string;
//   readonly nodeIndex: number;
//   readonly nodeName: string;
//   readonly allowedOrigins: ReadonlySet<string>;
//   readonly svgElement: boolean;
//   readonly xmlDocument: boolean | undefined;
//   readonly xlinkHref: string | undefined;
// }
//
// // Chrome reads an SVG XLink href only when href itself is absent, and an
// // empty href still wins. HTML keeps the literal attribute name `xlink:href`.
// // XML uses any prefix bound to the XLink namespace. Both are stored as href.
// const hrefAttributeValue = (
//   pairs: ReadonlyMap<string, string>,
//   attribute: string,
//   options: DomMetadataOptions,
// ): string | undefined => {
//   const declared = pairs.get(attribute);
//   if (declared !== undefined) return declared;
//   if (attribute !== "href" || !options.svgElement) return undefined;
//   return options.xmlDocument ? options.xlinkHref : pairs.get("xlink:href");
// };
//
// const domMetadata = (
//   options: DomMetadataOptions,
// ): {
//   readonly urls: WebPageInspection["metadata"]["dom_urls"];
//   readonly agentHints: WebPageInspection["metadata"]["agent_hints"];
// } => {
//   const {
//     strings,
//     attributes,
//     baseUrl,
//     documentUrl,
//     nodeIndex,
//     nodeName,
//     allowedOrigins,
//   } = options;
//   const pairs = new Map<string, string>();
//   for (let index = 0; index + 1 < attributes.length; index += 2) {
//     // Chrome already folds HTML names; SVG/XML names remain case-sensitive.
//     const name = cdpSnapshotString(strings, attributes[index]);
//     const value = cdpSnapshotValueString(strings, attributes[index + 1]);
//     if (name === undefined || value === undefined) continue;
//     // HTML keeps the first declaration. A later repeat must not move dom_urls.
//     if (!pairs.has(name)) pairs.set(name, value);
//   }
//   const urls: WebPageInspection["metadata"]["dom_urls"] = [];
//   for (const attribute of domUrlAttributes) {
//     const value = hrefAttributeValue(pairs, attribute, options);
//     if (value === undefined) continue;
//     const tagName = nodeName.toLowerCase();
//     // Chrome strips HTML whitespace for FORM.action, while submit controls
//     // use the document URL only for an exactly empty formaction attribute.
//     const usesDocumentUrl =
//       (tagName === "form" &&
//         attribute === "action" &&
//         /^[\t\n\f\r ]*$/u.test(value)) ||
//       ((tagName === "button" || tagName === "input") &&
//         attribute === "formaction" &&
//         value === "");
//     const destination = domDestination(
//       usesDocumentUrl ? documentUrl : value,
//       baseUrl,
//       allowedOrigins,
//     );
//     urls.push({
//       node_index: nodeIndex,
//       attribute,
//       url: destination.url,
//       destination_scope: destination.scope,
//     });
//   }
//   const rel = (pairs.get("rel") ?? "")
//     .toLowerCase()
//     // HTML link type tokens are separated by ASCII whitespace only.
//     .split(/[\t\n\f\r ]+/u)
//     .filter((value) => agentRelValues.includes(value));
//   const href = urls.find(({ attribute }) => attribute === "href")?.url ?? null;
//   const agentHints =
//     nodeName.toLowerCase() === "link" && rel.length > 0
//       ? rel.map((declaration) => ({
//           mechanism: "dom_link_rel" as const,
//           declaration,
//           url: href,
//           trust: "page-declared-untrusted" as const,
//         }))
//       : [];
//   return { urls, agentHints };
// };
//
// const domDestination = (
//   value: string,
//   baseUrl: string,
//   allowedOrigins: ReadonlySet<string>,
// ): {
//   readonly url: string | null;
//   readonly scope: "approved" | "outside_policy" | "unsupported";
// } => {
//   try {
//     const parsed = new URL(value, baseUrl);
//     if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
//       return { url: null, scope: "unsupported" };
//     if (!allowedOrigins.has(parsed.origin))
//       return { url: null, scope: "outside_policy" };
//     return {
//       url: allowedSanitizedUrl(parsed.href, allowedOrigins)?.url ?? null,
//       scope: "approved",
//     };
//   } catch (cause: unknown) {
//     // Unparseable URLs are out of scope, not failures.
//     void cause;
//     return { url: null, scope: "unsupported" };
//   }
// };
//
// const domUrlAttributes = [
//   "href",
//   "src",
//   "action",
//   "formaction",
//   "poster",
// ] as const;
// const agentRelValues = ["mcp", "model-context", "ai-plugin", "service-desc"];
export const _l = 194;
