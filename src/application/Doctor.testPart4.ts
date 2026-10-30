export const __stub = 1;
//           Promise.resolve({
//             id: "ubuntu",
//             versionId: "24.04",
//             packageFamily: "deb",
//             hopperSetupSupported: true,
//           }),
//         linuxDemoRuntimeCheck: () =>
//           Promise.resolve({
//             name: "hopper-demo-runtime",
//             ok: false,
//             classification: "missing_dependency",
//             remediation: "Install Xvfb, xauth, Python 3, libX11, and libXtst.",
//           }),
//       }),
//     );
//     expect(result.healthy).toBe(false);
//     expect(
//       result.checks.find(({ name }) => name === "hopper-demo-runtime"),
//     ).toMatchObject({
//       ok: false,
//       classification: "missing_dependency",
//       remediation: expect.stringContaining("xauth"),
//     });
//   });
//   it("explains how to recover from an unsupported configured launcher", async () => {
//     const path = "/custom/Hopper";
//     const result = await runDoctor(
//       undefined,
//       host({
//         platform: "linux",
//         configuredHopperPath: path,
//         linuxDistribution: () =>
//           Promise.resolve({
//             id: "ubuntu",
//             versionId: "24.04",
//             packageFamily: "deb",
//             hopperSetupSupported: true,
//           }),
//         executable: (candidate) => Promise.resolve(candidate === path),
//         inspectLinuxHopper: () =>
//           Promise.resolve(
//             err(
//               new HopperReleaseError(
//                 "unsupported_hopper_build",
//                 "Unverified fixture build",
//               ),
//             ),
//           ),
//       }),
//     );
//     expect(
//       result.checks.find(({ name }) => name === "hopper-version")?.remediation,
//     ).toContain("Check HOPPER_LAUNCHER_PATH");
//   });
// });
//
// describe("doctor installed Hopper discovery", () => {
//   it("checks the canonical user install after the system launcher", async () => {
//     const userPath =
//       "/fixture/home/Applications/Hopper Disassembler.app/Contents/MacOS/hopper";
//     const checked: string[] = [];
//     const result = await runDoctor(
//       undefined,
//       host({
//         homeDirectory: "/fixture/home",
//         executable: (candidate) => {
//           checked.push(candidate);
//           return Promise.resolve(candidate === userPath);
//         },
//       }),
//     );
//
//     expect(result.hopperPath).toBe(userPath);
//     expect(checked.slice(0, 2)).toEqual([
//       "/Applications/Hopper Disassembler.app/Contents/MacOS/hopper",
//       userPath,
//     ]);
//   });
//
//   it("detects a Homebrew cask installed outside /Applications", async () => {
//     const path =
//       "/opt/homebrew/Caskroom/hopper/Hopper Disassembler.app/Contents/MacOS/hopper";
//     const result = await runDoctor(
//       undefined,
//       host({
//         executable: (candidate) => Promise.resolve(candidate === path),
//         brewHopperPath: () => Promise.resolve(path),
//       }),
//     );
//     expect(result.hopperPath).toBe(path);
//   });
//
//   it("detects a manually installed Hopper application", async () => {
//     const path = "/Applications/Hopper v6.app/Contents/MacOS/hopper";
//     const result = await runDoctor(
//       undefined,
//       host({
//         executable: (candidate) => Promise.resolve(candidate === path),
//         manualHopperPaths: () => Promise.resolve([path]),
//       }),
//     );
//     expect(result.hopperPath).toBe(path);
//   });
// });
//
// describe("doctor target admission on Linux", () => {
//   it("uses shared app target validation when a target is supplied", async () => {
//     const result = await runDoctor(
//       "/Applications/Notes.app",
//       host({
//         validTarget: (path) =>
//           Promise.resolve(path === "/Applications/Notes.app"),
//       }),
//     );
//     expect(result.checks).toContainEqual(
//       expect.objectContaining({
//         name: "target",
//         ok: true,
//         classification: "healthy",
//         detail: "/Applications/Notes.app",
//       }),
//     );
//   });
//
//   it("rejects a readable Hopper launcher without execute permission", async () => {
//     const path = "/manual/Hopper";
//     const result = await runDoctor(
//       undefined,
//       host({
//         configuredHopperPath: path,
//         validTarget: () => Promise.resolve(true),
//         executable: () => Promise.resolve(false),
//       }),
//     );
//     expect(result.hopperPath).toBeUndefined();
//     expect(result.checks).toContainEqual(
//       expect.objectContaining({
//         name: "hopper",
//         ok: false,
//         classification: "config_drift",
//       }),
//     );
//   });
// });
//
// describe("doctor standard Linux Hopper paths", () => {
//   it.each(["/opt/hopper-v4/bin/hopper", "/usr/bin/hopper"])(
//     "detects Hopper at the standard path %s",
//     async (path) => {
//       const result = await runDoctor(
//         undefined,
//         host({
//           platform: "linux",
//           macosVersion: () => Promise.resolve(undefined),
//           linuxDistribution: () =>
//             Promise.resolve({
//               id: "ubuntu",
//               versionId: "24.04",
//               packageFamily: "deb",
//               hopperSetupSupported: true,
//             }),
//           executable: (candidate) => Promise.resolve(candidate === path),
//         }),
//       );
//       expect(result.hopperPath).toBe(path);
//     },
//   );
// });
//
// describe("doctor target admission diagnostics", () => {
//   it("preserves route-specific target diagnostics from the host", async () => {
//     const targetCheck = {
//       name: "target",
//       ok: false,
//       classification: "unsupported_target" as const,
//       detail: "/fixture/javascript-app",
//       remediation: "Use analyze_javascript_application with input_path.",
//     };
//     const result = await runDoctor(
//       targetCheck.detail,
//       host({
//         inspectTarget: () => Promise.resolve(targetCheck),
//         validTarget: () => {
//           throw new Error("the detailed target check should be used");
//         },
//       }),
//     );
//     expect(result.checks).toContainEqual(targetCheck);
//   });
// });
export const _l = 190;
