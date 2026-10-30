export const __stub = 1;
//       {
//         onObjectBegin: () => {
//           objects.push(new Set());
//         },
//         onObjectProperty: (key) => {
//           const keys = objects.at(-1);
//           if (keys === undefined || keys.has(key)) invalid = true;
//           keys?.add(key);
//         },
//         onObjectEnd: () => {
//           objects.pop();
//         },
//         onError: () => {
//           invalid = true;
//         },
//       },
//       {
//         disallowComments: true,
//         allowTrailingComma: false,
//         allowEmptyContent: false,
//       },
//     );
//     if (invalid) return undefined;
//     // The JSON visitor checked syntax and duplicate members before JSON.parse can fold them.
//     return JSON.parse(text);
//   } catch (error) {
//     // Syntax and nesting failures are malformed transcript input, not an evaluation crash.
//     if (error instanceof SyntaxError || error instanceof RangeError)
//       return undefined;
//     throw error;
//   }
// };
//
// interface DeliveredEvidence {
//   readonly records: Map<string, Evidence>;
//   readonly conflicts: Set<string>;
// }
//
// /** One completed tool call, with aliases normalized and successful Evidence authenticated. */
// export interface ParsedCodexToolCall {
//   readonly item: Record<string, unknown>;
//   readonly id: string | null;
//   readonly server: string | null;
//   readonly tool: string;
//   readonly arguments: JsonValue;
//   readonly evidence: readonly Evidence[];
// }
//
// const consistentAliases = (
//   value: Record<string, unknown>,
//   left: string,
//   right: string,
// ): boolean =>
//   value[left] === undefined ||
//   value[right] === undefined ||
//   value[left] === value[right];
//
// const consistentJsonFields = (
//   value: Record<string, unknown>,
//   left: string,
//   right: string,
// ): boolean =>
//   value[left] === undefined ||
//   value[right] === undefined ||
//   sameJson(value[left], value[right]);
//
// const consistentJsonAliases = (
//   value: Record<string, unknown>,
//   left: string,
//   right: string,
// ): boolean =>
//   value[left] === undefined ||
//   value[left] === null ||
//   value[right] === undefined ||
//   value[right] === null ||
//   sameJson(value[left], value[right]);
//
// const evidenceFromCall = (
//   item: Record<string, unknown>,
//   tool: string,
// ): Evidence | undefined => {
//   if (!consistentJsonAliases(item, "result", "output")) return undefined;
//   const result = record(item.result ?? item.output);
//   if (
//     result === undefined ||
//     result.isError === true ||
//     (result.error !== undefined && result.error !== null)
//   )
//     return undefined;
//   if (
//     result.structuredContent !== undefined &&
//     result.structured_content !== undefined &&
//     !sameJson(result.structuredContent, result.structured_content)
//   )
//     return undefined;
//   let value = result.structuredContent ?? result.structured_content;
//   if (value === undefined || value === null) {
//     // Some Codex transcripts retain only the complete MCP JSON text block.
//     // Prose, multiple blocks, and truncated previews cannot establish delivery.
//     if (!Array.isArray(result.content) || result.content.length !== 1)
//       return undefined;
//     const block = record(result.content[0]);
//     if (block?.type !== "text" || typeof block.text !== "string")
//       return undefined;
//     value = parseClosedJson(block.text);
//   }
//   const structured = record(value);
//   if (
//     structured === undefined ||
//     (structured.error !== undefined && structured.error !== null)
//   )
//     return undefined;
//   let evidence: Evidence;
//   try {
//     evidence = parseEvidence(structured);
//   } catch {
//     // Transcript output is untrusted; invalid Evidence cannot support a claim.
//     return undefined;
//   }
//   if (tool !== evidence.operation) return undefined;
//   return evidence;
// };
//
// const completedToolItem = (
//   event: unknown,
// ): Record<string, unknown> | undefined => {
//   const value = record(event);
//   const wrapped = value?.type === "item.completed";
//   const item = wrapped
//     ? record(value.item)
//     : value?.type === "mcp_tool_call"
export const _l = 131;
