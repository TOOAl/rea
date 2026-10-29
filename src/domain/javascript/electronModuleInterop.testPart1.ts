export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";
// import { ROLLDOWN_MODULE_INTEROP } from "./javascriptModuleInterop.fixture.js";
//
// const WINDOW =
//   'new electron.BrowserWindow({webPreferences:{preload:"./preload.js"}});';
// const IMPORT = 'let electron = require("electron");';
// const WRAP = "electron = __toESM(electron, 1);";
// // The upstream runtime uses control-body braces that its bundled printer omits.
// // https://github.com/rolldown/rolldown/blob/22a0ab13732d81f2559ad2b7064b688699324889/crates/rolldown/src/runtime/runtime-base.js
// const BLOCK_MODULE_INTEROP = ROLLDOWN_MODULE_INTEROP.replace(
//   'if (from && typeof from === "object" || typeof from === "function") for',
//   'if (from && typeof from === "object" || typeof from === "function") { for',
// )
//   .replace(
//     "if (!__hasOwnProp.call(to, key) && key !== except) __defProp",
//     "if (!__hasOwnProp.call(to, key) && key !== except) { __defProp",
//   )
//   .replace("    });", "    });\n    }")
//   .replace("  return to;", "  }\n  return to;");
//
// describe("Electron module interop identity", () => {
//   it("preserves named APIs through the released Rolldown namespace conversion", () => {
//     const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//       ${IMPORT} ${WRAP} ${WINDOW}
//       new electron.BrowserWindow({webPreferences:{preload:runtimePath}});
//       electron.ipcMain.handle("ping", () => "pong");
//       electron.contextBridge.exposeInMainWorld("api", {ping:true});
//     `);
//     expect(analysis.electron.browser_windows).toMatchObject([
//       { preload_path: "./preload.js" },
//       { preload_path: null },
//     ]);
//     expect(analysis.electron.ipc).toMatchObject([
//       { channel: "ping", side: "main" },
//     ]);
//     expect(analysis.electron.context_bridge_apis).toMatchObject([
//       { api_key: "api" },
//     ]);
//   });
//
//   it("follows lexical identities when helper and parameter names change", () => {
//     const source = `${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} ${WINDOW}`
//       .replaceAll("__toESM", "namespaceOf")
//       .replaceAll("__copyProps", "copyNamed")
//       .replaceAll("mod", "inputModule")
//       .replaceAll("isNodeMode", "nodeMode")
//       .replaceAll("target", "namespaceTarget")
//       .replaceAll("from", "sourceObject");
//     expect(
//       analyzeJavaScriptStaticSource(source).electron.browser_windows,
//     ).toMatchObject([{ preload_path: "./preload.js" }]);
//   });
//
//   it("preserves the same operations through control-body braces", () => {
//     expect(
//       analyzeJavaScriptStaticSource(
//         `${BLOCK_MODULE_INTEROP}\n${IMPORT} ${WRAP} ${WINDOW}`,
//       ).electron.browser_windows,
//     ).toMatchObject([{ preload_path: "./preload.js" }]);
//   });
//
//   it("keeps additional operations inside a control block unresolved", () => {
//     const altered = BLOCK_MODULE_INTEROP.replace(
//       "{ __defProp",
//       "{ from = unrelated; __defProp",
//     );
//     expect(
//       analyzeJavaScriptStaticSource(`${altered}\n${IMPORT} ${WRAP} ${WINDOW}`)
//         .electron.browser_windows,
//     ).toEqual([]);
//   });
// });
//
// const BOUND_INTRINSIC_MUTATIONS: [string, string][] = [
//   [
//     "intrinsic changed through aliased prebound arguments",
//     `const objectAlias = Object; const key = "create"; const define = Object.defineProperty; const mutate = define.bind(null, objectAlias, key); mutate({value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//   ],
//   [
//     "intrinsic changed through nested prebinding",
//     `const first = Object.defineProperty.bind(null, Object); const second = first.bind(null, "create"); second({value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//   ],
//   [
//     "a replaced bound mutator bind method is unknown",
//     `const first = Object.defineProperty.bind(null, Object); first.bind = customBind; const second = first.bind(null, "create"); second({value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//   ],
//   [
//     "intrinsic changed through a computed prebound call",
//     `const mutate = Object.defineProperty.bind(null, Object, "create"); mutate["call"](null, {value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//   ],
//   [
//     "intrinsic changed through a computed prebound apply",
//     `const mutate = Object.defineProperty.bind(null, Object, "create"); mutate["apply"](null, [{value:customCreate}]); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//   ],
//   [
//     "a replaced bind intrinsic makes a prebound mutator unknown",
//     `Function.prototype.bind = customBind; const mutate = Object.defineProperty.bind(null, Object, "create"); mutate({value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//   ],
// ];
//
// describe("Electron module interop uncertainty", () => {
//   it.each([
//     ...BOUND_INTRINSIC_MUTATIONS,
//     [
//       "intrinsic changed through an unresolved mutator target",
//       `Object.defineProperty(getTarget(), "create", {value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed via dynamic apply",
//       `const args = [Object, "getOwnPropertyNames", {value:() => []}]; Object.defineProperty.apply(null, args); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed via spread call",
//       `const args = [Object, "getOwnPropertyNames", {value:() => []}]; Object.defineProperty.call(null, ...args); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed via Reflect.apply",
//       `const args = [Object, "getOwnPropertyNames", {value:() => []}]; Reflect.apply(Object.defineProperty, null, args); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed via spread Reflect.apply",
//       `const args = [null, [Object, "create", {value:customCreate}]]; Reflect.apply(Object.defineProperty, ...args); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed via call",
//       `Object.defineProperty.call(null, Object, "getOwnPropertyNames", {value:() => []}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed via apply",
//       `Object.defineProperty.apply(null, [Object, "getOwnPropertyNames", {value:() => []}]); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed with defineProperty",
//       `Object.defineProperty(Object, "getOwnPropertyNames", {value:() => []}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed with Reflect.set",
//       `Reflect.set(Object, "getOwnPropertyNames", () => []); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed with an aliased mutator",
//       `const change = Object.defineProperty; change(Object, "create", {value:customCreate}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed with assign",
//       `Object.assign(Object, {getOwnPropertyNames:() => []}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "intrinsic changed with defineProperties",
//       `Object.defineProperties(Function.prototype, {bind:{value:customBind}}); ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "overwritten Object global",
//       `Object = customObject; ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "overwritten intrinsic through an alias",
//       `const objectAlias = Object; objectAlias.create = customCreate; ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
//       "overwritten intrinsic through globalThis",
//       `globalThis.Object.create = customCreate; ${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP}`,
//     ],
//     [
export const _l = 166;
