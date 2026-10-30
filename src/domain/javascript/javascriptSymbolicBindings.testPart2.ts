export const __stub = 1;
//   expect(resolved).toEqual({
//     kind: "unknown",
//     reason: "initializer not available at this read",
//   });
//   expect(resolver.unresolved).toBe(true);
// });
//
// it("invalidates a bootstrap module slot mutated through an alias", () => {
//   const values = inspectedValues(`(() => {
//     const modules = {
//       1(module) { module.exports = require("electron"); },
//       2(module, exports, load) { inspect(load(1)); inspect(load(3)); },
//       3(module) { module.exports = require("electron"); }
//     };
//     const table = modules;
//     function load(id) { const m = {exports:{}}; modules[id](m,m.exports,load); return m.exports; }
//     table[1] = function(module) { module.exports = require("other"); };
//     delete table[3];
//     load(2);
//   })();`);
//   expect(values).toHaveLength(2);
//   expect(values).toEqual([
//     expect.objectContaining({ kind: "unknown" }),
//     expect.objectContaining({ kind: "unknown" }),
//   ]);
// });
//
// it.each([
//   [
//     "destructuring assignment",
//     `[table[1]] = [function(module) { module.exports = require("other"); }];`,
//   ],
//   ["for-of head", `for (table[1] of replacements) {}`],
//   [
//     "wrapped assignment",
//     `(table as never)[1] = function(module) { module.exports = require("other"); };`,
//   ],
// ])(
//   "invalidates a bootstrap module slot overwritten through %s",
//   (_name, write) => {
//     const values = inspectedValues(`(() => {
//     const modules = {
//       1(module) { module.exports = require("electron"); },
//       2(module, exports, load) { inspect(load(1)); }
//     };
//     const table = modules;
//     function load(id) { const m = {exports:{}}; modules[id](m,m.exports,load); return m.exports; }
//     ${write}
//     load(2);
//   })();`);
//     expect(values).toHaveLength(1);
//     expect(values[0]).toEqual(expect.objectContaining({ kind: "unknown" }));
//   },
// );
//
// it.each([
//   `const electron=require("electron"); const ipc=electron.ipcMain; ipc.handle=()=>null; inspect(electron.ipcMain.handle);`,
//   `require("electron").ipcMain.handle=()=>null; inspect(require("electron").ipcMain.handle);`,
//   `const electron=require("electron"); ({ipcMain:electron.ipcMain}=replacement); inspect(electron.ipcMain);`,
//   `const electron=require("electron"); for(electron.ipcMain of replacements){} inspect(electron.ipcMain);`,
// ])("invalidates visibly overwritten Electron members: %s", (source) => {
//   const values = inspectedValues(source);
//   expect(values).toHaveLength(1);
//   expect(values[0]?.kind).toBe("unknown");
// });
//
// it("does not substitute a lexical or var initializer before its source write", () => {
//   for (const source of [
//     `inspect(value); const value = require("electron");`,
//     `function run() { inspect(value); var value = require("electron"); }`,
//   ]) {
//     const values = inspectedValues(source);
//     expect(values).toHaveLength(1);
//     const value = values[0];
//     if (value === undefined) throw new Error("inspect call result missing");
//     expect(value).toMatchObject({ kind: "unknown" });
//   }
// });
//
// it("keeps function declarations hoisted and checks closures at invocation", () => {
//   const inspected = inspectedValues(`
//     inspect(read);
//     function read() { return value; }
//     function localRead() {
//       const local = require("electron");
//       return local;
//     }
//     const closure = () => value;
//     const value = require("electron");
//     inspect(closure());
//     inspect(localRead());
//   `);
//   expect(inspected[0]).toMatchObject({ kind: "function" });
//   expect(inspected[1]).toEqual({ kind: "external", path: ["electron"] });
//   expect(inspected[2]).toEqual({ kind: "external", path: ["electron"] });
// });
//
// it("keeps a synchronous cross-function callback before initialization unresolved", () => {
//   const { parsed, resolver } = resolverFor(`function outer() {
//       const value = require("electron");
//       return use(() => value);
//     }
//     function use(callback) { return callback(); }
//     inspect(outer());`);
//   const outer = parsed.program.body.find(
//     (statement): statement is t.FunctionDeclaration =>
//       t.isFunctionDeclaration(statement) && statement.id?.name === "outer",
//   );
//   const outerCall = parsed.program.body.find(
//     (statement): statement is t.ExpressionStatement =>
//       t.isExpressionStatement(statement) &&
//       t.isCallExpression(statement.expression) &&
//       t.isIdentifier(statement.expression.callee, { name: "inspect" }),
//   );
//   if (!outer || !outerCall || !t.isCallExpression(outerCall.expression))
//     throw new Error("outer fixture missing");
//   const invocation = outer.body.body.find(
//     (statement): statement is t.ReturnStatement =>
//       t.isReturnStatement(statement),
//   );
//   if (!invocation || !t.isCallExpression(invocation.argument))
//     throw new Error("synchronous callback call missing");
//   const result = resolver.evaluate(
//     invocation.argument,
//     resolver.bind(
//       {
//         kind: "function",
//         node: outer,
//         environment: { values: new Map() },
//         origins: [],
//       },
//       [],
//       outerCall.expression,
//     ),
//   );
//   expect(result).toMatchObject({ kind: "unknown" });
// });
//
// it("uses completed activation provenance for a returned closure", () => {
//   const result = inspectOne(`inspect(use(outer()));
//     function use(callback) { return callback(); }
//     function outer() {
//       const value = require("electron");
//       return () => value;
//     }`);
export const _l = 145;
