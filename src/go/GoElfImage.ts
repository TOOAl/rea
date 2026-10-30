import {
  declaredFileRange,
  GoBinaryFormatFailure,
  GoBinaryReader,
  mappedFileOffset,
  type GoBinaryContainer,
  type GoFileMapping,
  type GoImageSection,
  type GoZeroFillMapping,
} from "./GoBinaryContainer.js";
import { readElfFixedHeader } from "../domain/elfFixedHeader.js";

/** Ghidra: ELF 확장 헤더 검증 블록 */
const validateElfHeaderTables = (input: {
  readonly headerSize: number;
  readonly phOffset: bigint;
  readonly shOffset: bigint;
  readonly phCount: number;
  readonly shCount: number;
  readonly namesIndex: number;
}): void => {
  const { headerSize, phOffset, shOffset, phCount, shCount, namesIndex } = input;
  if (
    (phCount !== 0 && phOffset < BigInt(headerSize)) ||
    (shOffset !== 0n && shOffset < BigInt(headerSize))
  )
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF header table overlaps the native header",
    );
  if (
    shOffset === 0n &&
    (shCount !== 0 || namesIndex !== 0 || phCount === 0xffff)
  ) {
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF section table is missing",
    );
  }
};

/** Ghidra: ELF 확장 카운트 해석 블록 */
const resolveElfExtendedCounts = (input: {
  readonly reader: GoBinaryReader;
  readonly bits: 32 | 64;
  readonly wide: boolean;
  readonly shWidth: number;
  readonly shOffset: bigint;
  readonly phCount: number;
  readonly shCount: number;
  readonly namesIndex: number;
}): { phCount: number; shCount: number; namesIndex: number } => {
  const { reader, bits, wide, shWidth, shOffset, phCount, shCount, namesIndex } = input;
  if (
    shOffset === 0n ||
    (shCount !== 0 && phCount !== 0xffff && namesIndex !== 0xffff)
  )
    return { phCount, shCount, namesIndex };
  if (shWidth < (wide ? 64 : 40))
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF extended section header width is invalid",
    );
  const first = reader.fileRange(
    shOffset,
    BigInt(shWidth),
    "ELF section zero",
  ).offset;
  if (reader.u32(first + 4) !== 0)
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF initial section for extended numbering must have SHT_NULL type",
    );
  let resolvedPhCount = phCount;
  let resolvedShCount = shCount;
  let resolvedNamesIndex = namesIndex;
  if (shCount === 0) {
    const count = reader.word(first + (wide ? 32 : 20), bits);
    if (count < 0xff00n || count > BigInt(Number.MAX_SAFE_INTEGER))
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF extended section count is invalid",
      );
    resolvedShCount = Number(count);
  }
  if (phCount === 0xffff) {
    resolvedPhCount = reader.u32(first + (wide ? 44 : 28));
    if (resolvedPhCount < 0xffff)
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF extended program count is below its reserved range",
      );
  }
  if (namesIndex === 0xffff) {
    resolvedNamesIndex = reader.u32(first + (wide ? 40 : 24));
    if (resolvedNamesIndex < 0xff00)
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF extended section name index is below its reserved range",
      );
  }
  return { phCount: resolvedPhCount, shCount: resolvedShCount, namesIndex: resolvedNamesIndex };
};

/** Ghidra: PT_LOAD 세그먼트 수집 블록 */
const collectLoadSegments = (
  reader: GoBinaryReader,
  bits: 32 | 64,
  wide: boolean,
  phStart: number,
  phCount: number,
  phWidth: number,
): { mappings: GoFileMapping[]; zeroFills: GoZeroFillMapping[]; fallback: GoFileMapping[] } => {
  const mappings: GoFileMapping[] = [];
  const zeroFills: GoZeroFillMapping[] = [];
  const fallback: GoFileMapping[] = [];
  for (let index = 0; index < phCount; index++) {
    const offset = phStart + index * phWidth;
    if (reader.u32(offset) !== 1) continue;
    const flags = reader.u32(offset + (wide ? 4 : 24));
    const fileOffset = reader.word(offset + (wide ? 8 : 4), bits);
    const address = reader.word(offset + (wide ? 16 : 8), bits);
    const size = reader.word(offset + (wide ? 32 : 16), bits);
    const memorySize = reader.word(offset + (wide ? 40 : 20), bits);
    if (size > memorySize || address + memorySize > 1n << BigInt(bits))
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF load segment sizes or addresses are invalid",
      );
    const mapping = {
      ...(size === 0n
        ? { offset: 0, size: 0 }
        : reader.fileRange(fileOffset, size, "ELF load segment")),
      address,
    };
    if (mapping.size !== 0) mappings.push(mapping);
    if (memorySize > size)
      zeroFills.push({ address: address + size, size: memorySize - size });
    if (mapping.size !== 0 && (flags & 3) === 2) fallback.push(mapping);
  }
  return { mappings, zeroFills, fallback };
};

