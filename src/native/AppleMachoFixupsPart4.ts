export const __stub = 1;
//       state.symbol = bytes.toString("utf8", cursor.at, stop);
//       state.weak = (immediate & 0x1) !== 0;
//       cursor.at = stop + 1;
//       return true;
//     }
//     case 0x50:
//       return true;
//     case 0x60:
//       state.addend = sleb(bytes, cursor, end);
//       return true;
//     case 0x70: {
//       const segment = image.segments[immediate];
//       if (segment === undefined)
//         throw new RangeError("Bind segment index is out of range");
//       state.segmentIndex = immediate;
//       state.address = segment.address + uleb(bytes, cursor, end);
//       return true;
//     }
//     case 0x80:
//       // ULEB deltas wrap at 64 bits to encode negative steps.
//       state.address =
//         (state.address + uleb(bytes, cursor, end)) & 0xffffffffffffffffn;
//       return true;
//     default:
//       return false;
//   }
// };
//
// /** Interpret one `LC_DYLD_INFO` bind opcode stream into address -> import. */
// const readBindStream = (
//   image: FixupImage,
//   range: FixupCommands["binds"][number],
//   binds: BindRun[],
// ): void => {
//   const { bytes } = image;
//   const end = range.offset + range.size;
//   if (end > bytes.length)
//     throw new RangeError("Bind opcodes exceed the target");
//   const cursor = { at: range.offset };
//   const state: BindState = {
//     ordinal: 0,
//     segmentIndex: -1,
//     symbol: "",
//     weak: false,
//     addend: 0n,
//     address: 0n,
//   };
//   const preflightRun = (count: bigint, skip: bigint): void => {
//     if (count === 0n) return;
//     const segment = image.segments[state.segmentIndex];
//     if (segment === undefined)
//       throw new RangeError("Bind location has no selected segment");
//     const stride = 8n + skip;
//     const end = state.address + (count - 1n) * stride + 8n;
//     if (state.address < segment.address || end > segment.address + segment.size)
//       throw new RangeError("Bind expansion leaves its file-backed segment");
//   };
//   const bind = (count: bigint, skip: bigint): void => {
//     if (count === 0n) return;
//     preflightRun(count, skip);
//     const stride = 8n + skip;
//     const binding: Import = {
//       symbol: state.symbol,
//       library:
//         range.stream === "weak"
//           ? null
//           : libraryName(state.ordinal, image.dylibs),
//       weak: state.weak,
//       addend: state.addend,
//     };
//     const previous = binds.at(-1);
//     if (
//       previous !== undefined &&
//       previous.stride === stride &&
//       previous.start + previous.count * stride === state.address &&
//       previous.binding.symbol === binding.symbol &&
//       previous.binding.library === binding.library &&
//       previous.binding.weak === binding.weak &&
//       previous.binding.addend === binding.addend
//     ) {
//       previous.count += count;
//     } else {
//       binds.push({ start: state.address, count, stride, binding });
//     }
//     // The dyld bind stream advances addresses modulo 64 bits; ld uses -8 to
//     // bind the current pointer slot again with DO_BIND_ADD_ADDR_ULEB.
//     state.address = (state.address + count * stride) & 0xffffffffffffffffn;
//   };
//   while (cursor.at < end) {
//     const byte = bytes[cursor.at++] ?? 0;
//     if (setBindRegister(image, { cursor, end }, state, byte)) continue;
//     switch (byte & 0xf0) {
//       case 0x00:
//         // DONE separates lazy-bind entries; other streams end here.
//         if (range.stream !== "lazy") return;
//         break;
//       case 0x90:
//         bind(1n, 0n);
//         break;
//       case 0xa0:
//         bind(1n, uleb(bytes, cursor, end));
//         break;
//       case 0xb0:
//         bind(1n, BigInt(byte & 0x0f) * 8n);
//         break;
//       case 0xc0: {
//         if (range.stream === "lazy")
//           throw new RangeError(
//             "Lazy bind streams do not support repeated bind opcodes",
//           );
//         const count = uleb(bytes, cursor, end);
//         const skip = uleb(bytes, cursor, end);
//         bind(count, skip);
//         break;
//       }
//       default:
//         throw new RangeError(`Unsupported bind opcode 0x${byte.toString(16)}`);
//     }
//   }
// };
//
// /** Build pointer decoding for one slice from its fixup load commands. */
// export const parsePointerFixups = (
//   bytes: Buffer,
//   commands: FixupCommands,
//   segments: readonly Segment[],
//   baseAddress: bigint,
// ): PointerFixups => {
//   const image = { bytes, segments, dylibs: commands.dylibs, baseAddress };
//   const unreadRebaseBytes = commands.rebases.reduce(
//     (total, rebase) => total + rebase.size,
//     0,
//   );
//   if (commands.chained !== null) {
//     return chainedFixups(image, commands.chained, unreadRebaseBytes);
//   }
//   if (commands.binds.length === 0)
//     return {
//       kind: "none",
//       formats: [],
//       failures: [],
//       issues: [],
//       examined: 0,
//       decoded: 0,
//       unreadRebaseBytes,
//       decode: (_address, raw) => ({ kind: "rebase", target: raw }),
//     };
//   const binds: BindRun[] = [];
//   const failures: string[] = [];
//   let decoded = 0;
//   for (const stream of commands.binds)
//     try {
//       readBindStream(image, stream, binds);
//       decoded++;
//     } catch (cause: unknown) {
//       failures.push(
//         `${stream.stream} bind opcodes: ${cause instanceof Error ? cause.message : String(cause)}`,
//       );
//     }
//   return {
//     kind: "dyld-info",
//     formats: [],
//     failures,
//     issues: failures.map((message) =>
//       issue("pointer_fixups", "bind_stream_decode_failed", message),
//     ),
//     examined: commands.binds.length,
//     decoded,
//     unreadRebaseBytes,
//     decode(address, raw) {
//       let match: BindRun | undefined;
//       for (const run of binds) {
//         const { start, count, stride } = run;
//         const distance = address - start;
//         if (
//           distance >= 0n &&
//           distance % stride === 0n &&
//           distance / stride < count
//         ) {
//           if (match !== undefined)
//             return {
//               kind: "unsupported",
//               reason: `Ambiguous bind records target pointer location 0x${address.toString(16)}`,
//             };
//           match = run;
//         }
//       }
//       return match === undefined
//         ? { kind: "rebase", target: raw }
//         : { kind: "bind", ...match.binding };
//     },
//   };
// };
export const _l = 193;
