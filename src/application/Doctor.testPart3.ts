export const __stub = 1;
//     expect(result.scope_checks).toContainEqual(
//       expect.objectContaining({ name: "registration:kimi", ok: true }),
//     );
//     expect(result.informational_checks).toContainEqual(
//       expect.objectContaining({
//         name: "registration_timeout:kimi",
//         ok: true,
//         detail: "The configured toolTimeoutMs is shorter than startup.",
//       }),
//     );
//   });
// });
//
// describe("Grok Bot readiness", () => {
//   it("does not treat a Grok Bot data directory as an aligned registration", async () => {
//     const registrations: readonly ClientRegistrationStatus[] = [
//       {
//         client: "grok_bot",
//         config_path: "/home/user/.grokbot",
//         command: [],
//         state: "manual",
//         remediation: "Add the connector from the Grok Bot chat.",
//       },
//     ];
//     const audit = await runDoctor(
//       undefined,
//       host({ clientRegistrations: () => Promise.resolve(registrations) }),
//     );
//     expect(audit.checks.map(({ name }) => name)).not.toContain(
//       "registration:grok_bot",
//     );
//     expect(audit.identity?.registrations).toEqual(registrations);
//
//     const scoped = await runDoctor(
//       undefined,
//       host({ clientRegistrations: () => Promise.resolve(registrations) }),
//       { clients: ["grok_bot"] },
//     );
//     expect(scoped.healthy).toBe(false);
//     expect(scoped.scope_checks).toContainEqual(
//       expect.objectContaining({
//         name: "registration:grok_bot",
//         ok: false,
//         remediation: "Add the connector from the Grok Bot chat.",
//       }),
//     );
//
//     const absent = await runDoctor(
//       undefined,
//       host({ clientRegistrations: () => Promise.resolve([]) }),
//       { clients: ["grok_bot"] },
//     );
//     expect(absent.scope_checks).toContainEqual(
//       expect.objectContaining({
//         name: "registration:grok_bot",
//         ok: false,
//         remediation: expect.stringContaining("hosted computer"),
//       }),
//     );
//   });
// });
//
// describe("doctor scoped readiness", () => {
//   it("keeps agent readiness independent of Hopper host requirements", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         platform: "linux",
//         linuxDistribution: () =>
//           Promise.resolve({
//             id: "nixos",
//             packageFamily: undefined,
//             hopperSetupSupported: false,
//           }),
//         clientRegistrations: () =>
//           Promise.resolve([
//             {
//               client: "codex",
//               config_path: "/home/user/.codex/config.toml",
//               command: ["rea", "mcp"],
//               state: "aligned",
//               remediation: null,
//             },
//           ]),
//       }),
//       { clients: ["codex"] },
//     );
//
//     expect(result).toMatchObject({
//       healthy: true,
//       environment_healthy: false,
//       scope: { mode: "explicit", clients: ["codex"], providers: [] },
//     });
//     expect(result.scope_checks.map(({ name }) => name)).toEqual([
//       "node",
//       "registration:codex",
//     ]);
//     expect(result.informational_checks).toContainEqual(
//       expect.objectContaining({ name: "host", ok: false }),
//     );
//   });
//
//   it("accepts a Debian-family host that has no tested Hopper package", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         platform: "linux",
//         macosVersion: () => Promise.resolve(undefined),
//         linuxDistribution: () =>
//           Promise.resolve({
//             id: "kali",
//             versionId: "2026.3",
//             packageFamily: "deb",
//             hopperSetupSupported: false,
//           }),
//       }),
//     );
//
//     expect(result.checks).toContainEqual(
//       expect.objectContaining({
//         name: "host",
//         ok: true,
//         detail: "kali 2026.3",
//       }),
//     );
//   });
//
//   it("requires explicitly selected providers instead of any available provider", async () => {
//     const ghidra = {
//       id: "ghidra",
//       configured: true,
//       available: true,
//       providerVersion: "12.1.4",
//       registrationEnvironment: { GHIDRA_INSTALL_DIR: "/tools/ghidra" },
//       checks: [
//         {
//           name: "configuration",
//           ok: true,
//           code: null,
//           detail: "/tools/ghidra",
//           remediation: null,
//           classification: "config_drift" as const,
//         },
//       ],
//     };
//     const noHopper = host({
//       executable: () => Promise.resolve(false),
//       providerInspections: () => Promise.resolve([ghidra]),
//     });
//
//     const hopper = await runDoctor(undefined, noHopper, {
//       providers: ["hopper"],
//     });
//     expect(hopper).toMatchObject({
//       healthy: false,
//       environment_healthy: true,
//     });
//
//     const selectedGhidra = await runDoctor(undefined, noHopper, {
//       providers: ["ghidra"],
//     });
//     expect(selectedGhidra.healthy).toBe(true);
//   });
// });
//
// describe("doctor Linux and Hopper discovery", () => {
//   it("accepts an officially supported Linux distribution", async () => {
//     const path = "/home/user/.local/share/rea/hopper/bin/Hopper";
//     const result = await runDoctor(
//       undefined,
//       host({
//         platform: "linux",
//         macosVersion: () => Promise.resolve(undefined),
//         linuxDistribution: () =>
//           Promise.resolve({
//             id: "ubuntu",
//             versionId: "24.04",
//             packageFamily: "deb",
//             hopperSetupSupported: true,
//           }),
//         configuredHopperPath: path,
//         executable: (candidate) => Promise.resolve(candidate === path),
//       }),
//     );
//     expect(result.healthy).toBe(true);
//     expect(result.hopperPath).toBe(path);
//   });
//   it("reports missing Linux demo-session dependencies", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         platform: "linux",
//         macosVersion: () => Promise.resolve(undefined),
//         linuxDistribution: () =>
export const _l = 194;
