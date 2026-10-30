export const __stub = 1;
//       "const shared = { value: 1 }; const box = { get value() { return shared; }, get value() { return { value: 2 }; } }; box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "a later data property replaces an object getter",
//       "const shared = { value: 1 }; const box = { get value() { return shared; }, value: { value: 2 } }; box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "a later object spread replaces an earlier getter",
//       "const shared = { value: 1 }; const box = { get value() { return shared; }, ...{ value: { value: 2 } } }; box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "a dynamic computed getter can replace a static getter",
//       "const shared = { value: 1 }; const key = 'value'; const box = { get value() { return { value: 2 }; }, get [key]() { return shared; } }; box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "a dynamic instance property can select a class getter",
//       "const shared = { value: 1 }; const key = getKey(); class Box { get value() { return shared; } } const box = new Box(); box[key].value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "a dynamic static property can select a class getter",
//       "const shared = { value: 1 }; const key = getKey(); class Box { static get value() { return shared; } } Box[key].value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "a paired object setter keeps its getter result",
//       "const shared = { value: 1 }; const box = { get value() { return shared; }, set value(next) {} }; box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "a paired class setter keeps its getter result",
//       "const shared = { value: 1 }; class Box { get value() { return shared; } set value(next) {} } const box = new Box(); box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "a later class field replaces a getter",
//       "const shared = { value: 1 }; class Box { get value() { return shared; } value = { value: 2 }; } const box = new Box(); box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "a class field shadows a getter even when declared earlier",
//       "const shared = { value: 1 }; class Box { value = { value: 2 }; get value() { return shared; } } const box = new Box(); box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "last duplicate class getter wins",
//       "const shared = { value: 1 }; class Box { get value() { return shared; } get value() { return { value: 2 }; } } const box = new Box(); box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "follows an inherited getter",
//       "const shared = { value: 1 }; class Base { get value() { return shared; } } class Derived extends Base {} const box = new Derived(); box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "follows every possible conditional superclass getter",
//       "const shared = { value: 1 }; class Fresh { get value() { return { value: 2 }; } } class Shared { get value() { return shared; } } class Derived extends (flag ? Fresh : Shared) {} const box = new Derived(); box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "includes an unknown computed getter that can shadow a static getter",
//       "const shared = { value: 1 }; const key = getKey(); class Box { get value() { return { value: 2 }; } get [key]() { return shared; } } const box = new Box(); box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "a later known getter shadows an earlier unknown computed getter",
//       "const shared = { value: 1 }; const key = getKey(); class Box { get [key]() { return shared; } get value() { return { value: 2 }; } } const box = new Box(); box.value.value = 3; return shared.value;",
//       "literal",
//     ],
//     [
//       "follows an aliased class constructor",
//       "const shared = { value: 1 }; class Box { get value() { return shared; } } const Alias = Box; const box = new Alias(); box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//     [
//       "follows an inline class constructor",
//       "const shared = { value: 1 }; const box = new (class { get value() { return shared; } })(); box.value.value = 3; return shared.value;",
//       "unknown",
//     ],
//   ])("%s", (_case, body, status) => {
//     expect(resultValue(body)?.status).toBe(status);
//   });
//
//   it("retains conservative unknowns for fresh getter reads and saved results", () => {
//     expect(
//       resultValue(
//         "const box = { get value() { return { x: 1 }; } }; const first = box.value; first.x = 2; return box.value.x;",
//       )?.status,
//     ).toBe("unknown");
//     expect(
//       resultValue(
//         "const box = { get value() { return { x: 1 }; } }; const saved = box.value; saved.x = 2; return saved.x;",
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it("does not invalidate unrelated state through a fresh getter result", () => {
//     expect(
//       resultValue(
//         "const shared = { value: 1 }; const box = { get fresh() { return { value: 2 }; } }; box.fresh.value = 3; return shared.value;",
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it("keeps a shared value known when its getter is never read", () => {
//     expect(
//       resultValue(
//         "const shared = { value: 1 }; const box = { get value() { return shared; } }; return shared.value;",
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//   });
//
//   it("keeps a shared value known after an optional getter read or ordinary method read", () => {
//     expect(
//       resultValue(
//         "const shared = { value: 1 }; const box = { get value() { return shared; } }; const alias = box?.value; return shared.value;",
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//     expect(
//       resultValue(
//         "const shared = { value: 1 }; const box = { value() { return shared; } }; const alias = box.value; return shared.value;",
//       ),
//     ).toEqual({ status: "literal", value: 1 });
//   });
// });
//
// it.each([
//   [
//     "instance getter assignment",
//     "const shared = { value: 1 }; class Box { get value() { return shared; } } const box = new Box(); box.value = {}; return shared.value;",
//   ],
//   [
//     "instance getter deletion",
//     "const shared = { value: 1 }; class Box { get value() { return shared; } } const box = new Box(); delete box.value; return shared.value;",
//   ],
//   [
//     "static getter assignment",
//     "const shared = { value: 1 }; class Box { static get value() { return shared; } } Box.value = {}; return shared.value;",
//   ],
//   [
//     "static getter deletion",
//     "const shared = { value: 1 }; class Box { static get value() { return shared; } } delete Box.value; return shared.value;",
//   ],
// ])(
//   "does not follow a class getter for direct property replacement or deletion (%s)",
//   (_name, body) => {
//     expect(resultValue(body)).toEqual({ status: "literal", value: 1 });
//   },
// );
//
// describe("JavaScript semantic values after mutable references escape", () => {
//   it("preserves copied scalar slots while invalidating shared children of an escaped object spread", () => {
//     expect(
//       resultValue(`
//       const source = { kind: "record", child: { value: 1 } };
//       const copy = { ...source };
//       mutate(copy);
//       return source;
//     `),
//     ).toMatchObject({
//       status: "object",
//       properties: [
//         { name: "child", value: { status: "unknown" }, presence: "present" },
//         { name: "kind", value: { status: "literal", value: "record" } },
//       ],
//     });
//   });
//
//   it("invalidates shared array children without invalidating copied primitives", () => {
//     expect(
//       resultValue(`
//       const child = { value: 1 };
//       const source = [child, "TOKEN"];
//       const copy = [...source];
//       mutate(copy);
//       return { token: source[1], value: child.value };
//     `),
//     ).toMatchObject({
//       status: "object",
//       properties: [
//         { name: "token", value: { status: "literal", value: "TOKEN" } },
//         { name: "value", value: { status: "unknown" } },
//       ],
//     });
//   });
//
//   it("keeps primitive spread arguments known", () => {
//     expect(
//       resultValue(
//         'const values = ["TOKEN"]; consume(...values); return values[0];',
//       ),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it("does not treat a member constructor as a call with its container as receiver", () => {
//     expect(
//       resultValue(`
//       const namespace = { token: "TOKEN", Factory: class {} };
//       new namespace.Factory();
//       return namespace.token;
//     `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it("does not reuse an initializer projection cached before call mutations were collected", () => {
//     expect(
//       resultValue(`
//       const source = { value: 1 };
//       function observe() { consume(copy); }
//       mutate(source);
//       const copy = source.value;
//       return copy;
//     `)?.status,
export const _l = 217;
