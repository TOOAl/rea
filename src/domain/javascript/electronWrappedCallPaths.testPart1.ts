export const __stub = 1;
// import { describe, expect, it } from "vitest";
// import { analyzeJavaScriptStaticSource } from "./javascriptStaticAnalysis.js";
//
// const bundle = (entry: string) => `(() => {
//  const modules = {
//   2(module) { module.exports = require("electron"); },
//   5(module,exports,load) {
//    const electron=load(2);
//    Object.defineProperty(exports,"__esModule",{value:true});
//    exports.sender = function(channel) {return (...args)=>send(channel,...args)};
//    function send(channel,...args) {electron.ipcRenderer.send(channel,...args)}
//    exports.events = {addListener(channel,handler) {
//     const guarded = (event,...args) => {if (allowed(event)) handler(event,...args)};
//     return electron.ipcMain.addListener(channel,guarded);
//    }};
//   },
//   9(module,exports,load) {const electron=load(2), helper=load(5); ${entry}}
//  };
//  function load(id) {const m={exports:{}};modules[id].call(m.exports,m,m.exports,load);return m.exports;}
//  load(9);
// })();`;
//
// describe("wrapped Electron control-flow alternatives", () => {
//   it.each(["flag ? copy : cut", "flag ? copy : unknownHandler", "choose()"])(
//     "does not select one IPC handler from %s",
//     (handler) => {
//       const result = analyzeJavaScriptStaticSource(`
//         const e = require("electron");
//         const copy = event => event.sender.copy();
//         const cut = event => event.sender.cut();
//         function choose() { if (flag) return copy; }
//         function register(channel, handler) { e.ipcMain.on(channel, handler); }
//         register("test:copy", ${handler});
//       `);
//       expect(result.electron.ipc).toContainEqual(
//         expect.objectContaining({
//           channel: "test:copy",
//           side: "main",
//           handler_kind: "dynamic-expression",
//           resolution_basis: "wrapper-substitution",
//         }),
//       );
//       expect(result.electron.call_paths ?? []).toEqual([]);
//       expect(result.parse_status).toBe("partial");
//     },
//   );
//   it.each(["'ready'", "false", "0", "''", "({})", "(()=>{})"])(
//     "short-circuits nullish fallback for %s in callbacks and seed calls",
//     (left) => {
//       for (const source of [
//         `e.ipcMain.on("test:copy", event => { ${left} ?? event.sender.copy(); });`,
//         `${left} ?? e.ipcMain.on("test:copy", event => event.sender.copy());`,
//         `e.ipcMain.on("test:copy", event => { const selected = ${left} ?? (()=>event.sender.copy()); selected(); });`,
//       ])
//         expect(
//           analyzeJavaScriptStaticSource(`const e=require("electron");${source}`)
//             .electron.call_paths ?? [],
//         ).toEqual([]);
//     },
//   );
//   it.each(["null", "undefined", "void 0"])(
//     "follows nullish fallback for %s",
//     (left) => {
//       const result = analyzeJavaScriptStaticSource(`const e=require("electron");
//         ${left} ?? e.ipcMain.on("test:copy", event => { ${left} ?? event.sender.copy(); });`);
//       expect(result.electron.call_paths).toContainEqual(
//         expect.objectContaining({
//           terminal: "ipc-event.sender.copy",
//           conditions: [],
//         }),
//       );
//     },
//   );
//   it("retains a nullish guard for unknown fallback rather than a falsy guard", () => {
//     for (const source of [
//       `e.ipcMain.on("test:copy", event => { value ?? event.sender.copy(); });`,
//       `value ?? e.ipcMain.on("test:copy", event => event.sender.copy());`,
//     ]) {
//       const result = analyzeJavaScriptStaticSource(
//         `const e=require("electron");${source}`,
//       );
//       expect(result.electron.call_paths).toContainEqual(
//         expect.objectContaining({
//           terminal: "ipc-event.sender.copy",
//           conditions: [
//             expect.objectContaining({
//               expression: "(value) === null || (value) === undefined",
//             }),
//           ],
//         }),
//       );
//     }
//   });
//   it.each([
//     "if (flag) return copy; else return cut; return dead;",
//     "if (flag) { return copy; } return cut;",
//     "if (flag) { if (other) return copy; else return cut; } else return cut; return dead;",
//   ])("retains every possible factory return: %s", (body) => {
//     const result = analyzeJavaScriptStaticSource(`const e=require("electron");
//       const copy=()=>e.ipcRenderer.send("test:copy"), cut=()=>e.ipcRenderer.send("test:cut"), dead=()=>e.ipcRenderer.send("test:dead");
//       function choose(){${body}}
//       e.contextBridge.exposeInMainWorld("desktop", {copy:choose()});`);
//     expect(
//       [
//         ...new Set(result.electron.call_paths?.map((path) => path.channel)),
//       ].sort(),
//     ).toEqual(["test:copy", "test:cut"]);
//     const paths = result.electron.call_paths ?? [];
//     expect(
//       paths
//         .find(({ channel }) => channel === "test:copy")
//         ?.conditions.map(({ expression }) => expression),
//     ).toContain("flag");
//     expect(
//       paths
//         .filter(({ channel }) => channel === "test:cut")
//         .some((path) =>
//           path.conditions.some(({ expression }) => expression === "!(flag)"),
//         ),
//     ).toBe(true);
//   });
// });
//
// it("preserves an observed empty contextBridge API object", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const electron = require("electron");
//       electron.contextBridge.exposeInMainWorld("desktop", {});
//     `);
//   expect(result.electron.context_bridge_apis).toContainEqual(
//     expect.objectContaining({
//       api_key: "desktop",
//       api_status: "object-literal",
//       members: [],
//       unknown_members: 0,
//     }),
//   );
//   expect(result.electron.context_bridge_apis?.[0]).not.toHaveProperty(
//     "resolution_basis",
//   );
//   expect(result.parse_status).toBe("complete");
// });
//
// it.each([
//   [
//     "explicit nested paths after an unknown spread",
//     `{ ...extra, a: { b: 1 }, c: 2 }`,
//     ["a", "a.b", "c"],
//     1,
//     "dynamic",
//   ],
//   [
//     "a direct object literal",
//     `{ a: { b: 1 }, c: 2 }`,
//     ["a", "a.b", "c"],
//     0,
//     "object-literal",
//   ],
//   ["a dynamic API argument", "getApi()", [], 1, "dynamic"],
// ] as const)(
//   "preserves directly observed nested bridge members for %s",
//   (_name, api, members, unknownMembers, apiStatus) => {
//     const result = analyzeJavaScriptStaticSource(`
//       const { contextBridge } = require("electron");
//       contextBridge.exposeInMainWorld("api", ${api});
//     `);
//     expect(result.electron.context_bridge_apis).toContainEqual(
//       expect.objectContaining({
//         api_key: "api",
//         api_status: apiStatus,
//         members,
//         unknown_members: unknownMembers,
//       }),
//     );
//   },
// );
//
// describe("wrapped contextBridge exposure methods", () => {
//   it("retains the original expression for a dynamic isolated world id", () => {
//     const result = analyzeJavaScriptStaticSource(
//       bundle(
//         `const worldId = selectWorld(); electron.contextBridge.exposeInIsolatedWorld(worldId, "isolatedApi", {ping: true});`,
//       ),
//     );
//     // The proven Webpack bootstrap resolves `load(2)` directly, so the complete
//     // direct observation is retained instead of a wrapper substitution.
//     expect(result.electron.context_bridge_apis).toEqual([
//       expect.objectContaining({
//         world: "isolated",
//         world_id: {
//           status: "dynamic",
//           value: null,
//           expression: "worldId",
//         },
//         api_key: "isolatedApi",
export const _l = 194;
