export const __stub = 1;
// const buildAdjacency = (
//   language: PartialOrderLanguage,
//   context: z.RefinementCtx,
//   known: ReadonlySet<string>,
// ): ReadonlyMap<string, Set<string>> => {
//   const adjacency = new Map([...known].map((id) => [id, new Set<string>()]));
//   for (const [index, edge] of language.happens_before.entries()) {
//     const path = ["language", "happens_before", index];
//     addReferenceIssue(context, known, edge.before, [...path, "before"]);
//     addReferenceIssue(context, known, edge.after, [...path, "after"]);
//     if (edge.before === edge.after)
//       context.addIssue({
//         code: "custom",
//         message: "happens-before edges must reference distinct events",
//         path,
//       });
//     adjacency.get(edge.before)?.add(edge.after);
//   }
//   return adjacency;
// };
//
// const validateNotBefore = (
//   language: PartialOrderLanguage,
//   context: z.RefinementCtx,
//   known: ReadonlySet<string>,
// ): ReadonlySet<string> => {
//   const pairs = new Set<string>();
//   for (const [index, constraint] of language.not_before.entries()) {
//     const path = ["language", "not_before", index];
//     addReferenceIssue(context, known, constraint.event, [...path, "event"]);
//     addReferenceIssue(context, known, constraint.anchor, [...path, "anchor"]);
//     if (constraint.event === constraint.anchor)
//       context.addIssue({
//         code: "custom",
//         message: "not-before constraints must reference distinct events",
//         path,
//       });
//     const key = pairKey(constraint.event, constraint.anchor);
//     if (pairs.has(key))
//       context.addIssue({
//         code: "custom",
//         message: "not-before event pairs must be declared once",
//         path,
//       });
//     pairs.add(key);
//   }
//   return pairs;
// };
//
// const classifyGraph = (
//   ids: readonly string[],
//   adjacency: ReadonlyMap<string, ReadonlySet<string>>,
// ): GraphFacts => {
//   const incoming = new Map(ids.map((id) => [id, 0]));
//   let hasUnknownSuccessor = false;
//   for (const successors of adjacency.values())
//     for (const successor of successors) {
//       const count = incoming.get(successor);
//       if (count === undefined) hasUnknownSuccessor = true;
//       else incoming.set(successor, count + 1);
//     }
//   const ready = [...incoming].flatMap(([id, count]) =>
//     count === 0 ? [id] : [],
//   );
//   const order: string[] = [];
//   let unique = true;
//   while (ready.length > 0) {
//     if (ready.length !== 1) unique = false;
//     const current = ready.pop();
//     if (current === undefined) continue;
//     order.push(current);
//     for (const successor of adjacency.get(current) ?? []) {
//       const count = incoming.get(successor);
//       if (count === undefined) continue;
//       incoming.set(successor, count - 1);
//       if (count === 1) ready.push(successor);
//     }
//   }
//   if (order.length !== incoming.size) return { kind: "cyclic" };
//   if (unique && order.length === ids.length && !hasUnknownSuccessor) {
//     return {
//       kind: "total-order",
//       rank: new Map(order.map((id, index) => [id, index])),
//     };
//   }
//   const reverseAdjacency = new Map(
//     [...incoming.keys()].map((id) => [id, new Set<string>()]),
//   );
//   for (const [before, successors] of adjacency)
//     for (const after of successors) reverseAdjacency.get(after)?.add(before);
//   return { kind: "partial-order", reverseAdjacency };
// };
//
// const collectReachable = (
//   origin: string,
//   adjacency: ReadonlyMap<string, ReadonlySet<string>>,
// ): ReadonlySet<string> => {
//   const seen = new Set<string>();
//   const pending = [...(adjacency.get(origin) ?? [])];
//   while (pending.length > 0) {
//     const current = pending.pop();
//     if (current === undefined || seen.has(current)) continue;
//     seen.add(current);
//     for (const successor of adjacency.get(current) ?? [])
//       pending.push(successor);
//   }
//   return seen;
// };
//
// const validateUnorderedGroups = (
//   language: PartialOrderLanguage,
//   context: z.RefinementCtx,
//   known: ReadonlySet<string>,
// ): {
//   readonly groups: readonly ReadonlySet<string>[];
//   hasPair(left: string, right: string): boolean;
//   markDeclaredPairConflicts(
//     pairs: ReadonlySet<string>,
//     conflicts: boolean[],
//   ): void;
//   markSharedGroups(left: string, right: string, conflicts: boolean[]): void;
// } => {
//   const memberships = new Map<string, Set<number>>();
//   const groups: Set<string>[] = [];
//   const repeatedMemberships = new Map<string, Set<number>>();
//   for (const [groupIndex, group] of language.unordered_groups.entries()) {
//     const path = ["language", "unordered_groups", groupIndex];
//     const uniqueIds = new Set<string>();
//     const repeatedIds = new Set<string>();
//     for (const id of group.events) {
//       if (uniqueIds.has(id)) repeatedIds.add(id);
//       else uniqueIds.add(id);
//     }
//     groups.push(uniqueIds);
//     for (const id of repeatedIds) {
//       const groupIndexes = repeatedMemberships.get(id) ?? new Set<number>();
//       groupIndexes.add(groupIndex);
//       repeatedMemberships.set(id, groupIndexes);
//     }
//     if (uniqueIds.size !== group.events.length)
//       context.addIssue({
//         code: "custom",
//         message: "unordered groups must not repeat event ids",
//         path: [...path, "events"],
//       });
//     for (const [eventIndex, id] of group.events.entries())
//       addReferenceIssue(context, known, id, [...path, "events", eventIndex]);
//     const overlaps = new Map<number, number>();
//     for (const id of uniqueIds) {
//       const priorGroups = memberships.get(id) ?? new Set<number>();
//       for (const prior of priorGroups)
//         overlaps.set(prior, (overlaps.get(prior) ?? 0) + 1);
//       priorGroups.add(groupIndex);
//       memberships.set(id, priorGroups);
//     }
//     if ([...overlaps.values()].some((count) => count > 1))
//       context.addIssue({
//         code: "custom",
//         message: "unordered event pairs must be declared once",
//         path,
//       });
//   }
//   const markSharedGroups = (
//     left: string,
//     right: string,
//     conflicts: boolean[],
//   ): void => {
//     if (left === right) {
//       for (const groupIndex of repeatedMemberships.get(left) ?? [])
export const _l = 169;
