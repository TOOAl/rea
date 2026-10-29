export const __stub = 1;
// import canonicalize from "canonicalize";
//
// import type { ManagedMemberInspection } from "./managedArtifact.js";
// import type { ManagedMemberComparisonResult } from "./managedMemberComparison.js";
// import {
//   type ManagedFieldMatches,
//   type ManagedMethodMatches,
//   sha256,
// } from "./managedMemberComparisonMatch.js";
// import { signatureIdentity } from "./managedMemberSignatureIdentity.js";
//
// type Method = ManagedMemberInspection["methods"][number];
// type Field = ManagedMemberInspection["fields"][number];
// type MethodItem = ManagedMemberComparisonResult["methods"][number];
// type FieldItem = ManagedMemberComparisonResult["fields"][number];
// type UnmatchedComparison = Extract<
//   MethodItem["match"],
//   { readonly status: "unmatched" }
// >;
//
// type OneSided<Item> =
//   | { readonly left: Item; readonly right?: never }
//   | { readonly left?: never; readonly right: Item };
//
// interface ComparisonItemContext {
//   readonly leftEvidenceId: string;
//   readonly rightEvidenceId: string;
//   readonly leftComplete: boolean;
//   readonly rightComplete: boolean;
//   /** Declaring types each side selected; null when it inspected every type. */
//   readonly leftSelection: ReadonlySet<string> | null;
//   readonly rightSelection: ReadonlySet<string> | null;
//   /** Whether matching keyed signatures by resolved digests, not raw bytes. */
//   readonly signatureResolutionExamined: boolean;
// }
//
// /** Whether an inventory observed every member of this member's declaring type. */
// const inventoryCovers = (
//   complete: boolean,
//   selection: ReadonlySet<string> | null,
//   member: Method | Field,
// ): boolean =>
//   complete &&
//   (selection === null ||
//     (member.declaring_type !== null && selection.has(member.declaring_type)));
//
// /**
//  * Declared type and name of each unpaired member, per side, whose signature
//  * was not decoded, or was decoded but not resolved while matching keyed
//  * resolved signatures.
//  */
// interface UndecodedOneSidedNames {
//   readonly resolved: boolean;
//   readonly undecoded: Readonly<Record<"left" | "right", ReadonlySet<string>>>;
//   readonly unresolved: Readonly<Record<"left" | "right", ReadonlySet<string>>>;
//   readonly unknownOwners: Readonly<
//     Record<"left" | "right", ReadonlySet<string>>
//   >;
// }
//
// const methodDimensions = (
//   left: Method,
//   right: Method,
// ): {
//   readonly dimensions: MethodItem["dimensions"];
//   readonly bodyUnknown: boolean;
// } => {
//   const dimensions: MethodItem["dimensions"] = [];
//   if (left.flags !== right.flags || left.impl_flags !== right.impl_flags)
//     dimensions.push("metadata");
//   if (signatureIdentity(left.signature) !== signatureIdentity(right.signature))
//     dimensions.push("signature");
//   const leftBodyComplete =
//     left.body.status === "present" && left.body.truncated_instructions === 0;
//   const rightBodyComplete =
//     right.body.status === "present" && right.body.truncated_instructions === 0;
//   const bothAbsent =
//     left.body.status === "absent" && right.body.status === "absent";
//   if (
//     (left.body.status === "absent" && rightBodyComplete) ||
//     (right.body.status === "absent" && leftBodyComplete)
//   )
//     dimensions.push("availability");
//   if (bothAbsent) return { dimensions, bodyUnknown: false };
//   if (!leftBodyComplete || !rightBodyComplete)
//     return { dimensions, bodyUnknown: true };
//   // The decoded fingerprint omits switch targets and is not exact CIL identity.
//   if (
//     left.body.il_sha256 !== right.body.il_sha256 ||
//     left.body.normalized_il_sha256 !== right.body.normalized_il_sha256
//   )
//     dimensions.push("cil");
//   if (
//     canonicalize(left.body.opcode_counts) !==
//     canonicalize(right.body.opcode_counts)
//   )
//     dimensions.push("opcode-shape");
//   if (callShape(left.body.anchors) !== callShape(right.body.anchors))
//     dimensions.push("call-shape");
//   if (fieldShape(left.body.anchors) !== fieldShape(right.body.anchors))
//     dimensions.push("field-shape");
//   if (
//     canonicalize(left.body.exception_regions) !==
//     canonicalize(right.body.exception_regions)
//   )
//     dimensions.push("exception-shape");
//   return { dimensions, bodyUnknown: false };
// };
//
// const callShape = (anchors: Method["body"]["anchors"]): string =>
//   JSON.stringify(
//     anchors
//       .filter(({ operand_kind }) => operand_kind === "method")
//       .map(({ opcode, operand_kind }) => [opcode, operand_kind]),
//   );
//
// const fieldShape = (anchors: Method["body"]["anchors"]): string =>
//   JSON.stringify(
//     anchors
//       .filter(({ operand_kind }) => operand_kind === "field")
//       .map(({ opcode, operand_kind }) => [opcode, operand_kind]),
//   );
//
// const methodIdentity = (item: Method): NonNullable<MethodItem["left"]> => ({
//   token: item.token,
//   declaring_type: item.declaring_type,
//   name: item.name,
//   signature_sha256: item.signature.raw_sha256,
//   normalized_il_sha256: item.body.normalized_il_sha256,
// });
//
// const fieldIdentity = (item: Field): NonNullable<FieldItem["left"]> => ({
//   token: item.token,
//   declaring_type: item.declaring_type,
//   name: item.name,
//   signature_sha256: item.signature.raw_sha256,
// });
//
// const unmatchedComparison = (): UnmatchedComparison => ({
//   status: "unmatched",
//   basis: "none",
//   confidence: "unknown",
//   candidate_left_tokens: [],
//   candidate_right_tokens: [],
// });
//
// const methodOnlyItem = (
//   member: OneSided<Method>,
//   identity: string,
//   identityUnavailable: boolean,
//   context: ComparisonItemContext,
//   undecoded: UndecodedOneSidedNames,
// ): MethodItem => {
export const _l = 153;
