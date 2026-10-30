export const __stub = 1;
// import { createHash } from "node:crypto";
// import {
//   chmod,
//   mkdtemp,
//   readFile,
//   rm,
//   truncate,
//   writeFile,
// } from "node:fs/promises";
// import { join } from "node:path";
// import { describe, expect, onTestFinished, test } from "vitest";
//
// import { ApktoolProvider } from "./ApktoolProvider.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { apktoolRequestSchema } from "../domain/apktool/apktoolResourceAnalysis.js";
// import type { ApktoolRequest } from "../domain/apktool/apktoolResourceAnalysis.js";
//
// const it = test.skipIf(process.platform === "win32");
//
// const VERSION_BLOCK = "printf '2.7.0-dirty\\n'";
//
// const REAL_YML = [
//   "!!brut.androlib.meta.MetaInfo",
//   "sdkInfo:",
//   "  minSdkVersion: '24'",
//   "  targetSdkVersion: '34'",
//   "versionInfo:",
//   "  versionCode: '7'",
//   "  versionName: 1.2.3",
//   "",
// ].join("\n");
//
// const REAL_MANIFEST = [
//   '<?xml version="1.0" encoding="utf-8" standalone="no"?>',
//   '<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.rea.apktool.probe">',
//   '    <application android:label="@string/app_name" android:debuggable="true"/>',
//   "</manifest>",
//   "",
// ].join("\n");
//
// const REAL_STRINGS = [
//   '<?xml version="1.0" encoding="utf-8"?>',
//   "<resources>",
//   '    <string name="api_endpoint">https://api.example.com/v1</string>',
//   '    <string name="app_name">ApktoolProbe</string>',
//   "</resources>",
//   "",
// ].join("\n");
//
// const DE_STRINGS = [
//   '<?xml version="1.0" encoding="utf-8"?>',
//   "<resources>",
//   '    <string name="app_name">ApktoolProbe DE</string>',
//   "</resources>",
//   "",
// ].join("\n");
//
// const writeApktoolStub = async (
//   body: (root: string) => string,
// ): Promise<{ readonly command: string; readonly root: string }> => {
//   const root = await mkdtemp(join("/tmp", "rea-apktool-stub-"));
//   onTestFinished(() => rm(root, { recursive: true, force: true }));
//   const command = join(root, "apktool");
//   await writeFile(command, `#!/bin/sh\n${body(root)}\n`, { mode: 0o755 });
//   await chmod(command, 0o755);
//   return { command, root };
// };
//
// const providerOver = (command: string): ApktoolProvider =>
//   new ApktoolProvider({
//     environment: { REA_APKTOOL_COMMAND: command },
//   });
//
// const evidenceResult = async (
//   provider: ApktoolProvider,
//   request: ApktoolRequest,
// ): Promise<Record<string, unknown>> => {
//   const result = await provider.execute(request);
//   if (!result.ok) throw result.error;
//   return result.value.result as Record<string, unknown>;
// };
//
// const refusedBy = async (
//   provider: ApktoolProvider,
//   request: ApktoolRequest,
// ): Promise<ReturnType<typeof projectAnalysisError>> => {
//   const result = await provider.execute(request);
//   expect(result.ok).toBe(false);
//   if (result.ok) throw new Error("expected a refusal");
//   return projectAnalysisError(result.error);
// };
//
// /** Stub writing a real-shaped decoded workspace into the -o directory. */
// const decodeStub = (
//   options: {
//     readonly withStrings?: boolean;
//     readonly withGerman?: boolean;
//     readonly failDecode?: boolean;
//     readonly ymlFile?: string;
//     readonly manifestFile?: string;
//     readonly stringsFile?: string;
//     readonly stringsXml?: string;
//     readonly extraValuesDirectories?: readonly string[];
//   } = {},
// ): ((root: string) => string) => {
//   const withStrings = options.withStrings ?? true;
//   const withGerman = options.withGerman ?? true;
//   const extraValuesDirectories = options.extraValuesDirectories ?? [];
//   const stringsXml = options.stringsXml ?? REAL_STRINGS;
//   const ymlWrite =
//     options.ymlFile === undefined
//       ? `printf '%s\\n' '${REAL_YML.replace(/'/gu, "'\\''")}' > "$5/apktool.yml"`
//       : `cp '${options.ymlFile}' "$5/apktool.yml"`;
//   const manifestWrite =
//     options.manifestFile === undefined
//       ? `printf '%s\\n' '${REAL_MANIFEST.replace(/'/gu, "'\\''")}' > "$5/AndroidManifest.xml"`
//       : `cp '${options.manifestFile}' "$5/AndroidManifest.xml"`;
//   const stringsWrite =
//     options.stringsFile === undefined
//       ? `printf '%s\\n' '${stringsXml.replace(/'/gu, "'\\''")}' > "$5/res/values/strings.xml"`
//       : `cp '${options.stringsFile}' "$5/res/values/strings.xml"`;
//   const qualifierStrings = extraValuesDirectories
//     .map(
//       (name) =>
//         `printf '%s\\n' '<resources><string name="wrong">Wrong</string></resources>' > "$5/res/values-${name}/strings.xml"`,
//     )
//     .join("\\n  ");
//   return () => `if [ "$1" = "--version" ]; then ${VERSION_BLOCK}; exit 0; fi
// if [ "$1" = "d" ]; then
//   ${
//     options.failDecode === true
//       ? `printf 'Exception in thread "main" brut.androlib.AndrolibException: Could not decode the APK\\n' >&2; exit 1;`
//       : `${ymlWrite}
//   ${manifestWrite}
//   mkdir -p "$5/res/values"${withGerman ? ' "$5/res/values-de"' : ""}${extraValuesDirectories.map((name) => ` "$5/res/values-${name}"`).join("")}
//   ${withStrings ? stringsWrite : ""}
//   ${withGerman ? `printf '%s\\n' '${DE_STRINGS.replace(/'/gu, "'\\''")}' > "$5/res/values-de/strings.xml"` : ""}
//   ${qualifierStrings}
export const _l = 138;
