export const __stub = 1;
//     const path = cdpStringValue(cookie.path);
//     if (
//       name === undefined ||
//       value === undefined ||
//       domain === undefined ||
//       path === undefined
//     ) {
//       run.state.complete = false;
//       continue;
//     }
//     addFingerprint(run.state, {
//       scope: "cookie",
//       identity: {
//         domain,
//         path,
//         name,
//         partition_key: cookie.partitionKey ?? null,
//       },
//       value,
//       complete: true,
//     });
//   }
// };
//
// const addIndexedDb = async (
//   run: FingerprintRun,
//   origin: string,
//   names: readonly string[],
// ): Promise<void> => {
//   for (const databaseName of names) {
//     const raw = await optionalCdpCommand(
//       run.context,
//       "IndexedDB.requestDatabase",
//       { securityOrigin: origin, databaseName },
//       run.limitations,
//     );
//     const database = recordValue(recordValue(raw)?.databaseWithObjectStores);
//     if (raw === undefined || database === undefined) {
//       run.state.complete = false;
//       continue;
//     }
//     if (cdpStringValue(database.name) !== databaseName) {
//       run.state.complete = false;
//       continue;
//     }
//     if (!Array.isArray(database.objectStores)) {
//       run.state.complete = false;
//       continue;
//     }
//     const stores = recordsValue(database.objectStores);
//     if (stores.length !== database.objectStores.length)
//       run.state.complete = false;
//     addFingerprint(run.state, {
//       scope: "indexed_db_schema",
//       identity: databaseName,
//       value: stores.map(indexedDbStoreSchema),
//       complete:
//         stores.length === database.objectStores.length &&
//         indexedDbSchemaComplete(stores),
//     });
//     for (const store of stores) {
//       const objectStoreName = cdpStringValue(store.name);
//       if (objectStoreName === undefined) {
//         run.state.complete = false;
//         continue;
//       }
//       await addIndexedDbRecords(run, {
//         origin,
//         databaseName,
//         objectStoreName,
//       });
//     }
//   }
// };
//
// const indexedDbStoreSchema = (store: Readonly<Record<string, unknown>>) => ({
//   name: cdpStringValue(store.name) ?? null,
//   key_path: stableValue(store.keyPath),
//   auto_increment: store.autoIncrement === true,
//   indexes: recordsValue(store.indexes).map((index) => ({
//     name: cdpStringValue(index.name) ?? null,
//     key_path: stableValue(index.keyPath),
//     unique: index.unique === true,
//     multi_entry: index.multiEntry === true,
//   })),
// });
//
// const indexedDbSchemaComplete = (
//   stores: readonly Readonly<Record<string, unknown>>[],
// ): boolean =>
//   stores.every(
//     (store) =>
//       cdpStringValue(store.name) !== undefined &&
//       indexedDbKeyPathComplete(store.keyPath) &&
//       typeof store.autoIncrement === "boolean" &&
//       Array.isArray(store.indexes) &&
//       recordsValue(store.indexes).length === store.indexes.length &&
//       recordsValue(store.indexes).every(
//         (index) =>
//           cdpStringValue(index.name) !== undefined &&
//           indexedDbKeyPathComplete(index.keyPath) &&
//           typeof index.unique === "boolean" &&
//           typeof index.multiEntry === "boolean",
//       ),
//   );
//
// const indexedDbKeyPathComplete = (value: unknown): boolean => {
//   const keyPath = recordValue(value);
//   if (keyPath === undefined) return false;
//   switch (keyPath.type) {
//     case "null":
//       return true;
//     case "string":
//       return typeof keyPath.string === "string";
//     case "array":
//       return (
//         Array.isArray(keyPath.array) &&
//         keyPath.array.every((key) => typeof key === "string")
//       );
//     default:
//       return false;
//   }
// };
//
// const addIndexedDbRecords = async (
//   run: FingerprintRun,
//   input: {
//     readonly origin: string;
//     readonly databaseName: string;
//     readonly objectStoreName: string;
//   },
// ): Promise<void> => {
//   let skipCount = 0;
//   while (true) {
//     const raw = await optionalCdpCommand(
//       run.context,
//       "IndexedDB.requestData",
//       {
//         securityOrigin: input.origin,
export const _l = 139;
