export const __stub = 1;
//     });
//     await symlink(
//       outside,
//       join(
//         app,
//         "Contents",
//         ...(segment === "Frameworks" ? ["Frameworks"] : []),
//       ),
//     );
//     const framework = join(
//       app,
//       "Contents",
//       "Frameworks",
//       "Electron Framework.framework",
//     );
//     for (const path of [
//       app,
//       framework,
//       join(framework, "Versions", "Current", "Electron Framework"),
//     ]) {
//       const result = await provider.inspect({ path });
//       expect(result.ok, path).toBe(false);
//       if (!result.ok) expect(result.error._tag).toBe("AnalysisInputError");
//     }
//   },
// );
//
// it("enforces the 32 sentinel boundary with typed and public limit details", async () => {
//   const root = await createTestTempDirectory("rea-electron-sentinel-limit-");
//   const wire = Buffer.concat([FUSE_SENTINEL, fuseWire(1, [0x31])]);
//   for (const count of [32, 33]) {
//     const path = join(root, String(count));
//     await writeFile(
//       path,
//       thinMacho(
//         0x0100000c,
//         Buffer.concat(Array.from({ length: count }, () => wire)),
//       ),
//     );
//     const result = await provider.inspect({ path });
//     if (count === 32) {
//       expect(result.ok).toBe(true);
//       if (result.ok) expect(result.value.slices[0]?.sentinel_count).toBe(32);
//     } else {
//       expect(result.ok).toBe(false);
//       if (!result.ok) {
//         expect(result.error._tag).toBe("AnalysisResourceConstraintError");
//         expect(projectAnalysisError(result.error)).toMatchObject({
//           code: "resource_constraint",
//           details: { reported_limits: { maximum_sentinels_per_slice: 32 } },
//         });
//       }
//     }
//   }
// });
//
// it("rejects a sparse artifact over 1 GiB before scanning", async () => {
//   const root = await createTestTempDirectory("rea-electron-input-limit-");
//   const path = join(root, "large");
//   await writeFile(path, thinFuseImage(OBSIDIAN_FUSE_BYTES).bytes);
//   await truncate(path, 1024 * 1024 * 1024 + 1);
//   const result = await provider.inspect({ path });
//   expect(result.ok).toBe(false);
//   if (!result.ok) {
//     expect(result.error._tag).toBe("AnalysisResourceConstraintError");
//     expect(projectAnalysisError(result.error)).toMatchObject({
//       code: "resource_constraint",
//       details: { reported_limits: { maximum_input_bytes: 1024 * 1024 * 1024 } },
//     });
//   }
// });
//
// it("follows the active framework binary while an inactive A version remains", async () => {
//   const root = await createTestTempDirectory("rea-electron-current-version-");
//   const app = join(root, "Fixture.app");
//   const framework = join(
//     app,
//     "Contents",
//     "Frameworks",
//     "Electron Framework.framework",
//   );
//   for (const [version, state] of [
//     ["A", 0x30],
//     ["B", 0x31],
//   ] as const) {
//     await mkdir(join(framework, "Versions", version), { recursive: true });
//     await writeFile(
//       join(framework, "Versions", version, "Electron Framework"),
//       thinFuseImage([state]).bytes,
//     );
//   }
//   await symlink("B", join(framework, "Versions", "Current"));
//   await symlink(
//     "Versions/Current/Electron Framework",
//     join(framework, "Electron Framework"),
//   );
//   for (const path of [app, framework, join(framework, "Electron Framework")]) {
//     const report = await inspect(path);
//     expect(report.artifact.resolved_path).toBe(
//       join(framework, "Versions", "B", "Electron Framework"),
//     );
//     expect(report.slices[0]?.sentinels[0]?.fuses[0]?.state).toBe("enabled");
//   }
// });
//
// it("rejects a checked version directory swapped before the reader opens it", async () => {
//   const root = await createTestTempDirectory("rea-electron-directory-swap-");
//   const app = join(root, "Fixture.app");
//   const framework = join(
//     app,
//     "Contents",
//     "Frameworks",
//     "Electron Framework.framework",
//   );
//   const version = join(framework, "Versions", "A");
//   const outside = join(root, "outside");
//   await mkdir(version, { recursive: true });
//   await mkdir(outside);
//   await writeFile(
//     join(version, "Electron Framework"),
//     thinFuseImage([0x30]).bytes,
//   );
//   await writeFile(
//     join(outside, "Electron Framework"),
//     thinFuseImage([0x31]).bytes,
//   );
//   const located = await resolveElectronFuseTarget(app);
//   await rename(version, `${version}.saved`);
//   await symlink(outside, version);
//   await expect(
//     readElectronFuseImage(located.file.path, { selection: located.file }),
//   ).rejects.toBeInstanceOf(RegularFileChangedError);
// });
//
// it("reports a checked version directory removed before open as changed", async () => {
//   const root = await createTestTempDirectory("rea-electron-directory-missing-");
//   const app = join(root, "Fixture.app");
//   const version = join(
//     app,
//     "Contents",
//     "Frameworks",
//     "Electron Framework.framework",
//     "Versions",
//     "A",
//   );
//   await mkdir(version, { recursive: true });
//   await writeFile(
//     join(version, "Electron Framework"),
//     thinFuseImage([0x30]).bytes,
//   );
//   const located = await resolveElectronFuseTarget(app);
//   await rename(version, `${version}.saved`);
//   await expect(
//     readElectronFuseImage(located.file.path, { selection: located.file }),
//   ).rejects.toBeInstanceOf(RegularFileChangedError);
// });
//
// it("retains the identity of a directory removed by a terminal parent segment", async () => {
//   const root = await createTestTempDirectory("rea-electron-parent-identity-");
//   const framework = join(root, "Electron Framework.framework");
//   const versions = join(framework, "Versions");
//   await mkdir(versions, { recursive: true });
//   await writeFile(
//     join(framework, "Electron Framework"),
//     thinFuseImage([0x31]).bytes,
//   );
//   const located = await resolveElectronFuseTarget(`${versions}/..`);
//   await rename(versions, `${versions}.saved`);
//   await mkdir(versions);
//   await expect(
//     readElectronFuseImage(located.file.path, { selection: located.file }),
//   ).rejects.toBeInstanceOf(RegularFileChangedError);
// });
export const _l = 173;
