export const __stub = 1;
//   const selectedShadowParent =
//     selectedName === undefined || selected === undefined
//       ? undefined
//       : shadowParentOf(selectedName, selected);
//   // NOCASE folds only ASCII letters, as SQLite does when it resolves the
//   // table named by an index or trigger. Fold only for an ordinary table whose
//   // rows can be selected; a selection refused later keeps the exact filter,
//   // so its failure does not depend on declarations under another spelling.
//   const foldDependents =
//     selected?.type === "table" && selectedShadowParent === undefined;
//   const schema: SqliteDatabase["schema"] = {
//     scope,
//     completeness: "complete",
//     tables: [],
//     indexes: [],
//     views: [],
//     triggers: [],
//   };
//   // Raw bytes preserve text without hex expansion; avoid sorter records that
//   // duplicate large names or definitions beyond SQLite's native record limit.
//   const declaration = scope === "inventory" ? "" : ", CAST(sql AS BLOB) AS sql";
//   const selection =
//     scope === "selected_table"
//       ? ` WHERE tbl_name = ? COLLATE ${foldDependents ? "NOCASE" : "BINARY"}`
//       : "";
//   const statement = db.prepare(
//     `SELECT type, CAST(name AS BLOB) AS name, CAST(tbl_name AS BLOB) AS tbl_name, rootpage${declaration} FROM main.sqlite_schema${selection}`,
//   );
//   for (const raw of statement.iterate(
//     ...(selectedName === undefined ? [] : [selectedName]),
//   )) {
//     const parsed = schemaRow.parse(raw);
//     const value = {
//       ...parsed,
//       name: decodeSchemaText(parsed.name, encoding, "name"),
//       tbl_name: decodeSchemaText(parsed.tbl_name, encoding, "table"),
//       sql:
//         parsed.sql === undefined
//           ? undefined
//           : parsed.sql === null
//             ? null
//             : decodeSchemaText(parsed.sql, encoding, "sql"),
//     };
//     if (value.type === "table") {
//       const listed = metadata.get(value.name);
//       if (listed === undefined || listed.type === "view")
//         throw new SqliteInspectionFailure(
//           "format",
//           `SQLite schema/table inventory mismatch: ${value.name}`,
//         );
//       const possibleShadowParent =
//         value.name === selectedName
//           ? selectedShadowParent
//           : shadowParentOf(value.name, listed);
//       const table: SqliteDatabase["schema"]["tables"][number] = {
//         name: value.name,
//         ...(scope === "inventory" ? {} : { sql: value.sql }),
//         root_page: value.rootpage,
//         kind: possibleShadowParent === undefined ? listed.type : "unknown",
//         without_rowid: listed.wr !== 0n,
//         strict: listed.strict !== 0n,
//         column_count:
//           listed.type === "virtual" && listed.ncol === 0 ? null : listed.ncol,
//         columns_completeness: "complete",
//         columns: [],
//       };
//       if (possibleShadowParent !== undefined)
//         limitations.push(
//           `SQLite could not resolve virtual table ${possibleShadowParent.name}. Table ${value.name} may be its shadow table; its kind is unknown and row inspection is unavailable.`,
//         );
//       budget.retain(table);
//       if (scope === "inventory") table.columns_completeness = "not_requested";
//       if (listed.type === "virtual" && scope !== "inventory") {
//         table.columns_completeness = "unsupported";
//         limitations.push(
//           `Virtual table column expansion is not performed: ${value.name}. Its complete stored CREATE statement is retained.`,
//         );
//       } else if (
//         listed.type !== "virtual" &&
//         (scope !== "inventory" || input.table === value.name)
//       ) {
//         const columns = readColumns(
//           db,
//           value.name,
//           scope === "inventory" ? new OutputBudget() : budget,
//         );
//         if (input.table === value.name)
//           selectedTable = { name: table.name, kind: table.kind, columns };
//         if (scope !== "inventory") table.columns = columns;
//       }
//       if (input.table === value.name && selectedTable === undefined)
//         selectedTable = {
//           name: table.name,
//           kind: table.kind,
//           columns: table.columns,
//         };
//       schema.tables.push(table);
//     } else if (value.type === "index") {
//       const index = {
//         name: value.name,
//         table: value.tbl_name,
//         ...(scope === "inventory" ? {} : { sql: value.sql }),
//         root_page: value.rootpage,
//       };
//       budget.retain(index);
//       schema.indexes.push(index);
//     } else if (value.type === "view") {
//       const view = {
//         name: value.name,
//         ...(scope === "inventory" ? {} : { sql: value.sql }),
//       };
//       budget.retain(view);
//       schema.views.push(view);
//     } else {
//       const trigger = {
//         name: value.name,
//         table: triggerTable(value.tbl_name),
//         ...(scope === "inventory" ? {} : { sql: value.sql }),
//       };
//       budget.retain(trigger);
//       schema.triggers.push(trigger);
//     }
//   }
//   return { schema, selectedTable };
// };
//
// const readRows = (
//   db: DatabaseSync,
//   input: InspectSqliteDatabaseInput,
//   table: SelectedTableFacts | undefined,
//   context: {
//     readonly encoding: DatabaseEncoding;
//     readonly budget: OutputBudget;
//   },
// ): SqliteDatabase["rows"] => {
//   const { encoding, budget } = context;
//   if (input.table === undefined) return null;
//   if (table === undefined) throw missingSelectedTable(input.table);
export const _l = 138;
