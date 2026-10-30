export const __stub = 1;
//     ).toBe("unknown");
//   });
//
//   it.each([
//     "mutate(source as unknown);",
//     "mutate((0, source));",
//     "let alias; mutate(alias = source);",
//     "mutate(flag ? source : {});",
//     "let alias = source; mutate(alias ||= {});",
//     "let alias = source; mutate(alias ??= {});",
//   ])("follows a reference through %s", (invocation) => {
//     expect(
//       resultValue(`
//       const source = { value: 1 };
//       ${invocation}
//       return source.value;
//     `)?.status,
//     ).toBe("unknown");
//   });
// });
//
// describe("JavaScript escaped references through async and destructuring syntax", () => {
//   it("follows an awaited object argument", () => {
//     const ir = analyzeJavaScriptSemantics(`export async function result() {
//       const source = { value: 1 };
//       mutate(await source);
//       return source.value;
//     }`);
//     expect(onlyCallable(ir, "result").returnSites[0]?.value.status).toBe(
//       "unknown",
//     );
//   });
//
//   it.each([
//     "const { ...copy } = source; mutate(copy);",
//     "const { ...copy } = source; mutate(copy.child);",
//     "const [ ...copy ] = [source.child]; mutate(copy);",
//     "const [ first, ...copy ] = [null, source.child]; mutate(copy[0]);",
//     "const [ ...[copy] ] = [source.child]; mutate(copy);",
//     "const [ ...[copy = source.child] ] = []; mutate(copy);",
//     "const { value = source.child } = {}; mutate(value);",
//     "const [ value = source.child ] = []; mutate(value);",
//   ])("follows shared references through %s", (invocation) => {
//     expect(
//       resultValue(`
//       const source = { kind: "record", child: { value: 1 } };
//       ${invocation}
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
//   it("keeps an unused default reference unchanged when destructuring a defined value", () => {
//     expect(
//       resultValue(`
//       const source = { value: "TOKEN" };
//       const { value = source } = { value: 1 };
//       mutate(value);
//       return source.value;
//     `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it("keeps an unused nested default reference unchanged", () => {
//     expect(
//       resultValue(`
//       const unused = { value: "TOKEN" };
//       const { box: { value = unused } = { value: 1 } } = {};
//       mutate(value);
//       return unused.value;
//     `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it("reconsiders a destructuring fallback after later collection finds an escape", () => {
//     expect(
//       resultValue(`
//       const fallback = { value: 1 };
//       const source = { child: { value: 2 } };
//       function observe() { mutate(copy); }
//       remove(source);
//       const { child: copy = fallback } = source;
//       mutate(copy);
//       return fallback.value;
//     `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("follows a fallback write when the original projection appeared primitive", () => {
//     expect(
//       resultValue(`
//       const fallback = { value: 1 };
//       const source = { child: 1 };
//       function observe() { copy.value = 2; }
//       remove(source);
//       const { child: copy = fallback } = source;
//       observe();
//       return fallback.value;
//     `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("keeps fresh rest-copy slot writes from changing the original", () => {
//     expect(
//       resultValue(`
//       const source = { child: { value: "TOKEN" } };
//       const { ...copy } = source;
//       copy.child = {};
//       return source.child.value;
//     `),
//     ).toEqual({ status: "literal", value: "TOKEN" });
//   });
//
//   it("follows writes to shared children of rest copies", () => {
//     expect(
//       resultValue(`
//       const source = { kind: "record", child: { value: 1 } };
//       const { ...copy } = source;
//       copy.child.value = 2;
//       return { kind: source.kind, value: source.child.value };
//     `),
//     ).toMatchObject({
//       status: "object",
//       properties: [
//         { name: "kind", value: { status: "literal", value: "record" } },
//         { name: "value", value: { status: "unknown" } },
//       ],
//     });
//   });
//
//   it.each([
//     "const source = { skipped: {}, child: { value: 1 } }; const { skipped, ...copy } = source; mutate(copy); return source.child.value;",
//     "const source = [{}, { value: 1 }]; const [head, ...copy] = source; mutate(copy[0]); return source[1].value;",
//     "const source = [{}, { value: 1 }]; const [head, ...copy] = source; copy[0].value = 2; return source[1].value;",
//     "const source = { child: { value: 1 } }; const copy = { child: {}, ...source }; mutate(copy.child); return source.child.value;",
//     "const source = { child: { value: 1 } }; const copy = { ...source, [key]: {} }; mutate(copy.child); return source.child.value;",
//     "const source = [{ value: 1 }]; const copy = [{}, ...source]; mutate(copy[1]); return source[0].value;",
//     "const source = [{ value: 1 }]; const copy = [...other, ...source]; mutate(copy[0]); return source[0].value;",
//     "const source = [{ value: 1 }]; mutate([... [...source]]); return source[0].value;",
//     "const child = { value: 1 }; const source = { child, *[Symbol.iterator]() { yield this.child; } }; const copy = [{}, ...source]; mutate(copy[1]); return child.value;",
//     "const child = { value: 1 }; const source = { child, *[Symbol.iterator]() { yield null; yield this.child; } }; const [head, ...copy] = source; mutate(copy); return child.value;",
//     "const child = { value: 1 }; const source = [child]; source[Symbol.iterator] = function* () { yield null; yield this[0]; }; const [head, ...copy] = source; mutate(copy); return child.value;",
//     "const child = { value: 1 }; const source = [null, child]; source.__proto__ = { *[Symbol.iterator]() { yield this[1]; } }; const copy = [{}, ...source]; mutate(copy[1]); return child.value;",
//     "const source = [{ value: 1 }, {}]; Array.prototype[Symbol.iterator] = function* () { yield null; yield this[0]; }; const [head, ...copy] = source; mutate(copy[0]); return source[0].value;",
//     "const source = [null, { value: 1 }]; const prototype = Array.prototype; prototype[Symbol.iterator] = function* () { yield this[1]; }; const copy = [{}, ...source]; mutate(copy[1]); return source[1].value;",
//     "const source = [null, { value: 1 }]; const other = []; other.__proto__[Symbol.iterator] = function* () { yield this[1]; }; const copy = [{}, ...source]; mutate(copy[1]); return source[1].value;",
//     "const source = { child: { value: 1 } }; const copy = { ...source, get child() { return source.child; } }; mutate(copy.child); return source.child.value;",
//     "const source = { child: { value: 1 } }; const copy = { ...source, get child() { return source.child; }, set child(value) {} }; mutate(copy.child); return source.child.value;",
//   ])("preserves uncertainty for retained shared children: %s", (body) => {
//     expect(resultValue(body)?.status).toBe("unknown");
//   });
//
//   it("finishes repeated alias branches without expanding identical escape paths", () => {
//     const declarations = Array.from({ length: 24 }, (_, index) => {
//       const name = `alias${String(index + 1)}`;
//       const previous = `alias${String(index)}`;
//       return `let ${name} = ${previous}; ${name} = ${previous};`;
//     }).join("\n");
//     expect(
//       resultValue(`
//       let alias0 = { value: 1 };
//       ${declarations}
//       mutate(alias24);
//       return alias0.value;
//     `)?.status,
//     ).toBe("unknown");
//   });
// });
//
// describe("JavaScript shared array iteration", () => {
//   it.each([
//     "mutate(...source);",
//     "mutate?.(...source);",
//     "new Factory(...source);",
//     "const copy = [...source]; mutate(copy);",
//     "const copy = [{}, ...source]; mutate(copy[1]);",
//     "const copy = [...source]; copy[0].value = 2;",
//     "const [...copy] = source; mutate(copy);",
//     "const [...copy] = source; copy[0].value = 2;",
//     "const wrapper = { source }; const { source: [...copy] } = wrapper; mutate(copy);",
//     "const [copy] = source; mutate(copy);",
//     "let copy; [copy] = source; mutate(copy);",
//     "const { nested: [copy] } = { nested: source }; mutate(copy);",
//     "for (const copy of source) mutate(copy);",
//     "let copy; for (copy of source) mutate(copy);",
//   ])("invalidates an iterable that yields itself through %s", (effect) => {
//     expect(
//       resultValue(`
//         const source = { *[Symbol.iterator]() { yield this; }, value: "TOKEN" };
//         ${effect}
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
//     "const { missing: [copy] = source } = {};",
//     "function consume([copy] = source) {} consume();",
//     "function* copies() { yield* source; } consume(copies());",
//   ])("accounts for custom iterator receiver effects in %s", (iteration) => {
//     expect(
//       resultValue(`
//         const source = { *[Symbol.iterator]() { this.value = "changed"; yield this; }, value: "TOKEN" };
//         ${iteration}
export const _l = 217;
