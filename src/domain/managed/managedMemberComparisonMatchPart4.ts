export const __stub = 1;
//       (key !== null &&
//         contested.has(competitionIdentityKey(member, key) ?? "")) ||
//       member.identityUnavailable ||
//       !kept.has(member.identity)
//     );
//   });
// };
//
// /** A declared round needs a resolved owner and no unresolved contender. */
// const declaredCandidates = <Item extends Declared>(
//   left: readonly Keyed<Item>[],
//   right: readonly Keyed<Item>[],
//   keyOf: (item: Keyed<Item>) => string | null,
// ): ((member: Keyed<Item>) => boolean) => {
//   const contested = ownerlessContested([left, right], keyOf);
//   return (member) => {
//     if (member.identityUnavailable) return false;
//     const key = competitionIdentityKey(member, keyOf(member));
//     return key === null || !contested.has(key);
//   };
// };
//
// const groupBy = <Item>(
//   items: readonly Item[],
//   keyOf: (item: Item) => string | null,
// ): Map<string, readonly Item[]> => {
//   const grouped = new Map<string, Item[]>();
//   for (const item of items) {
//     const key = keyOf(item);
//     if (key === null) continue;
//     const bucket = grouped.get(key) ?? [];
//     bucket.push(item);
//     grouped.set(key, bucket);
//   }
//   return grouped;
// };
//
// /** Whether a side's inventory observed members of this declaring type. */
// const observedBy =
//   (side: ManagedMemberComparisonSide) =>
//   ({ declaring_type }: { readonly declaring_type: string | null }): boolean =>
//     side.result.selection === null ||
//     (declaring_type !== null &&
//       side.result.selection.type_names.includes(declaring_type));
//
// /**
//  * Pair only members whose declaring type both sides observed. A member outside
//  * the other side's selection stays one-sided, so a type selection never yields
//  * a remap to a member of a type the other side did not inspect.
//  */
// const matchObserved = <Item extends Declared>(
//   left: readonly Item[],
//   right: readonly Item[],
//   sides: {
//     readonly inLeft: (item: Item) => boolean;
//     readonly inRight: (item: Item) => boolean;
//   },
//   match: (
//     left: readonly Keyed<Item>[],
//     right: readonly Keyed<Item>[],
//   ) => ReturnType<typeof matchByKeys<Item>>,
//   keyLeft: (item: Item) => Keyed<Item>,
//   keyRight: (item: Item) => Keyed<Item>,
// ): ReturnType<typeof matchByKeys<Item>> => {
//   const matched = match(
//     left.filter(sides.inRight).map(keyLeft),
//     right.filter(sides.inLeft).map(keyRight),
//   );
//   return {
//     ...matched,
//     leftOnly: [
//       ...matched.leftOnly,
//       ...left.filter((item) => !sides.inRight(item)).map(keyLeft),
//     ],
//     rightOnly: [
//       ...matched.rightOnly,
//       ...right.filter((item) => !sides.inLeft(item)).map(keyRight),
//     ],
//   };
// };
//
// export const keyMembers = (
//   observedLeft: ManagedMemberComparisonSide,
//   observedRight: ManagedMemberComparisonSide,
// ): {
//   readonly methodMatches: ReturnType<typeof matchMethods>;
//   readonly fieldMatches: ReturnType<typeof matchFields>;
// } => {
//   const [left, right] = comparableSides(observedLeft, observedRight);
//   const sides = { inLeft: observedBy(left), inRight: observedBy(right) };
//   const modern =
//     left.result.nesting_read !== null && right.result.nesting_read !== null;
//   const declared = (inspection: ManagedMemberInspection): DeclaredNameOf => {
//     const names = new Map(
//       inspection.types.map((type) => [type.token, type.name_sha256]),
//     );
//     return (item) => {
//       if (inspection.nesting_read === false) return null;
//       const digest = names.get(item.declaring_type_token ?? "");
//       // A historical counterpart cannot repair an observed current name gap.
//       if (inspection.nesting_read !== null && digest == null) return null;
//       // Historical observations retain their explicitly limited bare-name mode.
//       if (!modern) return item.declaring_type;
//       return digest == null ? null : ["nominal-name-sha256", digest];
//     };
//   };
//   const declaredLeft = declared(left.result);
//   const declaredRight = declared(right.result);
//   return {
//     methodMatches: matchObserved(
//       left.result.methods,
//       right.result.methods,
//       sides,
//       matchMethods,
//       (item) => keyMethod(item, declaredLeft),
//       (item) => keyMethod(item, declaredRight),
//     ),
//     fieldMatches: matchObserved(
//       left.result.fields,
//       right.result.fields,
//       sides,
//       matchFields,
//       (item) => keyField(item, declaredLeft),
//       (item) => keyField(item, declaredRight),
//     ),
//   };
// };
//
// export const parseManagedMemberEvidence = (
//   evidence: unknown,
// ): {
//   readonly evidenceId: string;
//   readonly result: ManagedMemberInspection;
// } => {
//   const parsed = parseManagedInspectionEvidence(
//     evidence,
//     "inspect_managed_members",
//     managedMemberInspectionSchema,
//   );
//   return {
//     evidenceId: parsed.evidence.evidence_id,
//     result: parsed.result,
//   };
// };
export const _l = 144;
