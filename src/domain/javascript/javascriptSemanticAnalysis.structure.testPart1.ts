export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { analyzeJavaScriptSemantics } from "./javascriptSemanticAnalysis.js";
// import {
//   programScope,
//   bindingById,
//   bindingsNamed,
//   onlyBinding,
//   topLevelBinding,
//   origin,
// } from "./javascriptSemanticAnalysis.fixture.js";
//
// describe("JavaScript semantic analysis: ESM import origins", () => {
//   it.each(["", "a", "0"])(
//     "preserves exact ESM import name %j in binding origins",
//     (name) => {
//       const ir = analyzeJavaScriptSemantics(
//         "import { " +
//           JSON.stringify(name) +
//           ' as selected } from "./module.mjs"; const alias = selected; export { alias };',
//       );
//       for (const binding of ["selected", "alias"])
//         expect(origin(topLevelBinding(ir, binding))).toEqual({
//           specifier: "./module.mjs",
//           importedPath: [name],
//         });
//       expect(ir.moduleLinks).toContainEqual(
//         expect.objectContaining({
//           kind: "import",
//           importedName: name,
//           localName: "selected",
//         }),
//       );
//     },
//   );
//
//   it("keeps default and namespace import origins distinct from an empty named import", () => {
//     const ir = analyzeJavaScriptSemantics(
//       'import value from "./module.mjs"; import * as namespace from "./module.mjs";',
//     );
//     expect(origin(topLevelBinding(ir, "value"))).toEqual({
//       specifier: "./module.mjs",
//       importedPath: ["default"],
//     });
//     expect(origin(topLevelBinding(ir, "namespace"))).toEqual({
//       specifier: "./module.mjs",
//       importedPath: [],
//     });
//   });
// });
//
// describe("JavaScript semantic analysis: structure 1", () => {
//   it("resolves imports, require destructuring, aliases, assignments, and shadowing", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       import { ipcRenderer as ir } from "electron";
//       const { ipcMain: bus } = require("electron");
//       const forwarded = bus;
//       let assigned;
//       assigned = ir;
//       ir.invoke("outside");
//       bus.handle("main", handler);
//       function local(ipcRenderer) {
//         const bus = require("./local-bus.js");
//         ipcRenderer.send("shadowed");
//         return bus;
//       }
//     `);
//
//     expect(ir.coverage).toEqual({
//       status: "complete",
//       omittedCount: 0,
//     });
//     expect(origin(topLevelBinding(ir, "ir"))).toEqual({
//       specifier: "electron",
//       importedPath: ["ipcRenderer"],
//     });
//     expect(origin(topLevelBinding(ir, "bus"))).toEqual({
//       specifier: "electron",
//       importedPath: ["ipcMain"],
//       resolutionMode: "require",
//     });
//     expect(origin(topLevelBinding(ir, "forwarded"))).toEqual({
//       specifier: "electron",
//       importedPath: ["ipcMain"],
//       resolutionMode: "require",
//     });
//     expect(topLevelBinding(ir, "assigned").provenance).toMatchObject({
//       status: "ambiguous",
//       origins: [{ specifier: "electron", importedPath: ["ipcRenderer"] }],
//     });
//     expect(ir.moduleLinks).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           kind: "require",
//           specifier: "electron",
//           importedName: "ipcMain",
//           localName: "bus",
//         }),
//       ]),
//     );
//
//     const innerBus = bindingsNamed(ir, "bus").find(
//       ({ scopeId }) => scopeId !== programScope(ir).scopeId,
//     );
//     expect(innerBus).toBeDefined();
//     if (innerBus === undefined) return;
//     expect(origin(innerBus)).toEqual({
//       specifier: "./local-bus.js",
//       importedPath: [],
//       resolutionMode: "require",
//     });
//     const shadow = onlyBinding(ir, "ipcRenderer");
//     expect(shadow.provenance).toEqual({
//       status: "unknown",
//       origins: [],
//       reason: "Parameter provenance depends on caller arguments.",
//     });
//     const shadowReference = ir.references.find(
//       ({ name, bindingId, role }) =>
//         name === "ipcRenderer" &&
//         bindingId === shadow.bindingId &&
//         role === "read",
//     );
//     expect(shadowReference?.resolution).toBe("resolved");
//     expect(shadowReference?.bindingId).not.toBe(
//       topLevelBinding(ir, "ir").bindingId,
//     );
//     if (shadowReference === undefined || shadowReference.bindingId === null)
//       throw new Error("Missing shadow reference");
//     expect(bindingById(ir, shadowReference.bindingId)).toEqual(shadow);
//     expect(
//       ir.references.find(
//         ({ location }) =>
//           location.start.line === shadowReference.location.start.line &&
//           location.start.column === shadowReference.location.start.column,
//       ),
//     ).toEqual(shadowReference);
//   });
//
//   it.each([
//     `function run(require) { const bus = require("electron").ipcMain; return bus; }`,
//     `function run() { const { ipcMain: bus } = require("electron"); function require() {} return bus; }`,
//     `{ const bus = require("electron").ipcMain; const require = localLoader; }`,
//     `import require from "./loader.js"; const bus = require("electron").ipcMain;`,
//   ])(
//     "does not assign CommonJS origins to lexically shadowed require",
//     (source) => {
//       const ir = analyzeJavaScriptSemantics(source);
//       const bus = onlyBinding(ir, "bus");
//       expect(bus.provenance.origins).toEqual([]);
//       expect(ir.moduleLinks.filter(({ kind }) => kind === "require")).toEqual(
//         [],
//       );
//     },
//   );
export const _l = 155;
