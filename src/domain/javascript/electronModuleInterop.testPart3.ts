export const __stub = 1;
//     "({replacement:Object = customObject} = replacements);",
//     "({...Object} = replacements);",
//     "[...Function] = replacements;",
//     "for ({Object} of replacements) {}",
//     "for ([Function] in replacements) {}",
//   ])("rejects an intrinsic replaced through %s", (write) => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       ${write} ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.parse_error_count).toBe(0);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
//
//   it.each([
//     "({Object:unrelated} = replacements);",
//     "function decoy(Object) {({Object} = replacements);}",
//   ])("preserves intrinsic identity for an unrelated target: %s", (write) => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       ${write} ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.parse_error_count).toBe(0);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
//
//   it("preserves captured operations after later property destructuring", () => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       ${ROLLDOWN_MODULE_INTEROP} ({create:Object.create} = replacements);
//       ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
// });
//
// describe("Electron module interop intrinsic captures", () => {
//   it.each([
//     "var captured = Object.defineProperty;",
//     "const {defineProperty:captured} = Object;",
//     "var first = Object.defineProperty; const captured = first;",
//   ])("retains the original function capture through %s", (capture) => {
//     const runtime = ROLLDOWN_MODULE_INTEROP.replace(
//       "__defProp = Object.defineProperty",
//       "__defProp = captured",
//     );
//     const analysis = analyzeJavaScriptStaticSource(`
//       ${capture} Object.defineProperty = custom;
//       ${runtime} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
//
//   it.each(["var", "const"])(
//     "keeps an intrinsic alias read before its %s initializer unresolved",
//     (kind) => {
//       const runtime = ROLLDOWN_MODULE_INTEROP.replace(
//         "__defProp = Object.defineProperty",
//         "__defProp = later",
//       );
//       const analysis = analyzeJavaScriptStaticSource(`
//         ${runtime} ${kind} later = Object.defineProperty;
//         ${IMPORT} ${WRAP} ${WINDOW}
//       `);
//       expect(analysis.electron.browser_windows).toEqual([]);
//     },
//   );
//
//   it("requires the helper's intrinsic binding to initialize before conversion", () => {
//     const runtime = ROLLDOWN_MODULE_INTEROP.replace(
//       "var __defProp = Object.defineProperty;",
//       "",
//     );
//     const analysis = analyzeJavaScriptStaticSource(`
//       var captured = Object.defineProperty;
//       ${runtime} ${IMPORT} ${WRAP} ${WINDOW}
//       var __defProp = captured;
//     `);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
// });
//
// describe("Electron module interop capture and scope", () => {
//   it.each(["metadata", "alias"])(
//     "recognizes a hoisted function target through %s",
//     (target) => {
//       const analysis = analyzeJavaScriptStaticSource(`
//         const alias = metadata;
//         Object.defineProperty(${target}, "x", {value:1});
//         function metadata() {}
//         ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//       `);
//       expect(analysis.electron.browser_windows).toHaveLength(1);
//     },
//   );
//
//   it.each([
//     "var metadata = function () {};",
//     "const metadata = () => {};",
//     "class metadata {}",
//   ])("does not hoist fresh targets from %s", (declaration) => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       Object.defineProperty(metadata, "x", {value:1});
//       ${declaration}
//       ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
//
//   it.each([
//     'const {defineProperty:change} = Object; change(Object,"create",{value:customCreate});',
//     "const objectAlias = Object; const {assign:change} = objectAlias; change(Object,{create:customCreate});",
//     'const {set:change} = Reflect; change(Object,"create",customCreate);',
//     'const {Object:{defineProperty:change}} = globalThis; change(Object,"create",{value:customCreate});',
//   ])("rejects a projected intrinsic mutator alias: %s", (write) => {
//     const source = `${write} ${ROLLDOWN_MODULE_INTEROP}
//       ${IMPORT} ${WRAP} ${WINDOW}
//     `.replaceAll("__toESM", "namespaceOf");
//     const analysis = analyzeJavaScriptStaticSource(source);
//     expect(analysis.parse_error_count).toBe(0);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
//
//   it.each([
//     "const metadata = {};",
//     "const metadata = [];",
//     "const initial = {}; const metadata = initial;",
//     "const metadata = () => {};",
//     "const metadata = function () {};",
//     "const metadata = async () => {};",
//     "const metadata = function* () {};",
//     "const metadata = class {};",
//     "const metadata = /local/;",
//     "function metadata() {}",
//     "class metadata {}",
//   ])(
//     "keeps a fresh mutator target separate from intrinsic identity: %s",
//     (setup) => {
//       const analysis = analyzeJavaScriptStaticSource(`
//       ${setup} Object.defineProperty(metadata,"x",{value:1});
//       ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//       expect(analysis.electron.browser_windows).toHaveLength(1);
//     },
//   );
//
//   it.each([
//     "const metadata = getMetadata();",
//     "let metadata = {}; metadata = Object;",
//     "Object.defineProperty(metadata,'x',{value:1}); const metadata = {};",
//     "const metadata = {intrinsic:Object}; Object.defineProperty(metadata.intrinsic,'create',{value:customCreate});",
//     "const metadata = class {static {Object.create = customCreate;}};",
//     "@(() => Object) class metadata {}",
//   ])("keeps an unproven mutator target unresolved: %s", (setup) => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       ${setup} Object.defineProperty(metadata,"x",{value:1});
//       ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toEqual([]);
//   });
//
//   it("does not reject unrelated intrinsic property definitions", () => {
//     const analysis = analyzeJavaScriptStaticSource(`
//       Object.defineProperty(Object, "unrelated", {value:1});
//       ${ROLLDOWN_MODULE_INTEROP} ${IMPORT} ${WRAP} ${WINDOW}
//     `);
//     expect(analysis.electron.browser_windows).toHaveLength(1);
//   });
//
export const _l = 166;
