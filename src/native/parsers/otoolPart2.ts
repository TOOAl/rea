export const __stub = 1;
//   const family = cpuType & 0x00ffffff;
//   if (family === 7 || family === 12) return "little";
//   return family === 18 ? "big" : null;
// };
//
// const parseHeader = (
//   output: string,
// ):
//   | {
//       magic: string | null;
//       cpuType: number | null;
//       fileType: string | null;
//       flags: string[];
//       commandCount: number;
//       commandBytes: number;
//     }
//   | undefined => {
//   const lines = output.split(/\r?\n/u).map((line) => line.trim());
//   const columnsLine = lines.findIndex((line) => /(?:^|\s)magic\s/u.test(line));
//   if (columnsLine < 0) return undefined;
//   const columns = lines[columnsLine]?.split(/\s+/u);
//   const dataLine = lines.slice(columnsLine + 1).find((line) => line.length > 0);
//   const values = dataLine?.split(/\s+/u);
//   if (columns === undefined || values === undefined) return undefined;
//   const commandCount = headerValue(columns, values, "ncmds");
//   const commandBytes = headerValue(columns, values, "sizeofcmds");
//   if (commandCount === null || commandBytes === null)
//     throw new TypeError("otool Mach header is missing valid command framing");
//   const fileTypeIndex = columns.indexOf("filetype");
//   const flagsIndex = columns.indexOf("flags");
//   const complete = values.length >= columns.length;
//   const fileTypeValueIndex =
//     flagsIndex >= 0 && fileTypeIndex > flagsIndex
//       ? values.length - (columns.length - fileTypeIndex)
//       : fileTypeIndex;
//   const flagsEnd =
//     flagsIndex >= 0 ? values.length - (columns.length - flagsIndex - 1) : 0;
//   const magicIndex = columns.indexOf("magic");
//   return {
//     magic: magicIndex < 0 ? null : (values[magicIndex] ?? null),
//     cpuType: headerValue(columns, values, "cputype"),
//     commandCount,
//     commandBytes,
//     fileType:
//       complete && fileTypeValueIndex >= 0 && fileTypeValueIndex < values.length
//         ? (values[fileTypeValueIndex] ?? null)
//         : null,
//     flags:
//       !complete || flagsIndex < 0 || flagsIndex >= flagsEnd
//         ? []
//         : values
//             .slice(flagsIndex, flagsEnd)
//             .filter((value) => value.length > 0),
//   };
// };
//
// const headerValue = (
//   columns: readonly string[],
//   values: readonly string[],
//   name: string,
// ): number | null => {
//   const index = columns.indexOf(name);
//   if (index < 0) return null;
//   const flagsIndex = columns.indexOf("flags");
//   const valueIndex =
//     flagsIndex >= 0 && index > flagsIndex
//       ? values.length - (columns.length - index)
//       : index;
//   const value = values[valueIndex];
//   return value === undefined ? null : numeric(value);
// };
//
// const validateLoadCommandFraming = (
//   header: { readonly commandCount: number; readonly commandBytes: number },
//   commands: readonly {
//     readonly index: number;
//     readonly fields: Readonly<Record<string, string | number | null>>;
//   }[],
// ): void => {
//   if (commands.length !== header.commandCount)
//     throw new TypeError(
//       "otool load-command count does not match the Mach header",
//     );
//   let totalBytes = 0;
//   for (const [expectedIndex, command] of commands.entries()) {
//     const size = numberField(command.fields, "cmdsize");
//     if (command.index !== expectedIndex || size === null || size < 8)
//       throw new TypeError("otool load-command sequence or size is invalid");
//     totalBytes += size;
//     if (!Number.isSafeInteger(totalBytes))
//       throw new TypeError("otool load-command byte count is unsafe");
//   }
//   if (totalBytes !== header.commandBytes)
//     throw new TypeError(
//       "otool load-command sizes do not match the Mach header",
//     );
// };
//
// const createLoadCommandState = (
//   headerFlags: readonly string[] | undefined,
// ): ParsedLoadCommands => ({
//   commands: [],
//   segments: [],
//   dependencies: [],
//   entrypoints: [],
//   builds: [],
//   uuid: null,
//   flags: new Set(headerFlags ?? []),
// });
//
// const parseLoadCommand = (block: string, state: ParsedLoadCommands): void => {
//   const indexText = /^Load command (\d+)/u.exec(block)?.[1];
//   if (indexText === undefined) return;
//   const index = Number(indexText);
//   if (!Number.isSafeInteger(index))
//     throw new TypeError("otool load-command index is unsafe");
//   const header = block.split(/\n\s*Section\n/u)[0] ?? block;
//   const parsed = parseFields(header);
//   const fields = parsed.values;
//   const kind = stringField(fields, "cmd");
//   if (kind === null) throw new TypeError("otool load command is missing cmd");
//   for (const key of scalarFields(kind)) requireUniqueField(parsed, key);
//   if (DYLIB_COMMANDS.has(kind)) validateDylibCommandLines(parsed);
//   if (kind === "LC_LINKER_OPTION") validateLinkerOptionLines(parsed);
//   state.commands.push({
//     index,
//     kind,
//     fields,
//   });
//   collectUuid(kind, fields, state);
//   collectEntrypoint(kind, fields, state);
//   collectBuild(kind, block, fields, state);
//   collectDependency(kind, fields, state);
//   collectSegment(kind, block, fields, state);
// };
//
// const validateDylibCommandLines = (parsed: ParsedFields): void => {
//   const encodingFields = DYLIB_ENCODING_FIELDS.filter((key) =>
//     parsed.rows.some((field) => field?.[0] === key),
//   );
//   if (encodingFields.length !== 1)
//     throw new TypeError(
//       "otool dylib command must contain timestamp or options",
//     );
//   for (const key of encodingFields) requireUniqueField(parsed, key);
//   const allowed = new Set([...DYLIB_FIELDS, ...DYLIB_ENCODING_FIELDS]);
//   for (const field of parsed.rows) {
//     const key = field?.[0];
//     if (key === undefined || !allowed.has(key))
//       throw new TypeError(
//         "otool dylib command contains ambiguous multiline text",
//       );
//   }
// };
//
// /** Each declared option appears once, in order, as `string #1..count`. */
// const validateLinkerOptionLines = (parsed: ParsedFields): void => {
//   const count = numberField(parsed.values, "count");
//   const labels = parsed.rows
export const _l = 159;
