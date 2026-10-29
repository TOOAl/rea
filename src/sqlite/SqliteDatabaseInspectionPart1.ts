export const __stub = 1;
// import { DatabaseSync } from "node:sqlite";
// import { z } from "zod";
// import { jsonParts } from "../domain/jsonSerialization.js";
// import {
//   SQLITE_ROW_LIMIT_DEFAULT,
//   sqliteSchemaScope,
//   type InspectSqliteDatabaseInput,
//   type SqliteDatabase,
//   type SqliteValue,
// } from "../domain/sqlite/sqliteDatabase.js";
// import {
//   SQLITE_DATABASE_LIMITS,
//   SqliteInspectionFailure,
// } from "./SqliteDatabaseLimits.js";
//
// const natural = z
//   .bigint()
//   .nonnegative()
//   .max(BigInt(Number.MAX_SAFE_INTEGER))
//   .transform(Number);
// const schemaRow = z.object({
//   type: z.enum(["table", "index", "view", "trigger"]),
//   name: z.instanceof(Uint8Array),
//   tbl_name: z.instanceof(Uint8Array),
//   rootpage: natural,
//   sql: z.instanceof(Uint8Array).nullable().optional(),
// });
// const tableRow = z.object({
//   schema: z.string(),
//   name: z.string(),
//   type: z.enum(["table", "view", "virtual", "shadow"]),
//   ncol: natural,
//   wr: z.bigint(),
//   strict: z.bigint(),
// });
// const columnRow = z.object({
//   cid: natural,
//   name: z.string(),
//   type: z.string(),
//   notnull: z.bigint(),
//   dflt_value: z.string().nullable(),
//   pk: natural,
//   hidden: z
//     .bigint()
//     .transform(Number)
//     .pipe(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])),
// });
// const arrayRow = z.array(
//   z.union([
//     z.null(),
//     z.bigint(),
//     z.custom<number>(
//       (value) => typeof value === "number" && !Number.isNaN(value),
//     ),
//     z.string(),
//   ]),
// );
// const encodingSchema = z.enum(["UTF-8", "UTF-16le", "UTF-16be"]);
// const cellByteLengths = z.array(z.bigint().nonnegative());
// type DatabaseEncoding = z.output<typeof encodingSchema>;
// type Inspection = Pick<
//   SqliteDatabase,
//   "engine" | "database_encoding" | "schema" | "rows" | "limitations"
// >;
// type SelectedTableFacts = Pick<
//   SqliteDatabase["schema"]["tables"][number],
//   "name" | "kind" | "columns"
// >;
//
// class OutputBudget {
//   #bytes = 1024;
//   retain(value: unknown): void {
//     // Count bounded encoded parts, including escapes, without allocating a
//     // document-sized string just to decide whether it fits the reply.
//     this.#bytes += 1;
//     for (const part of jsonParts(value)) {
//       this.#bytes += Buffer.byteLength(part);
//       if (this.#bytes > SQLITE_DATABASE_LIMITS.outputBytes)
//         throw new SqliteInspectionFailure(
//           "output-limit",
//           "Complete SQLite evidence exceeds the 16 MiB JSON reply budget; no partial success was returned.",
//         );
//     }
//   }
//   beforeDecode(row: z.output<typeof arrayRow>): void {
//     let minimumBytes = this.#bytes;
//     for (const value of row)
//       if (typeof value === "string") minimumBytes += Buffer.byteLength(value);
//     if (minimumBytes > SQLITE_DATABASE_LIMITS.outputBytes)
//       throw new SqliteInspectionFailure(
//         "output-limit",
//         "Selected cells exceed the 16 MiB reply budget before text/hex expansion.",
//       );
//   }
//   beforeProjection(lengths: readonly bigint[]): void {
//     const encodedBytes = lengths.reduce(
//       (total, length) => total + length * 2n,
//       BigInt(lengths.length * 64),
//     );
//     if (
//       encodedBytes + BigInt(this.#bytes) >
//       BigInt(SQLITE_DATABASE_LIMITS.outputBytes)
//     )
//       throw new SqliteInspectionFailure(
//         "output-limit",
//         "Selected row byte lengths exceed the 16 MiB reply budget before hex projection.",
//       );
//   }
// }
// const quoteIdentifier = (name: string): string =>
//   `"${name.replaceAll('"', '""')}"`;
// const missingSelectedTable = (name: string): SqliteInspectionFailure =>
//   new SqliteInspectionFailure(
//     "selection",
//     `Selected ordinary table does not exist with that exact name: ${name}`,
//   );
// // SQLite folds only ASCII letters when matching virtual/shadow table names.
// const sqliteIdentifierKey = (name: string): string =>
//   name.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
// const textEncoding = (encoding: DatabaseEncoding): string =>
//   encoding === "UTF-8"
//     ? "utf-8"
//     : encoding === "UTF-16le"
//       ? "utf-16le"
//       : "utf-16be";
//
// const decodeSchemaText = (
//   value: Uint8Array,
//   encoding: DatabaseEncoding,
//   label: string,
// ): string => {
//   try {
//     return new TextDecoder(textEncoding(encoding), {
//       fatal: true,
//       ignoreBOM: true,
//     }).decode(value);
//   } catch (cause: unknown) {
//     throw new SqliteInspectionFailure(
export const _l = 138;
