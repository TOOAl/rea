export const __stub = 1;
//     "alias={}; flag && mutate(alias);",
//     "alias={}; flag ? mutate(alias) : noop();",
//     "function invoke(){mutate(alias);} alias={}; invoke();",
//     "alias={}; mutate(alias); alias=source;",
//   ])("retains uncertain call ordering: %s", (body) => {
//     expect(
//       resultValue(
//         `const source={value:1}; let alias=source; ${body} return source.value;`,
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it.each([
//     ["let {...copy}={child};", "copy={child:{}};", "copy.child.value=2;"],
//     ["let [...copy]=[child];", "copy=[{}];", "copy[0].value=2;"],
//     ["let {copy=child}={};", "copy={};", "copy.value=2;"],
//     ["let [copy=child]=[];", "copy={};", "mutate(copy);"],
//   ])(
//     "drops replaced rest/default origins: %s",
//     (declaration, rebind, mutation) => {
//       expect(
//         resultValue(
//           `const child={value:1}; ${declaration} ${rebind} ${mutation} return child.value;`,
//         ),
//       ).toEqual({ status: "literal", value: 1 });
//       expect(
//         resultValue(
//           `const child={value:1}; ${declaration} if(flag) ${rebind} ${mutation} return child.value;`,
//         )?.status,
//       ).toBe("unknown");
//     },
//   );
// });
//
// describe("capture ordering within declarations and expressions", () => {
//   it.each([
//     "const ignored = mutate(source);",
//     "void mutate(source);",
//     "consume(mutate(source));",
//   ])("preserves a primitive before a later nested call: %s", (escape) => {
//     expect(
//       resultValue(
//         `const source={value:1}; const snapshot=source.value; ${escape} return snapshot;`,
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//     expect(
//       resultValue(
//         `const source={value:1}; ${escape} const snapshot=source.value; return snapshot;`,
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it("preserves a primitive before an awaited escape", () => {
//     const value = onlyCallable(
//       analyzeJavaScriptSemantics(`export async function result() {
//         const source={value:1}; const snapshot=source.value;
//         await mutate(source); return snapshot;
//       }`),
//       "result",
//     ).returnSites[0]?.value;
//     expect(value).toEqual({ status: "literal", value: 1 });
//   });
//
//   it.each([
//     "({value:1} as {value:number})",
//     "({value:1} satisfies {value:number})",
//     "({value:1})!",
//   ])("classifies transparent initializer wrappers: %s", (source) => {
//     expect(
//       resultValue(
//         `const source=${source}; const snapshot=source.value; mutate(source); return snapshot;`,
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//     expect(
//       resultValue(
//         `const source=${source}; mutate(source); const snapshot=source.value; return snapshot;`,
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it.each(["(source as {value:number})", "(source satisfies {value:number})"])(
//     "captures through a wrapped alias: %s",
//     (alias) => {
//       expect(
//         resultValue(
//           `const source={value:1}; const alias=${alias}; const snapshot=alias.value; mutate(alias); return snapshot;`,
//         ),
//       ).toEqual({ status: "literal", value: 1 });
//     },
//   );
//
//   it.each([
//     ["{child:{}}", "{child:copy=fallback}"],
//     ["[{}]", "[copy=fallback]"],
//   ])("guards fallback selection before escape: %s", (source, pattern) => {
//     expect(
//       resultValue(
//         `const fallback={value:1}; const source=${source}; const ${pattern}=source; mutate(copy); return fallback.value;`,
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//     expect(
//       resultValue(
//         `const fallback={value:1}; const source=${source}; mutate(source); const ${pattern}=source; mutate(copy); return fallback.value;`,
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it.each([
//     "const source={value:1}, snapshot=source.value; mutate(source);",
//     "const source={value:1}, snapshot=source.value, ignored=mutate(source);",
//   ])("preserves sequential declarator captures: %s", (body) => {
//     expect(resultValue(`${body} return snapshot;`)).toEqual({
//       status: "literal",
//       value: 1,
//     });
//   });
//
//   it("retains an escape in an earlier declarator", () => {
//     expect(
//       resultValue(
//         "const source={value:1}, ignored=mutate(source), snapshot=source.value; return snapshot;",
//       )?.status,
//     ).toBe("unknown");
//   });
// });
//
// describe("primitive snapshots across calls", () => {
//   it.each([
//     "const [copy] = source;",
//     "const copy = [...source];",
//     "for (const copy of source) {}",
//   ])("preserves snapshots taken before custom iteration: %s", (iteration) => {
//     expect(
//       resultValue(`
//         const source = { *[Symbol.iterator]() { yield this; }, value: 1 };
//         const snapshot = source.value;
//         ${iteration}
//         return snapshot;
//       `),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it.each([
//     "const [copy] = alias;",
//     "const copy = [...alias];",
//     "for (const copy of alias) {}",
//   ])("ignores iterable aliases replaced before %s", (iteration) => {
//     expect(
//       resultValue(`
//         const source = { *[Symbol.iterator]() { yield this; }, value: 1 };
//         let alias = source;
//         alias = [];
//         ${iteration}
//         return source.value;
//       `),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it.each([
//     ["const snapshot=source.value;", "snapshot"],
//     ["const {value:snapshot}=source;", "snapshot"],
//     ["const copy={value:source.value};", "copy.value"],
//     ['const copy={["snapshot"]:source.value};', "copy.snapshot"],
//     ['const copy={[""]:source.value};', 'copy[""]'],
//     ["const copy={[0]:source.value};", "copy[0]"],
//     ['const copy={[("snapshot" as string)]:source.value};', "copy.snapshot"],
//     ["const copy=[source.value];", "copy[0]"],
export const _l = 167;
