import { createHash } from "node:crypto";
import type { NativeMetadataRecovery } from "./nativeMetadataRecovery.js";

const RTR_SIGNATURE = 0x00525452;
const RTR_ROW_SIZE = 24;

// nativeAotPeParser.ts 1168-1797

/** Parse only the captured x64 PE snapshot. No file reads or Ghidra database writes occur here. */
export const parseNativeAotPe = (
  bytes: Buffer,
  expectedSha256: string,
  maximumSummaryBytes: number,
  loadedImageBase?: string,
  limits = DEFAULT_NATIVE_AOT_PARSER_LIMITS,
): NativeAotPeResult => {
  if (!Number.isSafeInteger(maximumSummaryBytes) || maximumSummaryBytes < 0)
    throw new Error(
      "NativeAOT summary budget must be a non-negative safe integer",
    );
  for (const limit of Object.values(limits))
    if (!Number.isSafeInteger(limit) || limit < 0)
      throw new Error(
        "NativeAOT parser limits must be non-negative safe integers",
      );
  if (bytes.byteLength > limits.sourceBytes)
    return parsedSummary(
      nativeAotSnapshotOverCapacity(
        expectedSha256,
        bytes.byteLength,
        maximumSummaryBytes,
        limits,
      ),
      maximumSummaryBytes,
    );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== expectedSha256)
    throw new Error(
      "NativeAOT snapshot digest does not match the admitted artifact identity",
    );
  let image: PeImage;
  try {
    image = new PeImage(bytes);
  } catch (cause: unknown) {
    return parsedSummary(
      notApplicable(
        sha256,
        cause instanceof Error ? cause.message : "Unsupported PE image",
        "unsupported-layout",
      ),
      maximumSummaryBytes,
    );
  }
  if (
    loadedImageBase !== undefined &&
    BigInt(loadedImageBase) !== image.imageBase
  )
    return parsedSummary(
      notApplicable(
        sha256,
        "Ghidra loaded the PE at a base different from its preferred image base; relocation-aware metadata mapping is not implemented.",
        "unsupported-layout",
      ),
      maximumSummaryBytes,
    );
  const budget = new NativeAotParserBudget(limits);
  image.setBudget(budget);
  const directorySearch = findDirectory(image, bytes, budget);
  if (directorySearch.truncated)
    return parsedSummary(
      {
        ...notApplicable(
          sha256,
          "RTR signature scanning reached the NativeAOT parser work budget; a unique ReadyToRun directory was not established.",
          "no-rtr-header",
        ),
        status: "partial",
        truncated: true,
        output_budget_bytes: maximumSummaryBytes,
        coverage: {
          pointer_candidates_examined: 0,
          pointer_slots_examined: 0,
          scan_bytes_examined: directorySearch.scanBytesExamined,
          scan_bytes_omitted: directorySearch.scanBytesOmitted,
          rtr_signature_scan_bytes_examined: directorySearch.scanBytesExamined,
          rtr_signature_scan_bytes_omitted: directorySearch.scanBytesOmitted,
          method_tables_recovered: 0,
          frozen_string_candidates: 0,
          work_units_examined: budget.workUnits,
          work_budget_units: budget.limits.workUnits,
          source_byte_budget_bytes: budget.limits.sourceBytes,
          working_memory_budget_bytes: budget.limits.workingMemoryBytes,
          working_memory_bytes_peak: budget.workingMemoryBytesPeak,
          ...(budget.truncationReason === undefined
            ? {}
            : { truncation_reason: budget.truncationReason }),
          basis: "no-rtr-header",
        },
        diagnostics: [
          "No metadata hydration was attempted because signature coverage was incomplete.",
        ],
      },
      maximumSummaryBytes,
    );
  if (directorySearch.directory === null && directorySearch.matches === 0)
    return parsedSummary(
      notApplicable(
        sha256,
        "No supported ReadyToRun directory signature was found in initialized non-executable PE sections.",
        "no-rtr-header",
      ),
      maximumSummaryBytes,
    );
  if (directorySearch.matches !== 1 || directorySearch.directory === null)
    return parsedSummary(
      notApplicable(
        sha256,
        "Multiple plausible ReadyToRun directories were found; metadata identity is ambiguous.",
        "unsupported-layout",
      ),
      maximumSummaryBytes,
    );
  const directory = directorySearch.directory;
  if (directory.major !== 9 || directory.minor !== 1)
    return parsedSummary(
      {
        ...notApplicable(
          sha256,
          `RTR ${directory.major}.${directory.minor} is detected but this parser supports only the .NET 8 RTR 9.1 method-table layout.`,
          "unsupported-layout",
        ),
        status: "partial",
        header_address: hex(directory.address),
        discovery: "signature-heuristic",
        format_major: directory.major,
        format_minor: directory.minor,
      },
      maximumSummaryBytes,
    );
  const dehydrated = directory.sections.filter(
    (section) => section.type === DEHYDRATED_DATA,
  );
  if (dehydrated.length !== 1)
    return parsedSummary(
      {
        ...notApplicable(
          sha256,
          "RTR 9.1 directory does not contain exactly one DEHYDRATED_DATA section; metadata recovery is incomplete.",
          "unsupported-layout",
        ),
        status: "partial",
        header_address: hex(directory.address),
        discovery: "signature-heuristic",
        format_major: directory.major,
        format_minor: directory.minor,
      },
      maximumSummaryBytes,
    );
  let overlay: ReturnType<typeof hydrate> = null;
  let hydrationError: string | null = null;
  try {
    overlay = hydrate(image, dehydrated[0] as RtrSection, budget);
  } catch (cause: unknown) {
    hydrationError =
      cause instanceof Error
        ? cause.message
        : "DEHYDRATED_DATA could not be hydrated";
  }
  const discovered = discoverTables(image, overlay, budget);
  const frozen = directory.sections.find(
    (section) => section.type === FROZEN_OBJECT_REGION,
  );
  const isRecoveredStringTable = (address: bigint): boolean => {
    const index = discovered.tables.find(address, budget);
    if (
      budget.truncationReason !== undefined ||
      index < 0 ||
      !discovered.tables.isIncluded(index)
    )
      return false;
    const table = discovered.tables.at(index);
    if (
      table === undefined ||
      (table.flags & 0x7c000000) >>> 26 !== 0x14 ||
      table.baseSize !== 0x16 ||
      table.related === 0n
    )
      return false;
    const related = discovered.tables.find(table.related, budget);
    if (budget.truncationReason !== undefined) return false;
    return related >= 0 && discovered.tables.isIncluded(related);
  };
  const types: NativeAotType[] = [];
  const frozenStrings: NativeAotString[] = [];
  let frozenCandidates = 0;
  let frozenStringsOmitted = 0;
  let frozenScanBytesExamined = 0;
  let frozenStringDataBytesExamined = 0;
  let frozenScanTruncated = false;
  const frozenFirstCandidate =
    frozen === undefined ? 0n : (frozen.start + 7n) & ~7n;
  const frozenCandidateBound =
    frozen === undefined || frozen.end < frozenFirstCandidate + 14n
      ? 0
      : Number((frozen.end - 14n - frozenFirstCandidate) / 8n + 1n);
  const recoveryReason =
    discovered.truncated && discovered.tables.includedCount === 0
      ? "RTR 9.1 was found, but method-table discovery reached its resource budget before determining whether a unique System.Object root exists."
      : discovered.tables.includedCount === 0
        ? "RTR 9.1 was found, but no unique System.Object method-table root could be recovered from the fully examined image pointers."
        : hydrationError;
  const reportLimitations = [
    "Only x64 PE32+ with RTR 9.1 is supported.",
    "No Ghidra database types, labels, functions, or bytes are created or changed.",
    "Names are address identities; original managed type names are unavailable.",
    "Metadata rows omitted to fit the NativeAOT report-byte budget are counted explicitly.",
    "Parser work, parser-owned typed buffers, NativeAOT report JSON, and MCP delivery have separate byte budgets; incomplete scans report examined and unexamined coverage.",
    ...(frozen === undefined
      ? ["The RTR directory has no FROZEN_OBJECT_REGION section."]
      : []),
  ];
  const budgetSkeleton = {
    format: "dotnet-nativeaot",
    status: "complete",
    reason: recoveryReason,
    analysis_artifact_sha256: sha256,
    analysis_mode: "read-only-derived-overlay",
    header_address: hex(directory.address),
    discovery: "signature-heuristic",
    format_major: directory.major,
    format_minor: directory.minor,
    method_tables: discovered.tables.includedCount,
    types: [],
    frozen_strings: [],
    truncated: true,
    types_omitted: discovered.tables.includedCount,
    frozen_strings_omitted: frozenCandidateBound,
    output_budget_bytes: maximumSummaryBytes,
    derived_overlay:
      overlay === null
        ? null
        : {
            address: hex(overlay.base),
            size_bytes: overlay.sizeBytes,
            sha256: overlay.sha256,
          },
    derived_memory: null,
    coverage: {
      pointer_candidates_examined: discovered.pointerCount,
      pointer_slots_examined: discovered.pointerSlotsExamined,
      scan_bytes_examined: discovered.scanBytesExamined,
      scan_bytes_omitted: discovered.scanBytesOmitted,
      rtr_signature_scan_bytes_examined: directorySearch.scanBytesExamined,
      rtr_signature_scan_bytes_omitted: directorySearch.scanBytesOmitted,
      method_table_validation_items_examined:
        discovered.methodTableValidationItemsExamined,
      // Reserve the largest numeric encodings used by the eventual coverage
      // fields so the summary budget remains valid after frozen-region work.
      work_units_examined: budget.limits.workUnits,
      work_budget_units: budget.limits.workUnits,
      source_byte_budget_bytes: budget.limits.sourceBytes,
      working_memory_budget_bytes: budget.limits.workingMemoryBytes,
      working_memory_bytes_peak: budget.limits.workingMemoryBytes,
      truncation_reason: "response-budget",
      method_tables_recovered: discovered.tables.includedCount,
      frozen_string_candidates: 0,
      frozen_scan_bytes_examined: frozenCandidateBound * 8,
      frozen_string_data_bytes_examined:
        frozen === undefined ? 0 : Number(frozen.end - frozen.start),
      frozen_scan_bytes_omitted: frozenCandidateBound * 8,
      basis:
        overlay === null
          ? "raw-image-pointer-scan"
          : "raw-image-and-rehydrated-pointer-scan",
    },
    diagnostics:
      hydrationError === null
        ? []
        : [`Read-only hydration stopped: ${hydrationError}`],
    limitations: reportLimitations,
  };
  let remainingSummaryBytes =
    maximumSummaryBytes - Buffer.byteLength(JSON.stringify(budgetSkeleton));
  if (remainingSummaryBytes < 0)
    throw new Error(
      "NativeAOT metadata summary exceeds its report-byte budget",
    );
  let typesOmitted = 0;
  discovered.tables.forEachIncluded((table) => {
    const row: NativeAotType = { address: hex(table.address), type: null };
    const rowBytes =
      Buffer.byteLength(JSON.stringify(row)) + (types.length > 0 ? 1 : 0);
    if (rowBytes > remainingSummaryBytes) {
      typesOmitted++;
      return;
    }
    types.push(row);
    remainingSummaryBytes -= rowBytes;
  });
  if (frozen !== undefined) {
    let address = frozenFirstCandidate;
    while (address + 14n <= frozen.end) {
      if (!budget.consumeWork(8)) {
        frozenScanTruncated = true;
        break;
      }
      frozenScanBytesExamined += 8;
      const table = readU64(image.read(address, 8));
      if (table === null || !isRecoveredStringTable(table)) {
        address += 8n;
        continue;
      }
      frozenCandidates++;
      const length = readU32(image.read(address + 8n, 4));
      if (length === null || address + 14n + BigInt(length) * 2n > frozen.end) {
        address += 8n;
        continue;
      }
      const stringBytes = length * 2 + 2;
      if (!budget.consumeWork(stringBytes)) {
        frozenScanTruncated = true;
        break;
      }
      frozenStringDataBytesExamined += stringBytes;
      // NativeAOT's System.String layout is the object header, 32-bit length,
      // UTF-16 payload, then the terminating code unit. The payload starts at
      // +12, not +16 (the latter silently shifts every decoded string by two
      // characters and includes adjacent object padding).
      const raw = image.read(address + 12n, stringBytes);
      if (raw === null || raw.readUInt16LE(length * 2) !== 0) {
        address += 8n;
        continue;
      }
      if (!budget.consumeWork(stringBytes)) {
        frozenScanTruncated = true;
        break;
      }
      const rowPrefixBytes = Buffer.byteLength(
        JSON.stringify({ address: hex(address), value: "" }),
      );
      const rowBytes =
        rowPrefixBytes -
        2 +
        jsonUtf16StringBytes(raw, length) +
        (frozenStrings.length > 0 ? 1 : 0);
      if (rowBytes > remainingSummaryBytes) {
        frozenStringsOmitted++;
        address += 8n;
        continue;
      }
      const row: NativeAotString = {
        address: hex(address),
        value: raw.toString("utf16le", 0, length * 2),
      };
      frozenStrings.push(row);
      remainingSummaryBytes -= rowBytes;
      address += 8n;
    }
  }
  const truncated =
    discovered.truncated ||
    frozenScanTruncated ||
    typesOmitted > 0 ||
    frozenStringsOmitted > 0;
  const truncationReason =
    budget.truncationReason ??
    (typesOmitted > 0 || frozenStringsOmitted > 0
      ? "response-budget"
      : undefined);
  const summary: NativeAotReport = {
    format: "dotnet-nativeaot",
    status:
      truncated ||
      hydrationError !== null ||
      discovered.tables.includedCount === 0
        ? "partial"
        : "complete",
    reason: recoveryReason,
    analysis_artifact_sha256: sha256,
    analysis_mode: "read-only-derived-overlay",
    header_address: hex(directory.address),
    discovery: "signature-heuristic",
    format_major: directory.major,
    format_minor: directory.minor,
    method_tables: discovered.tables.includedCount,
    types,
    frozen_strings: frozenStrings,
    truncated,
    types_omitted: typesOmitted,
    frozen_strings_omitted: frozenStringsOmitted,
    output_budget_bytes: maximumSummaryBytes,
    derived_overlay:
      overlay === null
        ? null
        : {
            address: hex(overlay.base),
            size_bytes: overlay.sizeBytes,
            sha256: overlay.sha256,
          },
    derived_memory: null,
    coverage: {
      pointer_candidates_examined: discovered.pointerCount,
      pointer_slots_examined: discovered.pointerSlotsExamined,
      scan_bytes_examined: discovered.scanBytesExamined,
      scan_bytes_omitted: discovered.scanBytesOmitted,
      rtr_signature_scan_bytes_examined: directorySearch.scanBytesExamined,
      rtr_signature_scan_bytes_omitted: directorySearch.scanBytesOmitted,
      method_table_validation_items_examined:
        discovered.methodTableValidationItemsExamined,
      work_units_examined: budget.workUnits,
      work_budget_units: budget.limits.workUnits,
      source_byte_budget_bytes: budget.limits.sourceBytes,
      working_memory_budget_bytes: budget.limits.workingMemoryBytes,
      working_memory_bytes_peak: budget.workingMemoryBytesPeak,
      ...(budget.truncationReason === undefined
        ? truncationReason === undefined
          ? {}
          : { truncation_reason: truncationReason }
        : { truncation_reason: budget.truncationReason }),
      method_tables_recovered: discovered.tables.includedCount,
      frozen_string_candidates: frozenCandidates,
      frozen_scan_bytes_examined: frozenScanBytesExamined,
      frozen_string_data_bytes_examined: frozenStringDataBytesExamined,
      frozen_scan_bytes_omitted: Math.max(
        0,
        frozenCandidateBound * 8 - frozenScanBytesExamined,
      ),
      basis:
        overlay === null
          ? "raw-image-pointer-scan"
          : "raw-image-and-rehydrated-pointer-scan",
    },
    diagnostics:
      hydrationError === null
        ? []
        : [`Read-only hydration stopped: ${hydrationError}`],
    limitations: reportLimitations,
  };
  if (Buffer.byteLength(JSON.stringify(summary)) > maximumSummaryBytes)
    throw new Error(
      "NativeAOT metadata summary exceeded its report-byte budget after serialization",
    );
  const readTypeDetail = (
    address: string,
    maximumBytes: number,
  ): NativeMetadataRecovery | undefined => {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)
      return undefined;
    if (!/^0x[0-9a-f]+$/iu.test(address)) return undefined;
    let tableAddress: bigint;
    try {
      tableAddress = BigInt(address);
    } catch {
      return undefined;
    }
    const detailBudget = new NativeAotParserBudget(limits);
    const tableIndex = discovered.tables.find(tableAddress, detailBudget);
    if (tableIndex < 0 || !discovered.tables.isIncluded(tableIndex))
      return undefined;
    const table = discovered.tables.at(tableIndex);
    if (table === undefined) return undefined;
    const metadata: NativeMetadataRecovery = {
      source: "read-only-derived-overlay",
      format: "dotnet-nativeaot",
      status: "complete",
      header_address: hex(directory.address),
      format_major: directory.major,
      format_minor: directory.minor,
      method_table_address: hex(table.address),
      name_origin: "generated",
      original_name: null,
      base_size_bytes: table.baseSize,
      related_type:
        table.related === 0n
          ? null
          : { address: hex(table.related), type: null },
      interfaces: [],
      virtual_slots: [],
      derived_memory: null,
      truncated: true,
      virtual_slots_omitted: table.slotsCount,
      interfaces_omitted: table.interfacesCount,
      output_budget_bytes: maximumBytes,
      diagnostics: [],
      limitations: [
        "Address-derived MethodTable identity; no original managed type name is available.",
        "This result is parser-derived and does not claim that Ghidra defined a database DataType.",
        "Slot and interface details are generated only for the requested address and bounded by the NativeAOT report-byte budget.",
      ],
    };
    let remaining = maximumBytes - Buffer.byteLength(JSON.stringify(metadata));
    if (remaining < 0) {
      metadata.diagnostics.push(
        "The NativeAOT detail report budget is too small for the requested MethodTable summary.",
      );
      metadata.truncated = true;
      metadata.status = "partial";
      return Buffer.byteLength(JSON.stringify(metadata)) <= maximumBytes
        ? metadata
        : undefined;
    }
    const maxInterfaceRowBytes = Buffer.byteLength(
      JSON.stringify({ address: `0x${"f".repeat(16)}`, type: null }),
    );
    let interfacesOmitted = 0;
    for (let index = 0; index < table.interfacesCount; index++) {
      if (remaining < maxInterfaceRowBytes) {
        interfacesOmitted += table.interfacesCount - index;
        break;
      }
      if (!detailBudget.consumeWork(8)) {
        interfacesOmitted += table.interfacesCount - index;
        break;
      }
      const row = {
        address: hex(table.address),
        type: null,
      };
      const value = readU64(
        image.read(
          table.address + 24n + BigInt((table.slotsCount + index) * 8),
          8,
        ),
      );
      if (value === null) {
        interfacesOmitted += table.interfacesCount - index;
        break;
      }
      row.address = hex(value);
      const rowBytes =
        Buffer.byteLength(JSON.stringify(row)) +
        (metadata.interfaces.length > 0 ? 1 : 0);
      if (rowBytes > remaining) {
        interfacesOmitted++;
        continue;
      }
      metadata.interfaces.push(row);
      remaining -= rowBytes;
    }
    const maxVirtualSlotRowBytes = Buffer.byteLength(
      JSON.stringify({
        slot: 65535,
        slot_address: `0x${"f".repeat(16)}`,
        target_address: `0x${"f".repeat(16)}`,
        procedure_name: null,
        basis: "method-table-pointer",
      }),
    );
    let slotsOmitted = 0;
    for (let slot = 0; slot < table.slotsCount; slot++) {
      if (remaining < maxVirtualSlotRowBytes) {
        slotsOmitted += table.slotsCount - slot;
        break;
      }
      if (!detailBudget.consumeWork(8)) {
        slotsOmitted += table.slotsCount - slot;
        break;
      }
      const value = readU64(
        image.read(table.address + 24n + BigInt(slot * 8), 8),
      );
      if (value === null) {
        slotsOmitted += table.slotsCount - slot;
        break;
      }
      const row = {
        slot,
        slot_address: hex(table.address + 24n + BigInt(slot * 8)),
        target_address: value === 0n ? null : hex(value),
        procedure_name: null,
        basis: "method-table-pointer" as const,
      };
      const rowBytes =
        Buffer.byteLength(JSON.stringify(row)) +
        (metadata.virtual_slots.length > 0 ? 1 : 0);
      if (rowBytes > remaining) {
        slotsOmitted++;
        continue;
      }
      metadata.virtual_slots.push(row);
      remaining -= rowBytes;
    }
    const tableBytes = 24 + (table.slotsCount + table.interfacesCount) * 8;
    // The descriptor size is independent of the source table size. Admit the
    // output representation first, then bound source hashing by parser work.
    const descriptor = {
      address: hex(table.address),
      size_bytes: tableBytes,
      sha256: "0".repeat(64),
      file_offset: null,
    };
    const withDescriptor = { ...metadata, derived_memory: descriptor };
    const descriptorBytes =
      Buffer.byteLength(JSON.stringify(withDescriptor)) -
      Buffer.byteLength(JSON.stringify(metadata));
    if (descriptorBytes <= remaining && detailBudget.consumeWork(tableBytes)) {
      const raw = image.read(table.address, tableBytes);
      if (raw !== null) {
        metadata.derived_memory = {
          ...descriptor,
          sha256: createHash("sha256").update(raw).digest("hex"),
        };
        remaining -= descriptorBytes;
      }
    }
    if (detailBudget.truncationReason !== undefined)
      metadata.diagnostics.push(
        "MethodTable memory hashing stopped at the parser work budget.",
      );
    metadata.interfaces_omitted = interfacesOmitted;
    metadata.virtual_slots_omitted = slotsOmitted;
    metadata.truncated =
      discovered.truncated ||
      hydrationError !== null ||
      detailBudget.truncationReason !== undefined ||
      interfacesOmitted > 0 ||
      slotsOmitted > 0 ||
      metadata.derived_memory === null;
    if (metadata.truncated) metadata.status = "partial";
    if (Buffer.byteLength(JSON.stringify(metadata)) > maximumBytes) {
      metadata.derived_memory = null;
      metadata.interfaces_omitted += metadata.interfaces.length;
      metadata.interfaces.length = 0;
      metadata.virtual_slots_omitted += metadata.virtual_slots.length;
      metadata.virtual_slots.length = 0;
      metadata.diagnostics.push(
        "MethodTable detail rows were omitted because the final serialized report exceeded its byte budget.",
      );
      metadata.truncated = true;
      metadata.status = "partial";
      if (Buffer.byteLength(JSON.stringify(metadata)) > maximumBytes)
        return undefined;
    }
    return metadata;
  };
  return { summary, readTypeDetail };
};