/** Ghidra: 섹션 헤더 및 build-info 탐색 블록 */
const resolveBuildInfoSection = (input: {
  readonly bytes: Buffer;
  readonly reader: GoBinaryReader;
  readonly bits: 32 | 64;
  readonly wide: boolean;
  readonly shOffset: bigint;
  readonly shCount: number;
  readonly shWidth: number;
  readonly namesIndex: number;
  readonly sections: GoImageSection[];
  readonly mappings: GoFileMapping[];
  readonly zeroFills: GoZeroFillMapping[];
}): GoFileMapping | null => {
  const { bytes, reader, bits, wide, shOffset, shCount, shWidth, namesIndex, sections, mappings, zeroFills } = input;
  if (shCount === 0) return null;
  if (shWidth < (wide ? 64 : 40) || namesIndex >= shCount)
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF section width or name-table index is invalid",
    );
  const shStart = reader.table(
    shOffset,
    shCount,
    shWidth,
    "ELF section headers",
  );
  if (namesIndex === 0) return null;
  const namesHeader = shStart + namesIndex * shWidth;
  if (reader.u32(namesHeader + 4) !== 3)
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF section name table is not a string table",
    );
  const names = reader.fileRange(
    reader.word(namesHeader + (wide ? 24 : 16), bits),
    reader.word(namesHeader + (wide ? 32 : 20), bits),
    "ELF section names",
  );
  let search: GoFileMapping | null = null;
  for (let index = 0; index < shCount; index++) {
    const offset = shStart + index * shWidth;
    const nameOffset = reader.u32(offset);
    if (nameOffset >= names.size)
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF section name offset is outside its string table",
      );
    recordElfSection(sections, {
      bytes,
      names,
      nameOffset,
      reader,
      bits,
      wide,
      header: offset,
    });
    const expectedName = Buffer.from(".go.buildinfo\0");
    if (
      expectedName.length > names.size - nameOffset ||
      !bytes
        .subarray(
          names.offset + nameOffset,
          names.offset + nameOffset + expectedName.length,
        )
        .equals(expectedName)
    )
      continue;
    if (search !== null)
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF contains ambiguous build-info sections",
      );
    if (reader.u32(offset + 4) !== 1)
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF build-info section is not file-backed data",
      );
    if ((reader.word(offset + 8, bits) & 0x800n) !== 0n)
      throw new GoBinaryFormatFailure(
        "unsupported",
        "Compressed ELF build-info sections are unsupported",
      );
    const address = reader.word(offset + (wide ? 16 : 12), bits);
    search = {
      ...reader.fileRange(
        reader.word(offset + (wide ? 24 : 16), bits),
        reader.word(offset + (wide ? 32 : 20), bits),
        "ELF build-info section",
      ),
      address,
    };
    if (
      mappedFileOffset(mappings, address, search.size, zeroFills) !==
      search.offset
    )
      throw new GoBinaryFormatFailure(
        "malformed",
        "ELF build-info section disagrees with its load mapping",
      );
  }
  return search;
};

