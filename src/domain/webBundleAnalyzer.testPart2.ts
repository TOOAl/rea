export const __stub = 1;
//     expect(
//       analyzeCapturedWebBundle(inspection(source)).observations.endpoints.map(
//         ({ value }) => value,
//       ),
//     ).toEqual(["/storage-named-xhr"]);
//     const analysis = analyzeJavaScriptStaticSource(source);
//     expect(analysis.endpoints.map(({ value }) => value)).toEqual([
//       "/storage-named-xhr",
//     ]);
//     expect(analysis.storage.map(({ kind }) => kind)).toEqual([
//       "indexed-db",
//       "indexed-db",
//       "indexed-db",
//       "indexed-db",
//     ]);
//   });
//
//   it("uses lexical receiver facts for overloaded open calls", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection(`
//         const popup = window;
//         popup.open(url, "/preview");
//         {
//           const indexedDB = { open() {} };
//           indexedDB.open("PROPFIND", "/dav");
//           indexedDB.open(databaseName, "2");
//         }
//         const xhr = new XMLHttpRequest();
//         xhr.open(method, "/api");
//       `),
//     );
//     expect(
//       result.observations.endpoints.map(({ value }) => value).sort(),
//     ).toEqual(["/api", "/dav"]);
//   });
//
//   it("classifies optional and one-hop aliased open calls", () => {
//     const source = `
//       const popup = window;
//       popup?.open(url, "/preview");
//       const idb = indexedDB;
//       idb.open(databaseName, "2");
//       const xhr = new XMLHttpRequest();
//       xhr?.open(method, "/api");
//     `;
//     const bundle = analyzeCapturedWebBundle(inspection(source));
//     expect(bundle.observations.endpoints.map(({ value }) => value)).toEqual([
//       "/api",
//     ]);
//     const staticAnalysis = analyzeJavaScriptStaticSource(source);
//     expect(staticAnalysis.endpoints.map(({ value }) => value)).toEqual([
//       "/api",
//     ]);
//     expect(staticAnalysis.storage.map(({ kind }) => kind)).toEqual([
//       "indexed-db",
//     ]);
//   });
//
//   it("keeps HTTP-method-named reads of provable keyed collections out of endpoints", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection(`
//         axios.get("https://api.example.test/users");
//         api.get("users");
//         client.delete("cache-key");
//         new Map().get("map-key");
//         new URLSearchParams(location.search).get("q");
//         new Headers(init).delete("x-trace");
//         new FormData(form).get("file");
//         response.headers.get("content-type");
//         request?.headers.delete("cookie");
//         new URL(location.href).searchParams.get("page");
//         api.headers.post("/v1/headers");
//         api.searchParams.request("/search");
//         new Headers().get("/users");
//         api.headers.get("https://api.example.test/headers");
//         api.searchParams.delete("../search");
//       `),
//     );
//     expect(
//       result.observations.endpoints.map(({ value }) => value).sort(),
//     ).toEqual([
//       "../search",
//       "/search",
//       "/users",
//       "/v1/headers",
//       "https://api.example.test/headers",
//       "https://api.example.test/users",
//     ]);
//     expect(
//       result.inferences
//         .filter(({ kind }) => kind === "endpoint_candidate")
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(["cache-key", "users"]);
//   });
//
//   it("keeps undici header-store reads out of endpoint observations", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection(`
//         response.headersList.get("location", true);
//         request.headersList.delete("authorization");
//         request.headersList.get("/header-list");
//         api.get("/api/users");
//       `),
//     );
//     expect(result.observations.endpoints.map(({ value }) => value)).toEqual([
//       "/header-list",
//       "/api/users",
//     ]);
//     expect(
//       result.inferences
//         .filter(({ kind }) => kind === "endpoint_candidate")
//         .map(({ value }) => value),
//     ).toEqual([]);
//   });
// });
//
// describe("web bundle explicit request reference forms", () => {
//   it("recognizes URL, path, query and fragment forms after excluding lookup receivers", () => {
//     const references = [
//       "http://api.example.test/users",
//       "https://api.example.test/users?q=1#part",
//       "ws://api.example.test/events",
//       "wss://api.example.test/events",
//       "http:api.example.test/users",
//       "https:api.example.test/users?q=1&tag=a&tag=b#part",
//       "https:api.example.test:443/a/../b?x=a+b&x=two#part",
//       "ws:api.example.test/events",
//       "wss:api.example.test/events",
//       "HtTpS:/api.example.test/users",
//       String.raw`https:\api.example.test\users`,
//       "https://[invalid",
//       "//api.example.test/users",
//       "/api/users",
//       "./users",
//       "../users",
//       "?",
//       "?page=2&tag=a&tag=b#section",
//       "#",
//       "#section",
//       "#frag?tag=a&tag=b",
//     ];
//     const ambiguous = [
//       "",
//       ".",
//       "..",
//       "users",
//       "%23section",
//       "%3Fpage=2",
//       " #section",
//       " https:api.example.test/users",
//       "https:",
//       "http:?page=2",
//       "ws:#section",
//       "https:[invalid",
//       "https:api.example.test:99999",
//       "ftp:api.example.test/users",
//       "file:/users",
//       "data:text/plain,users",
//     ];
//     const source = `
//       ${references.map((value) => `api.get(${JSON.stringify(value)});`).join("\n")}
//       ${ambiguous.map((value) => `api.get(${JSON.stringify(value)});`).join("\n")}
//       xhr.open(method, "?view=1");
//       xhr.open(method, "#view=1");
//       xhr.open("GET", "#literal=1");
//       xhr.open(method, "https:api.example.test/xhr");
//       request("POST", target);
//       snackBar.open(message, "X");
//       new Map().get("?map-key");
//       new Map().get("#map-key");
//       new Map().get("https:api.example.test/map-key");
//       new Headers().delete("?header-key");
//       new Headers().delete("#header-key");
//       new URLSearchParams().get("?parameter-key");
//       new URLSearchParams().get("#parameter-key");
//       response.headers.get("?response-key");
//       response.headers.get("#response-key");
//       const config = vscode.workspace.getConfiguration("git");
//       config.get("?setting");
//       config.get("#setting");
//       config.get("https:api.example.test/setting");
//       window.open(url, "?window-target");
//       window.open(url, "#window-target");
//       indexedDB.open(name, "?database-version");
//       indexedDB.open(name, "#database-version");
//       caches.open(name, "#cache-name");
//       fs.open(path, "r");
//     `;
//     const expected = [
//       ...references,
//       "?view=1",
//       "#view=1",
//       "#literal=1",
//       "https:api.example.test/xhr",
//     ].sort();
//     const expectedCandidates = [...ambiguous, "POST", "X"].sort();
//     const web = analyzeCapturedWebBundle(inspection(source));
//     expect(web.observations.endpoints.map(({ value }) => value).sort()).toEqual(
//       expected,
//     );
//     expect(
//       web.inferences
//         .filter(({ kind }) => kind === "endpoint_candidate")
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(expectedCandidates);
//     const analyzed = analyzeJavaScriptStaticSource(source);
//     expect(
//       analyzed.endpoints
//         .filter(({ interpretation }) => interpretation === undefined)
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(expected);
//     expect(
//       analyzed.endpoints
//         .filter(({ interpretation }) => interpretation === "candidate")
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(expectedCandidates);
//   });
// });
//
// describe("web bundle endpoint candidate classification", () => {
//   it("keeps ambiguous HTTP-method arguments as candidates instead of endpoint observations", () => {
//     const source = `
//       fetch("login");
//       api.get("/api/users");
//       api.get("users");
//       form.get("passwordControl");
//       translate.get("ADDRESS_ADDED");
//       cookieService.put("token", value);
//       http.request("POST", target);
//       snackBar.open(message, "X");
//       xhr.open(method, "login");
//       xhr.open("GET", "ping");
//     `;
//     const result = analyzeCapturedWebBundle(inspection(source));
//     expect(
//       result.observations.endpoints.map(({ value }) => value).sort(),
//     ).toEqual(["/api/users", "login", "ping"]);
//     const candidates = result.inferences.filter(
//       ({ kind }) => kind === "endpoint_candidate",
//     );
//     expect(candidates.map(({ value }) => value).sort()).toEqual([
//       "ADDRESS_ADDED",
//       "POST",
//       "X",
//       "login",
//       "passwordControl",
//       "token",
//       "users",
//     ]);
//     expect(
//       candidates.every(
//         ({ confidence, basis }) =>
//           confidence === "low" &&
//           basis.length === 1 &&
//           basis[0]?.artifact_sha256 ===
//             createWebTextArtifact(source, "text/javascript").sha256 &&
//           basis[0]?.line !== null &&
//           basis[0]?.detector.startsWith("call:"),
//       ),
//     ).toBe(true);
//     const staticEndpoints = analyzeJavaScriptStaticSource(source).endpoints;
//     expect(
//       staticEndpoints
//         .filter(({ interpretation }) => interpretation === "candidate")
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(candidates.map(({ value }) => value).sort());
//     expect(
//       staticEndpoints
//         .filter(({ interpretation }) => interpretation === undefined)
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(result.observations.endpoints.map(({ value }) => value).sort());
//     expect(webBundleAnalysisSchema.parse(result)).toEqual(result);
//   });
//
//   it("deduplicates repeated candidate sites while keeping script, value and detector identity", () => {
//     const source = `${'form.get("name");\n'.repeat(5_000)}translate.get("name");\nform.get("other");`;
//     const captured = inspection(source);
//     const first = captured.scripts.items[0];
//     if (first === undefined) throw new Error("Missing captured script fixture");
//     const secondKey = `scr_${"2".repeat(64)}`;
//     const result = analyzeCapturedWebBundle({
//       ...captured,
//       scripts: {
//         total: 2,
//         items: [
//           first,
//           {
//             ...first,
//             script_key: secondKey,
//             url: `${origin}/assets/second.js`,
//           },
//         ],
//       },
//     });
//     const candidates = result.inferences.filter(
//       ({ kind }) => kind === "endpoint_candidate",
//     );
//     expect(candidates).toHaveLength(6);
//     for (const scriptKey of [first.script_key, secondKey]) {
//       const local = candidates.filter(
//         ({ basis }) => basis[0]?.script_key === scriptKey,
export const _l = 307;
