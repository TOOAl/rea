export const __stub = 1;
//         return overlay.bytes.subarray(start, start + size);
//       }
//     }
//     const rva = address - this.imageBase;
//     if (rva > BigInt(Number.MAX_SAFE_INTEGER)) return null;
//     const relative = Number(rva);
//     if (relative < this.#sizeOfHeaders && relative <= this.#bytes.length - size)
//       return this.#bytes.subarray(relative, relative + size);
//     for (const section of this.sections) {
//       if (this.#budget !== undefined && !this.#budget.consumeWork(1))
//         return null;
//       const extent = virtualExtent(section);
//       if (relative < section.rva || relative - section.rva > extent - size)
//         continue;
//       const delta = relative - section.rva;
//       if (delta > section.rawSize - size) return null;
//       const offset = section.rawOffset + delta;
//       return this.#bytes.subarray(offset, offset + size);
//     }
//     return null;
//   }
//   // This checks executable section membership, not file-backed instruction bytes.
//   isExecutable(address: bigint): boolean {
//     if (address < this.imageBase) return false;
//     const rva = address - this.imageBase;
//     for (const section of this.sections) {
//       if (this.#budget !== undefined && !this.#budget.consumeWork(1))
//         return false;
//       if (
//         (section.characteristics & 0x20000000) !== 0 &&
//         rva >= BigInt(section.rva) &&
//         rva < BigInt(section.rva + virtualExtent(section))
//       )
//         return true;
//     }
//     return false;
//   }
//   addOverlay(overlay: ImageOverlay): void {
//     this.#overlays.push(overlay);
//   }
//   virtualBytesRemaining(address: bigint): number {
//     if (address < this.imageBase) return 0;
//     const rva = address - this.imageBase;
//     let section: Section | undefined;
//     for (const candidate of this.sections) {
//       if (this.#budget !== undefined && !this.#budget.consumeWork(1)) return 0;
//       if (
//         rva >= BigInt(candidate.rva) &&
//         rva < BigInt(candidate.rva + virtualExtent(candidate))
//       ) {
//         section = candidate;
//         break;
//       }
//     }
//     return section === undefined
//       ? 0
//       : section.rva + virtualExtent(section) - Number(rva);
//   }
//   #range(offset: number, size: number): void {
//     if (
//       !Number.isSafeInteger(offset) ||
//       !Number.isSafeInteger(size) ||
//       offset < 0 ||
//       size < 0 ||
//       offset > this.#bytes.length - size
//     )
//       throw new Error("PE field leaves the captured file");
//   }
//   #u16(offset: number): number {
//     this.#range(offset, 2);
//     return this.#bytes.readUInt16LE(offset);
//   }
//   #u32(offset: number): number {
//     this.#range(offset, 4);
//     return this.#bytes.readUInt32LE(offset);
//   }
//   #u64(offset: number): bigint {
//     this.#range(offset, 8);
//     return this.#bytes.readBigUInt64LE(offset);
//   }
// }
//
// const hex = (value: bigint): string => `0x${value.toString(16)}`;
// const readU64 = (bytes: Buffer | null, offset = 0): bigint | null =>
//   bytes === null || offset > bytes.length - 8
//     ? null
//     : bytes.readBigUInt64LE(offset);
// const readU32 = (bytes: Buffer | null, offset = 0): number | null =>
//   bytes === null || offset > bytes.length - 4
//     ? null
//     : bytes.readUInt32LE(offset);
// const notApplicable = (
//   sha: string,
//   reason: string,
//   basis: NativeAotReport["coverage"]["basis"],
// ): NativeAotReport => ({
//   format: "dotnet-nativeaot",
//   status: "not_applicable",
//   reason,
//   analysis_artifact_sha256: sha,
//   analysis_mode: "read-only-derived-overlay",
//   header_address: null,
//   discovery: null,
//   format_major: null,
//   format_minor: null,
//   method_tables: 0,
//   types: [],
//   frozen_strings: [],
//   derived_overlay: null,
//   derived_memory: null,
//   coverage: {
//     pointer_candidates_examined: 0,
//     method_tables_recovered: 0,
//     frozen_string_candidates: 0,
//     basis,
//   },
//   diagnostics: [],
//   limitations: [
//     "This report is derived from the admitted file snapshot; it does not define or annotate Ghidra database types.",
//   ],
// });
//
// type RtrDirectory = {
//   readonly address: bigint;
//   readonly major: number;
//   readonly minor: number;
//   readonly sections: readonly RtrSection[];
// };
// type RtrDirectorySearch = {
//   readonly directory: RtrDirectory | null;
//   readonly matches: number;
//   readonly scanBytesExamined: number;
//   readonly scanBytesOmitted: number;
//   readonly truncated: boolean;
// };
//
// const findDirectory = (
//   image: PeImage,
//   bytes: Buffer,
//   budget: NativeAotParserBudget,
// ): RtrDirectorySearch => {
//   let found: RtrDirectory | null = null;
//   let matches = 0;
//   let scanBytesExamined = 0;
//   let totalScanBytes = 0;
//   let truncated = false;
//   scan: for (const section of image.sections) {
//     if (
//       (section.characteristics & 0x40000000) === 0 ||
//       (section.characteristics & 0x20000000) !== 0
//     )
//       continue;
//     const begin = section.rawOffset;
//     const end = begin + fileBackedVirtualExtent(section);
//     const first = (begin + 7) & ~7;
//     const candidateBytes =
//       first <= end - 16 ? (Math.floor((end - 16 - first) / 8) + 1) * 8 : 0;
//     totalScanBytes += candidateBytes;
//     for (let offset = first; offset <= end - 16; offset += 8) {
//       if (!budget.consumeWork(8)) {
//         truncated = true;
//         break scan;
//       }
//       scanBytesExamined += 8;
//       if (bytes.readUInt32LE(offset) !== RTR_SIGNATURE) continue;
//       if (!budget.consumeWork(16)) {
//         truncated = true;
//         break scan;
//       }
//       const count = bytes.readUInt16LE(offset + 12);
//       if (
//         bytes.readUInt8(offset + 14) !== RTR_ROW_SIZE ||
//         bytes.readUInt8(offset + 15) !== RTR_ROW_TYPE ||
//         count < 1 ||
//         offset > end - (16 + count * RTR_ROW_SIZE)
//       )
//         continue;
//       const rows: RtrSection[] = [];
//       let valid = true;
//       for (let row = 0; row < count; row++) {
//         if (!budget.consumeWork(RTR_ROW_SIZE)) {
//           truncated = true;
//           break scan;
//         }
//         const p = offset + 16 + row * RTR_ROW_SIZE;
//         const type = bytes.readUInt32LE(p);
//         const start = bytes.readBigUInt64LE(p + 8);
//         const finish = bytes.readBigUInt64LE(p + 16);
//         const isConsumedRange =
//           type === FROZEN_OBJECT_REGION || type === DEHYDRATED_DATA;
//         const isTypeManagerIndirection = type === 204;
//         if (
//           isConsumedRange &&
//           finish !== start &&
//           !image.hasImageRange(start, finish)
//         ) {
//           valid = false;
//           break;
//         }
//         if (
//           isTypeManagerIndirection &&
//           start !== 0n &&
//           image.read(start, 8) === null
//         ) {
//           valid = false;
//           break;
//         }
//         if (isConsumedRange || isTypeManagerIndirection) {
//           if (rows.some((existing) => existing.type === type)) {
//             valid = false;
//             break;
//           }
//           rows.push({
//             type,
//             flags: bytes.readUInt32LE(p + 4),
//             start,
//             end: finish,
//           });
//         }
//       }
//       if (valid) {
//         matches++;
//         if (found === null)
//           found = {
//             address: image.addressForRva(section.rva + offset - begin),
//             major: bytes.readUInt16LE(offset + 4),
//             minor: bytes.readUInt16LE(offset + 6),
//             sections: rows,
//           };
//       }
//     }
//   }
//   return {
//     directory: found,
//     matches,
//     scanBytesExamined,
//     scanBytesOmitted: Math.max(0, totalScanBytes - scanBytesExamined),
//     truncated,
//   };
// };
//
// const parseMethodTable = (
//   image: PeImage,
//   address: bigint,
//   remainingValidationItems: number,
// ): MethodTable | null => {
//   const header = image.read(address, 16);
//   if (header === null) return null;
//   const flags = header.readUInt32LE(0),
//     baseSize = header.readUInt32LE(4),
//     related = header.readBigUInt64LE(8);
//   const counts = image.read(address + 16n, 4);
//   if (counts === null) return null;
//   const slotsCount = counts.readUInt16LE(0),
//     interfacesCount = counts.readUInt16LE(2);
//   if (baseSize > 0x10000000 || (baseSize !== 0 && baseSize < 16)) return null;
//   const itemCount = slotsCount + interfacesCount;
//   if (itemCount > remainingValidationItems) return null;
//   const tableBytes = 24 + itemCount * 8;
//   const table = image.read(address, tableBytes);
//   if (table === null) return null;
//   for (let slot = 0; slot < slotsCount; slot++) {
//     const target = table.readBigUInt64LE(24 + slot * 8);
//     if (target !== 0n && !image.isExecutable(target)) return null;
//   }
//   for (let index = 0; index < interfacesCount; index++) {
//     const iface = table.readBigUInt64LE(24 + (slotsCount + index) * 8);
//     if (iface !== 0n && image.read(iface, 20) === null) return null;
//   }
//   return { address, flags, baseSize, related, slotsCount, interfacesCount };
// };
//
// const readRelativePointer = (
//   image: PeImage,
//   address: bigint,
// ): bigint | null => {
//   const raw = image.read(address, 4);
//   return raw === null ? null : address + BigInt(raw.readInt32LE(0));
// };
//
// /** Exact UTF-8 length of JSON.stringify for a UTF-16 string without allocating it. */
// const jsonUtf16StringBytes = (bytes: Buffer, codeUnits: number): number => {
//   let total = 2;
//   for (let index = 0; index < codeUnits; index++) {
//     const value = bytes.readUInt16LE(index * 2);
//     if (value === 0x22 || value === 0x5c) total += 2;
//     else if (value < 0x20)
//       total +=
//         value === 8 ||
//         value === 9 ||
//         value === 10 ||
//         value === 12 ||
//         value === 13
//           ? 2
//           : 6;
//     else if (value >= 0xd800 && value <= 0xdbff) {
//       const next =
//         index + 1 < codeUnits ? bytes.readUInt16LE((index + 1) * 2) : 0;
//       if (next >= 0xdc00 && next <= 0xdfff) {
//         total += 4;
//         index++;
//       } else total += 6;
//     } else if (value >= 0xdc00 && value <= 0xdfff) total += 6;
//     else if (value <= 0x7f) total++;
//     else if (value <= 0x7ff) total += 2;
//     else total += 3;
//   }
//   return total;
// };
//
// /** Versioned .NET 8 RTR9.1 hydration, adapted from Washi's MIT-licensed
//  * `ghidra-nativeaot` at effeb734fc570c32650f88b159608979dc7b423e. The
//  * MethodTable layout is cross-checked against the .NET Foundation MIT-licensed
//  * MethodTable.h at runtime commit a3b2d40328be0be3f8dd43f0e5cc925b8827b044.
//  * See licenses/nativeaot-parser-MIT.txt. Output is an isolated parser overlay;
//  * input snapshot bytes stay immutable. */
// const hydrate = (
//   image: PeImage,
//   dehydrated: RtrSection,
//   budget: NativeAotParserBudget,
// ): {
//   readonly base: bigint;
//   readonly sizeBytes: number;
//   readonly sha256: string;
// } | null => {
//   const length = dehydrated.end - dehydrated.start;
//   if (
//     length < 5n ||
//     length > BigInt(image.virtualBytesRemaining(dehydrated.start))
//   )
//     throw new Error("DEHYDRATED_DATA length is outside its mapped section");
//   const first = image.read(dehydrated.start, Number(length));
//   if (first === null)
//     throw new Error("DEHYDRATED_DATA leaves captured PE sections");
//   const base = readRelativePointer(image, dehydrated.start);
//   if (base === null)
//     throw new Error("DEHYDRATED_DATA has no hydration base pointer");
//   const outputLimit = Math.min(
//     image.virtualBytesRemaining(base),
//     budget.limits.workUnits - budget.workUnits,
//     budget.limits.workingMemoryBytes - budget.workingMemoryBytes,
//   );
//   if (outputLimit === 0)
//     throw new Error(
//       "DEHYDRATED_DATA hydration base is outside mapped PE sections",
//     );
//   let output = Buffer.alloc(Math.min(outputLimit, 64 * 1024));
//   if (!budget.reserveWorkingMemory(output.byteLength))
//     throw new Error("NativeAOT working-memory budget is exhausted");
//   let outputLength = 0;
//   let cursor = 4;
//   const ensureOutput = (length: number): number => {
//     if (
//       !Number.isSafeInteger(length) ||
//       length < 0 ||
//       length > outputLimit - outputLength
//     ) {
//       if (length > budget.limits.workUnits - budget.workUnits)
//         throw new Error("NativeAOT parser work budget is exhausted");
//       throw new Error("Hydrated metadata exceeds its mapped PE section");
//     }
//     const start = outputLength;
//     const required = start + length;
//     if (required > output.length) {
//       const capacity = Math.min(
//         outputLimit,
//         Math.max(
//           required,
//           Math.min(outputLimit, output.length * 2 || 64 * 1024),
//         ),
//       );
//       if (!budget.reserveWorkingMemory(capacity))
//         throw new Error("NativeAOT working-memory budget is exhausted");
//       const expanded = Buffer.allocUnsafe(capacity);
//       output.copy(expanded, 0, 0, outputLength);
//       budget.releaseWorkingMemory(output.byteLength);
//       output = expanded;
//     }
//     outputLength = required;
//     return start;
//   };
//   const append = (chunk: Buffer): void => {
//     if (!budget.consumeWork(chunk.length))
//       throw new Error("NativeAOT parser work budget is exhausted");
//     chunk.copy(output, ensureOutput(chunk.length));
//   };
//   const appendZero = (length: number): void => {
//     if (!budget.consumeWork(length))
//       throw new Error("NativeAOT parser work budget is exhausted");
//     const start = ensureOutput(length);
//     output.fill(0, start, outputLength);
//   };
//   const appendRel = (target: bigint): void => {
//     if (!budget.consumeWork(4))
//       throw new Error("NativeAOT parser work budget is exhausted");
//     const delta = target - (base + BigInt(outputLength));
//     if (delta < -0x80000000n || delta > 0x7fffffffn)
//       throw new Error("Hydrated relative pointer does not fit int32");
//     const offset = ensureOutput(4);
//     output.writeInt32LE(Number(delta), offset);
//   };
//   const appendPtr = (target: bigint): void => {
//     if (!budget.consumeWork(8))
//       throw new Error("NativeAOT parser work budget is exhausted");
//     const offset = ensureOutput(8);
//     output.writeBigUInt64LE(target, offset);
//   };
//   const readFixup = (index: number): bigint => {
//     const fixupLocation = dehydrated.end + BigInt(index * 4);
//     const target = readRelativePointer(image, fixupLocation);
//     if (target === null)
//       throw new Error("DEHYDRATED_DATA fixup leaves captured PE sections");
//     return target;
//   };
//   try {
//     while (cursor < first.length) {
//       if (!budget.consumeWork(1))
//         throw new Error("NativeAOT parser work budget is exhausted");
//       const encoded = first[cursor];
//       if (encoded === undefined) break;
//       cursor++;
//       const command = encoded & 7;
//       let payload = encoded >>> 3;
//       const extraBytes = payload - 28;
//       if (extraBytes > 0) {
//         if (extraBytes > 3 || cursor > first.length - extraBytes)
//           throw new Error("Invalid DEHYDRATED_DATA payload encoding");
//         payload = 0;
//         for (let i = 0; i < extraBytes; i++)
//           payload += (first[cursor++] ?? 0) * 2 ** (8 * i);
//         payload += 28;
//       }
//       switch (command) {
//         case 0: {
//           if (cursor > first.length - payload)
//             throw new Error("DEHYDRATED_DATA COPY leaves its section");
//           append(first.subarray(cursor, cursor + payload));
//           cursor += payload;
//           break;
//         }
//         case 1:
//           appendZero(payload);
//           break;
//         case 2:
//           appendRel(readFixup(payload));
//           break;
//         case 3:
//           appendPtr(readFixup(payload));
//           break;
//         case 4:
export const _l = 450;
