export const __stub = 1;
// import { describe, expect, it } from "vitest";
//
// import { SUPPORTED_NODE_VERSION_PROSE } from "../domain/runtimeVersion.js";
// import type { ClientRegistrationStatus } from "./ClientRegistrationStatus.js";
// import { createDoctorHostFixture as host } from "./Doctor.fixture.js";
// import { runDoctor } from "./Doctor.js";
// import { err } from "../domain/result.js";
// import { HopperReleaseError } from "./HopperReleaseFeed.js";
//
// describe("doctor runtime check", () => {
//   it("reports Node 25 as unsupported", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({ runtime: { id: "node", version: "25.1.0" } }),
//     );
//
//     expect(result.healthy).toBe(false);
//     expect(result.checks).toContainEqual(
//       expect.objectContaining({
//         name: "node",
//         ok: false,
//         detail: "25.1.0",
//         details: { runtime: "node", version: "25.1.0" },
//         classification: "missing_dependency",
//       }),
//     );
//   });
//
//   it.each([
//     { compatibility: "26.3.0", ok: true },
//     { compatibility: "25.1.0", ok: false },
//   ])(
//     "identifies Bun and admits it by Node.js compatibility $compatibility",
//     async ({ compatibility, ok }) => {
//       const result = await runDoctor(
//         undefined,
//         host({
//           runtime: {
//             id: "bun",
//             version: "1.4.2",
//             nodeCompatibilityVersion: compatibility,
//           },
//         }),
//       );
//
//       expect(result.checks).toContainEqual(
//         expect.objectContaining({
//           name: "node",
//           ok,
//           classification: ok ? "healthy" : "missing_dependency",
//           details: {
//             runtime: "bun",
//             version: "1.4.2",
//             node_compatibility_version: compatibility,
//           },
//         }),
//       );
//     },
//   );
// });
//
// describe("doctor", () => {
//   it("returns exact recovery for every failed diagnostic", async () => {
//     const result = await runDoctor(
//       "/missing/app",
//       host({
//         runtime: { id: "node", version: "20.0.0" },
//         macosVersion: () => Promise.resolve("11.7"),
//         executable: () => Promise.resolve(false),
//         validTarget: () => Promise.resolve(false),
//       }),
//     );
//     expect(
//       Object.fromEntries(
//         result.checks.map(({ name, remediation }) => [name, remediation]),
//       ),
//     ).toEqual({
//       node: `Install ${SUPPORTED_NODE_VERSION_PROSE}.`,
//       host: "REA supports macOS 12+, Linux distributions with a recognized apt, dnf, or pacman package family, and the experimental Windows x64 Ghidra P0 boundary; automated Hopper setup additionally requires Ubuntu 24.04+, Fedora 41+, Nobara 44+, 64-bit Arch Linux, CachyOS, or Omarchy.",
//       hopper: "Run rea setup to install Hopper, or set HOPPER_LAUNCHER_PATH.",
//       target: "Supply a readable local app or program path.",
//     });
//   });
//
//   it.each(["11.7", undefined])(
//     "rejects unsupported macOS version %s",
//     async (version) => {
//       const result = await runDoctor(
//         undefined,
//         host({ macosVersion: () => Promise.resolve(version) }),
//       );
//       expect(result.checks).toContainEqual(
//         expect.objectContaining({
//           name: "host",
//           ok: false,
//           classification: "unsupported_host",
//         }),
//       );
//     },
//   );
//
//   it("admits only the experimental Windows x64 host boundary", async () => {
//     const windows = await runDoctor(
//       undefined,
//       host({
//         platform: "win32",
//         architecture: "x64",
//         macosVersion: () => Promise.resolve(undefined),
//         executable: () => Promise.resolve(false),
//       }),
//     );
//     const arm = await runDoctor(
//       undefined,
//       host({
//         platform: "win32",
//         architecture: "arm64",
//         macosVersion: () => Promise.resolve(undefined),
//         executable: () => Promise.resolve(false),
//       }),
//     );
//
//     expect(windows.checks.find(({ name }) => name === "host")).toMatchObject({
//       ok: true,
//       detail: "win32 x64",
//     });
//     expect(arm.checks.find(({ name }) => name === "host")).toMatchObject({
//       ok: false,
//       detail: "win32 arm64",
//     });
//   });
//   it("detects a manual configured Hopper before Homebrew", async () => {
//     let brewProbes = 0;
//     const result = await runDoctor(
//       undefined,
//       host({
//         configuredHopperPath: "/manual/Hopper",
//         executable: (path) => Promise.resolve(path === "/manual/Hopper"),
//         brewHopperPath: () => {
//           brewProbes += 1;
//           return Promise.resolve(undefined);
//         },
//       }),
//     );
//     expect(result.hopperPath).toBe("/manual/Hopper");
//     expect(result.healthy).toBe(true);
//     expect(brewProbes).toBe(0);
//   });
//
//   it("reports optional BYO ilspycmd diagnostics only when configured", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         configuredIlspyCmdPath: "/tools/ilspycmd",
//         ilspyCmdVersion: (path) =>
//           Promise.resolve(
//             path === "/tools/ilspycmd" ? "ilspycmd: 9.1.0.7988" : undefined,
//           ),
//       }),
//     );
//     expect(result.healthy).toBe(true);
//     expect(result.checks).toContainEqual({
//       name: "ilspycmd",
//       ok: true,
//       classification: "healthy",
//       detail: "/tools/ilspycmd (ilspycmd: 9.1.0.7988)",
//     });
//   });
//
//   it("reports configured ilspycmd drift without installing it", async () => {
//     const result = await runDoctor(
//       undefined,
//       host({
//         configuredIlspyCmdPath: "/missing/ilspycmd",
//         ilspyCmdVersion: () => Promise.resolve(undefined),
//       }),
//     );
//     expect(result.healthy).toBe(false);
//     expect(result.checks).toContainEqual({
//       name: "ilspycmd",
//       ok: false,
//       classification: "config_drift",
//       detail: "/missing/ilspycmd",
//       remediation:
//         "Unset REA_ILSPY_CMD_PATH or point it at a runnable ilspycmd executable.",
//     });
//   });
//
//   it("does not fall back when the configured Hopper launcher is invalid", async () => {
//     const configuredPath = "/invalid/custom/hopper";
//     const result = await runDoctor(
//       undefined,
//       host({ configuredHopperPath: configuredPath }),
//     );
//
export const _l = 194;
