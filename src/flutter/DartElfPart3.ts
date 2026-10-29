export const __stub = 1;
//         size === null ||
//         width !== entrySize ||
//         offset > bytes.length ||
//         size > bytes.length - offset ||
//         size % entrySize !== 0
//       )
//         return failure("Dynamic symbol table is malformed");
//       if (link === null || link >= e_shnum)
//         return failure("Dynamic symbol string section link is invalid");
//       const stringHeader = e_shoff + link * e_shentsize;
//       const stringOffset = is64
//         ? reader.u64(stringHeader + 0x18)
//         : reader.u32(stringHeader + 0x10);
//       const stringSize = is64
//         ? reader.u64(stringHeader + 0x20)
//         : reader.u32(stringHeader + 0x14);
//       if (
//         reader.u32(stringHeader + 4) !== 3 ||
//         stringOffset === null ||
//         stringSize === null ||
//         stringOffset > bytes.length ||
//         stringSize > bytes.length - stringOffset
//       )
//         return failure(
//           "Dynamic symbol strings are out of bounds or not a string table",
//         );
//       const symbolMapping = sectionMappingFailure(header, offset, size);
//       if (symbolMapping !== undefined)
//         return failure(`Dynamic symbol table ${symbolMapping}`);
//       const stringMapping = sectionMappingFailure(
//         stringHeader,
//         stringOffset,
//         stringSize,
//       );
//       if (stringMapping !== undefined)
//         return failure(`Dynamic symbol string table ${stringMapping}`);
//       tables.push({
//         offset,
//         count: size / entrySize,
//         stringOffset,
//         stringSize,
//       });
//     }
//   } else if (dynamicSegment !== null) {
//     const tags = new Map<number, number>();
//     const dynamicEntrySize = is64 ? 16 : 8;
//     let terminated = false;
//     for (
//       let base = dynamicSegment.offset;
//       base + dynamicEntrySize <= dynamicSegment.offset + dynamicSegment.filesz;
//       base += dynamicEntrySize
//     ) {
//       if ((base - dynamicSegment.offset) % (4096 * dynamicEntrySize) === 0) {
//         await yieldToEventLoop();
//         signal?.throwIfAborted();
//       }
//       const tag = is64 ? reader.u64(base) : reader.u32(base);
//       const value = is64 ? reader.u64(base + 8) : reader.u32(base + 4);
//       if (tag === null || value === null)
//         return failure("Dynamic entry is not representable");
//       if (tag === DT_NULL) {
//         terminated = true;
//         break;
//       }
//       if (
//         ![DT_SYMTAB, DT_STRTAB, DT_STRSZ, DT_SYMENT, 4, 0x6ffffef5].includes(
//           tag,
//         )
//       )
//         continue;
//       if (tags.has(tag) && tags.get(tag) !== value)
//         return failure("Conflicting dynamic table tags");
//       tags.set(tag, value);
//     }
//     const sym = tags.get(DT_SYMTAB);
//     const str = tags.get(DT_STRTAB);
//     const stringSize = tags.get(DT_STRSZ);
//     if (
//       !terminated ||
//       sym === undefined ||
//       str === undefined ||
//       stringSize === undefined ||
//       tags.get(DT_SYMENT) !== entrySize
//     )
//       return failure(
//         "Stripped ELF lacks a complete dynamic symbol-table description",
//       );
//     // DT_HASH's nchain is the dynsym count. GNU hash instead records the
//     // first hashed index and bounded buckets/chains. No payload-to-EOF walk.
//     let count: number;
//     const sysv = tags.get(4);
//     const gnu = tags.get(0x6ffffef5);
//     if (sysv !== undefined) {
//       const at = toOffset(sysv, 8);
//       if (!at.ok) return failure(`DT_HASH header ${at.error.reason}`);
//       const buckets = reader.u32(at.value)!;
//       count = reader.u32(at.value + 4)!;
//       const table = toOffset(sysv, 8 + 4 * (buckets + count));
//       if (!table.ok) return failure(`DT_HASH table ${table.error.reason}`);
//     } else if (gnu !== undefined) {
//       const at = toOffset(gnu, 16);
//       if (!at.ok) return failure(`DT_GNU_HASH header ${at.error.reason}`);
//       const buckets = reader.u32(at.value)!;
//       const firstSymbol = reader.u32(at.value + 4)!;
//       const bloomWords = reader.u32(at.value + 8)!;
//       const prefixBytes = 16 + bloomWords * (is64 ? 8 : 4) + buckets * 4;
//       if (buckets === 0 || bloomWords === 0)
//         return failure("DT_GNU_HASH buckets are malformed");
//       const prefix = toOffset(gnu, prefixBytes);
//       if (!prefix.ok)
//         return failure(`DT_GNU_HASH buckets ${prefix.error.reason}`);
//       let last = 0;
//       const bucketsAt = at.value + 16 + bloomWords * (is64 ? 8 : 4);
//       for (let index = 0; index < buckets; index += 1) {
//         if (index % 4096 === 0) {
//           await yieldToEventLoop();
//           signal?.throwIfAborted();
//         }
//         const value = reader.u32(bucketsAt + index * 4)!;
//         if (value !== 0 && value < firstSymbol)
//           return failure("DT_GNU_HASH bucket precedes its first symbol");
//         last = Math.max(last, value);
//       }
//       count = firstSymbol;
//       if (last !== 0) {
//         let index = last;
//         while (true) {
//           if ((index - last) % 4096 === 0) {
//             await yieldToEventLoop();
//             signal?.throwIfAborted();
//           }
//           const span = prefixBytes + (index - firstSymbol + 1) * 4;
//           const range = toOffset(gnu, span);
//           if (!range.ok)
export const _l = 134;
