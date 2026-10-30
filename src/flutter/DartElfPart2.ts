export const __stub = 1;
//   const MIN_PHENT = is64 ? 56 : 32;
//   if (
//     e_phoff === null ||
//     e_phentsize === null ||
//     e_phnum === null ||
//     e_phnum === 0xffff ||
//     !tableFits(e_phoff, e_phentsize, e_phnum, MIN_PHENT)
//   )
//     return {
//       failure: {
//         reason: "ELF program header table is missing or out of bounds",
//       },
//     };
//
//   return {
//     header: {
//       is64,
//       dynamicFallback,
//       e_shoff,
//       e_shentsize,
//       e_shnum,
//       e_phoff,
//       e_phentsize,
//       e_phnum,
//     },
//   };
// };
//
// export interface ElfSymbolInventory {
//   readonly symbols: readonly ElfSymbol[];
//   readonly failures: readonly ElfParseFailure[];
// }
//
// /** Decode the ELF tables once and resolve only the requested definitions. */
// export const readElfSymbols = async (
//   bytes: Buffer,
//   symbolNames: readonly string[],
//   signal?: AbortSignal,
// ): Promise<ElfSymbolInventory> => {
//   signal?.throwIfAborted();
//   const failure = (reason: string): ElfSymbolInventory => ({
//     symbols: [],
//     failures: [{ reason }],
//   });
//   const parsed = readElfHeader(bytes);
//   if (parsed.failure !== undefined) return failure(parsed.failure.reason);
//   const {
//     is64,
//     dynamicFallback,
//     e_shoff,
//     e_shentsize,
//     e_shnum,
//     e_phoff,
//     e_phentsize,
//     e_phnum,
//   } = parsed.header;
//   const reader = new BoundedReader(bytes);
//   const entrySize = is64 ? 24 : 16;
//   const segments: { vaddr: number; offset: number; filesz: number }[] = [];
//   let dynamicSegment: { offset: number; filesz: number } | null = null;
//   for (let index = 0; index < e_phnum; index += 1) {
//     if (index % 4096 === 0) {
//       await yieldToEventLoop();
//       signal?.throwIfAborted();
//     }
//     const base = e_phoff + index * e_phentsize;
//     const type = reader.u32(base);
//     if (type !== PT_LOAD && type !== PT_DYNAMIC) continue;
//     const vaddr = is64 ? reader.u64(base + 0x10) : reader.u32(base + 8);
//     const offset = is64 ? reader.u64(base + 8) : reader.u32(base + 4);
//     const filesz = is64 ? reader.u64(base + 0x20) : reader.u32(base + 0x10);
//     if (
//       vaddr === null ||
//       offset === null ||
//       filesz === null ||
//       !Number.isSafeInteger(vaddr + filesz) ||
//       offset > bytes.length ||
//       filesz > bytes.length - offset
//     )
//       return failure(`ELF segment ${String(index)} is not file-backed`);
//     if (type === PT_LOAD) segments.push({ vaddr, offset, filesz });
//     else if (dynamicSegment !== null)
//       return failure("Multiple PT_DYNAMIC segments are ambiguous");
//     else dynamicSegment = { offset, filesz };
//   }
//   const toOffset = await createElfLoadMap(segments, signal);
//   if (segments.length === 0)
//     return failure("ELF image has no PT_LOAD segments");
//   const tables: {
//     offset: number;
//     count: number;
//     stringOffset: number;
//     stringSize: number;
//   }[] = [];
//   /**
//    * The loader reads an allocated section through PT_LOAD, so its section
//    * offset must be the single file interpretation of its address range.
//    */
//   const sectionMappingFailure = (
//     header: number,
//     offset: number,
//     size: number,
//   ): string | undefined => {
//     const flags = is64 ? reader.u64(header + 8) : reader.u32(header + 8);
//     const address = is64
//       ? reader.u64(header + 0x10)
//       : reader.u32(header + 0x0c);
//     if (flags === null || address === null)
//       return "has an unrepresentable section header";
//     if ((flags & SHF_ALLOC) === 0) return undefined;
//     const mapped = toOffset(address, size);
//     if (!mapped.ok) return mapped.error.reason;
//     return mapped.value === offset
//       ? undefined
//       : "section offset disagrees with its PT_LOAD mapping";
//   };
//   if (!dynamicFallback) {
//     for (let index = 0; index < e_shnum; index += 1) {
//       if (index % 4096 === 0) {
//         await yieldToEventLoop();
//         signal?.throwIfAborted();
//       }
//       const header = e_shoff + index * e_shentsize;
//       if (reader.u32(header + 4) !== SHT_DYNSYM) continue;
//       const offset = is64
//         ? reader.u64(header + 0x18)
//         : reader.u32(header + 0x10);
//       const size = is64 ? reader.u64(header + 0x20) : reader.u32(header + 0x14);
//       const width = is64
//         ? reader.u64(header + 0x38)
//         : reader.u32(header + 0x24);
//       const link = reader.u32(header + (is64 ? 0x28 : 0x18));
//       if (
//         offset === null ||
export const _l = 134;
