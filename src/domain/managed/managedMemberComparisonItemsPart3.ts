export const __stub = 1;
//       ...members.rightOnly,
//       ...members.ambiguous.flatMap(({ right }) => right),
//     ],
//   };
//   const names = (
//     side: readonly Unpaired[],
//     keep: (item: Method | Field) => boolean,
//   ) =>
//     new Set(
//       side.filter(({ item }) => keep(item)).map(({ identity }) => identity),
//     );
//   const undecoded = (item: Method | Field) =>
//     item.signature.parse_status !== "decoded";
//   const notResolved = (item: Method | Field) => unresolved(item, resolved);
//   return {
//     resolved,
//     unknownOwners: {
//       left: new Set(
//         sides.left.filter((x) => x.identityUnavailable).map((x) => x.item.name),
//       ),
//       right: new Set(
//         sides.right
//           .filter((x) => x.identityUnavailable)
//           .map((x) => x.item.name),
//       ),
//     },
//     undecoded: {
//       left: names(sides.left, undecoded),
//       right: names(sides.right, undecoded),
//     },
//     unresolved: {
//       left: names(sides.left, notResolved),
//       right: names(sides.right, notResolved),
//     },
//   };
// };
//
// const fieldOnlyItem = (
//   member: OneSided<Field>,
//   identity: string,
//   identityUnavailable: boolean,
//   context: ComparisonItemContext,
//   undecoded: UndecodedOneSidedNames,
// ): FieldItem => {
//   if (member.left !== undefined) {
//     const limitations = absenceLimitations(member.left, identity, {
//       oppositeComplete: inventoryCovers(
//         context.rightComplete,
//         context.rightSelection,
//         member.left,
//       ),
//       unpaired: undecoded,
//       ownIdentityUnavailable: identityUnavailable,
//       opposite: "right",
//       inventory: "field",
//     });
//     return {
//       item_id: `mmc_field_${sha256({ token: member.left.token, side: "left" })}`,
//       status: limitations.length === 0 ? "removed" : "unknown",
//       left: fieldIdentity(member.left),
//       right: null,
//       match: unmatchedComparison(),
//       evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//       limitations,
//     };
//   }
//
//   const limitations = absenceLimitations(member.right, identity, {
//     oppositeComplete: inventoryCovers(
//       context.leftComplete,
//       context.leftSelection,
//       member.right,
//     ),
//     unpaired: undecoded,
//     ownIdentityUnavailable: identityUnavailable,
//     opposite: "left",
//     inventory: "field",
//   });
//   return {
//     item_id: `mmc_field_${sha256({ token: member.right.token, side: "right" })}`,
//     status: limitations.length === 0 ? "added" : "unknown",
//     left: null,
//     right: fieldIdentity(member.right),
//     match: unmatchedComparison(),
//     evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//     limitations,
//   };
// };
//
// /**
//  * Name only evidence shared by the whole group. Exact-signature ambiguities
//  * include both declared-identity collisions and unresolved signature choices.
//  */
// const ambiguityLimitation = (
//   members: "methods" | "fields",
//   basis: MethodItem["match"]["basis"],
//   identityUnavailable: boolean,
// ): string =>
//   identityUnavailable
//     ? "declaring-type-name-not-resolved: Declared type identity remains unresolved; REA did not guess a counterpart from display names, signatures or CIL."
//     : basis === "exact-signature"
//       ? `Multiple managed ${members} share the same signature; REA did not guess declared ownership or a token remap.`
//       : basis === "exact-il-signature"
//         ? "Multiple managed methods share the same CIL and signature; REA did not guess a token remap."
//         : members === "methods"
//           ? "Multiple managed methods share the same structural shape; REA did not guess a token remap."
//           : "Multiple managed fields share the same signature; REA did not guess a token remap.";
//
// export const buildMethodItems = (
//   matches: ManagedMethodMatches,
//   context: ComparisonItemContext,
// ): MethodItem[] => {
//   const items: MethodItem[] = [];
//   for (const pair of matches.pairs) {
//     const signatureLimitations = pairedSignatureLimitations(
//       pair.left.item,
//       pair.right.item,
//       context.signatureResolutionExamined,
//     );
//     const { dimensions: observedDimensions, bodyUnknown } = methodDimensions(
//       pair.left.item,
//       pair.right.item,
//     );
//     const dimensions = bodyUnknown
//       ? [...observedDimensions, "body-coverage" as const]
//       : observedDimensions;
//     const observedChange = observedDimensions.length > 0;
//     items.push({
//       item_id: `mmc_method_${sha256({
//         left: pair.left.item.token,
//         right: pair.right.item.token,
//         basis: pair.basis,
//       })}`,
//       status: observedChange
//         ? "changed"
//         : bodyUnknown || signatureLimitations.length > 0
//           ? "unknown"
//           : "unchanged",
//       left: methodIdentity(pair.left.item),
//       right: methodIdentity(pair.right.item),
//       match: {
//         status: "matched",
//         basis: pair.basis,
//         confidence: pair.confidence,
//         candidate_left_tokens: [],
//         candidate_right_tokens: [],
//       },
//       dimensions,
//       evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//       limitations: [
//         ...signatureLimitations,
//         ...(bodyUnknown
//           ? [
export const _l = 153;
