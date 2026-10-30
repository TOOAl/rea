import { z } from "zod";

export const binaryLayoutSchema = binaryLayoutObjectSchema.superRefine(
  (value, context) => {
    const size = BigInt(value.artifact.bytes);
    const check = (
      offset: string,
      length: string,
      path: (string | number)[],
    ): void => {
      const start = BigInt(offset);
      const bytes = BigInt(length);
      if (start > size || bytes > size - start)
        context.addIssue({
          code: "custom",
          path,
          message:
            "Reported file-backed range lies outside the selected artifact.",
        });
    };
    const checkLocation = (
      where: z.infer<typeof range>,
      path: (string | number)[],
    ): void => check(where.offset, where.bytes, path);
    const checkName = (
      reported: z.infer<typeof name>,
      path: (string | number)[],
    ): void => {
      if (reported.location !== null)
        checkLocation(reported.location, [...path, "location"]);
    };
    const expectedEntryMeaning =
      value.image_type === "ET_REL"
        ? "not-applicable"
        : value.entry_point.reported_value === "0x0"
          ? "absent"
          : "linked-virtual-address";
    if (value.entry_point.meaning !== expectedEntryMeaning)
      context.addIssue({
        code: "custom",
        path: ["entry_point", "meaning"],
        message:
          "Entry meaning must distinguish zero/unused fields from an actual linked address.",
      });
    for (const [index, section] of value.sections.entries()) {
      if (
        (section.type === "SHT_SYMTAB" || section.type === "SHT_DYNSYM") &&
        value.sections[section.link]?.type !== "SHT_STRTAB"
      )
        context.addIssue({
          code: "custom",
          path: ["sections", index, "link"],
          message:
            "Symbol tables must link to an existing string-table section.",
        });
      if (section.index !== index)
        context.addIssue({
          code: "custom",
          path: ["sections", index, "index"],
          message:
            "Complete section order must preserve original producer indices.",
        });
      checkLocation(section.header_location, [
        "sections",
        index,
        "header_location",
      ]);
      checkName(section.name, ["sections", index, "name"]);
      if (section.file_backing === "file")
        check(section.offset, section.size, ["sections", index]);
    }
    for (const [index, segment] of value.segments.entries()) {
      if (segment.index !== index)
        context.addIssue({
          code: "custom",
          path: ["segments", index, "index"],
          message:
            "Complete segment order must preserve original producer indices.",
        });
      checkLocation(segment.header_location, [
        "segments",
        index,
        "header_location",
      ]);
      const hasFileBytes =
        segment.type !== "PT_NULL" && BigInt(segment.file_size) !== 0n;
      if (segment.file_backing !== (hasFileBytes ? "file" : "none"))
        context.addIssue({
          code: "custom",
          path: ["segments", index, "file_backing"],
          message:
            "File backing must follow the reported segment type and file size.",
        });
      if ((segment.type === "PT_NULL") !== (segment.permissions === null))
        context.addIssue({
          code: "custom",
          path: ["segments", index, "permissions"],
          message:
            "Unused PT_NULL flags have no permission meaning; other segment flags retain their interpretation.",
        });
      if (hasFileBytes)
        check(segment.offset, segment.file_size, ["segments", index]);
    }
    for (const [index, symbol] of value.symbols.entries()) {
      checkLocation(symbol.location, ["symbols", index, "location"]);
      checkName(symbol.name, ["symbols", index, "name"]);
    }
    for (const [index, relocation] of value.relocations.entries())
      checkLocation(relocation.location, ["relocations", index, "location"]);
    validateRelocationReferences(value, context);
    validatePackedRelativeTables(value, context, checkLocation);
    for (const facet of ["needed_libraries", "interpreters"] as const)
      for (const [index, reported] of value.linkage[facet].entries())
        checkName(reported, ["linkage", facet, index]);
  },
);

export type InspectBinaryLayoutInput = z.infer<
  typeof inspectBinaryLayoutInputSchema
>;
export type BinaryLayout = z.infer<typeof binaryLayoutSchema>;

