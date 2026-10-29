export const __stub = 1;
//       "helper called before initialization",
//       `${IMPORT} ${WRAP} ${ROLLDOWN_MODULE_INTEROP}`,
//     ],
//     [
//       "fake helper",
//       `${ROLLDOWN_MODULE_INTEROP}\n__toESM = (mod) => ({BrowserWindow:Fake}); ${IMPORT} ${WRAP}`,
//     ],
//     [
//       "changed getter",
//       `${ROLLDOWN_MODULE_INTEROP.replace("from[k]", "to[k]")}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "replaced copy helper",
//       `${ROLLDOWN_MODULE_INTEROP}\n__copyProps = () => ({}); ${IMPORT} ${WRAP}`,
//     ],
//     [
//       "replaced intrinsic alias",
//       `${ROLLDOWN_MODULE_INTEROP}\n__defProp = () => ({}); ${IMPORT} ${WRAP}`,
//     ],
//     [
//       "shadowed Object",
//       `const Object = customObject; ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "overwritten intrinsic",
//       `Object.create = customCreate; ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "overwritten alias call",
//       `${ROLLDOWN_MODULE_INTEROP}\n__hasOwnProp.call = customCall; ${IMPORT} ${WRAP}`,
//     ],
//     [
//       "overwritten Function bind",
//       `${ROLLDOWN_MODULE_INTEROP}\nFunction.prototype.bind = customBind; ${IMPORT} ${WRAP}`,
//     ],
//     [
//       "conditional conversion",
//       `${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} if (flag) { ${WRAP} }`,
//     ],
//     [
//       "compound assignment",
//       `${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} electron ||= __toESM(electron, 1);`,
//     ],
//     [
//       "other input",
//       `${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} electron = __toESM(other, 1);`,
//     ],
//     [
//       "later overwrite",
//       `${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} electron = unrelated;`,
//     ],
//     [
//       "overwritten constructor",
//       `${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} electron.BrowserWindow = Fake;`,
//     ],
//   ])("does not infer Electron identity after %s", (_name, setup) => {
//     expect(
//       analyzeJavaScriptStaticSource(`${setup}\n${WINDOW}`).electron
//         .browser_windows,
//     ).toEqual([]);
//   });
// });
//
// describe("Electron module interop helper results", () => {
//   it.each([
//     'const {BrowserWindow} = __toESM(require("electron"), 1); new BrowserWindow({});',
//     'const {BrowserWindow: Window} = __toESM(require("electron"), 1); new Window({});',
//     'const {default: {BrowserWindow}} = __toESM(require("electron"), 1); new BrowserWindow({});',
//     'const Window = __toESM(require("electron"), 1).BrowserWindow; new Window({});',
//   ])("preserves a proven result projection: %s", (source) => {
//     expect(
//       analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}\n${source}`)
//         .electron.browser_windows,
//     ).toHaveLength(1);
//   });
//
//   it.each([
//     'const {[key]: Window} = __toESM(require("electron"), 1); new Window({});',
//     'const {...electron} = __toESM(require("electron"), 1); new electron.BrowserWindow({});',
//     'let {BrowserWindow} = __toESM(require("electron"), 1); BrowserWindow = Fake; new BrowserWindow({});',
//   ])("keeps an uncertain result projection unresolved: %s", (source) => {
//     expect(
//       analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}\n${source}`)
//         .electron.browser_windows,
//     ).toEqual([]);
//   });
//
//   it.each([
//     "",
//     ", 0",
//     ", false",
//     ", true",
//     ", 1",
//     ', "node"',
//     ', ""',
//     ", null",
//   ])("preserves named exports with a literal node mode: %s", (mode) => {
//     const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//         const fresh = __toESM(require("electron")${mode});
//         new fresh.BrowserWindow({});
//         const {BrowserWindow} = __toESM(require("electron")${mode});
//         new BrowserWindow({});
//         let electron = require("electron");
//         electron = __toESM(electron${mode}); ${WINDOW}
//       `);
//     expect(analysis.electron.browser_windows).toHaveLength(3);
//   });
//
//   it.each(["", ", 0", ", false"])(
//     "does not assume a module-valued default with node mode: %s",
//     (mode) => {
//       const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//         const original = require("electron");
//         original.__esModule = true;
//         original.default = {BrowserWindow: Fake};
//         const {default: {BrowserWindow}} = __toESM(require("electron")${mode});
//         new BrowserWindow({});
//         const other = __toESM(require("electron")${mode}).default;
//         new other.BrowserWindow({});
//         new (__toESM(require("electron")${mode}).default.BrowserWindow)({});
//       `);
//       expect(analysis.electron.browser_windows).toEqual([]);
//     },
//   );
//
//   it.each(["__toESM", "identity"])(
//     "rejects side-effecting extra arguments to %s",
//     (helper) => {
//       const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//         function identity(mod) { return mod; }
//         const electron = ${helper}(require("electron"), mutate()); ${WINDOW}
//       `);
//       expect(analysis.electron.browser_windows).toEqual([]);
//     },
//   );
//
//   it.each([
//     "const __toESM = () => ({BrowserWindow:FakeWindow});",
//     "const __toESM = async (mod) => mod;",
//     "function* __toESM(mod) { return mod; }",
//     "const __toESM = (this && this.__toESM) || ((mod) => mod);",
//   ])("keeps an unproven fresh result unresolved: %s", (helper) => {
//     const analysis = analyzeJavaScriptStaticSource(`${helper}
//       const electron = __toESM(require("electron"), 1); ${WINDOW}
//       new (__toESM(require("electron"), 1)).BrowserWindow({});
//     `);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
//
//   it("preserves a proven fresh namespace and a pure identity helper", () => {
//     const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//       const electron = __toESM(require("electron"), 1); ${WINDOW}
//       new (__toESM(require("electron"), 1)).BrowserWindow({});
//       function passthrough(value) {return value;}
//       const plain = passthrough(require("electron"));
//       new plain.BrowserWindow({});
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(3);
//   });
// });
//
// describe("Electron module interop pattern writes", () => {
//   it.each([
//     "({Object} = replacements);",
//     "[Function] = replacements;",
//     "({nested:{Object}} = replacements);",
export const _l = 166;
