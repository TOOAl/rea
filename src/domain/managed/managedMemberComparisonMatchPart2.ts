export const __stub = 1;
// ) =>
//   matchByKeys({
//     left,
//     right,
//     rounds: [
//       {
//         basis: "exact-il-signature",
//         key: declaredAs(({ exactKey }) => exactKey),
//       },
//       {
//         basis: "exact-signature",
//         key: ({ signatureKey }) => signatureKey,
//         competitionKey: ({ signatureId }) => signatureId,
//       },
//       {
//         basis: "structural-method-shape",
//         // An unresolved owner has no declared shape match to prove.
//         key: declaredAs((keyed) =>
//           keyed.identityUnavailable ? null : keyed.structuralKey,
//         ),
//         competitionKey: ({ structuralKey }) => structuralKey,
//       },
//       {
//         basis: "exact-il-signature",
//         key: ({ exactKey }) => exactKey,
//         remap: true,
//       },
//       {
//         basis: "structural-method-shape",
//         key: ({ structuralKey }) => structuralKey,
//         competitionKey: ({ structuralKey }) => structuralKey,
//         remap: true,
//       },
//     ],
//   });
//
// const matchFields = (
//   left: readonly Keyed<Field>[],
//   right: readonly Keyed<Field>[],
// ) =>
//   matchByKeys({
//     left,
//     right,
//     rounds: [
//       {
//         basis: "field-signature",
//         key: declaredAs(({ exactKey }) => exactKey),
//       },
//       {
//         basis: "exact-signature",
//         key: ({ signatureKey }) => signatureKey,
//         competitionKey: ({ signatureId }) => signatureId,
//       },
//       {
//         basis: "field-signature",
//         key: ({ exactKey }) => exactKey,
//         remap: true,
//       },
//     ],
//   });
//
// export type ManagedMethodMatches = ReturnType<typeof matchMethods>;
// export type ManagedFieldMatches = ReturnType<typeof matchFields>;
//
// interface MatchRound<Item> {
//   readonly basis: ConcreteMatchBasis;
//   readonly key: (item: Keyed<Item>) => string | null;
//   /** Name-free evidence paired with the retained member name for contesting. */
//   readonly competitionKey?: (item: Keyed<Item>) => string | null;
//   /**
//    * The key omits the declared type, so a pair may join different declared
//    * identities; same-identity pairs were taken by earlier rounds. Contention
//    * still retains the member name, which unresolved owners keep as evidence.
//    * A member whose own identity is still unpaired on the other side does not
//    * take part, and a group with a member of an unresolved type stays ambiguous.
//    */
//   readonly remap?: true;
// }
//
// interface MatchByKeysInput<Item> {
//   readonly left: readonly Keyed<Item>[];
//   readonly right: readonly Keyed<Item>[];
//   readonly rounds: readonly MatchRound<Item>[];
// }
//
// export const identityOf = ({
//   declaring_type,
//   name,
// }: {
//   readonly declaring_type: DeclaredName;
//   readonly name: string;
// }): string => sha256([declaring_type, name]);
//
// /** Narrow a key to members of one declared type and name. */
// const declaredAs =
//   <Item>(key: (item: Keyed<Item>) => string | null) =>
//   (item: Keyed<Item>): string | null => {
//     const value = key(item);
//     return value === null || item.identityUnavailable
//       ? null
//       : sha256([item.identity, value]);
//   };
//
// const matchByKeys = <Item extends Declared>({
//   left,
//   right,
//   rounds,
// }: MatchByKeysInput<Item>): {
//   readonly pairs: readonly MatchedPair<Item>[];
//   readonly ambiguous: readonly Ambiguous<Item>[];
//   readonly leftOnly: readonly Keyed<Item>[];
//   readonly rightOnly: readonly Keyed<Item>[];
// } => {
//   const usedLeft = new Set<Keyed<Item>>();
//   const usedRight = new Set<Keyed<Item>>();
//   const pairedLeft = new Set<Keyed<Item>>();
//   const pairedRight = new Set<Keyed<Item>>();
//   const pairs: MatchedPair<Item>[] = [];
//   const ambiguous: Ambiguous<Item>[] = [];
//   for (const round of rounds) {
//     const competitionKey = round.competitionKey ?? ((item) => item.exactKey);
//     const unpairedLeft = unpairedOf(left, pairedLeft);
//     const unpairedRight = unpairedOf(right, pairedRight);
//     const declarable = declaredCandidates(
//       unpairedLeft,
//       unpairedRight,
//       competitionKey,
//     );
//     const openLeft = left.filter((item) => !usedLeft.has(item));
//     const openRight = right.filter((item) => !usedRight.has(item));
//     // Only open candidates can justify overriding a held declared identity:
//     // consumed ambiguous rows remain identity barriers, but cannot join a
//     // later remap group to establish its ambiguity.
//     const remapContested =
//       round.remap === true
//         ? ownerlessContested([openLeft, openRight], competitionKey)
//         : new Set<string>();
//     const leftGroups = groupBy(
//       round.remap === true
//         ? remappable(openLeft, unpairedRight, competitionKey, remapContested)
//         : openLeft.filter(declarable),
//       round.key,
//     );
//     const rightGroups = groupBy(
//       round.remap === true
//         ? remappable(openRight, unpairedLeft, competitionKey, remapContested)
//         : openRight.filter(declarable),
//       round.key,
export const _l = 148;
