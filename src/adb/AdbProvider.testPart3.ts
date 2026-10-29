export const __stub = 1;
//   const { binary } = await writeAdbStub(
//     shellStub({ "dumpsys:package": "Unable to find package: com.absent\n" }),
//   );
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "inspect_adb_package",
//     input: { serial: "emulator-5554", package: "com.absent" },
//   });
//   expect(projected).toMatchObject({ code: "unsupported_target" });
// });
//
// it("pulls one device file with a digest", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "pull" ]; then printf 'file-bytes' > "$5"; exit 0; fi
// exit 1`,
//   );
//   const output = join(root, "pulls");
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "pull_adb_file",
//     input: {
//       serial: "emulator-5554",
//       device_path: "/data/local/tmp/My Notes:r*sumé.txt",
//       output_directory: output,
//     },
//   });
//   const digest = createHash("sha256").update("file-bytes").digest("hex");
//   expect(result).toMatchObject({
//     device_path: "/data/local/tmp/My Notes:r*sumé.txt",
//     local_path: join(output, "My Notes:r*sumé.txt"),
//     bytes: 10,
//     sha256: digest,
//   });
// });
//
// it.each([
//   ["/data/local/tmp/..", "dot_segment"],
//   ["/data/local/tmp/", "empty_file_name"],
// ] as const)(
//   "refuses the unsafe device path %s before pulling",
//   async (devicePath, reason) => {
//     const { binary, root } = await writeAdbStub(
//       (root) => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// : > "${join(root, "pull-ran")}"
// exit 0`,
//     );
//     const output = join(root, "pulls");
//     const result = await providerOver(binary).execute({
//       operation: "pull_adb_file",
//       input: {
//         serial: "emulator-5554",
//         device_path: devicePath,
//         output_directory: output,
//       },
//     });
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     const projected = projectAnalysisError(result.error);
//     expect(projected).toMatchObject({ code: "invalid_request" });
//     expect(projected.details).toMatchObject({
//       issues: [
//         {
//           path: ["device_path"],
//           reason: "invalid_value",
//           message: expect.stringContaining(
//             `${JSON.stringify(devicePath)} does not name`,
//           ),
//         },
//       ],
//     });
//     expect(
//       (projected.details as { issues: { message: string }[] }).issues[0]!
//         .message,
//     ).toContain(reason);
//     // No host directory and no adb invocation are effects of a refused pull.
//     await expect(readFile(join(root, "pull-ran"))).rejects.toThrow();
//     await expect(lstat(output)).rejects.toMatchObject({ code: "ENOENT" });
//   },
// );
//
// it("pushes a file and verifies the device-side digest", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "test" ]; then exit 1; fi
// if [ "$1" = "-s" ] && [ "$3" = "push" ]; then exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "sha256sum" ]; then printf '%s  %s\\n' "8748b5d17d1ebcec7d46674fa6a8b92c0f95598a552f27c1c8a132eb58c04043" "$5"; exit 0; fi
// exit 1`,
//   );
//   const localFile = join(root, "payload.bin");
//   await writeFile(localFile, "push-payload");
//   const digest = createHash("sha256").update("push-payload").digest("hex");
//   const pushed = await evidenceResult(providerOver(binary), {
//     operation: "push_adb_file",
//     input: {
//       serial: "emulator-5554",
//       local_path: localFile,
//       device_path: "/data/local/tmp/payload.bin",
//       overwrite: false,
//     },
//   });
//   expect(pushed).toMatchObject({
//     bytes: 12,
//     sha256: digest,
//     device_sha256: digest,
//     overwritten: false,
//     device_digest_source: "device_sha256sum",
//   });
// });
//
// it("reports a digest mismatch after push as a changed artifact", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "test" ]; then exit 1; fi
// if [ "$1" = "-s" ] && [ "$3" = "push" ]; then exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "sha256sum" ]; then printf '%s  %s\\n' "$(printf 'a%.0s' 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64)" "$5"; exit 0; fi
// exit 1`,
//   );
//   const localFile = join(root, "payload.bin");
//   await writeFile(localFile, "push-payload");
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "push_adb_file",
//     input: {
//       serial: "emulator-5554",
//       local_path: localFile,
//       device_path: "/data/local/tmp/payload.bin",
//       overwrite: false,
//     },
//   });
//   expect(projected).toMatchObject({ code: "artifact_changed" });
// });
//
// it("refuses a push onto an existing device path without overwrite", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "test" ]; then exit 0; fi
// exit 1`,
//   );
//   const localFile = join(root, "payload.bin");
//   await writeFile(localFile, "x");
//   const result = await providerOver(binary).execute({
//     operation: "push_adb_file",
//     input: {
//       serial: "emulator-5554",
//       local_path: localFile,
//       device_path: "/data/local/tmp/exists.bin",
//       overwrite: false,
//     },
//   });
//   expect(result.ok).toBe(false);
//   if (result.ok) return;
//   expect(projectAnalysisError(result.error)).toMatchObject({
//     code: "unreadable_output",
//   });
//   expect(result.error.message).toContain("overwrite");
// });
//
// it.each([
//   ["offline", false, "error: device offline"],
//   ["unauthorized", false, "error: device unauthorized"],
//   ["offline", true, "error: device offline"],
// ] as const)(
//   "reports the %s device state when the push existence probe cannot run (overwrite %s)",
//   async (state, overwrite, stderr) => {
//     const { binary, root } = await writeAdbStub(
//       (stubRoot) => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ]; then printf '%s\\n' "$3" >> "${stubRoot}/calls"; printf '%s\\n' "${stderr}" >&2; exit 1; fi`,
//     );
//     const localFile = join(root, "payload.bin");
//     await writeFile(localFile, "x");
//     const projected = await refusedBy(providerOver(binary), {
//       operation: "push_adb_file",
//       input: {
//         serial: "emulator-5554",
//         local_path: localFile,
//         device_path: "/data/local/tmp/payload.bin",
//         overwrite,
//       },
//     });
//     // Existence is unknown, so nothing is claimed about the path and no push runs.
//     expect(projected).toMatchObject({ code: "unsupported_target" });
//     expect(projected.message).toContain(state);
//     expect(projected.message).not.toContain("already exists");
//     expect(await readFile(join(root, "calls"), "utf8")).toBe("shell\n");
//   },
// );
//
// it("reports a local push source that does not exist", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// exit 1`,
//   );
//   const projected = await refusedBy(providerOver(binary), {
//     operation: "push_adb_file",
//     input: {
//       serial: "emulator-5554",
//       local_path: "/nonexistent/payload.bin",
//       device_path: "/data/local/tmp/payload.bin",
//       overwrite: false,
//     },
//   });
//   expect(projected).toMatchObject({ code: "invalid_request" });
// });
//
// it("captures the screen as a digested PNG with its dimensions", async () => {
//   const { binary, root } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "exec-out" ]; then
//   printf '\\211PNG\\r\\n\\032\\n\\0\\0\\0\\rIHDR\\0\\0\\0\\004\\0\\0\\0\\003'
//   exit 0
// fi
// exit 1`,
//   );
//   const output = join(root, "captures");
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "capture_adb_screen",
//     input: { serial: "emulator-5554", output_directory: output },
//   });
//   expect(result).toMatchObject({ width: 4, height: 3 });
//   expect(
//     await readFile(join(output, "screen.png")).then(
//       (bytes) => bytes.subarray(1, 4).toString("latin1") === "PNG",
//       () => false,
//     ),
//   ).toBe(true);
// });
//
// it("lists processes, features, and services through fixed commands", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       ps: "USER PID PPID VSZ RSS WCHAN ADDR S NAME\nu0_a1 1234 567 123456 7890 0 0 S com.example.app\n",
//       "pm:list":
//         "feature:android.hardware.camera\nfeature:android.hardware.nfc=1\n",
//       "service:list":
//         "Found 2 services:\n  1 package: [android.content.pm.IPackageManager]\n  2 activity: [android.app.IActivityManager]\n",
//     }),
//   );
//   const processes = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_processes",
//     input: { serial: "emulator-5554" },
//   });
//   expect(processes.processes).toEqual([
//     {
//       user: "u0_a1",
//       pid: 1234,
//       ppid: 567,
//       rss: 7890,
//       state: "S",
//       name: "com.example.app",
//     },
//   ]);
//   const features = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_features",
//     input: { serial: "emulator-5554" },
//   });
//   expect(features.features).toEqual([
//     { name: "android.hardware.camera", version: null },
//     { name: "android.hardware.nfc", version: 1 },
//   ]);
//   const services = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_services",
//     input: { serial: "emulator-5554" },
//   });
//   expect(services.services).toEqual([
//     { name: "package", interface: "android.content.pm.IPackageManager" },
//     { name: "activity", interface: "android.app.IActivityManager" },
//   ]);
// });
//
// it.each(["complete", "truncated"] as const)(
//   "preserves framed directory identities with %s output",
//   async (variant) => {
//     const date = "2026-01-02 11:00:00.000000000 +0000";
//     const names = [
//       "app.db",
//       " app.db ",
//       "   ",
//       "one -> two -> three",
//       "line\r",
//       "line\u2028break",
//       "foo\n-rw-rw---- root root 0 2026-01-01 10:00 ghost",
//       "literal\\n",
//     ];
//     const links = [
//       ["lib", "/apex/com.android.art/lib"],
//       [" lib ", " /apex/lib "],
//       ["one -> two\n", "three -> four\n\n"],
//     ] as const;
//     const truncated = `-rw-rw----|u0_a1|u0_a1|4096|${date}\0unfinished`;
//     const output = [
//       ...names.map(
//         (name) => `-rw-rw----|u0_a1|u0_a1|4096|${date}\0${name}\0\0`,
//       ),
//       ...links.map(
//         ([name, target]) =>
//           `lrwxrwxrwx|root|root|${Buffer.byteLength(target)}|${date}\0${name}\0${target}\0`,
//       ),
//       ...(variant === "truncated" ? [truncated] : []),
//     ].join("");
//     const { binary } = await writeAdbStub(shellStub({ sh: output }));
//     const result = await evidenceResult(providerOver(binary), {
//       operation: "list_adb_directory",
//       input: {
//         serial: "emulator-5554",
//         device_path: "/data/data/com.example.app",
//       },
//     });
//     expect(result.entries).toEqual([
//       ...names.map((name) => ({
//         name,
//         kind: "file",
//         permissions: "-rw-rw----",
//         owner: "u0_a1",
//         group: "u0_a1",
//         bytes: 4096,
//         date,
//         link_target: null,
//       })),
//       ...links.map(([name, target]) => ({
//         name,
//         kind: "symlink",
//         permissions: "lrwxrwxrwx",
//         owner: "root",
//         group: "root",
//         bytes: Buffer.byteLength(target),
//         date,
//         link_target: target,
//       })),
//     ]);
//     expect(result.unparsed_lines).toEqual(
//       variant === "truncated" ? [truncated] : [],
//     );
//     expect(result.coverage).toBe(
//       variant === "truncated" ? "partial" : "complete",
//     );
//   },
// );
//
// it("inspects the display and window focus", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "wm:size": "Physical size: 1080x2340\n",
//       "wm:density": "Physical density: 420\n",
//       "dumpsys:window":
//         "  mCurrentFocus=Window{abcdef u0 com.example.app/com.example.app.MainActivity}\n",
//     }),
//   );
//   const display = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_display",
//     input: { serial: "emulator-5554" },
//   });
//   expect(display.physical_size).toEqual({ width: 1080, height: 2340 });
//   expect(display.physical_density).toBe(420);
//   const window = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_window",
//     input: { serial: "emulator-5554" },
//   });
//   expect(window.focused_window).toBe(
//     "Window{abcdef u0 com.example.app/com.example.app.MainActivity}",
//   );
// });
//
// it("reads Android 16 focus declarations from displays when windows omits them", async () => {
//   const { binary } = await writeAdbStub(
//     shellStub({
//       "dumpsys:window:windows": "Window state has no focus fields\\n",
//       "dumpsys:window:displays":
//         "mCurrentFocus=Window{abc u0 com.example/.Main}\nmFocusedApp=ActivityRecord{def u0 com.example/.Main t1}\n",
//     }),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_window",
//     input: { serial: "emulator-5554" },
//   });
//   expect(result).toMatchObject({
//     focused_window: "Window{abc u0 com.example/.Main}",
//     focused_app: "ActivityRecord{def u0 com.example/.Main t1}",
//     observed_lines: [
//       "Window{abc u0 com.example/.Main}",
//       "ActivityRecord{def u0 com.example/.Main t1}",
//     ],
//   });
//   const execution = await providerOver(binary).execute({
//     operation: "inspect_adb_window",
//     input: { serial: "emulator-5554" },
//   });
//   expect(execution.ok).toBe(true);
//   if (!execution.ok) throw execution.error;
//   expect(execution.value.limitations).toContainEqual(
export const _l = 387;
