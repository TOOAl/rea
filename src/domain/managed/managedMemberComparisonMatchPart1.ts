export const __stub = 1;
// import { createHash } from "node:crypto";
//
// import canonicalize from "canonicalize";
//
// import {
//   managedMemberInspectionSchema,
//   type ManagedMemberInspection,
// } from "./managedArtifact.js";
// import { parseManagedInspectionEvidence } from "./managedInspectionEvidence.js";
// import type {
//   ManagedMemberComparisonResult,
//   ManagedMemberComparisonSide,
// } from "./managedMemberComparison.js";
// import {
//   comparableSides,
//   signatureIdentity,
// } from "./managedMemberSignatureIdentity.js";
// import type { JsonValue } from "../jsonValue.js";
//
// export const sha256 = (value: JsonValue): string => {
//   const serialized = canonicalize(value);
//   if (serialized === undefined)
//     throw new TypeError("Managed comparison canonicalization failed");
//   return createHash("sha256").update(serialized).digest("hex");
// };
//
// type Method = ManagedMemberInspection["methods"][number];
// type Field = ManagedMemberInspection["fields"][number];
//
// type MatchBasis =
//   ManagedMemberComparisonResult["methods"][number]["match"]["basis"];
// type ConcreteMatchBasis = Exclude<MatchBasis, "none">;
//
// interface Keyed<Item> {
//   readonly item: Item;
//   /** Declared type and name; an unresolved type is null, the name remains. */
//   readonly identity: string;
//   /** Declared identity could not be resolved; display facts remain. */
//   readonly identityUnavailable: boolean;
//   readonly exactKey: string | null;
//   readonly signatureKey: string | null;
//   /** The name-free exact signature, resolved where both sides resolve it. */
//   readonly signatureId: string;
//   readonly structuralKey: string | null;
// }
//
// interface MatchedPair<Item> {
//   readonly left: Keyed<Item>;
//   readonly right: Keyed<Item>;
//   readonly basis: ConcreteMatchBasis;
//   readonly confidence: "exact" | "high";
// }
//
// interface Ambiguous<Item> {
//   readonly left: readonly Keyed<Item>[];
//   readonly right: readonly Keyed<Item>[];
//   readonly basis: ConcreteMatchBasis;
// }
//
// /** A declared type: a historical bare name or a tagged observed nominal digest. */
// type DeclaredName = string | string[] | null;
// type DeclaredNameOf = (item: Method | Field) => DeclaredName;
// const keyMethod = (item: Method, declared: DeclaredNameOf): Keyed<Method> => ({
//   item,
//   identity: identityOf({ declaring_type: declared(item), name: item.name }),
//   identityUnavailable: declared(item) === null,
//   signatureId: signatureIdentity(item.signature),
//   exactKey:
//     item.body.status === "present" &&
//     item.body.il_sha256 !== null &&
//     item.body.normalized_il_sha256 !== null
//       ? sha256([
//           "method-exact",
//           signatureIdentity(item.signature),
//           item.body.il_sha256,
//           item.body.normalized_il_sha256,
//         ])
//       : null,
//   // The blob, with type operands named, is the exact signature; decoding
//   // only gates the shape keys.
//   signatureKey:
//     declared(item) === null
//       ? null
//       : sha256([
//           "method-signature",
//           declared(item),
//           item.name,
//           signatureIdentity(item.signature),
//         ]),
//   structuralKey:
//     item.signature.parse_status === "decoded" && item.body.status === "present"
//       ? sha256([
//           "method-structural",
//           // Decoded type strings carry build-local rows; the identity names them.
//           signatureIdentity(item.signature),
//           item.body.status,
//           item.body.header_format,
//           item.body.il_size,
//           item.body.max_stack,
//           item.body.init_locals,
//           item.body.opcode_counts,
//           item.body.anchors.map(({ opcode, operand_kind, operand }) => [
//             opcode,
//             operand_kind,
//             operand_kind === "constant" ? operand : null,
//           ]),
//           item.body.exception_regions.map((region) => [
//             region.flags,
//             region.try_length,
//             region.handler_length,
//             region.class_token === null ? null : "type-token",
//             region.filter_offset === null ? null : "filter",
//           ]),
//         ])
//       : null,
// });
//
// const keyField = (item: Field, declared: DeclaredNameOf): Keyed<Field> => ({
//   item,
//   identity: identityOf({ declaring_type: declared(item), name: item.name }),
//   identityUnavailable: declared(item) === null,
//   signatureId: signatureIdentity(item.signature),
//   exactKey:
//     item.signature.parse_status === "decoded"
//       ? sha256(["field-exact", signatureIdentity(item.signature)])
//       : null,
//   // Only an undecoded field reaches this round: a decoded field with the
//   // same signature already met its counterpart in the exact round.
//   signatureKey:
//     declared(item) === null
//       ? null
//       : sha256([
//           "field-signature",
//           declared(item),
//           item.name,
//           signatureIdentity(item.signature),
//         ]),
//   structuralKey: sha256([
//     "field-structural",
//     item.signature.kind,
//     item.signature.field_type,
//     item.flags,
//   ]),
// });
//
// const matchMethods = (
//   left: readonly Keyed<Method>[],
//   right: readonly Keyed<Method>[],
export const _l = 148;
