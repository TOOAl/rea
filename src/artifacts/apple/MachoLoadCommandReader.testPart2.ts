export const __stub = 1;
//       fileType: FILE_TYPE.dylib,
//       commands: [
//         buildVersionCommand(1),
//         dylibCommand(LC.ID_DYLIB, installName),
//         dylibCommand(LC.LOAD_DYLIB, dependencyName),
//       ],
//     });
//   const completeDylib = fatImage([
//     {
//       cpu: CPU.arm64e,
//       bytes: variantSlice(CPU.arm64e, arm64eDependency),
//     },
//     {
//       cpu: CPU.arm64eX1,
//       bytes: variantSlice(CPU.arm64eX1, arm64eX1Dependency),
//     },
//   ]);
//   await mkdir(join(root, "Contents/MacOS"), { recursive: true });
//   await writeFile(join(root, executablePath), executable);
//   await writeFile(join(root, dylibPath), completeDylib);
//
//   const trace = () =>
//     traceDylibResolution({
//       rootPath: root,
//       targetPath: join(root, executablePath),
//       targetSha256: createHash("sha256").update(executable).digest("hex"),
//       enumerateRoots: false,
//       parameters: { roots: [executablePath] },
//     });
//
//   const complete = await trace();
//   expect(
//     complete.edges
//       .filter(({ loader }) => loader === dylibPath)
//       .map(({ install_name: dependencyName }) => dependencyName),
//   ).toEqual([arm64eX1Dependency, arm64eDependency]);
//
//   const onlyArm64e = fatImage([
//     {
//       cpu: CPU.arm64e,
//       bytes: variantSlice(CPU.arm64e, arm64eDependency),
//     },
//   ]);
//   await writeFile(join(root, dylibPath), onlyArm64e);
//   const missingVariant = await trace();
//   expect(
//     missingVariant.edges
//       .filter(
//         ({ loader, install_name: dependencyName }) =>
//           loader === executablePath && dependencyName === installName,
//       )
//       .map(({ candidates, resolution }) => [
//         candidates[0]?.outcome,
//         resolution.status,
//       ]),
//   ).toEqual([
//     ["architecture-missing", "unresolved"],
//     ["resolved", "resolved"],
//   ]);
// });
//
// describe("Mach-O load command reader: decodes thin-image load commands", () => {
//   it("preserves leading U+FEFF in load-command strings", async () => {
//     const image = machoImage({
//       commands: [
//         dylibCommand(LC.ID_DYLIB, "\uFEFF@rpath/libself.dylib"),
//         dylibCommand(LC.LOAD_DYLIB, "\uFEFF@rpath/libother.dylib"),
//         rpathCommand("\uFEFF@loader_path/Frameworks"),
//         dyldEnvironmentCommand("\uFEFFDYLD_LIBRARY_PATH=/example"),
//       ],
//     });
//     expect(await read(image)).toMatchObject({
//       status: "parsed",
//       slices: [
//         {
//           install_name: "\uFEFF@rpath/libself.dylib",
//           dependencies: [{ install_name: "\uFEFF@rpath/libother.dylib" }],
//           rpaths: ["\uFEFF@loader_path/Frameworks"],
//           dyld_environment: ["\uFEFFDYLD_LIBRARY_PATH=/example"],
//         },
//       ],
//     });
//   });
//   it("decodes dylib loading commands of a thin image", async () => {
//     const image = machoImage({
//       fileType: FILE_TYPE.dylib,
//       commands: [
//         dylibCommand(LC.ID_DYLIB, "@rpath/Core.framework/Core"),
//         dylibCommand(LC.LOAD_DYLIB, "/usr/lib/libSystem.B.dylib", {
//           current: 0x050f0400,
//           compatibility: 0x10000,
//         }),
//         dylibCommand(LC.LOAD_WEAK_DYLIB, "@rpath/libweak.dylib"),
//         dylibCommand(LC.REEXPORT_DYLIB, "@loader_path/libre.dylib"),
//         dylibCommand(LC.LOAD_UPWARD_DYLIB, "@rpath/libup.dylib"),
//         dylibCommand(LC.LAZY_LOAD_DYLIB, "@rpath/liblazy.dylib"),
//         rpathCommand("@loader_path/Frameworks"),
//         rpathCommand("/usr/lib/swift"),
//         dyldEnvironmentCommand("DYLD_FRAMEWORK_PATH=@executable_path"),
//         codeSignatureCommand(),
//       ],
//     });
//     const facts = await read(image);
//     expect(facts.status).toBe("parsed");
//     if (facts.status !== "parsed") return;
//     expect(facts.slices).toHaveLength(1);
//     const [slice] = facts.slices;
//     expect(slice).toMatchObject({
//       architecture: "arm64",
//       file_type: "dylib",
//       install_name: "@rpath/Core.framework/Core",
//       rpaths: ["@loader_path/Frameworks", "/usr/lib/swift"],
//       dyld_environment: ["DYLD_FRAMEWORK_PATH=@executable_path"],
//       code_signature_present: true,
//     });
//     expect(
//       slice?.dependencies.map(
//         ({ command, install_name: name, weak, reexport, upward }) => [
//           command,
//           name,
//           weak,
//           reexport,
//           upward,
//         ],
//       ),
//     ).toEqual([
//       ["LC_LOAD_DYLIB", "/usr/lib/libSystem.B.dylib", false, false, false],
//       ["LC_LOAD_WEAK_DYLIB", "@rpath/libweak.dylib", true, false, false],
//       ["LC_REEXPORT_DYLIB", "@loader_path/libre.dylib", false, true, false],
//       ["LC_LOAD_UPWARD_DYLIB", "@rpath/libup.dylib", false, false, true],
//       ["LC_LAZY_LOAD_DYLIB", "@rpath/liblazy.dylib", false, false, false],
//     ]);
//     expect(slice?.dependencies[0]).toMatchObject({
//       encoding: "dylib_command",
//       current_version: "1295.4.0",
//       compatibility_version: "1.0.0",
//     });
//   });
//
//   it("decodes dylib_use_command flags", async () => {
//     const facts = await read(
//       machoImage({
//         commands: [
//           dylibUseCommand(LC.LOAD_DYLIB, "@rpath/libdelay.dylib", 0x8),
//           dylibUseCommand(LC.LOAD_DYLIB, "@rpath/libweakup.dylib", 0x1 | 0x4),
//           dylibUseCommand(LC.LOAD_DYLIB, "@rpath/libre.dylib", 0x2),
//         ],
//       }),
//     );
//     if (facts.status !== "parsed") throw new Error(facts.status);
//     expect(
//       facts.slices[0]?.dependencies.map(
//         ({ encoding, weak, upward, reexport, delayed_init: delayed }) => ({
//           encoding,
//           weak,
//           upward,
//           reexport,
//           delayed,
//         }),
//       ),
//     ).toEqual([
//       {
//         encoding: "dylib_use_command",
//         weak: false,
//         upward: false,
//         reexport: false,
//         delayed: true,
//       },
//       {
export const _l = 169;
