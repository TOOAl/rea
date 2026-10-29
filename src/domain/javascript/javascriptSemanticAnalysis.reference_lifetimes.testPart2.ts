export const __stub = 1;
//               reason: "This property may have been mutated.",
//             },
//           },
//           {
//             name: "keep",
//             presence: "present",
//             value: { status: "literal", value: 3 },
//           },
//         ]),
//       });
//     },
//   );
//
//   it.each([
//     ["use(node);", "m0.value", "unknown"],
//     ["node.value = 2;", "m0.value", "unknown"],
//     ["node.value = 2;", "mode", "literal"],
//   ])(
//     "bounds a loop that reassigns one reference through many members: %s seed.%s",
//     (effect, read, status) => {
//       const branches = Array.from(
//         { length: 9 },
//         (_, index) => `if (flag === ${index}) node = node.m${index};`,
//       ).join(" else ");
//       const start = performance.now();
//       const value = resultValue(
//         `const seed = { mode: "initial", m0: { value: 1 } }; let node = seed; while (node) { ${branches} ${effect} } return seed.${read};`,
//       );
//       expect(performance.now() - start).toBeLessThan(2000);
//       expect(value?.status).toBe(status);
//     },
//     30000,
//   );
//
//   it.each([
//     ["const alias = flag ? owner.child : owner; alias.value = 2;", "value"],
//     ["const alias = flag ? owner : owner.child; alias.value = 2;", "value"],
//     ["const alias = flag ? owner.child : owner; alias[key] = 2;", "value"],
//     [
//       "const alias = flag ? owner.child : owner; alias.child = 2;",
//       "child.value",
//     ],
//     [
//       "let alias = owner; let i = 0; while (i++ < 1) { alias = flag ? alias.child : alias; alias.value = 2; }",
//       "value",
//     ],
//     [
//       "let alias = owner; let i = 0; while (i++ < 1) { alias = flag ? alias.child : alias; alias.value = 2; }",
//       "child.value",
//     ],
//   ])(
//     "keeps a write that reaches a child through a longer path: %s",
//     (body, read) => {
//       expect(
//         resultValue(
//           `const shared = { value: 1, child: { value: 1 } }; const owner = { child: shared }; ${body} return shared.${read};`,
//         )?.status,
//       ).toBe("unknown");
//     },
//   );
//
//   it.each([
//     "mutate(source.left, source.right);",
//     "const alias = flag ? source.left : source.right; mutate(alias);",
//     "const copy = flag ? [source.left] : [source.right]; mutate(copy);",
//     "const alias = flag ? source.left : source.right; alias.value = 2;",
//   ])("keeps members outside the mutated paths: %s", (body) => {
//     expect(
//       resultValue(
//         `const source = { left: { value: 1 }, right: { value: 2 }, keep: { value: 3 } }; ${body} return source.keep.value;`,
//       ),
//     ).toEqual({ status: "literal", value: 3 });
//   });
// });
//
// describe("distinct observable mutation paths", () => {
//   it.each([
//     ["alias.value = 2;", "left"],
//     ["alias.value = 2;", "right"],
//     ["mutate(alias);", "left"],
//     ["mutate(alias);", "right"],
//   ])(
//     "propagates both conditional paths to shared bindings: %s %s",
//     (effect, target) => {
//       expect(
//         resultValue(
//           `const left={value:1}; const right={value:2}; const source={left,right}; const alias=flag?source.left:source.right; ${effect} return ${target}.value;`,
//         )?.status,
//       ).toBe("unknown");
//     },
//   );
//
//   it.each(["mutate(alias);", "alias.value = 2;"])(
//     "preserves sibling facts below a shared prefix: %s",
//     (effect) => {
//       expect(
//         resultValue(
//           `const shared={left:{value:1},right:{value:2},keep:{value:3}}; const source={nested:shared}; const alias=flag?source.nested.left:source.nested.right; ${effect} return shared.keep.value;`,
//         ),
//       ).toEqual({ status: "literal", value: 3 });
//     },
//   );
// });
//
// describe("reference lifetimes across calls and shallow copies", () => {
//   it("bounds dynamic destructuring across shared alias branches", () => {
//     const declarations = Array.from(
//       { length: 9 },
//       (_, index) =>
//         `const alias${index + 1} = { left: alias${index}, right: alias${index} };`,
//     ).join("\n");
//     const pattern = "{ [key]: ".repeat(9) + "[copy]" + " }".repeat(9);
//     const start = performance.now();
//     resultValue(
//       `const alias0 = [1]; ${declarations} const ${pattern} = alias9; return alias0[0];`,
//     );
//     expect(performance.now() - start).toBeLessThan(2000);
//   }, 30000);
//
//   it("bounds conditional shallow-copy traversal while retaining shared children", () => {
//     const declarations = Array.from(
//       { length: 20 },
//       (_, i) =>
//         `const alias${i + 1} = flag ? {...alias${i}, a${i}:{}} : {...alias${i}, b${i}:{}};`,
//     ).join("\n");
//     const start = performance.now();
//     expect(
//       resultValue(
//         `const alias0 = { value: { token: 1 } }; ${declarations} consume(alias20); return alias0.value.token;`,
//       )?.status,
//     ).toBe("unknown");
//     expect(performance.now() - start).toBeLessThan(2000);
//   }, 30000);
//
//   it.each([
//     ["child: {}", "child: {}", "literal"],
//     ["child: {}", "other: {}", "unknown"],
//   ])(
//     "retains exclusions common to both branches: %s / %s",
//     (left, right, status) => {
//       expect(
//         resultValue(
//           `const source = {child:{value:1}}; const copy = flag ? {...source, ${left}} : {...source, ${right}}; consume(copy); return source.child.value;`,
//         )?.status,
//       ).toBe(status);
//     },
//   );
//
//   it.each([
//     "mutate(alias)",
//     "alias.method()",
//     "new Factory(alias)",
//     "tag`${alias}`",
//     "alias.tag``",
//     "mutate((0, alias))",
//   ])("drops replaced call origins for %s", (call) => {
//     expect(
//       resultValue(
//         `const source={value:1}; let alias=source; alias={}; ${call}; return source.value;`,
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it.each([
//     "mutate(alias); alias={};",
//     "if(flag) alias={}; mutate(alias);",
//     "alias={}; if(flag) mutate(alias);",
export const _l = 167;
