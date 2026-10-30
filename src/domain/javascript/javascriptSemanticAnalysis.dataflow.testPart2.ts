export const __stub = 1;
//   });
// });
//
// describe("JavaScript semantic call result flows", () => {
//   it("links only directly assigned scalar call results", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       function run() {
//         const direct = produce();
//         const { field } = unpack();
//         const nested = outer(inner());
//         return direct;
//       }
//     `);
//     const bindingNames = new Map(
//       ir.bindings.map(({ bindingId, name }) => [bindingId, name]),
//     );
//
//     expect(
//       ir.callResultFlows.map(({ bindingId }) => bindingNames.get(bindingId)),
//     ).toEqual(["direct", "nested"]);
//     expect(ir.callSites).toHaveLength(4);
//     expect(ir.callResultFlows.map(({ callSiteId }) => callSiteId)).toEqual([
//       ir.callSites[0]?.callSiteId,
//       ir.callSites[2]?.callSiteId,
//     ]);
//   });
// });
//
// describe("JavaScript semantic analysis: read-modify-write", () => {
//   it.each(["+= 1", "++", "--", "||= 1", "&&= 1", "??= 1"])(
//     "retains the property read in a read-modify-write operation: %s",
//     (operator) => {
//       const ir = analyzeJavaScriptSemantics(`
//         const source = { count: 1 };
//         source.count ${operator};
//       `);
//       expect(ir.objectOperations.map(({ kind }) => kind)).toEqual([
//         "read",
//         "write",
//       ]);
//     },
//   );
//
//   it("keeps plain member assignment write-only and member access read-only", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const source = { count: 1 };
//       source.count = 2;
//       const value = source.count;
//     `);
//     expect(ir.objectOperations.map(({ kind }) => kind)).toEqual([
//       "write",
//       "read",
//     ]);
//   });
//
//   it.each([
//     ["destructuring assignment", "[source.count] = [2];"],
//     ["destructuring assignment with default", "[source.count = 2] = [];"],
//     [
//       "nested destructuring assignment",
//       "({ value: { count: source.count } } = {});",
//     ],
//     ["rest destructuring assignment", "[...source.items] = [];"],
//     ["for-of head", "for (source.count of [4]) {}"],
//     ["for-in head", "for (source.count in { key: true }) {}"],
//     ["delete", "delete source.count;"],
//   ])("records a member target in %s as a write", (_name, statement) => {
//     const ir = analyzeJavaScriptSemantics(`
//       const source = { count: 1, items: [] };
//       ${statement}
//     `);
//     expect(ir.objectOperations.map(({ kind }) => kind)).toEqual(["write"]);
//   });
//
//   it.each([
//     ["non-null update", "source.count!++;"],
//     ["non-null compound assignment", "source.count! += 1;"],
//     ["cast compound assignment", "(source.count as number) += 1;"],
//     ["parenthesized update", "(source.count)++;"],
//   ])(
//     "retains the property read in a wrapped read-modify-write: %s",
//     (_name, statement) => {
//       const ir = analyzeJavaScriptSemantics(`
//         const source = { count: 1 };
//         ${statement}
//       `);
//       expect(ir.objectOperations.map(({ kind }) => kind)).toEqual([
//         "read",
//         "write",
//       ]);
//     },
//   );
//
//   it.each([
//     ["cast plain assignment", "(source.count as number) = 2;"],
//     ["non-null delete", "delete source.count!;"],
//   ])("keeps a wrapped %s write-only", (_name, statement) => {
//     const ir = analyzeJavaScriptSemantics(`
//       const source = { count: 1 };
//       ${statement}
//     `);
//     expect(ir.objectOperations.map(({ kind }) => kind)).toEqual(["write"]);
//   });
//
//   it("keeps a member in a destructuring default value a read", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       const source = { count: 1 };
//       let value;
//       [value = source.count] = [];
//     `);
//     expect(ir.objectOperations.map(({ kind }) => kind)).toEqual(["read"]);
//   });
//
//   it("does not model a compound binding write as a competing replacement", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       let count = 1;
//       count += 2;
//     `);
//
//     expect(topLevelBinding(ir, "count").value).toMatchObject({
//       status: "unknown",
//     });
//   });
// });
//
// describe("JavaScript semantic analysis: wrapped binding targets", () => {
//   it("records a wrapped identifier update as a read before a write", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       let count = 1;
//       count! += 1;
//       (count as number)++;
//       const copy = count!;
//     `);
//     expect(
//       ir.references
//         .filter(({ name }) => name === "count")
//         .map(({ role }) => role),
//     ).toEqual(["read", "write", "read", "write", "read"]);
//     expect(topLevelBinding(ir, "count").value).toMatchObject({
//       status: "unknown",
//     });
//   });
//
//   it("records a wrapped identifier assignment as a write of its value", () => {
//     const ir = analyzeJavaScriptSemantics(`
//       let count = 1;
//       count! = 2;
//     `);
//     expect(
//       ir.references
//         .filter(({ name }) => name === "count")
//         .map(({ role }) => role),
//     ).toEqual(["write"]);
//   });
// });
//
// describe("JavaScript semantic analysis: dataflow 2", () => {
export const _l = 157;
