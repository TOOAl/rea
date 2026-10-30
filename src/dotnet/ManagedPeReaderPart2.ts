import type { ManagedParseIssue } from "../domain/managed/managedArtifact.js";
import { decodePeMachine } from "../domain/peMachine.js";
import {
  managedFailure,
  ManagedReaderFailure,
} from "./ManagedReaderFailure.js";

const readCliHeader = (
  bytes: Buffer,
  sections: readonly PeSection[],
  directory: PeDataDirectory,
): ManagedCliHeader => {
  if (directory.size < 72)
    throw managedFailure(
      "invalid-cli-header",
      "cli.header",
      "CLI header is shorter than the required 72 bytes",
    );
  const offset = mapRva({
    bytes,
    sections,
    rva: directory.rva,
    size: 72,
    scope: "cli.header",
  });
  const headerSize = bytes.readUInt32LE(offset);
  if (headerSize < 72 || headerSize > directory.size)
    throw managedFailure(
      "invalid-cli-header",
      "cli.header",
      "CLI header size is outside its PE data directory",
      offset,
    );
  const metadata = readDirectory(bytes, offset + 8);
  if (metadata.rva === 0 || metadata.size === 0)
    throw managedFailure(
      "invalid-cli-header",
      "cli.metadata",
      "CLI metadata directory is absent",
      offset + 8,
    );
  const flags = bytes.readUInt32LE(offset + 16);
  const managedNativeHeader = readDirectory(bytes, offset + 64);
  let readyToRunSignature = false;
  if (managedNativeHeader.rva !== 0 && managedNativeHeader.size >= 4) {
    const nativeOffset = mapRva({
      bytes,
      sections,
      rva: managedNativeHeader.rva,
      size: 4,
      scope: "cli.managed-native-header",
    });
    readyToRunSignature = bytes.readUInt32LE(nativeOffset) === 0x0052_5452;
  }
  return {
    headerOffset: offset,
    headerSize,
    runtimeMajor: bytes.readUInt16LE(offset + 4),
    runtimeMinor: bytes.readUInt16LE(offset + 6),
    metadata,
    flags,
    entryPoint: bytes.readUInt32LE(offset + 20),
    resources: readDirectory(bytes, offset + 24),
    strongName: readDirectory(bytes, offset + 32),
    managedNativeHeader,
    readyToRunSignature,
  };
};

const readCoffHeader = (bytes: Buffer): CoffHeader => {
  const peOffset = bytes.readUInt32LE(0x3c);
  requireRange(bytes, peOffset, 24, "pe.coff-header");
  if (bytes.readUInt32LE(peOffset) !== 0x0000_4550)
    throw managedFailure(
      "invalid-directory",
      "pe.signature",
      "PE signature is invalid",
      peOffset,
    );
  const coff = peOffset + 4;
  const machine = bytes.readUInt16LE(coff);
  const sectionCount = bytes.readUInt16LE(coff + 2);
  if (sectionCount === 0)
    throw managedFailure(
      "invalid-directory",
      "pe.sections",
      "PE section count must be positive",
      coff + 2,
    );
  const optionalSize = bytes.readUInt16LE(coff + 16);
  const characteristics = bytes.readUInt16LE(coff + 18);
  return { coff, machine, sectionCount, optionalSize, characteristics };
};

const readOptionalHeader = (
  bytes: Buffer,
  coff: CoffHeader,
): OptionalHeader => {
  const optionalOffset = coff.coff + 20;
  requireRange(bytes, optionalOffset, coff.optionalSize, "pe.optional-header");
  if (coff.optionalSize < 96)
    throw managedFailure(
      "invalid-directory",
      "pe.optional-header",
      "PE optional header is too short",
      optionalOffset,
    );
  const magic = bytes.readUInt16LE(optionalOffset);
  const optionalHeader =
    magic === 0x010b ? "pe32" : magic === 0x020b ? "pe32-plus" : undefined;
  if (optionalHeader === undefined)
    throw managedFailure(
      "invalid-directory",
      "pe.optional-header",
      "PE optional header magic is unsupported",
      optionalOffset,
    );
  return {
    optionalOffset,
    optionalHeader,
    directoryCountOffset:
      optionalOffset + (optionalHeader === "pe32" ? 92 : 108),
    directoryOffset: optionalOffset + (optionalHeader === "pe32" ? 96 : 112),
  };
};

