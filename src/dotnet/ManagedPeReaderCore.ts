import type { ManagedParseIssue } from "../domain/managed/managedArtifact.js";
import { decodePeMachine } from "../domain/peMachine.js";
import {
  managedFailure,
  ManagedReaderFailure,
} from "./ManagedReaderFailure.js";

interface PeSection {
  readonly virtualAddress: number;
  readonly virtualSize: number;
  readonly rawOffset: number;
  readonly rawSize: number;
}

interface PeDataDirectory {
  readonly rva: number;
  readonly size: number;
}

export interface ManagedCliHeader {
  readonly headerOffset: number;
  readonly headerSize: number;
  readonly runtimeMajor: number;
  readonly runtimeMinor: number;
  readonly metadata: PeDataDirectory;
  readonly flags: number;
  readonly entryPoint: number;
  readonly resources: PeDataDirectory;
  readonly strongName: PeDataDirectory;
  readonly managedNativeHeader: PeDataDirectory;
  readonly readyToRunSignature: boolean;
}

/**
 * How the CLI header constrains process bitness. 32BITREQUIRED and
 * 32BITPREFERRED are one two-bit field: required alone is x86-only, both set
 * is platform-neutral code that prefers a 32-bit process, and preferred alone
 * is reserved and constrains nothing.
 */
export const managedCli32BitRequirement = (
  flags: number,
): "required" | "preferred" | "none" => {
  const pair = flags & 0x0002_0002;
  if (pair === 0x0000_0002) return "required";
  return pair === 0x0002_0002 ? "preferred" : "none";
};

/**
 * crossgen2 clears ILONLY on ReadyToRun output, so only a clear ILONLY flag
 * without the ReadyToRun signature marks mixed CLR/native code.
 */
export const managedCliIsMixedClrNative = (cli: ManagedCliHeader): boolean =>
  (cli.flags & 0x0000_0001) === 0 && !cli.readyToRunSignature;

export interface ManagedPeLayout {
  readonly machine: number;
  readonly architecture: "x86" | "x86_64" | "arm" | "arm64";
  readonly optionalHeader: "pe32" | "pe32-plus";
  readonly sectionCount: number;
  readonly characteristics: number;
  readonly sections: readonly PeSection[];
  readonly cli: ManagedCliHeader | null;
  readonly cliDirectoryState: "absent" | "present" | "unreadable";
  readonly cliIssue: ManagedParseIssue | null;
  rvaToOffset(rva: number, size: number, scope: string): number;
  rvaAvailableBytes(rva: number, scope: string): number;
}

interface RvaMapping {
  readonly bytes: Buffer;
  readonly sections: readonly PeSection[];
  readonly rva: number;
  readonly size: number;
  readonly scope: string;
}

interface CoffHeader {
  readonly coff: number;
  readonly machine: number;
  readonly sectionCount: number;
  readonly optionalSize: number;
  readonly characteristics: number;
}

interface OptionalHeader {
  readonly optionalOffset: number;
  readonly optionalHeader: "pe32" | "pe32-plus";
  readonly directoryCountOffset: number;
  readonly directoryOffset: number;
}

type CliDirectoryRead =
  | { readonly kind: "absent" }
  | { readonly kind: "present"; readonly directory: PeDataDirectory }
  | { readonly kind: "unreadable"; readonly issue: ManagedParseIssue };

const requireRange = (
  bytes: Buffer,
  offset: number,
  length: number,
  scope: string,
): void => {
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(length) ||
    offset < 0 ||
    length < 0 ||
    offset > bytes.length - length
  )
    throw managedFailure(
      "invalid-directory",
      scope,
      `${scope} leaves the artifact byte range`,
      Number.isSafeInteger(offset) && offset >= 0 ? offset : null,
    );
};

const add = (left: number, right: number, scope: string): number => {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < left)
    throw managedFailure(
      "invalid-directory",
      scope,
      `${scope} offset arithmetic overflowed`,
      left,
    );
  return result;
};

const architectureFor = (
  machine: number,
  managed: boolean,
): ManagedPeLayout["architecture"] => {
  const decoded = decodePeMachine(machine);
  if (decoded === undefined || (decoded.nativeOsOverride && !managed))
    throw managedFailure(
      "invalid-directory",
      "pe.machine",
      `Unsupported PE machine 0x${machine.toString(16).padStart(4, "0")}`,
    );
  return decoded.architecture;
};

/** Resolve one section identity for both exact reads and available-byte queries. */
const resolveRva = (
  mapping: RvaMapping,
): { readonly offset: number; readonly available: number } => {
  const { bytes, sections, rva, size, scope } = mapping;
  if (
    !Number.isSafeInteger(rva) ||
    !Number.isSafeInteger(size) ||
    rva < 0 ||
    size < 0 ||
    rva > 0xffff_ffff ||
    (size > 0 && size > 0x1_0000_0000 - rva)
  )
    throw managedFailure(
      "invalid-directory",
      scope,
      `${scope} has an invalid RVA range`,
    );
  // VirtualSize owns RVA containment; raw size also includes alignment padding.
  const selected = sections.find((section) => {
    const within = rva - section.virtualAddress;
    return (
      section.virtualSize > 0 &&
      within >= 0 &&
      within < section.virtualSize &&
      size <= section.virtualSize - within
    );
  });
  if (selected === undefined)
    throw managedFailure(
      "invalid-directory",
      scope,
      `${scope} RVA is not covered by one PE section`,
    );
  for (const section of sections) {
    if (section === selected || section.virtualSize === 0) continue;
    const end = section.virtualAddress + section.virtualSize;
    const intersects =
      size === 0
        ? rva >= section.virtualAddress && rva < end
        : rva < end && rva + size > section.virtualAddress;
    if (intersects)
      throw managedFailure(
        "invalid-directory",
        scope,
        `${scope} RVA range has ambiguous overlapping PE section mappings`,
      );
  }
  const within = rva - selected.virtualAddress;
  if (within > selected.rawSize || size > selected.rawSize - within)
    throw managedFailure(
      "invalid-directory",
      scope,
      `${scope} occupies virtual bytes without file-backed data`,
    );
  const offset = add(selected.rawOffset, within, scope);
  requireRange(bytes, offset, size, scope);
  let available = Math.min(
    selected.virtualSize - within,
    selected.rawSize - within,
    bytes.length - offset,
    0x1_0000_0000 - rva,
  );
  // A future overlap ends the uniquely mapped extent even if the current byte is unique.
  for (const section of sections)
    if (
      section !== selected &&
      section.virtualAddress > rva &&
      section.virtualSize > 0
    )
      available = Math.min(available, section.virtualAddress - rva);
  return { offset, available };
};

const mapRva = (mapping: RvaMapping): number =>
  mapping.rva === 0 && mapping.size === 0 ? 0 : resolveRva(mapping).offset;

const readDirectory = (bytes: Buffer, offset: number): PeDataDirectory => {
  requireRange(bytes, offset, 8, "pe.data-directory");
  return {
    rva: bytes.readUInt32LE(offset),
    size: bytes.readUInt32LE(offset + 4),
  };
};
