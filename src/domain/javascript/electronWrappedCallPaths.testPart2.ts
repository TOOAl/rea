export const __stub = 1;
//         api_status: "object-literal",
//         members: ["ping"],
//         unknown_members: 0,
//         module_key: "9",
//         module_runtime: "webpack-bootstrap@0",
//       }),
//     ]);
//     expect(result.electron.context_bridge_apis[0]).not.toHaveProperty(
//       "resolution_basis",
//     );
//     expect(result.parse_status).toBe("partial");
//   });
//
//   it("does not report a conditionally selected world as unconditional", () => {
//     const result = analyzeJavaScriptStaticSource(
//       bundle(
//         `if (useIsolated) electron.contextBridge.exposeInIsolatedWorld(1001, "isolatedApi", {ping: true});`,
//       ),
//     );
//     expect(result.electron.context_bridge_apis).not.toContainEqual(
//       expect.objectContaining({
//         api_key: "isolatedApi",
//         resolution_basis: "wrapper-substitution",
//       }),
//     );
//     expect(result.parse_status).toBe("partial");
//   });
//
//   it("does not report conditionally resolved world ids as unconditional", () => {
//     const result = analyzeJavaScriptStaticSource(
//       bundle(
//         `const worldId = useFirstWorld ? 1001 : 1002; electron.contextBridge.exposeInIsolatedWorld(worldId, "isolatedApi", {ping: true});`,
//       ),
//     );
//     expect(result.electron.context_bridge_apis).not.toContainEqual(
//       expect.objectContaining({
//         api_key: "isolatedApi",
//         resolution_basis: "wrapper-substitution",
//       }),
//     );
//     expect(result.parse_status).toBe("partial");
//   });
// });
//
// it("connects exposed closures to IPC sends and text clipboard calls", () => {
//   const result = analyzeJavaScriptStaticSource(
//     bundle(`
//    const text = value => navigator.clipboard.writeText(value);
//    const api={copy:helper.sender("example:copy"),copyText:text};
//    electron.contextBridge.exposeInMainWorld("desktop",api);
//   `),
//   );
//   expect(result.electron.context_bridge_apis).toMatchObject([
//     { api_key: "desktop", members: ["copy", "copyText"] },
//   ]);
//   expect(result.electron.ipc).toContainEqual(
//     expect.objectContaining({
//       side: "renderer",
//       channel: "example:copy",
//       operation: "send",
//     }),
//   );
//   expect(result.electron.call_paths).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({
//         entry: "desktop.copy",
//         channel: "example:copy",
//         terminal: "electron.ipcRenderer.send",
//       }),
//       expect.objectContaining({
//         entry: "desktop.copyText",
//         terminal: "navigator.clipboard.writeText",
//       }),
//     ]),
//   );
//   const ipcFinding = result.electron.ipc.find(
//     ({ channel }) => channel === "example:copy",
//   );
//   const ipcPath = result.electron.call_paths?.find(
//     ({ entry }) => entry === "desktop.copy",
//   );
//   expect(ipcFinding).toBeDefined();
//   expect(ipcPath?.steps.at(-1)).toBeDefined();
//   expect(ipcFinding?.location).toEqual(ipcPath?.steps.at(-1)?.location);
// });
// it("resolves a helper factory listed after its bundle consumer", () => {
//   const result = analyzeJavaScriptStaticSource(`(() => {
//       const modules = {
//         2(module) { module.exports = require("electron"); },
//         9(module,exports,load) {
//           const electron=load(2),helper=load(5);
//           electron.contextBridge.exposeInMainWorld("desktop", {copy:helper.sender("after:copy")});
//         },
//         5(module,exports,load) {
//           const electron=load(2);
//           exports.sender=channel=>()=>electron.ipcRenderer.send(channel);
//         }
//       };
//       function load(id) { const m={exports:{}}; modules[id].call(m.exports,m,m.exports,load); return m.exports; }
//       load(9);
//     })();`);
//   expect(result.electron.call_paths).toContainEqual(
//     expect.objectContaining({
//       entry: "desktop.copy",
//       channel: "after:copy",
//       terminal: "electron.ipcRenderer.send",
//     }),
//   );
// });
// it("substitutes guarded listener callbacks and preserves guard evidence", () => {
//   const result = analyzeJavaScriptStaticSource(
//     bundle(
//       `helper.events.addListener("example:copy",event=>event.sender.copy());`,
//     ),
//   );
//   expect(result.electron.ipc).toContainEqual(
//     expect.objectContaining({
//       side: "main",
//       channel: "example:copy",
//       operation: "on",
//     }),
//   );
//   expect(result.electron.call_paths).toContainEqual(
//     expect.objectContaining({
//       entry_kind: "ipc-handler",
//       channel: "example:copy",
//       terminal: "ipc-event.sender.copy",
//       conditions: [expect.objectContaining({ expression: "allowed(event)" })],
//     }),
//   );
//   const ipcFinding = result.electron.ipc.find(
//     ({ channel, operation }) =>
//       channel === "example:copy" && operation === "on",
//   );
//   const ipcStep = result.electron.call_paths
//     ?.find(({ entry_kind }) => entry_kind === "ipc-handler")
//     ?.steps.find(({ kind }) => kind === "ipc");
//   expect(ipcFinding).toBeDefined();
//   expect(ipcStep).toBeDefined();
//   expect(ipcFinding?.location).toEqual(ipcStep?.location);
// });
// it("retains distinct wrapper invocation ranges for one IPC API source", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const copy=event=>event.sender.copy();
//       function register(channel,handler){e.ipcMain.on(channel,handler);}
//       register("same:channel",copy);
//       register("same:channel",copy);
//     `);
//   const findings = result.electron.ipc.filter(
//     ({ resolution_basis, channel }) =>
//       resolution_basis === "wrapper-substitution" && channel === "same:channel",
//   );
//   expect(findings).toHaveLength(2);
//   expect(findings[0]?.location).toEqual(findings[1]?.location);
//   expect(findings[0]?.invocation_location).toBeDefined();
//   expect(findings[1]?.invocation_location).toBeDefined();
//   expect(findings[0]?.invocation_location).not.toEqual(
//     findings[1]?.invocation_location,
//   );
// });
// it("keeps one wrapper registration when one invocation reaches it twice", () => {
//   const result = analyzeJavaScriptStaticSource(`
//       const e=require("electron");
//       const copy=event=>event.sender.copy();
//       function register(channel,handler){e.ipcMain.on(channel,handler);}
//       function twice(channel){register(channel,copy);register(channel,copy);}
//       twice("same:invocation");
//     `);
//   expect(
//     result.electron.ipc.filter(
//       ({ resolution_basis, channel }) =>
//         resolution_basis === "wrapper-substitution" &&
//         channel === "same:invocation",
//     ),
//   ).toHaveLength(1);
// });
// it("keeps a directly observed renderer operation singular when tracing its exposed callback", () => {
//   const result = analyzeJavaScriptStaticSource(`
//     const {contextBridge,ipcRenderer}=require("electron");
//     contextBridge.exposeInMainWorld("desktop",{ping:()=>ipcRenderer.invoke("ping")});
//   `);
//   expect(result.electron.ipc).toHaveLength(1);
//   expect(result.electron.ipc[0]).toMatchObject({
//     channel: "ping",
//     operation: "invoke",
//   });
//   expect(result.electron.ipc[0]).not.toHaveProperty("resolution_basis");
//   expect(result.electron.call_paths).toContainEqual(
//     expect.objectContaining({ entry: "desktop.ping", channel: "ping" }),
//   );
// });
// it("does not identify overwritten Electron namespaces or shadowed require", () => {
//   for (const source of [
export const _l = 194;
