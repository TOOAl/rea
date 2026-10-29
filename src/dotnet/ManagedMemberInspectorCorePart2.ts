export const __stub = 1;
//         namespace,
//         name,
//         full_name: fullName(namespace, name),
//         flags,
//         extends_token: metadataCodedToken(
//           extendsRaw,
//           2,
//           [2, 1, 27],
//           layout.rowCounts,
//         ),
//         enclosing_type_token:
//           enclosingRow === undefined ? null : metadataToken(2, enclosingRow),
//         name_sha256: null,
//         field_list: {
//           first_row: fieldRange.first,
//           last_row: fieldRange.last,
//           count: fieldRange.count,
//         },
//         method_list: {
//           first_row: methodRange.first,
//           last_row: methodRange.last,
//           count: methodRange.count,
//         },
//       });
//     }, issues);
//   }
//   return { types: items, issues, nesting };
// };
//
// export const readCompressed = (
//   bytes: Buffer,
//   offset: number,
// ): { readonly value: number; readonly next: number } => {
//   const first = bytes[offset];
//   if (first === undefined)
//     throw managedFailure(
//       "invalid-blob",
//       "signature",
//       "truncated compressed integer",
//       offset,
//     );
//   if ((first & 0x80) === 0) return { value: first, next: offset + 1 };
//   const second = bytes[offset + 1];
//   if ((first & 0xc0) === 0x80 && second !== undefined)
//     return { value: ((first & 0x3f) << 8) | second, next: offset + 2 };
//   const b1 = bytes[offset + 1];
//   const b2 = bytes[offset + 2];
//   const b3 = bytes[offset + 3];
//   if (
//     (first & 0xe0) === 0xc0 &&
//     b1 !== undefined &&
//     b2 !== undefined &&
//     b3 !== undefined
//   )
//     return {
//       value:
//         (first & 0x1f) * 0x01_00_00_00 + b1 * 0x01_00_00 + b2 * 0x0100 + b3,
//       next: offset + 4,
//     };
//   throw managedFailure(
//     "invalid-blob",
//     "signature",
//     "reserved compressed integer",
//     offset,
//   );
// };
//
// const ELEMENT_TYPES = new Map<number, string>([
//   [0x01, "void"],
//   [0x02, "bool"],
//   [0x03, "char"],
//   [0x04, "i1"],
//   [0x05, "u1"],
//   [0x06, "i2"],
//   [0x07, "u2"],
//   [0x08, "i4"],
//   [0x09, "u4"],
//   [0x0a, "i8"],
//   [0x0b, "u8"],
//   [0x0c, "r4"],
//   [0x0d, "r8"],
//   [0x0e, "string"],
//   [0x18, "native-int"],
//   [0x19, "native-uint"],
//   [0x1c, "object"],
// ]);
//
// const readSignedCompressed = (
//   bytes: Buffer,
//   offset: number,
// ): { readonly value: number; readonly next: number } => {
//   const encoded = readCompressed(bytes, offset);
//   const width =
//     encoded.next - offset === 1 ? 7 : encoded.next - offset === 2 ? 14 : 29;
//   const magnitude = Math.floor(encoded.value / 2);
//   return {
//     value: encoded.value % 2 === 0 ? magnitude : magnitude - 2 ** (width - 1),
//     next: encoded.next,
//   };
// };
//
// const malformedSignature = (detail: string, offset: number): never => {
//   throw managedFailure("invalid-blob", "signature", detail, offset);
// };
//
// // Pending work while decoding one Type. Signatures nest arbitrarily deep, so
// // decoding keeps an explicit stack instead of recursing.
// type TypeContinuation =
//   | { readonly kind: "suffix"; readonly suffix: "*" | "&" | "[]" }
//   | { readonly kind: "modifiers"; readonly modifiers: string[] }
//   | { readonly kind: "array" }
//   | {
//       readonly kind: "list";
//       remaining: number;
//       readonly items: string[];
//       // Function pointer items are a RetType then Params; generic
//       // arguments are Types.
//       readonly signatureItems: boolean;
//       readonly render: (items: readonly string[]) => string;
//     };
//
// interface MethodSignatureHeader {
//   readonly first: number;
//   readonly genericParameterCount: number | null;
//   readonly parameterCount: number;
//   readonly next: number;
// }
//
// // MethodDefSig and MethodRefSig headers (ECMA-335 II.23.2.1-2) without
// // HASTHIS and EXPLICITTHIS: DEFAULT, VARARG, or GENERIC, which implies DEFAULT.
// const MEMBER_METHOD_HEADERS = new Set([0x00, 0x05, 0x10]);
//
// // FNPTR also carries the unmanaged C, STDCALL, THISCALL, FASTCALL, and
// // UNMANAGED conventions that compilers emit for unmanaged function pointers.
// const FUNCTION_POINTER_CONVENTIONS = new Set([0, 1, 2, 3, 4, 5, 9]);
//
// /**
//  * Read a method signature's calling convention and counts. A header that is
//  * not a method signature in its context (a MethodDef or MemberRef row, or an
//  * FNPTR type), sets the reserved bit, or sets EXPLICITTHIS without HASTHIS is
//  * malformed, so no caller consumes its counts. FIELD, LOCAL_SIG, PROPERTY,
//  * and GENERICINST headers are never method signatures.
//  */
// const readMethodSignatureHeader = (
//   blob: Buffer,
//   offset: number,
//   context: "member" | "function-pointer",
// ): MethodSignatureHeader => {
//   const first = blob[offset];
//   if (first === undefined)
//     return malformedSignature("truncated method signature", offset);
//   const allowed =
//     context === "member"
//       ? MEMBER_METHOD_HEADERS.has(first & 0x9f)
//       : (first & 0x80) === 0 && FUNCTION_POINTER_CONVENTIONS.has(first & 0x0f);
//   if (!allowed || ((first & 0x40) !== 0 && (first & 0x20) === 0))
//     return malformedSignature(
//       `calling convention 0x${first.toString(16)} does not head a ${context} method signature`,
//       offset,
//     );
//   let next = offset + 1;
//   let genericParameterCount: number | null = null;
//   if ((first & 0x10) !== 0) {
//     const generic = readCompressed(blob, next);
//     genericParameterCount = generic.value;
//     next = generic.next;
//   }
//   const parameterCount = readCompressed(blob, next);
//   return {
//     first,
//     genericParameterCount,
//     parameterCount: parameterCount.value,
//     next: parameterCount.next,
//   };
// };
//
// const MAX_ARRAY_RANK = 32;
//
// const arrayShape = (
//   blob: Buffer,
//   offset: number,
// ): { readonly value: string; readonly next: number } => {
//   const rank = readCompressed(blob, offset);
//   if (rank.value === 0) return malformedSignature("array rank is zero", offset);
//   // ECMA-335 leaves rank unbounded, but the CLR loads at most 32 dimensions;
//   // larger ranks would expand a few bytes into an unbounded rendering.
//   if (rank.value > MAX_ARRAY_RANK)
//     throw managedFailure(
//       "unsupported-signature",
//       "signature",
//       `array rank ${String(rank.value)} exceeds the ${String(MAX_ARRAY_RANK)} dimensions the CLR supports`,
//       offset,
//     );
//   const sizeCount = readCompressed(blob, rank.next);
//   if (sizeCount.value > rank.value)
//     return malformedSignature("array has more sizes than dimensions", offset);
//   const sizes: number[] = [];
//   let next = sizeCount.next;
//   for (let index = 0; index < sizeCount.value; index += 1) {
//     const size = readCompressed(blob, next);
//     sizes.push(size.value);
//     next = size.next;
//   }
//   const boundCount = readCompressed(blob, next);
//   if (boundCount.value > rank.value)
//     return malformedSignature(
//       "array has more lower bounds than dimensions",
//       offset,
//     );
//   const lowerBounds: number[] = [];
//   next = boundCount.next;
//   for (let index = 0; index < boundCount.value; index += 1) {
//     const bound = readSignedCompressed(blob, next);
//     lowerBounds.push(bound.value);
//     next = bound.next;
//   }
//   const dimensions = Array.from({ length: rank.value }, (_, index) => {
//     const size = sizes[index];
//     const lower = lowerBounds[index];
//     if (lower !== undefined)
//       return size === undefined
//         ? `${String(lower)}...`
//         : `${String(lower)}...${String(lower + size - 1)}`;
//     if (size !== undefined) return String(size);
//     // ILAsm spelling: a bare rank-1 `[]` is reserved for SZARRAY.
//     return rank.value === 1 ? "..." : "";
export const _l = 226;
