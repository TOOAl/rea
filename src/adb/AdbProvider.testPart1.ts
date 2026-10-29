export const __stub = 1;
// import { createHash } from "node:crypto";
// import {
//   chmod,
//   lstat,
//   mkdir,
//   mkdtemp,
//   readFile,
//   rm,
//   writeFile,
// } from "node:fs/promises";
// import { join } from "node:path";
// import { expect, onTestFinished, test } from "vitest";
//
// import { AdbProvider } from "./AdbProvider.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import type { AdbRequest } from "../domain/adb/adbDeviceAnalysis.js";
//
// const it = test.skipIf(process.platform === "win32");
//
// const VERSION_BLOCK =
//   "printf 'Android Debug Bridge version 1.0.41\\nVersion 34.0.5-stub\\nInstalled as %s\\n' \"$0\"";
//
// const writeAdbStub = async (
//   body: (root: string) => string,
// ): Promise<{ readonly binary: string; readonly root: string }> => {
//   const root = await mkdtemp(join("/tmp", "rea-adb-"));
//   onTestFinished(() => rm(root, { recursive: true, force: true }));
//   const binary = join(root, "adb");
//   await writeFile(binary, `#!/bin/sh\n${body(root)}\n`, { mode: 0o755 });
//   await chmod(binary, 0o755);
//   return { binary, root };
// };
//
// const providerOver = (binary: string): AdbProvider =>
//   new AdbProvider({ environment: { REA_ADB_PATH: binary } });
//
// const evidenceResult = async (
//   provider: AdbProvider,
//   request: AdbRequest,
// ): Promise<Record<string, unknown>> => {
//   const result = await provider.execute(request);
//   if (!result.ok) throw new Error(result.error.message);
//   return result.value.result as Record<string, unknown>;
// };
//
// const refusedBy = async (
//   provider: AdbProvider,
//   request: AdbRequest,
// ): Promise<ReturnType<typeof projectAnalysisError>> => {
//   const result = await provider.execute(request);
//   expect(result.ok).toBe(false);
//   if (result.ok) throw new Error("expected a refusal");
//   return projectAnalysisError(result.error);
// };
//
// const namesAliasOnVolume = async (
//   parent: string,
//   firstName: string,
//   secondName: string,
// ): Promise<boolean> => {
//   const probe = join(parent, "destination-name-probe");
//   await mkdir(probe);
//   try {
//     await mkdir(join(probe, firstName));
//     try {
//       await mkdir(join(probe, secondName));
//       return false;
//     } catch (cause) {
//       if (cause instanceof Error && "code" in cause && cause.code === "EEXIST")
//         return true;
//       throw cause;
//     }
//   } finally {
//     await rm(probe, { recursive: true, force: true });
//   }
// };
//
// it("inspects the adb client without contacting the server", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; fi`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_client",
//     input: {},
//   });
//   expect(result.client).toMatchObject({
//     path_source: "environment",
//     version: "34.0.5-stub",
//     installed_path: binary,
//   });
//   expect(result.contacted_adb_server).toBe(false);
// });
//
// it("fails closed when adb exits successfully without a recognized version", async () => {
//   const stdout = `unexpected adb output ${"x".repeat(700)}\n`;
//   const stderr = `probe stderr ${"y".repeat(700)}\n`;
//   const { binary } = await writeAdbStub(
//     () => `printf '%s' '${stdout}'; printf '%s' '${stderr}' >&2; exit 0`,
//   );
//   await expect(
//     providerOver(binary).inspectAvailability(),
//   ).resolves.toMatchObject({
//     status: "unavailable",
//     code: "version_unresolved",
//     diagnostics: {
//       version_probe: "unrecognized_output",
//       stdout,
//       stderr,
//     },
//   });
// });
//
// it("accepts adb's recognized protocol version when the build version is absent", async () => {
//   const { binary } = await writeAdbStub(
//     () => `printf 'Android Debug Bridge version 1.0.41\\n'`,
//   );
//   await expect(
//     providerOver(binary).inspectAvailability(),
//   ).resolves.toMatchObject({
//     status: "available",
//   });
// });
//
// it("lists devices with inferred kinds and observed daemon startup", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "devices" ]; then
//   printf '* daemon not running; starting now at tcp:5037\\n* daemon started successfully\\n'
//   printf 'List of devices attached\\n'
//   printf 'emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1\\n'
//   exit 0
// fi`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_devices",
//     input: {},
//   });
//   expect(result.may_have_started_adb_server).toBe(true);
//   expect(result.devices).toEqual([
//     {
//       serial: "emulator-5554",
//       state: "device",
//       transport: "tcp",
//       product: "sdk_gphone64_x86_64",
//       model: "sdk_gphone64_x86_64",
//       device: "emu64xa",
//       transport_id: 1,
//       kind: "emulator",
//       kind_basis: "emulator_serial_prefix",
//     },
//   ]);
// });
//
// it("observes daemon startup when notices are printed to stderr", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "devices" ]; then
//   printf '* daemon not running; starting now at tcp:5037\\n* daemon started successfully\\n' >&2
//   printf 'List of devices attached\\n'
//   printf 'emulator-5554          device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1\\n'
//   exit 0
// fi`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_devices",
//     input: {},
//   });
//   expect(result.may_have_started_adb_server).toBe(true);
//   expect(result.devices).toEqual([
//     {
//       serial: "emulator-5554",
//       state: "device",
//       transport: "tcp",
//       product: "sdk_gphone64_x86_64",
//       model: "sdk_gphone64_x86_64",
//       device: "emu64xa",
//       transport_id: 1,
//       kind: "emulator",
//       kind_basis: "emulator_serial_prefix",
//     },
//   ]);
// });
//
// it("refuses device listings with an invalid state token", async () => {
//   const malformedLine = "serial deviceXYZ  ";
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "devices" ]; then
//   printf 'List of devices attached\\n${malformedLine}\\n'
//   exit 0
// fi`,
//   );
//   const result = await providerOver(binary).execute({
//     operation: "list_adb_devices",
//     input: {},
//   });
//   expect(result.ok).toBe(false);
//   if (result.ok) return;
//   expect(result.error._tag).toBe("AnalysisProtocolError");
//   expect(result.error.message).toContain(malformedLine);
// });
//
// it("lists rescue and detached transports alongside online devices", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "devices" ]; then
//   printf 'List of devices attached\\n'
//   printf 'serial-online          device transport_id:1\\n'
//   printf 'serial-rescue          rescue transport_id:2\\n'
//   printf 'serial-detached        detached transport_id:3\\n'
//   exit 0
// fi`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_devices",
//     input: {},
//   });
//   expect(result.devices).toEqual(
//     expect.arrayContaining([
//       expect.objectContaining({ serial: "serial-online", state: "device" }),
//       expect.objectContaining({ serial: "serial-rescue", state: "rescue" }),
//       expect.objectContaining({
//         serial: "serial-detached",
//         state: "detached",
//       }),
//     ]),
//   );
// });
//
// it("inspects a device through the getprop whitelist", async () => {
//   const { binary } = await writeAdbStub(
//     () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "shell" ] && [ "$4" = "getprop" ]; then
//   printf '[ro.build.version.sdk]: [34]\\n[ro.kernel.qemu]: [1]\\n[sys.private]: [x]\\n'
//   exit 0
// fi`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "inspect_adb_device",
//     input: { serial: "emulator-5554" },
//   });
//   expect(result.emulator_observed).toBe(true);
//   expect(result.properties).toEqual([
//     { name: "ro.build.version.sdk", value: "34" },
//     { name: "ro.kernel.qemu", value: "1" },
//   ]);
// });
//
// it("passes the caller scope as an exact fixed argv vector", async () => {
//   const { binary, root } = await writeAdbStub(
//     (root) => `printf '%s\\n' "$@" >> ${join(root, "argv.log")}
// if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "shell" ]; then printf 'package:/data/app/x/base.apk=com.example\\n'; exit 0; fi`,
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "list_adb_packages",
//     input: { serial: "emulator-5554", scope: "third_party" },
//   });
//   expect(result.coverage).toBe("complete");
//   expect(result.packages).toEqual([
//     {
//       package_name: "com.example",
//       base_apk_device_path: "/data/app/x/base.apk",
//     },
//   ]);
//   const logged = (await readFile(join(root, "argv.log"), "utf8"))
//     .trim()
//     .split("\n");
//   expect(logged).toEqual([
//     "version",
//     "-s",
//     "emulator-5554",
//     "shell",
//     "pm",
//     "list",
//     "packages",
//     "-f",
//     "-3",
//   ]);
// });
//
// const pullStub = (
//   paths: string,
//   pullBody: string,
// ): string => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$4" = "pm" ] && [ "$5" = "path" ]; then
//   printf '%s\\n' ${paths}
//   exit 0
// fi
// if [ "$1" = "-s" ] && [ "$3" = "pull" ]; then
// ${pullBody}
//   exit 0
// fi
// printf 'unexpected arguments: %s\\n' "$@"
// exit 1`;
//
// /** Stub dispatching one canned stdout per first shell word (and optional second). */
// const shellStub = (
//   dispatch: Readonly<Record<string, string>>,
// ): ((root: string) => string) => {
//   const cases = Object.entries(dispatch)
//     .map(([key, output]) => {
//       const [first, second, third] = key.split(":");
//       const guard = [
//         `[ "$4" = "${first}" ]`,
//         ...(second === undefined ? [] : [`[ "$5" = "${second}" ]`]),
//         ...(third === undefined ? [] : [`[ "$6" = "${third}" ]`]),
//       ].join(" && ");
//       return `  if ${guard}; then printf '%b' '${output.replaceAll("\\", "\\\\").replaceAll("\0", "\\000").replace(/'/gu, "'\\''")}'; exit 0; fi`;
//     })
//     .join("\n");
//   return () => `if [ "$1" = "version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "-s" ] && [ "$3" = "shell" ]; then
// ${cases}
//   printf 'unexpected shell command: %s %s %s\\n' "$4" "$5" "$6" >&2
//   exit 1
// fi
// printf 'unexpected arguments: %s\\n' "$@"
// exit 1`;
// };
//
// it("pulls a complete split set with digests into a new package directory", async () => {
//   const { binary, root } = await writeAdbStub(() =>
//     pullStub(
//       "'package:/data/app/~~a==/com.example.b==/base.apk' 'package:/data/app/~~a==/com.example.b==/split_config.en.apk'",
//       `  printf 'apk-bytes-for-testing' > "$5"
//   printf '1 file pulled, 0 skipped.\\n'`,
//     ),
//   );
//   const output = join(root, "pulls");
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "pull_adb_package",
//     input: {
//       serial: "emulator-5554",
//       package: "com.example",
//       output_directory: output,
//     },
//   });
//   expect(result.coverage).toBe("complete");
//   expect(result.failures).toEqual([]);
//   const artifacts = result.artifacts as {
//     file_name: string;
//     local_path: string;
//     sha256: string;
//     role: string;
//   }[];
//   expect(
//     artifacts.map((artifact) => [artifact.file_name, artifact.role]),
//   ).toEqual([
//     ["base.apk", "base"],
//     ["split_config.en.apk", "split"],
//   ]);
//   const digest = createHash("sha256")
//     .update("apk-bytes-for-testing")
//     .digest("hex");
//   for (const artifact of artifacts) expect(artifact.sha256).toBe(digest);
//   const pulled = await readFile(
//     join(output, "com.example", "base.apk"),
//     "utf8",
//   );
//   expect(pulled).toBe("apk-bytes-for-testing");
// });
//
// it("keeps successful artifacts when one split pull fails", async () => {
//   const { binary, root } = await writeAdbStub(() =>
//     pullStub(
//       "'package:/data/app/y/base.apk' 'package:/data/app/y/split_dpi.apk'",
//       `case "$4" in
//     */split_dpi.apk) printf 'error: closed\\n' >&2; exit 1;;
//     *) printf 'apk-bytes-for-testing' > "$5"; printf '1 file pulled.\\n';;
//   esac`,
//     ),
//   );
//   const result = await evidenceResult(providerOver(binary), {
//     operation: "pull_adb_package",
//     input: {
//       serial: "emulator-5554",
//       package: "com.partial",
//       output_directory: join(root, "pulls"),
//     },
//   });
//   expect(result.coverage).toBe("partial");
//   expect(result.artifacts).toHaveLength(1);
//   expect(result.failures).toEqual([
//     {
//       device_path: "/data/app/y/split_dpi.apk",
//       stage: "pull",
export const _l = 387;
