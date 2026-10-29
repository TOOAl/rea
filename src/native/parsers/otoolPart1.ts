export const __stub = 1;
// interface ParsedSection {
//   readonly segment: string;
//   readonly name: string;
//   readonly address: string | null;
//   readonly size: number | null;
//   readonly file_offset: number | null;
//   readonly alignment: number | null;
//   readonly flags: string[];
// }
//
// interface ParsedSegment {
//   readonly name: string;
//   readonly vm_address: string | null;
//   readonly vm_size: number | null;
//   readonly file_offset: number | null;
//   readonly file_size: number | null;
//   readonly maximum_permissions: ReturnType<typeof permissions>;
//   readonly initial_permissions: ReturnType<typeof permissions>;
//   readonly sections: ParsedSection[];
// }
//
// interface ParsedLoadCommands {
//   readonly commands: Array<{
//     index: number;
//     kind: string;
//     fields: Record<string, string | number | null>;
//   }>;
//   readonly segments: ParsedSegment[];
//   readonly dependencies: Array<{
//     path: string;
//     kind: string;
//     current_version: string | null;
//     compatibility_version: string | null;
//   }>;
//   readonly entrypoints: Array<{ file_offset: number }>;
//   readonly builds: Array<{
//     platform: string | null;
//     minimum_os: string | null;
//     sdk: string | null;
//     tools: Array<{ name: string; version: string }>;
//   }>;
//   uuid: string | null;
//   readonly flags: Set<string>;
// }
//
// const DYLIB_COMMANDS = new Set([
//   "LC_ID_DYLIB",
//   "LC_LOAD_DYLIB",
//   "LC_LOAD_WEAK_DYLIB",
//   "LC_REEXPORT_DYLIB",
//   "LC_LAZY_LOAD_DYLIB",
//   "LC_LOAD_UPWARD_DYLIB",
// ]);
//
// const DYLIB_FIELDS = [
//   "cmd",
//   "cmdsize",
//   "name",
//   "current version",
//   "compatibility version",
// ];
// // otool prints options for dylib_use_command and a timestamp for dylib_command.
// const DYLIB_ENCODING_FIELDS = ["time stamp", "options"];
// const EMPTY_VALUE_FIELDS = new Set(["options", "segname", "sectname"]);
//
// /**
//  * Non-verbose otool prints LC_BUILD_VERSION platform and tool codes as
//  * numbers. Name the codes declared in the SDK's <mach-o/loader.h>, without
//  * the PLATFORM_/TOOL_ prefix, so build metadata uses the same symbolic style
//  * as LC_VERSION_MIN_* platforms. Unknown codes keep their printed value.
//  */
// const BUILD_PLATFORM_NAMES: ReadonlyMap<string, string> = new Map([
//   ["1", "MACOS"],
//   ["2", "IOS"],
//   ["3", "TVOS"],
//   ["4", "WATCHOS"],
//   ["5", "BRIDGEOS"],
//   ["6", "MACCATALYST"],
//   ["7", "IOSSIMULATOR"],
//   ["8", "TVOSSIMULATOR"],
//   ["9", "WATCHOSSIMULATOR"],
//   ["10", "DRIVERKIT"],
//   ["11", "VISIONOS"],
//   ["12", "VISIONOSSIMULATOR"],
//   ["13", "FIRMWARE"],
//   ["14", "SEPOS"],
//   ["15", "MACOS_EXCLAVECORE"],
//   ["16", "MACOS_EXCLAVEKIT"],
//   ["17", "IOS_EXCLAVECORE"],
//   ["18", "IOS_EXCLAVEKIT"],
//   ["19", "TVOS_EXCLAVECORE"],
//   ["20", "TVOS_EXCLAVEKIT"],
//   ["21", "WATCHOS_EXCLAVECORE"],
//   ["22", "WATCHOS_EXCLAVEKIT"],
//   ["23", "VISIONOS_EXCLAVECORE"],
//   ["24", "VISIONOS_EXCLAVEKIT"],
// ]);
// const BUILD_TOOL_NAMES: ReadonlyMap<string, string> = new Map([
//   ["1", "CLANG"],
//   ["2", "SWIFT"],
//   ["3", "LD"],
//   ["4", "LLD"],
//   ["1024", "METAL"],
//   ["1025", "AIRLLD"],
//   ["1026", "AIRNT"],
//   ["1027", "AIRNT_PLUGIN"],
//   ["1028", "AIRPACK"],
//   ["1031", "GPUARCHIVER"],
//   ["1032", "METAL_FRAMEWORK"],
// ]);
// const buildCodeName = (
//   names: ReadonlyMap<string, string>,
//   value: string | null,
// ): string | null => (value === null ? null : (names.get(value) ?? value));
//
// /**
//  * otool emits LF, but a capture replayed from another host or toolchain can
//  * carry CRLF. The section/command boundaries below match a bare `\n`, so a
//  * stray `\r` would swallow the terminator and silently empty `sections` while
//  * leaking section fields into the command. Normalizing once at the boundary
//  * keeps every parser below working on one line ending.
//  */
// const normalizeLineEndings = (output: string): string =>
//   output.replaceAll("\r\n", "\n");
//
// /** Parse stable fields from `otool -l`, preserving unknown command fields. */
// export const parseOtoolLoadCommands = (raw: string) => {
//   const output = normalizeLineEndings(raw);
//   const header = parseHeader(output);
//   if (header === undefined)
//     throw new TypeError("otool output is missing the Mach header");
//   const state = createLoadCommandState(header.flags);
//   for (const block of output.split(/(?=^Load command \d+$)/mu))
//     parseLoadCommand(block, state);
//   validateLoadCommandFraming(header, state.commands);
//   return {
//     wordSize: WORD_SIZES.get(header.magic ?? "") ?? null,
//     endian: header.cpuType === null ? null : cpuEndian(header.cpuType),
//     fileType: header.fileType,
//     flags: [...state.flags].sort(),
//     uuid: state.uuid,
//     commands: state.commands,
//     segments: state.segments,
//     dependencies: state.dependencies,
//     entrypoints: state.entrypoints,
//     builds: state.builds,
//   };
// };
//
// /** otool prints the selected slice's magic in host order, symbolic with -v. */
// const WORD_SIZES: ReadonlyMap<string, 32 | 64> = new Map<string, 32 | 64>([
//   ["0xfeedface", 32],
//   ["0xfeedfacf", 64],
//   ["MH_MAGIC", 32],
//   ["MH_MAGIC_64", 64],
// ]);
//
// /** Mach-O byte order by CPU family, ignoring the ABI bits; others stay unknown. */
// const cpuEndian = (cpuType: number): "little" | "big" | null => {
export const _l = 159;
