const RTR_SIGNATURE = 0x00525452;
const RTR_ROW_SIZE = 24;

// nativeAotPeTable.ts 375-759
class PeImage {
  readonly imageBase: bigint;
  readonly sizeOfImage: number;
  readonly sections: readonly Section[];
  readonly #bytes: Buffer;
  readonly #sizeOfHeaders: number;
  readonly #machine: number;
  readonly #overlays: ImageOverlay[] = [];
  #budget: NativeAotParserBudget | undefined;

  constructor(bytes: Buffer) {
    this.#bytes = bytes;
    if (bytes.length < 0x40 || bytes.toString("latin1", 0, 2) !== "MZ")
      throw new Error("Not a PE image");
    const peOffset = this.#u32(0x3c);
    this.#range(peOffset, 24);
    if (bytes.toString("latin1", peOffset, peOffset + 4) !== "PE\0\0")
      throw new Error("Invalid PE signature");
    this.#machine = this.#u16(peOffset + 4);
    const count = this.#u16(peOffset + 6);
    // Microsoft documents a 96-section Windows image-loader limit. This
    // parser accepts executable PE images, not arbitrary COFF object files.
    if (count > 96)
      throw new Error("PE image exceeds the Windows 96-section limit");
    const optionalSize = this.#u16(peOffset + 20);
    const optional = peOffset + 24;
    this.#range(optional, optionalSize);
    const magic = this.#u16(optional);
    if (magic !== 0x20b || this.#machine !== 0x8664)
      throw new Error("Only x64 PE32+ is supported");
    this.imageBase = this.#u64(optional + 24);
    this.sizeOfImage = this.#u32(optional + 56);
    this.#sizeOfHeaders = this.#u32(optional + 60);
    if (count < 1 || this.sizeOfImage === 0)
      throw new Error("Unsupported PE image extent");
    const sectionOffset = optional + optionalSize;
    this.#range(sectionOffset, count * 40);
    this.sections = Array.from({ length: count }, (_, index) => {
      const p = sectionOffset + index * 40;
      const name = bytes.toString("ascii", p, p + 8).replace(/\0.*$/u, "");
      return {
        name,
        virtualSize: this.#u32(p + 8),
        rva: this.#u32(p + 12),
        rawSize: this.#u32(p + 16),
        rawOffset: this.#u32(p + 20),
        characteristics: this.#u32(p + 36),
      };
    });
    for (const section of this.sections) {
      this.#range(section.rawOffset, section.rawSize);
      if (section.rva + virtualExtent(section) > this.sizeOfImage)
        throw new Error("PE section exceeds the declared image extent");
    }
  }

  addressForRva(rva: number): bigint {
    return this.imageBase + BigInt(rva);
  }
  setBudget(budget: NativeAotParserBudget): void {
    this.#budget = budget;
  }
  hasImageRange(start: bigint, end: bigint): boolean {
    return (
      end >= start &&
      start >= this.imageBase &&
      end - this.imageBase <= BigInt(this.sizeOfImage)
    );
  }
  read(address: bigint, size: number): Buffer | null {
    if (address < this.imageBase || !Number.isSafeInteger(size) || size < 0)
      return null;
    for (const overlay of this.#overlays) {
      const offset = address - overlay.base;
      if (offset >= 0n && offset <= BigInt(overlay.sizeBytes - size)) {
        const start = Number(offset);
        return overlay.bytes.subarray(start, start + size);
      }
    }
    const rva = address - this.imageBase;
    if (rva > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    const relative = Number(rva);
    if (relative < this.#sizeOfHeaders && relative <= this.#bytes.length - size)
      return this.#bytes.subarray(relative, relative + size);
    for (const section of this.sections) {
      if (this.#budget !== undefined && !this.#budget.consumeWork(1))
        return null;
      const extent = virtualExtent(section);
      if (relative < section.rva || relative - section.rva > extent - size)
        continue;
      const delta = relative - section.rva;
      if (delta > section.rawSize - size) return null;
      const offset = section.rawOffset + delta;
      return this.#bytes.subarray(offset, offset + size);
    }
    return null;
  }
  // This checks executable section membership, not file-backed instruction bytes.
  isExecutable(address: bigint): boolean {
    if (address < this.imageBase) return false;
    const rva = address - this.imageBase;
    for (const section of this.sections) {
      if (this.#budget !== undefined && !this.#budget.consumeWork(1))
        return false;
      if (
        (section.characteristics & 0x20000000) !== 0 &&
        rva >= BigInt(section.rva) &&
        rva < BigInt(section.rva + virtualExtent(section))
      )
        return true;
    }
    return false;
  }
  addOverlay(overlay: ImageOverlay): void {
    this.#overlays.push(overlay);
  }
  virtualBytesRemaining(address: bigint): number {
    if (address < this.imageBase) return 0;
    const rva = address - this.imageBase;
    let section: Section | undefined;
    for (const candidate of this.sections) {
      if (this.#budget !== undefined && !this.#budget.consumeWork(1)) return 0;
      if (
        rva >= BigInt(candidate.rva) &&
        rva < BigInt(candidate.rva + virtualExtent(candidate))
      ) {
        section = candidate;
        break;
      }
    }
    return section === undefined
      ? 0
      : section.rva + virtualExtent(section) - Number(rva);
  }
  #range(offset: number, size: number): void {
    if (
      !Number.isSafeInteger(offset) ||
      !Number.isSafeInteger(size) ||
      offset < 0 ||
      size < 0 ||
      offset > this.#bytes.length - size
    )
      throw new Error("PE field leaves the captured file");
  }
  #u16(offset: number): number {
    this.#range(offset, 2);
    return this.#bytes.readUInt16LE(offset);
  }
  #u32(offset: number): number {
    this.#range(offset, 4);
    return this.#bytes.readUInt32LE(offset);
  }
  #u64(offset: number): bigint {
    this.#range(offset, 8);
    return this.#bytes.readBigUInt64LE(offset);
  }
}

const hex = (value: bigint): string => `0x${value.toString(16)}`;
const readU64 = (bytes: Buffer | null, offset = 0): bigint | null =>
  bytes === null || offset > bytes.length - 8
    ? null
    : bytes.readBigUInt64LE(offset);
const readU32 = (bytes: Buffer | null, offset = 0): number | null =>
  bytes === null || offset > bytes.length - 4
    ? null
    : bytes.readUInt32LE(offset);
const notApplicable = (
  sha: string,
  reason: string,
  basis: NativeAotReport["coverage"]["basis"],
): NativeAotReport => ({
  format: "dotnet-nativeaot",
  status: "not_applicable",
  reason,
  analysis_artifact_sha256: sha,
  analysis_mode: "read-only-derived-overlay",
  header_address: null,
  discovery: null,
  format_major: null,
  format_minor: null,
  method_tables: 0,
  types: [],
  frozen_strings: [],
  derived_overlay: null,
  derived_memory: null,
  coverage: {
    pointer_candidates_examined: 0,
    method_tables_recovered: 0,
    frozen_string_candidates: 0,
    basis,
  },
  diagnostics: [],
  limitations: [
    "This report is derived from the admitted file snapshot; it does not define or annotate Ghidra database types.",
  ],
});

type RtrDirectory = {
  readonly address: bigint;
  readonly major: number;
  readonly minor: number;
  readonly sections: readonly RtrSection[];
};
type RtrDirectorySearch = {
  readonly directory: RtrDirectory | null;
  readonly matches: number;
  readonly scanBytesExamined: number;
  readonly scanBytesOmitted: number;
  readonly truncated: boolean;
};

const findDirectory = (
  image: PeImage,
  bytes: Buffer,
  budget: NativeAotParserBudget,
): RtrDirectorySearch => {
  let found: RtrDirectory | null = null;
  let matches = 0;
  let scanBytesExamined = 0;
  let totalScanBytes = 0;
  let truncated = false;
  scan: for (const section of image.sections) {
    if (
      (section.characteristics & 0x40000000) === 0 ||
      (section.characteristics & 0x20000000) !== 0
    )
      continue;
    const begin = section.rawOffset;
    const end = begin + fileBackedVirtualExtent(section);
    const first = (begin + 7) & ~7;
    const candidateBytes =
      first <= end - 16 ? (Math.floor((end - 16 - first) / 8) + 1) * 8 : 0;
    totalScanBytes += candidateBytes;
    for (let offset = first; offset <= end - 16; offset += 8) {
      if (!budget.consumeWork(8)) {
        truncated = true;
        break scan;
      }
      scanBytesExamined += 8;
      if (bytes.readUInt32LE(offset) !== RTR_SIGNATURE) continue;
      if (!budget.consumeWork(16)) {
        truncated = true;
        break scan;
      }
      const count = bytes.readUInt16LE(offset + 12);
      if (
        bytes.readUInt8(offset + 14) !== RTR_ROW_SIZE ||
        bytes.readUInt8(offset + 15) !== RTR_ROW_TYPE ||
        count < 1 ||
        offset > end - (16 + count * RTR_ROW_SIZE)
      )
        continue;
      const rows: RtrSection[] = [];
      let valid = true;
      for (let row = 0; row < count; row++) {
        if (!budget.consumeWork(RTR_ROW_SIZE)) {
          truncated = true;
          break scan;
        }
        const p = offset + 16 + row * RTR_ROW_SIZE;
        const type = bytes.readUInt32LE(p);
        const start = bytes.readBigUInt64LE(p + 8);
        const finish = bytes.readBigUInt64LE(p + 16);
        const isConsumedRange =
          type === FROZEN_OBJECT_REGION || type === DEHYDRATED_DATA;
        const isTypeManagerIndirection = type === 204;
        if (
          isConsumedRange &&
          finish !== start &&
          !image.hasImageRange(start, finish)
        ) {
          valid = false;
          break;
        }
        if (
          isTypeManagerIndirection &&
          start !== 0n &&
          image.read(start, 8) === null
        ) {
          valid = false;
          break;
        }
        if (isConsumedRange || isTypeManagerIndirection) {
          if (rows.some((existing) => existing.type === type)) {
            valid = false;
            break;
          }
          rows.push({
            type,
            flags: bytes.readUInt32LE(p + 4),
            start,
            end: finish,
          });
        }
      }
      if (valid) {
        matches++;
        if (found === null)
          found = {
            address: image.addressForRva(section.rva + offset - begin),
            major: bytes.readUInt16LE(offset + 4),
            minor: bytes.readUInt16LE(offset + 6),
            sections: rows,
          };
      }
    }
  }
  return {
    directory: found,
    matches,
    scanBytesExamined,
    scanBytesOmitted: Math.max(0, totalScanBytes - scanBytesExamined),
    truncated,
  };
};

const parseMethodTable = (
  image: PeImage,
  address: bigint,
  remainingValidationItems: number,
): MethodTable | null => {
  const header = image.read(address, 16);
  if (header === null) return null;
  const flags = header.readUInt32LE(0),
    baseSize = header.readUInt32LE(4),
    related = header.readBigUInt64LE(8);
  const counts = image.read(address + 16n, 4);
  if (counts === null) return null;
  const slotsCount = counts.readUInt16LE(0),
    interfacesCount = counts.readUInt16LE(2);
  if (baseSize > 0x10000000 || (baseSize !== 0 && baseSize < 16)) return null;
  const itemCount = slotsCount + interfacesCount;
  if (itemCount > remainingValidationItems) return null;
  const tableBytes = 24 + itemCount * 8;
  const table = image.read(address, tableBytes);
  if (table === null) return null;
  for (let slot = 0; slot < slotsCount; slot++) {
    const target = table.readBigUInt64LE(24 + slot * 8);
    if (target !== 0n && !image.isExecutable(target)) return null;
  }
  for (let index = 0; index < interfacesCount; index++) {
    const iface = table.readBigUInt64LE(24 + (slotsCount + index) * 8);
    if (iface !== 0n && image.read(iface, 20) === null) return null;
  }
  return { address, flags, baseSize, related, slotsCount, interfacesCount };
};

const readRelativePointer = (
  image: PeImage,
  address: bigint,
): bigint | null => {
  const raw = image.read(address, 4);
  return raw === null ? null : address + BigInt(raw.readInt32LE(0));
};

/** Exact UTF-8 length of JSON.stringify for a UTF-16 string without allocating it. */
const jsonUtf16StringBytes = (bytes: Buffer, codeUnits: number): number => {
  let total = 2;
  for (let index = 0; index < codeUnits; index++) {
    const value = bytes.readUInt16LE(index * 2);
    if (value === 0x22 || value === 0x5c) total += 2;
    else if (value < 0x20)
      total +=
        value === 8 ||
        value === 9 ||
        value === 10 ||
        value === 12 ||
        value === 13
          ? 2
          : 6;
    else if (value >= 0xd800 && value <= 0xdbff) {
      const next =
        index + 1 < codeUnits ? bytes.readUInt16LE((index + 1) * 2) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        total += 4;
        index++;
      } else total += 6;
    } else if (value >= 0xdc00 && value <= 0xdfff) total += 6;
    else if (value <= 0x7f) total++;
    else if (value <= 0x7ff) total += 2;
    else total += 3;
  }
  return total;
};
