export const __stub = 1;
// ])("rejects provenance from an overwritten ambient loader: %s", (write) => {
//   const ir = analyzeJavaScriptSemantics(`${write}
//     const fs = require('node:fs'); fs.readFileSync('wrong');
//     require('node:fs').readFileSync('also-wrong');
//   `);
//   expect(ir.configurationOperations).toEqual([]);
//   expect(
//     ir.bindings.find(({ name }) => name === "fs")?.provenance.status,
//   ).not.toBe("module");
// });
//
// it("keeps local loader reassignment separate from the ambient loader", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     function local(require) { require = replacement; }
//     const fs = require('node:fs'); fs.readFileSync('kept');
//   `);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it("keeps wrapper require separate from global-object property writes", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     globalThis.require = replacement;
//     function polyfill(key) { globalThis[key] = replacement; }
//     require('node:fs').readFileSync('kept');
//   `);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["kept"]);
// });
//
// it.each(["import fs from 'node:fs';", "const fs = require('node:fs');"])(
//   "retains reads and saved methods before a later write: %s",
//   (declaration) => {
//     const ir = analyzeJavaScriptSemantics(`${declaration}
//       fs.readFileSync('before');
//       const saved = fs.readFileSync;
//       const { readFileSync: destructured } = fs;
//       const namespace = fs;
//       fs.readFileSync = custom;
//       saved('saved'); destructured('destructured');
//       namespace.readFileSync('wrong'); fs.readFileSync('wrong');
//     `);
//     expect(ir.configurationOperations.map(({ key }) => key)).toEqual([
//       "before",
//       "saved",
//       "destructured",
//     ]);
//   },
// );
//
// it.each([
//   "const { readFileSync: read } = require('fs');",
//   "const read = require('fs').readFileSync;",
// ])("checks cached module writes at the projected capture: %s", (capture) => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs = require('node:fs');
//     const saved = require('fs').readFileSync;
//     fs.readFileSync = custom;
//     ${capture}
//     read('wrong'); saved('saved');
//   `);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["saved"]);
// });
//
// it("retains captured methods across later escapes without freezing a namespace alias", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs = require('node:fs'); const saved = require('fs').readFileSync;
//     const namespace = require('fs'); patch(fs);
//     const late = require('fs').readFileSync;
//     saved('saved'); late('wrong'); namespace.readFileSync('wrong');
//   `);
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["saved"]);
// });
//
// it("keeps writes in repeated callable and loop activations conservative", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs = require('node:fs');
//     function run() { fs.readFileSync('wrong'); fs.readFileSync = custom; }
//     for (;;) { const read = require('fs').readFileSync; read('wrong'); fs.readFileSync = custom; }
//   `);
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("does not propagate a reassigned local object's writes into cached exports", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `let a = require('node:fs'); const b = require('node:fs'); a = {}; a.readFileSync = custom; b.readFileSync('kept');`,
//   );
//   expect(ir.configurationOperations).toMatchObject([{ key: "kept" }]);
// });
//
// it("shares repeated require mutations for every built-in effect family", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs = require('fs'); const otherFs = require('node:fs'); fs.createReadStream = custom; otherFs.createReadStream('wrong');
//     const cp = require('child_process'); const otherCp = require('node:child_process'); cp.spawn = custom; otherCp.spawn('wrong', []);
//     const timers = require('timers'); const otherTimers = require('node:timers'); timers.setTimeout = custom; otherTimers.setTimeout(callback, 1);
//     const http = require('http'); const otherHttp = require('node:http'); http.get = custom; otherHttp.get('http://wrong.test');
//     const proc = require('process'); const otherProc = require('node:process'); proc.env = replacement; const mode = otherProc.env.MODE;
//   `);
//   expect(ir.configurationOperations).toEqual([]);
//   expect(ir.resourceOperations).toEqual([]);
//   expect(ir.childProcessSpawns).toEqual([]);
//   expect(ir.timerOperations).toEqual([]);
//   expect(ir.requestOperations).toEqual([]);
// });
//
// it.each(["node:fs", "fs"])(
//   "shares repeated built-in require identity across %s",
//   (specifier) => {
//     const ir = analyzeJavaScriptSemantics(
//       `const a = require('node:fs'); const b = require('${specifier}'); const alias = b; a.readFileSync = custom; b.createReadStream('kept'); alias.readFileSync('wrong');`,
//     );
//     expect(ir.configurationOperations).toEqual([]);
//     expect(ir.resourceOperations).toMatchObject([
//       { method: "createReadStream" },
//     ]);
//   },
// );
//
// it("shares unknown escapes across repeated requires without losing earlier effects", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const a = require('node:fs'); const b = require('fs'); b.readFileSync('before'); patch(a); b.readFileSync('after');`,
//   );
//   expect(ir.configurationOperations.map(({ key }) => key)).toEqual(["before"]);
// });
//
// it("preserves exact default ESM import mutation paths", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `import fs from 'node:fs'; fs.writeFileSync = custom; fs.readFileSync('kept'); fs.writeFileSync('replaced');`,
//   );
//   expect(ir.configurationOperations).toMatchObject([
//     { kind: "file", key: "kept" },
//   ]);
// });
//
// it("retains built-in effects before later top-level escapes", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs = require('node:fs'); const cp = require('node:child_process'); const timers = require('node:timers'); const http = require('node:http');
//     fs.readFileSync('before'); fs.createReadStream('before'); cp.spawn('tool', []); timers.setTimeout(callback, 1); http.get('http://example.test');
//     patch(fs); patch(cp); patch(timers); patch(http);
//     fs.readFileSync('after'); fs.createReadStream('after'); cp.spawn('wrong', []); timers.setTimeout(callback, 1); http.get('http://wrong.test');
//   `);
//   expect(ir.configurationOperations).toMatchObject([{ key: "before" }]);
//   expect(ir.resourceOperations).toHaveLength(1);
//   expect(ir.childProcessSpawns).toMatchObject([{ command: "tool" }]);
//   expect(ir.timerOperations).toHaveLength(1);
//   expect(ir.requestOperations).toMatchObject([
//     { endpoint: "http://example.test" },
//   ]);
// });
//
// it.each(["env", "argv"])(
//   "does not treat a replaced process %s as configuration",
//   (family) => {
//     const ir = analyzeJavaScriptSemantics(
//       `const proc = require('node:process'); proc.${family} = replacement; const value = proc.${family}[${family === "env" ? "'MODE'" : "2"}];`,
//     );
//     expect(ir.configurationOperations).toEqual([]);
//   },
// );
//
// it("does not infer temporal safety across repeated callable or loop activations", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const fs = require('node:fs'); function run() { fs.readFileSync('callable'); patch(fs); } for (;;) { fs.readFileSync('loop'); patch(fs); }`,
//   );
//   expect(ir.configurationOperations).toEqual([]);
// });
//
// it("does not recover a replaced method through a subsequent alias", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const fs = require('node:fs'); fs.readFileSync = custom; const read = fs.readFileSync; read('config.json');`,
//   );
//   expect(ir.configurationOperations).toEqual([]);
export const _l = 170;
