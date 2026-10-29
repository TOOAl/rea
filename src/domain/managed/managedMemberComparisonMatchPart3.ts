export const __stub = 1;
//     );
//     for (const [key, leftItems] of leftGroups) {
//       const rightItems = rightGroups.get(key);
//       if (rightItems === undefined) continue;
//       // An unresolved owner may be either member's own counterpart, so a
//       // remap group it joins stays ambiguous.
//       const refused =
//         round.remap === true &&
//         [...leftItems, ...rightItems].some(
//           ({ identityUnavailable }) => identityUnavailable,
//         );
//       if (!refused && leftItems.length === 1 && rightItems.length === 1) {
//         const [leftItem] = leftItems;
//         const [rightItem] = rightItems;
//         if (leftItem === undefined || rightItem === undefined) continue;
//         usedLeft.add(leftItem);
//         usedRight.add(rightItem);
//         pairedLeft.add(leftItem);
//         pairedRight.add(rightItem);
//         pairs.push({
//           left: leftItem,
//           right: rightItem,
//           basis: round.basis,
//           confidence:
//             round.basis === "exact-il-signature" ||
//             round.basis === "exact-signature" ||
//             round.basis === "field-signature"
//               ? "exact"
//               : "high",
//         });
//       } else {
//         for (const item of leftItems) usedLeft.add(item);
//         for (const item of rightItems) usedRight.add(item);
//         ambiguous.push({
//           left: leftItems,
//           right: rightItems,
//           basis: round.basis,
//         });
//       }
//     }
//   }
//   // Contention can prevent a declared signature pair even when CIL/shape
//   // evidence cannot form a later remap. Held ambiguities still contest
//   // ownership; only proven pairs leave that evidence pool. Group only open
//   // candidates so held members retain their original ambiguity and provenance.
//   for (const group of unresolvedSignatureAmbiguities(
//     left.filter((item) => !usedLeft.has(item)),
//     right.filter((item) => !usedRight.has(item)),
//     ownerlessContested(
//       [unpairedOf(left, pairedLeft), unpairedOf(right, pairedRight)],
//       (member) => member.signatureId,
//     ),
//   )) {
//     for (const item of group.left) usedLeft.add(item);
//     for (const item of group.right) usedRight.add(item);
//     ambiguous.push(group);
//   }
//   return {
//     pairs,
//     ambiguous,
//     leftOnly: left.filter((item) => !usedLeft.has(item)),
//     rightOnly: right.filter((item) => !usedRight.has(item)),
//   };
// };
//
// /** Open signature choices contested by unresolved owners, including held rows. */
// const unresolvedSignatureAmbiguities = <Item extends Declared>(
//   left: readonly Keyed<Item>[],
//   right: readonly Keyed<Item>[],
//   contested: ReadonlySet<string>,
// ): Ambiguous<Item>[] => {
//   const key = (member: Keyed<Item>): string =>
//     competitionIdentityKey(member, member.signatureId) ?? "";
//   const leftGroups = groupBy(left, key);
//   const rightGroups = groupBy(right, key);
//   const groups: Ambiguous<Item>[] = [];
//   for (const [signature, leftItems] of leftGroups) {
//     const rightItems = rightGroups.get(signature);
//     if (!contested.has(signature) || rightItems === undefined) continue;
//     groups.push({
//       left: leftItems,
//       right: rightItems,
//       basis: "exact-signature",
//     });
//   }
//   return groups;
// };
//
// interface Declared {
//   readonly declaring_type: string | null;
//   readonly name: string;
// }
//
// const unpairedOf = <Item>(
//   items: readonly Keyed<Item>[],
//   paired: ReadonlySet<Keyed<Item>>,
// ): Keyed<Item>[] => items.filter((item) => !paired.has(item));
//
// /**
//  * Round-specific evidence keys an unresolved owner competes for, paired with
//  * its retained member name. Another same-name member on the same side can be
//  * the unresolved row's owner; a different name cannot. Contested candidates
//  * stay in remap rounds rather than pairing by declared identity.
//  */
// const competitionIdentityKey = <Item extends Declared>(
//   member: Keyed<Item>,
//   evidenceKey: string | null,
// ): string | null =>
//   evidenceKey === null ? null : JSON.stringify([member.item.name, evidenceKey]);
//
// const ownerlessContested = <Item extends Declared>(
//   sides: readonly (readonly Keyed<Item>[])[],
//   keyOf: (item: Keyed<Item>) => string | null,
// ): ReadonlySet<string> => {
//   const contested = new Set<string>();
//   for (const side of sides) {
//     const seen = new Map<string, number>();
//     const ownerless = new Set<string>();
//     for (const member of side) {
//       const key = competitionIdentityKey(member, keyOf(member));
//       if (key === null) continue;
//       seen.set(key, (seen.get(key) ?? 0) + 1);
//       if (member.identityUnavailable) ownerless.add(key);
//     }
//     for (const key of ownerless)
//       if ((seen.get(key) ?? 0) > 1) contested.add(key);
//   }
//   return contested;
// };
//
// /**
//  * Members a remap round may group: an unresolved owner, which keeps its group
//  * ambiguous; a member whose selected key an unresolved owner competes for, so the
//  * group that preserved the base matcher's ambiguity can form; or no member of
//  * the same declared identity left unpaired on the other side, whether
//  * one-sided or in an ambiguous group. The sets are taken before grouping, so
//  * no group order decides a remap.
//  */
// const remappable = <Item extends Declared>(
//   items: readonly Keyed<Item>[],
//   others: readonly Keyed<Item>[],
//   keyOf: (item: Keyed<Item>) => string | null,
//   contested: ReadonlySet<string>,
// ): Keyed<Item>[] => {
//   const kept = new Set(others.map(({ identity }) => identity));
//   return items.filter((member) => {
//     const key = keyOf(member);
//     return (
export const _l = 148;
