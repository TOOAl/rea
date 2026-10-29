export const __stub = 1;
//   printf 'I: Using Apktool on stub\\n'
//   exit 0`
//   }
// fi
// printf 'unexpected arguments: %s\\n' "$@"
// exit 1`;
// };
//
// const apkFixture = async (
//   root: string,
// ): Promise<{
//   readonly path: string;
//   readonly bytes: number;
//   readonly sha256: string;
// }> => {
//   const path = join(root, "probe.apk");
//   const bytes = "apk-bytes-for-apktool";
//   await writeFile(path, bytes);
//   return {
//     path,
//     bytes: bytes.length,
//     sha256: createHash("sha256").update(bytes).digest("hex"),
//   };
// };
//
// it("inspects the apktool launcher", async () => {
//   const { command } = await writeApktoolStub(
//     () => `if [ "$1" = "--version" ]; then ${VERSION_BLOCK}; exit 0; fi`,
//   );
//   const result = await evidenceResult(providerOver(command), {
//     operation: "inspect_apktool_client",
//     input: {},
//   });
//   expect(result.client).toEqual({
//     command,
//     command_source: "environment",
//     apktool_version: "2.7.0-dirty",
//   });
// });
//
// it("decodes resources with target identity, metadata, and strings", async () => {
//   const { command, root } = await writeApktoolStub(decodeStub());
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   expect(result.target).toEqual({
//     path: apk.path,
//     bytes: apk.bytes,
//     sha256: apk.sha256,
//   });
//   expect(result.metadata).toEqual({
//     version_name: "1.2.3",
//     version_code: "7",
//     min_sdk_version: "24",
//     target_sdk_version: "34",
//     package_name: "com.rea.apktool.probe",
//   });
//   expect(result.manifest).toContain('package="com.rea.apktool.probe"');
//   expect(result.strings).toEqual([
//     { name: "api_endpoint", value: "https://api.example.com/v1" },
//     { name: "app_name", value: "ApktoolProbe" },
//   ]);
//   expect(result.locales).toEqual(["de"]);
//   expect(result.locale).toBeNull();
//   expect(result.decoded_file_count).toBeGreaterThan(2);
//   expect(result.coverage).toBe("complete");
// });
//
// it.each([
//   {
//     name: "malformed UTF-8",
//     bytes: Buffer.concat([
//       Buffer.from("versionInfo:\n  versionName: com."),
//       Buffer.from([0xff]),
//       Buffer.from(".app\n"),
//     ]),
//     valid: false,
//   },
//   {
//     name: "a literal replacement character",
//     bytes: Buffer.from("versionInfo:\n  versionName: com.�.app\n", "utf8"),
//     valid: true,
//   },
// ])("handles $name in producer metadata", async ({ bytes, valid }) => {
//   const { command, root } = await writeApktoolStub((root) =>
//     decodeStub({ ymlFile: join(root, "malformed-apktool.yml") })(root),
//   );
//   await writeFile(join(root, "malformed-apktool.yml"), bytes);
//   const apk = await apkFixture(root);
//   if (valid) {
//     const result = await evidenceResult(providerOver(command), {
//       operation: "decode_android_resources",
//       input: { path: apk.path, include_strings: false },
//     });
//     expect(result.metadata).toMatchObject({ version_name: "com.�.app" });
//     expect(result.coverage).toBe("complete");
//     return;
//   }
//   const result = await providerOver(command).execute({
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: false },
//   });
//   if (result.ok) throw new Error("expected invalid producer output");
//   const projected = projectAnalysisError(result.error);
//   expect(projected).toMatchObject({ code: "unreadable_output" });
//   expect(result.error.message).toContain("invalid UTF-8");
//   expect(result.error.message).toContain("apktool.yml");
// });
//
// it("preserves empty resource strings and reports markup omissions as partial", async () => {
//   const stringsXml =
//     '<resources><string name="empty"/><string name="raw">  A &amp; B  </string><string name="styled">Hello <b>world</b></string></resources>';
//   const { command, root } = await writeApktoolStub(decodeStub({ stringsXml }));
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   expect(result.strings).toEqual([
//     { name: "empty", value: "" },
//     { name: "raw", value: "  A &amp; B  " },
//   ]);
//   expect(result.coverage).toBe("partial");
// });
//
// it("ignores Android resource qualifiers when discovering locales", async () => {
//   const { command, root } = await writeApktoolStub(
//     decodeStub({ extraValuesDirectories: ["car", "night", "v21"] }),
//   );
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   expect(result.locales).toEqual(["de"]);
// });
export const _l = 138;
