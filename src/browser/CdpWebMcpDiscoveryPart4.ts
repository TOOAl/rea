export const __stub = 1;
// const normalizeTool = (
//   value: UnknownRecord,
//   input: DiscoverWebMcpToolsInput,
//   frames: ReadonlyMap<
//     string,
//     { readonly url: string; readonly origin: string | null }
//   >,
//   completeness: CdpCaptureCompleteness,
// ): WebMcpDiscovery["tools"]["items"][number] | undefined => {
//   const frameId = cdpStringValue(value.frameId);
//   const name = cdpStringValue(value.name);
//   const frame = frameId === undefined ? undefined : frames.get(frameId);
//   if (frameId === undefined || name === undefined) {
//     completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return undefined;
//   }
//   if (frame?.origin === null || frame === undefined) {
//     completeness.exclude("webmcp_tools", "out_of_target_scope");
//     return undefined;
//   }
//   const description = cdpStringValue(value.description) ?? "";
//   const annotations = recordValue(value.annotations);
//   const malformedAnnotations =
//     Object.hasOwn(value, "annotations") && annotations === undefined;
//   if (malformedAnnotations)
//     completeness.exclude("webmcp_tools", "invalid_protocol_value");
//   const annotation = (key: string): boolean | null => {
//     if (annotations === undefined || !Object.hasOwn(annotations, key))
//       return null;
//     const hint = annotations[key];
//     if (typeof hint === "boolean") return hint;
//     completeness.exclude("webmcp_tools", "invalid_protocol_value");
//     return null;
//   };
//   const consequential = annotation("consequential");
//   const unknownConsequential =
//     malformedAnnotations ||
//     (annotations !== undefined &&
//       Object.hasOwn(annotations, "consequential") &&
//       typeof annotations.consequential !== "boolean");
//   const declaration = jsonValueSchema.safeParse(value.inputSchema);
//   if (!declaration.success)
//     completeness.exclude("webmcp_tools", "invalid_protocol_value");
//   const schema = declaration.success ? declaration.data : null;
//   return {
//     tool_key: toolKey(frame.url, frameId, name),
//     name,
//     description,
//     frame_id: frameId,
//     frame_url: frame.url,
//     owner_origin: frame.origin,
//     declaration_kind:
//       numberValue(value.backendNodeId) === undefined
//         ? "imperative"
//         : "declarative",
//     input_schema: schema,
//     input_schema_sha256: declaration.success
//       ? digestCanonicalValue(schema)
//       : null,
//     annotations: {
//       read_only: annotation("readOnly"),
//       untrusted_content: annotation("untrustedContent"),
//       ...(unknownConsequential ? {} : { consequential }),
//       autosubmit: annotation("autosubmit"),
//     },
//     registration_source: registrationSource(
//       recordValue(value.stackTrace),
//       new Set(input.allowed_origins),
//     ),
//     trust: "page-declared-untrusted",
//   };
// };
//
// const registrationSource = (
//   stack: UnknownRecord | undefined,
//   allowedOrigins: ReadonlySet<string>,
// ): WebMcpDiscovery["tools"]["items"][number]["registration_source"] => {
//   const frame = recordsValue(stack?.callFrames)[0];
//   const url = allowedSanitizedUrl(frame?.url, allowedOrigins);
//   return frame === undefined || url === undefined
//     ? null
//     : {
//         url: url.url,
//         line: integerOrNull(frame.lineNumber),
//         column: integerOrNull(frame.columnNumber),
//       };
// };
//
// interface WebMcpResultOptions {
//   readonly context: DiscoveryContext;
//   readonly frameTree: unknown;
//   readonly tools: ReadonlyMap<
//     string,
//     WebMcpDiscovery["tools"]["items"][number]
//   >;
//   readonly completeness: CdpCaptureCompleteness;
//   readonly limitations: string[];
//   readonly available: boolean;
// }
//
// const buildWebMcpResult = (options: WebMcpResultOptions): WebMcpDiscovery => {
//   const { context, frameTree, tools, completeness, limitations, available } =
//     options;
//   const targetUrl = mainFrameUrl(frameTree) ?? context.target.url;
//   const sanitized = allowedSanitizedUrl(
//     targetUrl,
//     new Set(context.input.allowed_origins),
//   );
//   return {
//     browser: context.discovery.version,
//     target: {
//       target_id: context.target.id,
//       url: sanitized?.url ?? "[unsupported-url]",
//       origin: sanitized?.origin ?? "",
//     },
//     status: available ? "available" : "unavailable",
//     tools: {
//       total: tools.size + completeness.droppedTotal,
//       items: [...tools.values()].sort((left, right) =>
//         compareUnicodeCodePoints(left.tool_key, right.tool_key),
//       ),
//     },
//     completeness: completeness.snapshot(),
//     limitations,
//   };
// };
//
// const toolKey = (frameUrl: string, frameId: string, name: string): string =>
//   // Registrations without a known admitted frame are excluded above, so the
//   // frame ID here always distinguishes owners. Composite tuple keeps a NUL
//   // inside one field from collapsing two registrations before hashing.
//   `webmcp_${createHash("sha256")
//     .update(compositeKey([frameUrl, frameId, name]))
//     .digest("hex")}`;
//
// const integerOrNull = (value: unknown): number | null => {
//   const number = numberValue(value);
//   return number === undefined ? null : Math.max(0, Math.trunc(number));
// };
export const _l = 139;
