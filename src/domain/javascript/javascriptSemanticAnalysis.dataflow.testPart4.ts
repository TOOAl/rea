export const __stub = 1;
//       value: "first",
//     });
//     expect(topLevelBinding(ir, "second").value.status).toBe("unknown");
//   });
// });
//
// describe("object value overwrite boundaries", () => {
//   it("uses the last named property and keeps later exact overwrites", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const duplicate = { key: "old", key: "new" };
//       const selected = duplicate.key;
//       const later = { key: "old", ...unknownObject, key: "final" };
//       const final = later.key;
//     `);
//     expect(topLevelBinding(ir, "selected").value).toEqual({
//       status: "literal",
//       value: "new",
//     });
//     expect(topLevelBinding(ir, "final").value).toEqual({
//       status: "literal",
//       value: "final",
//     });
//   });
//   it("does not retain an exact earlier value after an unknown overwrite", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const spread = { key: "old", ...unknownObject };
//       const dynamic = { key: "old", [unknownKey]: "new" };
//       const method = { key: "old", key() { return "new"; } };
//       const spreadValue = spread.key;
//       const dynamicValue = dynamic.key;
//       const methodValue = method.key;
//     `);
//     for (const name of ["spreadValue", "dynamicValue", "methodValue"])
//       expect(topLevelBinding(ir, name).value.status).toBe("unknown");
//   });
//   it("admits literal computed keys while excluding prototype setters", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const object = { ["key"]: "value", __proto__: { prototype: true } };
//       const selected = object.key;
//       const prototype = object.__proto__;
//     `);
//     expect(topLevelBinding(ir, "selected").value).toEqual({
//       status: "literal",
//       value: "value",
//     });
//     expect(topLevelBinding(ir, "prototype").value.status).toBe("unknown");
//   });
// });
//
// it("retains shorthand __proto__ as an own data property", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const __proto__ = "own";
//     const object = { __proto__ };
//     const selected = object.__proto__;
//   `);
//   expect(topLevelBinding(ir, "selected").value).toEqual({
//     status: "literal",
//     value: "own",
//   });
// });
//
// describe("nonfinite static values", () => {
//   it.each(['+"not-a-number"', '-"not-a-number"', "1e308 + 1e308", "1e309"])(
//     "keeps %s unknown instead of publishing a non-JSON number",
//     (expression) => {
//       const ir = analyzeJavaScriptSemantics(`const answer = ${expression};`);
//       expect(topLevelBinding(ir, "answer").value.status).toBe("unknown");
//     },
//   );
//   it("does not collapse an uncertain nonfinite branch to its finite alternative", () => {
//     const ir = analyzeJavaScriptSemantics(
//       'const answer = condition ? 1 : +"invalid";',
//     );
//     expect(topLevelBinding(ir, "answer").value.status).toBe("ambiguous");
//   });
// });
//
// describe("binding write invalidation", () => {
//   it.each([
//     ["let value = 1; value++; const observed = value;", "unknown"],
//     ["let value = 1; --value; const observed = value;", "unknown"],
//     [
//       'let value = "old"; [value] = ["new"]; const observed = value;',
//       "ambiguous",
//     ],
//     [
//       'let value = "old"; ({key: value} = {key: "new"}); const observed = value;',
//       "ambiguous",
//     ],
//     [
//       'let value = "old"; for (value of ["new"]) {} const observed = value;',
//       "ambiguous",
//     ],
//     [
//       'let value = "old"; for (value in {new: true}) {} const observed = value;',
//       "ambiguous",
//     ],
//   ] as const)(
//     "does not retain an exact initializer across %s",
//     (source, status) => {
//       const ir = analyzeJavaScriptSemantics(source);
//       expect(topLevelBinding(ir, "observed").value.status).toBe(status);
//       expect(
//         topLevelBinding(ir, "value").definitions.some(
//           ({ kind }) => kind === "assignment",
//         ),
//       ).toBe(true);
//     },
//   );
//
//   it("does not treat destructuring keys or member owners as assigned bindings", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const key = "stable";
//       const owner = "stable";
//       let target = "old";
//       ({key: target} = {key: "new"});
//       ({owner: object.slot} = {owner: "new"});
//       const preservedKey = key;
//       const preservedOwner = owner;
//     `);
//     for (const name of ["preservedKey", "preservedOwner"])
//       expect(topLevelBinding(ir, name).value).toEqual({
//         status: "literal",
//         value: "stable",
//       });
//   });
// });
//
// describe("JavaScript semantic analysis: unknown default inputs", () => {
//   it.each([
//     'function launch(mode = "safe") { return mode; }',
//     'function launch({ mode } = { mode: "safe" }) { return mode; }',
//     'function launch([mode] = ["safe"]) { return mode; }',
//   ])("does not assume an optional argument is omitted: %s", (source) => {
//     const ir = analyzeJavaScriptSemantics(source);
//     expect(onlyCallable(ir, "launch").returnSites[0]?.value.status).toBe(
//       "unknown",
//     );
//   });
//
//   it("preserves known declaration inputs and unknown catch bindings", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const { mode: retained = "fallback" } = { mode: "actual" };
//       function caught() {
//         try { risky(); } catch ({ message = "fallback" }) { return message; }
//       }
//     `);
//     expect(topLevelBinding(ir, "retained").value).toMatchObject({
//       status: "literal",
//       value: "actual",
//     });
//     expect(onlyCallable(ir, "caught").returnSites[0]?.value.status).toBe(
//       "unknown",
//     );
//   });
// });
export const _l = 156;
