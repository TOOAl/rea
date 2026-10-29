export const __stub = 1;
// import { createHash } from "node:crypto";
// import type { NativeMetadataRecovery } from "./nativeMetadataRecovery.js";
//
// const RTR_SIGNATURE = 0x00525452;
// const RTR_ROW_SIZE = 24;
// const RTR_ROW_TYPE = 1;
// const DEHYDRATED_DATA = 207;
// const FROZEN_OBJECT_REGION = 206;
// export const NATIVE_AOT_MAX_SOURCE_BYTES = 128 * 1024 * 1024;
// /** Bound one parser-produced JSON report independently of any transport. */
// export const NATIVE_AOT_MAX_REPORT_BYTES = 4 * 1024 * 1024;
// export const NATIVE_AOT_MAX_WORK_UNITS = 64 * 1024 * 1024;
// export const NATIVE_AOT_MAX_WORKING_MEMORY_BYTES = 64 * 1024 * 1024;
// /** Version of the built-in read-only PE metadata interpretation in profiles. */
// export const NATIVE_AOT_PROFILE_CONTRACT_REVISION =
//   "rtr-9.1-x64-pe-read-only-v3";
//
// export type NativeAotParserLimits = {
//   readonly sourceBytes: number;
//   readonly workUnits: number;
//   readonly workingMemoryBytes: number;
// };
// export const DEFAULT_NATIVE_AOT_PARSER_LIMITS: NativeAotParserLimits = {
//   sourceBytes: NATIVE_AOT_MAX_SOURCE_BYTES,
//   workUnits: NATIVE_AOT_MAX_WORK_UNITS,
//   workingMemoryBytes: NATIVE_AOT_MAX_WORKING_MEMORY_BYTES,
// };
//
// class NativeAotParserBudget {
//   workUnits = 0;
//   workingMemoryBytes = 0;
//   workingMemoryBytesPeak = 0;
//   truncationReason:
//     | "work-unit-budget"
//     | "working-memory-budget"
//     | "response-budget"
//     | undefined;
//
//   constructor(readonly limits: NativeAotParserLimits) {}
//
//   consumeWork(bytes: number): boolean {
//     if (
//       !Number.isSafeInteger(bytes) ||
//       bytes < 0 ||
//       bytes > this.limits.workUnits - this.workUnits
//     ) {
//       this.truncationReason ??= "work-unit-budget";
//       return false;
//     }
//     this.workUnits += bytes;
//     return true;
//   }
//
//   reserveWorkingMemory(bytes: number): boolean {
//     if (
//       !Number.isSafeInteger(bytes) ||
//       bytes < 0 ||
//       bytes > this.limits.workingMemoryBytes - this.workingMemoryBytes
//     ) {
//       this.truncationReason ??= "working-memory-budget";
//       return false;
//     }
//     this.workingMemoryBytes += bytes;
//     this.workingMemoryBytesPeak = Math.max(
//       this.workingMemoryBytesPeak,
//       this.workingMemoryBytes,
//     );
//     return true;
//   }
//
//   releaseWorkingMemory(bytes: number): void {
//     this.workingMemoryBytes = Math.max(0, this.workingMemoryBytes - bytes);
//   }
// }
//
// type Section = {
//   readonly name: string;
//   readonly rva: number;
//   readonly virtualSize: number;
//   readonly rawOffset: number;
//   readonly rawSize: number;
//   readonly characteristics: number;
// };
// // Compatible PE loaders use raw size when VirtualSize is zero. Otherwise,
// // RVA containment follows the declared VirtualSize, independent of file size.
// const virtualExtent = (section: Section): number =>
//   section.virtualSize === 0 ? section.rawSize : section.virtualSize;
// const fileBackedVirtualExtent = (section: Section): number =>
//   Math.min(virtualExtent(section), section.rawSize);
// type RtrSection = {
//   readonly type: number;
//   readonly flags: number;
//   readonly start: bigint;
//   readonly end: bigint;
// };
// type MethodTable = {
//   readonly address: bigint;
//   readonly flags: number;
//   readonly baseSize: number;
//   readonly related: bigint;
//   readonly slotsCount: number;
//   readonly interfacesCount: number;
// };
// const METHOD_TABLE_RECORD_BYTES = 32;
// class MethodTableIndex {
//   #records = Buffer.alloc(0);
//   #count = 0;
//   #includedCount = 0;
//
//   constructor(private readonly budget: NativeAotParserBudget) {}
//
//   get count(): number {
//     return this.#count;
//   }
//   get includedCount(): number {
//     return this.#includedCount;
//   }
//
//   append(table: MethodTable): boolean {
//     if (!this.#ensureCapacity(this.#count + 1)) return false;
//     const offset = this.#count * METHOD_TABLE_RECORD_BYTES;
//     this.#records.writeBigUInt64LE(table.address, offset);
//     this.#records.writeUInt32LE(table.flags, offset + 8);
//     this.#records.writeUInt32LE(table.baseSize, offset + 12);
//     this.#records.writeBigUInt64LE(table.related, offset + 16);
//     this.#records.writeUInt16LE(table.slotsCount, offset + 24);
//     this.#records.writeUInt16LE(table.interfacesCount, offset + 26);
//     this.#records.writeUInt8(0, offset + 28);
//     this.#records.writeUInt8(0, offset + 29);
//     this.#records.writeUInt16LE(0, offset + 30);
//     this.#count++;
//     return true;
//   }
//
//   at(index: number): MethodTable | undefined {
//     if (!Number.isSafeInteger(index) || index < 0 || index >= this.#count)
//       return undefined;
//     const offset = index * METHOD_TABLE_RECORD_BYTES;
//     return {
//       address: this.#records.readBigUInt64LE(offset),
//       flags: this.#records.readUInt32LE(offset + 8),
//       baseSize: this.#records.readUInt32LE(offset + 12),
//       related: this.#records.readBigUInt64LE(offset + 16),
//       slotsCount: this.#records.readUInt16LE(offset + 24),
//       interfacesCount: this.#records.readUInt16LE(offset + 26),
//     };
//   }
//
//   isIncluded(index: number): boolean {
//     return (
//       index >= 0 &&
//       index < this.#count &&
//       this.#records.readUInt8(index * METHOD_TABLE_RECORD_BYTES + 28) !== 0
//     );
//   }
//
//   include(index: number): void {
//     if (!this.isIncluded(index)) {
//       this.#records.writeUInt8(1, index * METHOD_TABLE_RECORD_BYTES + 28);
//       this.#includedCount++;
//     }
//   }
//
//   find(address: bigint, budget: NativeAotParserBudget): number {
//     let low = 0;
//     let high = this.#count;
//     while (low < high) {
//       if (!budget.consumeWork(8)) return -1;
//       const middle = low + ((high - low) >>> 1);
//       const record = middle * METHOD_TABLE_RECORD_BYTES;
//       const candidate = this.#records.readBigUInt64LE(record);
//       if (candidate < address) low = middle + 1;
//       else high = middle;
//     }
//     return low < this.#count &&
//       this.#records.readBigUInt64LE(low * METHOD_TABLE_RECORD_BYTES) === address
//       ? low
//       : -1;
//   }
//
//   forEach(callback: (table: MethodTable, index: number) => void): void {
//     for (let index = 0; index < this.#count; index++) {
//       const table = this.at(index);
//       if (table !== undefined) callback(table, index);
//     }
//   }
//
//   forEachIncluded(callback: (table: MethodTable, index: number) => void): void {
//     for (let index = 0; index < this.#count; index++) {
//       if (!this.isIncluded(index)) continue;
//       const table = this.at(index);
//       if (table !== undefined) callback(table, index);
//     }
//   }
//
//   #ensureCapacity(requiredRecords: number): boolean {
//     const requiredBytes = requiredRecords * METHOD_TABLE_RECORD_BYTES;
//     if (requiredBytes <= this.#records.byteLength) return true;
//     const capacityBytes = Math.min(
//       this.budget.limits.workingMemoryBytes,
//       Math.max(requiredBytes, this.#records.byteLength * 2 || 4096),
//     );
//     if (
//       capacityBytes < requiredBytes ||
//       !this.budget.reserveWorkingMemory(capacityBytes)
//     )
//       return false;
//     const expanded = Buffer.allocUnsafe(capacityBytes);
//     this.#records.copy(expanded, 0, 0, this.#count * METHOD_TABLE_RECORD_BYTES);
//     this.budget.releaseWorkingMemory(this.#records.byteLength);
//     this.#records = expanded;
//     return true;
//   }
// }
// type ImageOverlay = {
//   readonly base: bigint;
//   readonly sizeBytes: number;
//   readonly sha256: string;
//   readonly bytes: Buffer;
// };
// export type NativeAotType = {
//   readonly address: string;
//   readonly type: null;
// };
// export type NativeAotString = {
//   readonly address: string;
//   readonly value: string;
// };
// export type NativeAotReport = {
//   readonly format: "dotnet-nativeaot";
//   readonly status: "complete" | "partial" | "not_applicable";
//   readonly reason: string | null;
//   readonly analysis_artifact_sha256: string;
//   readonly analysis_mode: "read-only-derived-overlay";
//   readonly header_address: string | null;
//   readonly discovery: "signature-heuristic" | null;
//   readonly format_major: number | null;
//   readonly format_minor: number | null;
//   readonly method_tables: number;
//   readonly types: readonly NativeAotType[];
//   readonly frozen_strings: readonly NativeAotString[];
//   readonly truncated?: boolean;
//   readonly types_omitted?: number;
//   readonly frozen_strings_omitted?: number;
//   readonly output_budget_bytes?: number;
//   readonly derived_overlay: {
//     readonly address: string;
//     readonly size_bytes: number;
//     readonly sha256: string;
//   } | null;
//   readonly derived_memory: null;
//   readonly coverage: {
//     readonly pointer_candidates_examined: number;
//     readonly pointer_slots_examined?: number;
//     readonly scan_bytes_examined?: number;
//     readonly scan_bytes_omitted?: number;
//     readonly rtr_signature_scan_bytes_examined?: number;
//     readonly rtr_signature_scan_bytes_omitted?: number;
//     readonly method_table_validation_items_examined?: number;
//     readonly work_units_examined?: number;
//     readonly method_tables_recovered: number;
//     readonly frozen_string_candidates: number;
//     readonly frozen_scan_bytes_examined?: number;
//     readonly frozen_scan_bytes_omitted?: number;
//     readonly frozen_string_data_bytes_examined?: number;
//     readonly source_bytes_examined?: number;
//     readonly source_bytes_omitted?: number;
//     readonly work_budget_units?: number;
//     readonly source_byte_budget_bytes?: number;
//     readonly working_memory_budget_bytes?: number;
//     readonly working_memory_bytes_peak?: number;
//     readonly truncation_reason?:
//       | "source-byte-budget"
//       | "work-unit-budget"
//       | "working-memory-budget"
//       | "response-budget";
//     readonly basis:
//       | "raw-image-pointer-scan"
//       | "raw-image-and-rehydrated-pointer-scan"
//       | "unsupported-layout"
//       | "no-rtr-header";
//   };
//   readonly diagnostics: readonly string[];
//   readonly limitations: readonly string[];
// };
// export type NativeAotPeResult = {
//   readonly summary: NativeAotReport;
//   readonly readTypeDetail: (
//     address: string,
//     maximumBytes: number,
//   ) => NativeMetadataRecovery | undefined;
// };
//
// export const nativeAotSnapshotOverCapacity = (
//   sha256: string,
//   sourceBytesAtLeast: number,
//   maximumSummaryBytes: number,
//   limits: NativeAotParserLimits = DEFAULT_NATIVE_AOT_PARSER_LIMITS,
// ): NativeAotReport =>
//   assertNativeAotReportFits(
//     {
//       format: "dotnet-nativeaot",
//       status: "partial",
//       reason:
//         "The captured PE exceeds the read-only NativeAOT snapshot byte budget.",
//       analysis_artifact_sha256: sha256,
//       analysis_mode: "read-only-derived-overlay",
//       header_address: null,
//       discovery: null,
//       format_major: null,
//       format_minor: null,
//       method_tables: 0,
//       types: [],
//       frozen_strings: [],
//       truncated: true,
//       types_omitted: 0,
//       frozen_strings_omitted: 0,
//       output_budget_bytes: maximumSummaryBytes,
//       derived_overlay: null,
//       derived_memory: null,
//       coverage: {
//         pointer_candidates_examined: 0,
//         scan_bytes_examined: 0,
//         scan_bytes_omitted: 0,
//         method_table_validation_items_examined: 0,
//         work_units_examined: 0,
//         method_tables_recovered: 0,
//         frozen_string_candidates: 0,
//         frozen_scan_bytes_examined: 0,
//         frozen_scan_bytes_omitted: 0,
//         frozen_string_data_bytes_examined: 0,
//         source_bytes_examined: 0,
//         work_budget_units: limits.workUnits,
//         source_byte_budget_bytes: limits.sourceBytes,
//         working_memory_budget_bytes: limits.workingMemoryBytes,
//         working_memory_bytes_peak: 0,
//         truncation_reason: "source-byte-budget",
//         basis: "unsupported-layout",
//       },
//       diagnostics: [
//         `The private snapshot was observed to contain at least ${sourceBytesAtLeast} bytes, above the ${limits.sourceBytes} byte NativeAOT source limit; no parser snapshot was admitted.`,
//       ],
//       limitations: [
//         "NativeAOT metadata was not inspected because the captured snapshot exceeded the local source-byte budget.",
//         "The artifact digest identifies the selected target; no metadata facts are inferred from the omitted snapshot.",
//         "No Ghidra database types, labels, functions, or bytes are created or changed.",
//       ],
//     },
//     maximumSummaryBytes,
//   );
//
// const assertNativeAotReportFits = (
//   report: NativeAotReport,
//   maximumBytes: number,
// ): NativeAotReport => {
//   if (
//     !Number.isSafeInteger(maximumBytes) ||
//     maximumBytes < 0 ||
//     Buffer.byteLength(JSON.stringify(report)) > maximumBytes
//   )
//     throw new Error(
//       "NativeAOT report-byte budget is too small for the minimum truthful report",
//     );
//   return report;
// };
//
// const parsedSummary = (
//   summary: NativeAotReport,
//   maximumBytes: number,
// ): NativeAotPeResult => ({
//   summary: assertNativeAotReportFits(summary, maximumBytes),
//   readTypeDetail: () => undefined,
// });
//
// class PeImage {
//   readonly imageBase: bigint;
//   readonly sizeOfImage: number;
//   readonly sections: readonly Section[];
//   readonly #bytes: Buffer;
//   readonly #sizeOfHeaders: number;
//   readonly #machine: number;
//   readonly #overlays: ImageOverlay[] = [];
//   #budget: NativeAotParserBudget | undefined;
//
//   constructor(bytes: Buffer) {
//     this.#bytes = bytes;
//     if (bytes.length < 0x40 || bytes.toString("latin1", 0, 2) !== "MZ")
//       throw new Error("Not a PE image");
//     const peOffset = this.#u32(0x3c);
//     this.#range(peOffset, 24);
//     if (bytes.toString("latin1", peOffset, peOffset + 4) !== "PE\0\0")
//       throw new Error("Invalid PE signature");
//     this.#machine = this.#u16(peOffset + 4);
//     const count = this.#u16(peOffset + 6);
//     // Microsoft documents a 96-section Windows image-loader limit. This
//     // parser accepts executable PE images, not arbitrary COFF object files.
//     if (count > 96)
//       throw new Error("PE image exceeds the Windows 96-section limit");
//     const optionalSize = this.#u16(peOffset + 20);
//     const optional = peOffset + 24;
//     this.#range(optional, optionalSize);
//     const magic = this.#u16(optional);
//     if (magic !== 0x20b || this.#machine !== 0x8664)
//       throw new Error("Only x64 PE32+ is supported");
//     this.imageBase = this.#u64(optional + 24);
//     this.sizeOfImage = this.#u32(optional + 56);
//     this.#sizeOfHeaders = this.#u32(optional + 60);
//     if (count < 1 || this.sizeOfImage === 0)
//       throw new Error("Unsupported PE image extent");
//     const sectionOffset = optional + optionalSize;
//     this.#range(sectionOffset, count * 40);
//     this.sections = Array.from({ length: count }, (_, index) => {
//       const p = sectionOffset + index * 40;
//       const name = bytes.toString("ascii", p, p + 8).replace(/\0.*$/u, "");
//       return {
//         name,
//         virtualSize: this.#u32(p + 8),
//         rva: this.#u32(p + 12),
//         rawSize: this.#u32(p + 16),
//         rawOffset: this.#u32(p + 20),
//         characteristics: this.#u32(p + 36),
//       };
//     });
//     for (const section of this.sections) {
//       this.#range(section.rawOffset, section.rawSize);
//       if (section.rva + virtualExtent(section) > this.sizeOfImage)
//         throw new Error("PE section exceeds the declared image extent");
//     }
//   }
//
//   addressForRva(rva: number): bigint {
//     return this.imageBase + BigInt(rva);
//   }
//   setBudget(budget: NativeAotParserBudget): void {
//     this.#budget = budget;
//   }
//   hasImageRange(start: bigint, end: bigint): boolean {
//     return (
//       end >= start &&
//       start >= this.imageBase &&
//       end - this.imageBase <= BigInt(this.sizeOfImage)
//     );
//   }
//   read(address: bigint, size: number): Buffer | null {
//     if (address < this.imageBase || !Number.isSafeInteger(size) || size < 0)
//       return null;
//     for (const overlay of this.#overlays) {
//       const offset = address - overlay.base;
//       if (offset >= 0n && offset <= BigInt(overlay.sizeBytes - size)) {
//         const start = Number(offset);
export const _l = 450;
