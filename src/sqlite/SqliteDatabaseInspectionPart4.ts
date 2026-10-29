export const __stub = 1;
//   if (table.kind === "unknown")
//     throw new SqliteInspectionFailure(
//       "selection",
//       `SQLite cannot determine whether selected table ${input.table} is a shadow table of an unresolved virtual table. Row inspection requires a confirmed ordinary table.`,
//     );
//   if (table.kind !== "table")
//     throw new SqliteInspectionFailure(
//       "selection",
//       `Rows from ${table.kind} table ${input.table} are outside the ordinary-table inspection profile.`,
//     );
//   const limit = input.row_limit ?? SQLITE_ROW_LIMIT_DEFAULT;
//   const visibleColumns = table.columns
//     .filter((column) => column.hidden !== 1)
//     .map((column) => column.name);
//   const columns = input.columns ?? visibleColumns;
//   const available = new Set(visibleColumns);
//   for (const name of columns)
//     if (!available.has(name))
//       throw new SqliteInspectionFailure(
//         "column-selection",
//         `Selected column does not exist with that exact name in table ${input.table}: ${name}`,
//       );
//   const projection = columns
//     .map((name) => {
//       const column = quoteIdentifier(name);
//       return `CASE typeof(${column}) WHEN 'text' THEN 't' || hex(CAST(${column} AS BLOB)) WHEN 'blob' THEN 'b' || hex(${column}) ELSE ${column} END`;
//     })
//     .join(", ");
//   const source = `main.${quoteIdentifier(input.table)} NOT INDEXED`;
//   const lengths = db.prepare(
//     `SELECT ${columns
//       .map((name) => {
//         const column = quoteIdentifier(name);
//         return `CASE typeof(${column}) WHEN 'text' THEN length(CAST(${column} AS BLOB)) WHEN 'blob' THEN length(${column}) ELSE 0 END`;
//       })
//       .join(", ")} FROM ${source} LIMIT ?`,
//   );
//   lengths.setReturnArrays(true);
//   for (const raw of lengths.iterate(limit))
//     budget.beforeProjection(cellByteLengths.parse(raw));
//   const statement = db.prepare(`SELECT ${projection} FROM ${source} LIMIT ?`);
//   statement.setReturnArrays(true);
//   const rows: NonNullable<SqliteDatabase["rows"]> = {
//     table: input.table,
//     columns,
//     values: [],
//     row_limit: limit,
//     returned_rows: 0,
//     truncated: false,
//     order: "unspecified",
//   };
//   for (const raw of statement.iterate(limit)) {
//     const rawRow = arrayRow.parse(raw);
//     // Hex expansion already belongs to the retained-output budget, before decoding/copying cells.
//     budget.beforeDecode(rawRow);
//     const values = rawRow.map((value) => cell(value, encoding));
//     budget.retain(values);
//     rows.values.push(values);
//   }
//   rows.returned_rows = rows.values.length;
//   rows.truncated =
//     db.prepare(`SELECT 1 FROM ${source} LIMIT 1 OFFSET ?`).get(limit) !==
//     undefined;
//   return rows;
// };
//
// /** Query only a provider-owned snapshot; no caller SQL, extensions, views or virtual rows. */
// export const inspectSqliteDatabaseSnapshot = (
//   snapshotPath: string,
//   input: InspectSqliteDatabaseInput,
// ): Inspection => {
//   const db = new DatabaseSync(snapshotPath, {
//     readOnly: true,
//     allowExtension: false,
//     readBigInts: true,
//     enableDoubleQuotedStringLiterals: false,
//     timeout: 0,
//     limits: {
//       length: SQLITE_DATABASE_LIMITS.outputBytes,
//       sqlLength: SQLITE_DATABASE_LIMITS.outputBytes,
//     },
//   });
//   try {
//     const limits: unknown = db.limits;
//     const supported = z
//       .object({
//         length: z
//           .number()
//           .int()
//           .positive()
//           .max(SQLITE_DATABASE_LIMITS.outputBytes),
//         sqlLength: z
//           .number()
//           .int()
//           .positive()
//           .max(SQLITE_DATABASE_LIMITS.outputBytes),
//       })
//       .safeParse(limits);
//     if (!supported.success)
//       throw new SqliteInspectionFailure(
//         "unavailable",
//         "SQLite inspection requires the native DatabaseSync.limits API to bound untrusted values and SQL. Use Node.js 24.15 or newer in the supported 24.x line, or a compatible Node.js 26+ runtime.",
//       );
//     db.exec(
//       "PRAGMA trusted_schema=OFF; PRAGMA query_only=ON; PRAGMA mmap_size=0; PRAGMA cell_size_check=ON; BEGIN;",
//     );
//     const version = z
//       .object({ version: z.string() })
//       .parse(db.prepare("SELECT sqlite_version() AS version").get()).version;
//     const encoding = z
//       .object({ encoding: encodingSchema })
//       .parse(db.prepare("PRAGMA encoding").get()).encoding;
//     const limitations = [
//       "Inspects an offline stable file set. Filesystem identity checks detect observed acquisition changes; they do not establish an atomic snapshot of an actively changing database. Supply an application-created backup or quiescent database/WAL pair.",
//       "The source database and WAL are never opened by SQLite or modified. A private copy may acquire its own WAL-index sidecar and is removed after inspection.",
//       "SQLite reports current schema and selected committed rows from its valid database/WAL state. Deleted records, uncommitted or invalid WAL tails, encrypted databases, forensic recovery, and full integrity verification are outside this profile.",
//       "Stored CREATE statements preserve index/view/trigger definitions. Views, triggers, and virtual/shadow table rows are not executed; virtual-table column expansion is unsupported.",
//       "Selected rows have unspecified order and are a bounded sample. Text display may replace invalid sequences; bytes_hex and encoding preserve SQLite's text byte representation, not original on-disk page offsets.",
//       "Resource boundaries: at most two concurrent inspections per provider; combined input 256 MiB per inspection, complete worker JSON 16 MiB, native SQLite value/record and SQL statement lengths 16 MiB, owned-worker JavaScript heap 256 MiB and supervised deadline 30 seconds. These are distinct from total resident memory; an overall native SQLite heap cap is not claimed. Failures return no partial success.",
//     ];
//     const budget = new OutputBudget();
//     const { schema, selectedTable } = readSchema(db, input, {
//       budget,
//       limitations,
//       encoding,
//     });
//     return {
//       engine: { name: "SQLite", version },
//       database_encoding: encoding,
//       schema,
//       rows: readRows(db, input, selectedTable, { encoding, budget }),
//       limitations,
//     };
//   } finally {
//     db.close();
//   }
// };
export const _l = 137;
