interface ParsedSection {
  readonly segment: string;
  readonly name: string;
  readonly address: string | null;
  readonly size: number | null;
  readonly file_offset: number | null;
  readonly alignment: number | null;
  readonly flags: string[];
}

interface ParsedSegment {
  readonly name: string;
  readonly vm_address: string | null;
  readonly vm_size: number | null;
  readonly file_offset: number | null;
  readonly file_size: number | null;
  readonly maximum_permissions: ReturnType<typeof permissions>;
  readonly initial_permissions: ReturnType<typeof permissions>;
  readonly sections: ParsedSection[];
}

interface ParsedLoadCommands {
  readonly commands: Array<{
    index: number;
    kind: string;
    fields: Record<string, string | number | null>;
  }>;
  readonly segments: ParsedSegment[];
  readonly dependencies: Array<{
    path: string;
    kind: string;
    current_version: string | null;
    compatibility_version: string | null;
  }>;
  readonly entrypoints: Array<{ file_offset: number }>;
  readonly builds: Array<{
    platform: string | null;
    minimum_os: string | null;
    sdk: string | null;
    tools: Array<{ name: string; version: string }>;
  }>;
  uuid: string | null;
  readonly flags: Set<string>;
}

const DYLIB_COMMANDS = new Set([
  "LC_ID_DYLIB",
  "LC_LOAD_DYLIB",
  "LC_LOAD_WEAK_DYLIB",
  "LC_REEXPORT_DYLIB",
  "LC_LAZY_LOAD_DYLIB",
  "LC_LOAD_UPWARD_DYLIB",
]);

const DYLIB_FIELDS = [
  "cmd",
  "cmdsize",
  "name",
  "current version",
  "compatibility version",
];
// otool prints options for dylib_use_command and a timestamp for dylib_command.
const DYLIB_ENCODING_FIELDS = ["time stamp", "options"];
const EMPTY_VALUE_FIELDS = new Set(["options", "segname", "sectname"]);

/**
 * Non-verbose otool prints LC_BUILD_VERSION platform and tool codes as
 * numbers. Name the codes declared in the SDK's <mach-o/loader.h>, without
 * the PLATFORM_/TOOL_ prefix, so build metadata uses the same symbolic style
 * as LC_VERSION_MIN_* platforms. Unknown codes keep their printed value.
 */
const BUILD_PLATFORM_NAMES: ReadonlyMap<string, string> = new Map([
  ["1", "MACOS"],
  ["2", "IOS"],
  ["3", "TVOS"],
  ["4", "WATCHOS"],
  ["5", "BRIDGEOS"],
  ["6", "MACCATALYST"],
  ["7", "IOSSIMULATOR"],
  ["8", "TVOSSIMULATOR"],
  ["9", "WATCHOSSIMULATOR"],
  ["10", "DRIVERKIT"],
  ["11", "VISIONOS"],
  ["12", "VISIONOSSIMULATOR"],
  ["13", "FIRMWARE"],
  ["14", "SEPOS"],
  ["15", "MACOS_EXCLAVECORE"],
  ["16", "MACOS_EXCLAVEKIT"],
  ["17", "IOS_EXCLAVECORE"],
  ["18", "IOS_EXCLAVEKIT"],
  ["19", "TVOS_EXCLAVECORE"],
  ["20", "TVOS_EXCLAVEKIT"],
  ["21", "WATCHOS_EXCLAVECORE"],
  ["22", "WATCHOS_EXCLAVEKIT"],
  ["23", "VISIONOS_EXCLAVECORE"],
  ["24", "VISIONOS_EXCLAVEKIT"],
]);
const BUILD_TOOL_NAMES: ReadonlyMap<string, string> = new Map([
  ["1", "CLANG"],
  ["2", "SWIFT"],
  ["3", "LD"],
  ["4", "LLD"],
  ["1024", "METAL"],
  ["1025", "AIRLLD"],
  ["1026", "AIRNT"],
  ["1027", "AIRNT_PLUGIN"],
  ["1028", "AIRPACK"],
  ["1031", "GPUARCHIVER"],
  ["1032", "METAL_FRAMEWORK"],
]);
const buildCodeName = (
  names: ReadonlyMap<string, string>,
  value: string | null,
): string | null => (value === null ? null : (names.get(value) ?? value));

