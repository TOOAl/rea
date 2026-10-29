export const __stub = 1;
//     expect(result.hopperPath).toBeUndefined();
//     expect(result.healthy).toBe(false);
//     expect(result.checks.find(({ name }) => name === "hopper")).toEqual({
//       name: "hopper",
//       ok: false,
//       classification: "config_drift",
//       detail: configuredPath,
//       remediation:
//         "Unset or update HOPPER_LAUNCHER_PATH to an executable Hopper launcher.",
//     });
//   });
// });
//
// describe("doctor installation identity", () => {
//   it("distinguishes stale skills, path shadowing, and unobservable live state", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         installationPaths: () =>
//           Promise.resolve(["/usr/local/bin/rea", "/home/user/bin/rea"]),
//         installedSkillIdentity: () =>
//           Promise.resolve({
//             version: "10",
//             toolCount: null,
//             canonical: false,
//           }),
//       }),
//     );
//
//     expect(result.identity).toMatchObject({
//       live_server: { state: "unknown" },
//       installations: { state: "multiple" },
//       skill: {
//         installed_version: "10",
//         state: "stale",
//         remediation: "Run rea setup to update the installed REA skill.",
//       },
//     });
//   });
//   it("reports a missing installed skill as unhealthy", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({ installedSkillIdentity: () => Promise.resolve(undefined) }),
//     );
//
//     expect(result.healthy).toBe(false);
//     expect(result.identity?.skill).toMatchObject({
//       state: "missing",
//       remediation: "Run rea setup to update the installed REA skill.",
//     });
//     expect(result.checks).toContainEqual({
//       name: "skill:identity",
//       ok: false,
//       classification: "config_drift",
//       detail: "Installed REA skill identity is missing.",
//       remediation: "Run rea setup to update the installed REA skill.",
//     });
//   });
//   it("reports stale client registration paths without claiming live state", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         clientRegistrations: () =>
//           Promise.resolve([
//             {
//               client: "codex",
//               config_path: "/home/user/.codex/config.toml",
//               command: ["/old/rea", "mcp"],
//               state: "stale",
//               remediation:
//                 "Run rea setup to refresh this registration, then restart the client.",
//             },
//           ]),
//       }),
//     );
//
//     expect(result.healthy).toBe(false);
//     expect(result.identity).toMatchObject({
//       live_server: { state: "unknown" },
//       registrations: [{ client: "codex", state: "stale" }],
//     });
//     expect(result.checks).toContainEqual(
//       expect.objectContaining({
//         name: "registration:codex",
//         classification: "config_drift",
//       }),
//     );
//   });
// });
//
// describe("doctor scoped readiness", () => {
//   it("checks explicitly selected skill destinations independently of registrations", async () => {
//     const selected: (readonly string[] | undefined)[] = [];
//     const result = await runDoctor(
//       undefined,
//       host({
//         clientRegistrations: () => Promise.resolve([]),
//         installedSkillIdentity: (clients) => {
//           selected.push(clients);
//           return Promise.resolve({
//             version: "stale",
//             toolCount: 0,
//             canonical: false,
//           });
//         },
//       }),
//       {
//         clients: [],
//         skillClients: ["claude_code", "claude_code"],
//         skill: true,
//       },
//     );
//
//     expect(selected).toEqual([["claude_code"]]);
//     expect(result.scope).toMatchObject({
//       mode: "explicit",
//       clients: [],
//       skill_clients: ["claude_code"],
//       skill: true,
//     });
//     expect(result.healthy).toBe(false);
//     expect(result.scope_checks.map(({ name }) => name)).toEqual([
//       "node",
//       "skill:identity",
//     ]);
//   });
//
//   it("scopes effective readiness to selected clients without hiding drift", async () => {
//     const registrations: readonly ClientRegistrationStatus[] = [
//       {
//         client: "codex",
//         config_path: "/home/user/.codex/config.toml",
//         command: ["/current/rea", "mcp"],
//         state: "aligned",
//         remediation: null,
//       },
//       {
//         client: "cursor",
//         config_path: "/home/user/.cursor/mcp.json",
//         command: ["/old/rea", "mcp"],
//         state: "unknown",
//         remediation: "Run rea setup to refresh this registration.",
//       },
//     ];
//     const scoped = await runDoctor(
//       undefined,
//       host({ clientRegistrations: () => Promise.resolve(registrations) }),
//       { clients: ["codex"] },
//     );
//
//     expect(scoped).toMatchObject({
//       healthy: true,
//       environment_healthy: false,
//       scope: { mode: "explicit", clients: ["codex"] },
//     });
//     expect(scoped.scope_checks).toContainEqual(
//       expect.objectContaining({ name: "registration:codex", ok: true }),
//     );
//     expect(scoped.informational_checks).toContainEqual(
//       expect.objectContaining({
//         name: "registration:cursor",
//         ok: false,
//         classification: "unknown",
//       }),
//     );
//
//     const staleSelected = await runDoctor(
//       undefined,
//       host({ clientRegistrations: () => Promise.resolve(registrations) }),
//       { clients: ["cursor"] },
//     );
//     expect(staleSelected.healthy).toBe(false);
//   });
//
//   it("keeps a caller-selected short timeout healthy and reports its advisory as informational", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         clientRegistrations: () =>
//           Promise.resolve([
//             {
//               client: "kimi",
//               config_path: "/home/user/.kimi-code/mcp.json",
//               command: ["/current/rea", "mcp"],
//               state: "aligned",
//               remediation: null,
//               advisory: "The configured toolTimeoutMs is shorter than startup.",
//             },
//           ]),
//       }),
//       { clients: ["kimi"] },
//     );
//
//     expect(result.healthy).toBe(true);
export const _l = 194;
