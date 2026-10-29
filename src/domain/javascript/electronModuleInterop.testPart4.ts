export const __stub = 1;
//   it("keeps opaque targets in a generic helper separate from outer module identity", () => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       function genericAssign() { Object.assign.apply(null, arguments); }
//       ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
//
//   it("rejects an opaque intrinsic mutation in the namespace's own callable", () => {
//     const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//       function openWindow(args) {
//         Object.defineProperty.apply(null, args);
//         ${IMPORT} ${WRAP} ${WINDOW}
//       }
//     `);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
//
//   it("preserves captured intrinsics across later vendor polyfills and callable writes", () => {
//     const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//       Object.create = customCreate;
//       ${IMPORT} ${WRAP}
//       function runLoop(key) { globalThis[key] = this; }
//       function polyfill() { Object.create = customCreate; }
//       ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
//
//   it("keeps a shadowed namespace separate from the converted module", () => {
//     const analysis = analyzeJavaScriptStaticSource(`${ROLLDOWN_MODULE_INTEROP}
//       ${IMPORT} ${WRAP} ${WINDOW}
//       function decoy(electron) { ${WINDOW} }
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
// });
//
// describe("Electron module interop generic invocations", () => {
//   it.each([
//     'const change = Function.prototype.call.bind(Object.defineProperty); change(null,Object,"create",{value:customCreate});',
//     'const call = Function.prototype.call; const change = call.bind(Object.defineProperty); change(null,Object,"create",{value:customCreate});',
//     'const change = Function.prototype.call.bind(Object.defineProperty,null,Object,"create"); change({value:customCreate});',
//     'Function.prototype.call.apply(Object.defineProperty,[null,Object,"create",{value:customCreate}]);',
//     'Reflect.apply(Function.prototype.call,Object.defineProperty,[null,Object,"create",{value:customCreate}]);',
//     'const change = Function.prototype.apply.bind(Object.defineProperty); change(null,[Object,"create",{value:customCreate}]);',
//     'Reflect.apply(Function.prototype.apply,Object.defineProperty,[null,[Object,"create",{value:customCreate}]]);',
//     'const first = Function.prototype.call.bind(Object.defineProperty,null,Object,"create"); const change = first.bind(fake); change({value:customCreate});',
//     "const change = Function.prototype.call.bind(Object.defineProperty); change(null,...args);",
//     "const change = Function.prototype.apply.bind(Object.defineProperty); change(null,args);",
//     'const change = Function.prototype.call.bind(Object.defineProperty,null,...args); change(metadata,"x",{value:1});',
//     'Function.prototype.call.call.call(Object.defineProperty,null,Object,"create",{value:customCreate});',
//     'Object.defineProperty.call.call(Object.defineProperty,null,Object,"create",{value:customCreate});',
//     'Function.prototype.apply.apply(Object.defineProperty,[null,[Object,"create",{value:customCreate}]]);',
//     'const change = Object.defineProperty.call.bind(Object.defineProperty); change(null,Object,"create",{value:customCreate});',
//     'const change = Function.prototype.call.call.bind(Object.defineProperty,null,Object,"create"); change({value:customCreate});',
//   ])("follows the callable receiver of a generic invocation: %s", (write) => {
//     expect(
//       analyzeJavaScriptStaticSource(
//         `${write}\n${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} ${WINDOW}`,
//       ).electron.browser_windows,
//     ).toEqual([]);
//   });
//
//   it.each([
//     'const change = Function.prototype.call.bind(Object.defineProperty); change(null,metadata,"x",{value:1});',
//     'const change = Function.prototype.call.bind(Object.defineProperty,null,metadata,"x"); change({value:1});',
//     'Function.prototype.call.call(Object.defineProperty,null,metadata,"x",{value:1});',
//     'const change = Function.prototype.apply.bind(Object.defineProperty); change(null,[metadata,"x",{value:1}]);',
//     'Reflect.apply(Function.prototype.apply,Object.defineProperty,[null,[metadata,"x",{value:1}]]);',
//     'Function.prototype.call.call.call(Object.defineProperty,null,metadata,"x",{value:1});',
//     'Function.prototype.apply.apply(Object.defineProperty,[null,[metadata,"x",{value:1}]]);',
//     'const change = Object.defineProperty.call.bind(Object.defineProperty); change(null,metadata,"x",{value:1});',
//   ])("preserves fresh targets through a generic invocation: %s", (write) => {
//     expect(
//       analyzeJavaScriptStaticSource(
//         `const metadata = {}; ${write}\n${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} ${WINDOW}`,
//       ).electron.browser_windows,
//     ).toHaveLength(1);
//   });
// });
//
// describe("Electron module interop bound mutators", () => {
//   it.each([
//     'const change = Object.defineProperty.bind(null); change(Object,"create",{value:customCreate});',
//     'const change = Object.defineProperty.bind(null,Object,"create"); change({value:customCreate});',
//     'const first = Object.defineProperty.bind(null,Object); const change = first; change("create",{value:customCreate});',
//     'const change = Object.defineProperty.bind(null,Object); change.call(null,"create",{value:customCreate});',
//     'const change = Object.defineProperty.bind(null,Object); change.apply(null,["create",{value:customCreate}]);',
//     'const change = Object.defineProperty.bind(null,Object); Reflect.apply(change,null,["create",{value:customCreate}]);',
//     'Object.defineProperty.bind(null,Object,"create")({value:customCreate});',
//     'const change = Object.defineProperty.bind(null,...args); change(Object,"create",{value:customCreate});',
//     'const metadata = {}; Object.defineProperty.call(...args,metadata,"x",{value:1});',
//     'const metadata = {}; Object.defineProperty.apply(...args,[metadata,"x",{value:1}]);',
//     'const change = Function.prototype.call.bind(Object.defineProperty,null); change(Object,"create",{value:customCreate});',
//     'const first = Function.prototype.call.bind(Object.defineProperty,null); const change = first.bind(customReceiver,Object,"create"); change({value:customCreate});',
//     'const change = Function.prototype.apply.bind(Object.defineProperty,null); change([Object,"create",{value:customCreate}]);',
//     'Function.prototype.call.call(Object.defineProperty,null,Object,"create",{value:customCreate});',
//     'Function.prototype.apply.call(Object.defineProperty,null,[Object,"create",{value:customCreate}]);',
//     'const uncurry = Function.prototype.call.bind(Function.prototype.call); uncurry(Object.defineProperty,null,Object,"create",{value:customCreate});',
//     'const change = Function.prototype.bind.call(Object.defineProperty,null); change(Object,"create",{value:customCreate});',
//     'const bind = Function.prototype.call.bind(Function.prototype.bind); const change = bind(Object.defineProperty,null); change(Object,"create",{value:customCreate});',
//     'const change = Function.prototype.bind.apply(Object.defineProperty,[null,Object,"create"]); change({value:customCreate});',
//     'const change = Reflect.apply(Function.prototype.bind,Object.defineProperty,[null,Object,"create"]); change({value:customCreate});',
//     'const first = Object.defineProperty.bind(null,Object); const change = Function.prototype.bind.call(first,null,"create"); change({value:customCreate});',
//     'Reflect.apply = Object.defineProperty; Reflect.apply(Object,"create",{value:customCreate});',
//     'const apply = Reflect.apply; Reflect.apply = Object.defineProperty; Reflect.apply(Object,"create",{value:customCreate});',
//     'const change = Reflect.set.bind(null,Object,"create"); change(customCreate);',
//     'const change = Object.defineProperty.call; change.call(Object.defineProperty,null,Object,"create",{value:customCreate});',
//     'const {apply:change} = Object.defineProperty; change.call(Object.defineProperty,null,[Object,"create",{value:customCreate}]);',
//     'const change = Reflect.apply.call; change.call(Reflect.apply,null,Object.defineProperty,null,[Object,"create",{value:customCreate}]);',
//     'Reflect.set({},"create",customCreate,Object);',
//     'const metadata = {}; Reflect.set(metadata,"create",customCreate,Object);',
//     'const change = Reflect.set.bind(null,{},"create",customCreate); change(Object);',
//     'Reflect.apply(Reflect.set,null,[{},"create",customCreate,Object]);',
//     'Reflect.set({},"create",customCreate,...receivers);',
//     'Reflect.set({},"create",...valuesAndReceivers);',
//     "Reflect.set({},...keysValuesAndReceivers);",
//     'Reflect.set({},"create",customCreate,receiver);',
//   ])("rejects intrinsic writes through a bound mutator: %s", (write) => {
//     expect(
//       analyzeJavaScriptStaticSource(
//         `${write}\n${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} ${WINDOW}`,
//       ).electron.browser_windows,
//     ).toEqual([]);
//   });
//
//   it.each([
//     'const change = Object.defineProperty.bind(null); change(metadata,"x",{value:1});',
//     'const change = Object.defineProperty.bind(null,metadata,"x"); change({value:1});',
//     'const first = Object.defineProperty.bind(null,metadata); const change = first.bind(null,"x"); change({value:1});',
//     'const change = Function.prototype.call.bind(Object.defineProperty,null); change(metadata,"x",{value:1});',
//     'const change = Function.prototype.apply.bind(Object.defineProperty,null); change([metadata,"x",{value:1}]);',
//     'const change = Function.prototype.bind.call(Object.defineProperty,null,metadata,"x"); change({value:1});',
//     'const bind = Function.prototype.call.bind(Function.prototype.bind); const change = bind(Object.defineProperty,null,metadata,"x"); change({value:1});',
//     'const change = Function.prototype.bind.apply(Object.defineProperty,[null,metadata,"x"]); change({value:1});',
//     'const change = Reflect.apply(Function.prototype.bind,Object.defineProperty,[null,metadata,"x"]); change({value:1});',
//     'const apply = Reflect.apply; Reflect.apply = replacement; apply(Object.defineProperty,null,[metadata,"x",{value:1}]);',
//     'const change = Object.defineProperty.bind(null,Object,"create");',
//     'Object.defineProperty.call(null,metadata,"x",{value:1});',
//     'Object.defineProperty.apply(null,[metadata,"x",{value:1}]);',
//     'const change = Object.defineProperty.call; change.call(Object.defineProperty,null,metadata,"x",{value:1});',
//     'const {apply:change} = Object.defineProperty; change.call(Object.defineProperty,null,[metadata,"x",{value:1}]);',
//     'Reflect.set(metadata,"x",1,{});',
//     'const receiver = {}; Reflect.set({},"x",1,receiver);',
//   ])("keeps a fresh bound target or unused binding separate: %s", (write) => {
//     expect(
//       analyzeJavaScriptStaticSource(
//         `const metadata = {}; ${write}\n${ROLLDOWN_MODULE_INTEROP}\n${IMPORT} ${WRAP} ${WINDOW}`,
//       ).electron.browser_windows,
//     ).toHaveLength(1);
//   });
// });
//
// it("keeps unrelated exports after an aliased prebound key write", () => {
//   const analysis = analyzeJavaScriptStaticSource(`
//       const electron = require("electron");
//       const key = "Unrelated";
//       const mutate = Object.defineProperty.bind(null, electron, key);
//       mutate({value: custom});
//       new electron.BrowserWindow({});
//     `);
//   expect(analysis.electron.browser_windows).toHaveLength(1);
// });
export const _l = 164;
