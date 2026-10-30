import type { BinaryTarget } from "../domain/binaryTargetTypes.js";
import type { EvidenceLocation } from "../domain/evidence.js";
import {
  inspectMachoSchema,
  type NativeCommandInvocation,
} from "../domain/native/nativeInspection.js";
import type { NativeCommandCapture } from "./CommandRunner.js";
import {
  MACHO_ARCHITECTURE_POLICIES,
  selectMachoArchitectureName,
} from "./MachoArchitectureSelection.js";
import { parseDyldSymbols } from "./parsers/dyldInfo.js";
import type { LipoArchitecture } from "./parsers/lipo.js";
import { withoutEchoedPathHeader } from "./parsers/echoedPath.js";
import { parseOtoolLoadCommands } from "./parsers/otool.js";
import { reconcileMachoUuid } from "./parsers/machoUuid.js";
import { compareUnicodeCodePoints } from "../domain/unicodeCodePointOrder.js";

const normalizeMacho = (
  captures: readonly NativeCommandCapture[],
  toInvocation: (capture: NativeCommandCapture) => NativeCommandInvocation,
  additionalLimitations: readonly string[],
  load: ReturnType<typeof parseOtoolLoadCommands>,
  architectures: readonly LipoArchitecture[],
  artifactPath: string,
  selectedArchitecture: {
    readonly name: string | null;
    readonly container_file_offset: number | null;
  },
) => {
  const byTool = captureLookup(captures);
  const imports = parseDyldSymbols(
    sliceOutput(byTool("dyld_info", 0)),
    "imports",
  );
  const imageBase =
    load.segments.find(
      (segment) => segment.file_offset === 0 && (segment.file_size ?? 0) > 0,
    )?.vm_address ?? null;
  const nmExports = parseNmExports(byTool("nm").stdout);
  const dyldExports = parseDyldSymbols(
    sliceOutput(byTool("dyld_info", 1)),
    "exports",
    imageBase,
    new Set(nmExports.map(({ name }) => name)),
  );
  const exports = uniqueSymbols([...dyldExports, ...nmExports]);
  const dwarfdump = byTool("dwarfdump");
  const uuid = reconcileMachoUuid(
    load.commands,
    dwarfdump.stdout,
    artifactPath,
    selectedArchitecture.name,
  );
  const provenance = captures.map(toInvocation);
  // A thread-state command carries the entrypoint in architecture-specific
  // register state, so an absent decoded offset means unknown, not absent.
  const threadEntrypoint =
    load.entrypoints.length === 0 &&
    load.commands.some(
      (command) =>
        command.kind === "LC_UNIXTHREAD" || command.kind === "LC_THREAD",
    );
  const threadEntrypointLimitation =
    "Thread-state entrypoints (LC_UNIXTHREAD/LC_THREAD) are retained as raw load commands; file offsets are not derived.";
  const limitations = [
    "Imports and exports combine dyld_info and nm; stripped or toolchain-hidden symbols may be absent.",
    ...(captures.some(({ tool }) => tool === "vtool")
      ? [
          "vtool output is retained as provenance but only otool build metadata is normalized.",
        ]
      : []),
    ...additionalLimitations,
    ...uuid.limitations,
    ...(threadEntrypoint ? [threadEntrypointLimitation] : []),
    ...(imageBase === null &&
    /^\s*offset\s+symbol\s*$/mu.test(sliceOutput(byTool("dyld_info", 1)))
      ? [
          "Export virtual addresses are unavailable because no file-backed image base was observed.",
        ]
      : []),
  ];
  return inspectMachoSchema.parse({
    format: "mach-o",
    selected_architecture: selectedArchitecture,
    endian: load.endian,
    word_size: load.wordSize,
    file_type: load.fileType,
    flags: load.flags,
    uuid: uuid.value,
    entrypoints: covered(
      load.entrypoints,
      !threadEntrypoint,
      threadEntrypoint ? [threadEntrypointLimitation] : [],
    ),
    architectures: covered(architectures, true),
    build_metadata: covered(load.builds, true),
    load_commands: covered(load.commands, true),
    dependencies: covered(load.dependencies, true),
    imports: covered(imports, false, [
      "dyld_info textual imports may omit chained or toolchain-unsupported metadata.",
    ]),
    exports: covered(exports, false, [
      "Merged nm/dyld_info results may be incomplete for stripped binaries.",
      ...(dyldExports.some(({ sourceSymbol }) => sourceSymbol !== undefined)
        ? [
            "Renamed re-exports are listed under their exported name; the source library's symbol name is not reported.",
          ]
        : []),
    ]),
    segments: covered(
      load.segments.map((segment) => ({
        ...segment,
        sections: covered(segment.sections, true),
      })),
      true,
    ),
    provenance,
    limitations,
  });
};

/** Slice output without the echoed operand path, which can contain any text. */
const sliceOutput = (capture: NativeCommandCapture): string =>
  withoutEchoedPathHeader(capture.stdout, capture.arguments.at(-1));

const captureLookup =
  (captures: readonly NativeCommandCapture[]) =>
  (tool: string, occurrence = 0): NativeCommandCapture => {
    const capture = captures.filter((item) => item.tool === tool)[occurrence];
    if (capture === undefined) throw new TypeError(`Missing ${tool} capture`);
    return capture;
  };

