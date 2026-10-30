export const __stub = 1;
//         pattern: "dist/",
//       },
//     ];
//     input.entries[2] = symlinkEntry({ target: "../dist/generated.js" });
//     const graph = createHistoricalSourceGraph(input);
//     expect(graph.entries[2]).toMatchObject({
//       target: "../dist/generated.js",
//       target_state: "internal",
//     });
//
//     input.entries[2] = symlinkEntry({ target: "../dist-old/generated.js" });
//     expect(() => createHistoricalSourceGraph(input)).toThrow(
//       /recorded exclusion/u,
//     );
//   });
//
//   it("does not treat an excluded file or unknown-kind ancestor as a directory", () => {
//     const input = { ...graphInput(), inventory_state: "partial" as const };
//     input.exclusions = [
//       {
//         path: "secret.txt",
//         entry_kind: "file",
//         reason: "configured-secret",
//         pattern: "secret.txt",
//       },
//     ];
//     input.entries[2] = symlinkEntry({ target: "../secret.txt/child" });
//     expect(() => createHistoricalSourceGraph(input)).toThrow(
//       /recorded exclusion/u,
//     );
//
//     input.exclusions[0] = {
//       path: "secret.txt",
//       entry_kind: "unknown",
//       reason: "configured-secret",
//       pattern: "secret.txt",
//     };
//     expect(() => createHistoricalSourceGraph(input)).toThrow(
//       /recorded exclusion/u,
//     );
//
//     input.exclusions[0] = {
//       path: "secret.txt",
//       reason: "configured-secret",
//       pattern: "secret.txt",
//     };
//     expect(() => createHistoricalSourceGraph(input)).toThrow(
//       /recorded exclusion/u,
//     );
//   });
// });
//
// describe("historical source graph symlink path identity", () => {
//   it("joins internal symlink targets with the inventory NFC normalizer", () => {
//     // "café" spelled NFC, as the inventory produces it, and the same
//     // name spelled NFD, as a macOS readlink can report it.
//     const nfcPath = "src/café.ts";
//     const nfdTarget = "cafe\u0301.ts";
//     expect(nfcPath).not.toBe(nfdTarget);
//
//     const input = { ...graphInput(), inventory_state: "partial" as const };
//     input.entries[1] = fileEntry({ path: nfcPath });
//     input.entries[2] = symlinkEntry({
//       path: "src/link.js",
//       target: nfdTarget,
//       target_state: "internal",
//     });
//     input.relationships = [];
//     const graph = createHistoricalSourceGraph(input);
//     expect(graph.entries[2]).toMatchObject({
//       kind: "symlink",
//       target: nfdTarget,
//       target_state: "internal",
//     });
//   });
//
//   it("preserves an exact NFD inventory spelling when resolving its symlink", () => {
//     const input = { ...graphInput(), inventory_state: "partial" as const };
//     input.entries[1] = fileEntry({ path: "src/cafe\u0301.ts" });
//     input.entries[2] = symlinkEntry({
//       path: "src/link.js",
//       target: "cafe\u0301.ts",
//       target_state: "internal",
//     });
//     input.relationships = [];
//     expect(createHistoricalSourceGraph(input).entries[1]?.path).toBe(
//       "src/cafe\u0301.ts",
//     );
//   });
//
//   it("still rejects an internal symlink target that no inventory holds", () => {
//     const input = { ...graphInput(), inventory_state: "partial" as const };
//     input.entries[2] = symlinkEntry({
//       path: "src/link.js",
//       // The NFD spelling normalizes to "src/café.ts", which the
//       // inventory does not contain, so the join must still miss.
//       target: "cafe\u0301.ts",
//       target_state: "internal",
//     });
//     expect(() => createHistoricalSourceGraph(input)).toThrow(
//       /must resolve to an inventoried entry/u,
//     );
//   });
// });
//
// it.each([
//   "\0",
//   "/absolute.js",
//   "../outside.js",
//   "a/../b.js",
//   "a//b.js",
//   "./a.js",
//   "a/",
// ])("rejects unsafe historical logical entry spelling %j", (path) => {
//   const input = graphInput();
//   input.entries = [fileEntry({ path })];
//   input.relationships = [];
//   expect(() => createHistoricalSourceGraph(input)).toThrow();
// });
//
// it("rejects NUL in observed symlink targets before graph identity", () => {
//   const input = graphInput();
//   input.entries[2] = symlinkEntry({ target: "literal\0name.js" });
//   expect(() => createHistoricalSourceGraph(input)).toThrow(
//     /normalized POSIX symlink target/u,
//   );
// });
//
// it.each(["C:\\outside\\file.js", "\\\\server\\share.js"])(
//   "preserves unowned recorded Windows absolute target policy %j",
//   (target) => {
//     const external = graphInput();
//     external.inventory_state = "partial";
//     external.entries[2] = symlinkEntry({ target, target_state: "external" });
//     expect(createHistoricalSourceGraph(external).entries).toContainEqual(
//       expect.objectContaining({ target, target_state: "external" }),
//     );
//     const internal = graphInput();
//     internal.entries[2] = symlinkEntry({ target, target_state: "internal" });
//     expect(() => createHistoricalSourceGraph(internal)).toThrow(
//       /target path does not match its target state/u,
//     );
//   },
// );
//
// it("refuses an absolute POSIX internal target even when lexical joining would name an inventoried file", () => {
//   const input = graphInput();
//   input.entries[2] = symlinkEntry({
//     target: "/main.ts",
//     target_state: "internal",
//   });
//   expect(() => createHistoricalSourceGraph(input)).toThrow(
//     /target path does not match its target state/u,
//   );
// });
export const _l = 155;
