import type { FileHandle } from "node:fs/promises";
import { getHeapStatistics } from "node:v8";
import parser from "stream-json/parser.js";

import { RegularFileChangedError } from "../filesystem/RegularFile.js";

// JsonInputFileUtils.ts 424-601

const admitJsonAssembly = (
  operation: string,
  inputFileBytes: number,
  path: string,
) => {
  let projectedBytes = 0;
  let nextCheck = 0;
  return (token: parser.Token): parser.Token => {
    if (typeof token !== "object" || token === null || !("name" in token))
      throw new Error("Unexpected JSON assembly token");
    if (token.name === "startObject" || token.name === "startArray") {
      projectedBytes += 128;
    } else if (token.name === "keyValue" || token.name === "stringValue") {
      if (!("value" in token) || typeof token.value !== "string")
        throw new Error("Unexpected packed JSON string");
      projectedBytes += 64 + token.value.length * 2;
    } else if (
      token.name === "numberValue" ||
      token.name === "nullValue" ||
      token.name === "trueValue" ||
      token.name === "falseValue"
    ) {
      projectedBytes += 64;
    }
    if (projectedBytes >= nextCheck) {
      const heap = getHeapStatistics();
      // Conservative capacity for containers, property/array slots and UTF-16
      // values. Keep another whole projection available for container growth,
      // plus the next chunk of estimates between samples. This is admission
      // against live runtime headroom, not a fixed document-size policy.
      const requiredBytes = projectedBytes + READ_CHUNK_BYTES;
      if (requiredBytes > heap.total_available_size)
        throw new AnalysisResourceConstraintError(
          operation,
          "memory",
          "Insufficient heap headroom to materialize the complete JSON value",
          {
            input_path: path,
            input_file_bytes: inputFileBytes,
            projected_value_bytes: projectedBytes,
            assembly_headroom_bytes: requiredBytes,
            available_heap_bytes: heap.total_available_size,
            heap_size_limit_bytes: heap.heap_size_limit,
          },
          { remediationAction: JSON_INPUT_RESOURCE_REMEDIATION },
        );
      nextCheck = projectedBytes + READ_CHUNK_BYTES;
    }
    return token;
  };
};

const requireStringAssemblyHeadroom = (
  operation: string,
  inputFileBytes: number,
  path: string,
  stringCodeUnits: number,
): void => {
  if (stringCodeUnits < PACKED_TOKEN_PART_CODE_UNITS) return;
  const heap = getHeapStatistics();
  // Concatenation or key interning may flatten the retained rope. Reserve its
  // UTF-16 representation and the next coalesced part before that allocation.
  const requiredBytes = 2 * (stringCodeUnits + PACKED_TOKEN_PART_CODE_UNITS);
  if (requiredBytes > heap.total_available_size)
    throw new AnalysisResourceConstraintError(
      operation,
      "memory",
      "Insufficient heap headroom to assemble a complete JSON string",
      {
        input_path: path,
        input_file_bytes: inputFileBytes,
        string_code_units: stringCodeUnits,
        string_assembly_headroom_bytes: requiredBytes,
        available_heap_bytes: heap.total_available_size,
        heap_size_limit_bytes: heap.heap_size_limit,
      },
      {
        remediationAction: JSON_INPUT_RESOURCE_REMEDIATION,
      },
    );
};

async function* decodedChunks(
  handle: FileHandle,
  admittedBytes: number,
  path: string,
  signal: AbortSignal | undefined,
  observe?: (bytes: Uint8Array) => void,
): AsyncGenerator<string> {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  let leading = true;
  const checked = (text: string): string => {
    if (leading && text.length > 0) {
      leading = false;
      if (text.startsWith("\uFEFF")) throw new JsonByteOrderMarkError();
    }
    return text;
  };
  const bytes = Buffer.allocUnsafe(READ_CHUNK_BYTES);
  let observedBytes = 0;
  while (true) {
    signal?.throwIfAborted();
    const read = await handle.read(
      bytes,
      0,
      Math.min(bytes.length, admittedBytes - observedBytes + 1),
      observedBytes,
    );
    signal?.throwIfAborted();
    if (read.bytesRead === 0) break;
    observedBytes += read.bytesRead;
    if (observedBytes > admittedBytes) throw new RegularFileChangedError(path);
    const chunk = bytes.subarray(0, read.bytesRead);
    observe?.(chunk);
    yield checked(decoder.decode(chunk, { stream: true }));
  }
  if (observedBytes !== admittedBytes) throw new RegularFileChangedError(path);
  yield checked(decoder.decode());
}

/** A streamed JSON file begins with a byte-order mark; reported as invalid JSON. */
class JsonByteOrderMarkError extends SyntaxError {
  constructor() {
    super(JSON_BYTE_ORDER_MARK_MESSAGE);
  }
}

const readPrefix = async (
  handle: FileHandle,
  size: number,
  signal: AbortSignal | undefined,
): Promise<{ readonly bytes: Buffer; readonly complete: boolean }> => {
  const bytes = Buffer.allocUnsafe(size);
  let offset = 0;
  while (offset < bytes.length) {
    signal?.throwIfAborted();
    const read = await handle.read(bytes, offset, bytes.length - offset, null);
    signal?.throwIfAborted();
    if (read.bytesRead === 0)
      return { bytes: bytes.subarray(0, offset), complete: true };
    offset += read.bytesRead;
  }
  // One byte beyond the admitted extent proves the selected file changed.
  return { bytes, complete: false };
};

const readNativeJson = async (
  handle: FileHandle,
  size: number,
  path: string,
  operation: string,
  signal?: AbortSignal,
): Promise<Result<unknown, JsonInputFileFailure> | undefined> => {
  if (!nativeParseFits(size)) return undefined;
  const prefix = await readPrefix(handle, size + 1, signal);
  if (!prefix.complete || prefix.bytes.length !== size)
    throw new RegularFileChangedError(path);
  const parsed = parseUtf8Json(
    prefix.bytes,
    operation,
    path,
    "json-file-input",
  );
  return parsed.ok
    ? ok(parsed.value)
    : err(invalidJson(operation, parsed.error, parsed.cause));
};

const invalidJson = (
  operation: string,
  message: string,
  cause?: unknown,
): AnalysisInputError =>
  new AnalysisInputError(
    operation,
    cause === undefined ? undefined : { cause },
    [{ path: [], reason: "invalid_format", expected: "JSON", message }],
  );
