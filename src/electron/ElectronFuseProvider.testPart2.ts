export const __stub = 1;
//     const path = join(root, "electron");
//     await writeFile(path, image.bytes);
//     const report = await inspect(path);
//     expect(report.artifact.format).toBe("elf");
//     expect(report.slices[0]?.sentinels[0]?.fuses[4]).toMatchObject({
//       index: 4,
//       name: "EnableEmbeddedAsarIntegrityValidation",
//       state: "enabled",
//       raw_byte: ELECTRON_FUSE_STATE_BYTES.enabled,
//     });
//     expect(
//       report.runtime_implications.find(
//         (item) => item.subject === "embedded_asar_integrity_validation",
//       ),
//     ).toMatchObject({
//       relationship: "derivation",
//       fuse_index: 4,
//       outcome: "unknown",
//       sentinel_offset: image.sentinelOffset,
//     });
//     expect(report.limitations.join(" ")).toContain("only on macOS and Windows");
//   });
// });
//
// describe("Electron fuse reader resource boundaries", () => {
//   it("rejects invalid scan window sizes before allocating or scanning", async () => {
//     const root = await createTestTempDirectory(
//       "rea-electron-fuses-window-limit-",
//     );
//     const path = join(root, "window");
//     await writeFile(path, thinFuseImage(OBSIDIAN_FUSE_BYTES).bytes);
//     for (const chunkBytes of [0, -1, 1.5, 256 * 1024 + 1])
//       await expect(readElectronFuseImage(path, { chunkBytes })).rejects.toThrow(
//         /chunkBytes must be an integer between/,
//       );
//   });
//
//   it("rejects overlapping universal Mach-O slices before repeated searching", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-overlap-");
//     const image = universalFuseImage().bytes;
//     const firstOffset = image.readUInt32BE(16);
//     const firstSize = image.readUInt32BE(20);
//     image.writeUInt32BE(0x01000007, 28);
//     image.writeUInt32BE(firstOffset, 36);
//     image.writeUInt32BE(firstSize, 40);
//     const path = join(root, "overlapping");
//     await writeFile(path, image);
//
//     const result = await provider.inspect({ path });
//     expect(result.ok).toBe(false);
//     if (!result.ok)
//       expect(result.error).toMatchObject({
//         _tag: "AnalysisInputError",
//         issues: [
//           expect.objectContaining({
//             path: ["path"],
//             reason: "invalid_format",
//             message: expect.stringContaining("slices 0 and 1 overlap"),
//           }),
//         ],
//       });
//   });
// });
//
// describe("Electron fuse path and container admission", () => {
//   it("finds a sentinel that crosses a read window", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-window-");
//     const image = thinFuseImage(OBSIDIAN_FUSE_BYTES);
//     const path = join(root, "window");
//     await writeFile(path, image.bytes);
//     const read = await readElectronFuseImage(path, { chunkBytes: 20 });
//     expect(read.slices[0]?.sentinels[0]?.sentinel_offset).toBe(
//       image.sentinelOffset,
//     );
//     expect(read.slices[0]?.sentinels[0]?.fuses).toHaveLength(8);
//   });
//
//   it("resolves an app bundle and a framework symlink inside the bundle", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-app-");
//     const image = thinFuseImage(OBSIDIAN_FUSE_BYTES);
//     const app = join(root, "Fixture.app");
//     const versions = join(
//       app,
//       "Contents",
//       "Frameworks",
//       "Electron Framework.framework",
//       "Versions",
//     );
//     await mkdir(join(versions, "A"), { recursive: true });
//     const binary = join(versions, "A", "Electron Framework");
//     await writeFile(binary, image.bytes);
//     await symlink("A", join(versions, "Current"));
//     await symlink(
//       "Versions/Current/Electron Framework",
//       join(versions, "..", "Electron Framework"),
//     );
//
//     const fromApp = await inspect(app);
//     expect(fromApp.artifact.selected_path).toBe(app);
//     expect(fromApp.artifact.resolved_path).toBe(binary);
//     expect(fromApp.slices[0]?.sentinel_count).toBe(1);
//
//     const link = join(versions, "..", "Electron Framework");
//     const fromLink = await inspect(link);
//     expect(fromLink.artifact.resolved_path).toBe(binary);
//     expect(fromLink.artifact.sha256).toBe(fromApp.artifact.sha256);
//   });
//
//   it("rejects an app bundle whose Versions/Current symlink leaves the framework", async () => {
//     const root = await createTestTempDirectory(
//       "rea-electron-fuses-framework-root-",
//     );
//     const app = join(root, "Fixture.app");
//     const framework = join(
//       app,
//       "Contents",
//       "Frameworks",
//       "Electron Framework.framework",
//     );
//     await mkdir(join(framework, "Versions"), { recursive: true });
//     await mkdir(join(app, "Contents", "Other"), { recursive: true });
//     await writeFile(
//       join(app, "Contents", "Other", "Electron Framework"),
//       elfFuseImage([ELECTRON_FUSE_STATE_BYTES.enabled]).bytes,
//     );
//     await symlink("../../../Other", join(framework, "Versions", "Current"));
//
//     for (const path of [app, framework]) {
//       const result = await provider.inspect({ path });
//       expect(result.ok, path).toBe(false);
//       if (result.ok) continue;
//       expect(result.error).toMatchObject({
//         _tag: "AnalysisInputError",
//         issues: [
//           expect.objectContaining({
//             path: ["path"],
//             message: expect.stringContaining("escapes"),
//           }),
//         ],
//       });
//     }
//   });
//
//   it("refuses a framework symlink that leaves the bundle", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-escape-");
//     const versions = join(
//       root,
//       "Fixture.app",
//       "Contents",
//       "Frameworks",
//       "Electron Framework.framework",
//       "Versions",
//     );
//     await mkdir(versions, { recursive: true });
//     await symlink("/etc", join(versions, "Current"));
//     const result = await provider.inspect({
//       path: join(root, "Fixture.app"),
//     });
//     expect(result.ok).toBe(false);
//     if (result.ok) return;
//     expect(result.error).toMatchObject({
//       _tag: "AnalysisInputError",
//       issues: [
//         expect.objectContaining({
//           path: ["path"],
//           message: expect.stringContaining("escapes"),
//         }),
//       ],
//     });
//   });
//
//   it("rejects an unrecognized container and a big-endian Mach-O image", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-reject-");
//     const text = join(root, "notes.txt");
//     const bigEndian = join(root, "big");
//     const java = join(root, "Main.class");
export const _l = 176;
