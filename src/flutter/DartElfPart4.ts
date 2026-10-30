export const __stub = 1;
//             return failure(`DT_GNU_HASH chain ${range.error.reason}`);
//           const chain = reader.u32(at.value + span - 4)!;
//           index += 1;
//           if ((chain & 1) !== 0) {
//             count = index;
//             break;
//           }
//         }
//       }
//     } else
//       return failure("Stripped ELF has no DT_HASH or DT_GNU_HASH symbol count");
//     const offset = toOffset(sym, count * entrySize);
//     const stringOffset = toOffset(str, stringSize);
//     if (!offset.ok)
//       return failure(`Dynamic symbol table ${offset.error.reason}`);
//     if (!stringOffset.ok)
//       return failure(`Dynamic string table ${stringOffset.error.reason}`);
//     tables.push({
//       offset: offset.value,
//       count,
//       stringOffset: stringOffset.value,
//       stringSize,
//     });
//   }
//   const wanted = new Set(symbolNames);
//   const symbols = new Map<string, ElfSymbol>();
//   const ambiguous = new Set<string>();
//   const unresolved = new Set<string>();
//   const failures = new Set<string>();
//   for (const table of tables) {
//     for (let index = 0; index < table.count; index += 1) {
//       if (index % 4096 === 0) {
//         await yieldToEventLoop();
//         signal?.throwIfAborted();
//       }
//       const base = table.offset + index * entrySize;
//       const nameOffset = reader.u32(base)!;
//       const sectionIndex = reader.u16(base + (is64 ? 6 : 14))!;
//       const defined =
//         sectionIndex === 0xfff1 ||
//         (sectionIndex > 0 &&
//           sectionIndex < 0xff00 &&
//           (dynamicFallback || sectionIndex < e_shnum));
//       if (!defined || nameOffset >= table.stringSize) continue;
//       const name = reader.cString(
//         table.stringOffset + nameOffset,
//         table.stringOffset + table.stringSize,
//       );
//       if (name === null || !wanted.has(name)) continue;
//       const value = is64 ? reader.u64(base + 8) : reader.u32(base + 4);
//       const size = is64 ? reader.u64(base + 16) : reader.u32(base + 8);
//       if (value === null || size === null) {
//         failures.add(`Symbol ${name} has unrepresentable bounds`);
//         unresolved.add(name);
//         continue;
//       }
//       const offset = toOffset(value, size);
//       if (!offset.ok) {
//         failures.add(`Symbol ${name} ${offset.error.reason}`);
//         unresolved.add(name);
//         continue;
//       }
//       const previous = symbols.get(name);
//       if (
//         previous !== undefined &&
//         (previous.offset !== offset.value || previous.size !== size)
//       )
//         ambiguous.add(name);
//       else symbols.set(name, { name, offset: offset.value, size });
//     }
//   }
//   for (const name of ambiguous) {
//     symbols.delete(name);
//     failures.add(`Symbol ${name} has conflicting definitions`);
//   }
//   for (const name of unresolved) symbols.delete(name);
//   for (const name of wanted)
//     if (!symbols.has(name) && !ambiguous.has(name) && !unresolved.has(name))
//       failures.add(`symbol ${name} is not in the dynamic symbol table`);
//   return {
//     symbols: [...symbols.values()],
//     failures: [...failures].map((reason) => ({ reason })),
//   };
// };
//
// /** Read one Dart snapshot section header from its file offset. */
// export const readSnapshotHeader = (
//   bytes: Buffer,
//   offset: number,
// ): {
//   magicValid: boolean;
//   kind: number | null;
//   headerLength: number | null;
//   hash: string | null;
//   complete: boolean;
// } => {
//   const reader = new BoundedReader(bytes);
//   // The Dart magic bytes f5 f5 dc dc read little-endian. Kind and length
//   // fields are only meaningful in data-section headers; sections without
//   // the magic (instructions carry a different layout) report nulls.
//   const magic = reader.u32(offset);
//   if (magic !== 0xdcdcf5f5)
//     return {
//       magicValid: false,
//       kind: null,
//       headerLength: null,
//       hash: null,
//       complete: false,
//     };
//   const headerLength = reader.u64(offset + 4);
//   const kind = reader.u64(offset + 12);
//   const candidate = bytes
//     .subarray(
//       offset + SNAPSHOT_HASH_OFFSET,
//       offset + SNAPSHOT_HASH_OFFSET + SNAPSHOT_HASH_LENGTH,
//     )
//     .toString("latin1");
//   const hash = SNAPSHOT_HASH_PATTERN.test(candidate) ? candidate : null;
//   // Dart's stored length excludes the four magic bytes and includes the
//   // 20-byte fixed header and the version hash. Aligned data may follow it
//   // inside the exported symbol, but the serialized snapshot must fit.
//   // Kind 3 is FullAOT in the supported Dart 2.14 layout; enum values change
//   // across SDK versions, so other kinds remain uninterpreted observations.
//   const complete =
//     headerLength !== null &&
//     headerLength >= SNAPSHOT_HASH_OFFSET + SNAPSHOT_HASH_LENGTH - 4 &&
//     headerLength <= bytes.length - offset - 4 &&
//     kind === 3 &&
//     hash !== null;
//   return { magicValid: true, kind, headerLength, hash, complete };
// };
export const _l = 131;
