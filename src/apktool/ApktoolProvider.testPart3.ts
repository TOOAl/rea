export const __stub = 1;
//
// it.each(["car", "night", "v21"])(
//   "rejects %s as a requested locale",
//   (locale) => {
//     expect(
//       apktoolRequestSchema.safeParse({
//         operation: "decode_android_resources",
//         input: { path: "/tmp/probe.apk", locale },
//       }).success,
//     ).toBe(false);
//   },
// );
//
// it("projects one locale's strings on request", async () => {
//   const { command, root } = await writeApktoolStub(decodeStub());
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true, locale: "de" },
//   });
//   expect(result.locale).toBe("de");
//   expect(result.strings).toEqual([
//     { name: "app_name", value: "ApktoolProbe DE" },
//   ]);
// });
//
// it("notes a missing locale table instead of failing", async () => {
//   const { command, root } = await writeApktoolStub(decodeStub());
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true, locale: "fr" },
//   });
//   expect(result.strings).toEqual([]);
// });
//
// it("notes a missing default strings table without strings", async () => {
//   const { command, root } = await writeApktoolStub(
//     decodeStub({ withStrings: false }),
//   );
//   const apk = await apkFixture(root);
//   const result = await evidenceResult(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   expect(result.strings).toEqual([]);
// });
//
// it("reports apktool's own refusal for undecodable targets", async () => {
//   const { command, root } = await writeApktoolStub(
//     decodeStub({ failDecode: true }),
//   );
//   const apk = await apkFixture(root);
//   const projected = await refusedBy(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: apk.path, include_strings: true },
//   });
//   expect(projected).toMatchObject({ code: "unsupported_target" });
//   expect(projected.message).toContain("Could not decode");
// });
//
// it("reports a missing launcher as a capability gap with recovery", async () => {
//   const provider = new ApktoolProvider({
//     environment: { REA_APKTOOL_COMMAND: "/nonexistent/apktool" },
//   });
//   const availability = await provider.inspectAvailability();
//   expect(availability).toMatchObject({
//     status: "unavailable",
//     code: "executable_missing",
//   });
//   const projected = await refusedBy(provider, {
//     operation: "inspect_apktool_client",
//     input: {},
//   });
//   expect(projected).toMatchObject({ code: "capability_unavailable" });
//   expect(projected.details).toMatchObject({
//     provider_id: "apktool",
//     reason: expect.stringContaining("REA_APKTOOL_COMMAND") as unknown,
//   });
// });
//
// it("fails closed for unrecognized and unsupported Apktool versions", async () => {
//   const invalidOutput = `unexpected Apktool output ${"x".repeat(700)}\n`;
//   const unrecognized = await writeApktoolStub(
//     () => `printf '%s' '${invalidOutput}'; exit 0`,
//   );
//   await expect(
//     providerOver(unrecognized.command).inspectAvailability(),
//   ).resolves.toMatchObject({
//     status: "unavailable",
//     code: "version_unresolved",
//     diagnostics: {
//       reported_version: invalidOutput.trim(),
//       stdout: invalidOutput,
//     },
//   });
//
//   const old = await writeApktoolStub(() => `printf '2.6.3\\n'`);
//   await expect(
//     providerOver(old.command).inspectAvailability(),
//   ).resolves.toMatchObject({
//     status: "unavailable",
//     code: "unsupported_version",
//   });
//
//   const prerelease = await writeApktoolStub(() => `printf '2.7.0-beta.1\\n'`);
//   await expect(
//     providerOver(prerelease.command).inspectAvailability(),
//   ).resolves.toMatchObject({
//     status: "unavailable",
//     code: "unsupported_version",
//   });
// });
//
// it("rejects a target that is not a readable file", async () => {
//   const { command, root } = await writeApktoolStub(decodeStub());
//   const projected = await refusedBy(providerOver(command), {
//     operation: "decode_android_resources",
//     input: { path: join(root, "absent.apk"), include_strings: true },
//   });
//   expect(projected).toMatchObject({ code: "invalid_request" });
// });
//
// it("cancels before spawning anything", async () => {
//   const { command, root } = await writeApktoolStub(
//     (root) => `: > ${join(root, "spawned")}
// if [ "$1" = "--version" ]; then ${VERSION_BLOCK}; exit 0; fi`,
//   );
//   const controller = new AbortController();
//   controller.abort();
//   const result = await providerOver(command).execute(
//     {
//       operation: "decode_android_resources",
//       input: { path: "/targets/x.apk", include_strings: true },
//     },
//     { signal: controller.signal },
//   );
//   expect(result.ok).toBe(false);
export const _l = 138;
