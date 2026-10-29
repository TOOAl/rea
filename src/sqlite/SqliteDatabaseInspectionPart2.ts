export const __stub = 1;
//       "format",
//       `SQLite schema ${label} contains malformed ${encoding} text: ${cause instanceof Error ? cause.message : String(cause)}`,
//     );
//   }
// };
//
// const cell = (
//   value: z.output<typeof arrayRow>[number],
//   encoding: DatabaseEncoding,
// ): SqliteValue => {
//   if (value === null) return { type: "null" };
//   if (typeof value === "bigint")
//     return { type: "integer", value: String(value) };
//   if (typeof value === "number")
//     return {
//       type: "real",
//       value:
//         value === Infinity
//           ? "Infinity"
//           : value === -Infinity
//             ? "-Infinity"
//             : Object.is(value, -0)
//               ? "-0"
//               : value,
//     };
//   const hex = value.slice(1).toLowerCase();
//   if (!/^(?:[0-9a-f]{2})*$/.test(hex))
//     throw new SqliteInspectionFailure(
//       "format",
//       "SQLite returned an invalid encoded cell.",
//     );
//   if (value[0] === "b") return { type: "blob", hex };
//   if (value[0] !== "t")
//     throw new SqliteInspectionFailure(
//       "format",
//       "SQLite returned an unknown encoded cell type.",
//     );
//   return {
//     type: "text",
//     value: new TextDecoder(textEncoding(encoding), { ignoreBOM: true }).decode(
//       Buffer.from(hex, "hex"),
//     ),
//     bytes_hex: hex,
//     encoding,
//   };
// };
//
// const readColumns = (
//   db: DatabaseSync,
//   name: string,
//   budget: OutputBudget,
// ): SqliteDatabase["schema"]["tables"][number]["columns"] => {
//   const columns: SqliteDatabase["schema"]["tables"][number]["columns"] = [];
//   // Direct PRAGMA syntax cannot be shadowed by a stored table or view.
//   for (const raw of db
//     .prepare(`PRAGMA main.table_xinfo(${quoteIdentifier(name)})`)
//     .iterate()) {
//     const value = columnRow.parse(raw);
//     const column = {
//       cid: value.cid,
//       name: value.name,
//       declared_type: value.type,
//       not_null: value.notnull !== 0n,
//       default_sql: value.dflt_value,
//       primary_key_position: value.pk,
//       hidden: value.hidden,
//     };
//     budget.retain(column);
//     columns.push(column);
//   }
//   return columns;
// };
//
// const readSchema = (
//   db: DatabaseSync,
//   input: InspectSqliteDatabaseInput,
//   context: {
//     readonly budget: OutputBudget;
//     readonly limitations: string[];
//     readonly encoding: DatabaseEncoding;
//   },
// ): {
//   schema: SqliteDatabase["schema"];
//   selectedTable: SelectedTableFacts | undefined;
// } => {
//   const { budget, limitations, encoding } = context;
//   const scope = sqliteSchemaScope(input);
//   const selectedName = scope === "selected_table" ? input.table : undefined;
//   if (scope === "selected_table" && selectedName === undefined)
//     throw new SqliteInspectionFailure(
//       "selection",
//       "Selected-table schema scope requires an exact table name.",
//     );
//   let selectedTable: SelectedTableFacts | undefined;
//   const metadata = new Map<string, z.output<typeof tableRow>>();
//   // Names bound the minimum eventual schema output while metadata is collected.
//   // The full schema objects below account for them in the actual reply budget.
//   const metadataBudget = new OutputBudget();
//   for (const raw of db.prepare("PRAGMA main.table_list").iterate()) {
//     const value = tableRow.parse(raw);
//     if (value.schema === "main") {
//       metadataBudget.retain(value.name);
//       metadata.set(value.name, value);
//     }
//   }
//   // A trigger stores its target as written in CREATE TRIGGER, which SQLite
//   // resolves by ASCII case folding; report the stored table or view name.
//   // A selected-table scan returns only the selected table's dependents, and
//   // other scopes fold stored names once, only when a spelling differs.
//   let foldedNames: Map<string, string> | undefined;
//   const triggerTable = (written: string): string => {
//     if (selectedName !== undefined) return selectedName;
//     if (metadata.has(written)) return written;
//     foldedNames ??= new Map(
//       [...metadata.keys()].map((name) => [sqliteIdentifierKey(name), name]),
//     );
//     return foldedNames.get(sqliteIdentifierKey(written)) ?? written;
//   };
//   const unresolvedVirtualTables = [...metadata.values()]
//     .filter((value) => value.type === "virtual" && value.ncol === 0)
//     .map((value) => ({
//       name: value.name,
//       prefix: sqliteIdentifierKey(`${value.name}_`),
//     }));
//   const shadowParentOf = (
//     name: string,
//     listed: z.output<typeof tableRow>,
//   ): (typeof unresolvedVirtualTables)[number] | undefined => {
//     if (listed.type !== "table") return undefined;
//     const identifier = sqliteIdentifierKey(name);
//     return unresolvedVirtualTables.find((parent) =>
//       identifier.startsWith(parent.prefix),
//     );
//   };
//   const selected =
//     selectedName === undefined ? undefined : metadata.get(selectedName);
//   if (selectedName !== undefined && selected === undefined)
//     throw missingSelectedTable(selectedName);
export const _l = 138;
