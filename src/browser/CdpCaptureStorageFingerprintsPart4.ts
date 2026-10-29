export const __stub = 1;
//   if (!complete) run.state.complete = false;
//   addFingerprint(run.state, {
//     scope: "cache_entry",
//     identity: { cache: cache.name, requestURL, requestMethod, requestHeaders },
//     value: decoded ?? undefined,
//     complete,
//   });
// };
//
// const addFingerprint = (
//   state: FingerprintState,
//   input: {
//     readonly scope: StorageFingerprint["scope"];
//     readonly identity: unknown;
//     readonly value: unknown;
//     readonly complete: boolean;
//   },
// ): void => {
//   state.items.push({
//     scope: input.scope,
//     identity_sha256: digest(input.identity),
//     value_sha256: input.value === undefined ? null : digest(input.value),
//     complete:
//       input.complete &&
//       stableValueComplete(input.identity) &&
//       stableValueComplete(input.value),
//   });
// };
//
// const STORAGE_ENTRY_PAGE_SIZE = 1_000;
//
// const digest = (value: unknown): string =>
//   createHash("sha256").update(encodedValue(value)).digest("hex");
//
// const encodedValue = (value: unknown): Uint8Array | string => {
//   if (value instanceof Uint8Array) return value;
//   const encoded = canonicalize(stableValue(value));
//   if (encoded === undefined) throw new TypeError("Expected canonical JSON");
//   return encoded;
// };
//
// const stableValue = (value: unknown): unknown => {
//   if (
//     value === null ||
//     typeof value === "string" ||
//     typeof value === "number" ||
//     typeof value === "boolean"
//   )
//     return value;
//   if (Array.isArray(value)) return value.map((item) => stableValue(item));
//   const record = recordValue(value);
//   if (record === undefined) return String(value);
//   return Object.fromEntries(
//     Object.entries(record)
//       .filter(([key]) => key !== "objectId" && key !== "customPreview")
//       .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
//       .map(([key, item]) => [key, stableValue(item)]),
//   );
// };
//
// const stableValueComplete = (value: unknown): boolean => {
//   if (value instanceof Uint8Array) return true;
//   if (
//     value === null ||
//     value === undefined ||
//     typeof value === "string" ||
//     typeof value === "number" ||
//     typeof value === "boolean"
//   )
//     return true;
//   if (Array.isArray(value))
//     return value.every((item) => stableValueComplete(item));
//   const record = recordValue(value);
//   if (record === undefined) return false;
//   const entries = Object.entries(record).filter(
//     ([key]) => key !== "objectId" && key !== "customPreview",
//   );
//   return entries.every(([, item]) => stableValueComplete(item));
// };
//
// const remoteObjectComplete = (value: unknown): boolean => {
//   const record = recordValue(value);
//   if (
//     record === undefined ||
//     record.objectId !== undefined ||
//     record.preview !== undefined ||
//     record.customPreview !== undefined ||
//     !stableValueComplete(record)
//   )
//     return false;
//   switch (record.type) {
//     case "undefined":
//       return (
//         record.value === undefined && record.unserializableValue === undefined
//       );
//     case "string":
//     case "boolean":
//       return (
//         typeof record.value === record.type &&
//         record.unserializableValue === undefined
//       );
//     case "number":
//       return record.unserializableValue === undefined
//         ? typeof record.value === "number" && Number.isFinite(record.value)
//         : record.value === undefined &&
//             typeof record.unserializableValue === "string" &&
//             ["-0", "NaN", "Infinity", "-Infinity"].includes(
//               record.unserializableValue,
//             );
//     case "bigint":
//       return (
//         record.value === undefined &&
//         typeof record.unserializableValue === "string" &&
//         /^-?\d+n$/u.test(record.unserializableValue)
//       );
//     case "object":
//       return (
//         record.unserializableValue === undefined &&
//         (record.subtype === "null"
//           ? record.value === null
//           : record.value !== null && typeof record.value === "object")
//       );
//     default:
//       return false;
//   }
// };
//
// const decodeBase64 = (value: string): Buffer | null => {
//   if (
//     value.length % 4 !== 0 ||
//     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
//       value,
//     )
//   )
//     return null;
//   return Buffer.from(value, "base64");
// };
export const _l = 137;
