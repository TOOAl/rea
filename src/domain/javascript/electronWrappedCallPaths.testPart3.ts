export const __stub = 1;
//     `const e=require("electron");e.ipcMain={on(){}};e.ipcMain.on("bad",event=>event.sender.copy());`,
//     `function require(){return {ipcMain:{on(){}}}};const e=require("electron");e.ipcMain.on("bad",event=>event.sender.copy());`,
//   ])
//     expect(
//       analyzeJavaScriptStaticSource(source).electron.call_paths ?? [],
//     ).toEqual([]);
// });
// it("preserves guarded alternatives in direct exposed object literals", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const copy=()=>e.ipcRenderer.send("copy");
//       const cut=()=>e.ipcRenderer.send("cut");
//       e.contextBridge.exposeInMainWorld("desktop", {action: flag ? copy : cut});
//     `);
//   expect(result.electron.call_paths).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         entry: "desktop.action",
//         channel: "copy",
//         conditions: [expect.objectContaining({ expression: "flag" })],
//       }),
//       expect.objectContaining({
//         entry: "desktop.action",
//         channel: "cut",
//         conditions: [expect.objectContaining({ expression: "!(flag)" })],
//       }),
//     ]),
//   );
// });
// it("preserves bridge member segments and excludes prototype setters", () => {
//   const result = analyzeJavaScriptStaticSource(`
//     const e=require("electron");
//     const write=()=>e.ipcRenderer.send("write");
//     e.contextBridge.exposeInMainWorld("desktop", {
//       "nested.write": write,
//       nested: { write },
//       __proto__: { inherited: write },
//       ["__proto__"]: { own: write },
//     });
//   `);
//   expect(result.electron.call_paths).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         entry: "desktop.nested.write",
//         entry_path: ["desktop", "nested.write"],
//       }),
//       expect.objectContaining({
//         entry: "desktop.nested.write",
//         entry_path: ["desktop", "nested", "write"],
//       }),
//       expect.objectContaining({
//         entry: "desktop.__proto__.own",
//         entry_path: ["desktop", "__proto__", "own"],
//       }),
//     ]),
//   );
//   expect(result.electron.call_paths).not.toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         entry_path: ["desktop", "__proto__", "inherited"],
//       }),
//     ]),
//   );
// });
// it("follows an explicit object-literal prototype lookup in a bridge wrapper", () => {
//   const result = analyzeJavaScriptStaticSource(`
//     const e=require("electron");
//     const prototype={send:()=>e.ipcRenderer.send("through-prototype")};
//     const object={__proto__:prototype};
//     e.contextBridge.exposeInMainWorld("desktop", {
//       action:()=>object.__proto__.send(),
//     });
//   `);
//   expect(result.electron.call_paths).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         entry_path: ["desktop", "action"],
//         channel: "through-prototype",
//       }),
//     ]),
//   );
// });
// it("does not spread a large nested bridge member list into function arguments", () => {
//   const members = Array.from(
//     { length: 125_000 },
//     (_, index) => `m${index}(){}`,
//   ).join(",");
//   const source = `const e=require("electron");e.contextBridge.exposeInMainWorld("desktop",{nested:{${members}}});`;
//   expect(() => analyzeJavaScriptStaticSource(source)).not.toThrow();
// });
// it("reports nested bridge depth truncation while retaining shallow paths", () => {
//   const nested =
//     Array.from({ length: 130 }, (_, index) => `level${index}:{`).join("") +
//     `deep:()=>e.ipcRenderer.send("deep")` +
//     "}".repeat(130);
//   const result = analyzeJavaScriptStaticSource(`
//     const e=require("electron");
//     e.contextBridge.exposeInMainWorld("desktop", {
//       shallow:()=>e.ipcRenderer.send("shallow"), ${nested}
//     });
//   `);
//   expect(result.electron.call_paths).toContainEqual(
//     expect.objectContaining({ entry: "desktop.shallow", channel: "shallow" }),
//   );
//   expect(result.limitations.join(" ")).toContain("depth 128");
// });
// it("preserves conditions when a wrapper dispatches through conditional external methods", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const send=flag ? e.ipcRenderer.send : e.ipcRenderer.invoke;
//       e.contextBridge.exposeInMainWorld("desktop", {action:()=>send("channel")});
//     `);
//   expect(result.electron.call_paths).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         entry: "desktop.action",
//         channel: "channel",
//         terminal: "electron.ipcRenderer.send",
//         conditions: [expect.objectContaining({ expression: "flag" })],
//       }),
//       expect.objectContaining({
//         entry: "desktop.action",
//         channel: "channel",
//         terminal: "electron.ipcRenderer.invoke",
//         conditions: [expect.objectContaining({ expression: "!(flag)" })],
//       }),
//     ]),
//   );
//   expect(
//     result.electron.ipc.filter(
//       ({ resolution_basis, channel }) =>
//         resolution_basis === "wrapper-substitution" && channel === "channel",
//     ),
//   ).toEqual([]);
//   expect(result.parse_status).toBe("partial");
// });
// it("keeps conditional IPC channels unknown instead of reporting them unconditionally", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const channel=flag ? "copy" : "cut";
//       e.contextBridge.exposeInMainWorld("desktop", {action:()=>e.ipcRenderer.send(channel)});
//     `);
//   expect(result.electron.call_paths ?? []).toEqual([]);
//   expect(result.parse_status).toBe("partial");
// });
// it("retains enclosing branch predicates without emitting unconditional wrapper findings", () => {
//   const result = analyzeJavaScriptStaticSource(`
//     const e=require("electron");
//     function expose(key,api){e.contextBridge.exposeInMainWorld(key,api);}
//     function register(channel,handler){e.ipcMain.on(channel,handler);}
//     if(flag){
//       expose("conditional",{copy:()=>navigator.clipboard.writeText("copy")});
//       register("only:flag",event=>event.sender.copy());
//     }
//   `);
//   expect(result.electron.context_bridge_apis).not.toContainEqual(
//     expect.objectContaining({
//       api_key: "conditional",
//       resolution_basis: "wrapper-substitution",
//     }),
//   );
//   expect(result.electron.ipc).not.toContainEqual(
//     expect.objectContaining({
//       channel: "only:flag",
//       resolution_basis: "wrapper-substitution",
//     }),
//   );
//   for (const entry of ["conditional.copy", "only:flag"])
//     expect(result.electron.call_paths).toContainEqual(
//       expect.objectContaining({
//         entry,
//         conditions: [expect.objectContaining({ expression: "flag" })],
//       }),
//     );
//   expect(result.parse_status).toBe("partial");
// });
// it("preserves the raw bridge observation for a guarded object value", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const api=flag ? {copy:()=>e.ipcRenderer.send("copy")} : {};
//       e.contextBridge.exposeInMainWorld("desktop", api);
//     `);
//   expect(result.electron.context_bridge_apis).toContainEqual(
//     expect.objectContaining({
//       api_key: "desktop",
//       api_status: "dynamic",
//     }),
//   );
//   expect(result.parse_status).toBe("partial");
// });
// it("preserves the source expression for a guarded bridge world key", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const world=flag ? "desktop" : "shell";
export const _l = 194;
