import { createHash } from "node:crypto";

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
