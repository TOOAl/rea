import { constants } from "node:buffer";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { getHeapStatistics } from "node:v8";

import { asStream, none } from "stream-chain";
import fun from "stream-chain/fun.js";
import parser from "stream-json/parser.js";
import streamValues from "stream-json/streamers/stream-values.js";
import streamArray from "stream-json/streamers/stream-array.js";

import { RegularFileChangedError } from "../filesystem/RegularFile.js";
import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { withRegularFile } from "./RegularFileRead.js";
import { JSON_INPUT_RESOURCE_REMEDIATION } from "./Utf8JsonInput.js";
import {
  AnalysisInputError,
  AnalysisResourceConstraintError,
} from "../domain/analysisErrorCore.js";
import { err, ok, type Result } from "../domain/result.js";

type JsonInputFileFailure =
  | AnalysisInputError
  | AnalysisResourceConstraintError;
const READ_CHUNK_BYTES = 64 * 1024;
const PACKED_TOKEN_PART_CODE_UNITS = 64 * 1024;
// Retain native-parser speed for modest inputs while bounding its extra copies.
// This selects an implementation; larger files remain accepted through streaming.
const NATIVE_PARSE_READ_BUDGET = 8 * 1024 * 1024;

/** Keep native parsing only when input copies and value expansion fit live headroom. */
const nativeParseFits = (inputBytes: number): boolean =>
  inputBytes <= NATIVE_PARSE_READ_BUDGET &&
  // The assembler estimate reserves up to 128 bytes per two-byte container.
  // Allow that 64x expansion plus byte/text copies before native JSON.parse,
  // whose individual container allocations cannot be intercepted.
  inputBytes * 72 + READ_CHUNK_BYTES <=
    getHeapStatistics().total_available_size;

/** One selected root member; repeated keys begin again with last-value semantics. */
export interface JsonObjectMemberReader {
  readonly mode: "value" | "array";
  readonly begin: () => void;
  readonly accept: (value: unknown) => void | Promise<void>;
  readonly reject: (cause: unknown) => void;
}

/** Scan selected members without retaining skipped subtrees or prior array items. */
export const readJsonObjectFile = (
  path: string,
  operation: string,
  scans: readonly ReadonlyMap<string, JsonObjectMemberReader>[],
  signal?: AbortSignal,
  resources?: ArtifactResourceScope,
): Promise<Result<void, JsonInputFileFailure>> =>
  withRegularFile(
    path,
    async (handle, stats) => {
      let previousDigest: string | undefined;
      try {
        const native = await readNativeJson(
          handle,
          stats.size,
          path,
          operation,
          signal,
        );
        if (native !== undefined) {
          if (!native.ok) return native;
          const value = native.value;
          if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value)
          )
            return err(
              invalidJson(operation, "JSON document root must be an object"),
            );
          for (const members of scans)
            for (const [key, member] of members) {
              if (!Object.hasOwn(value, key)) continue;
              signal?.throwIfAborted();
              member.begin();
              const selected: unknown = Reflect.get(value, key);
              if (member.mode === "array" && !Array.isArray(selected)) {
                member.reject(
                  new TypeError(`JSON member ${key} must be an array`),
                );
                continue;
              }
              for (const item of member.mode === "array" &&
              Array.isArray(selected)
                ? selected
                : [selected]) {
                signal?.throwIfAborted();
                try {
                  await member.accept(item);
                } catch (cause: unknown) {
                  member.reject(cause);
                }
              }
            }
          return ok(undefined);
        }
        for (const members of scans) {
          const hash = createHash("sha256");
          let rootObject = false;
          let depth = 0;
          let key: string | undefined;
          let consume:
            | ((token: parser.Token) => typeof none | Promise<typeof none>)
            | undefined;
          await pipeline(
            decodedChunks(handle, stats.size, path, signal, (bytes) => {
              hash.update(bytes);
            }),
            asStream(
              fun(
                parser({
                  jsonStreaming: false,
                  streamValues: false,
                  packKeys: false,
                  packStrings: false,
                  packNumbers: false,
                }),
                packJsonScalars(operation, stats.size, path),
                (token: parser.Token): typeof none | Promise<typeof none> => {
                  const opens =
                    token.name === "startObject" || token.name === "startArray";
                  const closes =
                    token.name === "endObject" || token.name === "endArray";
                  if (depth === 0) {
                    rootObject = token.name === "startObject";
                  } else if (
                    rootObject &&
                    depth === 1 &&
                    token.name === "keyValue"
                  ) {
                    key = token.value;
                  } else if (rootObject && depth === 1 && !closes) {
                    const member =
                      key === undefined ? undefined : members.get(key);
                    consume = undefined;
                    if (member !== undefined) {
                      member.begin();
                      if (
                        member.mode === "array" &&
                        token.name !== "startArray"
                      ) {
                        member.reject(
                          new TypeError(`JSON member ${key} must be an array`),
                        );
                      } else {
                        consume = memberConsumer(
                          member,
                          operation,
                          stats.size,
                          path,
                        );
                      }
                    }
                    key = undefined;
                  }
                  const selected = consume;
                  if (opens) depth += 1;
                  if (closes) depth -= 1;
                  if (rootObject && depth === 1 && token.name !== "keyValue")
                    consume = undefined;
                  if (selected === undefined) return none;
                  return selected(token);
                },
              ),
            ),
            signal === undefined ? {} : { signal },
          );
          if (!rootObject)
            return err(
              invalidJson(operation, "JSON document root must be an object"),
            );
          const digest = hash.digest("hex");
          if (previousDigest !== undefined && digest !== previousDigest)
            throw new RegularFileChangedError(path);
          previousDigest = digest;
        }
        return ok(undefined);
      } catch (cause: unknown) {
        const failure = jsonReadFailure(cause, operation, stats.size, path);
        if (failure !== undefined) return err(failure);
        throw cause;
      }
    },
    {
      signal,
      ...(resources === undefined ? {} : { resources }),
    },
  );