/**
 * Whether every dyld_info export row names a symbol-table export. A row this
 * parser cannot read counts as uncovered, so an unfamiliar format falls back.
 */
const namesEveryExport = (
  nmOutput: string,
  dyldExports: NativeCommandCapture,
): boolean => {
  const names = new Set(parseNmExports(nmOutput).map(({ name }) => name));
  return sliceOutput(dyldExports)
    .split(/\r?\n/u)
    .every((rawLine, index) => {
      const line = rawLine.trim();
      if (
        line.length === 0 ||
        (index === 0 && line.endsWith(":")) ||
        /^-?exports:$/u.test(line) ||
        /^offset\s+symbol$/u.test(line)
      )
        return true;
      const rows = parseDyldSymbols(line, "exports", null, names);
      // The parser withholds a row only when nm names both of its readings.
      if (rows.length === 0)
        return names.has(/^0x[\da-f]+\s+(.+)$/iu.exec(line)?.[1] ?? "");
      return rows.length === 1 && names.has(rows[0]!.name);
    });
};

const parseNmExports = (output: string) =>
  output
    .split(/\r?\n/u)
    .filter((name) => name.length > 0)
    .map((name) => ({
      name,
      address: null,
      weak: null,
      reexport: null,
      source: "nm",
    }));

const covered = <Value>(
  items: readonly Value[],
  exhaustive: boolean,
  limitations: readonly string[] = [],
) => ({
  items: [...items],
  total: exhaustive ? items.length : null,
  exhaustive,
  limitations: [...limitations],
});

const uniqueSymbols = <Value extends { readonly name: string }>(
  items: readonly Value[],
): Value[] => {
  const unique = new Map<string, Value>();
  for (const item of items)
    if (!unique.has(item.name)) unique.set(item.name, item);
  return [...unique.values()].sort((left, right) =>
    compareUnicodeCodePoints(left.name, right.name),
  );
};

const fileOffsetLocations = (
  macho: ReturnType<typeof inspectMachoSchema.parse>,
  containerOffset: number | undefined,
): EvidenceLocation[] => {
  const locations = architectureLocations(macho.architectures.items);
  if (containerOffset === undefined) return locations;
  for (const entrypoint of macho.entrypoints.items)
    locations.push({
      kind: "file-offset",
      offset: containerOffset + entrypoint.file_offset,
    });
  for (const segment of macho.segments.items) {
    if (
      segment.file_offset === null ||
      segment.file_size === null ||
      segment.file_size === 0
    )
      continue;
    locations.push({
      kind: "file-offset-range",
      start: containerOffset + segment.file_offset,
      end: containerOffset + segment.file_offset + segment.file_size,
    });
  }
  return locations;
};

/** Project architecture slices into evidence file-offset locations. */
export const architectureLocations = (
  architectures: readonly {
    readonly file_offset: number | null;
    readonly size: number | null;
  }[],
): EvidenceLocation[] => {
  const locations: EvidenceLocation[] = [];
  for (const { file_offset: offset, size } of architectures) {
    if (offset === null) continue;
    locations.push(
      size === null
        ? { kind: "file-offset", offset }
        : { kind: "file-offset-range", start: offset, end: offset + size },
    );
  }
  return locations;
};

/**
 * lipo appends the pointer-auth ABI version to arm64e (`arm64e.v1`). Only
 * dyld_info accepts that spelling; the other Apple tools select the slice by
 * its CPU-family name. Other variants are distinct subtypes (`arm64e.x1`)
 * that the tools address only by their exact name.
 */
const toolArchitectureName = (tool: string, architecture: string): string =>
  tool === "dyld_info" ? architecture : architecture.replace(/\.v\d+$/u, "");

const selectedArchitectureArguments = (
  tool: string,
  architecture: string | null,
): string[] => {
  if (architecture === null) return [];
  const toolArchitecture = toolArchitectureName(tool, architecture);
  return tool === "dwarfdump"
    ? [`--arch=${toolArchitecture}`]
    : ["-arch", toolArchitecture];
};

type ArchitectureSelection =
  | { readonly status: "unfiltered" }
  | { readonly status: "selected"; readonly architecture: string }
  | { readonly status: "absent"; readonly architecture: string };

const selectArchitecture = (
  target: BinaryTarget,
  available: readonly LipoArchitecture[],
): ArchitectureSelection => {
  // BinaryTarget lists CPU families and lipo lists slices. A universal file
  // can hold several slices of one family (arm64e and arm64e.x1), and slice
  // tools without -arch print every slice.
  if (
    target.kind !== "executable" ||
    (target.availableArchitectures.length < 2 && available.length < 2)
  )
    return { status: "unfiltered" };
  const normalized =
    target.architecture === "x86" ? "i386" : target.architecture;
  const policy = MACHO_ARCHITECTURE_POLICIES[target.architecture];
  const selected =
    policy === undefined
      ? available.find(({ name }) => name === normalized)?.name
      : selectMachoArchitectureName(policy, available);
  if (selected !== undefined)
    return { status: "selected", architecture: selected };
  return { status: "absent", architecture: normalized };
};
