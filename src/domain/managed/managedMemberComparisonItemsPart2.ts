export const __stub = 1;
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
//       inventory: "method",
//     });
//     return {
//       item_id: `mmc_method_${sha256({ token: member.left.token, side: "left" })}`,
//       status: limitations.length === 0 ? "removed" : "unknown",
//       left: methodIdentity(member.left),
//       right: null,
//       match: unmatchedComparison(),
//       dimensions: ["availability"],
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
//     inventory: "method",
//   });
//   return {
//     item_id: `mmc_method_${sha256({ token: member.right.token, side: "right" })}`,
//     status: limitations.length === 0 ? "added" : "unknown",
//     left: null,
//     right: methodIdentity(member.right),
//     match: unmatchedComparison(),
//     dimensions: ["availability"],
//     evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//     limitations,
//   };
// };
//
// /**
//  * Why a one-sided member's absence from the other inventory was not
//  * observed: that inventory is incomplete, the member's own signature was not
//  * decoded, so no shape round could seek a changed counterpart, or the other
//  * inventory has an unpaired (one-sided or ambiguous) same-named member whose
//  * signature was not decoded, which may be this member with a changed
//  * signature. A decoded signature that names a type REA could not name, while
//  * the comparison otherwise keys resolved signatures, is compared by raw bytes
//  * that name types by build-local row, so it is treated the same way.
//  */
// const absenceLimitations = (
//   member: Method | Field,
//   identity: string,
//   opposite: {
//     readonly oppositeComplete: boolean;
//     readonly ownIdentityUnavailable: boolean;
//     readonly unpaired: UndecodedOneSidedNames;
//     readonly opposite: "left" | "right";
//     readonly inventory: "method" | "field";
//   },
// ): string[] => [
//   ...(opposite.ownIdentityUnavailable
//     ? [
//         "declaring-type-name-not-resolved: Declared type identity could not be resolved; a bare display name cannot establish a counterpart or absence.",
//       ]
//     : []),
//   ...(opposite.unpaired.unknownOwners[opposite.opposite].has(member.name)
//     ? [
//         `counterpart-declaring-type-name-not-resolved: The ${opposite.opposite} ${opposite.inventory} inventory has an unpaired same-named member with unresolved enclosing-name identity, so absence was not established.`,
//       ]
//     : []),
//   ...(opposite.oppositeComplete
//     ? []
//     : [
//         `unknown-within-incomplete-metadata: The ${opposite.opposite} ${opposite.inventory} inventory is incomplete, so absence was not observed.`,
//       ]),
//   ...(member.signature.parse_status === "decoded"
//     ? []
//     : [
//         `signature-not-decoded: The member's ${member.signature.parse_status} signature was compared only by exact declared type, name, and signature bytes, so a changed or renamed counterpart could not be sought.`,
//       ]),
//   ...(member.signature.parse_status === "decoded" &&
//   opposite.unpaired.undecoded[opposite.opposite].has(identity)
//     ? [
//         `counterpart-signature-not-decoded: The ${opposite.opposite} ${opposite.inventory} inventory has an unpaired member with the same declared type and name whose signature was not decoded, so it may be this member with a changed signature.`,
//       ]
//     : []),
//   ...(unresolved(member, opposite.unpaired.resolved)
//     ? [
//         `signature-not-resolved: The member's signature names a type REA could not name, so it was compared by raw bytes, which name types by build-local metadata row; a counterpart whose referenced type moved rows could not be found.`,
//       ]
//     : []),
//   ...(member.signature.parse_status === "decoded" &&
//   !unresolved(member, opposite.unpaired.resolved) &&
//   opposite.unpaired.unresolved[opposite.opposite].has(identity)
//     ? [
//         `counterpart-signature-not-resolved: The ${opposite.opposite} ${opposite.inventory} inventory has an unpaired member with the same declared type and name whose signature names a type REA could not name, so it may be this member.`,
//       ]
//     : []),
// ];
//
// /** A known signature form whose type operands still compare by raw bytes. */
// const unresolved = (member: Method | Field, resolved: boolean): boolean =>
//   resolved &&
//   member.signature.kind !== "unknown" &&
//   member.signature.resolved_sha256 === null;
//
// /** Equal build-local bytes cannot establish equal unresolved type operands. */
// const pairedSignatureLimitations = (
//   left: Method | Field,
//   right: Method | Field,
//   examined: boolean,
// ): string[] =>
//   unresolved(left, examined) || unresolved(right, examined)
//     ? [
//         "signature-not-resolved: At least one signature names a type REA could not resolve; equal build-local row bytes do not establish equivalent signature types.",
//       ]
//     : [];
//
// /**
//  * Declared names of unpaired members whose signature was not decoded: one-sided
//  * members and candidates of ambiguous groups, which also remain unpaired.
//  */
// interface Unpaired {
//   readonly item: Method | Field;
//   readonly identity: string;
//   readonly identityUnavailable: boolean;
// }
//
// const undecodedOneSidedNames = (
//   members: {
//     readonly leftOnly: readonly Unpaired[];
//     readonly rightOnly: readonly Unpaired[];
//     readonly ambiguous: readonly {
//       readonly left: readonly Unpaired[];
//       readonly right: readonly Unpaired[];
//     }[];
//   },
//   resolved: boolean,
// ): UndecodedOneSidedNames => {
//   const sides = {
//     left: [
//       ...members.leftOnly,
//       ...members.ambiguous.flatMap(({ left }) => left),
//     ],
//     right: [
export const _l = 153;
