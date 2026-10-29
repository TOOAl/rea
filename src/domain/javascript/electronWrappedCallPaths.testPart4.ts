export const __stub = 1;
//       e.contextBridge.exposeInMainWorld(world, {copy:()=>e.ipcRenderer.send("copy")});
//     `);
//   expect(result.electron.context_bridge_apis).toContainEqual(
//     expect.objectContaining({ api_key: null, api_key_expression: "world" }),
//   );
//   expect(result.parse_status).toBe("partial");
// });
// it.each(["const", "var"])(
//   "does not use a %s callback initializer before exposure",
//   (declaration) => {
//     const result = analyzeJavaScriptStaticSource(
//       bundle(`
//           const electron=load(2);
//           electron.contextBridge.exposeInMainWorld("desktop", {copy: callback});
//           ${declaration} callback=()=>electron.ipcRenderer.send("late");
//         `),
//     );
//     expect(result.electron.call_paths ?? []).toEqual([]);
//     expect(result.parse_status).toBe("partial");
//   },
// );
// it("does not use an original Electron module factory after its slot is replaced", () => {
//   const result = analyzeJavaScriptStaticSource(
//     bundle(`
//       modules[2] = function(module) {
//         module.exports = {contextBridge:{exposeInMainWorld(){}},ipcRenderer:{send(){}}};
//       };
//       const electron=load(2);
//       electron.contextBridge.exposeInMainWorld("desktop", {copy:()=>electron.ipcRenderer.send("fake")});
//     `),
//   );
//   expect(result.electron.call_paths ?? []).toEqual([]);
// });
// it.each(["({})", "load(2)"])(
//   "does not emit the impossible logical-RHS terminal after %s",
//   (left) => {
//     const result = analyzeJavaScriptStaticSource(
//       bundle(`
//         electron.ipcMain.on("guard", event => { ${left} || event.sender.copy(); });
//       `),
//     );
//     expect(result.electron.call_paths ?? []).toEqual([]);
//   },
// );
// it("does not follow a statically false callback branch", () => {
//   const result = analyzeJavaScriptStaticSource(
//     bundle(
//       `helper.events.addListener("example:copy",event=>{if(false)event.sender.copy()});`,
//     ),
//   );
//   expect(result.electron.call_paths ?? []).toEqual([]);
// });
// it("retains early rejection guards and excludes calls after definite returns", () => {
//   const guarded = analyzeJavaScriptStaticSource(
//     `const e=require("electron");e.ipcMain.on("guard",event=>{if(!allowed(event))return;event.sender.copy()});`,
//   );
//   expect(guarded.electron.call_paths).toContainEqual(
//     expect.objectContaining({
//       conditions: [
//         expect.objectContaining({ expression: "!(!allowed(event))" }),
//       ],
//     }),
//   );
//   for (const body of [
//     "return;event.sender.copy()",
//     "if(true)return;event.sender.copy()",
//     "if(false)event.sender.copy()",
//   ])
//     expect(
//       analyzeJavaScriptStaticSource(
//         `const e=require("electron");e.ipcMain.on("dead",event=>{${body}});`,
//       ).electron.call_paths ?? [],
//     ).toEqual([]);
//   expect(
//     analyzeJavaScriptStaticSource(
//       `const e=require("electron");if(false)e.ipcMain.on("dead",event=>event.sender.copy());`,
//     ).electron.call_paths ?? [],
//   ).toEqual([]);
// });
// it("rejects dynamic channels, computed overwrites, unknown spreads and reassigned callback parameters", () => {
//   for (const entry of [
//     `helper.events.addListener(runtimeChannel,event=>event.sender.copy());`,
//     `electron[runtimeKey]={};electron.ipcMain.on("bad",event=>event.sender.copy());`,
//     `const api={copy:helper.sender("bad"),...unknownApi};electron.contextBridge.exposeInMainWorld("desktop",api);`,
//     `helper.events.addListener("bad",event=>{event=other;event.sender.copy()});`,
//   ])
//     expect(
//       analyzeJavaScriptStaticSource(bundle(entry)).electron.call_paths ?? [],
//     ).toEqual([]);
// });
// it("resolves renamed default and namespace import helpers from their syntax", () => {
//   const result = analyzeJavaScriptStaticSource(
//     bundle(`
//    const defaultImport=x=>x&&x.__esModule?x:{default:x};
//    function namespaceImport(x){if(x&&x.__esModule)return x;return unknownWrap(x)}
//    const E=defaultImport(load(2)),H=namespaceImport(load(5));
//    E.default.contextBridge.exposeInMainWorld("renamed",{copy:(0,H.sender)("test:renamed")});
//   `),
//   );
//   expect(result.electron.call_paths).toContainEqual(
//     expect.objectContaining({
//       entry: "renamed.copy",
//       channel: "test:renamed",
//       terminal: "electron.ipcRenderer.send",
//     }),
//   );
//   expect(
//     result.electron.call_paths
//       ?.flatMap((p) => p.steps)
//       .every((step) => step.label.length > 0),
//   ).toBe(true);
// });
// it("resolves an empty bootstrap module key through an exported Electron bridge", () => {
//   const result = analyzeJavaScriptStaticSource(`(() => {
//     const modules = {
//       ""(module) { module.exports = require("electron"); },
//       9(module, exports, load) {
//         const electron = load("");
//         electron.contextBridge.exposeInMainWorld("desktop", {
//           copy: () => electron.ipcRenderer.send("test:empty-module"),
//         });
//       },
//     };
//     function load(id) {
//       const module = { exports: {} };
//       modules[id].call(module.exports, module, module.exports, load);
//       return module.exports;
//     }
//     load(9);
//   })();`);
//   expect(result.bundler_registrations).toMatchObject([
//     {
//       entry_module_keys: ["9"],
//       modules: [{ module_key: "" }, { module_key: "9" }],
//     },
//   ]);
//   expect(result.electron.call_paths).toContainEqual(
//     expect.objectContaining({
//       entry: "desktop.copy",
//       channel: "test:empty-module",
//       terminal: "electron.ipcRenderer.send",
//     }),
//   );
// });
// it("does not trust helper names or follow returns after a definite throw", () => {
//   for (const helper of [
//     `function __toESM() {return {ipcRenderer:{send(){}}}}`,
//     `function __toESM(value) {throw Error("inert");return value;}`,
//     `function __toESM(value) {if(true){throw Error("inert")}return value;}`,
//   ]) {
//     const result = analyzeJavaScriptStaticSource(`
//         const electron = require("electron");
//         ${helper}
//         const wrapped = __toESM(electron);
//         electron.contextBridge.exposeInMainWorld("desktop",{
//           copy:()=>wrapped.ipcRenderer.send("test:copy")
//         });
//       `);
//     expect(result.electron.call_paths ?? []).toEqual([]);
//   }
// });
//
// describe("wrapped Electron API identity", () => {
//   it("does not restore rejected Electron identities through wrapper substitution", () => {
//     for (const source of [
//       `const e=require("electron");e.ipcMain={on(){}};e.ipcMain.on("bad",event=>event.sender.copy());`,
//       `function require(){return {ipcMain:{on(){}}}};const e=require("electron");e.ipcMain.on("bad",event=>event.sender.copy());`,
//       `const e=require("electron");const ipc=e.ipcRenderer,alias=ipc;delete alias.send;function send(channel){ipc.send(channel)}send("bad");`,
//       `require("electron/renderer").ipcRenderer={};const e=require("electron");function send(channel){e.ipcRenderer.send(channel)}send("bad");`,
//       `const e=require("electron");[e.ipcRenderer]=replacements;function send(channel){e.ipcRenderer.send(channel)}send("bad");`,
//       `const e=require("electron");for(e.contextBridge of replacements){}function expose(api){e.contextBridge.exposeInMainWorld("api",api)}expose({copy:()=>navigator.clipboard.writeText("bad")});`,
//       `const e=require("electron");const ipc=e.ipcRenderer;Reflect.deleteProperty(ipc,"send");function send(channel){ipc.send(channel)}send("bad");`,
//     ]) {
//       const { electron } = analyzeJavaScriptStaticSource(source);
//       expect(electron.call_paths ?? []).toEqual([]);
//       expect(electron.ipc).toEqual([]);
//       expect(electron.context_bridge_apis).toEqual([]);
//     }
//   });
//   it("keeps unaffected Electron methods available after a sibling method write", () => {
//     const { electron } = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       delete e.ipcRenderer.send;
//       function invoke(channel){e.ipcRenderer.invoke(channel)}
//       invoke("good");
//     `);
//     expect(electron.ipc).toContainEqual(
//       expect.objectContaining({ channel: "good", operation: "invoke" }),
//     );
//   });
// });
export const _l = 191;
