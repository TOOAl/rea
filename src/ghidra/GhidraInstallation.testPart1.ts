export const __stub = 1;
// import { chmod, mkdir, symlink, writeFile } from "node:fs/promises";
// import { join } from "node:path";
// import { afterEach, describe, expect, it, vi } from "vitest";
// import { spawnSync } from "node:child_process";
//
// import { elf, fat, thinMach } from "../domain/binaryTarget.fixture.js";
// import { projectGhidraDoctorInspection } from "./GhidraDoctor.js";
// import {
//   ghidraInstallationDiagnostics,
//   ghidraJavaEnvironment,
//   discoverGhidraInstallationOnPath,
//   inspectGhidraInstallation,
//   type GhidraExecutableHeaderProbe,
//   type GhidraInstallationHost,
//   type GhidraJavaObservation,
// } from "./GhidraInstallation.js";
// import {
//   ghidraApplicationProperties,
//   ghidraJavaRequirement,
// } from "./GhidraInstallationPolicy.js";
// import {
//   SUPPORTED_GHIDRA_JAVA_MAJOR,
//   SUPPORTED_GHIDRA_VERSION,
// } from "./GhidraReleasePolicy.js";
// import { createTestTempDirectory } from "../../tests/fixtures/temporaryDirectory.js";
//
// // The real Java probe shells out via spawnSync; stub it so one test can run
// // the real probeJava against captured `-XshowSettings:properties` output.
// // Every other test overrides probeJava, so the stub never fires for them.
// vi.mock("node:child_process", async (importOriginal) => {
//   const original = await importOriginal<typeof import("node:child_process")>();
//   return { ...original, spawnSync: vi.fn() };
// });
//
// const INSTALL = "/opt/ghidra";
// const PROPERTIES = `${INSTALL}/Ghidra/application.properties`;
// const HEADLESS = `${INSTALL}/support/analyzeHeadless`;
// const LINUX_DECOMPILER = `${INSTALL}/Ghidra/Features/Decompiler/os/linux_x86_64/decompile`;
// const MAC_DECOMPILER = `${INSTALL}/Ghidra/Features/Decompiler/os/mac_arm_64/decompile`;
// const WINDOWS_INSTALL = "C:\\tools\\ghidra_12.1.4_PUBLIC";
// const WINDOWS_PROPERTIES = `${WINDOWS_INSTALL}\\Ghidra\\application.properties`;
// const WINDOWS_HEADLESS = `${WINDOWS_INSTALL}\\support\\analyzeHeadless.bat`;
// const WINDOWS_DECOMPILER = `${WINDOWS_INSTALL}\\Ghidra\\Features\\Decompiler\\os\\win_x86_64\\decompile.exe`;
//
// const headerProbe = (bytes: Buffer): GhidraExecutableHeaderProbe => ({
//   bytes,
//   size: bytes.length,
// });
//
// const JAVA: GhidraJavaObservation = {
//   osArch: "amd64",
//   osName: "Linux",
//   version: "21.0.11",
//   major: SUPPORTED_GHIDRA_JAVA_MAJOR,
//   home: "/usr/lib/jvm/jdk-21",
//   bits: 64,
//   runtime: "jdk",
// };
//
// const host = (
//   overrides: Partial<GhidraInstallationHost> = {},
// ): GhidraInstallationHost => ({
//   readText: (path) =>
//     path === PROPERTIES
//       ? `application.version=${SUPPORTED_GHIDRA_VERSION}\napplication.java.min=${String(SUPPORTED_GHIDRA_JAVA_MAJOR)}\n`
//       : undefined,
//   executable: (path) =>
//     path === HEADLESS || path === MAC_DECOMPILER || path === LINUX_DECOMPILER,
//   probeJava: () => JAVA,
//   ...overrides,
// });
//
// afterEach(() => {
//   vi.unstubAllEnvs();
// });
//
// it.skipIf(process.platform === "win32")(
//   "resolves a PATH launcher only when its real target is a complete installation",
//   async () => {
//     const root = await createTestTempDirectory("rea-ghidra-path-");
//     const installation = join(root, "installation");
//     const pathDirectory = join(root, "bin");
//     const launcher = join(installation, "ghidraRun");
//     await mkdir(join(installation, "Ghidra"), { recursive: true });
//     await mkdir(join(installation, "support"), { recursive: true });
//     await mkdir(pathDirectory, { recursive: true });
//     await writeFile(
//       join(installation, "Ghidra", "application.properties"),
//       "application.version=12.1.4\n",
//     );
//     await writeFile(launcher, "#!/bin/sh\nexit 0\n");
//     await writeFile(
//       join(installation, "support", "analyzeHeadless"),
//       "#!/bin/sh\nexit 0\n",
//     );
//     await chmod(launcher, 0o700);
//     await chmod(join(installation, "support", "analyzeHeadless"), 0o700);
//     await symlink(launcher, join(pathDirectory, "ghidra"));
//
//     expect(
//       discoverGhidraInstallationOnPath(
//         { PATH: pathDirectory },
//         process.platform,
//       ),
//     ).toBe(installation);
//
//     const incomplete = join(root, "incomplete");
//     const incompletePath = join(root, "incomplete-bin");
//     await mkdir(join(incomplete, "Ghidra"), { recursive: true });
//     await mkdir(incompletePath, { recursive: true });
//     await writeFile(
//       join(incomplete, "Ghidra", "application.properties"),
//       "application.version=12.1.4\n",
//     );
//     await writeFile(join(incomplete, "ghidraRun"), "launcher\n");
//     await chmod(join(incomplete, "ghidraRun"), 0o700);
//     await symlink(
//       join(incomplete, "ghidraRun"),
//       join(incompletePath, "ghidra"),
//     );
//     expect(
//       discoverGhidraInstallationOnPath(
//         { PATH: incompletePath },
//         process.platform,
//       ),
//     ).toBeUndefined();
//
//     const nonExecutable = join(root, "non-executable");
//     const nonExecutablePath = join(root, "non-executable-bin");
//     await mkdir(join(nonExecutable, "Ghidra"), { recursive: true });
//     await mkdir(join(nonExecutable, "support"), { recursive: true });
//     await mkdir(nonExecutablePath, { recursive: true });
//     await writeFile(
//       join(nonExecutable, "Ghidra", "application.properties"),
//       "application.version=12.1.4\n",
//     );
//     await writeFile(
//       join(nonExecutable, "support", "analyzeHeadless"),
//       "headless\n",
//     );
//     await chmod(join(nonExecutable, "support", "analyzeHeadless"), 0o700);
//     await writeFile(join(nonExecutablePath, "ghidra"), "not executable\n");
//     expect(
//       discoverGhidraInstallationOnPath(
//         { PATH: nonExecutablePath },
//         process.platform,
//       ),
//     ).toBeUndefined();
//   },
// );
//
// it("does not fall back to PATH when an explicit Ghidra installation path is malformed", () => {
//   const inspection = inspectGhidraInstallation(
//     {
//       environment: { PATH: "/valid-ghidra-bin" },
//       installDir: "relative/ghidra",
//       platform: "linux",
//       architecture: "x64",
//     },
//     host({ discoverInstallDirOnPath: () => INSTALL }),
//   );
//   expect(inspection.status).toBe("unavailable");
//   expect(inspection.installDir).toBe("relative/ghidra");
//   expect(inspection.checks[0]).toMatchObject({
//     name: "configuration",
//     status: "failed",
//     detail: "GHIDRA_INSTALL_DIR must be absolute",
//   });
// });
//
// it("probes the selected Java environment without reading conflicting ambient settings", () => {
//   vi.stubEnv("REA_GHIDRA_CONTEXT", "ambient");
//   vi.stubEnv("REA_GHIDRA_AMBIENT", "ambient-only");
//   const inspection = inspectGhidraInstallation(
//     {
//       environment: { REA_GHIDRA_CONTEXT: "selected", PATH: "/selected-bin" },
//       installDir: INSTALL,
//       platform: "linux",
//       architecture: "x64",
//     },
//     host({
//       probeJava: (_command, environment) =>
//         environment.REA_GHIDRA_CONTEXT === "selected" &&
//         environment.REA_GHIDRA_AMBIENT === undefined &&
//         environment.PATH === "/selected-bin"
//           ? JAVA
//           : undefined,
//     }),
//   );
//   expect(inspection.status).toBe("available");
// });
//
// describe("Ghidra installation inspection", () => {
//   it("clears inherited JVM option injection before probing Java", () => {
//     expect(
//       ghidraJavaEnvironment(
//         "/opt/jdk-21",
//         {
//           PATH: "/usr/bin",
//           _JAVA_OPTIONS: "-Xmx99G",
//           JAVA_TOOL_OPTIONS: "-javaagent:/tmp/agent.jar",
//           JDK_JAVA_OPTIONS: "-XX:MaxRAMPercentage=99",
//           GHIDRA_JAVA_OPTIONS: "-Duser.home=/tmp/unapproved",
//         },
//         "linux",
//       ),
//     ).toMatchObject({
//       PATH: "/opt/jdk-21/bin:/usr/bin",
//       JAVA_HOME: "/opt/jdk-21",
//       _JAVA_OPTIONS: "",
//       JAVA_TOOL_OPTIONS: "",
//       JDK_JAVA_OPTIONS: "",
//       GHIDRA_JAVA_OPTIONS: "",
//     });
//   });
//
//   it("accepts the verified Linux x64 Ghidra release and JDK", () => {
//     expect(
//       inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: INSTALL,
//           platform: "linux",
//           architecture: "x64",
//         },
//         host(),
//       ),
//     ).toMatchObject({
//       status: "available",
//       providerVersion: SUPPORTED_GHIDRA_VERSION,
//       analyzeHeadlessPath: HEADLESS,
//       javaVersion: "21.0.11",
//     });
//   });
//
//   it.each([
//     ["12.1.2", "27", 27],
//     ["12.1.2-2.1", "27", 27],
//     ["12.1.0", "21.0.2", 21],
//     [SUPPORTED_GHIDRA_VERSION, "25.0.1", 25],
//   ])(
//     "accepts Ghidra %s with JDK %s on the verified release line",
//     (providerVersion, javaVersion, major) => {
//       const result = inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: INSTALL,
//           platform: "linux",
//           architecture: "x64",
//         },
//         host({
//           readText: () =>
//             `application.version=${providerVersion}\napplication.java.min=21\napplication.java.max=\n`,
//           probeJava: () => ({
//             ...JAVA,
//             version: javaVersion,
//             major,
//           }),
//         }),
//       );
//       expect(result.status).toBe("available");
//       expect(result).toMatchObject({ providerVersion, javaVersion });
//       expect(
//         result.checks.find(({ name }) => name === "version"),
//       ).toMatchObject({
//         status: "passed",
//         detail:
//           providerVersion === SUPPORTED_GHIDRA_VERSION
//             ? SUPPORTED_GHIDRA_VERSION
//             : expect.stringContaining("verified build"),
//       });
//     },
//   );
//
//   it.each([
//     ["darwin", "x64", "mac_x86_64"],
//     ["darwin", "arm64", "mac_arm_64"],
//     ["linux", "arm64", "linux_arm_64"],
//   ] as const)(
//     "accepts %s/%s with the matching distribution or locally built native tool",
//     (platform, architecture, nativeDirectory) => {
//       for (const location of ["os", "build/os"]) {
//         const decompiler = `${INSTALL}/Ghidra/Features/Decompiler/${location}/${nativeDirectory}/decompile`;
//         expect(
//           inspectGhidraInstallation(
//             { environment: {}, installDir: INSTALL, platform, architecture },
//             host({
//               executable: (path) => path === HEADLESS || path === decompiler,
//               probeJava: () => ({
//                 ...JAVA,
//                 osArch: architecture === "arm64" ? "aarch64" : "amd64",
//                 osName: platform === "darwin" ? "Mac OS X" : "Linux",
//               }),
//             }),
//           ),
//         ).toMatchObject({
//           status: "available",
//           platform,
//           architecture,
//           nativeDecompilerPath: decompiler,
//         });
//       }
//     },
//   );
//
//   it("accepts the exact Windows x64 batch launcher and JDK commitment", () => {
//     const windowsHost: GhidraInstallationHost = {
export const _l = 307;
