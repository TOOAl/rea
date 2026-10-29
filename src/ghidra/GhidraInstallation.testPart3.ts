export const __stub = 1;
//           name: "java",
//           status: "failed",
//           code: "version_unresolved",
//           remediation: expect.stringContaining(
//             "application.properties parse failed",
//           ),
//         }),
//       ]),
//     );
//     expect(projectGhidraDoctorInspection(result)).toMatchObject({
//       available: false,
//       registrationEnvironment: {},
//       checks: expect.arrayContaining([
//         expect.objectContaining({ name: "version", ok: false }),
//         expect.objectContaining({ name: "java", ok: false }),
//       ]),
//     });
//   });
// });
//
// describe("Ghidra installation version admission", () => {
//   it.each([
//     {
//       name: "JDK above the installation maximum",
//       readText: () =>
//         "application.version=12.1.4\napplication.java.min=21\napplication.java.max=25\n",
//       probeJava: () => ({ ...JAVA, major: 27, version: "27" }),
//       failed: "java",
//       code: "unsupported_version",
//     },
//     {
//       name: "unreadable Java minimum",
//       readText: () =>
//         "application.version=12.1.4\napplication.java.min=latest\n",
//       probeJava: () => JAVA,
//       failed: "java",
//       code: "version_unresolved",
//     },
//     {
//       name: "missing Java minimum",
//       readText: () => "application.version=12.1.4\n",
//       probeJava: () => JAVA,
//       failed: "java",
//       code: "version_unresolved",
//     },
//     {
//       name: "unparseable Ghidra version",
//       readText: () => "application.version=latest\napplication.java.min=21\n",
//       probeJava: () => JAVA,
//       failed: "version",
//       code: "version_unresolved",
//     },
//     {
//       name: "different Ghidra line",
//       readText: () => "application.version=12.2.0\napplication.java.min=21\n",
//       probeJava: () => JAVA,
//       failed: "version",
//       code: "unsupported_version",
//     },
//   ])("distinguishes $name", ({ readText, probeJava, failed, code }) => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux",
//         architecture: "x64",
//       },
//       host({ readText, probeJava }),
//     );
//     expect(result.status).toBe("unavailable");
//     expect(
//       result.checks.find(({ status }) => status === "failed"),
//     ).toMatchObject({ name: failed, code });
//   });
//
//   it("names the accepted Ghidra line and JDK range in failure remediation", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         javaHome: "/usr/lib/jvm/java-17-openjdk",
//         platform: "linux",
//         architecture: "x64",
//       },
//       host({
//         readText: () =>
//           "application.version=12.0.4\napplication.java.min=21\napplication.java.max=\n",
//         probeJava: () => ({ ...JAVA, major: 17, version: "17.0.20.1" }),
//       }),
//     );
//     expect(result.status).toBe("unavailable");
//     if (result.status !== "unavailable") return;
//     expect(result.rejection.reason).toContain("12.1.x");
//     expect(result.rejection.reason).toContain(SUPPORTED_GHIDRA_VERSION);
//     expect(result.checks.find(({ name }) => name === "java")).toMatchObject({
//       status: "failed",
//       remediation: expect.stringContaining("JDK 21 or newer"),
//     });
//   });
//
//   it("accepts a lower Java minimum declared by the installation", () => {
//     expect(
//       inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: INSTALL,
//           platform: "linux",
//           architecture: "x64",
//         },
//         host({
//           readText: () =>
//             `application.version=${SUPPORTED_GHIDRA_VERSION}\napplication.java.min=17\n`,
//           probeJava: () => ({ ...JAVA, major: 17, version: "17.0.20.1" }),
//         }),
//       ),
//     ).toMatchObject({ status: "available", javaVersion: "17.0.20.1" });
//   });
// });
//
// describe("Ghidra configuration paths", () => {
//   it.each([
//     [{ installDir: "./ghidra" }, "GHIDRA_INSTALL_DIR must be absolute"],
//     [{ installDir: INSTALL, javaHome: "./jdk" }, "JAVA_HOME must be absolute"],
//     [
//       { installDir: "ghidra", javaHome: "jdk" },
//       "GHIDRA_INSTALL_DIR and JAVA_HOME must be absolute",
//     ],
//   ])(
//     "rejects relative paths that REA's configuration parser rejects (%o)",
//     (paths, detail) => {
//       const result = inspectGhidraInstallation(
//         { environment: {}, ...paths, platform: "linux", architecture: "x64" },
//         host(),
//       );
//       expect(result).toMatchObject({
//         status: "unavailable",
//         rejection: {
//           code: "not_configured",
//           reason: expect.stringContaining("reject relative paths"),
//         },
//       });
//       expect(result.checks).toContainEqual(
//         expect.objectContaining({ name: "configuration", detail }),
//       );
//       // Setup registers only an available inspection's environment.
//       expect(projectGhidraDoctorInspection(result)).toMatchObject({
//         available: false,
//         registrationEnvironment: {},
//       });
//     },
//   );
//
//   it.each([
//     ["linux", "./jdk"],
//     ["linux", ""],
//     ["win32", "jdk"],
//   ] as const)(
//     "does not run Java from a relative JAVA_HOME (%s %o)",
//     (platform, javaHome) => {
//       const probed: string[] = [];
//       const result = inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: platform === "win32" ? WINDOWS_INSTALL : INSTALL,
//           javaHome,
//           platform,
//           architecture: "x64",
//         },
//         host({
//           probeJava: (command) => {
//             probed.push(command);
//             return JAVA;
//           },
//         }),
//       );
//       expect(probed).toEqual([]);
//       expect(result).toMatchObject({
//         status: "unavailable",
//         rejection: { code: "not_configured" },
//       });
//     },
//   );
//
//   it("judges absolute paths by the inspected platform", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: "C:\\ghidra",
//         platform: "win32",
//         architecture: "x64",
//       },
//       host(),
//     );
//     expect(result.checks).toContainEqual(
//       expect.objectContaining({ name: "configuration", status: "passed" }),
//     );
//   });
// });
//
// describe("Ghidra FAT native decompiler admission", () => {
//   it.each([
//     {
//       name: "foreign-only FAT",
//       bytes: fat([0x01000007]),
//       status: "unavailable",
//       detail: "requires mach-o arm64",
//     },
//     {
//       name: "matching universal FAT",
//       bytes: fat([0x01000007, 0x0100000c]),
//       status: "available",
//       detail: "matches darwin/arm64",
//     },
//     {
//       name: "truncated FAT table",
//       bytes: fat([0x01000007], 2),
//       status: "available",
//       detail: "could not be established",
//     },
//   ])("distinguishes $name", ({ bytes, status, detail }) => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({ ...JAVA, osArch: "aarch64", osName: "Mac OS X" }),
//         executableHeader: () => headerProbe(bytes),
//       }),
//     );
//     expect(result.status).toBe(status);
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler")?.detail,
//     ).toContain(detail);
//   });
//
//   it("keeps a truncated host slice unknown despite a readable foreign slice", () => {
//     const bytes = fat([0x01000007, 0x0100000c]);
//     bytes.writeUInt32BE(bytes.length + 1, 8 + 20 + 12);
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin",
//         architecture: "arm64",
//       },
//       host({
//         probeJava: () => ({ ...JAVA, osArch: "aarch64", osName: "Mac OS X" }),
//         executableHeader: () => headerProbe(bytes),
//       }),
//     );
//     expect(result.status).toBe("available");
//     expect(
//       result.checks.find(({ name }) => name === "native_decompiler")?.detail,
//     ).toContain("could not be established");
//   });
// });
//
// describe("Ghidra native decompiler admission", () => {
//   it.each([
//     {
//       name: "a MIPS decompiler at the Linux x64 path",
//       options: {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       executableHeader: (path: string) =>
//         path === LINUX_DECOMPILER ? headerProbe(elf(1, 1, 8)) : undefined,
//     },
//     {
//       name: "a Linux x86-64 decompiler at the macOS arm64 path",
//       options: {
//         environment: {},
//         installDir: INSTALL,
//         platform: "darwin" as const,
//         architecture: "arm64" as const,
//       },
//       executableHeader: (path: string) =>
//         path === MAC_DECOMPILER ? headerProbe(elf(2, 1, 62)) : undefined,
//     },
//     {
//       name: "a macOS arm64 decompiler at the Linux x64 path",
//       options: {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       executableHeader: (path: string) =>
//         path === LINUX_DECOMPILER
//           ? headerProbe(thinMach(0xcffaedfe, 0x0100000c))
//           : undefined,
//     },
//   ])("distinguishes $name", ({ options, executableHeader }) => {
//     const result = inspectGhidraInstallation(
//       options,
//       host({
//         probeJava: () => ({
//           ...JAVA,
//           osArch: options.architecture === "arm64" ? "aarch64" : "amd64",
//           osName: options.platform === "darwin" ? "Mac OS X" : "Linux",
//         }),
//         executableHeader,
export const _l = 307;