/** Read ELF build-info sections and file-backed program mappings. */
export const readGoElfImage = (bytes: Buffer): GoBinaryContainer => {
  const fixedHeader = readElfFixedHeader(bytes);
  if (!fixedHeader.ok)
    throw new GoBinaryFormatFailure("malformed", fixedHeader.error);
  const { elfClass: bits, headerSize } = fixedHeader.value;
  const reader = new GoBinaryReader(
    bytes,
    fixedHeader.value.byteOrder === "little",
  );
  const wide = bits === 64;
  const phOffset = reader.word(wide ? 32 : 28, bits);
  const shOffset = reader.word(wide ? 40 : 32, bits);
  const phWidth = reader.u16(wide ? 54 : 42);
  const shWidth = reader.u16(wide ? 58 : 46);
  let phCount = reader.u16(wide ? 56 : 44);
  let shCount = reader.u16(wide ? 60 : 48);
  let namesIndex = reader.u16(wide ? 62 : 50);
  validateElfHeaderTables({ headerSize, phOffset, shOffset, phCount, shCount, namesIndex });
  const extended = resolveElfExtendedCounts({ reader, bits, wide, shWidth, shOffset, phCount, shCount, namesIndex });
  phCount = extended.phCount;
  shCount = extended.shCount;
  namesIndex = extended.namesIndex;
  if (phCount !== 0 && phWidth < (wide ? 56 : 32))
    throw new GoBinaryFormatFailure(
      "malformed",
      "ELF program header width is invalid",
    );
  const phStart = reader.table(
    phOffset,
    phCount,
    phWidth,
    "ELF program headers",
  );
  const load = collectLoadSegments(reader, bits, wide, phStart, phCount, phWidth);
  const sections: GoImageSection[] = [];
  const search = resolveBuildInfoSection({ bytes, reader, bits, wide, shOffset, shCount, shWidth, namesIndex, sections, mappings: load.mappings, zeroFills: load.zeroFills });
  const machine = reader.u16(18);
  return {
    format: "elf",
    architecture: elfArchitecture(machine),
    bits,
    byte_order: reader.little ? "little" : "big",
    mappings: load.mappings,
    zero_fills: load.zeroFills,
    sections,
    search: search === null ? load.fallback : [search],
  };
};

const recordElfSection = (
  sections: GoImageSection[],
  input: {
    readonly bytes: Buffer;
    readonly names: { readonly offset: number; readonly size: number };
    readonly nameOffset: number;
    readonly reader: GoBinaryReader;
    readonly bits: 32 | 64;
    readonly wide: boolean;
    readonly header: number;
  },
): void => {
  const decoded = elfSectionName(input.bytes, input.names, input.nameOffset);
  const header = {
    reader: input.reader,
    bits: input.bits,
    wide: input.wide,
    header: input.header,
  };
  switch (decoded.status) {
    case "named":
      sections.push(elfImageSection({ ...header, name: decoded.name }));
      return;
    case "truncated": {
      const section = elfImageSection({ ...header, name: "" });
      if (section.read_only) sections.push(section);
      return;
    }
    case "unnamed":
      return;
    default: {
      const unreachable: never = decoded;
      return unreachable;
    }
  }
};

const elfSectionName = (
  bytes: Buffer,
  names: { readonly offset: number; readonly size: number },
  nameOffset: number,
):
  | { readonly status: "named"; readonly name: string }
  | { readonly status: "unnamed" }
  | { readonly status: "truncated" } => {
  const start = names.offset + nameOffset;
  const limit = Math.min(start + 64, names.offset + names.size);
  const nul = bytes.subarray(start, limit).indexOf(0);
  if (nul === 0) return { status: "unnamed" };
  if (nul < 0) return { status: "truncated" };
  return {
    status: "named",
    name: bytes.toString("latin1", start, start + nul),
  };
};

const elfImageSection = ({
  reader,
  bits,
  wide,
  header,
  name,
}: {
  readonly reader: GoBinaryReader;
  readonly bits: 32 | 64;
  readonly wide: boolean;
  readonly header: number;
  readonly name: string;
}): GoImageSection => {
  const type = reader.u32(header + 4);
  const flags = reader.word(header + 8, bits);
  const declared = declaredFileRange(
    reader.bytes.length,
    reader.word(header + (wide ? 24 : 16), bits),
    reader.word(header + (wide ? 32 : 20), bits),
  );
  const range =
    type === SHT_NOBITS ? { ...declared, file_backed: false } : declared;
  const compressed = (flags & 0x800n) !== 0n;
  const readOnly =
    type === 1 &&
    range.file_backed &&
    !compressed &&
    (flags & 1n) === 0n &&
    (flags & 4n) === 0n &&
    (flags & 2n) !== 0n;
  return { name, ...range, read_only: readOnly, compressed };
};

const SHT_NOBITS = 8;

const elfArchitecture = (machine: number): string => {
  const names = new Map([
    [3, "386"],
    [8, "mips"],
    [20, "ppc"],
    [21, "ppc64"],
    [22, "s390"],
    [40, "arm"],
    [62, "amd64"],
    [183, "arm64"],
    [243, "riscv"],
    [258, "loongarch"],
  ]);
  return names.get(machine) ?? `elf-machine-${machine}`;
};
