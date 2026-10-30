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

// src/native/parsers/otoolPart2.ts
const parseFields = (block: string): ParsedFields => {
  const rows: Array<readonly [string, string] | undefined> = [];
  for (const rawLine of block.split(/\r?\n/u).slice(1))
    if (rawLine.trim().length > 0) rows.push(parseField(rawLine));
  const occurrences = new Map<string, number>();
  for (const field of rows)
    if (field !== undefined)
      occurrences.set(field[0], (occurrences.get(field[0]) ?? 0) + 1);
  const fields: Record<string, string | number | null> = {};
  const ordinals = new Map<string, number>();
  for (const field of rows) {
    if (field === undefined) continue;
    const [key, value] = field;
    const ordinal = (ordinals.get(key) ?? 0) + 1;
    ordinals.set(key, ordinal);
    const label =
      (occurrences.get(key) ?? 0) > 1 ? `${key} #${String(ordinal)}` : key;
    fields[label] = TEXT_FIELDS.test(key) ? value : (numeric(value) ?? value);
  }
  return { values: fields, rows };
};

/** Names and linker options are text even when they look numeric. */
const TEXT_FIELDS = /^(?:segname|sectname|string #\d+)$/u;

const parseField = (rawLine: string): readonly [string, string] | undefined => {
  // otool prints each linker option as `string #n <option>`; keep the option
  // exactly, including surrounding spaces, under otool's ordinal label.
  const option = /^\s*(string #[1-9]\d*)(?: (.*))?$/u.exec(rawLine);
  if (option?.[1] !== undefined) return [option[1], option[2] ?? ""];
  const line = rawLine.trim();
  // Match time stamp as a whole without swallowing `name stamp plugin.dylib`.
  const match = /^((?:time stamp)|\S+(?:\s+version)?)(?:\s+(.+))?$/u.exec(line);
  return match?.[1] === undefined
    ? undefined
    : [match[1], match[2]?.trim() ?? ""];
};

const requireUniqueField = (parsed: ParsedFields, key: string): void => {
  const matches = parsed.rows.filter((field) => field?.[0] === key);
  const field = matches[0];
  if (matches.length !== 1 || field === undefined)
    throw new TypeError(`otool field ${key} is missing or repeated`);
  // Only options and fixed-width Mach-O names may legitimately be empty.
  if (field[1] === "" && !EMPTY_VALUE_FIELDS.has(key))
    throw new TypeError(`otool field ${key} has no value`);
};

const parseSegment = (
  block: string,
  fields: Readonly<Record<string, string | number | null>>,
): ParsedSegment => ({
  name: machoName(fields, "segname"),
  vm_address: hexField(fields, "vmaddr"),
  vm_size: numberField(fields, "vmsize"),
  file_offset: numberField(fields, "fileoff"),
  file_size: numberField(fields, "filesize"),
  maximum_permissions: permissions(stringField(fields, "maxprot")),
  initial_permissions: permissions(stringField(fields, "initprot")),
  sections: parseSections(block),
});

const parseSections = (block: string): ParsedSection[] =>
  block
    .split(/(?=\n\s*Section\n)/u)
    .slice(1)
    .map((sectionBlock) => {
      const parsed = parseFields(`Section${sectionBlock}`);
      const fields = parsed.values;
      for (const key of [
        "sectname",
        "segname",
        "addr",
        "size",
        "offset",
        "align",
        "flags",
      ])
        requireUniqueField(parsed, key);
      return {
        segment: machoName(fields, "segname"),
        name: machoName(fields, "sectname"),
        address: hexField(fields, "addr"),
        size: numberField(fields, "size"),
        file_offset: numberField(fields, "offset"),
        alignment: sectionAlignment(stringField(fields, "align")),
        flags: (stringField(fields, "flags") ?? "")
          .split(/\s+/u)
          .filter((flag) => flag.length > 0),
      };
    });

const parseBuildTools = (
  block: string,
): Array<{ name: string; version: string }> => {
  const tools: Array<{ name: string; version: string }> = [];
  const lines = block.split(/\r?\n/u).map((line) => line.trim());
  for (let index = 0; index < lines.length - 1; index += 1) {
    const tool = /^tool\s+(.+)$/u.exec(lines[index] ?? "")?.[1];
    const version = /^version\s+(.+)$/u.exec(lines[index + 1] ?? "")?.[1];
    if (tool !== undefined && version !== undefined)
      tools.push({ name: BUILD_TOOL_NAMES.get(tool) ?? tool, version });
  }
  return tools;
};

const permissions = (raw: string | null) => {
  if (raw === null)
    return { read: null, write: null, execute: null, raw: null };
  const numericValue = numeric(raw);
  if (numericValue !== null)
    return {
      read: (numericValue & 1) !== 0,
      write: (numericValue & 2) !== 0,
      execute: (numericValue & 4) !== 0,
      raw,
    };
  if (/^[r-][w-][x-]$/u.test(raw))
    return {
      read: raw[0] === "r",
      write: raw[1] === "w",
      execute: raw[2] === "x",
      raw,
    };
  return { read: null, write: null, execute: null, raw };
};

/** A whole decimal or hexadecimal integer literal, with no surrounding text. */
const NUMERIC_PATTERN = /^(?:0x[a-fA-F0-9]+|\d+)$/u;

const numeric = (value: string): number | null => {
  if (!NUMERIC_PATTERN.test(value)) return null;
  const parsed = Number.parseInt(value, value.startsWith("0x") ? 16 : 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

/**
 * A Mach-O segment or section name exactly as observed. Object files place
 * every section in one unnamed segment, so the empty name is a source value.
 */
const machoName = (
  fields: Readonly<Record<string, string | number | null>>,
  key: "segname" | "sectname",
): string => {
  const name = stringField(fields, key);
  if (name === null) throw new TypeError(`otool field ${key} is missing`);
  return name;
};

const stringField = (
  fields: Readonly<Record<string, string | number | null>>,
  name: string,
): string | null => {
  const value = fields[name];
  return typeof value === "string"
    ? value
    : value === undefined || value === null
      ? null
      : String(value);
};

const numberField = (
  fields: Readonly<Record<string, string | number | null>>,
  name: string,
): number | null => {
  const value = fields[name];
  return typeof value === "number"
    ? value
    : typeof value === "string"
      ? numeric(value)
      : null;
};

const hexField = (
  fields: Readonly<Record<string, string | number | null>>,
  name: string,
): string | null => {
  const value = stringField(fields, name);
  if (value === null || !NUMERIC_PATTERN.test(value)) return null;
  return `0x${BigInt(value).toString(16)}`;
};

const stripOffsetSuffix = (value: string | null): string =>
  value?.replace(/\s+\(offset\s+\d+\)$/u, "") ?? "unknown";

const sectionAlignment = (raw: string | null): number | null => {
  if (raw === null) return null;
  const exponent = numeric(/^2\^(\d+)(?:\s+\(\d+\))?$/u.exec(raw)?.[1] ?? raw);
  return exponent === null || exponent > 52 ? null : 2 ** exponent;
};
