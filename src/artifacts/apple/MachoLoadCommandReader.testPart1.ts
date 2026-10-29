export const __stub = 1;
// import { createHash } from "node:crypto";
// import { mkdir, writeFile } from "node:fs/promises";
// import { join } from "node:path";
//
// import { describe, expect, it } from "vitest";
//
// import {
//   CPU,
//   FILE_TYPE,
//   LC,
//   codeSignatureCommand,
//   buildVersionCommand,
//   dyldEnvironmentCommand,
//   dylibCommand,
//   dylibUseCommand,
//   fatImage,
//   machoImage,
//   readerOf,
//   rpathCommand,
//   versionMinCommand,
// } from "./MachoImage.fixture.js";
// import {
//   MAX_LOAD_COMMAND_BYTES,
//   hasMachoMagic,
//   readMachoImage,
// } from "./MachoLoadCommandReader.js";
// import { traceDylibResolution } from "./DylibResolutionReader.js";
// import { createTestTempDirectory } from "../../../tests/fixtures/temporaryDirectory.js";
// import { javaClassFile } from "../../../tests/fixtures/javaClassFile.js";
//
// const read = (bytes: Uint8Array) =>
//   readMachoImage(readerOf(bytes), bytes.length);
//
// // Legacy `LC_VERSION_MIN_*` commands carry no simulator flag: per dyld
// // rules Intel images are simulator, ARM images are device (tvOS simulator
// // is x86_64 only). A legacy simulator executable must not fail resolution
// // against a modern simulator dylib.
// it.each([
//   { command: LC.VERSION_MIN_IPHONEOS, cpu: CPU.i386, platform: 7 },
//   { command: LC.VERSION_MIN_IPHONEOS, cpu: CPU.x86_64, platform: 7 },
//   { command: LC.VERSION_MIN_IPHONEOS, cpu: CPU.arm64, platform: 2 },
//   { command: LC.VERSION_MIN_TVOS, cpu: CPU.x86_64, platform: 8 },
//   { command: LC.VERSION_MIN_TVOS, cpu: CPU.arm64, platform: 3 },
//   { command: LC.VERSION_MIN_WATCHOS, cpu: CPU.i386, platform: 9 },
//   { command: LC.VERSION_MIN_WATCHOS, cpu: CPU.arm64, platform: 4 },
//   { command: LC.VERSION_MIN_MACOSX, cpu: CPU.x86_64, platform: 1 },
// ] as const)(
//   "classifies legacy command $command on $cpu.type as platform $platform",
//   async ({ command, cpu, platform }) => {
//     const facts = await read(
//       machoImage({ cpu, commands: [versionMinCommand(command)] }),
//     );
//     if (facts.status !== "parsed") throw new Error(facts.status);
//     expect(facts.slices[0]).toMatchObject({ platform, platforms: [platform] });
//   },
// );
//
// it("uses legacy simulator and device platform facts when resolving dylibs", async () => {
//   const root = await createTestTempDirectory("rea-macho-legacy-platform-");
//   const dylibPath = "Frameworks/libThing.dylib";
//   const installName = "@rpath/libThing.dylib";
//   const intelExecutable = machoImage({
//     cpu: CPU.x86_64,
//     commands: [
//       versionMinCommand(LC.VERSION_MIN_IPHONEOS),
//       rpathCommand("@executable_path/Frameworks"),
//       dylibCommand(LC.LOAD_DYLIB, installName),
//     ],
//   });
//   const armExecutable = machoImage({
//     cpu: CPU.arm64,
//     commands: [
//       versionMinCommand(LC.VERSION_MIN_IPHONEOS),
//       rpathCommand("@executable_path/Frameworks"),
//       dylibCommand(LC.LOAD_DYLIB, installName),
//     ],
//   });
//   const simulatorDylib = fatImage([
//     {
//       cpu: CPU.x86_64,
//       bytes: machoImage({
//         cpu: CPU.x86_64,
//         fileType: FILE_TYPE.dylib,
//         commands: [
//           buildVersionCommand(7),
//           dylibCommand(LC.ID_DYLIB, installName),
//         ],
//       }),
//     },
//     {
//       cpu: CPU.arm64,
//       bytes: machoImage({
//         cpu: CPU.arm64,
//         fileType: FILE_TYPE.dylib,
//         commands: [
//           buildVersionCommand(7),
//           dylibCommand(LC.ID_DYLIB, installName),
//         ],
//       }),
//     },
//   ]);
//   await mkdir(join(root, "Frameworks"), { recursive: true });
//   await writeFile(join(root, "Intel"), intelExecutable);
//   await writeFile(join(root, "Arm"), armExecutable);
//   await writeFile(join(root, dylibPath), simulatorDylib);
//
//   const trace = async (target: string, architecture: "arm64" | "x86_64") => {
//     const bytes = target === "Intel" ? intelExecutable : armExecutable;
//     return traceDylibResolution({
//       rootPath: root,
//       targetPath: join(root, target),
//       targetSha256: createHash("sha256").update(bytes).digest("hex"),
//       enumerateRoots: false,
//       parameters: { roots: [target], architecture },
//     });
//   };
//   const intelTrace = await trace("Intel", "x86_64");
//   const armTrace = await trace("Arm", "arm64");
//
//   expect(intelTrace.edges).toContainEqual(
//     expect.objectContaining({
//       loader: "Intel",
//       resolution: expect.objectContaining({
//         status: "resolved",
//         image: dylibPath,
//       }),
//     }),
//   );
//   expect(armTrace.edges).toContainEqual(
//     expect.objectContaining({
//       loader: "Arm",
//       candidates: expect.arrayContaining([
//         expect.objectContaining({ outcome: "platform-mismatch" }),
//       ]),
//     }),
//   );
// });
//
// it("selects matching arm64e subtype slices when tracing a mixed FAT image", async () => {
//   const root = await createTestTempDirectory("rea-macho-arm64e-subtypes-");
//   const executablePath = "Contents/MacOS/App";
//   const dylibPath = "Contents/MacOS/libVariant.dylib";
//   const installName = "@executable_path/libVariant.dylib";
//   const arm64eDependency = "@executable_path/libArm64e.dylib";
//   const arm64eX1Dependency = "@executable_path/libArm64eX1.dylib";
//   const executableSlice = (cpu: typeof CPU.arm64e | typeof CPU.arm64eX1) =>
//     machoImage({
//       cpu,
//       commands: [
//         buildVersionCommand(1),
//         dylibCommand(LC.LOAD_DYLIB, installName),
//       ],
//     });
//   const executable = fatImage([
//     {
//       cpu: CPU.arm64eX1,
//       bytes: executableSlice(CPU.arm64eX1),
//     },
//     {
//       cpu: CPU.arm64e,
//       bytes: executableSlice(CPU.arm64e),
//     },
//   ]);
//   const variantSlice = (
//     cpu: typeof CPU.arm64e | typeof CPU.arm64eX1,
//     dependencyName: string,
//   ) =>
//     machoImage({
//       cpu,
export const _l = 169;
