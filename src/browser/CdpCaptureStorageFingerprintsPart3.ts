export const __stub = 1;
//         databaseName: input.databaseName,
//         objectStoreName: input.objectStoreName,
//         skipCount,
//         pageSize: STORAGE_ENTRY_PAGE_SIZE,
//       },
//       run.limitations,
//     );
//     const result = recordValue(raw);
//     if (raw === undefined || result === undefined) {
//       run.state.complete = false;
//       return;
//     }
//     if (
//       !Array.isArray(result.objectStoreDataEntries) ||
//       typeof result.hasMore !== "boolean"
//     ) {
//       run.state.complete = false;
//       return;
//     }
//     const entries = recordsValue(result.objectStoreDataEntries);
//     if (entries.length !== result.objectStoreDataEntries.length)
//       run.state.complete = false;
//     for (const entry of entries) {
//       const key = stableValue(entry.key);
//       const primaryKey = stableValue(entry.primaryKey);
//       // A missing remote object is an omission, not the JavaScript value
//       // "undefined". Keep the unavailable digest null and coverage partial.
//       const value =
//         entry.value === undefined ? undefined : stableValue(entry.value);
//       addFingerprint(run.state, {
//         scope: "indexed_db_record",
//         identity: {
//           database: input.databaseName,
//           store: input.objectStoreName,
//           key,
//           primaryKey,
//         },
//         value,
//         complete:
//           remoteObjectComplete(entry.key) &&
//           remoteObjectComplete(entry.primaryKey) &&
//           remoteObjectComplete(entry.value),
//       });
//     }
//     if (result.hasMore !== true) return;
//     if (
//       entries.length === 0 ||
//       skipCount > Number.MAX_SAFE_INTEGER - entries.length
//     ) {
//       run.state.complete = false;
//       return;
//     }
//     skipCount += entries.length;
//   }
// };
//
// const addCaches = async (
//   run: FingerprintRun,
//   caches: readonly CapturedCache[],
// ): Promise<void> => {
//   for (const cache of caches) {
//     let skipCount = 0;
//     let returnCount: number | undefined;
//     while (returnCount === undefined || skipCount < returnCount) {
//       const raw = await optionalCdpCommand(
//         run.context,
//         "CacheStorage.requestEntries",
//         { cacheId: cache.id, skipCount, pageSize: STORAGE_ENTRY_PAGE_SIZE },
//         run.limitations,
//       );
//       const result = recordValue(raw);
//       if (raw === undefined || result === undefined) {
//         run.state.complete = false;
//         break;
//       }
//       if (
//         !Array.isArray(result.cacheDataEntries) ||
//         typeof result.returnCount !== "number" ||
//         !Number.isSafeInteger(result.returnCount) ||
//         result.returnCount < 0
//       ) {
//         run.state.complete = false;
//         break;
//       }
//       const entries = recordsValue(result.cacheDataEntries);
//       if (entries.length !== result.cacheDataEntries.length)
//         run.state.complete = false;
//       for (const entry of entries) await addCacheEntry(run, cache, entry);
//       returnCount = result.returnCount;
//       if (skipCount + entries.length >= returnCount) break;
//       if (
//         entries.length === 0 ||
//         skipCount > Number.MAX_SAFE_INTEGER - entries.length
//       ) {
//         run.state.complete = false;
//         break;
//       }
//       skipCount += entries.length;
//     }
//   }
// };
//
// const addCacheEntry = async (
//   run: FingerprintRun,
//   cache: CapturedCache,
//   entry: Readonly<Record<string, unknown>>,
// ): Promise<void> => {
//   const requestURL = cdpStringValue(entry.requestURL);
//   const requestMethod = cdpStringValue(entry.requestMethod);
//   if (requestURL === undefined || requestMethod === undefined) {
//     run.state.complete = false;
//     return;
//   }
//   if (!Array.isArray(entry.requestHeaders)) {
//     run.state.complete = false;
//     return;
//   }
//   const headerRecords = recordsValue(entry.requestHeaders);
//   const requestHeaders = headerRecords.flatMap((header) => {
//     const name = cdpStringValue(header.name);
//     const value = cdpStringValue(header.value);
//     return name === undefined || value === undefined ? [] : [{ name, value }];
//   });
//   if (
//     headerRecords.length !== entry.requestHeaders.length ||
//     requestHeaders.length !== headerRecords.length
//   ) {
//     run.state.complete = false;
//     return;
//   }
//   const raw = await optionalCdpCommand(
//     run.context,
//     "CacheStorage.requestCachedResponse",
//     { cacheId: cache.id, requestURL, requestHeaders },
//     run.limitations,
//   );
//   const body = cdpStringValue(recordValue(recordValue(raw)?.response)?.body);
//   const decoded = body === undefined ? null : decodeBase64(body);
//   const complete = decoded !== null;
export const _l = 139;
