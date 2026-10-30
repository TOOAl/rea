import { createHash } from "node:crypto";
import type { NativeMetadataRecovery } from "./nativeMetadataRecovery.js";

const discoverTables = (
  image: PeImage,
  hydrated: { readonly base: bigint; readonly sizeBytes: number } | null,
  budget: NativeAotParserBudget,
): {
  tables: MethodTableIndex;
  pointerCount: number;
  pointerSlotsExamined: number;
  scanBytesExamined: number;
  scanBytesOmitted: number;
  methodTableValidationItemsExamined: number;
  workBytesExamined: number;
  truncated: boolean;
} => {
  const ranges: { start: bigint; end: bigint }[] = [];
  for (const section of image.sections) {
    if (
      (section.characteristics & 0x40000000) === 0 ||
      (section.characteristics & 0x20000000) !== 0
    )
      continue;
    const extent = fileBackedVirtualExtent(section);
    if (extent > 0) {
      ranges.push({
        start: image.addressForRva(section.rva),
        end: image.addressForRva(section.rva + extent),
      });
    }
  }
  if (hydrated !== null) {
    const section = image.sections.find(
      (candidate) =>
        (candidate.characteristics & 0x40000000) !== 0 &&
        (candidate.characteristics & 0x20000000) === 0 &&
        hydrated.base >= image.addressForRva(candidate.rva) &&
        hydrated.base + BigInt(hydrated.sizeBytes) <=
          image.addressForRva(candidate.rva + virtualExtent(candidate)),
    );
    if (section !== undefined)
      ranges.push({
        start: hydrated.base,
        end: hydrated.base + BigInt(hydrated.sizeBytes),
      });
  }
  ranges.sort((left, right) => (left.start < right.start ? -1 : 1));
  const merged: { start: bigint; end: bigint }[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous !== undefined && range.start <= previous.end) {
      if (range.end > previous.end) previous.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }
  const totalScanBytes = merged.reduce(
    (total, range) => total + Number(range.end - range.start),
    0,
  );
  let pointerCount = 0,
    pointerSlotsExamined = 0,
    scanBytesExamined = 0,
    validationItems = 0,
    workBytesExamined = 0,
    truncated = false;
  const candidates = new MethodTableIndex(budget);
  scan: for (const range of merged) {
    let address = (range.start + 7n) & ~7n;
    while (address + 8n <= range.end) {
      if (!budget.consumeWork(8)) {
        truncated = true;
        break scan;
      }
      const value = readU64(image.read(address, 8));
      pointerSlotsExamined++;
      scanBytesExamined += 8;
      workBytesExamined += 8;
      if (value !== null && value !== 0n) pointerCount++;
      const candidateAddress = address - 8n;
      const header =
        candidateAddress >= image.imageBase
          ? image.read(candidateAddress, 24)
          : null;
      if (header !== null) {
        const flags = header.readUInt32LE(0);
        const elementType = (flags & 0x7c000000) >>> 26;
        const baseSize = header.readUInt32LE(4);
        const related = header.readBigUInt64LE(8);
        const plausibleHeader =
          (elementType === 0x14 || elementType === 0x15) &&
          baseSize >= 16 &&
          baseSize <= 0x10000000 &&
          (related === 0n || image.read(related, 24) !== null);
        if (!plausibleHeader) {
          address += 8n;
          continue;
        }
        const counts = image.read(candidateAddress + 16n, 4);
        if (counts === null) {
          address += 8n;
          continue;
        }
        const itemCount = counts.readUInt16LE(0) + counts.readUInt16LE(2);
        if (!budget.consumeWork(itemCount * 8)) {
          truncated = true;
          break scan;
        }
        validationItems += itemCount;
        workBytesExamined += itemCount * 8;
        const candidate = parseMethodTable(image, candidateAddress, itemCount);
        if (candidate !== null) {
          if (!candidates.append(candidate)) {
            truncated = true;
            break scan;
          }
        }
      }
      address += 8n;
    }
  }
  let objectRoot = -1;
  let objectCount = 0;
  candidates.forEach((candidate, index) => {
    if (
      candidate.flags !== 0x50000000 ||
      candidate.baseSize !== 0x18 ||
      candidate.related !== 0n ||
      candidate.slotsCount !== 3 ||
      candidate.interfacesCount !== 0
    )
      return;
    if (!budget.consumeWork(32)) {
      truncated = true;
      return;
    }
    const vtable = image.read(candidate.address + 24n, 32);
    if (
      vtable !== null &&
      image.isExecutable(vtable.readBigUInt64LE(0)) &&
      image.isExecutable(vtable.readBigUInt64LE(8)) &&
      image.isExecutable(vtable.readBigUInt64LE(16)) &&
      !image.isExecutable(vtable.readBigUInt64LE(24))
    ) {
      objectRoot = index;
      objectCount++;
    }
  });
  if (objectCount !== 1 || objectRoot < 0 || truncated)
    return {
      tables: candidates,
      pointerCount,
      pointerSlotsExamined,
      scanBytesExamined,
      scanBytesOmitted: Math.max(0, totalScanBytes - scanBytesExamined),
      methodTableValidationItemsExamined: validationItems,
      workBytesExamined,
      truncated,
    };
  candidates.include(objectRoot);
  let changed = true;
  while (changed && !truncated) {
    changed = false;
    candidates.forEach((base, baseIndex) => {
      if (truncated || !candidates.isIncluded(baseIndex)) return;
      for (
        let candidateIndex = 0;
        candidateIndex < candidates.count;
        candidateIndex++
      ) {
        if (!budget.consumeWork(8)) {
          truncated = true;
          return;
        }
        const candidate = candidates.at(candidateIndex);
        if (
          candidate !== undefined &&
          candidate.related === base.address &&
          !candidates.isIncluded(candidateIndex)
        ) {
          candidates.include(candidateIndex);
          changed = true;
        }
      }
      for (let index = 0; index < base.interfacesCount; index++) {
        if (!budget.consumeWork(8)) {
          truncated = true;
          return;
        }
        const ifaceAddress = readU64(
          image.read(
            base.address + 24n + BigInt((base.slotsCount + index) * 8),
            8,
          ),
        );
        if (ifaceAddress === null) continue;
        const interfaceIndex = candidates.find(ifaceAddress, budget);
        if (budget.truncationReason !== undefined) {
          truncated = true;
          return;
        }
        if (interfaceIndex >= 0 && !candidates.isIncluded(interfaceIndex)) {
          candidates.include(interfaceIndex);
          changed = true;
        }
      }
    });
  }
  return {
    tables: candidates,
    pointerCount,
    pointerSlotsExamined,
    scanBytesExamined,
    scanBytesOmitted: Math.max(0, totalScanBytes - scanBytesExamined),
    methodTableValidationItemsExamined: validationItems,
    workBytesExamined,
    truncated,
  };
};
