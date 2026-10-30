export const __stub = 1;
//       platform: "win32",
//       architecture: "x64",
//       readText: (path) =>
//         path === WINDOWS_PROPERTIES
//           ? `application.version=${SUPPORTED_GHIDRA_VERSION}\napplication.java.min=21\n`
//           : undefined,
//       executable: (path) =>
//         path === WINDOWS_HEADLESS || path === WINDOWS_DECOMPILER,
//       probeJava: (command, environment) => {
//         expect(command).toBe("C:\\Java\\jdk-21\\bin\\java.exe");
//         expect(environment.PATH).toMatch(/^C:\\Java\\jdk-21\\bin;/u);
//         return {
//           ...JAVA,
//           home: "C:\\Java\\jdk-21",
//           osName: "Windows 11",
//         };
//       },
//     };
//
//     expect(
//       inspectGhidraInstallation(
//         {
//           environment: {},
//           installDir: WINDOWS_INSTALL,
//           javaHome: "C:\\Java\\jdk-21",
//           platform: "win32",
//           architecture: "x64",
//         },
//         windowsHost,
//       ),
//     ).toMatchObject({
//       status: "available",
//       platform: "win32",
//       architecture: "x64",
//       analyzeHeadlessPath: WINDOWS_HEADLESS,
//       javaCommand: "C:\\Java\\jdk-21\\bin\\java.exe",
//       providerVersion: SUPPORTED_GHIDRA_VERSION,
//     });
//   });
// });
//
// describe("Ghidra installation rejection diagnostics", () => {
//   it.each([
//     {
//       name: "missing configuration",
//       options: { platform: "linux" as const, architecture: "x64" as const },
//       override: {},
//       failed: "configuration",
//       code: "not_configured",
//     },
//     {
//       name: "unsupported platform",
//       options: {
//         installDir: INSTALL,
//         platform: "aix" as const,
//         architecture: "x64" as const,
//       },
//       override: {},
//       failed: "platform",
//       code: "unsupported_host",
//     },
//     {
//       name: "unsupported architecture",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "arm" as const,
//       },
//       override: {},
//       failed: "architecture",
//       code: "unsupported_host",
//     },
//     {
//       name: "bad installation root",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       override: { readText: () => undefined },
//       failed: "installation",
//       code: "executable_missing",
//     },
//     {
//       name: "wrong Ghidra version",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       override: {
//         readText: () => "application.version=11.4\napplication.java.min=21\n",
//       },
//       failed: "version",
//       code: "unsupported_version",
//     },
//     {
//       name: "missing analyzeHeadless",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       override: { executable: () => false },
//       failed: "headless",
//       code: "executable_missing",
//     },
//     {
//       name: "only a foreign-architecture decompiler on Linux arm64",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "arm64" as const,
//       },
//       override: {},
//       failed: "native_decompiler",
//       code: "executable_missing",
//     },
//     {
//       name: "missing Java",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       override: { probeJava: () => undefined },
//       failed: "java",
//       code: "runtime_missing",
//     },
//     {
//       name: "wrong Java",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       override: { probeJava: () => ({ ...JAVA, major: 17, version: "17" }) },
//       failed: "java",
//       code: "unsupported_version",
//     },
//     {
//       name: "JRE instead of JDK",
//       options: {
//         installDir: INSTALL,
//         platform: "linux" as const,
//         architecture: "x64" as const,
//       },
//       override: { probeJava: () => ({ ...JAVA, runtime: "jre" as const }) },
//       failed: "java",
//       code: "unsupported_version",
//     },
//   ])("distinguishes $name", ({ options, override, failed, code }) => {
//     const result = inspectGhidraInstallation(
//       { ...options, environment: {} },
//       host(override),
//     );
//     expect(result.status).toBe("unavailable");
//     expect(
//       result.checks.find(({ status }) => status === "failed"),
//     ).toMatchObject({
//       name: failed,
//       code,
//     });
//   });
// });
//
// describe("Ghidra release line and JDK bounds", () => {
//   it("uses Java Properties last-key, delimiter, escape, and continuation rules", () => {
//     const properties = ghidraApplicationProperties(
//       [
//         "application.version=11.4",
//         "# comment ending with a slash " + "\\",
//         "application.\\u0076ersion : 12.\\",
//         "  1.\\u0034",
//         "! another comment " + "\\",
//         "application.java.\\u006din\t21",
//         "application.java.max=",
//       ].join("\n"),
//     );
//     expect(properties).toEqual({
//       providerVersion: "12.1.4",
//       javaMinimum: { status: "major", major: 21 },
//       javaMaximum: { status: "absent" },
//       parseError: null,
//     });
//     expect(
//       ghidraApplicationProperties("application.version=12.1.4").javaMinimum,
//     ).toEqual({
//       status: "absent",
//     });
//     expect(
//       ghidraApplicationProperties(
//         "application.version=12.1.4\napplication.java.min=\n",
//       ).javaMinimum,
//     ).toEqual({ status: "unresolved", raw: "" });
//     expect(
//       ghidraApplicationProperties("application.version=12.1.4\\")
//         .providerVersion,
//     ).toBe("12.1.4");
//     expect(
//       ghidraApplicationProperties("application.version=12.\\\n #.1")
//         .providerVersion,
//     ).toBe("12.#.1");
//     expect(
//       ghidraApplicationProperties(
//         "application.version=12.\\\n\napplication.version=12.1.4",
//       ).providerVersion,
//     ).toBe("12.1.4");
//   });
//
//   it("matches Ghidra integer Java bounds and zero maximum semantics", () => {
//     const properties = ghidraApplicationProperties(
//       "application.java.min=21.0\napplication.java.max=0\n",
//     );
//     expect(properties.javaMinimum).toEqual({
//       status: "unresolved",
//       raw: "21.0",
//     });
//     expect(properties.javaMaximum).toEqual({ status: "absent" });
//     expect(
//       ghidraApplicationProperties("application.java.max=+0").javaMaximum,
//     ).toEqual({
//       status: "absent",
//     });
//     expect(
//       ghidraApplicationProperties("application.java.max=+０").javaMaximum,
//     ).toEqual({ status: "absent" });
//     expect(
//       ghidraApplicationProperties("application.java.min=+21").javaMinimum,
//     ).toEqual({
//       status: "major",
//       major: 21,
//     });
//     expect(
//       ghidraApplicationProperties("application.java.min=٢١").javaMinimum,
//     ).toEqual({
//       status: "major",
//       major: 21,
//     });
//     expect(
//       ghidraApplicationProperties("application.java.min=２１").javaMinimum,
//     ).toEqual({
//       status: "major",
//       major: 21,
//     });
//     expect(
//       ghidraApplicationProperties("application.java.max=＋０").javaMaximum,
//     ).toEqual({
//       status: "unresolved",
//       raw: "＋０",
//     });
//     expect(
//       ghidraApplicationProperties("application.java.min=②").javaMinimum,
//     ).toEqual({
//       status: "unresolved",
//       raw: "②",
//     });
//     expect(
//       ghidraApplicationProperties("application.java.min=2147483648")
//         .javaMinimum,
//     ).toEqual({ status: "unresolved", raw: "2147483648" });
//   });
//
//   it("keeps an unavailable properties file unresolved for Java admission", () => {
//     expect(ghidraJavaRequirement(undefined).unresolved).toBe(
//       "application.properties is unavailable",
//     );
//   });
//
//   it("preserves property value trailing whitespace instead of normalizing it", () => {
//     const properties = ghidraApplicationProperties(
//       "application.version=12.1.4 \napplication.java.min=21 \n",
//     );
//     expect(properties.providerVersion).toBe("12.1.4 ");
//     expect(properties.javaMinimum).toEqual({
//       status: "unresolved",
//       raw: "21 ",
//     });
//     expect(properties.parseError).toBeNull();
//   });
// });
//
// describe("Ghidra malformed property admission", () => {
//   it("fails installation and doctor admission closed on malformed Unicode escapes", () => {
//     const result = inspectGhidraInstallation(
//       {
//         environment: {},
//         installDir: INSTALL,
//         platform: "linux",
//         architecture: "x64",
//       },
//       host({
//         readText: () =>
//           "application.version=12.1.4\nbroken=\\u12G4\napplication.java.min=17\n",
//       }),
//     );
//     expect(result.status).toBe("unavailable");
//     expect(result.providerVersion).toBeNull();
//     expect(result.checks).toEqual(
//       expect.arrayContaining([
//         expect.objectContaining({
//           name: "version",
//           status: "failed",
//           code: "version_unresolved",
//           detail: expect.stringContaining("Malformed Unicode escape"),
//         }),
//         expect.objectContaining({
export const _l = 307;
