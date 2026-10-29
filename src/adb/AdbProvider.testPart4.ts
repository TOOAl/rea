export const __stub = 1;
//     expect.stringContaining("dumpsys window displays"),
//   );
// });
//
// it("describes missing window focus as unknown after both sections omit declarations", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "dumpsys:window:windows": "no focus\\n",
//       "dumpsys:window:displays": "no focus\\n",
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_window",
//     input: { serial: "emulator-5554" },
//   });
//   expect(result).toMatchObject({ focused_window: null, focused_app: null });
//   const execution = await providerOver(binary).execute({
//     operation: "inspect_adb_window",
//     input: { serial: "emulator-5554" },
//   });
//   expect(execution.ok).toBe(true);
//   if (!execution.ok) throw execution.error;
//   expect(execution.value.limitations).toContainEqual(
//     expect.stringContaining("focus is unknown"),
//   );
// });
//
// it("reads one settings value and reports device-side nulls", async () => {
//   const { binary } = await writeAdbStub(shellStub({ "settings:get": "1\n" }));
//   const enabled = await evidenceResult(providerOver(binary), {
//     operation: "read_adb_setting",
//     input: {
//       serial: "emulator-5554",
//       namespace: "secure",
//       key: "adb_enabled",
//     },
//   });
//   expect(enabled.value).toBe("1");
//   const { binary: nullBinary } = await writeAdbStub(
//     shellStub({ "settings:get": "null\n" }),
//   );
//   const absent = await evidenceResult(providerOver(nullBinary), {
//     operation: "read_adb_setting",
//     input: {
//       serial: "emulator-5554",
//       namespace: "global",
//       key: "absent_key",
//     },
//   });
//   expect(absent.value).toBeNull();
//   expect(absent.device_reported_null).toBe(true);
// });
//
// it("resolves packages by case-insensitive substring", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "pm:list":
//         "package:/data/app/x/base.apk=com.whatsapp\npackage:/data/app/y/base.apk=com.whatsapp.w4b\npackage:/data/app/z/base.apk=com.example\n",
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "resolve_adb_packages",
//     input: { serial: "emulator-5554", query: "WhatsApp" },
//   });
//   expect(result.matches).toEqual([
//     {
//       package_name: "com.whatsapp",
//       base_apk_device_path: "/data/app/x/base.apk",
//     },
//     {
//       package_name: "com.whatsapp.w4b",
//       base_apk_device_path: "/data/app/y/base.apk",
//     },
//   ]);
//   expect(result.exact_match).toBe(false);
//   expect(result.coverage).toBe("complete");
// });
//
// it("installs a local APK and preserves the device's failure verdict", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "install" ]; then printf 'Success\\n'; exit 0; fi
// exit 1`,
//   );
//   const apk = join(root, "app.apk");
//   await writeFile(apk, "apk");
//   const digest = createHash("sha256").update("apk").digest("hex");
//   const execution = await providerOver(binary).execute({
//     operation: "install_adb_package",
//     input: { serial: "emulator-5554", apk_path: apk, replace: false },
//   });
//   expect(execution.ok).toBe(true);
//   if (!execution.ok) throw execution.error;
//   expect(execution.value.result).toMatchObject({
//     bytes: 3,
//     sha256: digest,
//     replace_requested: false,
//     replaced: null,
//   });
//   expect(execution.value.limitations).toContain(
//     "Whether an existing package was replaced is unknown; replace_requested records only the adb install mode",
//   );
//
//   const { binary: failing } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "install" ]; then printf 'Failure [INSTALL_FAILED_ALREADY_EXISTS]\\n'; exit 0; fi
// exit 1`,
//   );
//   const projected = await refusedBy(providerOver(failing), {
//     operation: "install_adb_package",
//     input: {
//       serial: "emulator-5554",
//       apk_path: apk,
//       replace: false,
//     },
//   });
//   expect(projected).toMatchObject({ code: "unsupported_target" });
//   expect(projected.message).toContain("INSTALL_FAILED_ALREADY_EXISTS");
// });
//
// it("uninstalls a package and reports the device's refusal for absent ones", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "uninstall" ]; then printf 'Success\\n'; exit 0; fi
// exit 1`,
//   );
//   const removed = await evidenceResult(providerOver(binary), {
//     operation: "uninstall_adb_package",
//     input: { serial: "emulator-5554", package: "com.example" },
//   });
//   expect(removed.package_name).toBe("com.example");
//
//   const { binary: refusing } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "uninstall" ]; then printf 'Failure [not installed for 0]\\n'; exit 0; fi
// exit 1`,
//   );
//   const projected = await refusedBy(providerOver(refusing), {
//     operation: "uninstall_adb_package",
//     input: { serial: "emulator-5554", package: "com.absent" },
//   });
//   expect(projected).toMatchObject({ code: "unsupported_target" });
//   expect(projected.message).toContain("not installed for 0");
// });
//
// // adb exits 1 on a refused package change: `adb install` after printing the
// // status line to stderr, `cmd package uninstall` after printing it to stdout.
// it("preserves the device's install refusal when adb exits nonzero", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "install" ]; then
//   printf 'Performing Streamed Install\\n'
//   printf 'adb: failed to install app.apk: Failure [INSTALL_FAILED_ALREADY_EXISTS: Attempt to re-install com.example without first uninstalling.]\\n' >&2
//   exit 1
// fi
// exit 1`,
//   );
//   const apk = join(root, "app.apk");
//   await writeFile(apk, "apk");
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "install_adb_package",
//     input: { serial: "emulator-5554", apk_path: apk, replace: false },
//   });
//   expect(projected).toMatchObject({
//     code: "unsupported_target",
//     details: {
//       reason:
//         "INSTALL_FAILED_ALREADY_EXISTS: Attempt to re-install com.example without first uninstalling.",
//     },
//   });
//   expect(projected.message).toContain(
//     "INSTALL_FAILED_ALREADY_EXISTS: Attempt to re-install com.example without first uninstalling.",
//   );
// });
//
// it("preserves the device's uninstall refusal when adb exits nonzero", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "uninstall" ]; then printf 'Failure [not installed for 0]\\n'; exit 1; fi
// exit 1`,
//   );
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "uninstall_adb_package",
//     input: { serial: "emulator-5554", package: "com.absent" },
//   });
//   expect(projected).toMatchObject({
//     code: "unsupported_target",
//     details: { reason: "not installed for 0" },
//   });
//   expect(projected.message).toContain("not installed for 0");
// });
//
// it("keeps a nonzero install without a device verdict as an unreadable result", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "install" ]; then printf 'adb: failed to install app.apk: closed\\n' >&2; exit 1; fi
// exit 1`,
//   );
//   const apk = join(root, "app.apk");
//   await writeFile(apk, "apk");
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "install_adb_package",
//     input: { serial: "emulator-5554", apk_path: apk, replace: false },
//   });
//   expect(projected).toMatchObject({ code: "unreadable_output" });
// });
//
// it("starts an app through resolved launcher component and force-stops it", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "cmd:package":
//         "priority=0 preferredOrder=0 match=0x00108000 specificIndex=-1 isDefault=true\ncom.example/.Main",
//       "am:start":
//         "Starting: Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=com.example/.Main }\n",
//       "am:force-stop": "",
//     }),
//   );
//   const provider = providerOver(binary);
//   const started = await evidenceResult(provider, {
//     operation: "start_adb_app",
//     input: { serial: "emulator-5554", package: "com.example" },
//   });
//   expect(started).toMatchObject({
//     package_name: "com.example",
//     component: "com.example/.Main",
//     started_activity: expect.stringContaining(
//       "cmp=com.example/.Main",
//     ) as unknown,
//   });
//   const stopped = await evidenceResult(provider, {
//     operation: "stop_adb_app",
//     input: { serial: "emulator-5554", package: "com.example" },
//   });
//   expect(stopped.package_name).toBe("com.example");
// });
//
// it("reports an app without a launcher activity as unsupported", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({ "cmd:package": "No activity found\n" }),
//   );
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "start_adb_app",
//     input: { serial: "emulator-5554", package: "com.library.only" },
//   });
//   expect(projected).toMatchObject({ code: "unsupported_target" });
//   expect(projected.message).toContain("No launcher activity");
// });
//
// it("starts an intent with typed extras as a fixed argv vector", async () => {
//   const { binary, root } = await writeAdbStub(
//     (root) => `printf '%s\\n' "$@" >> ${join(root, "argv.log")}
// ${shellStub({ "am:start": "Starting: Intent { act=android.intent.action.VIEW dat=https://example.com/ }\n" })(root)}`,
//   );
//   const started = await evidenceResult(providerOver(binary), {
//     operation: "start_adb_activity",
//     input: {
//       serial: "emulator-5554",
//       action: "android.intent.action.VIEW",
//       data_uri: "https://example.com/",
//       extras: [
//         { key: "level", type: "int", value: "3" },
//         { key: "label", type: "string", value: "probe" },
//       ],
//     },
//   });
//   expect(started.action).toBe("android.intent.action.VIEW");
//   const logged = (await readFile(join(root, "argv.log"), "utf8"))
//     .trim()
//     .split("\n");
//   expect(logged).toEqual([
//     "version",
//     "-s",
//     "emulator-5554",
//     "shell",
//     "am",
//     "start",
//     "-W",
//     "-a",
//     "android.intent.action.VIEW",
//     "-d",
//     "https://example.com/",
//     "--ei",
//     "level",
//     "3",
//     "--es",
//     "label",
//     "probe",
//   ]);
// });
//
// it("rejects mistyped intent extras before touching the device", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// : > should-not-exist`,
//   );
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "start_adb_activity",
//     input: {
//       serial: "emulator-5554",
//       action: "com.example.ACTION",
//       extras: [{ key: "flag", type: "boolean", value: "yes" }],
//     },
//   });
//   expect(projected).toMatchObject({ code: "invalid_request" });
// });
//
// it("collects a device bugreport archive with its digest", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "bugreport" ]; then
//   printf 'bugreport-bytes' > "$4/bugreport test.zip"
//   printf 'Bug report copied to %s/bugreport test.zip\\n' "$4"
//   exit 0
// fi
// exit 1`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "collect_adb_bugreport",
//     input: { serial: "emulator-5554", output_directory: root },
//   });
//   const digest = createHash("sha256").update("bugreport-bytes").digest("hex");
//   expect(result).toMatchObject({
//     local_path: join(root, "bugreport test.zip"),
//     bytes: 15,
//     sha256: digest,
//     adb_reported_path: expect.stringContaining(".rea-bugreport-"),
//   });
// });
//
// it("quotes caller text before adb joins the remote shell command", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// shift 3
// # Model adb's remote command joining, then execute the resulting shell string.
// sh -c "$*"
// `,
//   );
//   const value = join(root, `device 'quoted'; touch ${join(root, "injected")}`);
//   await mkdir(value, { recursive: true });
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_directory",
//     input: { serial: "device", device_path: value },
//   });
//   expect(result).toMatchObject({
//     device_path: value,
//     entries: [],
//     coverage: "complete",
//   });
//   await expect(readFile(join(root, "injected"))).rejects.toThrow();
// });
//
// it("preserves a screen output created while capture is running", async () => {
//   const { binary, root } = await writeAdbStub(
//     (root) => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// printf 'existing evidence' > "${join(root, "captures", "screen.png")}"
// printf '\\211PNG\\r\\n\\032\\n\\0\\0\\0\\rIHDR\\0\\0\\0\\004\\0\\0\\0\\003'
// `,
//   );
//   const result = await providerOver(binary).execute({
//     operation: "capture_adb_screen",
//     input: { serial: "device", output_directory: join(root, "captures") },
//   });
//   expect(result.ok).toBe(false);
//   expect(await readFile(join(root, "captures", "screen.png"), "utf8")).toBe(
//     "existing evidence",
//   );
// });
//
// it("reports cancellation arriving during the version probe", async () => {
//   const { binary } = await writeAdbStub(() => "exec sleep 30");
//   const controller = new AbortController();
//   const pending = providerOver(binary).execute(
//     { operation: "inspect_adb_client", input: {} },
//     { signal: controller.signal },
//   );
//   const timer = setTimeout(() => controller.abort(), 50);
//   try {
//     const result = await pending;
//     expect(result.ok).toBe(false);
//     if (!result.ok)
//       expect(projectAnalysisError(result.error).code).toBe("cancelled");
//   } finally {
//     clearTimeout(timer);
//   }
// });
export const _l = 385;
