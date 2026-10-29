export const __stub = 1;
//         conflicts[groupIndex] = true;
//       return;
//     }
//     const rightGroups = memberships.get(right);
//     for (const group of memberships.get(left) ?? [])
//       if (rightGroups?.has(group) === true) conflicts[group] = true;
//   };
//   return {
//     groups,
//     hasPair(left, right) {
//       if (left === right) return memberships.has(left);
//       const rightGroups = memberships.get(right);
//       for (const group of memberships.get(left) ?? [])
//         if (rightGroups?.has(group) === true) return true;
//       return false;
//     },
//     markDeclaredPairConflicts(pairs, conflicts) {
//       for (const key of pairs) {
//         const separator = key.indexOf("\0");
//         const left = key.slice(0, separator);
//         const right = key.slice(separator + 1);
//         markSharedGroups(left, right, conflicts);
//       }
//     },
//     markSharedGroups,
//   };
// };
//
// const validateTotalOrderRelations = (
//   language: PartialOrderLanguage,
//   graph: Extract<GraphFacts, { kind: "total-order" }>,
//   unorderedGroups: ReturnType<typeof validateUnorderedGroups>,
//   notBeforePairs: ReadonlySet<string>,
//   context: z.RefinementCtx,
// ): void => {
//   for (const [index, constraint] of language.not_before.entries()) {
//     const before = graph.rank.get(constraint.event);
//     const after = graph.rank.get(constraint.anchor);
//     if (before !== undefined && after !== undefined && before < after)
//       context.addIssue({
//         code: "custom",
//         message: "not-before constraint conflicts with happens-before order",
//         path: ["language", "not_before", index],
//       });
//   }
//
//   const conflicts = new Array<boolean>(language.unordered_groups.length).fill(
//     false,
//   );
//   for (const [groupIndex, group] of unorderedGroups.groups.entries()) {
//     let comparableEvents = 0;
//     for (const id of group)
//       if (graph.rank.has(id) && ++comparableEvents === 2) {
//         conflicts[groupIndex] = true;
//         break;
//       }
//   }
//   unorderedGroups.markDeclaredPairConflicts(notBeforePairs, conflicts);
//   addUnorderedConflictIssues(conflicts, context);
// };
//
// const addUnorderedConflictIssues = (
//   conflicts: readonly boolean[],
//   context: z.RefinementCtx,
// ): void => {
//   for (const [groupIndex, conflict] of conflicts.entries())
//     if (conflict)
//       context.addIssue({
//         code: "custom",
//         message: "ordered events cannot also be declared unordered",
//         path: ["language", "unordered_groups", groupIndex],
//       });
// };
//
// const validatePartialOrderRelations = (
//   ids: readonly string[],
//   language: PartialOrderLanguage,
//   adjacency: ReadonlyMap<string, ReadonlySet<string>>,
//   graph: Extract<GraphFacts, { kind: "partial-order" }>,
//   unorderedGroups: ReturnType<typeof validateUnorderedGroups>,
//   notBeforePairs: ReadonlySet<string>,
//   context: z.RefinementCtx,
// ): void => {
//   let missingPairCount = 0;
//   let firstMissingPair = "";
//   const groupConflicts = new Array<boolean>(
//     language.unordered_groups.length,
//   ).fill(false);
//   unorderedGroups.markDeclaredPairConflicts(notBeforePairs, groupConflicts);
//   const notBeforeConflictFlags = new Uint8Array(language.not_before.length);
//   const constraintsBySource = new Map<string, number[]>();
//   for (const [index, constraint] of language.not_before.entries()) {
//     const indexes = constraintsBySource.get(constraint.event) ?? [];
//     indexes.push(index);
//     constraintsBySource.set(constraint.event, indexes);
//   }
//
//   // Keep only one origin's forward and backward closure live at a time. Pair
//   // iteration stays in declaration order so the count and first missing pair
//   // retain the established diagnostic semantics.
//   for (const [leftIndex, leftId] of ids.entries()) {
//     const forward = collectReachable(leftId, adjacency);
//     const backward = collectReachable(leftId, graph.reverseAdjacency);
//     for (const constraintIndex of constraintsBySource.get(leftId) ?? []) {
//       const constraint = language.not_before[constraintIndex];
//       if (constraint !== undefined && forward.has(constraint.anchor))
//         notBeforeConflictFlags[constraintIndex] = 1;
//     }
//     for (
//       let rightIndex = leftIndex + 1;
//       rightIndex < ids.length;
//       rightIndex++
//     ) {
//       const rightId = ids[rightIndex];
//       if (rightId === undefined) continue;
//       const sameEvent = leftId === rightId;
//       const ordered =
//         !sameEvent && (forward.has(rightId) || backward.has(rightId));
//       const key = pairKey(leftId, rightId);
//       const notBefore = notBeforePairs.has(key);
//       const unordered = unorderedGroups.hasPair(leftId, rightId);
//       if (ordered || notBefore) {
//         if (!sameEvent)
//           unorderedGroups.markSharedGroups(leftId, rightId, groupConflicts);
//       }
//       if (!ordered && !notBefore && !unordered) {
//         if (missingPairCount === 0) firstMissingPair = `${leftId}/${rightId}`;
//         missingPairCount++;
//       }
//     }
//   }
//
//   for (const [index, conflict] of notBeforeConflictFlags.entries())
//     if (conflict === 1)
//       context.addIssue({
//         code: "custom",
//         message: "not-before constraint conflicts with happens-before order",
//         path: ["language", "not_before", index],
//       });
//   addUnorderedConflictIssues(groupConflicts, context);
//
//   if (missingPairCount > 0)
//     context.addIssue({
//       code: "custom",
//       message:
//         missingPairCount === 1
//           ? `event pair ${firstMissingPair} must be explicitly ordered or unordered`
//           : `${String(missingPairCount)} event pairs must be explicitly ordered or unordered; first undeclared pair: ${firstMissingPair}`,
//       path: ["language"],
//     });
// };
//
// const validatePartialOrder = (
//   specification: ProcessTraceSpecification,
//   context: z.RefinementCtx,
// ): void => {
//   if (specification.language.kind !== "partial_order") return;
//   const ids = specification.events.map(({ id }) => id);
//   const known = new Set(ids);
//   const adjacency = buildAdjacency(specification.language, context, known);
//   const graph = classifyGraph(ids, adjacency);
//   if (graph.kind === "cyclic")
//     context.addIssue({
//       code: "custom",
//       message: "happens-before graph must be acyclic",
//       path: ["language"],
//     });
//   const notBeforePairs = validateNotBefore(
//     specification.language,
export const _l = 169;
