export const __stub = 1;
//     `const fs = require('fs'); const read = fs.readFileSync; const result = (read('kept'), fs.readFileSync = custom);`,
//     "kept",
//   ],
//   [
//     `const fs = require('fs'); consume(fs.readFileSync('before'), fs.readFileSync = custom);`,
//     "before",
//   ],
// ])(
//   "retains reads before a later sequence operand: %s",
//   (source, expectedKey) => {
//     expect(
//       analyzeJavaScriptSemantics(source).configurationOperations.map(
//         ({ key }) => key,
//       ),
//     ).toEqual([expectedKey]);
//   },
// );
//
// it("does not use source offsets for destructuring assignment evaluation order", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`const fs = require('fs'); const target = {};
//     [target[fs.readFileSync('wrong')]] = (fs.readFileSync = custom, []);`);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("keeps process reads after an alias is reassigned away from the global", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`let host = globalThis; host = {process: {env: {}}};
//     host.process.env = {}; const proc = require('process'); const value = proc.env.MODE;`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["MODE"]);
// });
//
// it("rejects CommonJS require after the wrapper module replaces its delegate", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`module.require = () => ({ readFileSync() {} });
//     const fs = require('node:fs'); fs.readFileSync('unknown');`);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it.each([
//   `module.require.extra = true; const fs = require('fs'); fs.readFileSync('kept');`,
//   `const owner = module; owner.require = () => ({}); const fs = require('fs'); fs.readFileSync('wrong');`,
//   `Object.defineProperty(module, 'require', {value: () => ({})}); const fs = require('fs'); fs.readFileSync('wrong');`,
// ])("tracks only actual wrapper require replacements: %s", (source) => {
//   const ir = analyzeJavaScriptSemantics(source);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(
//     source.includes("extra") ? ["kept"] : [],
//   );
// });
//
// it("preserves a saved promises object after deleting its parent export", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`const fs = require('fs'); const fsp = fs.promises;
//     delete fs.promises; const handle = fsp.open('kept'); handle.close();`);
//   expect(
//     ir.resourceOperations.map(({ kind, method }) => ({ kind, method })),
//   ).toEqual([
//     { kind: "acquire", method: "open" },
//     { kind: "release", method: "close" },
//   ]);
// });
//
// it("does not infer network acquisition methods from another built-in", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const { open } = require('node:net'); open();`,
//   );
//   expect(ir.resourceOperations).toEqual([]);
// });
//
// it("recognizes nested ESM namespace receivers as original built-ins", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`import * as ns from 'node:fs'; import fs from 'node:fs';
//     ns.default.readFileSync('first'); fs.readFileSync('second');`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual([
//     "first",
//     "second",
//   ]);
// });
//
// it("keeps intact fs/promises identity after deleting the fs.promises slot", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`const fs=require('fs'); delete fs.promises;
//     const fsp=require('fs/promises'); const handle=fsp.open('kept'); handle.close();`);
//   expect(
//     ir.resourceOperations.map(({ kind, method }) => ({ kind, method })),
//   ).toEqual([
//     { kind: "acquire", method: "open" },
//     { kind: "release", method: "close" },
//   ]);
// });
//
// it.each([
//   `import fs from 'node:fs'; fs.promises = { open() {} }; fs.promises.open('wrong');`,
//   `const fs = require('fs'); patch(fs.promises); require('fs/promises').open('wrong');`,
//   `const fs = require('fs'); patch(fs.promises); require('node:fs/promises').open('wrong');`,
// ])("keeps replaced or escaped promises receivers unknown: %s", (source) => {
//   expect(analyzeJavaScriptSemantics(source).resourceOperations).toEqual([]);
// });
//
// it("follows final sequence expressions for direct built-in method calls", () => {
//   const ir = analyzeJavaScriptSemantics(`const fs = require('fs');
//     (0, fs.readFileSync)('kept'); fs.readFileSync = custom;
//     (0, fs.readFileSync)('wrong');`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it.each([
//   `import { env } from 'node:process'; patch(env); process.env.MODE;`,
//   `import { argv } from 'node:process'; patch(argv); process.argv[2];`,
// ])(
//   "shares named process containers with their namespace aliases: %s",
//   (source) => {
//     expect(analyzeJavaScriptSemantics(source).configurationOperations).toEqual(
//       [],
//     );
//   },
// );
//
// it("retains uncertainty after a computed write to module's require delegate", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`const key = 'require'; module[key] = replacement;
//     const fs = require('fs'); fs.readFileSync('wrong');`);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("retains a module namespace captured before its binding is reassigned", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`let fs = require('fs'); const saved = fs;
//     fs = {}; saved.readFileSync('kept');`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it("does not let own fs probe calls hide later builtin reads", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const fs=require('fs'); fs.existsSync('probe'); fs.readFileSync('kept');`,
//   );
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it("resolves nested ESM default namespace methods", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `import * as ns from 'node:fs'; ns.default.readFileSync('kept');`,
//   );
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it("tracks process objects passed through qualified global references", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`patch(globalThis.process); const proc = require('process');
//     const mode = proc.env.MODE;`);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("checks a saved child object's method when that function is selected", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`const fs = require('fs'); const fsp = fs.promises;
//     fs.promises.open = custom; const open = fsp.open; open('wrong');`);
//   expect(ir.resourceOperations).toEqual([]);
// });
//
// it("retains an earlier captured function after its object method is replaced", () => {
//   const ir =
//     analyzeJavaScriptSemantics(`const fs = require('fs'); const fsp = fs.promises;
//     const open = fsp.open; fs.promises.open = custom; open('kept');`);
//   expect(ir.resourceOperations).toMatchObject([
//     { kind: "acquire", method: "open" },
//   ]);
// });
export const _l = 168;