const memberConsumer = (
  member: JsonObjectMemberReader,
  operation: string,
  size: number,
  path: string,
) => {
  let admit = admitJsonAssembly(operation, size, path);
  const streamer: parser.TokenConsumer<{ readonly value: unknown }> =
    member.mode === "array" ? streamArray() : streamValues();
  const consume = fun(
    (token: parser.Token) => admit(token),
    streamer,
    (row: unknown): typeof none | Promise<typeof none> => {
      if (typeof row !== "object" || row === null || !("value" in row))
        throw new Error("Unexpected JSON member parser result");
      // The preceding array item has left the assembler; retain only what the
      // consumer owns and use live headroom when admitting the next item.
      admit = admitJsonAssembly(operation, size, path);
      try {
        const accepted = member.accept(row.value);
        if (accepted instanceof Promise)
          return accepted.then(
            () => none,
            (cause: unknown) => {
              member.reject(cause);
              return none;
            },
          );
      } catch (cause: unknown) {
        member.reject(cause);
      }
      return none;
    },
  );
  return (token: parser.Token): typeof none | Promise<typeof none> => {
    const consumed = consume(token);
    return consumed instanceof Promise ? consumed.then(() => none) : none;
  };
};

/** Parse strict UTF-8 JSON without requiring a whole-document string. */
export const readJsonInputFile = (
  path: string,
  operation: string,
  signal?: AbortSignal,
  resources?: ArtifactResourceScope,
): Promise<Result<unknown, JsonInputFileFailure>> =>
  withRegularFile(
    path,
    async (handle, stats) => {
      let found = false;
      let value: unknown;
      try {
        const native = await readNativeJson(
          handle,
          stats.size,
          path,
          operation,
          signal,
        );
        if (native !== undefined) return native;
        await pipeline(
          decodedChunks(handle, stats.size, path, signal),
          // Fuse synchronous token stages so only file chunks cross the async
          // stream boundary. Admission still precedes scalar/value assembly.
          asStream(
            fun(
              parser({
                jsonStreaming: false,
                streamValues: false,
                packKeys: false,
                packStrings: false,
                packNumbers: false,
              }),
              packJsonScalars(operation, stats.size, path),
              admitJsonAssembly(operation, stats.size, path),
              streamValues(),
              (row: unknown): typeof none => {
                if (
                  found ||
                  typeof row !== "object" ||
                  row === null ||
                  !("key" in row) ||
                  row.key !== 0 ||
                  !("value" in row)
                )
                  throw new Error("Unexpected JSON parser result");
                found = true;
                value = row.value;
                return none;
              },
            ),
          ),
          signal === undefined ? {} : { signal },
        );
        return found
          ? ok(value)
          : err(invalidJson(operation, "JSON document is empty"));
      } catch (cause: unknown) {
        const failure = jsonReadFailure(cause, operation, stats.size, path);
        if (failure !== undefined) return err(failure);
        throw cause;
      }
    },
    {
      signal,
      ...(resources === undefined ? {} : { resources }),
    },
  );

