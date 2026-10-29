export const __stub = 1;
//               "Method body facets are unknown because at least one side has unavailable or partial body data.",
//             ]
//           : []),
//       ],
//     });
//   }
//   for (const ambiguous of matches.ambiguous) {
//     items.push({
//       item_id: `mmc_method_${sha256({
//         left: ambiguous.left.map(({ item }) => item.token),
//         right: ambiguous.right.map(({ item }) => item.token),
//         basis: ambiguous.basis,
//       })}`,
//       status: "unknown",
//       left: null,
//       right: null,
//       match: {
//         status: "ambiguous",
//         basis: ambiguous.basis,
//         confidence: "unknown",
//         candidate_left_tokens: ambiguous.left.map(({ item }) => item.token),
//         candidate_right_tokens: ambiguous.right.map(({ item }) => item.token),
//       },
//       dimensions: ["availability"],
//       evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//       limitations: [
//         ambiguityLimitation(
//           "methods",
//           ambiguous.basis,
//           ambiguous.left.some((item) => item.identityUnavailable) ||
//             ambiguous.right.some((item) => item.identityUnavailable),
//         ),
//       ],
//     });
//   }
//   const undecoded = undecodedOneSidedNames(
//     matches,
//     context.signatureResolutionExamined,
//   );
//   for (const item of matches.leftOnly)
//     items.push(
//       methodOnlyItem(
//         { left: item.item },
//         item.identity,
//         item.identityUnavailable,
//         context,
//         undecoded,
//       ),
//     );
//   for (const item of matches.rightOnly)
//     items.push(
//       methodOnlyItem(
//         { right: item.item },
//         item.identity,
//         item.identityUnavailable,
//         context,
//         undecoded,
//       ),
//     );
//   return items;
// };
//
// export const buildFieldItems = (
//   matches: ManagedFieldMatches,
//   context: ComparisonItemContext,
// ): FieldItem[] => {
//   const items: FieldItem[] = [];
//   for (const pair of matches.pairs) {
//     const signatureLimitations = pairedSignatureLimitations(
//       pair.left.item,
//       pair.right.item,
//       context.signatureResolutionExamined,
//     );
//     const changed =
//       signatureIdentity(pair.left.item.signature) !==
//         signatureIdentity(pair.right.item.signature) ||
//       pair.left.item.flags !== pair.right.item.flags;
//     items.push({
//       item_id: `mmc_field_${sha256({
//         left: pair.left.item.token,
//         right: pair.right.item.token,
//       })}`,
//       status: changed
//         ? "changed"
//         : signatureLimitations.length > 0
//           ? "unknown"
//           : "unchanged",
//       left: fieldIdentity(pair.left.item),
//       right: fieldIdentity(pair.right.item),
//       match: {
//         status: "matched",
//         basis: pair.basis,
//         confidence: pair.confidence,
//         candidate_left_tokens: [],
//         candidate_right_tokens: [],
//       },
//       evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//       limitations: signatureLimitations,
//     });
//   }
//   for (const ambiguous of matches.ambiguous)
//     items.push({
//       item_id: `mmc_field_${sha256({
//         left: ambiguous.left.map(({ item }) => item.token),
//         right: ambiguous.right.map(({ item }) => item.token),
//       })}`,
//       status: "unknown",
//       left: null,
//       right: null,
//       match: {
//         status: "ambiguous",
//         basis: ambiguous.basis,
//         confidence: "unknown",
//         candidate_left_tokens: ambiguous.left.map(({ item }) => item.token),
//         candidate_right_tokens: ambiguous.right.map(({ item }) => item.token),
//       },
//       evidence_links: [context.leftEvidenceId, context.rightEvidenceId],
//       limitations: [
//         ambiguityLimitation(
//           "fields",
//           ambiguous.basis,
//           ambiguous.left.some((item) => item.identityUnavailable) ||
//             ambiguous.right.some((item) => item.identityUnavailable),
//         ),
//       ],
//     });
//   const undecoded = undecodedOneSidedNames(
//     matches,
//     context.signatureResolutionExamined,
//   );
//   for (const item of matches.leftOnly)
//     items.push(
//       fieldOnlyItem(
//         { left: item.item },
//         item.identity,
//         item.identityUnavailable,
//         context,
//         undecoded,
//       ),
//     );
//   for (const item of matches.rightOnly)
//     items.push(
//       fieldOnlyItem(
//         { right: item.item },
//         item.identity,
//         item.identityUnavailable,
//         context,
//         undecoded,
//       ),
//     );
//   return items;
// };
export const _l = 152;
