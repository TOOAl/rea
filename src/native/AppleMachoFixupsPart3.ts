export const __stub = 1;
//   const formats = [
//     ...new Set(
//       ranges.map(({ format }) => POINTER_FORMATS[format] ?? `format-${format}`),
//     ),
//   ];
//   const issues = ranges.flatMap(({ format, segment }) =>
//     POINTER_FORMATS[format] === undefined
//       ? [
//           issue(
//             "pointer_fixups",
//             "unsupported_pointer_format",
//             `Unsupported chained pointer format ${format}`,
//             `0x${segment.address.toString(16)}`,
//           ),
//         ]
//       : [],
//   );
//   const examinedViews = new Map<string, boolean>();
//   const decodedRanges = new Set<number>();
//   for (const [chainIndex, chain] of ranges.entries()) {
//     // Unknown formats retain their compact starts table; only a queried page
//     // needs its NONE/presence value. Do not expand unsupported declarations.
//     if (POINTER_FORMATS[chain.format] === undefined) continue;
//     const view = `${chain.pageStarts}:${chain.segment.offset}:${chain.segment.size}:${chain.segment.address}:${chain.format}:${chain.pageSize}:${chain.pageCount}`;
//     const prior = examinedViews.get(view);
//     if (prior !== undefined) {
//       if (prior) decodedRanges.add(chainIndex);
//       continue;
//     }
//     let complete = true;
//     for (let page = 0; page < chain.pageCount; page++) {
//       const start = bytes.readUInt16LE(chain.pageStarts + page * 2);
//       if (start === 0xffff) continue;
//       const facts = pageFacts(chain, page, start);
//       if (facts.failure !== undefined) {
//         complete = false;
//         issues.push(
//           issue(
//             "pointer_fixups",
//             "chained_pointer_walk_failed",
//             facts.failure,
//             `0x${(chain.segment.address + BigInt(page * chain.pageSize)).toString(16)}`,
//           ),
//         );
//         // Coverage is partial after this failure, not exhaustive. Keep the
//         // unexpanded descriptor: later pages are still independently readable
//         // through pageFacts when metadata requests them.
//         break;
//       }
//     }
//     examinedViews.set(view, complete);
//     if (complete) decodedRanges.add(chainIndex);
//   }
//   const failures = issues.map(({ message }) => message);
//   return {
//     kind: "chained",
//     formats,
//     failures,
//     issues,
//     examined: Math.max(ranges.length, 1),
//     get decoded() {
//       return ranges.length === 0 ? 1 : decodedRanges.size;
//     },
//     unreadRebaseBytes,
//     decode(address, raw) {
//       const chainIndex = ranges.findIndex(
//         ({ segment }) =>
//           address >= segment.address &&
//           address < segment.address + segment.size,
//       );
//       const chain = ranges[chainIndex];
//       // Pointers outside fixup segments, such as in __TEXT, are stored plainly.
//       if (chain === undefined) return { kind: "rebase", target: raw };
//       const within = Number(address - chain.segment.address);
//       const page = Math.floor(within / chain.pageSize);
//       if (page >= chain.pageCount) return { kind: "rebase", target: raw };
//       const start = bytes.readUInt16LE(chain.pageStarts + page * 2);
//       if (start === 0xffff) return { kind: "rebase", target: raw };
//       if (POINTER_FORMATS[chain.format] === undefined)
//         return {
//           kind: "unsupported",
//           reason: `Unsupported chained pointer format ${chain.format}`,
//         };
//       try {
//         const facts = pageFacts(chain, page, start);
//         const at = within % chain.pageSize;
//         const locations = facts.locations;
//         if (((locations[at >>> 3] ?? 0) & (1 << (at & 7))) !== 0)
//           return decodeChainedPointer(raw, chain.format, baseAddress, imports);
//         if (
//           facts.failure !== undefined &&
//           (facts.lastOffset === undefined || at > facts.lastOffset)
//         )
//           throw new RangeError(facts.failure);
//         return { kind: "rebase", target: raw };
//       } catch (cause: unknown) {
//         const reason = cause instanceof Error ? cause.message : String(cause);
//         const location = `0x${address.toString(16)}`;
//         if (
//           !issues.some(
//             (entry) =>
//               entry.code === "chained_pointer_decode_failed" &&
//               entry.location === location,
//           )
//         ) {
//           issues.push(
//             issue(
//               "pointer_fixups",
//               "chained_pointer_decode_failed",
//               reason,
//               location,
//             ),
//           );
//           failures.push(reason);
//         }
//         decodedRanges.delete(chainIndex);
//         return { kind: "unsupported", reason };
//       }
//     },
//   };
// };
//
// const uleb = (bytes: Buffer, cursor: { at: number }, end: number): bigint => {
//   let value = 0n;
//   let shift = 0;
//   for (;;) {
//     if (cursor.at >= end) throw new RangeError("Truncated bind opcode operand");
//     const byte = bytes[cursor.at++] ?? 0;
//     const slice = byte & 0x7f;
//     if ((shift === 63 && slice > 1) || (shift === 64 && slice !== 0))
//       throw new RangeError("Oversized bind opcode operand");
//     if (shift < 64) value |= BigInt(slice) << BigInt(shift);
//     // Padding may extend the encoding, but never the represented integer.
//     shift = Math.min(64, shift + 7);
//     if ((byte & 0x80) === 0) return value;
//   }
// };
//
// const sleb = (bytes: Buffer, cursor: { at: number }, end: number): bigint => {
//   let value = 0n;
//   let shift = 0;
//   let byte = 0;
//   do {
//     if (cursor.at >= end) throw new RangeError("Truncated bind opcode operand");
//     byte = bytes[cursor.at++] ?? 0;
//     const slice = byte & 0x7f;
//     if (
//       (shift === 63 && slice !== 0 && slice !== 0x7f) ||
//       (shift === 64 && slice !== (value < 0n ? 0x7f : 0))
//     )
//       throw new RangeError("Oversized bind opcode operand");
//     if (shift < 64)
//       value = BigInt.asIntN(64, value | (BigInt(slice) << BigInt(shift)));
//     shift = Math.min(64, shift + 7);
//   } while ((byte & 0x80) !== 0);
//   return shift < 64 && (byte & 0x40) !== 0
//     ? value - (1n << BigInt(shift))
//     : value;
// };
//
// /** Registers of the `LC_DYLD_INFO` bind state machine. */
// interface BindState {
//   ordinal: number;
//   segmentIndex: number;
//   symbol: string;
//   weak: boolean;
//   addend: bigint;
//   address: bigint;
// }
//
// /** Apply a bind opcode that sets a register; false when the opcode is not one. */
// const setBindRegister = (
//   image: FixupImage,
//   stream: { readonly cursor: { at: number }; readonly end: number },
//   state: BindState,
//   byte: number,
// ): boolean => {
//   const { bytes } = image;
//   const { cursor, end } = stream;
//   const immediate = byte & 0x0f;
//   switch (byte & 0xf0) {
//     case 0x10:
//       state.ordinal = immediate;
//       return true;
//     case 0x20:
//       state.ordinal = Number(uleb(bytes, cursor, end));
//       return true;
//     case 0x30:
//       state.ordinal = immediate === 0 ? 0 : immediate - 16;
//       return true;
//     case 0x40: {
//       const stop = bytes.indexOf(0, cursor.at);
//       if (stop < 0 || stop >= end)
//         throw new RangeError("Unterminated bind symbol");
export const _l = 194;
