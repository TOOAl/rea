export const __stub = 1;
//     host.productRegistrations = [
//       {
//         client: "codex",
//         config_path: "/codex.toml",
//         command: ["rea", "mcp"],
//         state: "aligned",
//         remediation: null,
//       },
//     ];
//     const progress: SetupProgressEvent[] = [];
//     await runSetup(
//       { ...options(true), onProgress: (event) => progress.push(event) },
//       host,
//     );
//     expect(progress).toEqual([
//       { actionId: "configure_client:codex", label: "Codex", state: "started" },
//       {
//         actionId: "configure_client:codex",
//         label: "Codex",
//         state: "completed",
//       },
//       {
//         actionId: "install_skill",
//         label: "REA reverse-engineering skill",
//         state: "started",
//       },
//       {
//         actionId: "install_skill",
//         label: "REA reverse-engineering skill",
//         state: "completed",
//       },
//     ]);
//   });
//
//   it("plans and propagates BYO Ghidra without installing software", async () => {
//     const host = new FakeSetupHost("linux");
//     host.distribution = {
//       id: "ubuntu",
//       versionId: "24.04",
//       packageFamily: "deb",
//       hopperSetupSupported: true,
//     };
//     host.ghidra = "/opt/ghidra_12.1.4_PUBLIC";
//     host.javaHome = "/usr/lib/jvm/jdk-21";
//     host.doctorHealthy = true;
//     host.skill = "unchanged";
//     host.clients = [{ name: "cursor", configPath: "/cursor.json" }];
//
//     const plan = await runSetup(
//       { ...options(false), clientIds: ["cursor"] },
//       host,
//     );
//     expect(plan.plannedActions.map(({ kind }) => kind)).toEqual([
//       "configure_client",
//     ]);
//     expect(plan.plannedActions[0]?.detail).toContain(
//       "GHIDRA_INSTALL_DIR=/opt/ghidra_12.1.4_PUBLIC",
//     );
//     expect(plan.plannedActions[0]?.detail).toContain(
//       "JAVA_HOME=/usr/lib/jvm/jdk-21",
//     );
//     expect(host.hopperInstalls).toBe(0);
//     expect(host.configurations).toBe(0);
//
//     const applied = await runSetup(
//       { ...options(true), clientIds: ["cursor"] },
//       host,
//     );
//     expect(applied.status).toBe("ready");
//     expect(host.hopperInstalls).toBe(0);
//     expect(host.configuredProviderEnvironments).toContainEqual({
//       GHIDRA_INSTALL_DIR: "/opt/ghidra_12.1.4_PUBLIC",
//       JAVA_HOME: "/usr/lib/jvm/jdk-21",
//     });
//   });
//
//   it("reinstalls existing Hopper when explicitly requested", async () => {
//     const host = new FakeSetupHost();
//     host.hopper = "/Applications/Hopper";
//     host.skill = "unchanged";
//     host.clients = [{ name: "codex", configPath: "/codex.toml" }];
//     host.clientResults.set("codex", { status: "unchanged" });
//
//     const result = await runSetup(
//       { ...options(true, true), clientIds: ["codex"] },
//       host,
//     );
//
//     expect(result.plannedActions.map(({ kind }) => kind)).toEqual([
//       "install_hopper",
//       "configure_client",
//     ]);
//     expect(result.appliedActions).toEqual(["installed_hopper"]);
//     expect(host.hopperInstalls).toBe(1);
//     expect(host.hopperReplaceRequests).toEqual([true]);
//     expect(host.configurations).toBe(0);
//     expect(host.checkedHopperPaths).toEqual(["/manual/Hopper"]);
//   });
//
//   it("does not write a file when Grok Bot is selected", async () => {
//     const host = new FakeSetupHost();
//     host.doctorHealthy = true;
//     host.skill = "unchanged";
//     host.clients = [
//       {
//         name: "grok_bot",
//         displayName: "Grok Bot",
//         configPath: "/home/user/.grokbot",
//         format: "unsupported",
//       },
//     ];
//
//     const planned = await runSetup(
//       { ...options(true), clientIds: ["grok_bot"], dryRun: true },
//       host,
//     );
//     expect(planned.status).toBe("planned");
//     expect(planned.plannedActions).toEqual([]);
//     expect(planned.remediation).toContain("hosted computer");
//     expect(host.configurations).toBe(0);
//
//     const applied = await runSetup(
//       { ...options(true), clientIds: ["grok_bot"] },
//       host,
//     );
//     expect(applied.status).toBe("needs_human");
//     expect(applied.appliedActions).toEqual([]);
//     expect(applied.remediation).toContain("hosted computer");
//     expect(host.configurations).toBe(0);
//   });
// });
export const _l = 131;
