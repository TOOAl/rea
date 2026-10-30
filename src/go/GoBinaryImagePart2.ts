import {
  GoBinaryFormatFailure,
  GoBinaryResourceFailure,
  GoBinaryReader,
  goUtf8,
  mappedFileOffset,
  isZeroFilledSpan,
  type GoBinaryContainer,
  type GoFileMapping,
} from "./GoBinaryContainer.js";
import {
  classifyFatContainerIdentity,
  readFatContainerHeader,
} from "../domain/apple/machoContainer.js";
import { readGoElfImage } from "./GoElfImage.js";
import { readGoMachoImage } from "./GoMachoImage.js";
import { readGoPeImage } from "./GoPeImage.js";

const observedText = (bytes: Buffer): string | null => {
  try {
    return goUtf8(bytes, "Go build string");
  } catch (cause) {
    if (cause instanceof GoBinaryFormatFailure) return null;
    throw cause;
  }
};

interface LocatedString {
  readonly bytes: Buffer;
  readonly location: GoStringLocation;
}

/** Identify an ELF, PE, or thin Mach-O image and its named file sections. */
export const readGoBinaryContainer = (bytes: Buffer): GoBinaryContainer => {
  if (bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])))
    return readGoElfImage(bytes);
  if (bytes.subarray(0, 2).equals(Buffer.from("MZ")))
    return readGoPeImage(bytes);
  if (bytes.length >= 4) {
    const magic = bytes.readUInt32BE();
    if ([0xcafebabe, 0xcafebabf, 0xbebafeca, 0xbfbafeca].includes(magic)) {
      const fatHeader = readFatContainerHeader(bytes, bytes.length);
      if (fatHeader.state === "malformed")
        throw new GoBinaryFormatFailure("malformed", fatHeader.reason);
      const identity =
        fatHeader.state === "parsed"
          ? classifyFatContainerIdentity(fatHeader, (offset) => {
              if (offset >= bytes.length) return undefined;
              if (offset + 4 > bytes.length) return null;
              return bytes.readUInt32BE(offset);
            })
          : undefined;
      // An invalid FAT-shaped table is not proof of a Mach-O container: JVM
      // constant-pool bytes can share both the magic and a known CPU value.
      const confirmedFatMachO = identity?.state === "mach-o";
      if (confirmedFatMachO)
        throw new GoBinaryFormatFailure(
          "unsupported",
          "Universal/fat Mach-O containers require selecting a thin slice",
        );
    }
    if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe].includes(magic))
      return readGoMachoImage(bytes);
  }
  throw new GoBinaryFormatFailure(
    "unsupported",
    "Only ELF, PE, and thin Mach-O native images are supported",
  );
};

const findHeader = (bytes: Buffer, search: GoFileMapping): number | null => {
  if (search.size === 0) return null;
  const end = search.offset + search.size;
  const selected = bytes.subarray(search.offset, end);
  let offset = Number((16n - (search.address % 16n)) % 16n);
  while (offset < selected.length) {
    const match = selected.indexOf(MAGIC, offset);
    if (match < 0) return null;
    const candidate = search.offset + match;
    const address = search.address + BigInt(candidate - search.offset);
    if (address % 16n === 0n) {
      if (end - candidate < 32)
        throw new GoBinaryFormatFailure(
          "malformed",
          "Go build-info header is truncated",
        );
      return candidate;
    }
    offset = match + 1;
  }
  return null;
};

const readInlineString = (
  reader: GoBinaryReader,
  offset: number,
  remaining: number,
): LocatedString => {
  let length = 0n;
  for (let index = 0; index < 10; index++) {
    if (index >= remaining)
      throw new GoBinaryFormatFailure(
        "malformed",
        "Go build-info varint is truncated",
      );
    const byte = reader.bytes[offset + index] ?? 0;
    if (index === 9 && byte > 1)
      throw new GoBinaryFormatFailure(
        "malformed",
        "Go build-info varint overflows 64 bits",
      );
    length |= BigInt(byte & 127) << BigInt(index * 7);
    if ((byte & 128) === 0) {
      if (length > BigInt(MAX_BUILD_INFO_BYTES))
        throw new GoBinaryResourceFailure(
          "build-info",
          MAX_BUILD_INFO_BYTES,
          "Go build-info string length exceeds the 1 MiB limit",
        );
      const size = Number(length);
      if (size > remaining - index - 1)
        throw new GoBinaryFormatFailure(
          "malformed",
          "Go build-info string range is truncated",
        );
      const start = offset + index + 1;
      return {
        bytes: reader.range(start, size, "Go build-info string"),
        location: { offset: start, bytes: size },
      };
    }
  }
  throw new GoBinaryFormatFailure(
    "malformed",
    "Go build-info varint is unterminated",
  );
};

const readPointerString = (
  reader: GoBinaryReader,
  container: GoBinaryContainer,
  address: bigint,
): LocatedString => {
  const { mappings, zero_fills: zeroFills, bits } = container;
  const width = bits / 8;
  const header = mappedFileOffset(mappings, address, width * 2, zeroFills);
  const valueAddress = reader.word(header, bits);
  const length = reader.word(header + width, bits);
  if (length > BigInt(MAX_BUILD_INFO_BYTES))
    throw new GoBinaryResourceFailure(
      "build-info",
      MAX_BUILD_INFO_BYTES,
      "Go build-info pointer string length exceeds the 1 MiB limit",
    );
  const size = Number(length);
  // Zero-length Go strings may carry a zero data pointer.
  const offset =
    size === 0 && valueAddress === 0n
      ? header
      : mappedFileOffset(mappings, valueAddress, size, zeroFills);
  return {
    bytes: reader.range(offset, size, "Go build-info pointer string"),
    location: { offset, bytes: size },
  };
};

const readOptionalModuleString = (
  reader: GoBinaryReader,
  container: GoBinaryContainer,
  address: bigint,
  pointerField: number,
): LocatedString =>
  isZeroFilledSpan(
    container.mappings,
    container.zero_fills,
    address,
    (container.bits / 8) * 2,
  )
    ? { bytes: Buffer.alloc(0), location: { offset: pointerField, bytes: 0 } }
    : readPointerString(reader, container, address);