const jsonReadFailure = (
  cause: unknown,
  operation: string,
  size: number,
  path: string,
): JsonInputFileFailure | undefined => {
  if (cause instanceof AnalysisResourceConstraintError) return cause;
  if (
    cause instanceof TypeError &&
    "code" in cause &&
    cause.code === "ERR_ENCODING_INVALID_ENCODED_DATA"
  )
    return invalidJson(operation, "JSON input is not valid UTF-8", cause);
  if (
    cause instanceof SyntaxError ||
    (cause instanceof Error && cause.message.startsWith("Parser "))
  )
    return invalidJson(operation, cause.message, cause);
  if (
    cause instanceof Error &&
    ((cause instanceof RangeError &&
      cause.message === "Invalid string length") ||
      ("code" in cause && cause.code === "ERR_STRING_TOO_LONG"))
  )
    return new AnalysisResourceConstraintError(
      operation,
      "memory",
      "An individual JSON string or number token exceeds the runtime string limit",
      {
        input_path: path,
        input_file_bytes: size,
        max_string_code_units: constants.MAX_STRING_LENGTH,
      },
      {
        cause,
        remediationAction: JSON_INPUT_RESOURCE_REMEDIATION,
      },
    );
  return undefined;
};

const packJsonScalars = (
  operation: string,
  inputFileBytes: number,
  path: string,
) => {
  let kind: "keyValue" | "stringValue" | "numberValue" | undefined;
  let length = 0;
  let value = "";
  let parts: string[] = [];
  let partLength = 0;
  return (token: parser.Token): parser.Token | typeof none => {
    if (typeof token !== "object" || token === null || !("name" in token))
      throw new Error("Unexpected JSON parser token");
    switch (token.name) {
      case "startKey":
      case "startString":
        kind = token.name === "startKey" ? "keyValue" : "stringValue";
        break;
      case "startNumber":
        kind = "numberValue";
        break;
      case "numberChunk":
      case "stringChunk":
        if (
          kind === undefined ||
          !("value" in token) ||
          typeof token.value !== "string"
        )
          throw new Error("Unexpected JSON scalar fragment");
        length += token.value.length;
        if (length > constants.MAX_STRING_LENGTH)
          throw new RangeError("Invalid string length");
        parts.push(token.value);
        partLength += token.value.length;
        if (partLength >= PACKED_TOKEN_PART_CODE_UNITS) {
          // The tokenizer emits short fragments. Coalesce them before retaining
          // a scalar so millions of substring/rope nodes cannot exhaust the heap
          // before the native string-length constraint can be reported.
          requireStringAssemblyHeadroom(
            operation,
            inputFileBytes,
            path,
            length,
          );
          value += parts.join("");
          parts = [];
          partLength = 0;
        }
        break;
      case "endKey":
      case "endString":
      case "endNumber": {
        if (kind === undefined) throw new Error("Unexpected JSON scalar end");
        requireStringAssemblyHeadroom(operation, inputFileBytes, path, length);
        const packed = { name: kind, value: value + parts.join("") };
        kind = undefined;
        length = 0;
        value = "";
        parts = [];
        partLength = 0;
        return packed;
      }
      default:
        return token;
    }
    return none;
  };
};

/** Admit the retained value graph before the upstream assembler grows it. */
