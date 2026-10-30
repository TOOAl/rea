export const __stub = 1;
// });
//
// it.each([
//   "fs.readFileSync = custom; fs.createReadStream = custom; cp.spawn = custom; timers.setTimeout = custom; http.get = custom;",
//   "patch(fs); patch(cp); patch(timers); patch(http);",
//   "const fsAlias = fs; fsAlias.readFileSync = custom; fsAlias.createReadStream = custom; const cpAlias = cp; cpAlias.spawn = custom; timers[key] = custom; delete http.get;",
// ])("excludes replaced or escaped CommonJS methods: %s", (mutation) => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fs = require('node:fs'); const cp = require('node:child_process');
//     const timers = require('node:timers'); const http = require('node:http');
//     ${mutation}
//     fs.readFileSync('config.json'); fs.createReadStream('config.json');
//     cp.spawn('tool', []); timers.setTimeout(callback, 1); http.get('http://example.test');
//   `);
//   expect(ir.configurationOperations).toEqual([]);
//   expect(ir.resourceOperations).toEqual([]);
//   expect(ir.childProcessSpawns).toEqual([]);
//   expect(ir.timerOperations).toEqual([]);
//   expect(ir.requestOperations).toEqual([]);
// });
//
// it("preserves unaffected CommonJS methods after sibling property mutation", () => {
//   const ir = analyzeJavaScriptSemantics(
//     `const fs = require('node:fs'); fs.writeFileSync = custom; fs.readFileSync('config.json');`,
//   );
//   expect(ir.configurationOperations).toMatchObject([
//     { kind: "file", key: "config.json" },
//   ]);
// });
//
// it.each([
//   `const fs = require("node:fs"); const cp = require("node:child_process");
//    const timers = require("node:timers"); const http = require("node:http");
//    const read = fs.readFileSync; const launch = cp.spawn;
//    const schedule = timers.setTimeout; const get = http.get;`,
//   `const fs = require("fs"); const { readFileSync: read } = fs;
//    const { spawn: launch } = require("child_process");
//    const { setTimeout: schedule } = require("timers");
//    const { get } = require("http");`,
// ])("recovers builtin effects from CommonJS provenance: %s", (declarations) => {
//   const ir = analyzeJavaScriptSemantics(`${declarations}
//     const text = read("config.json", "utf8");
//     const stream = fs.createReadStream("config.json"); stream.destroy();
//     const child = launch("tool", []); child.kill("SIGTERM");
//     const timer = schedule(callback, 10); clearTimeout(timer);
//     get("http://example.test");
//   `);
//   expect(ir.configurationOperations).toMatchObject([
//     { kind: "file", key: "config.json" },
//   ]);
//   expect(
//     ir.resourceOperations.map(({ kind, method }) => ({ kind, method })),
//   ).toEqual([
//     { kind: "acquire", method: "createReadStream" },
//     { kind: "release", method: "destroy" },
//   ]);
//   expect(ir.childProcessSpawns).toMatchObject([
//     { method: "spawn", command: "tool" },
//   ]);
//   expect(ir.childProcessInteractions).toMatchObject([
//     { kind: "signal", signalName: "SIGTERM" },
//   ]);
//   expect(
//     ir.timerOperations.map(({ kind, method }) => ({ kind, method })),
//   ).toEqual([
//     { kind: "schedule", method: "setTimeout" },
//     { kind: "cancel", method: "clearTimeout" },
//   ]);
//   expect(ir.requestOperations).toMatchObject([
//     { method: "get", endpoint: "http://example.test" },
//   ]);
// });
//
// it("does not promote ambiguous or non-namespace CommonJS origins to builtin effects", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     const fake = require("./fs.js"); fake.readFileSync("external");
//     const absentDefault = require("node:fs").default; absentDefault.readFileSync("default");
//     const { constants } = require("node:fs"); constants.createReadStream("nested");
//     let replaced = require("node:fs"); replaced = other; replaced.readFileSync("replaced");
//     const mixed = condition ? require("node:fs") : other; mixed.readFileSync("mixed");
//     function shadowed(require) { const fs = require("node:fs"); fs.readFileSync("shadowed"); }
//   `);
//   expect(ir.configurationOperations).toEqual([]);
//   expect(ir.resourceOperations).toEqual([]);
// });
//
// it("does not assign built-in APIs to unrelated or shadowed bindings", () => {
//   const ir = analyzeJavaScriptSemantics(`
//     import fs from "./fs.js";
//     import { constants as constantsFs } from "node:fs";
//     fs.createReadStream("config.json");
//     constantsFs.createReadStream("config.json");
//     function run(fs) { fs.createReadStream("config.json"); }
//   `);
//
//   expect(ir.resourceOperations).toEqual([]);
// });
//
// it.each([
//   `const fs = require('fs'); class Reader { text = fs.readFileSync('wrong'); } fs.readFileSync = custom; new Reader();`,
//   `const fs = require('fs'); class Reader { #text = fs.readFileSync('wrong'); } fs.readFileSync = custom; new Reader();`,
//   `const fs = require('fs'); fs.__defineGetter__('readFileSync', () => custom); fs.readFileSync('wrong');`,
//   `import proc from 'node:process'; proc.env = {}; const value = process.env.MODE;`,
//   `import fs from 'node:fs'; fs.readFileSync = custom; const other = require('fs'); other.readFileSync('wrong');`,
// ])("keeps delayed or replaced built-in identities unknown: %s", (source) => {
//   expect(analyzeJavaScriptSemantics(source).configurationOperations).toEqual(
//     [],
//   );
// });
//
// it.each([
//   `const fs = require('fs'); const before = fs.readFileSync('kept'), patch = (fs.readFileSync = custom);`,
//   `globalThis.process = {env: {}}; process.env = {}; const proc = require('process'); const value = proc.env.kept;`,
//   `import fs from 'node:fs'; fs.writeFileSync = custom; const other = require('fs'); other.readFileSync('kept');`,
// ])("keeps earlier and independent built-in observations: %s", (source) => {
//   expect(
//     analyzeJavaScriptSemantics(source).configurationOperations.map(
//       ({ key }) => key,
//     ),
//   ).toEqual(["kept"]);
// });
//
// it("shares equivalent alias subproblems and repeated intact receiver facts", () => {
//   const aliases = Array.from({ length: 30 }, (_, index) => {
//     const previous = index === 0 ? "fs" : `a${index - 1}`;
//     return `const a${index} = flag ? ${previous} : ${previous};`;
//   });
//   const calls = Array.from(
//     { length: 128 },
//     (_, index) => `a29.readFileSync('file-${index}');`,
//   );
//   const ir = analyzeJavaScriptSemantics(
//     ["const fs = require('fs');", ...aliases, ...calls].join("\n"),
//   );
//   expect(ir.configurationOperations).toHaveLength(128);
// });
//
// it.each([
//   `import tls from 'node:tls'; const socket = tls.connect(443, 'example.test'); socket.end();`,
//   `import * as tls from 'node:tls'; const socket = tls.connect(443, 'example.test'); socket.end();`,
//   `const tls = require('tls'); const socket = tls.connect(443, 'example.test'); socket.end();`,
// ])("retains TLS acquisitions and their release: %s", (source) => {
//   expect(
//     analyzeJavaScriptSemantics(source).resourceOperations.map(
//       ({ kind, method }) => ({ kind, method }),
//     ),
//   ).toEqual([
//     { kind: "acquire", method: "connect" },
//     { kind: "release", method: "end" },
//   ]);
// });
//
// it.each([
//   `globalThis.process.env = {}; const proc = require('process'); const value = proc.env.MODE;`,
//   `const host = globalThis; host.process.env = {}; const proc = require('process'); const value = proc.env.MODE;`,
//   `import * as procNs from 'node:process'; procNs.default.env = {}; const value = process.env.MODE;`,
//   `globalThis.process.env = { MODE: 'local' }; const proc = require('process'); const value = proc.env.MODE;`,
//   `const proc = require('process'); proc.env.MODE = 'local'; const value = proc.env.MODE;`,
// ])("shares writes through the original process object: %s", (source) => {
//   expect(analyzeJavaScriptSemantics(source).configurationOperations).toEqual(
//     [],
//   );
// });
//
// it.each([
//   [
//     `const fs = require('fs'); const result = (fs.readFileSync('kept'), fs.readFileSync = custom);`,
//     "kept",
//   ],
//   [
export const _l = 170;
