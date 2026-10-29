export const __stub = 1;
//  * Decode a whole TypeSpec blob, or a MethodSpec instantiation (GENERICINST,
//  * argument count, Types), with the member-signature grammar and return the
//  * rendered types. A malformed or unsupported blob throws invalid-blob or
//  * unsupported-signature under the owning row, so coverage records it.
//  */
// export const specSignature = (
//   layout: ManagedMetadataLayout,
//   blob: Buffer,
//   owner: {
//     readonly form: "type" | "instantiation";
//     readonly scope: string;
//     readonly offset: number;
//   },
// ): readonly string[] => {
//   const budget = managedDecodeBudget(layout);
//   // Rendering is transient, so charge it as member signatures are charged.
//   budget.admitTransient(blob.length * 256, owner.offset);
//   try {
//     let cursor = 0;
//     let count = 1;
//     if (owner.form === "instantiation") {
//       if (blob[0] !== 0x0a)
//         malformedSignature("MethodSpec instantiation is not GENERICINST", 0);
//       const header = readCompressed(blob, 1);
//       if (header.value === 0)
//         malformedSignature("MethodSpec instantiation has no type arguments", 1);
//       count = header.value;
//       cursor = header.next;
//     }
//     const types: string[] = [];
//     // Each Type consumes at least one byte, so a false count fails on truncation.
//     for (let index = 0; index < count; index += 1) {
//       const type = readTypeSignature(blob, cursor, "type", { layout });
//       types.push(type.value);
//       cursor = type.next;
//     }
//     if (cursor !== blob.length)
//       malformedSignature("Trailing signature data", cursor);
//     return types;
//   } catch (cause: unknown) {
//     if (
//       !(cause instanceof ManagedReaderFailure) ||
//       (cause.issue.code !== "invalid-blob" &&
//         cause.issue.code !== "invalid-row" &&
//         cause.issue.code !== "unsupported-signature")
//     )
//       throw cause;
//     throw managedFailure(
//       cause.issue.code,
//       owner.scope,
//       cause.issue.detail,
//       owner.offset,
//     );
//   } finally {
//     budget.releaseTransient();
//   }
// };
//
// type DecodedSignature = Omit<
//   ManagedSignature,
//   "raw_length" | "raw_sha256" | "resolved_sha256"
// >;
//
// /**
//  * Decode a field or member method signature. A malformed or unsupported blob
//  * decodes as kind `unknown` with its reason.
//  */
// const decodeSignature = (
//   blob: Buffer,
//   operands: TypeOperand[] = [],
// ): DecodedSignature => {
//   try {
//     if (blob.length === 0)
//       throw managedFailure("invalid-blob", "signature", "empty signature", 0);
//     const first = blob[0] ?? 0;
//     // FieldSig (II.23.2.4) is exactly FIELD; a flagged FIELD header is not a
//     // method header either, so it is malformed below.
//     if (first === 0x06) {
//       const fieldType = readTypeSignature(blob, 1, "field", { operands });
//       return {
//         kind: "field",
//         parse_status: fieldType.next === blob.length ? "decoded" : "partial",
//         calling_convention: callingConvention(first),
//         generic_parameter_count: null,
//         parameter_count: null,
//         return_type: null,
//         parameter_types: [],
//         field_type: fieldType.value,
//         issue:
//           fieldType.next === blob.length ? null : "Trailing signature data",
//       };
//     }
//     const header = readMethodSignatureHeader(blob, 0, "member");
//     const returnType = readTypeSignature(blob, header.next, "return", {
//       operands,
//     });
//     let offset = returnType.next;
//     const parameters: string[] = [];
//     for (let index = 0; index < header.parameterCount; index += 1) {
//       const parameter = readTypeSignature(blob, offset, "parameter", {
//         operands,
//       });
//       parameters.push(parameter.value);
//       offset = parameter.next;
//     }
//     return {
//       kind: "method",
//       parse_status: offset === blob.length ? "decoded" : "partial",
//       calling_convention: callingConvention(first),
//       generic_parameter_count: header.genericParameterCount,
//       parameter_count: header.parameterCount,
//       return_type: returnType.value,
//       parameter_types: parameters,
//       field_type: null,
//       issue: offset === blob.length ? null : "Trailing signature data",
//     };
//   } catch (cause: unknown) {
//     if (!(cause instanceof ManagedReaderFailure)) throw cause;
//     if (
//       cause.issue.code !== "invalid-blob" &&
//       cause.issue.code !== "unsupported-signature"
//     )
//       throw cause;
//     return {
//       kind: "unknown",
//       parse_status:
//         cause.issue.code === "unsupported-signature"
//           ? "unsupported"
//           : "malformed",
//       calling_convention: null,
//       generic_parameter_count: null,
//       parameter_count: null,
//       return_type: null,
//       parameter_types: [],
//       field_type: null,
//       issue: cause.issue.detail,
//     };
//   }
// };
//
// /**
//  * Generic parameter count of a method signature that decodes completely, 0
//  * when it is not generic, or null when the blob is not a decodable method
//  * signature. The rendered decode is transient.
//  */
// export const methodGenericArity = (
//   layout: ManagedMetadataLayout,
//   blob: Buffer,
// ): number | null => {
//   const budget = managedDecodeBudget(layout);
//   budget.admitTransient(blob.length * 256, layout.blob.offset);
//   try {
//     return signatureGenericArity(decodeSignature(blob));
//   } finally {
//     budget.releaseTransient();
//   }
// };
//
// /**
//  * Generic parameter count of a completely decoded method signature, 0 when it
//  * is not generic, or null for any other signature.
//  */
// export const signatureGenericArity = (
//   decoded: DecodedSignature,
// ): number | null =>
//   decoded.kind === "method" && decoded.parse_status === "decoded"
//     ? (decoded.generic_parameter_count ?? 0)
//     : null;
//
// /**
//  * SHA-256 of the namespace-qualified name of a TypeDefOrRefOrSpec coded index,
//  * or null when it has no name.
//  */
// export type SignatureTypeName = (codedIndex: number) => Buffer | null;
//
// /**
//  * Each type operand is replaced by 0xff, which never starts a compressed
//  * coded index, then the 32-byte name digest; a blob without type operands
//  * keeps its raw digest. So no decodable signature's resolved preimage is
//  * another's, but an undecodable blob can hold one, and its raw digest then
//  * equals that resolved digest. Comparison keys the two kinds apart.
//  */
// const OPERAND_MARKER = Buffer.from([0xff]);
//
// /**
//  * Digest the blob with each type operand replaced by its type's name digest,
//  * so the value does not depend on build-local row numbers.
//  */
// const resolvedSha256 = (
//   blob: Buffer,
//   operands: readonly TypeOperand[],
//   typeName: SignatureTypeName,
// ): string | null => {
//   const hash = createHash("sha256");
//   let copied = 0;
//   for (const operand of operands) {
//     const name = typeName(operand.value);
//     if (name === null) return null;
//     hash.update(blob.subarray(copied, operand.offset));
//     hash.update(OPERAND_MARKER);
//     hash.update(name);
//     copied = operand.next;
//   }
//   hash.update(blob.subarray(copied));
//   return hash.digest("hex");
// };
//
// export const signature = (
//   blob: Buffer,
//   rawSha256?: string,
//   typeName: SignatureTypeName = () => null,
// ): ManagedSignature => {
//   const operands: TypeOperand[] = [];
//   const decoded = decodeSignature(blob, operands);
//   return {
//     raw_length: blob.length,
//     raw_sha256: rawSha256 ?? sha256Bytes(blob),
//     resolved_sha256:
//       decoded.kind === "unknown"
//         ? null
//         : resolvedSha256(blob, operands, typeName),
//     ...decoded,
//   };
// };
export const _l = 224;
