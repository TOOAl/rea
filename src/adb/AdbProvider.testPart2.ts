export const __stub = 1;
//       message: expect.stringContaining("closed") as unknown,
//     },
//   ]);
// });
//
// it("refuses to reuse an existing package output directory", async () => {
//   const { binary, root } = await writeAdbStub(() =>
//     pullStub("'package:/data/app/z/base.apk'", `  printf 'x' > "$5"`),
//   );
//   const output = join(root, "existing");
//   await mkdir(join(output, "com.example"), { recursive: true });
//   const provider = providerOver(binary);
//   const result = await provider.execute({
//     operation: "pull_adb_package",
//     input: {
//       serial: "emulator-5554",
//       package: "com.example",
//       output_directory: output,
//     },
//   });
//   expect(result.ok).toBe(false);
//   if (result.ok) return;
//   expect(projectAnalysisError(result.error)).toMatchObject({
//     code: "unreadable_output",
//   });
//   expect(result.error.message).toContain("already exists");
// });
//
// it.each([
//   ["an empty filename", "package:/data/app/x/"],
//   [
//     "duplicate local filenames",
//     "package:/data/app/x/base.apk\npackage:/data/app/y/base.apk",
//   ],
// ])("refuses %s before creating output or pulling", async (_, pmOutput) => {
//   const { binary, root } = await writeAdbStub(
//     (root) => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "pm" ]; then printf '%b' '${pmOutput.replaceAll("'", "'\\''").replaceAll("\n", "\\n")}\\n'; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "pull" ]; then : > '${join(root, "pull-ran")}'; exit 0; fi
// exit 1`,
//   );
//   const output = join(root, "pulls");
//   const result = await providerOver(binary).execute({
//     operation: "pull_adb_package",
//     input: {
//       serial: "emulator-5554",
//       package: "com.example",
//       output_directory: output,
//     },
//   });
//   expect(result.ok).toBe(false);
//   if (result.ok) return;
//   expect(result.error.capturedOutput?.stdout).toContain(
//     pmOutput.split("\n")[0],
//   );
//   const projected = projectAnalysisError(result.error);
//   const duplicate = pmOutput.includes("\n");
//   expect(projected).toMatchObject({
//     code: "unreadable_output",
//     message: expect.stringContaining("pm path for com.example"),
//     remediation: { action: expect.stringContaining("details.diagnostics") },
//     details: {
//       reason: duplicate ? "duplicate_local_destination" : "unsafe_device_path",
//       diagnostics: {
//         package_name: "com.example",
//         ...(duplicate
//           ? { device_paths: ["/data/app/x/base.apk", "/data/app/y/base.apk"] }
//           : {
//               rejected_paths: [
//                 {
//                   device_path: "/data/app/x/",
//                   reason: "empty_file_name",
//                 },
//               ],
//             }),
//       },
//       captured_output: { stdout: expect.stringContaining("package:") },
//     },
//   });
//   await expect(readFile(join(root, "pull-ran"))).rejects.toThrow();
//   await expect(lstat(output)).rejects.toMatchObject({ code: "ENOENT" });
// });
//
// it.each([
//   ["case-only names", "base.apk", "BASE.APK"],
//   ["normalization-equivalent names", "caf\u00e9.apk", "cafe\u0301.apk"],
// ])(
//   "checks %s against the actual destination filesystem before pulling",
//   async (_, firstName, secondName) => {
//     const { binary, root } = await writeAdbStub((root) =>
//       pullStub(
//         `'package:/data/app/x/${firstName}' 'package:/data/app/y/${secondName}'`,
//         `printf 'pulled\\n' >> '${join(root, "pull.log")}'
//   printf 'apk' > "$5"`,
//       ),
//     );
//     const aliases = await namesAliasOnVolume(root, firstName, secondName);
//     const result = await providerOver(binary).execute({
//       operation: "pull_adb_package",
//       input: {
//         serial: "emulator-5554",
//         package: "com.example",
//         output_directory: root,
//       },
//     });
//     const pullLog = join(root, "pull.log");
//     const packageDirectory = join(root, "com.example");
//     if (aliases) {
//       expect(result.ok).toBe(false);
//       if (result.ok) return;
//       expect(projectAnalysisError(result.error)).toMatchObject({
//         message: expect.stringContaining("unique local destination"),
//         details: {
//           reason: "local_destination_unavailable",
//           diagnostics: {
//             device_path: `/data/app/y/${secondName}`,
//           },
//         },
//       });
//       await expect(readFile(pullLog)).rejects.toThrow();
//       await expect(lstat(packageDirectory)).rejects.toThrow();
//       return;
//     }
//     expect(result.ok).toBe(true);
//     if (!result.ok) throw new Error(result.error.message);
//     expect(
//       (
//         result.value.result as { artifacts: { file_name: string }[] }
//       ).artifacts.map((artifact) => artifact.file_name),
//     ).toEqual([firstName, secondName]);
//     expect((await readFile(pullLog, "utf8")).trim().split("\n")).toHaveLength(
//       2,
//     );
//   },
// );
//
// it("reports an uninstalled package from empty pm path output", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then exit 0; fi`,
//   );
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "pull_adb_package",
//     input: {
//       serial: "emulator-5554",
//       package: "com.absent",
//       output_directory: "/tmp/rea-adb-absent",
//     },
//   });
//   expect(projected).toMatchObject({ code: "unsupported_target" });
//   expect(projected.message).toContain("no APK paths");
// });
//
// it.each([
//   ["not found", "error: device 'emulator-9' not found", "not found"],
//   ["offline", "error: device offline", "offline"],
//   ["unauthorized", "error: device unauthorized", "unauthorized"],
// ] as const)(
//   "reports the %s device state as a target refusal",
//   async (_, stderr, excerpt) => {
//     const { binary } = await writeAdbStub(
//       () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ]; then printf '%s\\n' "${stderr.replace(/'/gu, "'\\''")}" >&2; exit 1; fi`,
//     );
//     const projected = await refusedBy(providerOver(binary), {
//       operation: "inspect_adb_device",
//       input: { serial: "emulator-5554" },
//     });
//     expect(projected).toMatchObject({ code: "unsupported_target" });
//     expect(projected.message).toContain(excerpt);
//   },
// );
//
// it("reports a missing selected binary as a capability gap with recovery", async () => {
//   const provider = new AdbProvider({
//     environment: { REA_ADB_PATH: "/nonexistent/adb" },
//   });
//   const availability = await provider.inspectAvailability();
//   expect(availability).toMatchObject({ status: "unavailable" });
//   if (availability.status !== "unavailable") return;
//   expect(availability.diagnostics.remediation).toContain("REA_ADB_PATH");
//   const result = await provider.execute({
//     operation: "list_adb_devices",
//     input: {},
//   });
//   expect(result.ok).toBe(false);
//   if (result.ok) return;
//   const projected = projectAnalysisError(result.error);
//   expect(projected).toMatchObject({ code: "capability_unavailable" });
//   expect(projected.message).toContain("REA_ADB_PATH");
//   expect(projected.remediation).toMatchObject({
//     action: expect.stringContaining("REA_ADB_PATH") as unknown,
//   });
//   expect(projected.details).toMatchObject({
//     provider_id: "adb",
//     reason: expect.stringContaining("not found") as unknown,
//   });
// });
//
// it("reports relative adb configuration as an actionable refusal", async () => {
//   const provider = new AdbProvider({
//     environment: { REA_ADB_PATH: "relative/adb" },
//   });
//   const availability = await provider.inspectAvailability();
//   expect(availability).toMatchObject({
//     status: "unavailable",
//     reason: expect.stringContaining("REA_ADB_PATH") as unknown,
//   });
//   const projected = await refusedBy(provider, {
//     operation: "list_adb_devices",
//     input: {},
//   });
//   expect(projected).toMatchObject({
//     code: "capability_unavailable",
//     message: expect.stringContaining("REA_ADB_PATH") as unknown,
//     remediation: {
//       action: expect.stringContaining("REA_ADB_PATH") as unknown,
//     },
//   });
// });
//
// it("cancels before spawning anything", async () => {
//   const { binary, root } = await writeAdbStub(
//     (root) => `: > ${join(root, "spawned")}
// if [ "$1" = "version" ]; then ${VERSION_BLOCK}; fi`,
//   );
//   const controller = new AbortController();
//   controller.abort();
//   const cancelled = await providerOver(binary).execute(
//     { operation: "list_adb_devices", input: {} },
//     { signal: controller.signal },
//   );
//   expect(cancelled.ok).toBe(false);
//   if (cancelled.ok) return;
//   expect(projectAnalysisError(cancelled.error)).toMatchObject({
//     code: "cancelled",
//   });
//   expect(
//     await readFile(join(root, "spawned")).then(
//       () => true,
//       () => false,
//     ),
//   ).toBe(false);
// });
//
// it("reads a bounded logcat dump with the caller count and buffer", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       logcat:
//         "08-10 13:00:00.000 I/Tag( 123): first\n08-10 13:00:01.000 I/Tag( 123): second\n",
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "read_adb_logcat",
//     input: { serial: "emulator-5554", count: 500, buffer: "main" },
//   });
//   expect(result.lines).toEqual([
//     "08-10 13:00:00.000 I/Tag( 123): first",
//     "08-10 13:00:01.000 I/Tag( 123): second",
//   ]);
// });
//
// it("reports UTF-8 byte counts in total_bytes for non-ASCII logcat output", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       logcat:
//         "08-10 13:00:00.000 I/Tag( 1): 中文\n08-10 13:00:00.000 I/Tag( 1): 😀\n",
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "read_adb_logcat",
//     input: { serial: "emulator-5554", count: 500, buffer: "main" },
//   });
//   expect(result.lines).toEqual([
//     "08-10 13:00:00.000 I/Tag( 1): 中文",
//     "08-10 13:00:00.000 I/Tag( 1): 😀",
//   ]);
//   // 30-byte prefix + 6-byte CJK + LF = 37; 30-byte prefix + 4-byte emoji + LF = 35.
//   expect(result.total_bytes).toBe(72);
// });
//
// it("counts raw captured bytes in total_bytes for malformed UTF-8 logcat output", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "shell" ]; then
//   printf '%b' '08-10 13:00:00.000 I/Tag( 1): A\\377B\\n'
//   exit 0
// fi
// printf 'unexpected arguments: %s\\n' "$@"
// exit 1`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "read_adb_logcat",
//     input: { serial: "emulator-5554", count: 500, buffer: "main" },
//   });
//   // 30-byte prefix + "A" + one raw 0xff byte + "B" + LF = 34 captured bytes.
//   // Re-encoding the decoded U+FFFD replacement would report 36.
//   expect(result.total_bytes).toBe(34);
// });
//
// it("projects package details from dumpsys package output", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "dumpsys:package": `Packages:
//   Package [com.example] (abcdef):
//     userId=10234
//     versionName=1.2.3
//     versionCode=45 minSdk=24 targetSdk=34
//     firstInstallTime=2026-01-02 03:04:05
//     lastUpdateTime=2026-02-03 04:05:06
//     installerPackageName=com.android.vending
//     pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ]
//     requested permissions:
//       android.permission.INTERNET
//       android.permission.CAMERA
// `,
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_package",
//     input: { serial: "emulator-5554", package: "com.example" },
//   });
//   expect(result).toMatchObject({
//     version_name: "1.2.3",
//     version_code: "45",
//     first_install_time: "2026-01-02 03:04:05",
//     last_update_time: "2026-02-03 04:05:06",
//     installer_package_name: "com.android.vending",
//     user_id: 10234,
//     requested_permissions_count: 2,
//     coverage: "complete",
//   });
// });
//
// // PackageInfo.getLongVersionCode() combines versionCodeMajor and versionCode
// // into a signed 64-bit long, which JSON numbers cannot hold exactly.
// it.each(["9007199254740993", "-4294967296"])(
//   "keeps the long version code %s exactly as dumpsys prints it",
//   async (versionCode) => {
//     const { binary } = await writeAdbStub(
//       shellStub({
//         "dumpsys:package": `Packages:
//   Package [com.example] (abcdef):
//     versionCode=${versionCode} minSdk=24 targetSdk=34
// `,
//       }),
//     );
//     const result = await evidenceResult(providerOver(binary), {
//       operation: "inspect_adb_package",
//       input: { serial: "emulator-5554", package: "com.example" },
//     });
//     expect(result).toMatchObject({
//       version_code: versionCode,
//       coverage: "complete",
//     });
//   },
// );
//
// // Android 10 and 11 append ": restricted=true" to hard- and soft-restricted
// // entries of the requested-permissions list (Settings.dumpPackageLPr).
// it("counts requested permissions that the device marks as restricted", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "dumpsys:package": `Packages:
//   Package [com.example] (abcdef):
//     userId=10234
//     versionName=1.2.3
//     requested permissions:
//       android.permission.INTERNET
//       android.permission.WRITE_EXTERNAL_STORAGE: restricted=true
//       android.permission.CAMERA
//     install permissions:
//       android.permission.INTERNET: granted=true
// `,
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_package",
//     input: { serial: "emulator-5554", package: "com.example" },
//   });
//   expect(result).toMatchObject({
//     requested_permissions_count: 3,
//     coverage: "complete",
//   });
// });
//
// it("reports an uninstalled package from dumpsys refusal output", async () => {
export const _l = 387;
