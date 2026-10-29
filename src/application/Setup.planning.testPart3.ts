export const __stub = 1;
//     expect(result.remediation).toBeUndefined();
//   });
//
//   it("requires first-run activation after installing Hopper on macOS", async () => {
//     const host = new FakeSetupHost();
//     const result = await runSetup(
//       { ...options(false), structured: false },
//       host,
//       () => Promise.resolve(true),
//     );
//     expect(result.status).toBe("needs_human");
//     expect(result.remediation).toContain("choose its demo mode");
//   });
//
//   it("declines an interactive plan without mutation", async () => {
//     const host = new FakeSetupHost();
//     const result = await runSetup(
//       { ...options(false), structured: false },
//       host,
//       () => Promise.resolve(false),
//     );
//     expect(result.status).toBe("cancelled");
//     expect(result.appliedActions).toEqual([]);
//     expect(host.hopperInstalls).toBe(0);
//     expect(host.doctorCalls).toBe(1);
//   });
//
//   it("treats an empty interactive selection as cancellation", async () => {
//     const host = new FakeSetupHost();
//     host.clients = [{ name: "codex", configPath: "/codex.toml" }];
//
//     const result = await runSetup(
//       { ...options(false), structured: false },
//       host,
//       () => Promise.resolve({ approved: false, selectedActionIds: [] }),
//     );
//
//     expect(result.status).toBe("ready");
//     expect(result.plannedActions).toEqual([]);
//     expect(result.appliedActions).toEqual([]);
//     expect(host.configurations).toBe(0);
//     expect(host.skillInstalls).toBe(0);
//     expect(host.hopperInstalls).toBe(0);
//     expect(host.doctorCalls).toBe(2);
//   });
//
//   it("requires the Hopper flag for unattended setup", async () => {
//     const host = new FakeSetupHost();
//     const result = await runSetup(options(true), host);
//     expect(result.status).toBe("ready");
//     expect(host.hopperInstalls).toBe(0);
//     expect(result.appliedActions).toEqual([]);
//   });
//
//   it("returns an approved planning outcome for explicit dry runs", async () => {
//     const host = new FakeSetupHost();
//     host.hopper = "/Applications/Hopper";
//     host.skill = "unchanged";
//     host.clients = [{ name: "codex", configPath: "/codex.toml" }];
//
//     const result = await runSetup(
//       { ...options(false), dryRun: true, clientIds: ["codex"] },
//       host,
//     );
//
//     expect(result.status).toBe("planned");
//     expect(result.plannedActions.map(({ id }) => id)).toEqual([
//       "configure_client:codex",
//     ]);
//     expect(host.hopperInstalls).toBe(0);
//     expect(host.configurations).toBe(0);
//   });
//
//   it("installs Hopper when unattended authorization is explicit", async () => {
//     const host = new FakeSetupHost("linux");
//     host.distribution = {
//       id: "ubuntu",
//       versionId: "24.04",
//       packageFamily: "deb",
//       hopperSetupSupported: true,
//     };
//     const result = await runSetup(options(true, true), host);
//     expect(result.appliedActions).toEqual(["installed_hopper"]);
//     expect(host.hopperInstalls).toBe(1);
//     expect(result.status).toBe("ready");
//     expect(result.remediation).toBeUndefined();
//   });
//
//   it("records an installed Hopper when opening the app needs manual recovery", async () => {
//     const host = new FakeSetupHost("darwin");
//     host.installHopper = () =>
//       Promise.resolve({
//         status: "installed",
//         launcherPath: "/Applications/Hopper.app/Contents/MacOS/hopper",
//         warning:
//           "Hopper was installed, but macOS could not open it. Open it manually.",
//       });
//
//     const result = await runSetup(options(true, true), host);
//
//     expect(result).toMatchObject({
//       status: "needs_human",
//       appliedActions: ["installed_hopper"],
//       remediation: expect.stringContaining("Open it manually"),
//     });
//   });
//
//   it("reuses existing Hopper without selecting every detected client", async () => {
//     const host = new FakeSetupHost();
//     host.hopper = "/Applications/Hopper";
//     host.clients = [
//       { name: "claude", configPath: "/claude.json" },
//       { name: "cursor", configPath: "/cursor.json" },
//     ];
//     const result = await runSetup(options(true), host);
//     expect(result.status).toBe("ready");
//     expect(result.appliedActions).toEqual([]);
//     expect(host.hopperInstalls).toBe(0);
//   });
// });
//
// describe("setup workflow lifecycle and provider planning", () => {
//   it("reports append-only lifecycle progress for each selected action", async () => {
//     const host = new FakeSetupHost();
//     host.hopper = "/Applications/Hopper";
//     host.clients = [
//       {
//         name: "codex",
//         displayName: "Codex",
//         configPath: "/codex.toml",
//       },
//     ];
export const _l = 132;
