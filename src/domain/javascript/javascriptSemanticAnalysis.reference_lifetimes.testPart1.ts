export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { analyzeJavaScriptSemantics } from "./javascriptSemanticAnalysis.js";
// import { onlyCallable } from "./javascriptSemanticAnalysis.fixture.js";
//
// const resultValue = (body: string) =>
//   onlyCallable(
//     analyzeJavaScriptSemantics(`export function result() { ${body} }`),
//     "result",
//   ).returnSites[0]?.value;
//
// describe("bounded paths through dynamic selectors and class origins", () => {
//   it("bounds linked-list walks through class instances", () => {
//     const start = performance.now();
//     const analysis = analyzeJavaScriptSemantics(`
//       class List { tail = null; }
//       export function walk() {
//         const list = new List();
//         let node = list.tail;
//         while (node) { use(node.value.parent); node = node.previous; }
//         return 42;
//       }
//     `);
//     expect(onlyCallable(analysis, "walk").returnSites[0]?.value).toEqual({
//       status: "literal",
//       value: 42,
//     });
//     expect(performance.now() - start).toBeLessThan(2000);
//   }, 30000);
//
//   it("retains effects through class getter aliases while bounding loop paths", () => {
//     expect(
//       resultValue(`
//       const shared = { value: 1 };
//       class List { get tail() { return { value: shared }; } }
//       let node = new List().tail;
//       while (node) { use(node.value); node = node.previous; }
//       return shared.value;
//     `)?.status,
//     ).toBe("unknown");
//   });
//
//   it("bounds dynamic-key setter loops that also create literal containers", () => {
//     const start = performance.now();
//     const analysis = analyzeJavaScriptSemantics(`
//       export function set(root, keys, value) {
//         let node = root;
//         for (const [index, key] of keys.entries()) {
//           if (index === keys.length - 1) { node[key] = value; return root; }
//           const child = node[key];
//           if (isObject(child)) { node = child; continue; }
//           const fresh = isIndex(keys[index + 1]) ? [] : {};
//           node[key] = fresh;
//           node = fresh;
//         }
//         return root;
//       }
//       export function unaffected() { return 42; }
//     `);
//     expect(onlyCallable(analysis, "unaffected").returnSites[0]?.value).toEqual({
//       status: "literal",
//       value: 42,
//     });
//     expect(onlyCallable(analysis, "set").returnSites[0]?.value.status).toBe(
//       "unknown",
//     );
//     expect(performance.now() - start).toBeLessThan(2000);
//   }, 30000);
//
//   it("retains shared-child mutations reached by dynamic-key alias loops", () => {
//     expect(
//       resultValue(`
//       const shared = { value: 1 };
//       const source = { child: { next: shared }, keep: 3 };
//       let node = source.child;
//       while (flag) { node = node[key] || {}; node.value = 2; }
//       return shared.value;
//     `)?.status,
//     ).toBe("unknown");
//     expect(
//       resultValue(`
//       const source = { child: { value: 1 }, keep: 3 };
//       let node = source.child;
//       while (flag) { node = node[key] || {}; node.value = 2; }
//       return source.keep;
//     `),
//     ).toEqual({ status: "literal", value: 3 });
//   });
// });
//
// describe("bounded member path propagation", () => {
//   it("bounds cyclic member paths with no observed container origin", () => {
//     const branches = Array.from(
//       { length: 16 },
//       (_, index) => `if (flag === ${index}) node = node.m${index};`,
//     ).join(" else ");
//     const start = performance.now();
//     const callable = onlyCallable(
//       analyzeJavaScriptSemantics(
//         `export function result(seed) { let node=seed; while(node) { ${branches} use(node.state); } return seed.keep; }`,
//       ),
//       "result",
//     );
//     expect(callable.returnSites[0]?.value.status).toBe("unknown");
//     expect(performance.now() - start).toBeLessThan(2000);
//   }, 30000);
//
//   it("preserves Array prototype effects through an otherwise unknown alias", () => {
//     expect(
//       resultValue(
//         "const values=[1]; const prototype=Array.prototype; prototype[Symbol.iterator]=custom; for(const item of values) { mutate(item); } return values[0];",
//       )?.status,
//     ).toBe("unknown");
//   });
//
//   it("bounds loops derived from a scalar member while preserving sibling facts", () => {
//     const branches = Array.from(
//       { length: 16 },
//       (_, index) => `if (flag === ${index}) node = node.m${index};`,
//     ).join(" else ");
//     const start = performance.now();
//     expect(
//       resultValue(
//         `const source={child:1,keep:{value:3}}; let node=source.child; while(node) { ${branches} use(node.state); } return source.keep.value;`,
//       ),
//     ).toEqual({ status: "literal", value: 3 });
//     expect(performance.now() - start).toBeLessThan(2000);
//   }, 30000);
//
//   // A dynamic self alias escapes its repeated prefix, which conservatively
//   // covers every child; a static key without that slot keeps the literal.
//   it.each([
//     ["node = node[key]", "node.name.toLowerCase();", "unknown"],
//     ["node = node[key]", "mutate(node);", "unknown"],
//     ["node = node[key]", "node.value = 2;", "unknown"],
//     ["node = node.next", "node.value = 2;", "literal"],
//   ])(
//     "bounds a self alias below an observed container: %s; %s",
//     (alias, effect, status) => {
//       const start = performance.now();
//       const value = resultValue(
//         `class Item {} const seed = { child: { value: 1 } }; let node = flag ? seed : new Item(); while ((${alias})) ${effect} return seed.child.value;`,
//       );
//       expect(performance.now() - start).toBeLessThan(2000);
//       expect(value?.status).toBe(status);
//     },
//     30000,
//   );
//
//   it.each([
//     ["child:external,", "child", "present"],
//     ["", "missing", "unknown-coverage"],
//   ])(
//     "retains slot presence below an unobserved container: %s",
//     (property, name, presence) => {
//       expect(
//         resultValue(
//           `const source={${property}keep:3}; const alias=source.${name}; alias.deep.value=2; return source;`,
//         ),
//       ).toMatchObject({
//         status: "object",
//         properties: expect.arrayContaining([
//           {
//             name,
//             presence,
//             value: {
//               status: "unknown",
export const _l = 167;