/**
 * otool emits LF, but a capture replayed from another host or toolchain can
 * carry CRLF. The section/command boundaries below match a bare `\n`, so a
 * stray `\r` would swallow the terminator and silently empty `sections` while
 * leaking section fields into the command. Normalizing once at the boundary
 * keeps every parser below working on one line ending.
 */
const normalizeLineEndings = (output: string): string =>
  output.replaceAll("\r\n", "\n");

/** Parse stable fields from `otool -l`, preserving unknown command fields. */
export const parseOtoolLoadCommands = (raw: string) => {
  const output = normalizeLineEndings(raw);
  const header = parseHeader(output);
  if (header === undefined)
    throw new TypeError("otool output is missing the Mach header");
  const state = createLoadCommandState(header.flags);
  for (const block of output.split(/(?=^Load command \d+$)/mu))
    parseLoadCommand(block, state);
  validateLoadCommandFraming(header, state.commands);
  return {
    wordSize: WORD_SIZES.get(header.magic ?? "") ?? null,
    endian: header.cpuType === null ? null : cpuEndian(header.cpuType),
    fileType: header.fileType,
    flags: [...state.flags].sort(),
    uuid: state.uuid,
    commands: state.commands,
    segments: state.segments,
    dependencies: state.dependencies,
    entrypoints: state.entrypoints,
    builds: state.builds,
  };
};

/** otool prints the selected slice's magic in host order, symbolic with -v. */
const WORD_SIZES: ReadonlyMap<string, 32 | 64> = new Map<string, 32 | 64>([
  ["0xfeedface", 32],
  ["0xfeedfacf", 64],
  ["MH_MAGIC", 32],
  ["MH_MAGIC_64", 64],
]);

/** Mach-O byte order by CPU family, ignoring the ABI bits; others stay unknown. */
const cpuEndian = (cpuType: number): "little" | "big" | null => {
  const family = cpuType & 0x00ffffff;
  if (family === 7 || family === 12) return "little";
  return family === 18 ? "big" : null;
};

const parseHeader = (
  output: string,
):
  | {
      magic: string | null;
      cpuType: number | null;
      fileType: string | null;
      flags: string[];
      commandCount: number;
      commandBytes: number;
    }
  | undefined => {
  const lines = output.split(/\r?\n/u).map((line) => line.trim());
  const columnsLine = lines.findIndex((line) => /(?:^|\s)magic\s/u.test(line));
  if (columnsLine < 0) return undefined;
  const columns = lines[columnsLine]?.split(/\s+/u);
  const dataLine = lines.slice(columnsLine + 1).find((line) => line.length > 0);
  const values = dataLine?.split(/\s+/u);
  if (columns === undefined || values === undefined) return undefined;
  const commandCount = headerValue(columns, values, "ncmds");
  const commandBytes = headerValue(columns, values, "sizeofcmds");
  if (commandCount === null || commandBytes === null)
    throw new TypeError("otool Mach header is missing valid command framing");
  const fileTypeIndex = columns.indexOf("filetype");
  const flagsIndex = columns.indexOf("flags");
  const complete = values.length >= columns.length;
  const fileTypeValueIndex =
    flagsIndex >= 0 && fileTypeIndex > flagsIndex
      ? values.length - (columns.length - fileTypeIndex)
      : fileTypeIndex;
  const flagsEnd =
    flagsIndex >= 0 ? values.length - (columns.length - flagsIndex - 1) : 0;
  const magicIndex = columns.indexOf("magic");
  return {
    magic: magicIndex < 0 ? null : (values[magicIndex] ?? null),
    cpuType: headerValue(columns, values, "cputype"),
    commandCount,
    commandBytes,
    fileType:
      complete && fileTypeValueIndex >= 0 && fileTypeValueIndex < values.length
        ? (values[fileTypeValueIndex] ?? null)
        : null,
    flags:
      !complete || flagsIndex < 0 || flagsIndex >= flagsEnd
        ? []
        : values
            .slice(flagsIndex, flagsEnd)
            .filter((value) => value.length > 0),
  };
};

