export const __stub = 1;
// import { expect, it } from "vitest";
//
// import { analyzeJavaScriptSemantics } from "./javascriptSemanticAnalysis.js";
//
// it("shares required process writes with globals while keeping earlier observations", () => {
//   const ir = analyzeJavaScriptSemantics(`const proc=require('process');
//     process.cwd(); const before=proc.env.BEFORE;
//     proc.env={}; const after=process.env.AFTER;`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["BEFORE"]);
// });
//
// it("does not propagate replacement-object writes from import-equals direct origins", () => {
//   const ir = analyzeJavaScriptSemantics(`import fs = require('fs');
//     const other=require('fs'); fs={}; fs.readFileSync=custom; other.readFileSync('kept');`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it("retains original import-equals aliases captured before reassignment", () => {
//   const ir = analyzeJavaScriptSemantics(`import fs = require('fs');
//     const alias=fs; const other=require('fs'); fs={}; alias.readFileSync=custom; other.readFileSync('wrong');`);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("keeps computed namespace calls as unknown receiver escapes", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const fs=require('fs'); fs.hook=custom; fs[key](); fs.readFileSync('wrong');`,
//   );
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it.each(["(0, fs.readFileSync)", "(assigned = fs.readFileSync)"])(
//   "checks captured function validity through %s",
//   (value) => {
//     const ir = analyzeJavaScriptSemantics(`const fs=require('fs'); let assigned;
//     const saved=${value}; fs.readFileSync=custom; const late=${value}; saved('kept'); late('wrong');`);
//     expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
//   },
// );
//
// it.each(['process.env={MODE:"local"};', "process.argv=[];", "patch(process);"])(
//   "shares unbound process object effects with required aliases: %s",
//   (write) => {
//     const ir =
//       analyzeJavaScriptSemantics(`${write} const proc=require('process');
//     ${write.includes("argv") ? "const arg=proc.argv[2];" : "const mode=proc.env.MODE;"}`);
//     expect(ir.configurationOperations).toEqual([]);
//   },
// );
//
// it.each([
//   "function local(process) {process.env={};}",
//   "process={}; process.env={};",
// ])("keeps unrelated process replacements separate: %s", (write) => {
//   const ir = analyzeJavaScriptSemantics(
//     `${write} const proc=require('process'); const mode=proc.env.MODE;`,
//   );
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["MODE"]);
// });
//
// it("preserves exports captured before a later loader overwrite", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs=require('node:fs'); fs.readFileSync('before');
//     const read=fs.readFileSync;
//     require('fs').readFileSync('direct-before');
//     require=replacement;
//     fs.readFileSync('after'); read('saved');
//     const late=require('fs'); late.readFileSync('wrong');
//     require('fs').readFileSync('also-wrong');
//   `);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual([
//     "before",
//     "direct-before",
//     "after",
//     "saved",
//   ]);
// });
//
// it.each([
//   `for (;;) { require('fs').readFileSync('wrong'); require=replacement; }`,
//   `function run() { require('fs').readFileSync('wrong'); require=replacement; }`,
//   `require=replacement; const fs=require('fs'); fs.readFileSync('wrong'); require=again;`,
// ])(
//   "keeps repeated or already replaced loader captures uncertain: %s",
//   (source) => {
//     expect(analyzeJavaScriptSemantics(source).configurationOperations).toEqual(
//       [],
//     );
//   },
// );
//
// it.each([
//   ["fs.readFileSync = custom;", "other.readFileSync('wrong');"],
//   ["other.readFileSync = custom;", "fs.readFileSync('wrong');"],
//   ["patch(fs);", "other.readFileSync('wrong');"],
// ])(
//   "shares require-mode import-equals effects in both directions: %s",
//   (write, call) => {
//     const ir = analyzeJavaScriptSemantics(`import fs = require('node:fs');
//     const other = require('fs'); other.readFileSync('before'); ${write} ${call}`);
//     expect(ir.configurationOperations.map(({ key }) => key)).toEqual([
//       "before",
//     ]);
//   },
// );
//
// it.each([
//   "import {readFileSync as read} from 'node:fs';",
//   "const {readFileSync:read}=require('node:fs');",
//   "const fs=require('fs'); const read=fs.readFileSync;",
// ])(
//   "retains captured native function calls after argument escape: %s",
//   (capture) => {
//     const ir = analyzeJavaScriptSemantics(
//       `${capture} observe(read); read('kept');`,
//     );
//     expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
//   },
// );
//
// it("distinguishes escaping a method value from escaping its namespace", () => {
//   const ir = analyzeJavaScriptSemantics(`const fs=require('fs');
//     observe(fs.readFileSync); fs.readFileSync('kept');
//     observe(fs); fs.readFileSync('wrong');`);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it("still invalidates escaped process configuration containers", () => {
//   const ir = analyzeJavaScriptSemantics(`const proc=require('process');
//     observe(proc.env); const mode=proc.env.MODE;`);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("retains direct require effects without poisoning later cached receivers", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     require('node:fs').readFileSync('first');
//     const fs = require('fs'); fs.readFileSync('second');
//     require('node:fs').createReadStream('stream');
//     require('node:child_process').spawn('tool', []);
//     require('node:timers').setTimeout(callback, 1);
//     require('node:http').get('http://example.test');
//     require('fs').readFileSync = custom;
//     require('node:fs').readFileSync('wrong'); fs.readFileSync('wrong');
//   `);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual([
//     "first",
//     "second",
//   ]);
//   expect(ir.resourceOperations).toHaveLength(1);
//   expect(ir.childProcessSpawns).toHaveLength(1);
//   expect(ir.timerOperations).toHaveLength(1);
//   expect(ir.requestOperations).toHaveLength(1);
// });
//
// it.each([
//   "const fs = require('fs'); fs.promises.open = custom;",
//   "require('node:fs').promises.open = custom;",
//   "const fsp = require('fs/promises'); fsp.open = custom;",
// ])("shares fs.promises object writes with fs/promises: %s", (write) => {
//   const ir = analyzeJavaScriptSemantics(`
//     const before = require('node:fs/promises'); before.open('before');
//     ${write}
//     const after = require('node:fs/promises'); after.open('wrong');
//   `);
//   expect(ir.resourceOperations).toHaveLength(1);
// });
//
// it.each([
//   "require = () => ({ readFileSync() {} });",
//   "({ loader: require } = other);",
//   "for (require of loaders) {}",
export const _l = 170;
