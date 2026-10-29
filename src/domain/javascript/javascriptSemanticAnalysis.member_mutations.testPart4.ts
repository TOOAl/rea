export const __stub = 1;
//         return source.value;
//       `)?.status,
//     ).toBe("unknown");
//   });
//
//   it.each([
//     "const [copy] = source;",
//     "const copy = [...source];",
//     "for (const copy of source) {}",
//     "const { nested: [copy] } = { nested: source };",
//     "const [...[[copy]]] = [source];",
//     "const [...{ 0: [copy] }] = [source];",
//     "for (const [copy] of [source]) {}",
//   ])("preserves ordinary array values after %s", (iteration) => {
//     expect(
//       resultValue(`const source = ["TOKEN"]; ${iteration} return source[0];`),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it.each([
//     "const { nested: [copy] = source } = { nested: [] };",
//     "const [[copy] = source] = [[]];",
//     "const { a: { b: [copy] = source } = { b: [] } } = {};",
//     "for (const { nested: [copy] = source } of [{ nested: [] }]) {}",
//     "for (const [[copy] = source] of [[[]]]) {}",
//     "for (const { nested: [copy] = source } of []) {}",
//   ])("does not execute unused iterator defaults in %s", (iteration) => {
//     expect(
//       resultValue(`
//         const source = { *[Symbol.iterator]() { yield this; }, value: "TOKEN" };
//         ${iteration}
//         return source.value;
//       `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it.each([
//     "source[Symbol.iterator] = function* () { yield this; };",
//     "Array.prototype[Symbol.iterator] = function* () { yield this; };",
//   ])("invalidates a custom array iterator's root after %s", (override) => {
//     expect(
//       resultValue(`
//         const source = ["TOKEN"];
//         ${override}
//         mutate(...source);
//         return source[0];
//       `)?.status,
//     ).toBe("unknown");
//   });
//
//   it.each(["globalThis", "global", "window", "self"])(
//     "retains uncertainty after %s.Array.prototype changes",
//     (globalName) => {
//       expect(
//         resultValue(`
//         const source = [null, { value: 1 }];
//         ${globalName}.Array.prototype[Symbol.iterator] = function* () { yield this[1]; };
//         const copy = [{}, ...source];
//         mutate(copy[1]);
//         return source[1].value;
//       `)?.status,
//       ).toBe("unknown");
//     },
//   );
//
//   it("respects a shadowed global object when checking iteration", () => {
//     expect(
//       resultValue(`
//       const globalThis = { Array: { prototype: {} } };
//       globalThis.Array.prototype[Symbol.iterator] = function* () { yield null; };
//       const source = [{ value: "TOKEN" }];
//       const [head, ...copy] = source;
//       mutate(copy);
//       return source[0].value;
//     `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
// });
//
// const unchangedProperties = [
//   'const source = { only: { value: "TOKEN" } }; const { only, ...copy } = source; mutate(copy); return source.only.value;',
//   'const source = [{ value: "TOKEN" }]; const [head, ...copy] = source; mutate(copy); return source[0].value;',
//   'const source = { child: { value: "TOKEN" } }; const copy = { ...source, child: { value: 2 } }; mutate(copy.child); return source.child.value;',
//   'const source = [{ value: "TOKEN" }]; const copy = [{ value: 0 }, ...source]; mutate(copy[0]); return source[0].value;',
//   'const source = { child: { value: "TOKEN" } }; const copy = { ...source, ["child"]: { value: 2 } }; mutate(copy); return source.child.value;',
//   'const child = { value: "TOKEN" }; const copy = { child, child: {} }; mutate(copy); return child.value;',
//   'const source = [{ value: "TOKEN" }, { value: 2 }]; const [head, ...copy] = source; mutate(copy[0]); return source[0].value;',
//   'const source = [{ value: "TOKEN" }, { value: 2 }]; const copy = [{}, ...source]; mutate(copy[2]); return source[0].value;',
//   'const source = [{ value: "TOKEN" }]; const copy = [, ...source]; mutate(copy[0]); return source[0].value;',
//   'const source = [{ value: "TOKEN" }]; const copy = [...source]; mutate(copy["01"]); return source[0].value;',
//   'const source = { only: { value: "TOKEN" } }; const { ["only"]: consumed, ...copy } = source; mutate(copy); return source.only.value;',
//   'const source = { child: { value: "TOKEN" } }; const copy = { ...source, child() {} }; mutate(copy); return source.child.value;',
//   'const source = { token: "TOKEN", count: 1 }; source.count = 2; return source.token;',
//   'const source = { token: "TOKEN", count: 1 }; const alias = source; alias.count++; return source.token;',
//   'const source = { token: "TOKEN", count: 1 }; delete source.count; return source.token;',
//   'const source = { nested: { token: "TOKEN", count: 1 } }; source.nested.count = 2; return source.nested.token;',
//   'const source = { nested: { token: "TOKEN", count: 1 } }; const { nested } = source; nested.count = 2; return source.nested.token;',
//   'const child = { token: "TOKEN", count: 1 }; const source = { child }; source.child.count = 2; return child.token;',
//   'const source = ["TOKEN", 1]; source[1] = 2; return source[0];',
//   'const source = ["TOKEN"]; source.extra = 2; return source[0];',
//   'const source = ["TOKEN"]; source["01"] = 2; return source[0];',
//   'const source = ["TOKEN"]; source[1000000000] = 2; return source[0];',
//   'const child = { token: "TOKEN", count: 1 }; const source = [child]; source[0].count = 2; return child.token;',
//   'const source = { token: "TOKEN" }; source.added = 2; return source.token;',
//   'const source = { token: "TOKEN", count: 1, other: 1 }; source.count = 2; source.other = 2; return source.token;',
//   'const left = { token: "TOKEN", count: 1 }; const right = { count: 1 }; const source = { left, right }; source.right.count = 2; return left.count + ":" + left.token;',
// ];
//
// describe("JavaScript semantic values for properties unaffected by a mutation", () => {
//   it.each(unchangedProperties)("retains an unaffected property: %s", (body) => {
//     expect(resultValue(body)).toEqual({
//       status: "literal",
//       value: body.includes("left.count") ? "1:TOKEN" : "TOKEN",
//     });
//   });
//
//   it("keeps the changed slot unknown alongside an unchanged literal slot", () => {
//     expect(
//       resultValue(
//         'const source = { token: "TOKEN", count: 1 }; source.count = 2; return source.count;',
//       )?.status,
//     ).toBe("unknown");
//   });
// });
//
// describe("property mutations through TypeScript satisfies aliases", () => {
//   it.each([
//     'const shared = { mode: "initial" }; const alias = shared satisfies { mode: string }; alias.mode = "updated"; return shared.mode;',
//     'const shared = { nested: { mode: "initial" } }; const alias = shared satisfies { nested: { mode: string } }; alias.nested.mode = "updated"; return shared.nested.mode;',
//     'const shared = { mode: "initial" }; const alias = (shared satisfies { mode: string }) as { mode: string }; delete alias.mode; return shared.mode;',
//     "const shared = [1]; const alias = shared satisfies number[]; alias[0]++; return shared[0];",
//   ])("keeps the mutated value unknown: %s", (body) => {
//     expect(resultValue(body)?.status).toBe("unknown");
//   });
//
//   it("retains the untouched property through a satisfies alias", () => {
//     expect(
//       resultValue(`
//       const shared = { mode: "initial", token: "TOKEN" };
//       const alias = shared satisfies { mode: string; token: string };
//       alias.mode = "updated";
//       return shared.token;
//     `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
// });
//
// describe("property mutation collection on minified bundles", () => {
//   it("records each write to one object without replaying earlier writes", () => {
//     const writes = Array.from(
//       { length: 2000 },
//       (_, index) => `source.p${index} = ${index};`,
//     ).join(" ");
//     const value = resultValue(
//       `const source = { token: "TOKEN" }; ${writes} return [source.token, source.p1999];`,
//     );
//     expect(value).toMatchObject({
//       status: "array",
//       items: [
//         { value: { status: "literal", value: "TOKEN" } },
//         { value: { status: "unknown" } },
//       ],
//     });
//   }, 30000);
//
//   it("indexes many returned object methods instead of rescanning the object", () => {
//     const methods = Array.from(
//       { length: 2000 },
//       (_, index) => `m${index}() { return shared; }`,
//     ).join(",");
//     const writes = Array.from(
//       { length: 2000 },
//       (_, index) => `box.m${index}().p${index} = ${index};`,
//     ).join(" ");
//     const value = resultValue(
//       `const shared = { token: "TOKEN" }; const box = { ${methods} }; ${writes} return shared.token;`,
//     );
//     expect(value?.status).toBe("unknown");
//   }, 30000);
// });
//
// describe("results of methods on an escaped receiver", () => {
//   it("makes every method's distinct result uncertain, not only the called one", () => {
//     expect(
//       resultValue(
//         'const first = { t: "A" }; const second = { t: "B" }; const kept = { t: "C" }; const box = { a() { return first; }, b() { return second; }, c() { return first; } }; box.a(); return [first.t, second.t, kept.t];',
//       ),
//     ).toMatchObject({
//       status: "array",
//       items: [
//         { value: { status: "unknown" } },
//         { value: { status: "unknown" } },
//         { value: { status: "literal", value: "C" } },
//       ],
//     });
//   });
//
//   it("keeps a shared result uncertain across a wide escaped receiver (#1495)", () => {
//     const count = 2000;
//     const methods = Array.from(
//       { length: count },
//       (_, index) => `m${index}() { return shared; },`,
//     ).join(" ");
//     const calls = Array.from(
//       { length: count },
//       (_, index) => `box.m${index}().p${index} = ${index};`,
//     ).join(" ");
//     const value = resultValue(
//       `const shared = { token: "TOKEN" }; const box = { ${methods} }; ${calls} return [shared.token];`,
//     );
//     expect(value).toMatchObject({
//       status: "array",
//       items: [{ value: { status: "unknown" } }],
//     });
//   }, 30000);
// });
export const _l = 216;
