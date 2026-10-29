export const __stub = 1;
//   ])("preserves primitive capture before escape: %s", (capture, result) => {
//     expect(
//       resultValue(
//         `const source={value:1}; ${capture} mutate(source); return ${result};`,
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//     expect(
//       resultValue(
//         `const source={value:1}; mutate(source); ${capture} return ${result};`,
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it.each([
//     ["const copy={value:source.value};", "copy.value"],
//     ["const copy=[source.value];", "copy[0]"],
//   ])(
//     "retains a literal field's earlier primitive capture: %s",
//     (copy, read) => {
//       expect(
//         resultValue(
//           `const source={value:1}; ${copy} mutate(source); const snapshot=${read}; mutate(copy); return snapshot;`,
//         ),
//       ).toEqual({ status: "literal", value: 1 });
//       expect(
//         resultValue(
//           `const source={value:1}; mutate(source); ${copy} const snapshot=${read}; mutate(copy); return snapshot;`,
//         )?.status,
//       ).toBe("unknown");
//     },
//   );
//
//   it.each([
//     ["const copy={child:source.child};", "copy.child"],
//     ["const copy=[source.child];", "copy[0]"],
//   ])(
//     "keeps a shared child uncertain across both capture points: %s",
//     (copy, read) => {
//       expect(
//         resultValue(
//           `const source={child:{value:1}}; ${copy} mutate(source); const snapshot=${read}; mutate(copy); return snapshot.value;`,
//         )?.status,
//       ).toBe("unknown");
//     },
//   );
//
//   it.each([
//     "const alias=source; const snapshot=alias.value; mutate(alias); return snapshot;",
//     "const alias=source.child; const snapshot=alias.value; mutate(alias); return snapshot;",
//   ])("captures through an earlier intermediate reference: %s", (body) => {
//     expect(
//       resultValue(`const source={value:1,child:{value:1}}; ${body}`),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it("does not read a later alias initializer at an earlier capture point", () => {
//     expect(
//       resultValue(
//         "const source={value:1}; var alias; const snapshot=alias?.value; mutate(source); alias=source; return snapshot;",
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it("does not treat a persistent child as freshly allocated with its wrapper", () => {
//     const ir = analyzeJavaScriptSemantics(
//       "const child={value:1}; export function result(){const source={child}; const alias=source.child; const snapshot=alias.value; mutate(alias); return snapshot;}",
//     );
//     expect(onlyCallable(ir, "result").returnSites[0]?.value.status).toBe(
//       "unknown",
//     );
//   });
//
//   it("keeps persistent sources uncertain across function activations", () => {
//     const ir = analyzeJavaScriptSemantics(
//       "const source={value:1}; export function result(){const snapshot=source.value; mutate(source); return snapshot;}",
//     );
//     expect(onlyCallable(ir, "result").returnSites[0]?.value.status).toBe(
//       "unknown",
//     );
//   });
//
//   it("keeps reads from earlier loop iterations uncertain", () => {
//     expect(
//       resultValue(
//         "const source={value:1}; for(let i=0;i<2;i++){const snapshot=source.value; mutate(source); if(i===1)return snapshot;}",
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it.each([
//     "const copy={child:source.child}; return copy.child.value;",
//     "const copy=source.child; return copy.value;",
//     "const copy=[source.child]; return copy[0].value;",
//   ])("keeps shared children live: %s", (body) => {
//     expect(
//       resultValue(
//         `const source={child:{value:1}}; ${body.replace("return", "mutate(source); return")}`,
//       )?.status,
//     ).toBe("unknown");
//   });
// });
//
// describe("references captured before an intermediate rebind", () => {
//   it.each([
//     ["const saved=alias;", "alias=saved;", "mutate(alias);"],
//     ["const saved=alias;", "alias=saved;", "alias.value=9;"],
//     ["const saved={child:alias};", "alias=saved.child;", "mutate(alias);"],
//     ["const {...saved}={child:alias};", "alias=saved.child;", "mutate(alias);"],
//     ["const [...saved]=[alias];", "alias=saved[0];", "mutate(alias);"],
//     ["const {saved=alias}={};", "alias=saved;", "mutate(alias);"],
//   ])("follows an alias restored from %s", (capture, restore, effect) => {
//     expect(
//       resultValue(
//         `const source={value:1}; let alias=source; ${capture} ${restore} ${effect} return source.value;`,
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it.each([
//     ["const saved=alias;", "mutate(saved);"],
//     ["const saved={child:alias};", "mutate(saved.child);"],
//     ["const {...saved}={child:alias};", "mutate(saved.child);"],
//     ["const [...saved]=[alias];", "mutate(saved[0]);"],
//     ["const {saved=alias}={};", "mutate(saved);"],
//     ["const [saved=alias]=[];", "mutate(saved);"],
//     ["const saved=alias;", "saved.method();"],
//     ["const saved=alias;", "mutate(alias,saved);"],
//     ["const saved=alias;", "mutate(saved,alias);"],
//   ])("preserves the original reference captured by %s", (capture, effect) => {
//     expect(
//       resultValue(
//         `const source={value:1}; let alias=source; ${capture} alias={}; ${effect} return source.value;`,
//       )?.status,
//     ).toBe("unknown");
//     expect(
//       resultValue(
//         `const source={value:1}; let alias=source; alias={}; ${capture} ${effect} return source.value;`,
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it.each([
//     [
//       "let {...alias}={child:source};",
//       "alias={child:{}};",
//       "saved.child.value=9;",
//     ],
//     ["let [...alias]=[source];", "alias=[{}];", "saved[0].value=9;"],
//     ["let {alias=source}={};", "alias={};", "saved.value=9;"],
//     ["let [alias=source]=[];", "alias={};", "saved.value=9;"],
//   ])(
//     "preserves a saved rest/default reference from %s",
//     (declaration, rebind, effect) => {
//       expect(
//         resultValue(
//           `const source={value:1}; ${declaration} const saved=alias; ${rebind} ${effect} return source.value;`,
//         )?.status,
//       ).toBe("unknown");
//       expect(
//         resultValue(
//           `const source={value:1}; ${declaration} ${rebind} const saved=alias; ${effect} return source.value;`,
//         ),
//       ).toEqual({ status: "literal", value: 1 });
//     },
//   );
// });
export const _l = 166;
