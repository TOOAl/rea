import { createHash } from "node:crypto";
import type { NativeMetadataRecovery } from "./nativeMetadataRecovery.js";

const RTR_SIGNATURE = 0x00525452;
const RTR_ROW_SIZE = 24;

// nativeAotPeImage.ts 760-1167

/** Versioned .NET 8 RTR9.1 hydration, adapted from Washi's MIT-licensed
 * `ghidra-nativeaot` at effeb734fc570c32650f88b159608979dc7b423e. The
 * MethodTable layout is cross-checked against the .NET Foundation MIT-licensed
 * MethodTable.h at runtime commit a3b2d40328be0be3f8dd43f0e5cc925b8827b044.
 * See licenses/nativeaot-parser-MIT.txt. Output is an isolated parser overlay;
 * input snapshot bytes stay immutable. */
const hydrate = (
  image: PeImage,
  dehydrated: RtrSection,
  budget: NativeAotParserBudget,
): {
  readonly base: bigint;
  readonly sizeBytes: number;
  readonly sha256: string;
} | null => {
  const length = dehydrated.end - dehydrated.start;
  if (
    length < 5n ||
    length > BigInt(image.virtualBytesRemaining(dehydrated.start))
  )
    throw new Error("DEHYDRATED_DATA length is outside its mapped section");
  const first = image.read(dehydrated.start, Number(length));
  if (first === null)
    throw new Error("DEHYDRATED_DATA leaves captured PE sections");
  const base = readRelativePointer(image, dehydrated.start);
  if (base === null)
    throw new Error("DEHYDRATED_DATA has no hydration base pointer");
  const outputLimit = Math.min(
    image.virtualBytesRemaining(base),
    budget.limits.workUnits - budget.workUnits,
    budget.limits.workingMemoryBytes - budget.workingMemoryBytes,
  );
  if (outputLimit === 0)
    throw new Error(
      "DEHYDRATED_DATA hydration base is outside mapped PE sections",
    );
  let output = Buffer.alloc(Math.min(outputLimit, 64 * 1024));
  if (!budget.reserveWorkingMemory(output.byteLength))
    throw new Error("NativeAOT working-memory budget is exhausted");
  let outputLength = 0;
  let cursor = 4;
  const ensureOutput = (length: number): number => {
    if (
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > outputLimit - outputLength
    ) {
      if (length > budget.limits.workUnits - budget.workUnits)
        throw new Error("NativeAOT parser work budget is exhausted");
      throw new Error("Hydrated metadata exceeds its mapped PE section");
    }
    const start = outputLength;
    const required = start + length;
    if (required > output.length) {
      const capacity = Math.min(
        outputLimit,
        Math.max(
          required,
          Math.min(outputLimit, output.length * 2 || 64 * 1024),
        ),
      );
      if (!budget.reserveWorkingMemory(capacity))
        throw new Error("NativeAOT working-memory budget is exhausted");
      const expanded = Buffer.allocUnsafe(capacity);
      output.copy(expanded, 0, 0, outputLength);
      budget.releaseWorkingMemory(output.byteLength);
      output = expanded;
    }
    outputLength = required;
    return start;
  };
  const append = (chunk: Buffer): void => {
    if (!budget.consumeWork(chunk.length))
      throw new Error("NativeAOT parser work budget is exhausted");
    chunk.copy(output, ensureOutput(chunk.length));
  };
  const appendZero = (length: number): void => {
    if (!budget.consumeWork(length))
      throw new Error("NativeAOT parser work budget is exhausted");
    const start = ensureOutput(length);
    output.fill(0, start, outputLength);
  };
  const appendRel = (target: bigint): void => {
    if (!budget.consumeWork(4))
      throw new Error("NativeAOT parser work budget is exhausted");
    const delta = target - (base + BigInt(outputLength));
    if (delta < -0x80000000n || delta > 0x7fffffffn)
      throw new Error("Hydrated relative pointer does not fit int32");
    const offset = ensureOutput(4);
    output.writeInt32LE(Number(delta), offset);
  };
  const appendPtr = (target: bigint): void => {
    if (!budget.consumeWork(8))
      throw new Error("NativeAOT parser work budget is exhausted");
    const offset = ensureOutput(8);
    output.writeBigUInt64LE(target, offset);
  };
  const readFixup = (index: number): bigint => {
    const fixupLocation = dehydrated.end + BigInt(index * 4);
    const target = readRelativePointer(image, fixupLocation);
    if (target === null)
      throw new Error("DEHYDRATED_DATA fixup leaves captured PE sections");
    return target;
  };
  try {
    while (cursor < first.length) {
      if (!budget.consumeWork(1))
        throw new Error("NativeAOT parser work budget is exhausted");
      const encoded = first[cursor];
      if (encoded === undefined) break;
      cursor++;
      const command = encoded & 7;
      let payload = encoded >>> 3;
      const extraBytes = payload - 28;
      if (extraBytes > 0) {
        if (extraBytes > 3 || cursor > first.length - extraBytes)
          throw new Error("Invalid DEHYDRATED_DATA payload encoding");
        payload = 0;
        for (let i = 0; i < extraBytes; i++)
          payload += (first[cursor++] ?? 0) * 2 ** (8 * i);
        payload += 28;
      }
      switch (command) {
        case 0: {
          if (cursor > first.length - payload)
            throw new Error("DEHYDRATED_DATA COPY leaves its section");
          append(first.subarray(cursor, cursor + payload));
          cursor += payload;
          break;
        }
        case 1:
          appendZero(payload);
          break;
        case 2:
          appendRel(readFixup(payload));
          break;
        case 3:
          appendPtr(readFixup(payload));
          break;
        case 4:
          if (!budget.consumeWork(payload * 4))
            throw new Error("NativeAOT parser work budget is exhausted");
          if (
            payload > Math.floor((first.length - cursor) / 4) ||
            payload > Math.floor((outputLimit - outputLength) / 4)
          )
            throw new Error("Inline relative fixups leave DEHYDRATED_DATA");
          for (let i = 0; i < payload; i++) {
            const target = readRelativePointer(
              image,
              dehydrated.start + BigInt(cursor),
            );
            if (target === null)
              throw new Error("Invalid inline relative pointer");
            cursor += 4;
            appendRel(target);
          }
          break;
        case 5:
          if (!budget.consumeWork(payload * 4))
            throw new Error("NativeAOT parser work budget is exhausted");
          if (
            payload > Math.floor((first.length - cursor) / 4) ||
            payload > Math.floor((outputLimit - outputLength) / 8)
          )
            throw new Error("Inline pointer fixups leave DEHYDRATED_DATA");
          for (let i = 0; i < payload; i++) {
            const target = readRelativePointer(
              image,
              dehydrated.start + BigInt(cursor),
            );
            if (target === null) throw new Error("Invalid inline pointer");
            cursor += 4;
            appendPtr(target);
          }
          break;
        default:
          throw new Error(`Unsupported DEHYDRATED_DATA command ${command}`);
      }
    }
  } catch (cause: unknown) {
    budget.releaseWorkingMemory(output.byteLength);
    throw cause;
  }
  const hydrated = output.subarray(0, outputLength);
  const sha256 = createHash("sha256").update(hydrated).digest("hex");
  image.addOverlay({ base, sizeBytes: outputLength, sha256, bytes: hydrated });
  return { base, sizeBytes: outputLength, sha256 };
};

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
