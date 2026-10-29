export const __stub = 1;
// interface FixupImage {
//   readonly bytes: Buffer;
//   readonly segments: readonly Segment[];
//   readonly dylibs: readonly string[];
//   readonly baseAddress: bigint;
// }
//
// interface ChainedPage {
//   /** One bit per byte offset, preserving even unaligned producer locations. */
//   readonly locations: Uint8Array;
//   readonly lastOffset: number | undefined;
//   readonly failure: string | undefined;
// }
//
// interface ChainedSegment {
//   readonly segment: Segment;
//   readonly format: number;
//   readonly pageSize: number;
//   /** Compact producer-owned table coordinates, never one map per segment. */
//   readonly pageCount: number;
//   readonly pageStarts: number;
// }
//
// interface ChainedPageSource {
//   readonly offset: number;
//   readonly size: number;
//   readonly format: number;
//   readonly start: number;
// }
//
// /** Parse one physical page; a failed tail retains established locations. */
// const readChainedPage = (
//   bytes: Buffer,
//   source: ChainedPageSource,
// ): ChainedPage => {
//   let locations = new Uint8Array(0);
//   let lastOffset: number | undefined;
//   let failure: string | undefined;
//   try {
//     if ((source.start & 0x8000) !== 0)
//       throw new RangeError(
//         "Multiple chained starts are not valid for 64-bit pointers",
//       );
//     if (source.start + 8 > source.size)
//       throw new RangeError("Chained pointer leaves its file-backed page");
//     // At most one eighth of this file-backed page, not one object per fixup.
//     locations = new Uint8Array(Math.ceil(source.size / 8));
//     const generic = source.format === 2 || source.format === 6;
//     let at = source.start;
//     while (true) {
//       locations[at >>> 3] = (locations[at >>> 3] ?? 0) | (1 << (at & 7));
//       lastOffset = at;
//       const raw = bytes.readBigUInt64LE(source.offset + at);
//       const next = Number(bits(raw, 51, generic ? 12 : 11)) * (generic ? 4 : 8);
//       if (next === 0) break;
//       if (at + next + 8 > source.size)
//         throw new RangeError(
//           "Chained pointer link leaves its file-backed page",
//         );
//       at += next;
//     }
//   } catch (cause: unknown) {
//     failure = cause instanceof Error ? cause.message : String(cause);
//   }
//   return { locations, lastOffset, failure };
// };
//
// const chainedFixups = (
//   image: FixupImage,
//   range: { readonly offset: number; readonly size: number },
//   unreadRebaseBytes: number,
// ): PointerFixups => {
//   const { bytes, segments, dylibs, baseAddress } = image;
//   const base = range.offset;
//   const end = range.offset + range.size;
//   if (
//     !Number.isSafeInteger(base) ||
//     base < 0 ||
//     !Number.isSafeInteger(range.size) ||
//     range.size < 28 ||
//     end > bytes.length
//   )
//     throw new RangeError("Chained fixup header exceeds the target");
//   if (bytes.readUInt32LE(base) !== 0)
//     throw new RangeError("Unsupported chained fixup header version");
//   const startsOffset = bytes.readUInt32LE(base + 4);
//   const importHeader = {
//     offset: bytes.readUInt32LE(base + 8),
//     symbols: bytes.readUInt32LE(base + 12),
//     count: bytes.readUInt32LE(base + 16),
//     format: bytes.readUInt32LE(base + 20),
//   };
//   const importSize =
//     importHeader.format === 3 ? 16 : importHeader.format === 2 ? 8 : 4;
//   const importTableEnd =
//     base + importHeader.offset + importHeader.count * importSize;
//   if (importHeader.format < 1 || importHeader.format > 3)
//     throw new RangeError(
//       `Unsupported chained import format ${importHeader.format}`,
//     );
//   if (
//     importHeader.offset < 28 ||
//     importHeader.symbols < importHeader.offset ||
//     importTableEnd > base + importHeader.symbols ||
//     base + importHeader.symbols > end
//   )
//     throw new RangeError("Chained import table exceeds the fixup data");
//   const imports = (index: number) =>
//     readImport({ bytes, base, end, dylibs }, importHeader, index);
//   if (bytes.readUInt32LE(base + 24) !== 0)
//     throw new RangeError(
//       "Compressed chained-fixup symbol names are not supported",
//     );
//   const starts = base + startsOffset;
//   const startsEnd = base + importHeader.offset;
//   const requireStartsRange = (at: number, size: number): void => {
//     if (at < base + 28 || at > startsEnd - size)
//       throw new RangeError("Chained starts table exceeds its fixup data");
//   };
//   requireStartsRange(starts, 4);
//   const segmentCount = bytes.readUInt32LE(starts);
//   if (segmentCount > segments.length)
//     throw new RangeError(
//       "Chained starts segment count exceeds the Mach-O layout",
//     );
//   requireStartsRange(starts, 4 + segmentCount * 4);
//   const ranges: ChainedSegment[] = [];
//   // A non-overlapping file view has at most file-size/minimum-page-size
//   // pages plus two partial pages per segment. Keep both metadata entries and
//   // bitmap bytes within that format-derived working set. Aliased/exhausted
//   // views remain readable by transient recomputation, not input rejection.
//   const maximumCachedPages =
//     Math.ceil(bytes.length / 0x1000) + 2 * segmentCount;
//   let remainingLocationBytes = Math.ceil(bytes.length / 8);
//   const cachedPages = new Map<string, ChainedPage>();
//   const pageFacts = (
//     chain: ChainedSegment,
//     page: number,
//     start: number,
//   ): ChainedPage => {
//     const pageOffset = page * chain.pageSize;
//     const source = {
//       offset: chain.segment.offset + pageOffset,
//       size: Math.min(
//         chain.pageSize,
//         Number(chain.segment.size) - pageOffset,
//         bytes.length - chain.segment.offset - pageOffset,
//       ),
//       format: chain.format,
//       start,
//     };
//     const key = `${source.offset}:${source.size}:${source.format}:${source.start}`;
//     const cached = cachedPages.get(key);
//     if (cached !== undefined) return cached;
//     // Decide retention before allocating the page facts. An exhausted cache
//     // uses only one transient, format-bounded page, preserving decode behavior.
//     const retain =
//       cachedPages.size < maximumCachedPages &&
//       Math.ceil(Math.max(source.size, 0) / 8) <= remainingLocationBytes;
//     const facts = readChainedPage(bytes, source);
//     if (retain) {
//       remainingLocationBytes -= facts.locations.byteLength;
//       cachedPages.set(key, facts);
//     }
//     return facts;
//   };
//   for (let index = 0; index < segmentCount; index++) {
//     const infoOffset = bytes.readUInt32LE(starts + 4 + index * 4);
//     if (infoOffset === 0) continue;
//     const segment = segments[index];
//     if (segment === undefined)
//       throw new RangeError("Chained fixup segment table is out of range");
//     const info = starts + infoOffset;
//     requireStartsRange(info, 22);
//     const infoSize = bytes.readUInt32LE(info);
//     const pageSize = bytes.readUInt16LE(info + 4);
//     const pageCount = bytes.readUInt16LE(info + 20);
//     if (infoSize < 22 + pageCount * 2)
//       throw new RangeError("Chained page starts exceed the segment table size");
//     requireStartsRange(info, infoSize);
//     if (pageSize !== 0x1000 && pageSize !== 0x4000)
//       throw new RangeError("Chained page size must be 4096 or 16384 bytes");
//     if (bytes.readBigUInt64LE(info + 8) !== segment.address - baseAddress)
//       throw new RangeError(
//         "Chained segment offset disagrees with its Mach-O layout",
//       );
//     ranges.push({
//       segment,
//       format: bytes.readUInt16LE(info + 6),
//       pageSize,
//       pageCount,
//       pageStarts: info + 22,
//     });
//   }
export const _l = 194;
