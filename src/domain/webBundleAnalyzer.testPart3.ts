export const __stub = 1;
//       );
//       expect(
//         local.map(({ value, basis }) => [value, basis[0]?.detector]),
//       ).toEqual([
//         ["name", "call:form.get:unverified-network-receiver"],
//         ["name", "call:translate.get:unverified-network-receiver"],
//         ["other", "call:form.get:unverified-network-receiver"],
//       ]);
//       expect(local[0]?.basis[0]).toMatchObject({
//         line: 1,
//         column: 0,
//         artifact_sha256: createWebTextArtifact(source, "text/javascript")
//           .sha256,
//       });
//     }
//     expect(result.observations.endpoints).toEqual([]);
//     expect(result.capture.source_artifacts).toHaveLength(2);
//     expect(result.completeness).toMatchObject({
//       status: "complete",
//       parsed_scripts: 2,
//     });
//     expect(result.limitations).toContain(
//       'Endpoint candidates are deduplicated by script, value and detector; basis retains only the first matching source coordinate. They are not a complete call-site inventory or a runtime occurrence count. completeness.status="complete" describes examination of captured source, not a call-site census.',
//     );
//   });
// });
//
// describe("web bundle configuration and navigation parity", () => {
//   it("keeps configuration setting reads out of endpoints in both analyzers", () => {
//     const source = `
//       import vscodeDefault from "vscode";
//       vscodeDefault.workspace.getConfiguration("git").get("default-setting");
//       vscode.workspace.getConfiguration("git").get("autofetch");
//       workspace.getConfiguration("git").get("enabled", true);
//       const config = vscode.workspace.getConfiguration("git");
//       config.get("autofetchPeriod", 180);
//       config.get("/v1/settings");
//       let c = Mt.workspace.getConfiguration("git", uri), l = c.get("timeline.date");
//       let changed = vscode.workspace.getConfiguration("git");
//       changed = api;
//       changed.get("reassigned");
//       const maybe = flag ? vscode.workspace.getConfiguration("git") : api;
//       maybe.get("conditional");
//       {
//         const config = api;
//         config.get("shadowed");
//       }
//       api.get("users");
//       const client = getConfiguration("/api/v1");
//       client.get("accounts");
//       http.getConfiguration(baseUrl).get("orders");
//       {
//         const workspace = { getConfiguration: () => api };
//         workspace.getConfiguration("/api").get("local-users");
//       }
//       {
//         const vscode = { workspace: { getConfiguration: () => api } };
//         vscode.workspace.getConfiguration("/api").get("local-orders");
//       }
//     `;
//     const expected = [
//       "/v1/settings",
//       "accounts",
//       "conditional",
//       "local-orders",
//       "local-users",
//       "orders",
//       "reassigned",
//       "shadowed",
//       "users",
//     ];
//     const web = analyzeCapturedWebBundle(inspection(source));
//     expect(web.observations.endpoints.map(({ value }) => value)).toEqual([
//       "/v1/settings",
//     ]);
//     expect(
//       web.inferences
//         .filter(({ kind }) => kind === "endpoint_candidate")
//         .map(({ value }) => value)
//         .sort(),
//     ).toEqual(expected.slice(1));
//     expect(
//       analyzeJavaScriptStaticSource(source)
//         .endpoints.map(({ value }) => value)
//         .sort(),
//     ).toEqual(expected);
//   });
//
//   it("classifies proven VS Code extension state reads as non-endpoints", () => {
//     const reads = `
//       context.globalState.get("lastVersion");
//       this.workspaceState.get("closedRepositories", []);
//       context?.globalState.get("onboarded");
//       context.globalState.get("/v1/state");
//       context.secrets.get("token");
//       api.get("users");
//     `;
//     const analyze = (source: string) => {
//       const web = analyzeCapturedWebBundle(inspection(source));
//       const staticAnalysis = analyzeJavaScriptStaticSource(source);
//       return {
//         web: {
//           endpoints: web.observations.endpoints
//             .map(({ value }) => value)
//             .sort(),
//           candidates: web.inferences
//             .filter(({ kind }) => kind === "endpoint_candidate")
//             .map(({ value }) => value)
//             .sort(),
//         },
//         application: {
//           endpoints: staticAnalysis.endpoints
//             .filter(({ interpretation }) => interpretation === undefined)
//             .map(({ value }) => value)
//             .sort(),
//           candidates: staticAnalysis.endpoints
//             .filter(({ interpretation }) => interpretation === "candidate")
//             .map(({ value }) => value)
//             .sort(),
//         },
//       };
//     };
//     const proven = {
//       endpoints: ["/v1/state"],
//       candidates: ["token", "users"],
//     };
//     expect(analyze(`const vscode = require("vscode");${reads}`)).toEqual({
//       web: proven,
//       application: proven,
//     });
//     expect(analyze(`import * as vscode from "vscode";${reads}`)).toEqual({
//       web: proven,
//       application: proven,
//     });
//     const unproven = {
//       endpoints: ["/v1/state"],
//       candidates: [
//         "closedRepositories",
//         "lastVersion",
//         "onboarded",
//         "token",
//         "users",
//       ],
//     };
//     expect(analyze(`const vscode = require("./vscode");${reads}`)).toEqual({
//       web: unproven,
//       application: unproven,
//     });
//   });
//
//   it("recognizes loadURL endpoints like static analysis", () => {
//     const result = analyzeCapturedWebBundle(
//       inspection('window.win.loadURL("https://embedded.test/app");'),
//     );
//     expect(result.observations.endpoints).toContainEqual(
//       expect.objectContaining({ value: "https://embedded.test/app" }),
//     );
//   });
// });
//
// describe("web bundle artifact metadata", () => {
//   it("preserves long provider media types in artifact summaries", () => {
//     const result = analyzeCapturedWebBundle(inspection("export {};"));
//     const mediaType = `application/${"x".repeat(300)}`;
//     const artifact = result.capture.source_artifacts[0] ?? {
//       sha256: "0".repeat(64),
//       bytes: 0,
//       media_type: "application/javascript",
//       charset: "utf-8" as const,
//       text_available: true as const,
//     };
//
//     expect(
//       webBundleAnalysisSchema.parse({
//         ...result,
//         capture: {
//           ...result.capture,
//           source_artifacts: [{ ...artifact, media_type: mediaType }],
//         },
//       }).capture.source_artifacts[0]?.media_type,
//     ).toBe(mediaType);
//   });
// });
//
// describe("deep captured web bundle syntax", () => {
//   it("retains evidence after a parser-admitted deep property chain", () => {
//     const source = `const value = root${".next".repeat(12_000)};\nimport "./last.js";\nfetch("/after");`;
//     const result = analyzeCapturedWebBundle(inspection(source));
//     expect(result.completeness).toMatchObject({
//       status: "complete",
//       parsed_scripts: 1,
//       parse_failures: 0,
//     });
//     expect(result.observations.chunks.edges).toContainEqual(
//       expect.objectContaining({
//         kind: "static_import",
//         specifier: "./last.js",
//         resolved_url: `${origin}/assets/last.js`,
//         location: expect.objectContaining({ line: 2, column: 0 }),
//       }),
//     );
//     expect(result.observations.endpoints).toContainEqual(
//       expect.objectContaining({
//         value: "/after",
//         location: expect.objectContaining({ line: 3, column: 0 }),
//       }),
//     );
//   });
// });
//
// const inspection = (source: string) =>
//   webPageInspectionSchema.parse({
//     browser: {
//       product: "Fake Chrome",
//       protocol_version: "1.3",
//       revision: "1",
//       user_agent: "fake",
//       js_version: "1",
//     },
//     target: {
//       target_id: "page-1",
//       type: "page",
//       title: "App",
//       url: `${origin}/app`,
//       origin,
//       attached: false,
//     },
//     capture_window: {
//       started_at: "2026-07-14T00:00:00.000Z",
//       ended_at: "2026-07-14T00:00:01.000Z",
//       observation_ms: 1_000,
//     },
//     completeness: {
//       status: "attach_limited",
//       conditions: ["attach_limited"],
//       policy_filtered_sections: [],
//       attach_limited_sections: ["network_requests"],
//       truncated_sections: [],
//       unavailable_sections: [],
//       excluded: [],
//       dropped_events: {
//         scripts: 0,
//         network_requests: 0,
//         console_events: 0,
//         websocket_connections: 0,
//         websocket_frames: 0,
//         webmcp_tools: 0,
//         timeline_events: 0,
//         total: 0,
//       },
//     },
//     frames: [],
//     dom: { total_nodes: 0, nodes: [] },
//     accessibility: {
//       total_nodes: 0,
//       text_capture: {
//         status: "not_approved",
//         retained_bytes: 0,
//         excluded_fields: 0,
//       },
//       nodes: [],
//     },
//     scripts: {
//       total: 1,
//       items: [
//         {
//           script_key: `scr_${"1".repeat(64)}`,
//           url: `${origin}/assets/app.js`,
//           origin,
//           cdp_hash: "hash",
//           length: Buffer.byteLength(source),
//           is_module: true,
//           language: "JavaScript",
//           source_map_url: null,
//           resource_reconciliation: {
//             status: "unmatched",
//             reason: "no_exact_sanitized_url",
//           },
//           source: {
//             included: true,
//             artifact: createWebTextArtifact(source, "text/javascript"),
//           },
//         },
//       ],
//     },
//     resources: [],
//     network: {
//       requests: [],
//       websocket_connections: [],
//       coverage_started_at: "2026-07-14T00:00:00.000Z",
//       prior_activity_available: false,
//     },
//     console: {
//       events: [],
//       coverage_started_at: "2026-07-14T00:00:00.000Z",
//       prior_activity_available: false,
//     },
//     workers: [],
//     metadata: {
//       responses: [],
//       dom_urls: [],
//       agent_hints: [],
//       excluded_dom_urls: 0,
//       headers_allowlisted: true,
//     },
//     storage: {
//       origin,
export const _l = 307;
