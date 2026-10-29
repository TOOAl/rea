export const __stub = 1;
//     expect(host.skillInstalls).toBe(0);
//   });
// });
//
// describe("skill plan destinations", () => {
//   it("plans a Claude-only skill in its personal location", async () => {
//     const host = new FakeSetupHost();
//     host.clients = [{ name: "claude_code", configPath: "/claude.json" }];
//
//     const result = await runSetup(
//       { ...options(false), clientIds: ["claude_code"] },
//       host,
//     );
//
//     expect(
//       result.plannedActions
//         .filter(({ kind }) => kind === "install_skill")
//         .map(({ target }) => target),
//     ).toEqual(["/fixture/home/.claude/skills/reverse-engineer-anything"]);
//   });
//
//   it("plans both shared and personal skill roots for mixed clients", async () => {
//     const host = new FakeSetupHost();
//     host.clients = [
//       { name: "claude_code", configPath: "/claude.json" },
//       { name: "codex", configPath: "/codex.toml", format: "toml" },
//     ];
//
//     const result = await runSetup(
//       { ...options(false), clientIds: ["claude_code", "codex"] },
//       host,
//     );
//
//     expect(
//       result.plannedActions
//         .filter(({ kind }) => kind === "install_skill")
//         .map(({ target }) => target),
//     ).toEqual([
//       "/fixture/home/.agents/skills/reverse-engineer-anything",
//       "/fixture/home/.claude/skills/reverse-engineer-anything",
//     ]);
//   });
// });
//
// describe("setup workflow", () => {
//   it("blocks client registration when no executable entrypoint is available", async () => {
//     const host = new FakeSetupHost("win32");
//     host.registrationCommand = [];
//     host.registrationCommandBlocker =
//       "REA could not determine the current executable entrypoint.";
//     host.clients = [{ name: "codex", configPath: "C:\\config\\codex.toml" }];
//
//     const result = await runSetup(
//       { ...options(true), clientIds: ["codex"], installSkill: false },
//       host,
//     );
//
//     expect(result.status).toBe("needs_human");
//     expect(result.plannedActions).toEqual([]);
//     expect(result.remediation).toBe(host.registrationCommandBlocker);
//     expect(host.configurations).toBe(0);
//   });
//
//   it("keeps a relative Node registration out of setup defaults when cwd happens to match", async () => {
//     const host = new FakeSetupHost();
//     host.clients = [{ name: "cursor", configPath: "/cursor.json" }];
//     host.productRegistrations = [
//       {
//         client: "cursor",
//         config_path: "/cursor.json",
//         command: [process.execPath, "./rea.mjs", "mcp"],
//         state: "stale",
//         remediation: "Run rea setup to refresh this registration.",
//       },
//     ];
//
//     const result = await runSetup(
//       { ...options(false), clientIds: [], installSkill: false },
//       host,
//     );
//
//     expect(result.clientStates).toContainEqual(
//       expect.objectContaining({
//         client: expect.objectContaining({ name: "cursor" }),
//         status: "unknown",
//         configured: false,
//       }),
//     );
//     expect(result.plannedActions).toEqual([]);
//     expect(host.configurations).toBe(0);
//   });
// });
//
// describe("setup plan application", () => {
//   it("returns a complete plan without mutation", async () => {
//     const host = new FakeSetupHost();
//     host.clients = [{ name: "cursor", configPath: "/cursor.json" }];
//     const result = await runSetup(
//       { ...options(false), clientIds: ["cursor"] },
//       host,
//     );
//     expect(result.status).toBe("needs_confirmation");
//     expect(result.plannedActions.map(({ kind }) => kind)).toEqual([
//       "configure_client",
//       "install_skill",
//     ]);
//     expect(host.hopperInstalls).toBe(0);
//     expect(host.configurations).toBe(0);
//     expect(result.remediation).toBe(
//       "Review the setup plan, then rerun interactively or with --yes.",
//     );
//   });
//
//   it("reports ready after an accepted Linux plan installs healthy Hopper", async () => {
//     const host = new FakeSetupHost("linux");
//     host.distribution = {
//       id: "ubuntu",
//       versionId: "24.04",
//       packageFamily: "deb",
//       hopperSetupSupported: true,
//     };
//     const result = await runSetup(
//       { ...options(false), structured: false },
//       host,
//       () => Promise.resolve(true),
//     );
//     expect(result.status).toBe("ready");
//     expect(result.appliedActions).toEqual([
//       "installed_hopper",
//       "installed_skill",
//     ]);
//     expect(host.hopperInstalls).toBe(1);
export const _l = 132;
