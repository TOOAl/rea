export const __stub = 1;
//   });
//   return { value: `[${dimensions.join(",")}]`, next };
// };
//
// /** Grammar position of the element being decoded (ECMA-335 II.23.2). */
// type SignaturePosition = "field" | "return" | "parameter" | "type" | "pointee";
//
// // Custom modifiers do not change the position they precede.
// const currentPosition = (
//   stack: readonly TypeContinuation[],
//   base: SignaturePosition,
// ): SignaturePosition => {
//   const frame = stack.findLast(({ kind }) => kind !== "modifiers");
//   if (frame === undefined) return base;
//   if (frame.kind === "suffix") return frame.suffix === "*" ? "pointee" : "type";
//   if (frame.kind === "list" && frame.signatureItems)
//     return frame.items.length === 0 ? "return" : "parameter";
//   return "type";
// };
//
// // VOID is a RetType or a pointee; TYPEDBYREF is a RetType or Param; BYREF
// // prefixes a RetType, Param, or (since ref fields) a field type.
// const POSITION_ELEMENTS: ReadonlyMap<number, readonly SignaturePosition[]> =
//   new Map([
//     [0x01, ["return", "pointee"]],
//     [0x16, ["return", "parameter"]],
//     [0x10, ["return", "parameter", "field"]],
//   ]);
//
// /** Decode a type operand once; spec callers also validate its metadata coordinate. */
// const readTypeOperand = (
//   blob: Buffer,
//   offset: number,
//   layout?: ManagedMetadataLayout,
//   tables: readonly number[] = [2, 1, 27],
// ): ReturnType<typeof readCompressed> => {
//   const token = readCompressed(blob, offset);
//   if (layout !== undefined) {
//     const reason =
//       token.value === 0
//         ? "type operand is null"
//         : metadataCodedTokenInvalidReason(
//             token.value,
//             2,
//             tables,
//             layout.rowCounts,
//           );
//     if (reason !== null)
//       throw managedFailure(
//         "invalid-row",
//         "signature",
//         `TypeDefOrRefOrSpec operand 0x${token.value.toString(16)} is invalid: ${reason}`,
//         offset,
//       );
//   }
//   return token;
// };
//
// /** A TypeDefOrRefOrSpec coded index embedded in a signature blob. */
// interface TypeOperand {
//   readonly offset: number;
//   readonly next: number;
//   readonly value: number;
// }
//
// const readTypeSignature = (
//   blob: Buffer,
//   offset: number,
//   base: SignaturePosition,
//   {
//     layout,
//     operands,
//   }: {
//     /** Validate each type operand against these tables, as specs require. */
//     readonly layout?: ManagedMetadataLayout;
//     /** Collect each type operand, to resolve it by name. */
//     readonly operands?: TypeOperand[];
//   } = {},
// ): { readonly value: string; readonly next: number } => {
//   const stack: TypeContinuation[] = [];
//   let cursor = offset;
//   for (;;) {
//     let value: string | undefined;
//     const kind = blob[cursor];
//     if (kind === undefined)
//       return malformedSignature("truncated type signature", cursor);
//     const positions = POSITION_ELEMENTS.get(kind);
//     if (
//       positions !== undefined &&
//       !positions.includes(currentPosition(stack, base))
//     )
//       return malformedSignature(
//         `element type 0x${kind.toString(16)} is not valid in a ${currentPosition(stack, base)} position`,
//         cursor,
//       );
//     const named = ELEMENT_TYPES.get(kind);
//     if (named !== undefined) {
//       value = named;
//       cursor += 1;
//     } else if (kind === 0x0f || kind === 0x10 || kind === 0x1d) {
//       const suffix = kind === 0x0f ? "*" : kind === 0x10 ? "&" : "[]";
//       stack.push({ kind: "suffix", suffix });
//       cursor += 1;
//     } else if (kind === 0x1f || kind === 0x20) {
//       const token = readTypeOperand(blob, cursor + 1, layout);
//       operands?.push({ offset: cursor + 1, ...token });
//       const modifier = `${kind === 0x1f ? "modreq" : "modopt"}:${String(token.value)}`;
//       // A modifier frame on top was pushed by the directly preceding byte;
//       // keep an adjacent run together and in source order.
//       const top = stack.at(-1);
//       if (top?.kind === "modifiers") top.modifiers.push(modifier);
//       else stack.push({ kind: "modifiers", modifiers: [modifier] });
//       cursor = token.next;
//     } else if (kind === 0x11 || kind === 0x12) {
//       const token = readTypeOperand(blob, cursor + 1, layout);
//       operands?.push({ offset: cursor + 1, ...token });
//       value = `${kind === 0x11 ? "valuetype" : "class"}:${String(token.value)}`;
//       cursor = token.next;
//     } else if (kind === 0x1e || kind === 0x13) {
//       const variable = readCompressed(blob, cursor + 1);
//       value = `${kind === 0x1e ? "mvar" : "var"}:${String(variable.value)}`;
//       cursor = variable.next;
//     } else if (kind === 0x16) {
//       value = "typedbyref";
//       cursor += 1;
//     } else if (kind === 0x14) {
//       stack.push({ kind: "array" });
//       cursor += 1;
//     } else if (kind === 0x15) {
//       const generic = blob[cursor + 1];
//       if (generic !== 0x11 && generic !== 0x12)
//         return malformedSignature(
//           "generic instantiation does not name a class or value type",
//           cursor + 1,
//         );
//       const token = readTypeOperand(blob, cursor + 2, layout, [2, 1]);
//       operands?.push({ offset: cursor + 2, ...token });
//       const argumentCount = readCompressed(blob, token.next);
//       if (argumentCount.value === 0)
//         return malformedSignature(
//           "generic instantiation has no type arguments",
//           token.next,
//         );
//       const head = `${generic === 0x11 ? "valuetype" : "class"}:${String(token.value)}`;
//       stack.push({
//         kind: "list",
//         remaining: argumentCount.value,
//         items: [],
//         signatureItems: false,
//         render: (items) => `${head}<${items.join(",")}>`,
//       });
//       cursor = argumentCount.next;
//     } else if (kind === 0x1b) {
//       const header = readMethodSignatureHeader(
//         blob,
//         cursor + 1,
//         "function-pointer",
//       );
//       const convention = callingConvention(header.first);
//       const head =
//         header.genericParameterCount === null
//           ? convention
//           : `${convention};${String(header.genericParameterCount)}`;
//       stack.push({
//         kind: "list",
//         remaining: header.parameterCount + 1,
//         items: [],
//         signatureItems: true,
//         render: ([returnType, ...parameters]) =>
//           `fnptr[${head}](${parameters.join(",")})->${returnType ?? ""}`,
//       });
//       cursor = header.next;
//     } else {
//       throw managedFailure(
//         "unsupported-signature",
//         "signature",
//         `unsupported element type 0x${kind.toString(16)}`,
//         cursor,
//       );
//     }
//     while (value !== undefined) {
//       const top = stack.pop();
//       if (top === undefined) return { value, next: cursor };
//       if (top.kind === "suffix") value += top.suffix;
//       else if (top.kind === "modifiers")
//         value = `${value} ${top.modifiers.join(" ")}`;
//       else if (top.kind === "array") {
//         const shape = arrayShape(blob, cursor);
//         value += shape.value;
//         cursor = shape.next;
//       } else {
//         top.items.push(value);
//         top.remaining -= 1;
//         if (top.remaining === 0) value = top.render(top.items);
//         else {
//           value = undefined;
//           stack.push(top);
//         }
//       }
//     }
//   }
// };
//
// const CALLING_CONVENTION_NAMES = new Map([
//   [0, "default"],
//   [1, "c"],
//   [2, "stdcall"],
//   [3, "thiscall"],
//   [4, "fastcall"],
//   [5, "vararg"],
//   [6, "field"],
//   [9, "unmanaged"],
// ]);
//
// const callingConvention = (value: number): string => {
//   const base = value & 0x0f;
//   const flags = [
//     (value & 0x20) === 0 ? null : "has-this",
//     (value & 0x40) === 0 ? null : "explicit-this",
//     (value & 0x10) === 0 ? null : "generic",
//   ].filter((flag) => flag !== null);
//   const name = CALLING_CONVENTION_NAMES.get(base) ?? `unknown:${String(base)}`;
//   return flags.length === 0 ? name : `${name} ${flags.join(" ")}`;
// };
//
// /**
export const _l = 226;
