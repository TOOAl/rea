export const __stub = 1;
//       ? value
//       : undefined;
//   if (item?.type !== "mcp_tool_call") return undefined;
//   const terminalStatus =
//     item.status === "completed" || item.status === "failed";
//   if (
//     (wrapped
//       ? item.status !== undefined && !terminalStatus
//       : !terminalStatus) ||
//     !consistentAliases(item, "server", "server_name") ||
//     !consistentAliases(item, "tool", "name") ||
//     !consistentJsonFields(item, "arguments", "input")
//   )
//     return undefined;
//   return item;
// };
//
// const artifactDelivery = (evidence: Evidence): readonly Evidence[] => {
//   const records = [evidence];
//   if (evidence.operation !== "inspect_artifact") return records;
//   const substeps = record(evidence.normalized_result)?.substeps;
//   if (!Array.isArray(substeps)) return records;
//   // Artifact inspection delivers linked inventory Evidence inline; bare IDs in
//   // normalized facts are references, not authenticated deliveries.
//   for (const value of substeps) {
//     const substep = record(value);
//     if (
//       substep?.status !== "completed" ||
//       substep.operation !== "inventory_artifact" ||
//       typeof substep.evidence_id !== "string" ||
//       !evidence.evidence_links.includes(substep.evidence_id)
//     )
//       continue;
//     try {
//       const nested = parseEvidence(substep.evidence);
//       if (
//         nested.evidence_id === substep.evidence_id &&
//         nested.operation === substep.operation
//       )
//         records.push(nested);
//     } catch {
//       // An authenticated parent does not authenticate an embedded record's ID.
//     }
//   }
//   return records;
// };
//
// /** Parse one completed transcript call and authenticate any successful REA Evidence. */
// export const parseCodexToolCall = (
//   event: unknown,
// ): ParsedCodexToolCall | undefined => {
//   const item = completedToolItem(event);
//   if (item === undefined) return undefined;
//   const status = item.status;
//   const server = item.server ?? item.server_name;
//   const tool = item.tool ?? item.name;
//   if (
//     ((item.server !== undefined || item.server_name !== undefined) &&
//       typeof server !== "string") ||
//     typeof tool !== "string" ||
//     tool.length === 0
//   )
//     return undefined;
//   const argumentsValue =
//     item.arguments !== undefined
//       ? item.arguments
//       : item.input !== undefined
//         ? item.input
//         : {};
//   const parsedArguments = jsonValueSchema.safeParse(argumentsValue);
//   if (!parsedArguments.success) return undefined;
//   const parsed: ParsedCodexToolCall = {
//     item,
//     id: typeof item.id === "string" && item.id.length > 0 ? item.id : null,
//     server: typeof server === "string" ? server : null,
//     tool,
//     arguments: parsedArguments.data,
//     evidence: [],
//   };
//   if (
//     parsed.server?.toLowerCase() !== "rea" ||
//     status === "failed" ||
//     (item.error !== undefined && item.error !== null)
//   )
//     return parsed;
//   const evidence = evidenceFromCall(item, tool);
//   if (evidence === undefined) return parsed;
//   return { ...parsed, evidence: artifactDelivery(evidence) };
// };
//
// const collectDeliveredEvidence = (
//   calls: readonly (ParsedCodexToolCall | undefined)[],
// ): DeliveredEvidence => {
//   const records = new Map<string, Evidence>();
//   const conflicts = new Set<string>();
//   for (const call of calls) {
//     for (const evidence of call?.evidence ?? []) {
//       const previous = records.get(evidence.evidence_id);
//       if (previous !== undefined && !sameJson(previous, evidence))
//         conflicts.add(evidence.evidence_id);
//       else records.set(evidence.evidence_id, evidence);
//     }
//   }
//   return { records, conflicts };
// };
//
// const matchesSubject = (
//   evidence: Evidence,
//   expected: { readonly path: string; readonly sha256?: string },
// ): boolean =>
//   evidence.subject?.local_path === expected.path &&
//   (expected.sha256 === undefined ||
//     evidence.subject.digest.sha256 === expected.sha256);
//
// const matchesParameters = (
//   evidence: Evidence,
//   expected: Readonly<Record<string, JsonValue>> | undefined,
// ): boolean =>
//   expected === undefined ||
//   Object.entries(expected).every(
//     ([key, value]) =>
//       Object.hasOwn(evidence.parameters, key) &&
//       sameJson(evidence.parameters[key], value),
//   );
//
// const matchesLinks = (
//   evidence: Evidence,
//   source: FixtureClaimExpectation["source"],
//   delivered: DeliveredEvidence,
// ): boolean =>
//   (source.linkedSubjects ?? []).every((expected) =>
export const _l = 131;
