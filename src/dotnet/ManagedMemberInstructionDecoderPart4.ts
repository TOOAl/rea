export const __stub = 1;
//         operandKind: operand.anchorKind,
//         operand: operand.value,
//       });
//     }
//   } catch (cause: unknown) {
//     if (cause instanceof ManagedReaderFailure) throw cause;
//     issue =
//       cause instanceof Error ? cause.message : "Instruction decode failed";
//   }
//   const truncated = offset < il.length && issue === null ? 1 : 0;
//   return { parsed, instructionStarts, count: parsed.length, truncated, issue };
// };
//
// export const parseExceptionRegions = (
//   bytes: Buffer,
//   offset: number,
//   methodEnd: number,
//   budget?: ManagedDecodeBudget,
// ): ExceptionRegionParseResult => {
//   const regions: ManagedExceptionRegion[] = [];
//   let sectionOffset = offset;
//   let hasMoreSections = true;
//   while (hasMoreSections) {
//     if (
//       !Number.isSafeInteger(sectionOffset) ||
//       sectionOffset < 0 ||
//       sectionOffset > methodEnd - 4 ||
//       sectionOffset > bytes.length - 4
//     )
//       return malformedExceptionRegions(
//         "Exception section header leaves artifact",
//         regions,
//       );
//
//     const kind = bytes.readUInt8(sectionOffset);
//     if ((kind & 0x3f) !== 1)
//       return malformedExceptionRegions(
//         `Unsupported method data section kind ${String(kind & 0x3f)}`,
//         regions,
//       );
//     const fat = (kind & 0x40) !== 0;
//     const size = fat
//       ? bytes.readUInt8(sectionOffset + 1) |
//         (bytes.readUInt8(sectionOffset + 2) << 8) |
//         (bytes.readUInt8(sectionOffset + 3) << 16)
//       : bytes.readUInt8(sectionOffset + 1);
//     const clauseSize = fat ? 24 : 12;
//     if (
//       size < 4 ||
//       sectionOffset > methodEnd - size ||
//       sectionOffset > bytes.length - size
//     )
//       return malformedExceptionRegions(
//         "Exception section size leaves artifact",
//         regions,
//       );
//     let count: number;
//     let sectionSize = size;
//     if (fat) {
//       if ((size - 4) % clauseSize !== 0)
//         return malformedExceptionRegions(
//           "Exception section size does not contain whole clauses",
//           regions,
//         );
//       count = (size - 4) / clauseSize;
//     } else if ((size - 4) % clauseSize === 0) {
//       count = (size - 4) / clauseSize;
//     } else if (size >= clauseSize && size % clauseSize === 0) {
//       // CoreCLR accommodates legacy VB/MC++ sections whose DataSize omits the
//       // four-byte section header. DataSize is still not the physical extent.
//       count = size / clauseSize;
//       sectionSize = 4 + count * clauseSize;
//     } else {
//       return malformedExceptionRegions(
//         "Exception section size does not contain whole clauses",
//         regions,
//       );
//     }
//     if (
//       sectionOffset > methodEnd - sectionSize ||
//       sectionOffset > bytes.length - sectionSize
//     )
//       return malformedExceptionRegions(
//         "Exception section size leaves artifact",
//         regions,
//       );
//     if (
//       !fat &&
//       (bytes[sectionOffset + 2] !== 0 || bytes[sectionOffset + 3] !== 0)
//     )
//       return malformedExceptionRegions(
//         "Small exception section reserved bytes are nonzero",
//         regions,
//       );
//
//     // Accumulates with the method IL bound; the body reserves what it retains.
//     budget?.admitTransient(count * 256, sectionOffset);
//     for (const region of readExceptionClauses(
//       bytes,
//       sectionOffset + 4,
//       count,
//       fat,
//     ))
//       regions.push(region);
//
//     hasMoreSections = (kind & 0x80) !== 0;
//     sectionOffset += sectionSize;
//   }
//   return { status: "complete", regions };
// };
//
// export type ExceptionRegionParseResult =
//   | {
//       readonly status: "complete";
//       readonly regions: ManagedExceptionRegion[];
//     }
//   | {
//       readonly status: "malformed";
//       readonly regions: ManagedExceptionRegion[];
//       readonly issue: string;
//     };
//
// const malformedExceptionRegions = (
//   issue: string,
//   regions: ManagedExceptionRegion[] = [],
// ): ExceptionRegionParseResult => ({ status: "malformed", regions, issue });
//
// const readExceptionClauses = (
//   bytes: Buffer,
//   start: number,
//   count: number,
//   fat: boolean,
// ): ManagedExceptionRegion[] => {
//   const regions: ManagedExceptionRegion[] = [];
//   const clauseSize = fat ? 24 : 12;
//   for (let index = 0; index < count; index += 1) {
//     const clause = start + index * clauseSize;
//     const flags = fat ? bytes.readUInt32LE(clause) : bytes.readUInt16LE(clause);
//     const extra = bytes.readUInt32LE(clause + (fat ? 20 : 8));
//     regions.push({
//       flags,
//       try_offset: fat
//         ? bytes.readUInt32LE(clause + 4)
//         : bytes.readUInt16LE(clause + 2),
//       try_length: fat
//         ? bytes.readUInt32LE(clause + 8)
//         : bytes.readUInt8(clause + 4),
//       handler_offset: fat
//         ? bytes.readUInt32LE(clause + 12)
//         : bytes.readUInt16LE(clause + 5),
//       handler_length: fat
//         ? bytes.readUInt32LE(clause + 16)
//         : bytes.readUInt8(clause + 7),
//       class_token:
//         flags === 0 ? `0x${extra.toString(16).padStart(8, "0")}` : null,
//       filter_offset: flags === 1 ? extra : null,
//     });
//   }
//   return regions;
// };
export const _l = 160;
