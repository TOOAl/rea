export const __stub = 1;
// import { constants } from "node:buffer";
// import { createHash } from "node:crypto";
// import type { FileHandle } from "node:fs/promises";
// import { pipeline } from "node:stream/promises";
// import { getHeapStatistics } from "node:v8";
//
// import { asStream, none } from "stream-chain";
// import fun from "stream-chain/fun.js";
// import parser from "stream-json/parser.js";
// import streamValues from "stream-json/streamers/stream-values.js";
// import streamArray from "stream-json/streamers/stream-array.js";
//
// import { RegularFileChangedError } from "../filesystem/RegularFile.js";
// import type { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
// import { withRegularFile } from "./RegularFileRead.js";
// import {
//   JSON_BYTE_ORDER_MARK_MESSAGE,
//   JSON_INPUT_RESOURCE_REMEDIATION,
//   parseUtf8Json,
// } from "./Utf8JsonInput.js";
// import {
//   AnalysisInputError,
//   AnalysisResourceConstraintError,
// } from "../domain/analysisErrorCore.js";
// import { err, ok, type Result } from "../domain/result.js";
//
// type JsonInputFileFailure =
//   | AnalysisInputError
//   | AnalysisResourceConstraintError;
// const READ_CHUNK_BYTES = 64 * 1024;
// const PACKED_TOKEN_PART_CODE_UNITS = 64 * 1024;
// // Retain native-parser speed for modest inputs while bounding its extra copies.
// // This selects an implementation; larger files remain accepted through streaming.
// const NATIVE_PARSE_READ_BUDGET = 8 * 1024 * 1024;
//
// /** Keep native parsing only when input copies and value expansion fit live headroom. */
// const nativeParseFits = (inputBytes: number): boolean =>
//   inputBytes <= NATIVE_PARSE_READ_BUDGET &&
//   // The assembler estimate reserves up to 128 bytes per two-byte container.
//   // Allow that 64x expansion plus byte/text copies before native JSON.parse,
//   // whose individual container allocations cannot be intercepted.
//   inputBytes * 72 + READ_CHUNK_BYTES <=
//     getHeapStatistics().total_available_size;
//
// /** One selected root member; repeated keys begin again with last-value semantics. */
// export interface JsonObjectMemberReader {
//   readonly mode: "value" | "array";
//   readonly begin: () => void;
//   readonly accept: (value: unknown) => void | Promise<void>;
//   readonly reject: (cause: unknown) => void;
// }
//
// /** Scan selected members without retaining skipped subtrees or prior array items. */
// export const readJsonObjectFile = (
//   path: string,
//   operation: string,
//   scans: readonly ReadonlyMap<string, JsonObjectMemberReader>[],
//   signal?: AbortSignal,
//   resources?: ArtifactResourceScope,
// ): Promise<Result<void, JsonInputFileFailure>> =>
//   withRegularFile(
//     path,
//     async (handle, stats) => {
//       let previousDigest: string | undefined;
//       try {
//         const native = await readNativeJson(
//           handle,
//           stats.size,
//           path,
//           operation,
//           signal,
//         );
//         if (native !== undefined) {
//           if (!native.ok) return native;
//           const value = native.value;
//           if (
//             typeof value !== "object" ||
//             value === null ||
//             Array.isArray(value)
//           )
//             return err(
//               invalidJson(operation, "JSON document root must be an object"),
//             );
//           for (const members of scans)
//             for (const [key, member] of members) {
//               if (!Object.hasOwn(value, key)) continue;
//               signal?.throwIfAborted();
//               member.begin();
//               const selected: unknown = Reflect.get(value, key);
//               if (member.mode === "array" && !Array.isArray(selected)) {
//                 member.reject(
//                   new TypeError(`JSON member ${key} must be an array`),
//                 );
//                 continue;
//               }
//               for (const item of member.mode === "array" &&
//               Array.isArray(selected)
//                 ? selected
//                 : [selected]) {
//                 signal?.throwIfAborted();
//                 try {
//                   await member.accept(item);
//                 } catch (cause: unknown) {
//                   member.reject(cause);
//                 }
//               }
//             }
//           return ok(undefined);
//         }
//         for (const members of scans) {
//           const hash = createHash("sha256");
//           let rootObject = false;
//           let depth = 0;
//           let key: string | undefined;
//           let consume:
//             | ((token: parser.Token) => typeof none | Promise<typeof none>)
//             | undefined;
//           await pipeline(
//             decodedChunks(handle, stats.size, path, signal, (bytes) => {
//               hash.update(bytes);
//             }),
//             asStream(
//               fun(
//                 parser({
//                   jsonStreaming: false,
//                   streamValues: false,
//                   packKeys: false,
//                   packStrings: false,
//                   packNumbers: false,
//                 }),
//                 packJsonScalars(operation, stats.size, path),
//                 (token: parser.Token): typeof none | Promise<typeof none> => {
//                   const opens =
//                     token.name === "startObject" || token.name === "startArray";
//                   const closes =
//                     token.name === "endObject" || token.name === "endArray";
//                   if (depth === 0) {
//                     rootObject = token.name === "startObject";
//                   } else if (
//                     rootObject &&
//                     depth === 1 &&
//                     token.name === "keyValue"
//                   ) {
//                     key = token.value;
//                   } else if (rootObject && depth === 1 && !closes) {
//                     const member =
//                       key === undefined ? undefined : members.get(key);
//                     consume = undefined;
//                     if (member !== undefined) {
//                       member.begin();
//                       if (
export const _l = 151;
