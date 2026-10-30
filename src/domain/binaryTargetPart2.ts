import type {
  BinaryArchitecture,
  ElfFamilyMetadata,
  HeaderArchitecture,
  MipsElfMetadata,
  PeCodeViewRecord,
  RiscvElfMetadata,
  PowerPcElfMetadata,
  UniversalMachOSlice,
} from "./binaryTargetTypes.js";
import { err, ok, type Result } from "./result.js";
import { readElfFixedHeader } from "./elfFixedHeader.js";
import { observeMzWindowsHeader, parseDosMzHeader } from "./dosMz.js";
import { decodePeMachine } from "./peMachine.js";
import {
  classifyFatContainerIdentity,
  readFatContainerHeader,
} from "./apple/machoContainer.js";

/** Format and architecture facts recovered from an executable header. */

// src/domain/binaryTargetPart2.ts
export const parsePeCodeViewFromBuffer = (
  fileBytes: Buffer,
  peOffset: number,
): PeCodeViewRecord | undefined => {
  if (fileBytes.length < peOffset + 24) return undefined;
  const numberOfSections = fileBytes.readUInt16LE(peOffset + 6);
  const optionalHeaderSize = fileBytes.readUInt16LE(peOffset + 20);
  if (
    optionalHeaderSize > 4096 ||
    fileBytes.length < peOffset + 24 + optionalHeaderSize
  )
    return undefined;
  const optionalHeader = fileBytes.subarray(
    peOffset + 24,
    peOffset + 24 + optionalHeaderSize,
  );
  const debugDir = peDebugDirectoryEntry(optionalHeader);
  if (debugDir === undefined) return undefined;
  const sectionTableOffset = peOffset + 24 + optionalHeaderSize;
  const sectionTableSize = numberOfSections * 40;
  if (fileBytes.length < sectionTableOffset + sectionTableSize)
    return undefined;
  const sectionTable = fileBytes.subarray(
    sectionTableOffset,
    sectionTableOffset + sectionTableSize,
  );
  const debugFileOffset = peRvaToFileOffset(
    debugDir.debugRva,
    sectionTable,
    numberOfSections,
    debugDir.sizeOfHeaders,
    Math.min(debugDir.debugSize, 4096),
  );
  if (debugFileOffset === undefined || fileBytes.length < debugFileOffset + 28)
    return undefined;
  const maxDebugBytes = Math.min(
    debugDir.debugSize,
    fileBytes.length - debugFileOffset,
  );
  const numEntries = Math.floor(maxDebugBytes / 28);
  for (let j = 0; j < numEntries; j++) {
    const entryOffset = debugFileOffset + j * 28;
    const type = fileBytes.readUInt32LE(entryOffset + 12);
    if (type !== 2) continue; // IMAGE_DEBUG_TYPE_CODEVIEW
    const sizeOfData = fileBytes.readUInt32LE(entryOffset + 16);
    let pointerToRawData = fileBytes.readUInt32LE(entryOffset + 24);
    if (pointerToRawData === 0) {
      const addressOfRawData = fileBytes.readUInt32LE(entryOffset + 20);
      const mapped = peRvaToFileOffset(
        addressOfRawData,
        sectionTable,
        numberOfSections,
        debugDir.sizeOfHeaders,
        Math.min(sizeOfData, 4096),
      );
      if (mapped === undefined) continue;
      pointerToRawData = mapped;
    }
    if (
      sizeOfData < 16 ||
      fileBytes.length < pointerToRawData + Math.min(sizeOfData, 24)
    )
      continue;
    const codeViewData = fileBytes.subarray(
      pointerToRawData,
      Math.min(fileBytes.length, pointerToRawData + sizeOfData),
    );
    const parsed = parseCodeViewData(codeViewData, sizeOfData);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

const peManagedStatus = (
  optionalHeader: Buffer,
  architecture: BinaryArchitecture,
): Result<boolean, string> => {
  if (optionalHeader.length < 2) return err("truncated PE optional header");
  const magic = optionalHeader.readUInt16LE(0);
  const expectedMagic =
    architecture === "x86_64" || architecture === "arm64" ? 0x20b : 0x10b;
  if (magic !== expectedMagic)
    return err("PE optional-header magic does not match its architecture");
  const directoryOffset = magic === 0x20b ? 112 : 96;
  const directoryCountOffset = directoryOffset - 4;
  if (optionalHeader.length < directoryCountOffset + 4)
    return err("truncated PE optional header");
  const directoryCount = optionalHeader.readUInt32LE(directoryCountOffset);
  const requiredBytes = directoryOffset + directoryCount * 8;
  if (
    !Number.isSafeInteger(requiredBytes) ||
    requiredBytes > optionalHeader.length
  )
    return err("truncated PE data-directory table");
  if (directoryCount <= 14) return ok(false);
  const cliDirectory = directoryOffset + 14 * 8;
  return ok(
    optionalHeader.readUInt32LE(cliDirectory) !== 0 ||
      optionalHeader.readUInt32LE(cliDirectory + 4) !== 0,
  );
};

const machArchitecture = (cpu: number): HeaderArchitecture | undefined => {
  switch (cpu) {
    case 7:
      return "x86";
    case 0x01000007:
      return "x86_64";
    case 12:
      return "arm";
    case 0x0100000c:
      return "arm64";
  }
  return undefined;
};

const elfArchitecture = (
  machine: number,
): Exclude<BinaryArchitecture, "6502"> | undefined => {
  switch (machine) {
    case 3:
      return "x86";
    case 62:
      return "x86_64";
    case 8: // EM_MIPS: ISA, ABI and byte order remain separate ELF facts.
      return "mips";
    case 20: // EM_PPC; byte order and processor variant remain ELF declarations.
      return "powerpc";
    case 40:
      return "arm";
    case 183:
      return "arm64";
    case 243: // EM_RISCV: XLEN, byte order and e_flags remain separate ELF facts.
      return "riscv";
  }
  return undefined;
};