const readSections = (
  bytes: Buffer,
  coff: CoffHeader,
  optional: OptionalHeader,
): readonly PeSection[] => {
  const sectionOffset = add(
    optional.optionalOffset,
    coff.optionalSize,
    "pe.sections",
  );
  requireRange(bytes, sectionOffset, coff.sectionCount * 40, "pe.sections");
  const sections: PeSection[] = [];
  for (let index = 0; index < coff.sectionCount; index += 1) {
    const offset = sectionOffset + index * 40;
    const section = {
      virtualSize: bytes.readUInt32LE(offset + 8),
      virtualAddress: bytes.readUInt32LE(offset + 12),
      rawSize: bytes.readUInt32LE(offset + 16),
      rawOffset: bytes.readUInt32LE(offset + 20),
    };
    if (section.rawSize > 0)
      requireRange(
        bytes,
        section.rawOffset,
        section.rawSize,
        "pe.section-data",
      );
    sections.push(section);
  }
  return sections;
};

const readCliDirectory = (
  bytes: Buffer,
  coff: CoffHeader,
  optional: OptionalHeader,
): CliDirectoryRead => {
  const countOffset = optional.directoryCountOffset - optional.optionalOffset;
  if (countOffset + 4 > coff.optionalSize)
    return {
      kind: "unreadable",
      issue: {
        code: "invalid-directory",
        scope: "pe.optional-header",
        detail: "PE optional header does not contain its directory count",
        offset: optional.directoryCountOffset,
      },
    };
  const directoryCount = bytes.readUInt32LE(optional.directoryCountOffset);
  if (directoryCount <= 14) return { kind: "absent" };
  const availableDirectoryCount = Math.floor(
    (coff.optionalSize - (optional.directoryOffset - optional.optionalOffset)) /
      8,
  );
  if (availableDirectoryCount < 15)
    return {
      kind: "unreadable",
      issue: {
        code: "invalid-directory",
        scope: "pe.data-directories",
        detail: "PE data-directory count exceeds the optional-header extent",
        offset: optional.directoryCountOffset,
      },
    };
  const directory = readDirectory(bytes, optional.directoryOffset + 14 * 8);
  return directory.rva !== 0 || directory.size !== 0
    ? { kind: "present", directory }
    : { kind: "absent" };
};

/** Parse the file-backed PE and CLI layout without loading target code. */
export const readManagedPeLayout = (bytes: Buffer): ManagedPeLayout => {
  requireRange(bytes, 0, 64, "pe.dos-header");
  if (bytes[0] !== 0x4d || bytes[1] !== 0x5a)
    throw managedFailure(
      "invalid-directory",
      "pe.dos-header",
      "Artifact does not start with an MZ header",
      0,
    );
  const coff = readCoffHeader(bytes);
  const optional = readOptionalHeader(bytes, coff);
  const sections = readSections(bytes, coff, optional);
  const cliDirectoryRead = readCliDirectory(bytes, coff, optional);
  const cliDirectoryState = cliDirectoryRead.kind;
  let cli: ManagedCliHeader | null = null;
  let cliIssue: ManagedParseIssue | null =
    cliDirectoryRead.kind === "unreadable" ? cliDirectoryRead.issue : null;
  if (cliDirectoryRead.kind === "present") {
    try {
      cli = readCliHeader(bytes, sections, cliDirectoryRead.directory);
    } catch (cause: unknown) {
      if (!(cause instanceof ManagedReaderFailure)) throw cause;
      cliIssue = cause.issue;
    }
  }
  return {
    machine: coff.machine,
    architecture: architectureFor(coff.machine, cliDirectoryState !== "absent"),
    optionalHeader: optional.optionalHeader,
    sectionCount: coff.sectionCount,
    characteristics: coff.characteristics,
    sections,
    cli,
    cliDirectoryState,
    cliIssue,
    rvaToOffset: (rva, size, scope) =>
      mapRva({ bytes, sections, rva, size, scope }),
    rvaAvailableBytes: (rva, scope) =>
      resolveRva({ bytes, sections, rva, size: 1, scope }).available,
  };
};