const headerValue = (
  columns: readonly string[],
  values: readonly string[],
  name: string,
): number | null => {
  const index = columns.indexOf(name);
  if (index < 0) return null;
  const flagsIndex = columns.indexOf("flags");
  const valueIndex =
    flagsIndex >= 0 && index > flagsIndex
      ? values.length - (columns.length - index)
      : index;
  const value = values[valueIndex];
  return value === undefined ? null : numeric(value);
};

const validateLoadCommandFraming = (
  header: { readonly commandCount: number; readonly commandBytes: number },
  commands: readonly {
    readonly index: number;
    readonly fields: Readonly<Record<string, string | number | null>>;
  }[],
): void => {
  if (commands.length !== header.commandCount)
    throw new TypeError(
      "otool load-command count does not match the Mach header",
    );
  let totalBytes = 0;
  for (const [expectedIndex, command] of commands.entries()) {
    const size = numberField(command.fields, "cmdsize");
    if (command.index !== expectedIndex || size === null || size < 8)
      throw new TypeError("otool load-command sequence or size is invalid");
    totalBytes += size;
    if (!Number.isSafeInteger(totalBytes))
      throw new TypeError("otool load-command byte count is unsafe");
  }
  if (totalBytes !== header.commandBytes)
    throw new TypeError(
      "otool load-command sizes do not match the Mach header",
    );
};

const createLoadCommandState = (
  headerFlags: readonly string[] | undefined,
): ParsedLoadCommands => ({
  commands: [],
  segments: [],
  dependencies: [],
  entrypoints: [],
  builds: [],
  uuid: null,
  flags: new Set(headerFlags ?? []),
});

const parseLoadCommand = (block: string, state: ParsedLoadCommands): void => {
  const indexText = /^Load command (\d+)/u.exec(block)?.[1];
  if (indexText === undefined) return;
  const index = Number(indexText);
  if (!Number.isSafeInteger(index))
    throw new TypeError("otool load-command index is unsafe");
  const header = block.split(/\n\s*Section\n/u)[0] ?? block;
  const parsed = parseFields(header);
  const fields = parsed.values;
  const kind = stringField(fields, "cmd");
  if (kind === null) throw new TypeError("otool load command is missing cmd");
  for (const key of scalarFields(kind)) requireUniqueField(parsed, key);
  if (DYLIB_COMMANDS.has(kind)) validateDylibCommandLines(parsed);
  if (kind === "LC_LINKER_OPTION") validateLinkerOptionLines(parsed);
  state.commands.push({
    index,
    kind,
    fields,
  });
  collectUuid(kind, fields, state);
  collectEntrypoint(kind, fields, state);
  collectBuild(kind, block, fields, state);
  collectDependency(kind, fields, state);
  collectSegment(kind, block, fields, state);
};

const validateDylibCommandLines = (parsed: ParsedFields): void => {
  const encodingFields = DYLIB_ENCODING_FIELDS.filter((key) =>
    parsed.rows.some((field) => field?.[0] === key),
  );
  if (encodingFields.length !== 1)
    throw new TypeError(
      "otool dylib command must contain timestamp or options",
    );
  for (const key of encodingFields) requireUniqueField(parsed, key);
  const allowed = new Set([...DYLIB_FIELDS, ...DYLIB_ENCODING_FIELDS]);
  for (const field of parsed.rows) {
    const key = field?.[0];
    if (key === undefined || !allowed.has(key))
      throw new TypeError(
        "otool dylib command contains ambiguous multiline text",
      );
  }
};

/** Each declared option appears once, in order, as `string #1..count`. */
const validateLinkerOptionLines = (parsed: ParsedFields): void => {
  const count = numberField(parsed.values, "count");
  const labels = parsed.rows
    .map((field) => field?.[0])
    .filter((key) => key !== "cmd" && key !== "cmdsize" && key !== "count");
  if (
    count === null ||
    labels.length !== count ||
    labels.some((key, index) => key !== `string #${String(index + 1)}`)
  )
    throw new TypeError("otool linker-option strings do not match count");
};

