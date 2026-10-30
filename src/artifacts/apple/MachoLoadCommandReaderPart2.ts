import type {
  MachoDependency,
  MachoImageFacts,
  MachoSlice,
} from "../../domain/apple/dylibResolution.js";
import { machoCpuSubtypeBase } from "../../domain/apple/machoCpuIdentity.js";
import {
  classifyFatContainerIdentity,
  readFatContainerHeader,
  validateFatSliceIdentity,
  type FatSliceDeclaration,
} from "../../domain/apple/machoContainer.js";

/** Read `length` bytes at `offset`; shorter results mean end of file. */
export type ReadAt = (offset: number, length: number) => Promise<Uint8Array>;

/** Load commands larger than this are refused instead of buffered. */
export const MAX_LOAD_COMMAND_BYTES = 16 * 1024 * 1024;
const MH_MAGIC = 0xfeedface;
const MH_MAGIC_64 = 0xfeedfacf;

// src/artifacts/apple/MachoLoadCommandReaderPart2.ts
const decodeDependency = (
  command: MachoDependency["command"],
  body: Uint8Array,
  index: number,
): MachoDependency => {
  if (body.byteLength < 24)
    throw new MachoFormatIssue(
      "malformed",
      `load command ${index} is too short for a dylib command`,
    );
  const view = viewOf(body);
  const nameOffset = view.getUint32(8, true);
  const usesFlags =
    nameOffset === 28 &&
    body.byteLength >= 28 &&
    view.getUint32(12, true) === DYLIB_USE_MARKER;
  const flags = usesFlags ? view.getUint32(24, true) : 0;
  return {
    command,
    encoding: usesFlags ? "dylib_use_command" : "dylib_command",
    install_name: commandString(body, usesFlags ? 28 : 24, index),
    weak:
      command === "LC_LOAD_WEAK_DYLIB" || (flags & DYLIB_USE_WEAK_LINK) !== 0,
    upward:
      command === "LC_LOAD_UPWARD_DYLIB" || (flags & DYLIB_USE_UPWARD) !== 0,
    reexport:
      command === "LC_REEXPORT_DYLIB" || (flags & DYLIB_USE_REEXPORT) !== 0,
    delayed_init: (flags & DYLIB_USE_DELAYED_INIT) !== 0,
    current_version: version(view.getUint32(16, true)),
    compatibility_version: version(view.getUint32(20, true)),
  };
};

/** NUL-terminated UTF-8 string at a `lc_str` offset inside one command. */
const commandString = (
  body: Uint8Array,
  minimumOffset: number,
  index: number,
): string => {
  if (body.byteLength < 12)
    throw new MachoFormatIssue(
      "malformed",
      `load command ${index} is too short to hold a string offset`,
    );
  const offset = viewOf(body).getUint32(8, true);
  if (offset < minimumOffset || offset >= body.byteLength)
    throw new MachoFormatIssue(
      "malformed",
      `load command ${index} has string offset ${offset} outside the command`,
    );
  const end = body.indexOf(0, offset);
  if (end < 0)
    throw new MachoFormatIssue(
      "malformed",
      `load command ${index} has an unterminated string`,
    );
  try {
    // lc_str contains name/path data, so a leading U+FEFF is part of its identity.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      body.subarray(offset, end),
    );
  } catch {
    throw new MachoFormatIssue(
      "malformed",
      `load command ${index} has a string that is not UTF-8`,
    );
  }
};

const readExact = async (
  readAt: ReadAt,
  offset: number,
  length: number,
  label: string,
): Promise<Uint8Array> => {
  const bytes = await readAt(offset, length);
  if (bytes.byteLength < length)
    throw new MachoFormatIssue("malformed", `${label} is truncated`);
  return bytes;
};

const CPU_ARCH_ABI64 = 0x01000000;
const CPU_ARCH_ABI64_32 = 0x02000000;
const CPU_TYPE_X86 = 7;
const CPU_TYPE_ARM = 12;
const CPU_SUBTYPE_ARM64E = 2;
const CPU_SUBTYPE_ARM64E_X1 = 12;
const CPU_SUBTYPE_X86_64_H = 8;

const architectureName = (cpuType: number, cpuSubtype: number): string => {
  const subtype = machoCpuSubtypeBase(cpuSubtype);
  if (cpuType === (CPU_TYPE_ARM | CPU_ARCH_ABI64))
    // Both pointer-authentication subtypes belong to the arm64e family.
    return subtype === CPU_SUBTYPE_ARM64E || subtype === CPU_SUBTYPE_ARM64E_X1
      ? "arm64e"
      : "arm64";
  if (cpuType === (CPU_TYPE_ARM | CPU_ARCH_ABI64_32)) return "arm64_32";
  if (cpuType === (CPU_TYPE_X86 | CPU_ARCH_ABI64))
    return subtype === CPU_SUBTYPE_X86_64_H ? "x86_64h" : "x86_64";
  if (cpuType === CPU_TYPE_X86) return "i386";
  if (cpuType === CPU_TYPE_ARM) return "arm";
  return `cpu-${cpuType.toString(16)}`;
};

const fileTypeName = (fileType: number): MachoSlice["file_type"] =>
  fileType === 2
    ? "execute"
    : fileType === 6
      ? "dylib"
      : fileType === 8
        ? "bundle"
        : "other";

const version = (value: number): string =>
  `${value >>> 16}.${(value >>> 8) & 0xff}.${value & 0xff}`;

const swap = (value: number): number =>
  (((value & 0xff) << 24) |
    ((value & 0xff00) << 8) |
    ((value >>> 8) & 0xff00) |
    (value >>> 24)) >>>
  0;

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
