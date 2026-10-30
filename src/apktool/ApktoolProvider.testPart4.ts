export const __stub = 1;
//   if (result.ok) return;
//   expect(projectAnalysisError(result.error)).toMatchObject({
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
// it("uses an owned APK snapshot and framework cache and resolves regional locales", async () => {
//   const { command, root } = await writeApktoolStub((root) =>
//     decodeStub()(root).replace(
//       'if [ "$1" = "d" ]; then',
//       `if [ "$1" = "d" ]; then
//     [ "$6" = "--frame-path" ] || exit 7
//     [ -d "$7" ] || exit 8
//     printf 'changed original' > "${join(root, "probe.apk")}"
//     cat "$8" > "${join(root, "snapshot-bytes")}"
//     mkdir -p "$5/res/values-pt-rBR"
//     printf '<resources><string name="greeting">Olá</string></resources>' > "$5/res/values-pt-rBR/strings.xml"`,
//     ),
//   );
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true, locale: "pt-BR" },
//   });
//   expect(result.target).toMatchObject({
//     sha256: apk.sha256,
//     bytes: apk.bytes,
//     path: apk.path,
//   });
//   expect(await readFile(join(root, "snapshot-bytes"), "utf8")).toBe(
//     "apk-bytes-for-apktool",
//   );
//   expect(result.strings).toEqual([{ name: "greeting", value: "Olá" }]);
// });
//
// it("marks an oversized strings document partial without claiming it is missing", async () => {
//   const { command, root } = await writeApktoolStub((root) =>
//     decodeStub({ stringsFile: join(root, "large-strings.xml") })(root),
//   );
//   await writeFile(join(root, "large-strings.xml"), "");
//   await truncate(join(root, "large-strings.xml"), 9 * 1024 * 1024);
//   const apk = await apkFixture(root);
//   const result = await providerOver(command).execute({
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   if (!result.ok) throw result.error;
//   expect(result.value.result).toMatchObject({
//     coverage: "partial",
//     strings: [],
//   });
//   expect(result.value.limitations.join(" ")).toContain("exceeds");
//   expect(result.value.limitations.join(" ")).not.toContain("No default");
// });
//
// describe("truncated manifest prefixes", () => {
//   it.each([
//     {
//       name: "a retained prefix ending after the root element",
//       manifest: `<manifest package="com.rea.large"></manifest>${" ".repeat(512 * 1024 + 1)}`,
//     },
//     {
//       name: "a retained prefix ending before the root element closes",
//       manifest: `<manifest package="com.rea.large">${" ".repeat(512 * 1024 + 1)}</manifest>`,
//     },
//   ])("retains $name without parsing its package", async ({ manifest }) => {
//     const { command, root } = await writeApktoolStub((root) =>
//       decodeStub({ manifestFile: join(root, "large-AndroidManifest.xml") })(
//         root,
//       ),
//     );
//     await writeFile(join(root, "large-AndroidManifest.xml"), manifest);
//     const apk = await apkFixture(root);
//
//     const result = await providerOver(command).execute({
//       operation: "decode_android_resources",
//       input: { path: apk.path, include_strings: false },
//     });
//     if (!result.ok) throw result.error;
//
//     expect(result.value.result).toMatchObject({
//       coverage: "partial",
//       manifest: manifest.slice(0, 512 * 1024),
//       metadata: { package_name: null, version_name: "1.2.3" },
//     });
//     expect(result.value.limitations.join(" ")).toContain(
//       "manifest is truncated",
//     );
//   });
// });
//
// it("retains failed workspace cleanup and retries it on close", async () => {
//   const { command, root } = await writeApktoolStub(
//     decodeStub({ failDecode: true }),
//   );
//   const apk = await apkFixture(root);
//   let attempts = 0;
//   let owned: string | undefined;
//   const provider = new ApktoolProvider({
//     environment: { REA_APKTOOL_COMMAND: command },
//     removeWorkspace: async (path) => {
//       owned = path;
//       if (++attempts === 1) throw new Error("busy");
//       await rm(path, { recursive: true, force: true });
//     },
//   });
//   const result = await provider.execute({
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   expect(result.ok).toBe(false);
//   if (!result.ok) expect(result.error.cleanup?.resources).toContain(owned);
//   await provider.close();
//   expect(attempts).toBe(2);
// });
//
// it("accepts a BCP47 resource qualifier through the public request schema", async () => {
//   const { command, root } = await writeApktoolStub((root) =>
//     decodeStub()(root).replace(
//       "  printf 'I: Using Apktool on stub",
//       '  mkdir -p "$5/res/values-b+zh+Hans+CN"\n  printf \'<resources><string name="greeting">你好</string></resources>\' > "$5/res/values-b+zh+Hans+CN/strings.xml"\n  printf \'I: Using Apktool on stub',
//     ),
//   );
//   const apk = await apkFixture(root);
//   const request = apktoolRequestSchema.parse({
//     operation: "decode_android_resources",
//     input: { path: apk.path, locale: "b+zh+Hans+CN" },
//   });
//   const result = await evidenceResult(providerOver(command), request);
//   expect(result.strings).toEqual([{ name: "greeting", value: "你好" }]);
// });
export const _l = 137;