const scalarFields = (kind: string): readonly string[] => {
  const common = ["cmd", "cmdsize"];
  if (DYLIB_COMMANDS.has(kind)) return DYLIB_FIELDS;
  if (kind === "LC_LINKER_OPTION") return [...common, "count"];
  if (kind === "LC_LOAD_DYLINKER" || kind === "LC_ID_DYLINKER")
    return [...common, "name"];
  if (kind === "LC_UUID") return [...common, "uuid"];
  if (kind === "LC_MAIN") return [...common, "entryoff"];
  if (kind === "LC_BUILD_VERSION")
    return [...common, "platform", "minos", "sdk", "ntools"];
  if (kind.startsWith("LC_VERSION_MIN_")) return [...common, "version", "sdk"];
  if (kind === "LC_SEGMENT" || kind === "LC_SEGMENT_64")
    return [
      ...common,
      "segname",
      "vmaddr",
      "vmsize",
      "fileoff",
      "filesize",
      "maxprot",
      "initprot",
      "nsects",
      "flags",
    ];
  return common;
};

const collectUuid = (
  kind: string,
  fields: Readonly<Record<string, string | number | null>>,
  state: ParsedLoadCommands,
): void => {
  if (kind === "LC_UUID")
    state.uuid = stringField(fields, "uuid") ?? state.uuid;
};

const collectEntrypoint = (
  kind: string,
  fields: Readonly<Record<string, string | number | null>>,
  state: ParsedLoadCommands,
): void => {
  if (kind !== "LC_MAIN") return;
  const entry = numberField(fields, "entryoff");
  if (entry !== null) state.entrypoints.push({ file_offset: entry });
};

const collectBuild = (
  kind: string,
  block: string,
  fields: Readonly<Record<string, string | number | null>>,
  state: ParsedLoadCommands,
): void => {
  if (kind === "LC_BUILD_VERSION") {
    const tools = parseBuildTools(block);
    if (numberField(fields, "ntools") !== tools.length)
      throw new TypeError("otool build-tool count does not match ntools");
    state.builds.push({
      platform: buildCodeName(
        BUILD_PLATFORM_NAMES,
        stringField(fields, "platform"),
      ),
      minimum_os: stringField(fields, "minos"),
      sdk: stringField(fields, "sdk"),
      tools,
    });
    return;
  }
  if (kind.startsWith("LC_VERSION_MIN_"))
    state.builds.push({
      platform: kind.slice("LC_VERSION_MIN_".length) || null,
      minimum_os: stringField(fields, "version"),
      sdk: stringField(fields, "sdk"),
      tools: [],
    });
};

const collectDependency = (
  kind: string,
  fields: Readonly<Record<string, string | number | null>>,
  state: ParsedLoadCommands,
): void => {
  // LC_ID_DYLIB names this image itself; it stays a raw load command only.
  if (!DYLIB_COMMANDS.has(kind) || kind === "LC_ID_DYLIB") return;
  state.dependencies.push({
    path: stripOffsetSuffix(stringField(fields, "name")),
    kind,
    current_version: stringField(fields, "current version"),
    compatibility_version: stringField(fields, "compatibility version"),
  });
};

const collectSegment = (
  kind: string,
  block: string,
  fields: Readonly<Record<string, string | number | null>>,
  state: ParsedLoadCommands,
): void => {
  if (kind !== "LC_SEGMENT" && kind !== "LC_SEGMENT_64") return;
  const segment = parseSegment(block, fields);
  if (numberField(fields, "nsects") !== segment.sections.length)
    throw new TypeError(
      "otool segment section count does not match its sections",
    );
  state.segments.push(segment);
};

interface ParsedFields {
  readonly values: Record<string, string | number | null>;
  readonly rows: readonly (readonly [string, string] | undefined)[];
}

/**
 * A key otool prints more than once, such as each LC_BUILD_VERSION tool, is
 * labeled `key #n` in print order so no row overwrites another. Linker-option
 * strings keep otool's own `string #n` label at every count.
 */
