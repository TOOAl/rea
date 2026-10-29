export const __stub = 1;
//     await writeFile(text, "This is not an executable container.");
//     const header = Buffer.alloc(32);
//     header.writeUInt32BE(0xfeedfacf, 0);
//     await writeFile(bigEndian, header);
//     await writeFile(
//       java,
//       Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0x00, 0x00, 0x00, 0x37]),
//     );
//     for (const path of [text, bigEndian, java]) {
//       const result = await provider.inspect({ path });
//       expect(result.ok, path).toBe(false);
//       if (!result.ok)
//         expect(result.error._tag).toBe("AnalysisUnsupportedTargetError");
//     }
//   });
//
//   it("does not invent a sentinel from bytes that only straddle two slices", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-span-");
//     const left = thinMacho(0x01000007, Buffer.alloc(16));
//     const right = thinMacho(0x0100000c, Buffer.alloc(16));
//     const overhang = 10;
//     FUSE_SENTINEL.copy(left, left.length - overhang);
//     const gap = Buffer.alloc(FUSE_SENTINEL.length - overhang);
//     FUSE_SENTINEL.copy(gap, 0, overhang);
//     const tableEnd = 48;
//     const rightOffset = tableEnd + left.length + gap.length;
//     const table = Buffer.alloc(tableEnd);
//     table.writeUInt32BE(0xcafebabe, 0);
//     table.writeUInt32BE(2, 4);
//     table.writeUInt32BE(0x01000007, 8);
//     table.writeUInt32BE(tableEnd, 16);
//     table.writeUInt32BE(left.length, 20);
//     table.writeUInt32BE(0x0100000c, 28);
//     table.writeUInt32BE(rightOffset, 36);
//     table.writeUInt32BE(right.length, 40);
//     const path = join(root, "split");
//     await writeFile(path, Buffer.concat([table, left, gap, right]));
//     const report = await inspect(path);
//     expect(report.slices.map((item) => item.sentinel_count)).toEqual([0, 0]);
//   });
// });
//
// describe("direct Electron Framework binary selection", () => {
//   const frameworkFixture = async (prefix: string) => {
//     const root = await createTestTempDirectory(prefix);
//     const app = join(root, "Fixture.app");
//     const framework = join(
//       app,
//       "Contents",
//       "Frameworks",
//       "Electron Framework.framework",
//     );
//     await mkdir(join(framework, "Versions"), { recursive: true });
//     return { app, framework };
//   };
//
//   it("resolves a binary selected through Versions/Current to its target", async () => {
//     const { framework } = await frameworkFixture("rea-electron-fuses-direct-");
//     await mkdir(join(framework, "Versions", "A"), { recursive: true });
//     const binary = join(framework, "Versions", "A", "Electron Framework");
//     await writeFile(binary, thinFuseImage(OBSIDIAN_FUSE_BYTES).bytes);
//     await symlink("A", join(framework, "Versions", "Current"));
//
//     const selected = join(
//       framework,
//       "Versions",
//       "Current",
//       "Electron Framework",
//     );
//     const report = await inspect(selected);
//     expect(report.artifact.selected_path).toBe(selected);
//     expect(report.artifact.resolved_path).toBe(binary);
//   });
//
//   it("follows symlinks before parent segments in a selected binary path", async () => {
//     const { framework } = await frameworkFixture("rea-electron-fuses-parent-");
//     const versions = join(framework, "Versions");
//     await mkdir(join(versions, "nested", "B"), { recursive: true });
//     await mkdir(join(versions, "nested", "A"), { recursive: true });
//     await mkdir(join(versions, "A"), { recursive: true });
//     const binary = join(versions, "nested", "A", "Electron Framework");
//     await writeFile(binary, thinFuseImage(OBSIDIAN_FUSE_BYTES).bytes);
//     await writeFile(
//       join(versions, "A", "Electron Framework"),
//       sentinelFreeMacho(),
//     );
//     await symlink("nested/B", join(versions, "Current"));
//     const selected = `${versions}/Current/../A/Electron Framework`;
//     const report = await inspect(selected);
//     expect(report.artifact.selected_path).toBe(selected);
//     expect(report.artifact.resolved_path).toBe(binary);
//     expect(report.slices[0]?.sentinel_count).toBe(1);
//   });
//
//   it("rejects a binary selected through a Versions/Current link that leaves the framework", async () => {
//     const { app, framework } = await frameworkFixture(
//       "rea-electron-fuses-direct-escape-",
//     );
//     await mkdir(join(app, "Contents", "Other"), { recursive: true });
//     await writeFile(
//       join(app, "Contents", "Other", "Electron Framework"),
//       elfFuseImage([ELECTRON_FUSE_STATE_BYTES.enabled]).bytes,
//     );
//     await symlink("../../../Other", join(framework, "Versions", "Current"));
//
//     const result = await provider.inspect({
//       path: join(framework, "Versions", "Current", "Electron Framework"),
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
//   it("rejects a framework directory that is a symlink outside the bundle", async () => {
//     const root = await createTestTempDirectory(
//       "rea-electron-fuses-framework-link-",
//     );
//     const outside = join(root, "outside");
//     await mkdir(join(outside, "Versions", "A"), { recursive: true });
//     await writeFile(
//       join(outside, "Versions", "A", "Electron Framework"),
//       thinFuseImage(OBSIDIAN_FUSE_BYTES).bytes,
//     );
//     const app = join(root, "Example.app");
//     const frameworks = join(app, "Contents", "Frameworks");
//     await mkdir(frameworks, { recursive: true });
//     const framework = join(frameworks, "Electron Framework.framework");
//     await symlink(outside, framework);
//
//     for (const path of [
//       app,
//       join(framework, "Versions", "A", "Electron Framework"),
//     ]) {
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
// });
//
// it.each(["Contents", "Frameworks"])(
//   "rejects a redirected %s for every app selection form",
//   async (segment) => {
//     const root = await createTestTempDirectory("rea-electron-parent-link-");
//     const app = join(root, "Fixture.app");
//     const outside = join(root, "outside");
//     const actualFramework = join(
//       outside,
//       ...(segment === "Contents" ? ["Frameworks"] : []),
//       "Electron Framework.framework",
//     );
//     await mkdir(join(actualFramework, "Versions", "A"), { recursive: true });
//     await writeFile(
//       join(actualFramework, "Versions", "A", "Electron Framework"),
//       thinFuseImage(OBSIDIAN_FUSE_BYTES).bytes,
//     );
//     await symlink("A", join(actualFramework, "Versions", "Current"));
//     await mkdir(segment === "Contents" ? app : join(app, "Contents"), {
//       recursive: true,
export const _l = 176;
