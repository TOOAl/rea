export const __stub = 1;
//     .map((field) => field?.[0])
//     .filter((key) => key !== "cmd" && key !== "cmdsize" && key !== "count");
//   if (
//     count === null ||
//     labels.length !== count ||
//     labels.some((key, index) => key !== `string #${String(index + 1)}`)
//   )
//     throw new TypeError("otool linker-option strings do not match count");
// };
//
// const scalarFields = (kind: string): readonly string[] => {
//   const common = ["cmd", "cmdsize"];
//   if (DYLIB_COMMANDS.has(kind)) return DYLIB_FIELDS;
//   if (kind === "LC_LINKER_OPTION") return [...common, "count"];
//   if (kind === "LC_LOAD_DYLINKER" || kind === "LC_ID_DYLINKER")
//     return [...common, "name"];
//   if (kind === "LC_UUID") return [...common, "uuid"];
//   if (kind === "LC_MAIN") return [...common, "entryoff"];
//   if (kind === "LC_BUILD_VERSION")
//     return [...common, "platform", "minos", "sdk", "ntools"];
//   if (kind.startsWith("LC_VERSION_MIN_")) return [...common, "version", "sdk"];
//   if (kind === "LC_SEGMENT" || kind === "LC_SEGMENT_64")
//     return [
//       ...common,
//       "segname",
//       "vmaddr",
//       "vmsize",
//       "fileoff",
//       "filesize",
//       "maxprot",
//       "initprot",
//       "nsects",
//       "flags",
//     ];
//   return common;
// };
//
// const collectUuid = (
//   kind: string,
//   fields: Readonly<Record<string, string | number | null>>,
//   state: ParsedLoadCommands,
// ): void => {
//   if (kind === "LC_UUID")
//     state.uuid = stringField(fields, "uuid") ?? state.uuid;
// };
//
// const collectEntrypoint = (
//   kind: string,
//   fields: Readonly<Record<string, string | number | null>>,
//   state: ParsedLoadCommands,
// ): void => {
//   if (kind !== "LC_MAIN") return;
//   const entry = numberField(fields, "entryoff");
//   if (entry !== null) state.entrypoints.push({ file_offset: entry });
// };
//
// const collectBuild = (
//   kind: string,
//   block: string,
//   fields: Readonly<Record<string, string | number | null>>,
//   state: ParsedLoadCommands,
// ): void => {
//   if (kind === "LC_BUILD_VERSION") {
//     const tools = parseBuildTools(block);
//     if (numberField(fields, "ntools") !== tools.length)
//       throw new TypeError("otool build-tool count does not match ntools");
//     state.builds.push({
//       platform: buildCodeName(
//         BUILD_PLATFORM_NAMES,
//         stringField(fields, "platform"),
//       ),
//       minimum_os: stringField(fields, "minos"),
//       sdk: stringField(fields, "sdk"),
//       tools,
//     });
//     return;
//   }
//   if (kind.startsWith("LC_VERSION_MIN_"))
//     state.builds.push({
//       platform: kind.slice("LC_VERSION_MIN_".length) || null,
//       minimum_os: stringField(fields, "version"),
//       sdk: stringField(fields, "sdk"),
//       tools: [],
//     });
// };
//
// const collectDependency = (
//   kind: string,
//   fields: Readonly<Record<string, string | number | null>>,
//   state: ParsedLoadCommands,
// ): void => {
//   // LC_ID_DYLIB names this image itself; it stays a raw load command only.
//   if (!DYLIB_COMMANDS.has(kind) || kind === "LC_ID_DYLIB") return;
//   state.dependencies.push({
//     path: stripOffsetSuffix(stringField(fields, "name")),
//     kind,
//     current_version: stringField(fields, "current version"),
//     compatibility_version: stringField(fields, "compatibility version"),
//   });
// };
//
// const collectSegment = (
//   kind: string,
//   block: string,
//   fields: Readonly<Record<string, string | number | null>>,
//   state: ParsedLoadCommands,
// ): void => {
//   if (kind !== "LC_SEGMENT" && kind !== "LC_SEGMENT_64") return;
//   const segment = parseSegment(block, fields);
//   if (numberField(fields, "nsects") !== segment.sections.length)
//     throw new TypeError(
//       "otool segment section count does not match its sections",
//     );
//   state.segments.push(segment);
// };
//
// interface ParsedFields {
//   readonly values: Record<string, string | number | null>;
//   readonly rows: readonly (readonly [string, string] | undefined)[];
// }
//
// /**
//  * A key otool prints more than once, such as each LC_BUILD_VERSION tool, is
//  * labeled `key #n` in print order so no row overwrites another. Linker-option
//  * strings keep otool's own `string #n` label at every count.
//  */
// const parseFields = (block: string): ParsedFields => {
//   const rows: Array<readonly [string, string] | undefined> = [];
//   for (const rawLine of block.split(/\r?\n/u).slice(1))
//     if (rawLine.trim().length > 0) rows.push(parseField(rawLine));
//   const occurrences = new Map<string, number>();
//   for (const field of rows)
//     if (field !== undefined)
//       occurrences.set(field[0], (occurrences.get(field[0]) ?? 0) + 1);
//   const fields: Record<string, string | number | null> = {};
//   const ordinals = new Map<string, number>();
//   for (const field of rows) {
//     if (field === undefined) continue;
//     const [key, value] = field;
//     const ordinal = (ordinals.get(key) ?? 0) + 1;
//     ordinals.set(key, ordinal);
//     const label =
//       (occurrences.get(key) ?? 0) > 1 ? `${key} #${String(ordinal)}` : key;
//     fields[label] = TEXT_FIELDS.test(key) ? value : (numeric(value) ?? value);
//   }
//   return { values: fields, rows };
// };
//
// /** Names and linker options are text even when they look numeric. */
// const TEXT_FIELDS = /^(?:segname|sectname|string #\d+)$/u;
//
// const parseField = (rawLine: string): readonly [string, string] | undefined => {
//   // otool prints each linker option as `string #n <option>`; keep the option
//   // exactly, including surrounding spaces, under otool's ordinal label.
//   const option = /^\s*(string #[1-9]\d*)(?: (.*))?$/u.exec(rawLine);
//   if (option?.[1] !== undefined) return [option[1], option[2] ?? ""];
//   const line = rawLine.trim();
//   // Match time stamp as a whole without swallowing `name stamp plugin.dylib`.
//   const match = /^((?:time stamp)|\S+(?:\s+version)?)(?:\s+(.+))?$/u.exec(line);
export const _l = 159;