const validateRelocationReferences = (
  value: z.output<typeof binaryLayoutObjectSchema>,
  context: z.RefinementCtx,
): void => {
  const symbols = new Set(
    value.symbols.map(
      (symbol) => `${symbol.table_index}:${symbol.entry_index}`,
    ),
  );
  for (const [index, relocation] of value.relocations.entries()) {
    const owner = value.sections[relocation.section_index];
    const target = relocation.target;
    const targetMatches =
      value.image_type === "ET_REL"
        ? target.kind === "section-offset"
          ? target.section_index !== 0 &&
            target.section_index === owner?.info &&
            value.sections[target.section_index] !== undefined &&
            value.sections[target.section_index]?.type !== "SHT_NULL" &&
            target.offset === relocation.reported_offset
          : target.kind === "unknown-section" &&
            target.reported_section_index === owner?.info &&
            target.offset === relocation.reported_offset &&
            (target.reported_section_index === 0
              ? target.unknown_reason === "undefined-section-reference"
              : value.sections[target.reported_section_index]?.type ===
                  "SHT_NULL" &&
                target.unknown_reason === "inactive-section-header")
        : target.kind === "linked-virtual-address" &&
          target.address === relocation.reported_offset;
    if (!targetMatches)
      context.addIssue({
        code: "custom",
        path: ["relocations", index, "target"],
        message:
          "Relocation target must preserve its reported offset and owner reference; SHN_UNDEF and inactive headers remain unknown rather than resolved sections.",
      });
    const table = value.sections[relocation.symbol_table_index];
    const tableExists =
      relocation.symbol_table_index !== 0 &&
      (table?.type === "SHT_SYMTAB" || table?.type === "SHT_DYNSYM");
    const positiveReferenceExists =
      tableExists &&
      BigInt(table.entry_size) >= 24n &&
      BigInt(relocation.symbol_index) <
        BigInt(table.size) / BigInt(table.entry_size) &&
      symbols.has(
        `${relocation.symbol_table_index}:${relocation.symbol_index}`,
      );
    if (
      (owner?.type !== "SHT_REL" && owner?.type !== "SHT_RELA") ||
      owner.link !== relocation.symbol_table_index ||
      (relocation.symbol_table_index !== 0 && !tableExists) ||
      (relocation.symbol_index !== 0 && !positiveReferenceExists) ||
      relocation.symbol_reference_meaning !==
        (relocation.symbol_index === 0
          ? "zero-symbol-value"
          : "symbol-table-entry")
    )
      context.addIssue({
        code: "custom",
        path: ["relocations", index],
        message:
          "Relocation must preserve its REL/RELA owner and resolve positive symbol indices through the linked symbol table; index zero uses a zero symbol value.",
      });
  }
};

const validatePackedRelativeTables = (
  value: z.output<typeof binaryLayoutObjectSchema>,
  context: z.RefinementCtx,
  checkLocation: (
    location: z.output<typeof range>,
    path: (string | number)[],
  ) => void,
): void => {
  for (const [
    tableIndex,
    table,
  ] of value.packed_relative_relocations.entries()) {
    checkLocation(table.location, [
      "packed_relative_relocations",
      tableIndex,
      "location",
    ]);
    const encodedBytes =
      (table.encoded_bytes_base64.length * 3) / 4 -
      (table.encoded_bytes_base64.endsWith("==")
        ? 2
        : table.encoded_bytes_base64.endsWith("=")
          ? 1
          : 0);
    if (
      !Number.isInteger(encodedBytes) ||
      BigInt(encodedBytes) !== BigInt(table.location.bytes)
    )
      context.addIssue({
        code: "custom",
        path: ["packed_relative_relocations", tableIndex],
        message:
          "Complete packed table bytes must match its original file range.",
      });
    const section = value.sections[table.section_index];
    if (
      section?.type !== "SHT_RELR" ||
      section.offset !== table.location.offset ||
      section.size !== table.location.bytes
    )
      context.addIssue({
        code: "custom",
        path: ["packed_relative_relocations", tableIndex, "section_index"],
        message:
          "Packed relative evidence must retain its original RELR section identity and range.",
      });
    for (const [decoded, entry] of table.entries.entries())
      if (entry.decoded_index !== decoded)
        context.addIssue({
          code: "custom",
          path: ["packed_relative_relocations", tableIndex, "entries", decoded],
          message: "Decoded offsets must preserve upstream iterator order.",
        });
  }
};
