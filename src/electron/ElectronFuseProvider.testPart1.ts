export const __stub = 1;
// import { resolveElectronFuseTarget } from "./ElectronFusePath.js";
// import { RegularFileChangedError } from "../filesystem/RegularFile.js";
// import { mkdir, symlink, writeFile, truncate, rename } from "node:fs/promises";
// import { join } from "node:path";
// import { describe, expect, it } from "vitest";
//
// import { createTestTempDirectory } from "../../tests/fixtures/temporaryDirectory.js";
// import {
//   elfFuseImage,
//   fuseWire,
//   FUSE_SENTINEL,
//   OBSIDIAN_FUSE_BYTES,
//   peFuseImage,
//   sentinelFreeMacho,
//   thinFuseImage,
//   thinMacho,
//   truncatedFuseImage,
//   twoSentinelElf,
//   universalFuseImage,
// } from "../../tests/fixtures/electron/fuseImage.js";
// import { ELECTRON_FUSE_STATE_BYTES } from "../domain/electron/electronFuses.js";
// import { ElectronFuseProvider } from "./ElectronFuseProvider.js";
// import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
// import { readElectronFuseImage } from "./ElectronFuseReader.js";
//
// const provider = new ElectronFuseProvider();
//
// const inspect = async (path: string) => {
//   const result = await provider.inspect({ path });
//   if (!result.ok) throw result.error;
//   return result.value;
// };
//
// describe("Electron fuse wire reading", () => {
//   it("reads thin Mach-O, universal Mach-O, PE, and ELF wires", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-");
//     const thin = thinFuseImage(OBSIDIAN_FUSE_BYTES);
//     const universal = universalFuseImage();
//     const pe = peFuseImage(OBSIDIAN_FUSE_BYTES);
//     const elf = elfFuseImage([
//       ELECTRON_FUSE_STATE_BYTES.enabled,
//       ELECTRON_FUSE_STATE_BYTES.removed,
//       0x99,
//     ]);
//     await writeFile(join(root, "thin"), thin.bytes);
//     await writeFile(join(root, "universal"), universal.bytes);
//     await writeFile(join(root, "app.exe"), pe.bytes);
//     await writeFile(join(root, "app.elf"), elf.bytes);
//
//     const thinReport = await inspect(join(root, "thin"));
//     expect(thinReport.artifact).toMatchObject({
//       format: "mach-o",
//       bytes: thin.bytes.length,
//     });
//     expect(thinReport.slices).toMatchObject([
//       {
//         architecture: "arm64",
//         sentinel_count: 1,
//         sentinels: [
//           {
//             sentinel_offset: thin.sentinelOffset,
//             wire_version: 1,
//             declared_length: 8,
//             complete: true,
//           },
//         ],
//       },
//     ]);
//     expect(
//       thinReport.slices[0]?.sentinels[0]?.fuses.map((fuse) => fuse.state),
//     ).toEqual([
//       "disabled",
//       "enabled",
//       "disabled",
//       "disabled",
//       "disabled",
//       "disabled",
//       "disabled",
//       "enabled",
//     ]);
//
//     const universalReport = await inspect(join(root, "universal"));
//     expect(universalReport.artifact.format).toBe("mach-o-universal");
//     expect(universalReport.slices).toMatchObject([
//       {
//         file_offset: universal.left.fileOffset,
//         architecture: "x86_64",
//         sentinels: [{ sentinel_offset: universal.left.sentinelOffset }],
//       },
//       {
//         file_offset: universal.right.fileOffset,
//         architecture: "arm64",
//         sentinels: [{ sentinel_offset: universal.right.sentinelOffset }],
//       },
//     ]);
//     expect(
//       universalReport.runtime_implications.filter(
//         (item) => item.subject === "node_cli_inspect_arguments",
//       ),
//     ).toEqual([
//       expect.objectContaining({
//         slice_index: 0,
//         outcome: "not_honored",
//         sentinel_offset: universal.left.sentinelOffset,
//       }),
//       expect.objectContaining({
//         slice_index: 1,
//         outcome: "honored",
//         sentinel_offset: universal.right.sentinelOffset,
//       }),
//     ]);
//
//     const peReport = await inspect(join(root, "app.exe"));
//     expect(peReport.artifact.format).toBe("pe");
//     expect(peReport.slices[0]?.sentinels[0]?.sentinel_offset).toBe(
//       pe.sentinelOffset,
//     );
//     const elfReport = await inspect(join(root, "app.elf"));
//     expect(elfReport.slices[0]?.sentinels[0]?.fuses).toMatchObject([
//       { name: "RunAsNode", state: "enabled", raw_byte: 0x31 },
//       { name: "EnableCookieEncryption", state: "removed", raw_byte: 0x72 },
//       {
//         name: "EnableNodeOptionsEnvironmentVariable",
//         state: "unknown",
//         raw_byte: 0x99,
//       },
//     ]);
//     expect(elfReport.runtime_implications).toEqual([
//       expect.objectContaining({
//         subject: "electron_run_as_node",
//         outcome: "honored",
//       }),
//     ]);
//   });
//
//   it("keeps a truncated wire, duplicate sentinels, and a missing sentinel", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-partial-");
//     await writeFile(join(root, "truncated"), truncatedFuseImage());
//     const duplicated = twoSentinelElf();
//     await writeFile(join(root, "duplicated"), duplicated.bytes);
//     await writeFile(join(root, "empty"), sentinelFreeMacho());
//
//     const truncated = await inspect(join(root, "truncated"));
//     expect(truncated.slices[0]?.sentinels[0]).toMatchObject({
//       wire_version: 1,
//       declared_length: 4,
//       complete: false,
//       fuses: [{ index: 0, state: "enabled", raw_byte: 0x31 }],
//     });
//     expect(truncated.limitations.join(" ")).toContain("truncated");
//
//     const duplicates = await inspect(join(root, "duplicated"));
//     expect(duplicates.slices[0]?.sentinel_count).toBe(2);
//     expect(
//       duplicates.slices[0]?.sentinels.map((item) => item.sentinel_offset),
//     ).toEqual([...duplicated.offsets]);
//     expect(duplicates.limitations.join(" ")).toContain("none is selected");
//
//     const missing = await inspect(join(root, "empty"));
//     expect(missing.slices[0]?.sentinel_count).toBe(0);
//     expect(missing.runtime_implications).toEqual([]);
//     expect(missing.limitations.join(" ")).toContain("unknown, not disabled");
//   });
// });
//
// describe("ELF embedded ASAR integrity applicability", () => {
//   it("preserves an enabled ASAR integrity fuse without claiming enforcement on ELF", async () => {
//     const root = await createTestTempDirectory("rea-electron-fuses-elf-asar-");
//     const fuses = [
//       ELECTRON_FUSE_STATE_BYTES.disabled,
//       ELECTRON_FUSE_STATE_BYTES.disabled,
//       ELECTRON_FUSE_STATE_BYTES.disabled,
//       ELECTRON_FUSE_STATE_BYTES.disabled,
//       ELECTRON_FUSE_STATE_BYTES.enabled,
//     ];
//     const image = elfFuseImage(fuses);
export const _l = 176;
