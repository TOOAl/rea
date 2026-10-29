export const __stub = 1;
//         if (failure !== undefined) return err(failure);
//         throw cause;
//       }
//     },
//     {
//       signal,
//       ...(resources === undefined ? {} : { resources }),
//     },
//   );
//
// const jsonReadFailure = (
//   cause: unknown,
//   operation: string,
//   size: number,
//   path: string,
// ): JsonInputFileFailure | undefined => {
//   if (cause instanceof AnalysisResourceConstraintError) return cause;
//   if (
//     cause instanceof TypeError &&
//     "code" in cause &&
//     cause.code === "ERR_ENCODING_INVALID_ENCODED_DATA"
//   )
//     return invalidJson(operation, "JSON input is not valid UTF-8", cause);
//   if (
//     cause instanceof SyntaxError ||
//     (cause instanceof Error && cause.message.startsWith("Parser "))
//   )
//     return invalidJson(operation, cause.message, cause);
//   if (
//     cause instanceof Error &&
//     ((cause instanceof RangeError &&
//       cause.message === "Invalid string length") ||
//       ("code" in cause && cause.code === "ERR_STRING_TOO_LONG"))
//   )
//     return new AnalysisResourceConstraintError(
//       operation,
//       "memory",
//       "An individual JSON string or number token exceeds the runtime string limit",
//       {
//         input_path: path,
//         input_file_bytes: size,
//         max_string_code_units: constants.MAX_STRING_LENGTH,
//       },
//       {
//         cause,
//         remediationAction: JSON_INPUT_RESOURCE_REMEDIATION,
//       },
//     );
//   return undefined;
// };
//
// const packJsonScalars = (
//   operation: string,
//   inputFileBytes: number,
//   path: string,
// ) => {
//   let kind: "keyValue" | "stringValue" | "numberValue" | undefined;
//   let length = 0;
//   let value = "";
//   let parts: string[] = [];
//   let partLength = 0;
//   return (token: parser.Token): parser.Token | typeof none => {
//     if (typeof token !== "object" || token === null || !("name" in token))
//       throw new Error("Unexpected JSON parser token");
//     switch (token.name) {
//       case "startKey":
//       case "startString":
//         kind = token.name === "startKey" ? "keyValue" : "stringValue";
//         break;
//       case "startNumber":
//         kind = "numberValue";
//         break;
//       case "numberChunk":
//       case "stringChunk":
//         if (
//           kind === undefined ||
//           !("value" in token) ||
//           typeof token.value !== "string"
//         )
//           throw new Error("Unexpected JSON scalar fragment");
//         length += token.value.length;
//         if (length > constants.MAX_STRING_LENGTH)
//           throw new RangeError("Invalid string length");
//         parts.push(token.value);
//         partLength += token.value.length;
//         if (partLength >= PACKED_TOKEN_PART_CODE_UNITS) {
//           // The tokenizer emits short fragments. Coalesce them before retaining
//           // a scalar so millions of substring/rope nodes cannot exhaust the heap
//           // before the native string-length constraint can be reported.
//           requireStringAssemblyHeadroom(
//             operation,
//             inputFileBytes,
//             path,
//             length,
//           );
//           value += parts.join("");
//           parts = [];
//           partLength = 0;
//         }
//         break;
//       case "endKey":
//       case "endString":
//       case "endNumber": {
//         if (kind === undefined) throw new Error("Unexpected JSON scalar end");
//         requireStringAssemblyHeadroom(operation, inputFileBytes, path, length);
//         const packed = { name: kind, value: value + parts.join("") };
//         kind = undefined;
//         length = 0;
//         value = "";
//         parts = [];
//         partLength = 0;
//         return packed;
//       }
//       default:
//         return token;
//     }
//     return none;
//   };
// };
//
// /** Admit the retained value graph before the upstream assembler grows it. */
// const admitJsonAssembly = (
//   operation: string,
//   inputFileBytes: number,
//   path: string,
// ) => {
//   let projectedBytes = 0;
//   let nextCheck = 0;
//   return (token: parser.Token): parser.Token => {
//     if (typeof token !== "object" || token === null || !("name" in token))
//       throw new Error("Unexpected JSON assembly token");
//     if (token.name === "startObject" || token.name === "startArray") {
//       projectedBytes += 128;
//     } else if (token.name === "keyValue" || token.name === "stringValue") {
//       if (!("value" in token) || typeof token.value !== "string")
//         throw new Error("Unexpected packed JSON string");
//       projectedBytes += 64 + token.value.length * 2;
//     } else if (
//       token.name === "numberValue" ||
//       token.name === "nullValue" ||
//       token.name === "trueValue" ||
//       token.name === "falseValue"
//     ) {
//       projectedBytes += 64;
//     }
//     if (projectedBytes >= nextCheck) {
//       const heap = getHeapStatistics();
//       // Conservative capacity for containers, property/array slots and UTF-16
//       // values. Keep another whole projection available for container growth,
//       // plus the next chunk of estimates between samples. This is admission
//       // against live runtime headroom, not a fixed document-size policy.
export const _l = 151;
